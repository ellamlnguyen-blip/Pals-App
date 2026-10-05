-- Mandatory-row sequential checks; these are not observed concurrent waits.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values('b2500000-0000-4000-8000-000000000001','mandatory-operator@unc.edu',now());
insert into public.platform_roles(user_id,role) values('b2500000-0000-4000-8000-000000000001','moderator');

-- SQL-role fixture: live Auth rows model a verified operator session; HTTP uses real TOTP.
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values
 ('a396b1b7-de4a-f2e8-0aa7-6d486cc3d0f2','b2500000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into auth.sessions(id,user_id,factor_id,aal) values
 ('4a2eff4c-d45d-21be-1252-8b92c5806712','b2500000-0000-4000-8000-000000000001','a396b1b7-de4a-f2e8-0aa7-6d486cc3d0f2','aal2');
update private.moderation_feature_gate set enabled=true;
set local role authenticated;
set local request.jwt.claims='{"sub":"b2500000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"4a2eff4c-d45d-21be-1252-8b92c5806712"}';
select lives_ok($$select public.list_moderation_reports(null,null,1)$$,'unadmitted incomplete operator works during pilot shutdown');
reset role;
delete from private.moderation_feature_gate where singleton;
set local role authenticated;
select throws_ok($$select public.list_moderation_reports()$$,'42501','Moderation unavailable','absent mandatory gate denies');
reset role;
insert into private.moderation_feature_gate(singleton,enabled) values(true,true);
delete from public.platform_roles where user_id='b2500000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select public.list_moderation_reports()$$,'42501','Moderation unavailable','absent mandatory role denies');
reset role;
delete from public.accounts where id='b2500000-0000-4000-8000-000000000001';
select is((select count(*) from auth.users where id='b2500000-0000-4000-8000-000000000001'),1::bigint,'account deletion retains synthetic Auth parent');
select throws_ok($$insert into public.platform_roles(user_id,role) values('b2500000-0000-4000-8000-000000000001','moderator')$$,'23503',null,'role FK prevents absent-account role replacement');
set local role authenticated;
select throws_ok($$select public.list_moderation_reports()$$,'42501','Moderation unavailable','absent mandatory account denies');
reset role;
insert into public.accounts(id) values('b2500000-0000-4000-8000-000000000001');
insert into public.platform_roles(user_id,role) values('b2500000-0000-4000-8000-000000000001','moderator');
select ok(not has_function_privilege('anon','private.moderation_actor()','EXECUTE'),'anon helper denied');
select ok(not has_function_privilege('authenticated','private.moderation_actor()','EXECUTE'),'authenticated helper denied');
select ok(not has_function_privilege('service_role','private.moderation_actor()','EXECUTE'),'service helper denied');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('private','public') and p.prosrc like '%private.moderation_actor()%'),5::bigint,'exact five direct callers');
select is((select provolatile::text||':'||prosecdef::text||':'||prorettype::regtype::text from pg_proc where oid='private.moderation_actor()'::regprocedure),'v:true:uuid','helper ABI preserved');
select is((select proconfig[1] from pg_proc where oid='private.moderation_actor()'::regprocedure),'search_path=""','empty fixed path');
select is((select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('private','public') and p.prosrc like '%private.moderation_actor()%'),array['apply_account_moderation_action','apply_hangout_moderation_action','get_moderation_report','list_moderation_reports','transition_moderation_case']::text[],'exact caller inventory');
select * from finish();
rollback;
