-- ADR-0019 / ADR-0021 / TASK-017B1. Disposable-local account enforcement.
begin;

alter table private.safety_reports
  add constraint safety_report_exact_target unique (id,target_type,target_id);
create table private.account_sanctions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  subject_type text not null default 'user' check (subject_type='user'),
  subject_id uuid not null references public.accounts(id) on delete restrict,
  operator_id uuid not null references public.accounts(id) on delete restrict,
  request_id uuid not null,
  action text not null check (action in ('suspend','ban','reinstate')),
  previous_status text not null check (previous_status in ('active','suspended','banned')),
  new_status text not null check (new_status in ('active','suspended','banned')),
  subject_campus_id uuid,
  reason text not null check (reason=private.profile_trim(reason)
    and char_length(reason) between 1 and 2000),
  occurred_at timestamptz not null default clock_timestamp(),
  foreign key (report_id,subject_type,subject_id)
    references private.safety_reports(id,target_type,target_id) on delete restrict,
  unique (operator_id,request_id),
  unique (id,report_id)
);
alter table private.account_sanctions enable row level security;
revoke all on private.account_sanctions from public,anon,authenticated;

alter table private.moderation_cases
  drop constraint moderation_cases_disposition_check;
alter table private.moderation_cases
  add constraint moderation_cases_disposition_check
  check (disposition in ('no_action','duplicate','action_taken'));
alter table private.moderation_cases add column sanction_id uuid;
alter table private.moderation_cases add constraint moderation_case_sanction_binding
  foreign key (sanction_id,report_id)
  references private.account_sanctions(id,report_id) on delete restrict;
alter table private.moderation_cases add constraint moderation_case_action_link
  check (coalesce(disposition='action_taken',false)=(sanction_id is not null));

-- Stage A's existing reopen transition clears disposition. Keep its accepted
-- signature and behavior while retaining the historical sanction row.
create function private.clear_reopened_case_sanction() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.disposition is null then new.sanction_id:=null; end if;
  return new;
end; $$;
create trigger moderation_case_reopen_sanction before update of disposition
  on private.moderation_cases for each row
  execute function private.clear_reopened_case_sanction();
revoke all on function private.clear_reopened_case_sanction()
  from public,anon,authenticated;

alter table private.moderation_audit add column sanction_id uuid
  references private.account_sanctions(id) on delete restrict;
alter table private.moderation_audit add column previous_account_status text
  check (previous_account_status in ('active','suspended','banned'));
alter table private.moderation_audit add column new_account_status text
  check (new_account_status in ('active','suspended','banned'));

-- Direct profile and Storage writes can pass a statement-snapshot RLS check
-- before waiting on another row. Recheck live status after their row lock and
-- hold an account SHARE lock to commit. Sanction uses account UPDATE and must
-- either wait for the admitted write or commit first and deny the stale write.
create function private.require_active_profile_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid:=auth.uid();
begin
  if current_setting('role',true)='authenticated' and subject is not null then
    perform 1 from public.accounts where id=subject for share;
    if subject<>new.user_id or not exists(select 1 from public.accounts
        where id=subject and status='active') then
      raise exception 'Profile unavailable' using errcode='42501'; end if;
  end if;
  return new;
end; $$;
create trigger pals_require_active_profile_write before update on public.profiles
  for each row execute function private.require_active_profile_write();
revoke all on function private.require_active_profile_write()
  from public,anon,authenticated;

create function private.require_active_photo_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid:=auth.uid(); target storage.objects%rowtype;
begin
  target:=case when tg_op='DELETE' then old else new end;
  if target.bucket_id='profile-photos'
    and current_setting('role',true)='authenticated' and subject is not null then
    perform 1 from public.accounts where id=subject for share;
    if target.owner_id<>subject::text or not exists(select 1 from public.accounts
        where id=subject and status='active') then
      raise exception 'Photo unavailable' using errcode='42501'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
create trigger pals_require_active_photo_insert before insert on storage.objects
  for each row execute function private.require_active_photo_write();
create trigger pals_require_active_photo_delete before delete on storage.objects
  for each row execute function private.require_active_photo_write();
revoke all on function private.require_active_photo_write()
  from public,anon,authenticated;

-- Cleanup transitions in friendship and DM, and notification preference/read
-- writes, previously rechecked active status without holding its row lock.
-- The source RPC still decides eligibility; this only serializes live status.
create function private.require_active_student_source_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid:=auth.uid();
begin
  if current_setting('role',true)='authenticated' then
    if subject is null then
      raise exception 'Student operation unavailable' using errcode='42501'; end if;
    perform 1 from public.accounts where id=subject for share;
    if not exists(select 1 from public.accounts where id=subject
        and status='active') then
      raise exception 'Student operation unavailable' using errcode='42501'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
create trigger pals_active_friendship_write before update or delete
  on private.friendships for each row
  execute function private.require_active_student_source_write();
create trigger pals_active_dm_pair_write before update or delete
  on private.dm_pairs for each row
  execute function private.require_active_student_source_write();
create trigger pals_active_notification_preference_write before insert or update
  on private.notification_preferences for each row
  execute function private.require_active_student_source_write();
create trigger pals_active_notification_read_write before update of read_at
  on private.notification_items for each row
  execute function private.require_active_student_source_write();
revoke all on function private.require_active_student_source_write()
  from public,anon,authenticated;

-- Moderation audit and sanctions are append-only at the database boundary.
-- A deliberate full local reset remains the fixture cleanup mechanism.
create function private.reject_moderation_evidence_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  raise exception 'Moderation evidence is immutable' using errcode='42501';
end; $$;
create trigger account_sanctions_immutable before update or delete
  on private.account_sanctions for each row
  execute function private.reject_moderation_evidence_change();
