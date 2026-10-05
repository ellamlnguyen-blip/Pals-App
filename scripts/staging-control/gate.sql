-- Table identifier comes from the fixed allowlist in run.mjs; excludes analytics and large safeguards.
do $control$
declare
 request constant uuid := {{REQUEST_ID}}::uuid;
 gate constant text := {{GATE_KEY}};
 expected constant boolean := {{EXPECTED_ENABLED}};
 desired constant boolean := {{NEW_ENABLED}};
 prior private.staging_control_audit%rowtype;
 old_enabled boolean;
begin
 if session_user <> 'postgres' or current_setting('role',true) not in ('none','postgres')
  or current_database() <> 'postgres' or current_setting('transaction_isolation') <> 'read committed' then
  raise exception 'Staging administrative channel unavailable' using errcode='42501'; end if;
 perform private.pilot_evidence_write_lock();
 perform 1 from private.pilot_availability where singleton for share;
 perform 1 from private.pilot_capabilities order by key for share;
 select enabled into old_enabled from {{GATE_TABLE}} where singleton for update;
 if old_enabled is null then raise exception 'Source gate missing' using errcode='42501'; end if;
 select * into prior from private.staging_control_audit where request_id=request;
 if found then
  if prior.operation is distinct from 'source_gate' or prior.gate_key is distinct from gate or prior.previous_value is distinct from to_jsonb(expected)
   or prior.new_value is distinct from to_jsonb(desired) or prior.reason is distinct from {{REASON}}
   or prior.authorization_ref is distinct from {{AUTHORIZATION_REF}} or prior.credential_ref is distinct from {{CREDENTIAL_REF}} then
   raise exception 'Request UUID conflict' using errcode='42501'; end if;
  return;
 end if;
 if old_enabled<>expected or old_enabled=desired then raise exception 'Source gate state mismatch' using errcode='42501'; end if;
 update {{GATE_TABLE}} set enabled=desired where singleton;
 insert into private.staging_control_audit(request_id,operation,gate_key,previous_value,new_value,reason,authorization_ref,credential_ref,executor_session_user,executor_backend_pid)
 values(request,'source_gate',gate,to_jsonb(old_enabled),to_jsonb(desired),{{REASON}},{{AUTHORIZATION_REF}},{{CREDENTIAL_REF}},session_user,pg_backend_pid());
end
$control$;
