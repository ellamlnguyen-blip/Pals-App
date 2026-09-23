begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at)
select ('14000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'dm-'||n||'@unc.edu',now() from generate_series(1,3) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '14000000-%';
update public.profiles set real_name='DM fixture',major='Biology',graduation_year=2028,
  bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '14000000-%';
insert into private.people_preferences(account_id,opted_in)
select id,true from public.accounts where id::text like '14000000-%';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_dm_request('14000000-0000-4000-8000-000000000002',
  '14000000-0000-4000-8000-000000000091','Hello')$$,'42501',null,'DM gate defaults off');
select throws_ok($$select * from private.dm_pairs$$,'42501',null,'pair table private');
select throws_ok($$select * from private.dm_messages$$,'42501',null,'message table private');
select throws_ok($$select * from private.dm_retries$$,'42501',null,'retry table private');
select throws_ok($$select * from private.dm_suppression$$,'42501',null,'suppression table private');
select throws_ok($$update private.dm_feature_gate set enabled=true$$,'42501',null,'gate private');
reset role;
update private.people_feature_gate set enabled=true;
update private.dm_feature_gate set enabled=true;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_dm_request('14000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000090','Self')$$,'42501',null,'self denied');
select public.create_dm_request('14000000-0000-4000-8000-000000000002',
  '14000000-0000-4000-8000-000000000091',' Hello ');
select is((select state from public.get_dm_status('14000000-0000-4000-8000-000000000002')),
  'pending','request pending');
