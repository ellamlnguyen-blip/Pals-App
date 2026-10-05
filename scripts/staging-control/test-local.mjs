#!/usr/bin/env node
// Emits one rolled-back SQL test transaction for the exact local schema.
// Pipe to the named disposable local Postgres container; never to a hosted project.
import { buildOperation } from './run.mjs';

const base = {
  PALS_CONTROL_PROJECT_REF: 'ffabdrgsmtfylrehwmfo',
  PALS_CONTROL_SUBJECT_ID: '8ebd74bb-2a72-4689-9580-72268106d91b',
  PALS_CONTROL_REASON: 'Local staging-control test',
  PALS_CONTROL_AUTHORIZATION_REF: 'local-test-authorization',
};
const op = (operation, id, extra = {}) => buildOperation({
  ...base, PALS_CONTROL_OPERATION: operation,
  PALS_CONTROL_REQUEST_ID: `97000000-0000-4000-8000-${String(id).padStart(12,'0')}`,
  ...extra,
}).sql;
const quoted = (value) => `'${value.replaceAll("'", "''")}'`;
const mustFail = (sql, label) => `do $assert$ begin
 begin execute ${quoted(sql)}; raise exception 'Expected denial: ${label}';
 exception when insufficient_privilege then null; end;
end $assert$;`;
const check = (condition, label) => `do $assert$ begin if not (${condition}) then raise exception 'Failed: ${label}'; end if; end $assert$;`;
const first = op('first_manager',1,{PALS_CONTROL_EXPECTED_REVISION:'0'});
const grant = op('grant_moderator',2);
const gate = op('source_gate',3,{PALS_CONTROL_GATE:'hangouts',PALS_CONTROL_EXPECTED_ENABLED:'false',PALS_CONTROL_NEW_ENABLED:'true'});
const revokeRole = op('revoke_moderator',4);
const revokeManager = op('revoke_manager',5,{PALS_CONTROL_EXPECTED_REVISION:'1'});
const grantAdmin = op('grant_admin',8);
const revokeAdmin = op('revoke_admin',9);
const changedAdminRetry = op('grant_admin',8,{PALS_CONTROL_REASON:'Changed reason'});
const staleAdminGrant = op('grant_admin',10);
const failedRetry = op('first_manager',1,{PALS_CONTROL_EXPECTED_REVISION:'0',PALS_CONTROL_REASON:'Changed reason'});
const wrongRevision = op('revoke_manager',6,{PALS_CONTROL_EXPECTED_REVISION:'0'});
const wrongGate = op('source_gate',7,{PALS_CONTROL_GATE:'hangouts',PALS_CONTROL_EXPECTED_ENABLED:'false',PALS_CONTROL_NEW_ENABLED:'true'});
const emergency = op('emergency_availability_off',11,{PALS_CONTROL_EXPECTED_REVISION:'1'});
const changedEmergencyRetry = op('emergency_availability_off',11,{PALS_CONTROL_EXPECTED_REVISION:'1',PALS_CONTROL_REASON:'Changed incident reason'});
const changedEmergencyRevision = op('emergency_availability_off',11,{PALS_CONTROL_EXPECTED_REVISION:'2'});
const crossOperationEmergency = op('emergency_availability_off',1,{PALS_CONTROL_EXPECTED_REVISION:'1'});
const staleEmergency = op('emergency_availability_off',12,{PALS_CONTROL_EXPECTED_REVISION:'1'});
const wrongEmergencyRevision = op('emergency_availability_off',13,{PALS_CONTROL_EXPECTED_REVISION:'2'});
const blocks = [
  'begin;',
  check("(select enabled=false and revision=1 from private.pilot_availability where singleton)",'migration replay leaves availability off'),
  "insert into auth.users(id,email,email_confirmed_at) values('8ebd74bb-2a72-4689-9580-72268106d91b','ella_nguyen@unc.edu',now());",
  check("exists(select 1 from public.university_memberships where user_id='8ebd74bb-2a72-4689-9580-72268106d91b' and verified_at is not null)",'membership sync'),
  check("not has_table_privilege('anon','private.staging_control_audit','SELECT,INSERT,UPDATE,DELETE') and not has_table_privilege('authenticated','private.staging_control_audit','SELECT,INSERT,UPDATE,DELETE') and not has_table_privilege('service_role','private.staging_control_audit','SELECT,INSERT,UPDATE,DELETE')",'client audit grants'),
  check("(select relrowsecurity from pg_class where oid='private.staging_control_audit'::regclass)",'audit RLS'),
  check("not exists(select 1 from public.platform_roles where user_id='8ebd74bb-2a72-4689-9580-72268106d91b')",'ordinary audit replay grants no role'),
  "update auth.users set email_confirmed_at=null where id='8ebd74bb-2a72-4689-9580-72268106d91b';",
  mustFail(first,'unconfirmed Ella cannot be provisioned'),
  "update auth.users set email_confirmed_at=now() where id='8ebd74bb-2a72-4689-9580-72268106d91b';",
  first,
  first,
  check("(select count(*) from private.staging_control_audit)=1 and (select revision from private.pilot_admission_managers where account_id='8ebd74bb-2a72-4689-9580-72268106d91b')=1",'manager and exact retry'),
  mustFail(failedRetry,'changed manager retry'),
  mustFail(wrongRevision,'manager stale revision'),
  "update auth.users set email='changed@example.test' where id='8ebd74bb-2a72-4689-9580-72268106d91b';",
  mustFail(grant,'changed Auth email'),
  "update auth.users set email='ella_nguyen@unc.edu' where id='8ebd74bb-2a72-4689-9580-72268106d91b';",
  grant,
  "update public.accounts set status='suspended' where id='8ebd74bb-2a72-4689-9580-72268106d91b';",
  mustFail(grantAdmin,'inactive Ella cannot gain admin'),
  "update public.accounts set status='active' where id='8ebd74bb-2a72-4689-9580-72268106d91b';",
  grantAdmin,
  grantAdmin,
  check("(select role from public.platform_roles where user_id='8ebd74bb-2a72-4689-9580-72268106d91b')='admin' and (select count(*) from private.staging_control_audit where operation='grant_admin')=1",'admin upgrade and exact retry'),
  mustFail(revokeRole,'moderator revoke cannot remove admin'),
  mustFail(changedAdminRetry,'changed admin retry'),
  mustFail(staleAdminGrant,'admin stale role state'),
  gate,
  gate,
  mustFail(wrongGate,'gate stale state'),
  check("(select count(*) from private.staging_control_audit)=4 and (select enabled from private.hangout_feature_gate where singleton)",'role and gate atomicity'),
  "update private.pilot_availability set enabled=true where singleton;",
  mustFail(crossOperationEmergency,'emergency cannot reuse manager request UUID'),
  emergency,
  emergency,
  check("(select enabled=false and revision=2 from private.pilot_availability where singleton) and (select count(*) from private.staging_control_audit where operation='emergency_availability_off' and subject_id is null and gate_key is null and previous_value='true'::jsonb and new_value='false'::jsonb and previous_revision=1 and new_revision=2 and executor_session_user='postgres')=1 and (select count(*) from private.pilot_management_audit)=0",'one-way emergency shutdown, separate audit and exact retry'),
  mustFail("update private.staging_control_audit set reason='rewritten' where operation='emergency_availability_off'",'emergency audit immutable update'),
  mustFail("delete from private.staging_control_audit where operation='emergency_availability_off'",'emergency audit immutable delete'),
  mustFail(changedEmergencyRetry,'changed emergency retry'),
  mustFail(changedEmergencyRevision,'changed emergency expected revision'),
  mustFail(staleEmergency,'emergency stale state'),
  mustFail(wrongEmergencyRevision,'emergency never re-enables or repeats with new request'),
  check("(select enabled=false and revision=2 from private.pilot_availability where singleton) and (select count(*) from private.staging_control_audit where operation='emergency_availability_off')=1",'failed emergency attempts are atomic'),
  "update auth.users set email='compromised@example.test' where id='8ebd74bb-2a72-4689-9580-72268106d91b';",
  "update public.accounts set status='suspended' where id='8ebd74bb-2a72-4689-9580-72268106d91b';",
  revokeAdmin,
  revokeAdmin,
  check("(select role from public.platform_roles where user_id='8ebd74bb-2a72-4689-9580-72268106d91b')='moderator' and (select count(*) from private.staging_control_audit where operation='revoke_admin')=1",'admin rollback after identity loss'),
  revokeRole,
  revokeManager,
  check("(select count(*) from private.staging_control_audit)=8 and (select count(*) from private.pilot_manager_audit where account_id='8ebd74bb-2a72-4689-9580-72268106d91b')=2 and (select state from private.pilot_admission_managers where account_id='8ebd74bb-2a72-4689-9580-72268106d91b')='revoked' and not exists(select 1 from public.platform_roles where user_id='8ebd74bb-2a72-4689-9580-72268106d91b')",'rollback retains both manager audits after identity loss'),
  "set local role authenticated;",
  check("not has_table_privilege(current_user,'private.staging_control_audit','SELECT,INSERT,UPDATE,DELETE')",'actual authenticated role denied'),
  mustFail('select 1 from private.staging_control_audit','authenticated audit read denied'),
  "reset role;",
  "set local role authenticated;",
  mustFail(first,'actual authenticated role cannot run administrative SQL'),
  mustFail(emergency,'actual authenticated role cannot run emergency SQL'),
  "reset role;",
  "set local role anon;",
  check("not has_schema_privilege(current_user,'private','USAGE')",'actual anon role denied'),
  mustFail('select 1 from private.staging_control_audit','anon audit read denied'),
  mustFail(emergency,'actual anon role cannot run emergency SQL'),
  "reset role;",
  "set local role service_role;",
  check("not has_schema_privilege(current_user,'private','USAGE')",'actual service role denied'),
  mustFail('select 1 from private.staging_control_audit','service role audit read denied'),
  mustFail(emergency,'actual service role cannot run emergency SQL'),
  "reset role;",
  "rollback;",
];
process.stdout.write(blocks.join('\n')+'\n');
