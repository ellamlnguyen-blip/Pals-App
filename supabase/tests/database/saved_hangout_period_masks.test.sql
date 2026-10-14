begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts');
update private.hangout_feature_gate set enabled=true where singleton;

insert into auth.users(id,email,email_confirmed_at) values
 ('53100000-0000-4000-8000-000000000001','task031-a@unc.edu',now()),
 ('53100000-0000-4000-8000-000000000002','task031-b@unc.edu',now());
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text from public.accounts
 where id::text like '53100000-%';
update public.profiles set real_name='Period fixture',major='Science',graduation_year=2028,
 bio='Local',primary_photo_path=user_id::text||'/primary.png'
 where user_id::text like '53100000-%';

-- 130 tomorrow rows precede the selected Later row in the legacy probe.
-- The mask must filter these in candidates, before the 101-row limit.
insert into public.hangouts(id,university_id,host_id,title,starts_at,
 public_place,public_latitude,public_longitude)
select ('53100000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,
 '00000000-0000-4000-8000-000000000001',
 '53100000-0000-4000-8000-000000000001','Tomorrow '||n,
 (((now() at time zone 'America/New_York')::date + 1)::timestamp
  + interval '12 hours' + n * interval '1 second') at time zone 'America/New_York',
 'Campus area',35.913,-79.055 from generate_series(1,130) n;
insert into public.hangouts(id,university_id,host_id,title,starts_at,
 public_place,public_latitude,public_longitude)
values ('53100000-0000-4000-8001-000000000200',
 '00000000-0000-4000-8000-000000000001',
 '53100000-0000-4000-8000-000000000001','Later selected',
 ((greatest((now() at time zone 'America/New_York')::date + 2,
 (now() at time zone 'America/New_York')::date +
 (8 - extract(isodow from (now() at time zone 'America/New_York')::date)::integer))::timestamp
 + interval '12 hours') at time zone 'America/New_York'),
 'Campus area',35.913,-79.055);
insert into public.hangouts(id,university_id,host_id,title,starts_at,
 public_place,public_latitude,public_longitude)
values ('53100000-0000-4000-8001-000000000201',
 '00000000-0000-4000-8000-000000000001',
 '53100000-0000-4000-8000-000000000001','Past start',now()-interval '1 minute',
 'Campus area',35.913,-79.055);

set local role anon;
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'0001','any',now())$$,
 '42501',null,'anonymous mask query denied');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53100000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(jsonb_array_length(public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,
 '0000','any',now())->'pins'),0,'all-off mask returns no source rows');
select is(jsonb_array_length(public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,
 '0001','any',now())->'pins'),1,'Later survives 130 earlier excluded rows');
select is(public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,
 '0001','any',now())->'pins'->0->>'id','53100000-0000-4000-8001-000000000200',
 'selected Later row is the first post-filter result');
select is(jsonb_array_length(public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,
 '0100','any',now())->'pins'),101,'Tomorrow probe remains bounded at 101');
select is(jsonb_array_length(public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,
 '1111','any',now())->'pins'),101,'all-on mask keeps the bounded upcoming probe');
select is((select count(*) from jsonb_array_elements(public.query_saved_hangouts(
 -79.13,35.85,-78.98,35.97,'1111','any',now())->'pins') p
 where (p->>'starts_at')::timestamptz < now()),0::bigint,
 'all selected mask intervals exclude past starts');
select is((select count(*) from jsonb_array_elements(public.query_saved_hangouts(
 -79.13,35.85,-78.98,35.97,'all','any',now())->'pins') p
 where p->>'id'='53100000-0000-4000-8001-000000000201'),1::bigint,
 'legacy all still includes a past start');
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'010','any',now())$$,
 '42501',null,'short mask denied');
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'010x','any',now())$$,
 '42501',null,'nondigit mask denied');
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'0100' || chr(10),'any',now())$$,
 '42501',null,'newline suffix denied');
reset role;
update public.accounts set status='suspended' where id='53100000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53100000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'0001','any',now())$$,
 '42501',null,'unready caller remains denied');
reset role;
select * from finish();
rollback;
