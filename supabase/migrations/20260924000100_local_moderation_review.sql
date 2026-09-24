-- ADR-0019 / TASK-017A. Disposable-local, default-off audited allegation review.
begin;

alter table private.safety_reports drop constraint safety_reports_reporter_id_fkey;
alter table private.safety_reports add constraint safety_reports_reporter_id_fkey
  foreign key (reporter_id) references public.accounts(id) on delete restrict;

create table private.moderation_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into private.moderation_feature_gate(singleton,enabled) values(true,false);
create table private.moderation_cases (
  report_id uuid primary key references private.safety_reports(id) on delete restrict,
  state text not null check (state in ('in_review','closed')),
  revision bigint not null check (revision>0),
  note text,
  disposition text check (disposition in ('no_action','duplicate')),
  duplicate_report_id uuid references private.safety_reports(id) on delete restrict,
  check ((state='closed')=(disposition is not null)),
  check (coalesce(disposition='duplicate',false)=(duplicate_report_id is not null))
);
create table private.moderation_requests (
  operator_id uuid not null,
  request_id uuid not null,
  fingerprint text not null,
  report_id uuid not null references private.safety_reports(id) on delete restrict,
  result_state text not null,
  result_revision bigint not null,
  primary key(operator_id,request_id)
);
create table private.moderation_audit (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default clock_timestamp(),
  operator_id uuid not null,
  action text not null,
  report_id uuid,
  subject_target_type text check (subject_target_type in ('user','hangout')),
  subject_target_id uuid,
  subject_campus_id uuid,
  request_id uuid not null,
  previous_state text,
  new_state text,
  previous_revision bigint,
  new_revision bigint,
  reason text,
  duplicate_report_id uuid,
  page_report_ids uuid[],
  page_count integer,
  check ((subject_target_type is null)=(subject_target_id is null))
);
create index moderation_reports_order_idx on private.safety_reports(submitted_at desc,id desc);
create index moderation_audit_operator_time_idx on private.moderation_audit(operator_id,occurred_at desc);
alter table private.moderation_feature_gate enable row level security;
alter table private.moderation_cases enable row level security;
alter table private.moderation_requests enable row level security;
alter table private.moderation_audit enable row level security;
revoke all on private.moderation_feature_gate,private.moderation_cases,
  private.moderation_requests,private.moderation_audit from public,anon,authenticated;

-- Lock order for all three RPCs: moderation advisory lock, moderation gate,
-- actor account SHARE and role SHARE, report, target account or Hangout,
-- then case/retry. Queue/detail target accounts use SHARE to remain compatible
-- with safety writers that lock a Hangout before its member accounts. Case
-- action target accounts use UPDATE, conflicting with the FK key-share of a
-- concurrent platform-role insert. READ COMMITTED gives fresh post-wait reads.
create function private.moderation_actor() returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  perform pg_advisory_xact_lock(17017,1);
  if current_setting('transaction_isolation')<>'read committed' or actor is null then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  perform 1 from private.moderation_feature_gate where singleton for share;
  -- SHARE blocks status/deletion changes but is compatible with the existing
  -- report intake actor SHARE after its Hangout parent lock.
  perform 1 from public.accounts where id=actor for share;
  perform 1 from public.platform_roles where user_id=actor for share;
  if not exists(select 1 from private.moderation_feature_gate where singleton and enabled)
    or not exists(select 1 from public.accounts where id=actor and status='active')
    or not exists(select 1 from public.platform_roles where user_id=actor and role in ('moderator','admin')) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  return actor;
end; $$;

-- Must be called after moderation_actor. Returns false to omit a conflicted
-- queue row; exact-ID callers turn false into the same neutral denial.
create function private.moderation_report_allowed(p_actor uuid,p_report uuid,
  p_for_action boolean default false)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare r private.safety_reports%rowtype; host uuid;
