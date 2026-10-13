-- ADR-0035: one-way staging incident shutdown, executed only by the fixed runner.
do $control$
declare
 request constant uuid := {{REQUEST_ID}}::uuid;
 expected_revision constant bigint := {{EXPECTED_REVISION}};
 prior private.staging_control_audit%rowtype;
 old_enabled boolean;
 old_revision bigint;
begin
 if session_user <> 'postgres' or current_setting('role',true) not in ('none','postgres')
  or current_database() <> 'postgres' or current_setting('transaction_isolation') <> 'read committed' then
  raise exception 'Staging administrative channel unavailable' using errcode='42501'; end if;
 perform private.pilot_lock_management(null,null,'availability');
 if expected_revision < 1 or expected_revision = 9223372036854775807 then
  raise exception 'Availability revision invalid' using errcode='42501'; end if;
 -- Retry is checked under the availability lock before checking today's state.
 select * into prior from private.staging_control_audit where request_id=request;
 if found then
  if prior.operation is distinct from 'emergency_availability_off'
   or prior.subject_id is not null or prior.gate_key is not null
   or prior.previous_value is distinct from 'true'::jsonb or prior.new_value is distinct from 'false'::jsonb
   or prior.previous_revision is distinct from expected_revision
   or prior.new_revision is distinct from expected_revision+1
   or prior.reason is distinct from {{REASON}}
   or prior.authorization_ref is distinct from {{AUTHORIZATION_REF}}
   or prior.credential_ref is distinct from {{CREDENTIAL_REF}} then
   raise exception 'Request UUID conflict' using errcode='42501'; end if;
  -- A historical receipt must not report a currently reopened application as off.
  perform 1 from private.pilot_availability
   where singleton and enabled=false and revision=prior.new_revision;
  if not found then raise exception 'Availability state mismatch' using errcode='42501'; end if;
  return;
 end if;
 select enabled,revision into old_enabled,old_revision from private.pilot_availability where singleton;
 if old_enabled is distinct from true or old_revision is distinct from expected_revision then
  raise exception 'Availability state mismatch' using errcode='42501'; end if;
 update private.pilot_availability
  set enabled=false,revision=old_revision+1,updated_at=clock_timestamp() where singleton;
 insert into private.staging_control_audit
  (request_id,operation,previous_value,new_value,previous_revision,new_revision,
   reason,authorization_ref,credential_ref,executor_session_user,executor_backend_pid)
 values(request,'emergency_availability_off',to_jsonb(old_enabled),'false'::jsonb,
  old_revision,old_revision+1,{{REASON}},{{AUTHORIZATION_REF}},{{CREDENTIAL_REF}},session_user,pg_backend_pid());
end
$control$;
