begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

-- No hosted access change follows from applying the migration alone.
select is((select enabled from private.pilot_availability where singleton),false,'availability remains off');
select is((select enabled from private.large_hangout_feature_gate where singleton),false,'large Hangout gate remains off');
select ok((select bool_and(not enabled) from private.pilot_capabilities),'capabilities remain off');
select ok(not has_table_privilege('authenticated','private.pilot_account_admission','SELECT'),'roster remains private');

insert into auth.users(id,email,email_confirmed_at) values
 ('27000000-0000-4000-8000-000000000001','open-unc@unc.edu',now()),
 ('27000000-0000-4000-8000-000000000002','unconfirmed@unc.edu',null),
 ('27000000-0000-4000-8000-000000000003','other@example.edu',now()),
 ('27000000-0000-4000-8000-000000000004','suspended@unc.edu',now()),
 ('27000000-0000-4000-8000-000000000005','banned@unc.edu',now());
update public.accounts set status='suspended' where id='27000000-0000-4000-8000-000000000004';
update public.accounts set status='banned' where id='27000000-0000-4000-8000-000000000005';
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key='onboarding';

select is((select count(*) from private.pilot_account_admission),0::bigint,'no roster rows');
select ok(private.pilot_owner_subject_eligible('27000000-0000-4000-8000-000000000001'),'verified UNC owner can onboard without roster');
select ok(not private.pilot_owner_subject_eligible('27000000-0000-4000-8000-000000000002'),'unconfirmed denied');
select ok(not private.pilot_owner_subject_eligible('27000000-0000-4000-8000-000000000003'),'non-UNC denied');
select ok(not private.pilot_owner_subject_eligible('27000000-0000-4000-8000-000000000004'),'suspended denied');
select ok(not private.pilot_owner_subject_eligible('27000000-0000-4000-8000-000000000005'),'banned denied');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"27000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.get_access_state(),'onboarding','eligible UNC account requires completed onboarding');
select lives_ok($$insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','27000000-0000-4000-8000-000000000001/aaaaaaaa.jpg',auth.uid()::text)$$,'roster-free owner photo write');
select lives_ok($$update public.profiles set real_name='Open UNC',graduation_year=2028,major='Biology',bio='Test profile',primary_photo_path='27000000-0000-4000-8000-000000000001/aaaaaaaa.jpg' where user_id=auth.uid()$$,'roster-free profile completion');
select is(public.get_access_state(),'ready','complete verified UNC account ready without roster');
select is((select count(*) from public.accounts where id=auth.uid()),1::bigint,'owner RLS read allowed');
select is((select count(*) from public.university_memberships where user_id=auth.uid()),1::bigint,'membership owner read allowed');
reset role;
select ok(private.ready_subject_campus('27000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'),'complete UNC subject ready without roster');
update private.pilot_capabilities set enabled=true where key='hangouts';
update private.pilot_capabilities set enabled=true where key='hangout_chat';
update private.hangout_feature_gate set enabled=true where singleton;
update private.hangout_chat_feature_gate set enabled=true where singleton;
insert into private.pilot_account_admission(account_id,state,revision) values('27000000-0000-4000-8000-000000000001','revoked',1);
set local role authenticated;
select lives_ok($$select public.create_hangout(gen_random_uuid(),'Open UNC test Hangout',now()+interval '1 day','Campus quad',35.9101,-79.0478)$$,'revoked roster does not deny locked Hangout creation');
select lives_ok($$select public.send_hangout_message((select id from public.hangouts where host_id=auth.uid() and title='Open UNC test Hangout'),gen_random_uuid(),'See you there')$$,'revoked roster does not deny valid Hangout chat');
reset role;
delete from private.pilot_account_admission where account_id='27000000-0000-4000-8000-000000000001';
set local role authenticated;
select lives_ok($$select public.create_hangout(gen_random_uuid(),'Second UNC test Hangout',now()+interval '2 days','Campus quad',35.9101,-79.0478)$$,'deleted roster row does not deny locked Hangout creation');
select lives_ok($$select public.send_hangout_message((select id from public.hangouts where host_id=auth.uid() and title='Second UNC test Hangout'),gen_random_uuid(),'See you soon')$$,'deleted roster row does not deny valid Hangout chat');
select set_config('request.jwt.claims','{"sub":"27000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.get_access_state(),'unverified','unconfirmed account stays unverified');
select is((select count(*) from public.accounts where id=auth.uid()),1::bigint,'unconfirmed owner can read only their own account status');
select set_config('request.jwt.claims','{"sub":"27000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is(public.get_access_state(),'restricted','suspended account restricted');
select is((select count(*) from public.accounts where id=auth.uid()),1::bigint,'suspended owner can read only their own account status');
reset role;

update auth.users set email='open-unc@example.edu' where id='27000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"27000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.get_access_state(),'unverified','email change revokes current UNC verification');
select is((select count(*) from public.profiles where user_id=auth.uid()),0::bigint,'revoked owner RLS denied');
select * from finish();
rollback;
