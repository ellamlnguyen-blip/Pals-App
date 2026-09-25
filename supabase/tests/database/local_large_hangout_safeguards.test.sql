begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select is((select enabled from private.large_hangout_feature_gate), false,
  'safeguard starts disabled');
select ok((select relrowsecurity from pg_class where oid='private.large_hangout_signals'::regclass),
  'signals use RLS');
select ok(not has_table_privilege('authenticated','private.large_hangout_signals','SELECT')
  and not has_table_privilege('service_role','private.large_hangout_signals','SELECT'),
  'client and platform roles have no signal reader');
select is((select count(*) from information_schema.columns
  where table_schema='private' and table_name='large_hangout_signals'), 4::bigint,
  'signal relation has exactly four fields');

insert into auth.users(id,email,email_confirmed_at)
select ('52000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'task020a-'||n||'@unc.edu',now() from generate_series(1,30) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
  from public.accounts where id::text like '52000000-%';
update public.profiles set real_name='A fixture',major='Science',graduation_year=2028,
  bio='Local',primary_photo_path=user_id::text||'/primary.png'
  where user_id::text like '52000000-%';
insert into public.platform_roles(user_id,role)
  values ('52000000-0000-4000-8000-000000000029','moderator');
create function pg_temp.hid(n integer) returns uuid language sql as $$
  select ('52000000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.uid(n integer) returns uuid language sql as $$
  select ('52000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.saved() returns jsonb language sql as $$
  select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'all','any',now())
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_hangout_large_state('52000000-0000-4000-8001-000000000001')$$,
  '42501',null,'default-off host reader denied');
select throws_ok($$update private.large_hangout_feature_gate set enabled=true$$,
  '42501',null,'client cannot enable safeguard');
select throws_ok($$select * from private.large_hangout_signals$$,
  '42501',null,'client cannot read private signals');
select throws_ok($$select private.record_large_hangout_join('52000000-0000-4000-8001-000000000001')$$,
  '42501',null,'client cannot call signal writer');
set local role anon;
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'all','any',now())$$,
  '42501',null,'anonymous discovery denied');
reset role;
update private.hangout_feature_gate set enabled=true;

-- 130 source rows let the order-before-limit rule be observed. Every even
-- Hangout has 25 ready visible joined rows, every odd Hangout has one.
insert into public.hangouts(id,university_id,host_id,title,starts_at,
  public_place,public_latitude,public_longitude)
select pg_temp.hid(n),'00000000-0000-4000-8000-000000000001',pg_temp.uid(1),
  'Fixture '||n,now()+interval '1 hour'+n*interval '1 minute',
  'Campus area',35.913,-79.055 from generate_series(1,130) n;
insert into public.hangout_participants(hangout_id,account_id,state)
select pg_temp.hid(n),pg_temp.uid(1),'joined' from generate_series(1,130) n;
insert into public.hangout_participants(hangout_id,account_id,state)
select pg_temp.hid(n),pg_temp.uid(k),'joined'
  from generate_series(1,130) n cross join generate_series(2,25) k where n%2=0;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_hangout_large_state('52000000-0000-4000-8001-000000000002')$$,
  '42501',null,'safeguard-off host size denied');
select is(pg_temp.saved()->>'ranking_mode','chronological','gate off uses chronological mode');
select is(jsonb_array_length(pg_temp.saved()->'pins'),101,'gate-off probe returns 101 rows');
select is(pg_temp.saved()->'pins'->0->>'id',pg_temp.hid(1)::text,
  'gate-off first row is chronological');
select is(pg_temp.saved()->'pins'->100->>'id',pg_temp.hid(101)::text,
  'gate-off 101st row follows chronological order');
select is((select count(*) from jsonb_object_keys(pg_temp.saved()->'pins'->0)),10::bigint,
  'projection contains only ten SavedPin fields');
select throws_ok($$select * from public.get_hangout_large_state('52000000-0000-4000-8001-000000000999')$$,
  '42501',null,'unknown host target denied neutrally');
select throws_ok($$select public.query_saved_hangouts('NaN',35.85,-78.98,35.97,'all','any',now())$$,
  '42501',null,'NaN bounds denied');
select throws_ok($$select public.query_saved_hangouts(-79.14,35.85,-78.98,35.97,'all','any',now())$$,
  '42501',null,'outside UNC bounds denied');
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'all','any',now()-interval '121 seconds')$$,
  '42501',null,'old cutoff denied');
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'all','any',now()+interval '121 seconds')$$,
  '42501',null,'future cutoff denied');
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'bad','any',now())$$,
  '42501',null,'invalid filter denied');
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'all','any',null)$$,
  '42501',null,'missing cutoff denied');
