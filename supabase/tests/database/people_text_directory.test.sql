begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at)
select ('11000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'people-'||n||'@unc.edu', now() from generate_series(1,6) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '11000000-%';
update public.profiles set real_name=case user_id::text
  when '11000000-0000-4000-8000-000000000001' then 'Ada'
  when '11000000-0000-4000-8000-000000000002' then 'Bea %_'
  else 'Cara' end,
  major='Biology',graduation_year=2028,bio='Private bio',
  interests=array['Hiking'],down_to_do=array['Tacos'],
  primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '11000000-%';
insert into public.universities(id,slug,name,active,allowed_email_domains)
values('11000000-0000-4000-8000-000000000099','people-other','Other',true,array['unc.edu']);
update public.university_memberships
set university_id='11000000-0000-4000-8000-000000000099'
where user_id='11000000-0000-4000-8000-000000000004';
insert into public.platform_roles(user_id,role)
values('11000000-0000-4000-8000-000000000003','admin');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.get_people_preference(),false,'default preference is private');
select throws_ok($$select public.set_people_preference(true)$$,'42501',null,'gate off denies opt-in');
select is(public.set_people_preference(false),false,'gate off allows owner opt-out');
select throws_ok($$select * from public.browse_people()$$,'42501',null,'gate off denies browse');
select throws_ok($$select * from private.people_feature_gate$$,'42501',null,'gate has no client reads');
select throws_ok($$update private.people_feature_gate set enabled=true$$,'42501',null,'gate has no client writes');
select throws_ok($$select * from private.people_preferences$$,'42501',null,'preference rows private');
select throws_ok($$select * from private.people_blocks$$,'42501',null,'block rows private');
select throws_ok($$select private.people_visible('11000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001')$$,'42501',null,'internal visibility is not a subject oracle');
reset role;
update private.people_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.set_people_preference(true),true,'ready owner opts in');
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is(public.set_people_preference(true),true,'admin has only ordinary ready permissions');
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is(public.set_people_preference(true),true,'other campus owner may opt in locally');
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.browse_people()),2::bigint,'browse shows opted-in same-campus peers only');
select is((select count(*) from public.browse_people(p_search=>'%_')),1::bigint,'wildcards are literal text');
select is((select count(*) from public.browse_people(p_search=>'BEA')),1::bigint,'search is case-insensitive');
select is((select count(*) from public.browse_people(p_major=>'biology',p_graduation_year=>2028)),2::bigint,'exact filters work');
select is((select count(*) from public.browse_people(p_major=>'Chemistry')),0::bigint,'wrong major excludes');
select is((select count(*) from public.browse_people(p_limit=>1)),1::bigint,'page limit applied');
select is((select count(*) from public.browse_people(p_after_name=>'bea %_',p_after_id=>'11000000-0000-4000-8000-000000000002')),1::bigint,'name and ID cursor advances');
select is((select count(*) from public.get_people_detail('11000000-0000-4000-8000-000000000004')),0::bigint,'cross-campus detail unavailable');
select is((select count(*) from public.get_people_detail('11000000-0000-4000-8000-000000000005')),0::bigint,'opted-out detail unavailable');
select is((select count(*) from public.get_people_detail('11000000-0000-4000-8000-000000000099')),0::bigint,'missing detail same shape');
select is((select bio from public.get_people_detail('11000000-0000-4000-8000-000000000002')),'Private bio','detail contains allowlisted bio');
select throws_ok($$select email from public.browse_people()$$,'42703',null,'browse has no email column');
select throws_ok($$select primary_photo_path from public.get_people_detail('11000000-0000-4000-8000-000000000002')$$,'42703',null,'detail has no photo reference');
select is((select count(*) from public.profiles where user_id='11000000-0000-4000-8000-000000000002'),0::bigint,'raw peer profile remains private');
select throws_ok($$select public.browse_people(p_limit=>25)$$,'22023',null,'page over 24 rejected');
select throws_ok($$select public.browse_people(p_search=>repeat('a',101))$$,'22023',null,'long search rejected');
select throws_ok($$select public.browse_people(p_search=>repeat(' ',101))$$,'22023',null,'long whitespace search rejected before trim');
select throws_ok($$select public.browse_people(p_major=>repeat(' ',201))$$,'22023',null,'long whitespace major rejected before trim');
select throws_ok($$select public.browse_people(p_after_name=>'bea')$$,'22023',null,'partial cursor rejected');
select throws_ok($$select public.browse_people(p_after_name=>'BEA',p_after_id=>'11000000-0000-4000-8000-000000000002')$$,'22023',null,'unnormalized cursor rejected');
select is(public.set_people_block('11000000-0000-4000-8000-000000000002',true),true,'visible peer can be blocked');
select is(public.set_people_block('11000000-0000-4000-8000-000000000002',true),true,'block retry is idempotent');
select is((select count(*) from public.get_people_detail('11000000-0000-4000-8000-000000000002')),0::bigint,'outbound block hides detail');
select is((select count(*) from public.browse_people(p_search=>'Bea')),0::bigint,'outbound block hides search');
select is((select count(*) from public.list_people_blocked_ids()),1::bigint,'outbound ID listed');
select throws_ok($$select blocked_id from public.list_people_blocked_ids()$$,'42703',null,'outbound list exposes no extra column');
select is(public.set_people_preference(true),true,'ready blocker opts in so reverse suppression is independently testable');
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.get_people_detail('11000000-0000-4000-8000-000000000001')),0::bigint,'reverse block hides opted-in detail');
select is((select count(*) from public.browse_people(p_search=>'Ada')),0::bigint,'reverse block hides opted-in search');
select throws_ok($$select public.set_people_block('11000000-0000-4000-8000-000000000001',true)$$,'42501',null,'reverse block cannot probe unavailable peer');
select is((select count(*) from public.list_people_blocked_ids()),0::bigint,'incoming block never listed');
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.set_people_block('11000000-0000-4000-8000-000000000002',false),false,'caller unblocks own direction');
select is(public.set_people_block('11000000-0000-4000-8000-000000000002',false),false,'unblock retry is idempotent');
select throws_ok($$select public.set_people_block('11000000-0000-4000-8000-000000000001',true)$$,'42501',null,'self block rejected');
select throws_ok($$select public.set_people_block('11000000-0000-4000-8000-000000000004',true)$$,'42501',null,'cross-campus block rejected');
select throws_ok($$select public.set_people_block('11000000-0000-4000-8000-000000000005',true)$$,'42501',null,'opted-out block target rejected');
reset role;
update public.profiles set primary_photo_path=null
where user_id='11000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_people_detail('11000000-0000-4000-8000-000000000003')),0::bigint,'missing photo revokes opted-in admin subject');
reset role;
update public.accounts set status='suspended' where id='11000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"admin"}}',true);
select throws_ok($$select * from public.browse_people()$$,'42501',null,'suspended admin cannot browse despite forged claim');
select throws_ok($$select public.set_people_preference(false)$$,'42501',null,'suspended owner cannot manage preference');
reset role;
update public.universities set active=false where slug='unc-chapel-hill';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.browse_people()$$,'42501',null,'inactive campus revokes viewer');
reset role;
update public.universities set active=true where slug='unc-chapel-hill';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.browse_people()),1::bigint,'other opted-in ready subject remains visible');
select is(public.set_people_block('11000000-0000-4000-8000-000000000002',true),true,'ready owner creates retained outbound block');
reset role;
update public.profiles set primary_photo_path=null where user_id='11000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.list_people_blocked_ids()),1::bigint,'unready active owner retains outbound IDs');
select is(public.set_people_block('11000000-0000-4000-8000-000000000002',false),false,'unready active owner can unblock');
select is(public.set_people_preference(false),false,'unready active owner can opt out');
reset role;
update public.profiles set primary_photo_path=user_id::text||'/primary.png' where user_id='11000000-0000-4000-8000-000000000001';
update auth.users set email='changed@example.edu' where id='11000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.get_people_detail('11000000-0000-4000-8000-000000000002')),0::bigint,'changed email revokes subject');
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.set_people_preference(false),false,'unready owner can opt out');
select throws_ok($$select public.set_people_preference(true)$$,'42501',null,'unready owner cannot opt in');
reset role;
update private.people_feature_gate set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.set_people_preference(false),false,'gate off and unready owner can opt out');
select throws_ok($$select * from public.list_people_blocked_ids()$$,'42501',null,'gate off denies block management');
set local role anon;
select throws_ok($$select * from public.browse_people()$$,'42501',null,'anonymous browse denied');
select * from finish();
rollback;
