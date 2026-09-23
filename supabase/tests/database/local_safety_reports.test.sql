begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at)
select ('51800000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'report-sql-'||n||'@unc.edu',now() from generate_series(1,4) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '51800000-%';
update public.profiles set real_name='Report fixture',major='Biology',graduation_year=2028,
  bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '51800000-%';
insert into private.people_preferences(account_id,opted_in)
select id,true from public.accounts where id::text like '51800000-%';
create function pg_temp.person(n integer) returns uuid language sql as $$
  select ('51800000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
create function pg_temp.key(n integer) returns uuid language sql as $$
  select ('51800000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid $$;
create function pg_temp.hid() returns uuid language sql as $$
  select current_setting('report.h')::uuid $$;

set local role anon;
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000001','user',
 '51800000-0000-4000-8000-000000000002','other','Test')$$,
 '42501',null,'anonymous submit denied');
select throws_ok($$select * from private.safety_reports$$,
 '42501',null,'anonymous cannot read reports');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000001','user',
 '51800000-0000-4000-8000-000000000002','other','Test')$$,
 '42501',null,'safety defaults off');
select throws_ok($$select * from private.safety_reports$$,
 '42501',null,'authenticated cannot read reports');
select throws_ok($$select * from private.safety_report_requests$$,
 '42501',null,'authenticated cannot read retries');
select throws_ok($$delete from private.safety_reports$$,
 '42501',null,'authenticated cannot delete reports');
reset role;
select ok((select relrowsecurity from pg_class where oid='private.safety_reports'::regclass),
 'report RLS enabled');
select ok((select relrowsecurity from pg_class where oid='private.safety_report_requests'::regclass),
 'retry RLS enabled');
select ok(not has_table_privilege('service_role','private.safety_reports','SELECT'),
 'platform service role has no report reader');
select ok(not has_table_privilege('service_role','private.safety_report_requests','SELECT'),
 'platform service role has no retry reader');

update private.safety_feature_gate set enabled=true;
update private.people_feature_gate set enabled=true;
update private.hangout_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('report.h',public.create_hangout(pg_temp.key(90),'Private title',
 now()+interval '1 hour','Approximate place',35,-79,
 p_private_instructions=>'Do not copy these instructions')::text,true);
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000002","role":"authenticated"}',true);

select is((select count(*) from public.submit_safety_report(pg_temp.key(1),'hangout_host',
 pg_temp.hid(),' OTHER ','  Report content  ')),1::bigint,'retained host route saves one receipt');
reset role;
select is((select category from private.safety_reports where reporter_id=pg_temp.person(2)),
 'other','category normalized');
select is((select narrative from private.safety_reports where reporter_id=pg_temp.person(2)),
 'Report content','narrative trimmed');
select is((select target_type from private.safety_reports where reporter_id=pg_temp.person(2)),
 'user','host route stores user report');
select is((select target_id from private.safety_reports where reporter_id=pg_temp.person(2)),
 pg_temp.person(1),'host is privately resolved');
select is((select provenance_ref_id from private.safety_reports where reporter_id=pg_temp.person(2)),
 pg_temp.hid(),'host route has only Hangout provenance ID');
set local role authenticated;
select is((select count(*) from public.submit_safety_report(pg_temp.key(1),'hangout_host',
 pg_temp.hid(),'other','Report content')),1::bigint,'normalized exact replay returns receipt');
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000001','user',
 '51800000-0000-4000-8000-000000000001','other','Report content')$$,
 '42501',null,'same key different original input conflicts');
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000002','hangout_host',
 '51800000-0000-4000-8000-000000000099','other','Report content')$$,
 '42501',null,'unknown host route neutral');
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000002','user',
 '51800000-0000-4000-8000-000000000002','other','Report content')$$,
 '42501',null,'self user denied neutrally');
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000002','hangout',
 '51800000-0000-4000-8000-000000000099','harassment',null)$$,
 '42501',null,'unknown Hangout neutral');
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000002','hangout',
 '51800000-0000-4000-8000-000000000099','other','  ')$$,
 '42501',null,'blank other denied');
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000002','hangout',
 '51800000-0000-4000-8000-000000000099','other',repeat('x',2001))$$,
 '42501',null,'long narrative denied');
reset role;

