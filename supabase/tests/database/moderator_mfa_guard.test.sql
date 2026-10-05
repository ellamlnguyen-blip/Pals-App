begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at) values
 ('62700000-0000-4000-8000-000000000001','mfa-sql-operator@unc.edu',now()),
 ('62700000-0000-4000-8000-000000000002','mfa-sql-other@unc.edu',now());
insert into public.platform_roles(user_id,role) values
 ('62700000-0000-4000-8000-000000000001','moderator');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values('62700000-0000-4000-8001-000000000001',
 '62700000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into auth.sessions(id,user_id,factor_id,aal) values
 ('62700000-0000-4000-8002-000000000001',
 '62700000-0000-4000-8000-000000000001',
 '62700000-0000-4000-8001-000000000001','aal2');
update private.moderation_feature_gate set enabled=true;

set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"62700000-0000-4000-8000-000000000001","role":"authenticated","session_id":"62700000-0000-4000-8002-000000000001"}',true);
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','missing AAL denied');
select set_config('request.jwt.claims',
 '{"sub":"62700000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"62700000-0000-4000-8002-000000000001"}',true);
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','AAL1 denied despite live AAL2 session');
select throws_ok($$select * from public.get_moderation_report('62700000-0000-4000-8003-000000000001')$$,
 '42501','Moderation unavailable','AAL1 detail denied');
select throws_ok($$select * from public.transition_moderation_case(
 '62700000-0000-4000-8003-000000000001','62700000-0000-4000-8004-000000000001',0,'start_review')$$,
 '42501','Moderation unavailable','AAL1 case transition denied');
select throws_ok($$select * from public.apply_account_moderation_action(
 '62700000-0000-4000-8003-000000000001','62700000-0000-4000-8004-000000000002',1,'suspend','Cause')$$,
 '42501','Moderation unavailable','AAL1 account action denied');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '62700000-0000-4000-8003-000000000001','62700000-0000-4000-8004-000000000003',1,'Cause')$$,
 '42501','Moderation unavailable','AAL1 Hangout action denied');
select set_config('request.jwt.claims',
 '{"sub":"62700000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','AAL2 with missing session claim denied');
select set_config('request.jwt.claims',
 '{"sub":"62700000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"invalid"}',true);
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','invalid session claim denied without parse leak');
select set_config('request.jwt.claims',
 '{"sub":"62700000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"62700000-0000-4000-8002-000000000001"}',true);
select lives_ok($$select * from public.list_moderation_reports()$$,
 'AAL2 with owned verified live Auth rows passes SQL role boundary');
reset role;

update auth.mfa_factors set status='unverified'
 where id='62700000-0000-4000-8001-000000000001';
set local role authenticated;
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','unverified factor denied');
reset role;
update auth.mfa_factors set status='verified',
 user_id='62700000-0000-4000-8000-000000000002'
 where id='62700000-0000-4000-8001-000000000001';
set local role authenticated;
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','other owner factor denied');
reset role;
update auth.mfa_factors set user_id='62700000-0000-4000-8000-000000000001'
 where id='62700000-0000-4000-8001-000000000001';
update auth.sessions set not_after=now()-interval '1 second'
 where id='62700000-0000-4000-8002-000000000001';
set local role authenticated;
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','expired session denied');
reset role;
select ok(not has_function_privilege('authenticated','private.moderation_actor()','EXECUTE'),
 'guard remains inaccessible to client role');
select * from finish();
rollback;
