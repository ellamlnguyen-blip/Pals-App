-- ADR-0019 / TASK-017B2. Disposable-local, default-off Hangout disable.
begin;

create table private.hangout_disables (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  subject_type text not null default 'hangout' check (subject_type='hangout'),
  hangout_id uuid not null unique references public.hangouts(id) on delete restrict,
  operator_id uuid not null references public.accounts(id) on delete restrict,
  request_id uuid not null,
  previous_disabled boolean not null default false check (previous_disabled=false),
  new_disabled boolean not null default true check (new_disabled=true),
  subject_campus_id uuid not null references public.universities(id) on delete restrict,
  reason text not null check (reason=private.profile_trim(reason) and char_length(reason) between 1 and 2000),
  occurred_at timestamptz not null default clock_timestamp(),
  foreign key (report_id,subject_type,hangout_id)
    references private.safety_reports(id,target_type,target_id) on delete restrict,
  unique (operator_id,request_id),
  unique (id,report_id)
);
alter table private.hangout_disables enable row level security;
revoke all on private.hangout_disables from public,anon,authenticated;
create trigger hangout_disables_immutable before update or delete on private.hangout_disables
  for each row execute function private.reject_moderation_evidence_change();

alter table private.moderation_cases add column hangout_disable_id uuid;
alter table private.moderation_cases add constraint moderation_case_disable_binding
  foreign key (hangout_disable_id,report_id)
  references private.hangout_disables(id,report_id) on delete restrict;
alter table private.moderation_cases drop constraint moderation_case_action_link;
alter table private.moderation_cases add constraint moderation_case_action_link
  check (((disposition='action_taken') is true) = (num_nonnulls(sanction_id,hangout_disable_id)=1)
    and num_nonnulls(sanction_id,hangout_disable_id)<=1);
create or replace function private.clear_reopened_case_sanction() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.disposition is null then
    new.sanction_id:=null;
    new.hangout_disable_id:=null;
  end if;
  return new;
end; $$;
alter table private.moderation_audit add column hangout_disable_id uuid
  references private.hangout_disables(id) on delete restrict;
alter table private.moderation_audit add column previous_hangout_disabled boolean;
alter table private.moderation_audit add column new_hangout_disabled boolean;

-- RLS and old source RPCs share these source checks. The safety own-ID/state
-- recovery function intentionally does not call them for the retained route.
create or replace function private.can_read_hangout(target uuid, private_details boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hangouts h
 where h.id=target and h.university_id=private.ready_campus() and h.visibility='campus'
 and not exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
 and not private.safety_pair_blocked(auth.uid(),h.host_id)
 and (case when private_details then h.status='published' and
       (h.host_id=auth.uid() or exists(select 1 from public.hangout_participants p
         where p.hangout_id=h.id and p.account_id=auth.uid() and p.state='joined'))
   else h.status='published' or (h.status='cancelled' and
       (h.host_id=auth.uid() or exists(select 1 from public.hangout_participants p
         where p.hangout_id=h.id and p.account_id=auth.uid() and p.state='joined'))) end));
