begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at)
select ('54000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'cohost-'||n||'@unc.edu',now() from generate_series(1,7) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '54000000-%';
update public.profiles set real_name='Cohost fixture',major='Science',
  graduation_year=2028,bio='Local',primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '54000000-%';
insert into public.platform_roles(user_id,role)
values ('54000000-0000-4000-8000-000000000006','moderator');
insert into public.universities(id,slug,name,active,allowed_email_domains)
values ('54000000-0000-4000-8001-000000000001','cohost-campus','Other campus',true,array['unc.edu']);
update public.university_memberships
  set university_id='54000000-0000-4000-8001-000000000001'
  where user_id='54000000-0000-4000-8000-000000000007';
create function pg_temp.hid() returns uuid language sql as
$$select current_setting('cohost.hangout')::uuid$$;
select is((select enabled from private.hangout_feature_gate where singleton),false,
  'Hangout gate remains default off');
select ok(not has_table_privilege('authenticated','private.hangout_cohosts','SELECT')
  and not has_table_privilege('authenticated','private.hangout_cohosts','INSERT')
  and not has_table_privilege('authenticated','private.hangout_cohosts','DELETE'),
  'assignment table has no client grants');
select ok(to_regprocedure('public.remove_hangout_participant(uuid,uuid)') is null,
  'old revision-free RPC absent');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.promote_hangout_cohost('54000000-0000-4000-8002-000000000001',
  '54000000-0000-4000-8000-000000000002',1)$$,
  '42501',null,'gate off denies promotion');
reset role;
update private.hangout_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost.hangout',public.create_hangout(
  '54000000-0000-4000-8003-000000000001','Original',now()+interval '1 hour',
  'Area',35,-79,p_private_instructions=>'Private place')::text,true);
select throws_ok($$select public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000001',1)$$,
  '42501',null,'host cannot become cohost');
select throws_ok($$select public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000002',1)$$,
  '42501',null,'nonparticipant cannot be promoted');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select throws_ok($$select public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000004',1)$$,
  '42501',null,'ordinary participant cannot assign self');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select throws_ok($$select * from public.list_hangout_cohosts(pg_temp.hid())$$,
  '42501',null,'other campus cannot read assignments');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000002',1),2::bigint,'host promotes joined target');
select throws_ok($$select public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000003',1)$$,
  '40001',null,'stale promotion rejected');
select is((select count(*) from public.list_hangout_cohosts(pg_temp.hid())),
  1::bigint,'host sees retained assignment');
select is((select role_label from public.list_hangout_roster_roles(pg_temp.hid())
  where account_id='54000000-0000-4000-8000-000000000002'),
  'cohost','ready roster labels assigned cohost');
select is((select role_label from public.list_hangout_roster_roles(pg_temp.hid())
  where account_id='54000000-0000-4000-8000-000000000001'),
  'host','roster labels immutable host');
select ok((select count(*) from public.list_hangout_roster_roles(pg_temp.hid(),null,1))=1,
  'roster page bounded');
