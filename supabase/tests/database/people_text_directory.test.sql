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
select is((select count(*) from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000002')),1::bigint,'ID-only cursor advances');
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
select throws_ok($$select public.browse_people(p_after_name=>'bea')$$,'22023',null,'name-only cursor rejected');
select throws_ok($$select public.browse_people(p_after_name=>'Bea %_',p_after_id=>'11000000-0000-4000-8000-000000000002')$$,'22023',null,'name plus ID cursor rejected');
select throws_ok($$select public.browse_people(p_after_name=>repeat('x',101),p_after_id=>'11000000-0000-4000-8000-000000000002')$$,'22023',null,'overlong raw cursor rejected');
select throws_ok($$select public.browse_people(p_after_name=>'   ',p_after_id=>'11000000-0000-4000-8000-000000000002')$$,'22023',null,'blank raw cursor rejected');

-- Two pages cross a shared-name UUID boundary. The last name on page one has
-- 100 ASCII spaces plus U+00A0 at both ends of Zed: raw length 105, while
-- btrim length is 5. A returned name cannot be used as a bounded cursor.
reset role;
insert into auth.users(id,email,email_confirmed_at)
select ('11000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'people-'||n||'@unc.edu', now() from generate_series(7,35) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text between
  '11000000-0000-4000-8000-000000000007' and '11000000-0000-4000-8000-000000000034';
update public.profiles set real_name=case
    when user_id='11000000-0000-4000-8000-000000000028'
      then repeat(' ',100)||U&'\00A0Zed\00A0'
    when user_id::text between '11000000-0000-4000-8000-000000000007'
      and '11000000-0000-4000-8000-000000000032' then U&'\00A0Zed\00A0'
    else 'Zed' end,
  major='Biology', graduation_year=2028, bio='Private bio',
  primary_photo_path=case when user_id='11000000-0000-4000-8000-000000000035'
    then null else user_id::text||'/primary.png' end
where user_id::text between
  '11000000-0000-4000-8000-000000000007' and '11000000-0000-4000-8000-000000000035';
insert into private.people_preferences(account_id,opted_in)
select id,true from public.accounts where id::text between
  '11000000-0000-4000-8000-000000000007' and '11000000-0000-4000-8000-000000000032';
insert into private.people_preferences(account_id,opted_in)
values ('11000000-0000-4000-8000-000000000034',true),
  ('11000000-0000-4000-8000-000000000035',true);
insert into private.people_blocks(blocker_id,blocked_id)
values ('11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000034');
set local role authenticated;
create temp table cursor_first as select * from public.browse_people(p_limit=>24);
create temp table cursor_second as
  select p.* from (select real_name,account_id from cursor_first
    order by pg_catalog.lower(pg_catalog.btrim(real_name)) collate "C" desc, account_id desc limit 1) last_row,
    lateral public.browse_people(p_after_id=>last_row.account_id) p;
select is((select count(*) from cursor_first),24::bigint,'first page is full');
select is((select account_id::text from cursor_first order by
  pg_catalog.lower(pg_catalog.btrim(real_name)) collate "C" desc,account_id desc limit 1),
  '11000000-0000-4000-8000-000000000028','NBSP name is the page boundary');
select is((select length(real_name) from cursor_first where account_id='11000000-0000-4000-8000-000000000028'),
  105,'boundary row has valid raw name over 100 characters');
select is((select pg_catalog.btrim(real_name) from cursor_first where account_id='11000000-0000-4000-8000-000000000028'),
  U&'\00A0Zed\00A0','boundary keeps NBSP after PostgreSQL btrim');
select is((select count(*) from cursor_second),4::bigint,'second page contains the remaining peers');
select is((select count(distinct account_id) from
  (select account_id from cursor_first union all select account_id from cursor_second) pages),
  28::bigint,'two pages enumerate each authorized ID once');
reset role;
select is((select array_agg(account_id order by pg_catalog.lower(pg_catalog.btrim(real_name)) collate "C",account_id)
  from (select * from cursor_first union all select * from cursor_second) pages),
  (select array_agg(id order by pg_catalog.lower(pg_catalog.btrim(p.real_name)) collate "C",id)
    from public.accounts a join public.profiles p on p.user_id=a.id
    where a.id in ('11000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000003')
      or a.id::text between '11000000-0000-4000-8000-000000000007' and '11000000-0000-4000-8000-000000000032'),
  'two pages equal database order across same-name UUIDs');
set local role authenticated;
select is((select count(*) from (select account_id from cursor_first union all select account_id from cursor_second) pages
  where account_id in ('11000000-0000-4000-8000-000000000033','11000000-0000-4000-8000-000000000034',
    '11000000-0000-4000-8000-000000000035','11000000-0000-4000-8000-000000000004')),
  0::bigint,'cursor does not reveal opted-out, blocked, unready or cross-campus peers');
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000033')$$,
  '42501','People operation unavailable','opted-out cursor ID is unavailable');
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000034')$$,
  '42501','People operation unavailable','blocked cursor ID is unavailable');
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000035')$$,
  '42501','People operation unavailable','unready cursor ID is unavailable');
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000004')$$,
  '42501','People operation unavailable','cross-campus cursor ID is unavailable');
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000099')$$,
  '42501','People operation unavailable','nonexistent cursor ID is unavailable');
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000028',p_search=>'Bea')$$,
  '42501','People operation unavailable','filter-mismatched cursor ID is unavailable');
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000028',p_graduation_year=>2029)$$,
  '42501','People operation unavailable','year-mismatched cursor ID is unavailable');
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000028',p_major=>'Chemistry')$$,
  '42501','People operation unavailable','major-mismatched cursor ID is unavailable');
drop table cursor_second,cursor_first;
reset role;
update private.people_preferences set opted_in=false
  where account_id='11000000-0000-4000-8000-000000000028';
set local role authenticated;
select throws_ok($$select * from public.browse_people(p_after_id=>'11000000-0000-4000-8000-000000000028')$$,
  '42501','People operation unavailable','opt-out invalidates old cursor ID');
reset role;
update private.people_preferences set opted_in=false where account_id::text between
  '11000000-0000-4000-8000-000000000007' and '11000000-0000-4000-8000-000000000035';
delete from private.people_blocks where blocker_id='11000000-0000-4000-8000-000000000001'
  and blocked_id='11000000-0000-4000-8000-000000000034';
set local role authenticated;
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