$$;
create or replace function private.chat_authorized(p_hangout_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select current_setting('transaction_isolation')='read committed'
    and exists(select 1 from private.hangout_feature_gate where singleton and enabled)
    and exists(select 1 from private.hangout_chat_feature_gate where singleton and enabled)
    and exists(select 1 from public.hangouts h
      join public.hangout_participants p on p.hangout_id=h.id
      where h.id=p_hangout_id and h.status='published' and h.visibility='campus'
        and not exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
        and p.account_id=auth.uid() and p.state='joined'
        and not private.safety_pair_blocked(auth.uid(),h.host_id)
        and private.ready_subject_campus(auth.uid(),h.university_id));
$$;
create or replace function private.lock_hangout(target uuid) returns public.hangouts
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
  select * into h from public.hangouts where id=target for update;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  perform 1 from private.hangout_feature_gate where singleton for share;
  perform private.safety_lock_hangout_evidence(auth.uid(),h.university_id);
  if h.university_id is distinct from private.ready_campus()
    or exists(select 1 from private.hangout_disables where hangout_id=target) then
    raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  update public.hangouts set updated_at=updated_at where id=target;
  return h;
end; $$;

-- Return signature gains one server-derived field, so replace the original RPC.
drop function public.get_moderation_report(uuid);
create function public.get_moderation_report(p_report_id uuid)
returns table(report_id uuid,submitted_at timestamptz,target_type text,target_id uuid,
  reporter_id uuid,category text,case_state text,case_revision bigint,narrative text,
  provenance_kind text,provenance_ref_id uuid,case_note text,disposition text,
  target_status text,target_campus_id uuid,target_disabled boolean)
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid; r private.safety_reports%rowtype;
begin
  actor:=private.moderation_actor();
  if p_report_id is null or not private.moderation_report_allowed(actor,p_report_id) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  select * into r from private.safety_reports where id=p_report_id;
  report_id:=r.id; submitted_at:=r.submitted_at; target_type:=r.target_type;
  target_id:=r.target_id; reporter_id:=r.reporter_id; category:=r.category;
  narrative:=r.narrative; provenance_kind:=r.provenance_kind;
  provenance_ref_id:=r.provenance_ref_id;
  select coalesce(c.state,'open'),coalesce(c.revision,0),c.note,c.disposition
    into case_state,case_revision,case_note,disposition
    from (select 1) x left join private.moderation_cases c on c.report_id=r.id;
  if r.target_type='user' then
    select a.status,m.university_id into target_status,target_campus_id
      from public.accounts a left join public.university_memberships m on m.user_id=a.id
      where a.id=r.target_id;
    target_disabled:=null;
  else
    select h.status,h.university_id,
      exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
      into target_status,target_campus_id,target_disabled
      from public.hangouts h where h.id=r.target_id;
  end if;
  target_status:=coalesce(target_status,'unavailable');
  insert into private.moderation_audit(operator_id,action,report_id,request_id)
    values(actor,'detail_read',r.id,gen_random_uuid());
  return next;
end; $$;
revoke all on function public.get_moderation_report(uuid) from public,anon,authenticated;
grant execute on function public.get_moderation_report(uuid) to authenticated;

create function public.apply_hangout_moderation_action(
  p_report_id uuid,p_request_id uuid,p_expected_case_revision bigint,p_reason text)
returns table(case_state text,revision bigint,target_disabled boolean)
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid; r private.safety_reports%rowtype; h public.hangouts%rowtype;
  c private.moderation_cases%rowtype; prior private.moderation_requests%rowtype;
  normalized_reason text; fingerprint text; saved_disable uuid;
begin
  -- Shared social lock precedes the parent. Stage A actor lock/gate/role
  -- precede the report. Take the Hangout parent UPDATE lock exactly once,
  -- then retry identity, case, and writes. No FOR SHARE upgrade.
  perform private.social_hangout_mutation_lock();
  actor:=private.moderation_actor();
  normalized_reason:=private.profile_trim(p_reason);
  if p_report_id is null or p_request_id is null or p_expected_case_revision is null
    or p_expected_case_revision<0 or normalized_reason is null
    or char_length(normalized_reason) not between 1 and 2000 then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  select * into r from private.safety_reports where id=p_report_id for share;
  if not found or r.target_type<>'hangout' or r.reporter_id=actor then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  select * into h from public.hangouts where id=r.target_id for update;
  if not found or h.host_id=actor then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  -- Recheck every authority source after the parent wait. The live target
  -- stays locked through commit, so host and campus cannot change beneath us.
  if not exists(select 1 from private.moderation_feature_gate where singleton and enabled)
    or not exists(select 1 from public.accounts where id=actor and status='active')
    or not exists(select 1 from public.platform_roles where user_id=actor
      and role in ('moderator','admin'))
    or r.reporter_id=actor or h.host_id=actor then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  fingerprint:='hangout:'||md5(jsonb_build_array(p_report_id,
    p_expected_case_revision,normalized_reason)::text);
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,17017));
  select * into prior from private.moderation_requests
    where operator_id=actor and request_id=p_request_id;
  if found then
    if prior.fingerprint<>fingerprint or prior.report_id<>p_report_id
      or not exists(select 1 from private.hangout_disables d
        where d.operator_id=actor and d.request_id=p_request_id
          and d.report_id=p_report_id and d.hangout_id=h.id) then
      raise exception 'Moderation unavailable' using errcode='42501'; end if;
    case_state:=prior.result_state; revision:=prior.result_revision;
    target_disabled:=true; return next; return;
  end if;
  select * into c from private.moderation_cases
    where report_id=p_report_id for update;
  if not found or c.state<>'in_review' or c.revision<>p_expected_case_revision
    or exists(select 1 from private.hangout_disables where hangout_id=h.id) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  insert into private.hangout_disables(report_id,hangout_id,operator_id,request_id,
    subject_campus_id,reason)
    values(r.id,h.id,actor,p_request_id,h.university_id,normalized_reason)
    returning id into saved_disable;
  update private.moderation_cases set state='closed',revision=c.revision+1,
    note=normalized_reason,disposition='action_taken',duplicate_report_id=null,
    sanction_id=null,hangout_disable_id=saved_disable where report_id=r.id;
  insert into private.moderation_requests(operator_id,request_id,fingerprint,
    report_id,result_state,result_revision)
    values(actor,p_request_id,fingerprint,r.id,'closed',c.revision+1);
  insert into private.moderation_audit(operator_id,action,report_id,
    subject_target_type,subject_target_id,subject_campus_id,request_id,
    previous_state,new_state,previous_revision,new_revision,reason,hangout_disable_id,
    previous_hangout_disabled,new_hangout_disabled)
    values(actor,'disable_hangout',r.id,'hangout',h.id,h.university_id,p_request_id,
      c.state,'closed',c.revision,c.revision+1,normalized_reason,saved_disable,false,true);
  case_state:='closed'; revision:=c.revision+1; target_disabled:=true;
  return next;
end; $$;
revoke all on function public.apply_hangout_moderation_action(uuid,uuid,bigint,text)
  from public,anon,authenticated;
grant execute on function public.apply_hangout_moderation_action(uuid,uuid,bigint,text)
  to authenticated;
commit;