reset role;

update private.large_hangout_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select is_large from public.get_hangout_large_state(pg_temp.hid(1))),false,
  'one joined row is below threshold');
select is((select is_large from public.get_hangout_large_state(pg_temp.hid(2))),true,
  '25 joined rows including host are large');
select is(pg_temp.saved()->>'ranking_mode','small_first','enabled gate uses small-first mode');
select is(pg_temp.saved()->'pins'->64->>'id',pg_temp.hid(129)::text,
  'all 65 small Hangouts rank ahead of early large ones');
select is(pg_temp.saved()->'pins'->65->>'id',pg_temp.hid(2)::text,
  'large Hangouts begin after every small one');
select is(pg_temp.saved()->'pins'->100->>'id',pg_temp.hid(72)::text,
  'limit 101 applies after authorized ranking');
select is((select count(*) from jsonb_array_elements(pg_temp.saved()->'pins') x
  where x->>'id'=pg_temp.hid(130)::text),0::bigint,
  'large candidate beyond the 101 probe remains truncated');
reset role;
insert into private.people_blocks(blocker_id,blocked_id)
  values (pg_temp.uid(26),pg_temp.uid(25));
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000026","role":"authenticated"}',true);
select is(pg_temp.saved()->'pins'->1->>'id',pg_temp.hid(2)::text,
  'viewer A blocked peer is excluded from its visible size');
select set_config('task020a.hidden_view',pg_temp.saved()::text,true);
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000027","role":"authenticated"}',true);
select is(pg_temp.saved()->'pins'->65->>'id',pg_temp.hid(2)::text,
  'viewer B sees the same source as large');
reset role;
update public.profiles set primary_photo_path=null where user_id=pg_temp.uid(25);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000026","role":"authenticated"}',true);
select is(pg_temp.saved()::text,current_setting('task020a.hidden_view'),
  'hidden blocked peer readiness does not influence viewer A projection');
reset role;
update public.profiles set primary_photo_path=pg_temp.uid(25)::text||'/primary.png'
  where user_id=pg_temp.uid(25);
delete from private.people_blocks where blocker_id=pg_temp.uid(26) and blocked_id=pg_temp.uid(25);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(jsonb_array_length(public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,
  'upcoming','open',now())->'pins'),101,'upcoming/open filters retain bounded probe');
reset role;
update public.hangouts set joining_state='closed',revision=revision+1 where id=pg_temp.hid(1);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from jsonb_array_elements(public.query_saved_hangouts(
  -79.13,35.85,-78.98,35.97,'all','open',now())->'pins') x
  where x->>'id'=pg_temp.hid(1)::text),0::bigint,'open filter excludes closed source');
reset role;
update public.hangouts set joining_state='open',revision=revision+1 where id=pg_temp.hid(1);
update public.hangouts set starts_at=now()-interval '1 hour',revision=revision+1
  where id=pg_temp.hid(129);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from jsonb_array_elements(public.query_saved_hangouts(
  -79.13,35.85,-78.98,35.97,'upcoming','any',now())->'pins') x
  where x->>'id'=pg_temp.hid(129)::text),0::bigint,'upcoming excludes past source');
reset role;
update public.hangouts set starts_at=now()+interval '3 hours',revision=revision+1
  where id=pg_temp.hid(129);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000029","role":"authenticated"}',true);
select throws_ok($$select * from public.get_hangout_large_state('52000000-0000-4000-8001-000000000002')$$,
  '42501',null,'moderator has no host-size privilege');
select throws_ok($$select * from private.large_hangout_signals$$,
  '42501',null,'moderator lacks raw signal reader');
reset role;
insert into public.universities(id,slug,name,active,allowed_email_domains)
  values ('52000000-0000-4000-8002-000000000001','task020a-other','Other campus',true,array['unc.edu']);
update public.university_memberships set university_id='52000000-0000-4000-8002-000000000001'
  where user_id=pg_temp.uid(30);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000030","role":"authenticated"}',true);
select is(jsonb_array_length(pg_temp.saved()->'pins'),0,
  'ready different-campus viewer sees no UNC Hangouts');
select throws_ok($$select * from public.get_hangout_large_state('52000000-0000-4000-8001-000000000002')$$,
  '42501',null,'different-campus nonhost has no size reader');
reset role;
update public.accounts set status='suspended' where id=pg_temp.uid(1);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_hangout_large_state('52000000-0000-4000-8001-000000000002')$$,
  '42501',null,'unready host loses size reader');
