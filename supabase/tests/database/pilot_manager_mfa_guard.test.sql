begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(not has_function_privilege('authenticated','private.pilot_require_manager()','EXECUTE'),
  'manager MFA helper remains private');
select is((select provolatile::text||':'||prosecdef::text||':'||prorettype::regtype::text
  from pg_proc where oid='private.pilot_require_manager()'::regprocedure),
  'v:true:uuid','manager guard ABI and volatile authorization preserved');
insert into auth.users(id,email,email_confirmed_at)
  values('56000000-0000-4000-8000-000000000001','pilot-manager-mfa-sql@unc.edu',now());
select is(private.set_pilot_manager_fixture('56000000-0000-4000-8000-000000000001',
  'active',0,'Local SQL manager',gen_random_uuid()),1::bigint,'actual manager installed');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"56000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select throws_ok($$select * from public.set_pilot_policy('availability',true,1,'AAL1',gen_random_uuid())$$,
  '42501','Pilot management unavailable','actual-role AAL1 manager cannot enable availability');
select throws_ok($$select * from public.set_pilot_account_admission('56000000-0000-4000-8000-000000000001',
  'active',0,'AAL1',gen_random_uuid())$$,'42501','Pilot management unavailable',
  'actual-role AAL1 manager cannot change admission');
select set_config('request.jwt.claims',
  '{"sub":"56000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"56000000-0000-4000-8000-000000000002"}',true);
select throws_ok($$select * from public.set_pilot_policy('availability',true,1,'Missing session',gen_random_uuid())$$,
  '42501','Pilot management unavailable','AAL2 claim without live Auth session is denied');
reset role;
select is((select enabled from private.pilot_availability),false,'denied calls leave availability closed');
select is((select count(*) from private.pilot_management_audit),0::bigint,'denied calls leave no management audit');
select * from finish();
rollback;