begin
  select * into r from private.safety_reports where id=p_report for share;
  if not found or r.reporter_id=p_actor or r.target_id=p_actor then return false; end if;
  if r.target_type='user' then
    if p_for_action then
      -- A case writer must conflict with the account FK key-share acquired
      -- by a concurrent platform-role insertion.
      perform 1 from public.accounts where id=r.target_id for update;
    else
      -- Queue/detail need stable context, but SHARE avoids a cycle with
      -- safety block writers that lock Hangout parents before peer accounts.
      perform 1 from public.accounts where id=r.target_id for share;
    end if;
  else
    select h.host_id into host from public.hangouts h where h.id=r.target_id for share;
    if host=p_actor then return false; end if;
  end if;
  -- A fresh statement after any wait is required. A missing target is still
  -- reviewable, but a currently privileged user target is not actionable.
  if r.target_type='hangout' and exists(select 1 from public.hangouts
      where id=r.target_id and host_id=p_actor) then return false; end if;
  return true;
end; $$;

create function public.list_moderation_reports(
  p_after_submitted_at timestamptz default null,p_after_id uuid default null,p_limit integer default 24)
returns table(report_id uuid,submitted_at timestamptz,target_type text,target_id uuid,
  reporter_id uuid,category text,case_state text)
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid; r private.safety_reports%rowtype; ids uuid[]:=array[]::uuid[]; n integer:=0;
begin
  actor:=private.moderation_actor();
  if p_limit is null or p_limit<1 or p_limit>24
    or (p_after_submitted_at is null)<>(p_after_id is null) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  for r in select * from private.safety_reports s
    where p_after_id is null or (s.submitted_at,s.id)<(p_after_submitted_at,p_after_id)
    order by s.submitted_at desc,s.id desc loop
    if private.moderation_report_allowed(actor,r.id) then
      report_id:=r.id; submitted_at:=r.submitted_at; target_type:=r.target_type;
      target_id:=r.target_id; reporter_id:=r.reporter_id; category:=r.category;
      select coalesce(c.state,'open') into case_state from (select 1) x
        left join private.moderation_cases c on c.report_id=r.id;
      ids:=array_append(ids,r.id); n:=n+1;
      return next;
      exit when n>=p_limit;
    end if;
  end loop;
  -- The gate and live actor remain locked; recheck after potential row waits.
  if not exists(select 1 from private.moderation_feature_gate where enabled)
    or not exists(select 1 from public.accounts where id=actor and status='active')
    or not exists(select 1 from public.platform_roles where user_id=actor and role in ('moderator','admin')) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  insert into private.moderation_audit(operator_id,action,request_id,page_report_ids,page_count)
    values(actor,'queue_read',gen_random_uuid(),ids,n);
end; $$;

create function public.get_moderation_report(p_report_id uuid)
returns table(report_id uuid,submitted_at timestamptz,target_type text,target_id uuid,
  reporter_id uuid,category text,case_state text,case_revision bigint,narrative text,
  provenance_kind text,provenance_ref_id uuid,case_note text,disposition text,
  target_status text,target_campus_id uuid)
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
  else
    select h.status,h.university_id into target_status,target_campus_id
      from public.hangouts h where h.id=r.target_id;
  end if;
  target_status:=coalesce(target_status,'unavailable');
  insert into private.moderation_audit(operator_id,action,report_id,request_id)
    values(actor,'detail_read',r.id,gen_random_uuid());
  return next;
end; $$;

create function public.transition_moderation_case(p_report_id uuid,p_request_id uuid,
  p_expected_revision bigint,p_action text,p_note text default null,
  p_duplicate_report_id uuid default null)
returns table(case_state text,revision bigint)
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid; c private.moderation_cases%rowtype; old_state text;
  old_revision bigint; new_state text; new_disposition text; normalized_note text;
  fingerprint text; prior private.moderation_requests%rowtype;
  r private.safety_reports%rowtype; duplicate private.safety_reports%rowtype;
  subject_campus uuid;
