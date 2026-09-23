begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at)
select ('13000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'friend-'||n||'@unc.edu', now() from generate_series(1,4) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '13000000-%';
update public.profiles set real_name='Friend fixture',major='Biology',graduation_year=2028,
  bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '13000000-%';
insert into private.people_preferences(account_id,opted_in)
select id,true from public.accounts where id::text like '13000000-%';
insert into public.platform_roles(user_id,role)
values('13000000-0000-4000-8000-000000000004','admin');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000099')$$,
  '42501',null,'friendship gate defaults off');
select throws_ok($$select * from private.friendships$$,'42501',null,'pair table is private');
select throws_ok($$select * from private.friendship_create_requests$$,'42501',null,'creation ledger is private');
select throws_ok($$select * from private.friendship_suppression$$,'42501',null,'suppression is private');
select throws_ok($$update private.friendship_feature_gate set enabled=true$$,'42501',null,'gate is private');
reset role;
update private.friendship_feature_gate set enabled=true;
update private.people_feature_gate set enabled=true;
update private.safety_feature_gate set enabled=true;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000098')$$,
  '42501',null,'self request denied');
select is((select count(*) from public.list_friendships()),0::bigint,'no unrelated pairs');
select public.create_friend_request('13000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000099');
select is((select direction from public.get_friendship('13000000-0000-4000-8000-000000000002')),'outgoing','requester sees outgoing');
select is((select state from public.get_friendship('13000000-0000-4000-8000-000000000002')),'pending','request is pending');
select is(public.create_friend_request('13000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000099'),
  (select generation_id from public.get_friendship('13000000-0000-4000-8000-000000000002')),'same key is stable');
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000003','13000000-0000-4000-8000-000000000099')$$,
  '42501',null,'same key different target is generic conflict');
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000097')$$,
  '42501',null,'duplicate pair denied');
select throws_ok($$select * from public.list_friendships(p_limit=>25)$$,
  '22023',null,'unbounded page denied');

select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select direction from public.get_friendship('13000000-0000-4000-8000-000000000001')),'incoming','recipient sees incoming');
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000096')$$,
  '42501',null,'opposite request cannot accept');
select ok(public.accept_friend_request('13000000-0000-4000-8000-000000000001',
  (select generation_id from public.get_friendship('13000000-0000-4000-8000-000000000001'))),'recipient accepts');
select is((select state from public.get_friendship('13000000-0000-4000-8000-000000000001')),'accepted','both see accepted state');

select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
create temp table old_generation as select generation_id from public.get_friendship('13000000-0000-4000-8000-000000000002');
select ok(public.unfriend('13000000-0000-4000-8000-000000000002',
  (select generation_id from old_generation)),'participant unfriend');
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000099')$$,
  '42501',null,'old creation key cannot resurrect');
select public.create_friend_request('13000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000095');
select throws_ok($$select public.cancel_friend_request('13000000-0000-4000-8000-000000000002',
  (select generation_id from old_generation))$$,
  '42501',null,'old generation cannot cancel new pair');
select ok(public.cancel_friend_request('13000000-0000-4000-8000-000000000002',
  (select generation_id from public.get_friendship('13000000-0000-4000-8000-000000000002'))),'requester cancels');
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000094')$$,
  '42501',null,'cancel suppresses same direction');
select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.create_friend_request('13000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000093');
reset role;
update private.people_preferences set opted_in=false where account_id='13000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_friendship('13000000-0000-4000-8000-000000000002')),1::bigint,'opt-out keeps ID state');
select throws_ok($$select public.accept_friend_request('13000000-0000-4000-8000-000000000002',
  (select generation_id from public.get_friendship('13000000-0000-4000-8000-000000000002')))$$,
  '42501',null,'opt-out denies acceptance');
select ok(public.decline_friend_request('13000000-0000-4000-8000-000000000002',
  (select generation_id from public.get_friendship('13000000-0000-4000-8000-000000000002'))),'recipient can decline hidden peer');
reset role;
update private.people_preferences set opted_in=true where account_id='13000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_friend_request('13000000-0000-4000-8000-000000000003','13000000-0000-4000-8000-000000000092');
reset role;
update private.people_preferences set opted_in=false where account_id='13000000-0000-4000-8000-000000000003';
set local role authenticated;
select is(public.set_people_block('13000000-0000-4000-8000-000000000003',true),true,'ready participant blocks hidden peer');
select is((select count(*) from public.get_friendship('13000000-0000-4000-8000-000000000003')),0::bigint,'block tears down pair');
select is(public.set_people_block('13000000-0000-4000-8000-000000000003',false),false,'unblock succeeds');
select is((select count(*) from public.get_friendship('13000000-0000-4000-8000-000000000003')),0::bigint,'unblock does not revive');
select public.create_friend_request('13000000-0000-4000-8000-000000000004','13000000-0000-4000-8000-000000000091');
reset role;
update private.friendship_feature_gate set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.list_friendships()$$,'42501',null,'disabled friendship gate hides owner reader');
select is(public.set_people_block('13000000-0000-4000-8000-000000000004',true),true,
  'authorized block tears down pair while friendship gate is off');
reset role;
update private.friendship_feature_gate set enabled=true;
set local role authenticated;
select is((select count(*) from public.get_friendship('13000000-0000-4000-8000-000000000004')),0::bigint,
  'gate re-enable does not restore pair');
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000004','13000000-0000-4000-8000-000000000090')$$,
  '42501',null,'block prevents new request');
reset role;
update public.profiles set primary_photo_path=null where user_id='13000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.set_people_block('13000000-0000-4000-8000-000000000002',true),true,
  'unready active caller can block using retained friendship evidence');
select throws_ok($$select public.create_friend_request('13000000-0000-4000-8000-000000000002','13000000-0000-4000-8000-000000000089')$$,
  '42501',null,'unready caller cannot request');
reset role;
update public.profiles set primary_photo_path=user_id::text||'/primary.png'
  where user_id='13000000-0000-4000-8000-000000000001';
update public.accounts set status='suspended' where id='13000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"13000000-0000-4000-8000-000000000004","role":"authenticated","app_metadata":{"role":"admin"}}',true);
select throws_ok($$select * from public.list_friendships()$$,'42501',null,'suspended forged admin cannot read');
select throws_ok($$select public.set_people_block('13000000-0000-4000-8000-000000000001',true)$$,
  '42501',null,'suspended forged admin cannot block');
reset role;
update public.accounts set status='active' where id='13000000-0000-4000-8000-000000000004';
set local role anon;
select throws_ok($$select * from public.list_friendships()$$,'42501',null,'anon has no reader grant');
reset role;
update private.people_feature_gate set enabled=false;
update private.friendship_feature_gate set enabled=false;
select * from finish();
rollback;