select ok((select count(*) from public.list_hangout_roster_roles(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000001',1))=1,'roster cursor advances');
select throws_ok($$select * from public.list_hangout_cohosts(pg_temp.hid(),null,25)$$,
  '42501',null,'assignment limit bounded');
select throws_ok($$select * from private.hangout_cohosts$$,
  '42501',null,'client cannot select assignment table');
select throws_ok($$delete from private.hangout_cohosts$$,
  '42501',null,'client cannot delete assignment table');
select throws_ok($$select public.remove_hangout_participant(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000003')$$,
  '42883',null,'old signature denied');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.list_hangout_cohosts(pg_temp.hid())$$,
  '42501',null,'cohost cannot inspect retained assignments');
select is((select role_label from public.list_hangout_roster_roles(pg_temp.hid())
  where account_id=auth.uid()),'cohost','cohost can read current-ready label');
select is(public.edit_hangout(pg_temp.hid(),2,'Cohost edited',
  (select starts_at from public.hangouts where id=pg_temp.hid()),
  'Area',35,-79,p_private_instructions=>'New private place'),3::bigint,
  'cohost edits public and private details atomically');
select is((select instructions from public.hangout_private_locations
  where hangout_id=pg_temp.hid()),'New private place','cohost private edit persists');
select is(public.set_hangout_joining(pg_temp.hid(),3,'closed'),4::bigint,
  'cohost closes joining');
select is(public.set_hangout_joining(pg_temp.hid(),4,'open'),5::bigint,
  'cohost reopens joining');
select throws_ok($$select public.cancel_hangout(pg_temp.hid(),5)$$,
  '42501',null,'cohost cannot cancel');
select throws_ok($$select public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000003',5)$$,
  '42501',null,'cohost cannot promote');
select throws_ok($$select public.remove_hangout_participant(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000001',5)$$,
  '42501',null,'cohost cannot remove host');
select is(public.remove_hangout_participant(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000003',5),6::bigint,
  'cohost removes ready ordinary participant');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000004',6),7::bigint,
  'host assigns second cohost');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.remove_hangout_participant(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000004',7)$$,
  '42501',null,'cohost cannot remove another cohost');
reset role;
update public.profiles set primary_photo_path=null
  where user_id='54000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.list_hangout_cohosts(pg_temp.hid())),
  2::bigint,'host sees suspended retained assignment');
select is((select count(*) from public.list_hangout_roster_roles(pg_temp.hid())
  where account_id='54000000-0000-4000-8000-000000000004'),
  0::bigint,'nonready assignee hidden from roster');
select is(public.demote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000004',7),8::bigint,
  'host demotes nonready assignee');
reset role;
update public.profiles set primary_photo_path=user_id::text||'/primary.png'
  where user_id='54000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select role_label from public.list_hangout_roster_roles(pg_temp.hid())
  where account_id=auth.uid()),'participant','demoted readiness return stays ordinary');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.step_down_hangout_cohost(pg_temp.hid(),8),9::bigint,
  'cohost steps down and advances revision');
select is(public.get_hangout_participant_state(pg_temp.hid(),auth.uid()),
  'joined','step-down keeps membership');
select throws_ok($$select public.set_hangout_joining(pg_temp.hid(),9,'closed')$$,
  '42501',null,'stepped-down member cannot manage joining');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000002',9),10::bigint,
  'host can assign joined former cohost again');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.leave_hangout(pg_temp.hid());
select is((select revision from public.hangouts where id=pg_temp.hid()),
  11::bigint,'cohost leave advances management revision');
reset role;
select is((select count(*) from private.hangout_cohosts
  where hangout_id=pg_temp.hid() and account_id='54000000-0000-4000-8000-000000000002'),
  0::bigint,'leave centrally clears assignment');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select is((select role_label from public.list_hangout_roster_roles(pg_temp.hid())
  where account_id=auth.uid()),'participant','rejoin does not restore role');
select throws_ok($$select public.edit_hangout(pg_temp.hid(),11,'Forged',
  now()+interval '1 hour','Area',35,-79)$$,
  '42501',null,'rejoined former cohost cannot edit');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.promote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000002',11),12::bigint,
  'host explicitly reassigns rejoined member');
select is(public.cancel_hangout(pg_temp.hid(),12),13::bigint,'host cancels');
select throws_ok($$select public.demote_hangout_cohost(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000002',13)$$,
  '42501',null,'cancellation denies demotion');
select is(public.remove_hangout_participant(pg_temp.hid(),
  '54000000-0000-4000-8000-000000000002',13),14::bigint,
  'host may remove assigned member after cancellation');
reset role;
select is((select count(*) from private.hangout_cohosts where hangout_id=pg_temp.hid()),
  0::bigint,'cancelled removal clears assignment');
-- Direct safety teardown uses the participant trigger; unblock cannot revive
-- membership or the former co-host assignment.
reset role;
update private.safety_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost.blocked',public.create_hangout(
  '54000000-0000-4000-8003-000000000003','Block plan',
  now()+interval '1 hour','Area',35,-79)::text,true);
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.join_hangout(current_setting('cohost.blocked')::uuid);
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.promote_hangout_cohost(current_setting('cohost.blocked')::uuid,
  '54000000-0000-4000-8000-000000000004',1),2::bigint,
  'block target has an assignment');
select set_config('cohost.pre_block_revision',(select revision::text from public.hangouts
  where id=current_setting('cohost.blocked')::uuid),true);