update private.hangout_feature_gate set enabled=false;
update private.people_feature_gate set enabled=false;
update public.hangout_participants set state='removed',removed_at=clock_timestamp()
  where hangout_id=pg_temp.hid() and account_id=pg_temp.person(2);
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.submit_safety_report(pg_temp.key(1),'hangout_host',
 pg_temp.hid(),'other','Report content')),1::bigint,
 'replay survives removal and source gate loss');
select is((select count(*) from public.submit_safety_report(pg_temp.key(3),'hangout',
 pg_temp.hid(),'harassment',null)),1::bigint,'removed attendee can report Hangout');
select is((select count(*) from public.submit_safety_report(pg_temp.key(4),'user',
 pg_temp.person(1),'harassment',null)),1::bigint,
 'retained host proves user report with People gate off');
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.submit_safety_report(pg_temp.key(40),'user',
 pg_temp.person(2),'harassment',null)),1::bigint,
 'overlapping attendee can report peer after removal and gate loss');
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000041','user',
 '51800000-0000-4000-8000-000000000004','harassment',null)$$,
 '42501',null,'same-campus nonoverlap gives no historical user authority');
reset role;
insert into private.dm_pairs(low_id,high_id,initiator_id,campus_id,state)
 values(pg_temp.person(2),pg_temp.person(4),pg_temp.person(4),
 '00000000-0000-4000-8000-000000000001','closed');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*) from public.submit_safety_report(pg_temp.key(42),'user',
 pg_temp.person(2),'harassment',null)),1::bigint,
 'retained terminal DM generation authorizes a former peer report');
select set_config('request.jwt.claims',
 '{"sub":"51800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.submit_safety_report(pg_temp.key(5),'hangout',
 pg_temp.hid(),'safety concern','  ')),1::bigint,'empty narrative normalizes to null');
select is((select count(*) from public.submit_safety_report(pg_temp.key(6),'hangout',
 pg_temp.hid(),'impersonation',null)),1::bigint,'fifth new report saved');
select is((select count(*) from public.submit_safety_report(pg_temp.key(6),'hangout',
 pg_temp.hid(),'impersonation','')),1::bigint,'fifth receipt replay remains available');
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000007','hangout',
 (select current_setting('report.h')::uuid),'spam/commercial promotion',null)$$,
 '42501',null,'sixth new report throttled');
reset role;
select is((select provenance_kind from private.safety_reports
 where reporter_id=pg_temp.person(2) and target_type='user' and category='harassment'),
 'hangout_host','retained peer provenance identifies source');
select is((select provenance_kind from private.safety_reports
 where reporter_id=pg_temp.person(3) and target_type='user' and category='harassment'),
 'hangout_overlap','overlap provenance identifies shared Hangout');
select is((select provenance_kind from private.safety_reports
 where reporter_id=pg_temp.person(4) and target_type='user' and category='harassment'),
 'dm_generation','terminal DM provenance identifies retained generation');
select ok(not exists(select 1 from private.safety_reports where
  narrative like '%Do not copy these instructions%' or narrative like '%Private title%'),
 'no source body copied');
select is((select count(*) from private.safety_reports where reporter_id=pg_temp.person(2)),
 5::bigint,'exact replays and denials never duplicate a report');
select is((select count(*) from private.safety_report_requests where reporter_id=pg_temp.person(2)),
 5::bigint,'failed requests create no retry key');
select is((select count(*) from private.notification_items where actor_id in
 (pg_temp.person(2),pg_temp.person(3),pg_temp.person(4))),0::bigint,
 'report submissions emit no notification');
update private.safety_reports set submitted_at=clock_timestamp()-interval '1 hour 1 second'
 where reporter_id=pg_temp.person(2) and category='other';
set local role authenticated;
select is((select count(*) from public.submit_safety_report(pg_temp.key(7),'hangout',
 pg_temp.hid(),'spam/commercial promotion',null)),1::bigint,
 'outside rolling window permits another report');
reset role;
update private.safety_feature_gate set enabled=false;
set local role authenticated;
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000001','hangout_host',
 (select current_setting('report.h')::uuid),'other','Report content')$$,
 '42501',null,'gate off denies exact replay');
reset role;
update private.safety_feature_gate set enabled=true;
update public.accounts set status='suspended' where id=pg_temp.person(2);
set local role authenticated;
select throws_ok($$select * from public.submit_safety_report(
 '51800000-0000-4000-8001-000000000001','hangout_host',
 (select current_setting('report.h')::uuid),'other','Report content')$$,
 '42501',null,'suspended caller denied exact replay');
reset role;
select * from finish();
rollback;