select is((select first_body from public.list_dm_inbox()),null::text,'outgoing has no preview');
select is((select count(*) from public.read_dm_messages('14000000-0000-4000-8000-000000000002',
  (select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000002')))),
  0::bigint,'outgoing pending has no body page');
select is(public.create_dm_request('14000000-0000-4000-8000-000000000002',
  '14000000-0000-4000-8000-000000000091','Hello'),
  (select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000002')),
  'trimmed exact create retry stable');
select throws_ok($$select public.create_dm_request('14000000-0000-4000-8000-000000000002',
  '14000000-0000-4000-8000-000000000091','Changed')$$,'23505',null,'changed create key conflicts');
select throws_ok($$select public.send_dm_message('14000000-0000-4000-8000-000000000002',
  (select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000002')),
  '14000000-0000-4000-8000-000000000092','Too soon')$$,'42501',null,'pending sender cannot send');
select throws_ok($$select * from public.list_dm_inbox(p_limit=>25)$$,'22023',null,'inbox bounded');

select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select first_body from public.list_dm_inbox()),'Hello','incoming first message only');
select throws_ok($$select public.create_dm_request('14000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000093','Reverse')$$,'42501',null,'opposite pair denied');
select ok(public.transition_dm('14000000-0000-4000-8000-000000000001',
  (select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000001')),
  'reply','14000000-0000-4000-8000-000000000094',' Yes '),'reply accepts atomically');
select is((select count(*) from public.read_dm_messages('14000000-0000-4000-8000-000000000001',
  (select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000001')))),
  2::bigint,'accepted two messages');
select ok(public.transition_dm('14000000-0000-4000-8000-000000000001',
  (select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000001')),
  'reply','14000000-0000-4000-8000-000000000094','Yes'),'reply retry stable');

select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
create temp table old_dm as select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000002');
select ok(public.transition_dm('14000000-0000-4000-8000-000000000002',
  (select generation_id from old_dm),'close'),'close accepted');
select is((select count(*) from public.get_dm_status('14000000-0000-4000-8000-000000000002')),
  0::bigint,'terminal hidden');
select is((select count(*) from public.read_dm_messages('14000000-0000-4000-8000-000000000002',
  (select generation_id from old_dm))),0::bigint,'terminal body hidden');
select throws_ok($$select public.create_dm_request('14000000-0000-4000-8000-000000000002',
  '14000000-0000-4000-8000-000000000095','Again')$$,'42501',null,'close suppresses direction');

select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.create_dm_request('14000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000096','Reverse');
reset role;
update private.people_preferences set opted_in=false
  where account_id='14000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_dm_status('14000000-0000-4000-8000-000000000002')),
  1::bigint,'opt-out keeps active state');
select is((select count(*) from public.read_dm_messages('14000000-0000-4000-8000-000000000002',
  (select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000002')))),
  0::bigint,'opt-out hides body');
reset role;
update private.dm_feature_gate set enabled=false;
set local role authenticated;
select is(public.set_people_block('14000000-0000-4000-8000-000000000002',true),true,
  'active participant blocks hidden peer with DM gate off');
reset role;
update private.dm_feature_gate set enabled=true;
update private.people_preferences set opted_in=false
  where account_id='14000000-0000-4000-8000-000000000003';
set local role authenticated;
select is((select count(*) from public.get_dm_status('14000000-0000-4000-8000-000000000002')),
  0::bigint,'block terminal survives re-enable');
select throws_ok($$select public.set_people_block('14000000-0000-4000-8000-000000000003',true)$$,
  '42501',null,'hidden unrelated peer denied');
select throws_ok($$select * from public.read_dm_messages('14000000-0000-4000-8000-000000000002',
  (select generation_id from old_dm),p_limit=>51)$$,'22023',null,'message page bounded');
reset role;
delete from private.people_blocks where blocker_id='14000000-0000-4000-8000-000000000001'
  and blocked_id='14000000-0000-4000-8000-000000000002';
update private.people_preferences set opted_in=true
  where account_id='14000000-0000-4000-8000-000000000003';
set local role authenticated;
select public.create_dm_request('14000000-0000-4000-8000-000000000003',
  '14000000-0000-4000-8000-000000000097','Ignore me');
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select ok(public.transition_dm('14000000-0000-4000-8000-000000000001',
  (select generation_id from public.get_dm_status('14000000-0000-4000-8000-000000000001')),
  'ignore'),'recipient ignores');
select is((select count(*) from public.list_dm_inbox()),0::bigint,'ignored pair leaves inbox');
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.create_dm_request('14000000-0000-4000-8000-000000000003',
  '14000000-0000-4000-8000-000000000098','Again')$$,'42501',null,'ignore suppresses sender');
select throws_ok($$select public.create_dm_request('14000000-0000-4000-8000-000000000003',
  '14000000-0000-4000-8000-000000000097','Ignore me')$$,'42501',null,'old key cannot revive ignored pair');
select is((select count(*) from public.get_dm_status('14000000-0000-4000-8000-000000000003')),
  0::bigint,'terminal status absent');
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.create_dm_request('14000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000099','Reverse intent');
create temp table reverse_dm as select generation_id
  from public.get_dm_status('14000000-0000-4000-8000-000000000001');
select is((select count(*) from public.get_dm_status('14000000-0000-4000-8000-000000000001')),
  1::bigint,'reverse direction gets new active generation');
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.list_dm_inbox()),0::bigint,'unrelated account sees no pair');
select is((select count(*) from public.read_dm_messages('14000000-0000-4000-8000-000000000001',
  (select generation_id from reverse_dm))),0::bigint,'unrelated body read empty');
reset role;
update private.people_preferences set opted_in=true
  where account_id='14000000-0000-4000-8000-000000000002';
insert into public.universities(id,slug,name,active,allowed_email_domains)
  values('14000000-0000-4000-8000-0000000000ff','dm-fixture-campus',
    'DM fixture campus',true,array['unc.edu']);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.create_dm_request('14000000-0000-4000-8000-000000000003',
  '14000000-0000-4000-8000-0000000000a1','Campus thread');
create temp table campus_dm as select generation_id
  from public.get_dm_status('14000000-0000-4000-8000-000000000003');
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select ok(public.transition_dm('14000000-0000-4000-8000-000000000002',
  (select generation_id from campus_dm),'accept'),'recipient accepts at formation campus');
reset role;
update public.university_memberships set university_id='14000000-0000-4000-8000-0000000000ff'
  where user_id in ('14000000-0000-4000-8000-000000000002',
    '14000000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.get_access_state(),'ready','both transferred accounts remain ready');
select is((select count(*) from public.read_dm_messages('14000000-0000-4000-8000-000000000003',
  (select generation_id from campus_dm))),1::bigint,'accepted body readable at new shared campus');
select isnt(public.send_dm_message('14000000-0000-4000-8000-000000000003',
  (select generation_id from campus_dm),'14000000-0000-4000-8000-0000000000a2',
  'Still together'),null::uuid,'send resumes at new shared campus');
reset role;
update public.university_memberships set university_id='00000000-0000-4000-8000-000000000001'
  where user_id='14000000-0000-4000-8000-000000000003';
set local role authenticated;
select is((select count(*) from public.read_dm_messages('14000000-0000-4000-8000-000000000003',
  (select generation_id from campus_dm))),0::bigint,'cross-campus body denied');
select throws_ok($$select public.send_dm_message('14000000-0000-4000-8000-000000000003',
  (select generation_id from campus_dm),'14000000-0000-4000-8000-0000000000a3',
  'Across campus')$$,'42501',null,'cross-campus send denied');
reset role;
update public.university_memberships set university_id='14000000-0000-4000-8000-0000000000ff'
  where user_id in ('14000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(public.transition_dm('14000000-0000-4000-8000-000000000003',
  (select generation_id from reverse_dm),'accept'),
  'pending request accepted after both transfer to same new campus');
reset role;
update private.people_feature_gate set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.read_dm_messages('14000000-0000-4000-8000-000000000003',
  (select generation_id from reverse_dm))),0::bigint,'People gate off removes accepted body');
select ok(public.transition_dm('14000000-0000-4000-8000-000000000003',
  (select generation_id from reverse_dm),'close'),
  'participant can close while People gate off');
reset role;
update private.dm_feature_gate set enabled=false;
select * from finish();
rollback;
