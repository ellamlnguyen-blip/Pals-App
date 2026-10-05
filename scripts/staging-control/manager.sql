-- Execute only through run.mjs against the reviewed exact Pals Staging project.
do $control$
declare
 target constant uuid := {{SUBJECT_ID}}::uuid;
 request constant uuid := {{REQUEST_ID}}::uuid;
 op constant text := {{OPERATION}};
 desired constant text := {{NEW_STATE}};
 expected constant bigint := {{EXPECTED_REVISION}};
 prior private.staging_control_audit%rowtype;
 old private.pilot_admission_managers%rowtype;
 campus uuid;
 next_revision bigint;
begin
 if session_user <> 'postgres' or current_setting('role',true) not in ('none','postgres')
   or current_database() <> 'postgres' or current_setting('transaction_isolation') <> 'read committed' then
  raise exception 'Staging administrative channel unavailable' using errcode='42501';
 end if;
 perform private.pilot_lock_management(null,target,null,true);
 perform 1 from auth.users where id=target for share;
 select university_id into campus from public.university_memberships where user_id=target for share;
 perform 1 from public.universities where id=campus for share;
 if not exists(select 1 from auth.users u join public.accounts a on a.id=u.id where a.id=target) then
  raise exception 'Expected Ella account missing' using errcode='42501'; end if;
 if op='first_manager' and not exists(
  select 1 from auth.users u join public.accounts a on a.id=u.id
  join public.university_memberships m on m.user_id=a.id
  join public.universities c on c.id=m.university_id
  where a.id=target and lower(u.email)={{EXPECTED_EMAIL}} and u.email_confirmed_at is not null
   and a.status='active' and c.id=campus and c.slug='unc-chapel-hill' and c.active
   and m.verified_at is not null and lower(m.verification_email)=lower(u.email)
   and lower(split_part(u.email,'@',2))=any(c.allowed_email_domains)
 ) then raise exception 'Expected current Ella account unavailable' using errcode='42501'; end if;
 select * into prior from private.staging_control_audit where request_id=request;
 if found then
  if prior.operation is distinct from op or prior.subject_id is distinct from target or prior.new_value is distinct from to_jsonb(desired)
   or prior.reason is distinct from {{REASON}} or prior.authorization_ref is distinct from {{AUTHORIZATION_REF}}
   or prior.credential_ref is distinct from {{CREDENTIAL_REF}} or prior.previous_revision is distinct from expected then
   raise exception 'Request UUID conflict' using errcode='42501'; end if;
  return;
 end if;
 select * into old from private.pilot_admission_managers where account_id=target;
 if coalesce(old.revision,0)<>expected then raise exception 'Manager revision mismatch' using errcode='42501'; end if;
 if op='first_manager' then
  if desired<>'active' or expected<>0 or old.account_id is not null
   or exists(select 1 from private.pilot_admission_managers where state='active') then
    raise exception 'First-manager precondition failed' using errcode='42501'; end if;
  next_revision:=1;
  insert into private.pilot_admission_managers(account_id,state,revision) values(target,'active',next_revision);
 elsif op='revoke_manager' then
  if desired<>'revoked' or old.account_id is null or old.state<>'active' then
   raise exception 'Manager revocation precondition failed' using errcode='42501'; end if;
  next_revision:=old.revision+1;
  update private.pilot_admission_managers set state='revoked',revision=next_revision,updated_at=clock_timestamp() where account_id=target;
 else raise exception 'Operation unavailable' using errcode='42501'; end if;
 insert into private.staging_control_audit(request_id,operation,subject_id,previous_value,new_value,previous_revision,new_revision,reason,authorization_ref,credential_ref,executor_session_user,executor_backend_pid)
 values(request,op,target,to_jsonb(old.state),to_jsonb(desired),coalesce(old.revision,0),next_revision,{{REASON}},{{AUTHORIZATION_REF}},{{CREDENTIAL_REF}},session_user,pg_backend_pid());
 insert into private.pilot_manager_audit(account_id,executor_session_user,executor_original_role,executor_backend_pid,previous_state,new_state,previous_revision,new_revision,reason,request_id)
 values(target,session_user,current_setting('role',true),pg_backend_pid(),old.state,desired,coalesce(old.revision,0),next_revision,{{REASON}},request);
end
$control$;
