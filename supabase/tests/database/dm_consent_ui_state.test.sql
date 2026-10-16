-- TASK-033D2U. Run on a disposable migrated database; synthetic rows roll back.
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
select ('34000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'd2u-'||n||'@unc.edu',now() from generate_series(1,2) n;
update public.profiles set real_name='D2U synthetic',major='Biology',graduation_year=2028,
 bio='Disposable UI state test' where user_id::text like '34000000-%';
insert into private.people_preferences(account_id,opted_in)
 select id,true from public.accounts where id::text like '34000000-%';
insert into private.friendships(low_id,high_id,requester_id,campus_id,state)
values ('34000000-0000-4000-8000-000000000001','34000000-0000-4000-8000-000000000002',
 '34000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','accepted');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"34000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_dm_consent_ui_state('34000000-0000-4000-8000-000000000002')),
 0::bigint,'friendship alone creates no DM status');
select is((select count(*) from public.send_friend_dm_message(
 '34000000-0000-4000-8000-000000000002','34000000-0000-4000-8000-000000000011','First message')),
 1::bigint,'friend first send creates pair');
select is((select consent_origin from public.get_dm_consent_ui_state('34000000-0000-4000-8000-000000000002')),
 'friend','sender sees friend origin');
select is((select can_allow_dm from public.get_dm_consent_ui_state('34000000-0000-4000-8000-000000000002')),
 false,'sender cannot allow DM independently');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"34000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select can_allow_dm from public.get_dm_consent_ui_state('34000000-0000-4000-8000-000000000001')),
 true,'recipient can explicitly allow friend DM');
select public.accept_friend_dm_consent('34000000-0000-4000-8000-000000000001',
 (select generation_id from public.get_dm_consent_ui_state('34000000-0000-4000-8000-000000000001')));
select is((select can_allow_dm from public.get_dm_consent_ui_state('34000000-0000-4000-8000-000000000001')),
 false,'allow action disappears after independent consent');
reset role;
delete from private.friendships where low_id='34000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"34000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select recipient_consented from public.get_dm_consent_ui_state('34000000-0000-4000-8000-000000000001')),
 true,'recipient consent remains visible after unfriend');
select is((select friend_send_available from public.get_dm_consent_ui_state('34000000-0000-4000-8000-000000000001')),
 false,'unfriend removes friend send capability');
reset role;
select * from finish();
rollback;
