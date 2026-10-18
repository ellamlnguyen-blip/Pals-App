-- TASK-033D2. Run only on disposable migrated DB; all synthetic evidence rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','people','dm');
update private.people_feature_gate set enabled=true;
update private.friendship_feature_gate set enabled=true;
update private.dm_feature_gate set enabled=true;
insert into auth.users(id,email,email_confirmed_at)
select ('33000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'd2-'||n||'@unc.edu',now() from generate_series(1,3) n;
update public.profiles set real_name='D2 synthetic',major='Biology',graduation_year=2028,
 bio='Disposable local consent test' where user_id::text like '33000000-%';
insert into private.people_preferences(account_id,opted_in)
 select id,true from public.accounts where id::text like '33000000-%';
-- Friendship acceptance alone does not create a DM pair.
insert into private.friendships(low_id,high_id,requester_id,campus_id,state)
values ('33000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000002',
 '33000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','accepted');
select is((select count(*) from private.dm_pairs where low_id='33000000-0000-4000-8000-000000000001'),
 0::bigint,'friendship has no empty DM');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from private.dm_pairs$$,'42501',null,'no raw pair grant');
select throws_ok($$select * from private.dm_retries$$,'42501',null,'no raw retry grant');
select is((select count(*) from public.send_friend_dm_message(
 '33000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000011','First friend text')),
 1::bigint,'first friend send creates pair');
select is((select state from public.get_dm_status('33000000-0000-4000-8000-000000000002')),
 'accepted','friend pair accepted');
select is((select count(*) from public.read_dm_messages('33000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('33000000-0000-4000-8000-000000000002')))),
 1::bigint,'friend reads body');
select is((select count(*) from public.send_friend_dm_message(
 '33000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000011','First friend text')),
 1::bigint,'friend retry stable');
select throws_ok($$select * from public.send_friend_dm_message(
 '33000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000011','Changed')$$,
 '23505',null,'changed retry conflicts');
reset role;
-- Simulate serialized unfriend after the first send.
delete from private.friendships where low_id='33000000-0000-4000-8000-000000000001'
 and high_id='33000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.read_dm_messages('33000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('33000000-0000-4000-8000-000000000002')))),
 0::bigint,'unfriend pauses body');
select throws_ok($$select public.send_dm_message('33000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('33000000-0000-4000-8000-000000000002')),
 '33000000-0000-4000-8000-000000000012','Paused')$$,'42501',null,'unfriend denies send');
select throws_ok($$select * from public.send_friend_dm_message(
 '33000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000011','First friend text')$$,
 '42501',null,'unfriend denies old retry');
select throws_ok($$select public.accept_friend_dm_consent('33000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('33000000-0000-4000-8000-000000000002')))$$,
 '42501',null,'initiator cannot confer recipient consent');
select set_config('request.jwt.claims','{"sub":"33000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(public.accept_friend_dm_consent('33000000-0000-4000-8000-000000000001',
 (select generation_id from public.get_dm_status('33000000-0000-4000-8000-000000000001'))),
 'original recipient explicitly consents');
select set_config('request.jwt.claims','{"sub":"33000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.read_dm_messages('33000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('33000000-0000-4000-8000-000000000002')))),
 1::bigint,'independent consent restores body');
select is((select count(*) from public.send_friend_dm_message(
 '33000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000011','First friend text')),
 1::bigint,'old retry reauthorizes through explicit consent');
select ok(public.transition_dm('33000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('33000000-0000-4000-8000-000000000002')),'close'),
 'terminal close');
select is((select count(*) from public.get_dm_status('33000000-0000-4000-8000-000000000002')),
 0::bigint,'terminal hidden');
select throws_ok($$select * from public.send_friend_dm_message(
 '33000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000011','First friend text')$$,
 '42501',null,'terminal retry not revived');
reset role;
-- A later accepted friendship may create a new generation despite retained
-- suppression. The terminal generation stays inaccessible.
insert into private.friendships(low_id,high_id,requester_id,campus_id,state)
values ('33000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000002',
 '33000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','accepted');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.send_friend_dm_message(
 '33000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000013','New friend generation')),
 1::bigint,'new friendship bypasses retained request suppression');
select is((select count(*) from public.get_dm_status('33000000-0000-4000-8000-000000000002')),
 1::bigint,'only new active generation visible');
-- A pending nonfriend request converts in place on first actual friend send.
select public.create_dm_request('33000000-0000-4000-8000-000000000003',
 '33000000-0000-4000-8000-000000000014','Pending request');
create temp table pending_d2 as select generation_id from public.get_dm_status(
 '33000000-0000-4000-8000-000000000003');
reset role;
insert into private.friendships(low_id,high_id,requester_id,campus_id,state)
values ('33000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000003',
 '33000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','accepted');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select generation_id from public.send_friend_dm_message(
 '33000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000015','Friend reply')),
 (select generation_id from pending_d2),'pending converts in same generation');
select is((select count(*) from public.read_dm_messages('33000000-0000-4000-8000-000000000001',
 (select generation_id from pending_d2))),2::bigint,'pending first body retained in active friend generation');
reset role;
select is((select consent_origin from private.dm_pairs where generation_id=(select generation_id from pending_d2)),
 'friend','pending transition has friend provenance');
select is((select recipient_consented from private.dm_pairs where generation_id=(select generation_id from pending_d2)),
 false,'pending transition does not infer request consent');
delete from private.friendships where low_id='33000000-0000-4000-8000-000000000001'
 and high_id='33000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_dm_request('33000000-0000-4000-8000-000000000003',
 '33000000-0000-4000-8000-000000000014','Pending request')$$,
 '42501',null,'old create retry cannot expose accepted friend generation after unfriend');
select throws_ok($$select public.create_dm_request('33000000-0000-4000-8000-000000000003',
 '33000000-0000-4000-8000-000000000014','Changed pending body')$$,
 '23505',null,'changed old create payload still conflicts before consent check');
reset role;
select * from finish();
rollback;
