-- One exact current Ella UUID, one exact role transition, no client RPC.
do $control$
declare
 target constant uuid := {{SUBJECT_ID}}::uuid;
 request constant uuid := {{REQUEST_ID}}::uuid;
 op constant text := {{OPERATION}};
 desired constant text := {{NEW_ROLE}};
 expected constant text := {{EXPECTED_ROLE}};
 prior private.staging_control_audit%rowtype;
 old_role text;
 campus uuid;
begin
 if session_user <> 'postgres' or current_setting('role',true) not in ('none','postgres')
  or current_database() <> 'postgres' or current_setting('transaction_isolation') <> 'read committed' then
  raise exception 'Staging administrative channel unavailable' using errcode='42501'; end if;
 perform private.social_hangout_mutation_lock();
 lock table public.platform_roles in share row exclusive mode;
 perform 1 from private.moderation_feature_gate where singleton for share;
 perform 1 from public.accounts where id=target for share;
 perform 1 from auth.users where id=target for share;
 select university_id into campus from public.university_memberships where user_id=target for share;
 perform 1 from public.universities where id=campus for share;
 select role into old_role from public.platform_roles where user_id=target for update;
 if not exists(select 1 from auth.users u join public.accounts a on a.id=u.id where a.id=target) then
  raise exception 'Expected Ella account missing' using errcode='42501'; end if;
 if op='grant_moderator' and not exists(
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
  if prior.operation is distinct from op or prior.subject_id is distinct from target or prior.previous_value is distinct from to_jsonb(expected)
   or prior.new_value is distinct from coalesce(to_jsonb(desired),'null'::jsonb) or prior.reason is distinct from {{REASON}}
   or prior.authorization_ref is distinct from {{AUTHORIZATION_REF}} or prior.credential_ref is distinct from {{CREDENTIAL_REF}} then
   raise exception 'Request UUID conflict' using errcode='42501'; end if;
  return;
 end if;
 if old_role is distinct from expected then raise exception 'Platform role mismatch' using errcode='42501'; end if;
 if op='grant_moderator' then
  if desired<>'moderator' or expected is not null
   or exists(select 1 from public.platform_roles where user_id<>target) then
   raise exception 'Sole moderator precondition failed' using errcode='42501'; end if;
  insert into public.platform_roles(user_id,role) values(target,'moderator');
 elsif op='revoke_moderator' then
  if desired is not null or expected<>'moderator' then raise exception 'Moderator revocation precondition failed' using errcode='42501'; end if;
  delete from public.platform_roles where user_id=target and role='moderator';
 else raise exception 'Operation unavailable' using errcode='42501'; end if;
 insert into private.staging_control_audit(request_id,operation,subject_id,previous_value,new_value,reason,authorization_ref,credential_ref,executor_session_user,executor_backend_pid)
 values(request,op,target,to_jsonb(old_role),coalesce(to_jsonb(desired),'null'::jsonb),{{REASON}},{{AUTHORIZATION_REF}},{{CREDENTIAL_REF}},session_user,pg_backend_pid());
end
$control$;
