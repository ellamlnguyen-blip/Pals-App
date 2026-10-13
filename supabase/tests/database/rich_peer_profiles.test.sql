begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

-- Every fixture, policy toggle and consent mutation rolls back.
insert into auth.users(id,email,email_confirmed_at) values
 ('78000000-0000-4000-8000-000000000001','rich-owner@unc.edu',now()),
 ('78000000-0000-4000-8000-000000000002','rich-viewer@unc.edu',now()),
 ('78000000-0000-4000-8000-000000000003','rich-third@unc.edu',now());
update public.profiles set real_name='Rich Test',major='Biology',graduation_year=2028,
 bio='Meet for coffee',hometown='Durham, NC',
 prompts='[{"question":"Favorite walk?","answer":"Campus loop"}]'::jsonb
 where user_id::text like '78000000-%';
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key='people';
update private.people_feature_gate set enabled=true where singleton;

select ok(not has_table_privilege('authenticated','private.rich_profile_preferences','SELECT'), 'rich rows have no client SELECT');
select ok(not has_table_privilege('authenticated','private.rich_profile_preferences','UPDATE'), 'rich rows have no client UPDATE');
select ok(not has_table_privilege('anon','private.rich_profile_preferences','SELECT'), 'anon has no raw rich row');
select ok(not has_function_privilege('anon','public.get_rich_people_detail(uuid)','EXECUTE'), 'anon cannot execute detail');
select ok(not has_function_privilege('service_role','public.get_rich_people_detail(uuid)','EXECUTE'), 'service role has no rich client RPC grant');
select ok(not has_function_privilege('authenticated','private.rich_lock_consent(uuid,boolean)','EXECUTE'), 'internal lock helper is private');
select is((select enabled from private.rich_profile_feature_gate where singleton),false,'new rich gate defaults off');
select is((select count(*) from private.rich_profile_preferences),0::bigint,'old People opt-ins are not backfilled');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select opted_in from public.get_my_rich_profile_preference()),false,'missing row reads false');
select is((select revision from public.get_my_rich_profile_preference()),0::bigint,'missing row reads revision zero');
select throws_ok($$select * from private.rich_profile_preferences$$,'42501',null,'direct preference read denied');
select throws_ok($$select * from public.set_my_rich_profile_preference(true,0)$$,'42501',null,'gate-off rich opt-in denied');
select is(public.set_people_preference(true),true,'People opt-in remains available with rich gate off');
select ok(exists(select 1 from pg_catalog.pg_locks where pid=pg_backend_pid()
  and locktype='advisory' and classid=16016 and objid=1 and mode='ExclusiveLock'),
  'replacement People writer holds social mutation key');
select ok(exists(select 1 from pg_catalog.pg_locks where pid=pg_backend_pid()
  and locktype='advisory' and classid=16027 and objid=1 and mode='ShareLock'),
  'replacement People writer holds shared evidence key');
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'rich detail gate off returns no row');
reset role;
update private.rich_profile_feature_gate set enabled=true where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
reset role;

-- The viewer and subject both choose People; only the subject chooses rich.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.set_people_preference(true),true,'subject People opt-in');
select is((select revision from public.set_my_rich_profile_preference(true,0)),1::bigint,'subject rich opt-in increments once');
select ok(exists(select 1 from pg_catalog.pg_locks where pid=pg_backend_pid()
  and locktype='advisory' and classid=16016 and objid=1 and mode='ExclusiveLock'),
  'rich writer holds social mutation key');
select ok(exists(select 1 from pg_catalog.pg_locks where pid=pg_backend_pid()
  and locktype='advisory' and classid=16027 and objid=1 and mode='ShareLock'),
  'rich writer holds shared evidence key');