select throws_ok($$select public.query_saved_hangouts(-79.13,35.85,-78.98,35.97,'all','any',now())$$,
  '42501',null,'unready caller loses discovery');
reset role;
update public.accounts set status='active' where id=pg_temp.uid(1);
insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
  provenance_kind,provenance_ref_id) values
  ('52000000-0000-4000-8003-000000000001',pg_temp.uid(2),'hangout',pg_temp.hid(4),
    'harassment','retained_hangout',pg_temp.hid(4));
insert into private.hangout_disables(report_id,hangout_id,operator_id,request_id,
  subject_campus_id,reason) values
  ('52000000-0000-4000-8003-000000000001',pg_temp.hid(4),pg_temp.uid(29),
   '52000000-0000-4000-8003-000000000002',
   '00000000-0000-4000-8000-000000000001','Local fixture');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.get_hangout_large_state('52000000-0000-4000-8001-000000000004')$$,
  '42501',null,'moderation-disabled source denies host size');
select is((select count(*) from jsonb_array_elements(pg_temp.saved()->'pins') x
  where x->>'id'=pg_temp.hid(4)::text),0::bigint,
  'moderation-disabled source absent from discovery');
reset role;

-- The last joined row loses readiness. Host counting still includes it, while
-- the viewer-relative map order drops below threshold.
update public.profiles set primary_photo_path=null where user_id=pg_temp.uid(25);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select is_large from public.get_hangout_large_state(pg_temp.hid(2))),true,
  'host count includes a nonready joined member');
select is(pg_temp.saved()->'pins'->1->>'id',pg_temp.hid(2)::text,
  'nonready joined member no longer makes the viewer-relative class large');
reset role;
update public.profiles set primary_photo_path=pg_temp.uid(25)::text||'/primary.png'
  where user_id=pg_temp.uid(25);

-- Signal insertion runs only on genuine newly admitted joins, after the
-- participant transition; a replay does not create a second signal.
delete from public.hangout_participants where hangout_id=pg_temp.hid(2)
  and account_id=pg_temp.uid(25);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000025","role":"authenticated"}',true);
select lives_ok($$select public.join_hangout('52000000-0000-4000-8001-000000000002')$$,
  '24 to 25 genuine join admitted');
select lives_ok($$select public.join_hangout('52000000-0000-4000-8001-000000000002')$$,
  'joined replay remains idempotent');
reset role;
select is((select count(*) from private.large_hangout_signals where hangout_id=pg_temp.hid(2)),
  1::bigint,'exactly one private size signal after replay');
select is((select policy_version from private.large_hangout_signals where hangout_id=pg_temp.hid(2)),
  1,'signal records policy version one');
select is((select threshold_value from private.large_hangout_signals where hangout_id=pg_temp.hid(2)),
  25,'signal records threshold 25, not count');
select throws_ok($$update private.large_hangout_signals set threshold_value=25
  where hangout_id='52000000-0000-4000-8001-000000000002'$$,
  '42501',null,'saved signal cannot be rewritten');
select throws_ok($$delete from private.large_hangout_signals
  where hangout_id='52000000-0000-4000-8001-000000000002'$$,
  '42501',null,'saved signal cannot be deleted');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000025","role":"authenticated"}',true);
select lives_ok($$select public.leave_hangout('52000000-0000-4000-8001-000000000002')$$,
  'member may leave');
select lives_ok($$select public.join_hangout('52000000-0000-4000-8001-000000000002')$$,
  'same member may rejoin');
reset role;
select is((select count(*) from private.large_hangout_signals where hangout_id=pg_temp.hid(2)),
  1::bigint,'leave/rejoin cannot duplicate signal');
select is((select count(*) from private.large_hangout_signals where hangout_id=pg_temp.hid(1)),
  0::bigint,'no signal for small Hangout');

-- Gate updates have an opaque epoch even when the public projection is equal.
select set_config('task020a.epoch',(select ranking_epoch::text from private.large_hangout_feature_gate),true);
update private.large_hangout_feature_gate set enabled=false;
select isnt((select ranking_epoch::text from private.large_hangout_feature_gate),
  current_setting('task020a.epoch'),'trusted gate update changes epoch');
select is((select count(*) from private.large_hangout_signals where hangout_id=pg_temp.hid(2)),
  1::bigint,'signal persists while gate off');
update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1
  where id=pg_temp.hid(2);
select is((select count(*) from private.large_hangout_signals where hangout_id=pg_temp.hid(2)),
  1::bigint,'signal persists after ordinary cancellation');

select * from finish();
rollback;