select is((select count(*) from public.list_hangout_roster_roles(
  current_setting('cohost.blocked')::uuid) where account_id=
  '54000000-0000-4000-8000-000000000004'),1::bigint,
  'host roster initially includes cohost before block reconciliation');
select is((select count(*) from public.list_hangout_cohosts(
  current_setting('cohost.blocked')::uuid) where account_id=
  '54000000-0000-4000-8000-000000000004'),1::bigint,
  'host assignment page initially includes cohost before block reconciliation');
select is(public.set_safety_block('54000000-0000-4000-8000-000000000004',true),
  true,'host block tears down joined cohost');
select is((select revision from public.hangouts where id=
  current_setting('cohost.blocked')::uuid),
  current_setting('cohost.pre_block_revision')::bigint,
  'block reconciliation changes visibility without a Hangout revision advance');
select is((select count(*) from public.list_hangout_roster_roles(
  current_setting('cohost.blocked')::uuid) where account_id=
  '54000000-0000-4000-8000-000000000004'),0::bigint,
  'host roster page omits blocked cohost at the same revision');
select is((select count(*) from public.list_hangout_cohosts(
  current_setting('cohost.blocked')::uuid) where account_id=
  '54000000-0000-4000-8000-000000000004'),0::bigint,
  'host assignment page omits blocked cohost at the same revision');
reset role;
select is((select count(*) from private.hangout_cohosts
  where hangout_id=current_setting('cohost.blocked')::uuid),0::bigint,
  'direct block transition clears assignment');
select is((select count(*) from private.hangout_peer_provenance
  where hangout_id=current_setting('cohost.blocked')::uuid),1::bigint,
  'block teardown retains overlap provenance');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.set_safety_block('54000000-0000-4000-8000-000000000004',false),
  false,'host unblocks former cohost');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.join_hangout(current_setting('cohost.blocked')::uuid)$$,
  '42501',null,'unblock does not restore removed membership');
-- A pre-start cancellation remains attendance-ineligible after later management
-- and assigned-member leave, even after the answer opening boundary passes.
reset role;
update private.attendance_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost.attendance',public.create_hangout(
  '54000000-0000-4000-8003-000000000002','Short plan',
  clock_timestamp()+interval '2 seconds','Area',35,-79,
  p_ends_at=>clock_timestamp()+interval '3 seconds')::text,true);
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.join_hangout(current_setting('cohost.attendance')::uuid);
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select public.join_hangout(current_setting('cohost.attendance')::uuid);
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.promote_hangout_cohost(current_setting('cohost.attendance')::uuid,
  '54000000-0000-4000-8000-000000000005',1),2::bigint,
  'short plan cohost assigned before cancellation');
select is(public.cancel_hangout(current_setting('cohost.attendance')::uuid,2),
  3::bigint,'short plan cancelled before start');
select set_config('cohost.cancelled_at',(select updated_at::text from public.hangouts
  where id=current_setting('cohost.attendance')::uuid),true);
select pg_sleep(4);
select is(public.remove_hangout_participant(current_setting('cohost.attendance')::uuid,
  '54000000-0000-4000-8000-000000000004',3),4::bigint,
  'host removes ordinary member after pre-start cancellation and opening');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select lives_ok($$select public.leave_hangout(current_setting('cohost.attendance')::uuid)$$,
  'assigned member may leave after cancellation');
reset role;
select is((select revision from public.hangouts
  where id=current_setting('cohost.attendance')::uuid),5::bigint,
  'cancelled removal and cohost leave advance revision');
select is((select updated_at from public.hangouts
  where id=current_setting('cohost.attendance')::uuid),
  current_setting('cohost.cancelled_at')::timestamptz,
  'cancelled removal and leave preserve cancellation timestamp');
select is((select count(*) from private.hangout_cohosts
  where hangout_id=current_setting('cohost.attendance')::uuid),0::bigint,
  'cancelled cohost leave clears assignment');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select * from public.answer_own_attendance(
  current_setting('cohost.attendance')::uuid,true,0)$$,
  '42501',null,'pre-start cancellation remains ineligible after leave');
select set_config('request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select * from public.answer_own_attendance(
  current_setting('cohost.attendance')::uuid,true,0)$$,
  '42501',null,'pre-start cancellation remains ineligible after host removal');
select * from finish();
rollback;