create trigger moderation_audit_immutable before update or delete
  on private.moderation_audit for each row
  execute function private.reject_moderation_evidence_change();
revoke all on function private.reject_moderation_evidence_change()
  from public,anon,authenticated;

-- Stage A's case transition already checks a replay's live operator and target
-- authority. Its fingerprint is exactly 32 hex characters. B1 prefixes its
-- fingerprint, making cross-RPC request UUID reuse unconditionally unequal.
create function public.apply_account_moderation_action(
  p_report_id uuid,p_request_id uuid,p_expected_case_revision bigint,
  p_action text,p_reason text)
returns table(case_state text,revision bigint,account_status text)
language plpgsql volatile security definer set search_path='' as $$
declare
  actor uuid; r private.safety_reports%rowtype;
  c private.moderation_cases%rowtype; prior private.moderation_requests%rowtype;
  target public.accounts%rowtype; normalized_reason text; fingerprint text;
  required_role text; next_status text; campus uuid; saved_sanction uuid;
begin
  -- Stage A order: moderation advisory lock, gate, actor account and role,
  -- stored report, target account, request UUID, case, membership, writes.
  -- The target account UPDATE lock also excludes concurrent FK key-share
  -- platform-role insertion. It conflicts with student evidence SHARE locks.
  actor:=private.moderation_actor();
  normalized_reason:=private.profile_trim(p_reason);
  if p_report_id is null or p_request_id is null
    or p_expected_case_revision is null or p_expected_case_revision<0
    or p_action is null or p_action not in ('suspend','ban','reinstate')
    or normalized_reason is null or char_length(normalized_reason) not between 1 and 2000
    or not private.moderation_report_allowed(actor,p_report_id,true) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  select * into r from private.safety_reports where id=p_report_id;
  if r.target_type<>'user' then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  select * into target from public.accounts where id=r.target_id;
  if not found or exists(select 1 from public.platform_roles where user_id=r.target_id) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  required_role:=case when p_action='suspend' then 'moderator' else 'admin' end;
  if not exists(select 1 from public.platform_roles where user_id=actor and
    (role='admin' or (required_role='moderator' and role='moderator'))) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  fingerprint:='account:'||md5(jsonb_build_array(p_report_id,
    p_expected_case_revision,p_action,normalized_reason)::text);
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,17017));
  select * into prior from private.moderation_requests
    where operator_id=actor and request_id=p_request_id;
  if found then
    if prior.fingerprint<>fingerprint then
      raise exception 'Moderation unavailable' using errcode='42501'; end if;
    -- Current operator/gate/conflict/target-role checks occurred above. The
    -- replay reveals only the original minimal result, not current status.
    select s.new_status into account_status from private.account_sanctions s
      where s.operator_id=actor and s.request_id=p_request_id
        and s.report_id=p_report_id;
    if account_status is null then
      raise exception 'Moderation unavailable' using errcode='42501'; end if;
    case_state:=prior.result_state; revision:=prior.result_revision;
    return next; return;
  end if;
  select * into c from private.moderation_cases
    where report_id=p_report_id for update;
  if not found or c.state<>'in_review'
    or c.revision<>p_expected_case_revision then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  next_status:=case p_action when 'suspend' then 'suspended'
    when 'ban' then 'banned' else 'active' end;
  if (p_action='suspend' and target.status<>'active')
    or (p_action='ban' and target.status not in ('active','suspended'))
    or (p_action='reinstate' and target.status not in ('suspended','banned')) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  select university_id into campus from public.university_memberships
    where user_id=r.target_id for share;
  -- The account, role, case, gate, report and current membership are held
  -- through commit. Recheck after every possible lock wait.
  if not exists(select 1 from private.moderation_feature_gate where singleton and enabled)
    or not exists(select 1 from public.accounts where id=actor and status='active')
    or not exists(select 1 from public.platform_roles where user_id=actor and
      (role='admin' or (required_role='moderator' and role='moderator')))
    or exists(select 1 from public.platform_roles where user_id=r.target_id)
    or not exists(select 1 from public.accounts where id=r.target_id
      and status=target.status) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  insert into private.account_sanctions(report_id,subject_id,operator_id,request_id,
    action,previous_status,new_status,subject_campus_id,reason)
    values(r.id,r.target_id,actor,p_request_id,p_action,target.status,
      next_status,campus,normalized_reason) returning id into saved_sanction;
  update public.accounts set status=next_status where id=r.target_id;
  update private.moderation_cases set state='closed',revision=c.revision+1,
    note=normalized_reason,disposition='action_taken',duplicate_report_id=null,
    sanction_id=saved_sanction where report_id=r.id;
  insert into private.moderation_requests(operator_id,request_id,fingerprint,
    report_id,result_state,result_revision)
    values(actor,p_request_id,fingerprint,r.id,'closed',c.revision+1);
  insert into private.moderation_audit(operator_id,action,report_id,
    subject_target_type,subject_target_id,subject_campus_id,request_id,
    previous_state,new_state,previous_revision,new_revision,reason,sanction_id,
    previous_account_status,new_account_status)
    values(actor,p_action,r.id,'user',r.target_id,campus,p_request_id,
      c.state,'closed',c.revision,c.revision+1,normalized_reason,saved_sanction,
      target.status,next_status);
  case_state:='closed'; revision:=c.revision+1; account_status:=next_status;
  return next;
end; $$;
revoke all on function public.apply_account_moderation_action(uuid,uuid,bigint,text,text)
  from public,anon,authenticated;
grant execute on function public.apply_account_moderation_action(uuid,uuid,bigint,text,text)
  to authenticated;
commit;