begin
  actor:=private.moderation_actor();
  if p_report_id is null or p_request_id is null or p_expected_revision is null
    or p_expected_revision<0 or p_action is null or p_action not in
      ('start_review','annotate','close_no_action','close_duplicate','reopen')
    or not private.moderation_report_allowed(actor,p_report_id,true) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  normalized_note:=nullif(private.profile_trim(p_note),'');
  if (p_action='start_review' and (normalized_note is not null or p_duplicate_report_id is not null))
    or (p_action<>'start_review' and (normalized_note is null or length(normalized_note)>2000))
    or (p_action<>'close_duplicate' and p_duplicate_report_id is not null) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  select * into r from private.safety_reports where id=p_report_id;
  if r.target_type='user' and exists(select 1 from public.platform_roles
      where user_id=r.target_id) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  fingerprint:=md5(jsonb_build_array(p_report_id,p_expected_revision,p_action,
    normalized_note,p_duplicate_report_id)::text);
  -- Retry identity is locked before case revision. One operator's concurrent
  -- same-key call waits here; distinct operators serialize on the case row.
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,17017));
  select * into prior from private.moderation_requests
    where operator_id=actor and request_id=p_request_id;
  if found then
    if prior.fingerprint<>fingerprint then
      raise exception 'Moderation unavailable' using errcode='42501'; end if;
    case_state:=prior.result_state; revision:=prior.result_revision; return next; return;
  end if;
  if p_action='close_duplicate' then
    if p_duplicate_report_id=p_report_id
      or not private.moderation_report_allowed(actor,p_duplicate_report_id,true) then
      raise exception 'Moderation unavailable' using errcode='42501'; end if;
    select * into duplicate from private.safety_reports where id=p_duplicate_report_id;
    if duplicate.target_type<>r.target_type or duplicate.target_id<>r.target_id
      or (duplicate.submitted_at,duplicate.id)>=(r.submitted_at,r.id) then
      raise exception 'Moderation unavailable' using errcode='42501'; end if;
  end if;
  select * into c from private.moderation_cases where report_id=p_report_id for update;
  old_state:=coalesce(c.state,'open'); old_revision:=coalesce(c.revision,0);
  if old_revision<>p_expected_revision then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  if (p_action='start_review' and old_state<>'open')
    or (p_action in ('annotate','close_no_action','close_duplicate') and old_state<>'in_review')
    or (p_action='reopen' and old_state<>'closed') then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  new_state:=case when p_action in ('close_no_action','close_duplicate') then 'closed'
    else 'in_review' end;
  new_disposition:=case p_action when 'close_no_action' then 'no_action'
    when 'close_duplicate' then 'duplicate' else null end;
  if old_state='open' then
    insert into private.moderation_cases(report_id,state,revision,note,disposition,duplicate_report_id)
      values(p_report_id,new_state,1,normalized_note,new_disposition,p_duplicate_report_id);
  else
    update private.moderation_cases set state=new_state,revision=old_revision+1,
      note=normalized_note,disposition=new_disposition,duplicate_report_id=p_duplicate_report_id
      where report_id=p_report_id;
  end if;
  case_state:=new_state; revision:=old_revision+1;
  insert into private.moderation_requests(operator_id,request_id,fingerprint,report_id,
    result_state,result_revision) values(actor,p_request_id,fingerprint,p_report_id,
    case_state,revision);
  if r.target_type='user' then
    select m.university_id into subject_campus from public.university_memberships m
      where m.user_id=r.target_id for share;
  else
    select h.university_id into subject_campus from public.hangouts h
      where h.id=r.target_id;
  end if;
  insert into private.moderation_audit(operator_id,action,report_id,
    subject_target_type,subject_target_id,subject_campus_id,request_id,
    previous_state,new_state,previous_revision,new_revision,reason,duplicate_report_id)
    values(actor,p_action,p_report_id,r.target_type,r.target_id,subject_campus,
      p_request_id,old_state,new_state,old_revision,revision,
      normalized_note,p_duplicate_report_id);
  return next;
end; $$;

revoke all on function private.moderation_actor(),
  private.moderation_report_allowed(uuid,uuid,boolean),
  public.list_moderation_reports(timestamptz,uuid,integer),
  public.get_moderation_report(uuid),
  public.transition_moderation_case(uuid,uuid,bigint,text,text,uuid)
  from public,anon,authenticated;
grant execute on function public.list_moderation_reports(timestamptz,uuid,integer),
  public.get_moderation_report(uuid),
  public.transition_moderation_case(uuid,uuid,bigint,text,text,uuid) to authenticated;
commit;