select is((select revision from public.set_my_rich_profile_preference(true,1)),1::bigint,'same-value CAS is no-op');
select throws_ok($$select * from public.set_my_rich_profile_preference(false,0)$$,'42501',null,'stale CAS denied');
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000001')),0::bigint,'unshared viewer target hidden');
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select hometown from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),'Durham, NC','authorized viewer receives hometown');
select is((select prompts->0->>'answer' from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),'Campus loop','authorized viewer receives prompt');
select is((select photo_slots from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),array[]::text[],'empty photos yield no slots');
select is((select unc_email_verified from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),true,'verification is live authorization result');
select is((select count(*) from public.profiles where user_id='78000000-0000-4000-8000-000000000002'),0::bigint,'raw peer profile remains hidden');
select throws_ok($$select primary_photo_path from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')$$,'42703',null,'rich detail has no object path');
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000001')),0::bigint,'self rich detail denied');
reset role;

update private.people_feature_gate set enabled=false where singleton;
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'People gate closure revokes');
reset role;
update private.people_feature_gate set enabled=true where singleton;
update private.rich_profile_feature_gate set enabled=false where singleton;
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'rich gate closure revokes');
reset role;
update private.rich_profile_feature_gate set enabled=true where singleton;
update private.people_preferences set opted_in=false where account_id='78000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'viewer People opt-out revokes rich detail');
reset role;
update private.people_preferences set opted_in=true where account_id='78000000-0000-4000-8000-000000000001';
update public.accounts set status='suspended' where id='78000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'subject suspension revokes');
reset role;
update public.accounts set status='active' where id='78000000-0000-4000-8000-000000000002';
update public.accounts set status='banned' where id='78000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'viewer ban revokes');
reset role;
update public.accounts set status='active' where id='78000000-0000-4000-8000-000000000001';
insert into public.universities(id,slug,name,active,allowed_email_domains)
 values('78000000-0000-4000-8000-000000000099','rich-other','Other campus',true,array['unc.edu']);
update public.university_memberships set university_id='78000000-0000-4000-8000-000000000099'
 where user_id='78000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'cross-campus subject denied');
reset role;
update public.university_memberships set university_id='00000000-0000-4000-8000-000000000001'
 where user_id='78000000-0000-4000-8000-000000000002';

insert into private.people_blocks(blocker_id,blocked_id) values
 ('78000000-0000-4000-8000-000000000001','78000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'outbound block revokes');
reset role;
delete from private.people_blocks;
insert into private.people_blocks(blocker_id,blocked_id) values
 ('78000000-0000-4000-8000-000000000002','78000000-0000-4000-8000-000000000001');
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'inbound block revokes');
reset role;
delete from private.people_blocks;
update public.profiles set bio=null where user_id='78000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'text-unpublishable subject has no rich row');
reset role;
update public.profiles set bio='Meet for coffee' where user_id='78000000-0000-4000-8000-000000000002';
update auth.users set email_confirmed_at=null where id='78000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'live Auth unconfirmation revokes');
reset role;
update auth.users set email_confirmed_at=now() where id='78000000-0000-4000-8000-000000000002';
update auth.users set email='rich-viewer@example.edu' where id='78000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'non-allowlisted viewer email revokes');
reset role;
update auth.users set email='rich-owner@unc.edu' where id='78000000-0000-4000-8000-000000000001';
update private.pilot_capabilities set enabled=false where key='people';
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'capability closure revokes');
reset role;
update private.pilot_capabilities set enabled=true where key='people';
update private.pilot_availability set enabled=false where singleton;
set local role authenticated;
select is((select count(*) from public.get_rich_people_detail('78000000-0000-4000-8000-000000000002')),0::bigint,'pilot closure revokes');
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select revision from public.set_my_rich_profile_preference(false,1)),2::bigint,'rich opt-out works with policy closed');
select is((select revision from public.set_my_rich_profile_preference(false,2)),2::bigint,'rich opt-out no-op retains revision');
reset role;
update private.pilot_availability set enabled=true where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select revision from public.set_my_rich_profile_preference(true,2)),3::bigint,'fresh opt-in after closure');
select is(public.set_people_preference(false),false,'People off clears rich atomically');
select is((select revision from public.get_my_rich_profile_preference()),4::bigint,'People off increments rich revision');
select is((select opted_in from public.get_my_rich_profile_preference()),false,'People off leaves rich off');
select is(public.set_people_preference(true),true,'People re-opt-in');
select is((select opted_in from public.get_my_rich_profile_preference()),false,'People re-opt-in does not restore rich');
select throws_ok($$select * from public.set_my_rich_profile_preference(true,3)$$,'42501',null,'People off invalidates stale rich CAS');
reset role;
update private.people_feature_gate set enabled=false where singleton;
update private.rich_profile_feature_gate set enabled=false where singleton;
update auth.users set email_confirmed_at=null where id='78000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.set_people_preference(false),false,'People opt-out works after eligibility and gates lost');
select is((select revision from public.set_my_rich_profile_preference(false,4)),4::bigint,'rich opt-out works after eligibility and gates lost');
select throws_ok($$select * from public.set_my_rich_profile_preference(true,4)$$,'42501',null,'rich opt-in denied after eligibility and gates lost');
select * from finish();
rollback;
