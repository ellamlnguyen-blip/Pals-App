begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at)
select ('53200000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'b2-'||n||'@unc.edu',now() from generate_series(1,5) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '53200000-%';
update public.profiles set real_name='B2 fixture',major='Biology',graduation_year=2028,
  bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '53200000-%';
insert into public.platform_roles(user_id,role) values
 ('53200000-0000-4000-8000-000000000001','moderator'),
 ('53200000-0000-4000-8000-000000000005','admin');
update private.hangout_feature_gate set enabled=true;
update private.hangout_chat_feature_gate set enabled=true;
update private.safety_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select set_config('b2.h1',public.create_hangout(
 '53200000-0000-4000-8003-000000000001','Published title',
 now()+interval '1 hour','Approximate area',35,-79,
 p_private_instructions=>'Private meeting details')::text,true);
select set_config('b2.h2',public.create_hangout(
 '53200000-0000-4000-8003-000000000002','Cancelled title',
 now()+interval '2 hours','Approximate area',35,-79)::text,true);
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.join_hangout(current_setting('b2.h1')::uuid);
select public.join_hangout(current_setting('b2.h2')::uuid);
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.cancel_hangout(current_setting('b2.h2')::uuid,1);
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select * from public.send_hangout_message(current_setting('b2.h1')::uuid,
 '53200000-0000-4000-8003-000000000039','Earlier message');
reset role;
update private.notification_feature_gate set enabled=true;
insert into private.notification_items(recipient_id,source_kind,source_id,target_id,
 event_code,actor_id) values
 ('53200000-0000-4000-8000-000000000003','hangout',
  '53200000-0000-4000-8005-000000000001',current_setting('b2.h1')::uuid,
  'hangout_edited','53200000-0000-4000-8000-000000000002'),
 ('53200000-0000-4000-8000-000000000002','hangout_chat',
  (select message_id from private.hangout_message_requests
   where request_id='53200000-0000-4000-8003-000000000039'),
  current_setting('b2.h1')::uuid,'hangout_chat_message',
  '53200000-0000-4000-8000-000000000003');
insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
 provenance_kind,provenance_ref_id) values
 ('53200000-0000-4000-8002-000000000001','53200000-0000-4000-8000-000000000003',
 'hangout',current_setting('b2.h1')::uuid,'harassment','retained_hangout',current_setting('b2.h1')::uuid),
 ('53200000-0000-4000-8002-000000000002','53200000-0000-4000-8000-000000000003',
 'hangout',current_setting('b2.h2')::uuid,'harassment','retained_hangout',current_setting('b2.h2')::uuid),
 ('53200000-0000-4000-8002-000000000003','53200000-0000-4000-8000-000000000004',
 'hangout',current_setting('b2.h1')::uuid,'harassment','retained_hangout',current_setting('b2.h1')::uuid),
 ('53200000-0000-4000-8002-000000000004','53200000-0000-4000-8000-000000000004',
 'hangout','53200000-0000-4000-8004-000000000099','harassment',
 'retained_hangout','53200000-0000-4000-8004-000000000099');
select is((select enabled from private.moderation_feature_gate where singleton),false,
 'moderation gate defaults off');
select ok((select relrowsecurity from pg_class where oid='private.hangout_disables'::regclass),
 'disable evidence has RLS');
select ok(not has_table_privilege('authenticated','private.hangout_disables','SELECT')
 and not has_table_privilege('service_role','private.hangout_disables','SELECT'),
 'neither client nor service role has a raw disable reader');
set local role anon;
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,'Reason')$$,
 '42501',null,'anon cannot disable');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,'Reason')$$,
 '42501',null,'gate-off moderator denied');
select throws_ok($$select * from private.hangout_disables$$,
 '42501',null,'operator lacks raw disable reader');
reset role;
update private.moderation_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,'Reason')$$,
 '42501',null,'host cannot act');
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,'Reason')$$,
 '42501',null,'reporter cannot act');
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select target_disabled from public.get_moderation_report(
 '53200000-0000-4000-8002-000000000001')),false,
 'detail projects live enabled state');
select is((select target_status from public.get_moderation_report(
 '53200000-0000-4000-8002-000000000004')),'unavailable',
 'missing target has neutral unavailable lifecycle');
select is((select target_disabled from public.get_moderation_report(
 '53200000-0000-4000-8002-000000000004')),null::boolean,
 'missing target has null disabled context');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000004',
 '53200000-0000-4000-8003-000000000014',0,'Reason')$$,
 '42501',null,'missing exact target denied neutrally');
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.list_notifications()
 where target_id=current_setting('b2.h1')::uuid),1::bigint,
 'chat notification has destination before disable');
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select revision from public.transition_moderation_case(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000010',0,'start_review')),1::bigint,
 'first case enters review');
select is((select revision from public.transition_moderation_case(
 '53200000-0000-4000-8002-000000000002',
 '53200000-0000-4000-8003-000000000020',0,'start_review')),1::bigint,
 'cancelled case enters review');
select is((select revision from public.transition_moderation_case(
 '53200000-0000-4000-8002-000000000003',
 '53200000-0000-4000-8003-000000000030',0,'start_review')),1::bigint,
 'second report enters review');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000010',1,'Reason')$$,
 '42501',null,'Stage A request key cannot be reused');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',0,'Reason')$$,
 '42501',null,'stale expected revision denied');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,' ')$$,
 '42501',null,'blank reason denied');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,repeat('x',2001))$$,
 '42501',null,'overlong reason denied');
select is((select revision from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,'  Reason  ')),2::bigint,
 'published Hangout disabled and case closed');
select is((select revision from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,'Reason')),2::bigint,
 'exact replay returns saved result');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',1,'Changed')$$,
 '42501',null,'changed payload denied');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000003',
 '53200000-0000-4000-8003-000000000031',1,'Another')$$,
 '42501',null,'another report cannot create duplicate disable');
select is((select target_status from public.get_moderation_report(
 '53200000-0000-4000-8002-000000000001')),'published',
 'detail retains lifecycle status');
select is((select target_disabled from public.get_moderation_report(
 '53200000-0000-4000-8002-000000000001')),true,
 'detail projects disabled state');
select throws_ok($$select * from public.transition_moderation_case(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000011',2,'reopen','Reason')$$,
 '42501',null,'B2 request UUID cannot become Stage A action');
reset role;
select is((select status from public.hangouts where id=current_setting('b2.h1')::uuid),
 'published','disable preserves lifecycle');
select is((select count(*) from private.hangout_disables where hangout_id=current_setting('b2.h1')::uuid),
 1::bigint,'one exact private disable');
select is((select count(*) from private.moderation_audit where hangout_disable_id is not null),
 1::bigint,'one disable audit after replay');
select is((select reason from private.hangout_disables where hangout_id=current_setting('b2.h1')::uuid),
 'Reason','reason is trimmed and retained');
select ok((select hangout_disable_id is not null and sanction_id is null and disposition='action_taken'
 from private.moderation_cases where report_id='53200000-0000-4000-8002-000000000001'),
 'case has exactly one linked action');
select throws_ok($$update private.moderation_cases set hangout_disable_id=null
 where report_id='53200000-0000-4000-8002-000000000001'$$,
 '23514',null,'action_taken cannot lose its committed action link');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.hangouts where id=current_setting('b2.h1')::uuid),
 0::bigint,'host direct Hangout read masked');
select is((select count(*) from public.hangout_participants where hangout_id=current_setting('b2.h1')::uuid),
 0::bigint,'host direct roster read masked');
select is((select count(*) from public.hangout_private_locations where hangout_id=current_setting('b2.h1')::uuid),
 0::bigint,'host private instructions masked');
select is((select count(*) from public.list_notifications()
 where source_kind is null and target_id is null and label='Unavailable'),1::bigint,
 'chat notification becomes neutral and loses destination');
select throws_ok($$select public.set_hangout_joining(current_setting('b2.h1')::uuid,1,'closed')$$,
 '42501',null,'host joining-state writer denied');
select throws_ok($$select public.cancel_hangout(current_setting('b2.h1')::uuid,1)$$,
 '42501',null,'host cancellation denied');
select throws_ok($$select public.edit_hangout(current_setting('b2.h1')::uuid,1,
 'Changed',now()+interval '1 hour','Area',35,-79)$$,
 '42501',null,'host edit denied');
select throws_ok($$select public.remove_hangout_participant(current_setting('b2.h1')::uuid,
 '53200000-0000-4000-8000-000000000003')$$,
 '42501',null,'host removal denied');
select is(public.get_hangout_participant_state(current_setting('b2.h1')::uuid,auth.uid()),
 'joined','safety route reveals only own retained state');
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.hangouts where id=current_setting('b2.h1')::uuid),
 0::bigint,'attendee direct Hangout read masked');
select is((select count(*) from public.hangout_participants where hangout_id=current_setting('b2.h1')::uuid),
 0::bigint,'attendee direct roster masked');
select is((select count(*) from public.list_notifications()
 where source_kind is null and target_id is null and label='Unavailable'),1::bigint,
 'Hangout notification becomes neutral and loses destination');
select throws_ok($$select public.join_hangout(current_setting('b2.h1')::uuid)$$,
 '42501',null,'attendee rejoin denied');
select throws_ok($$select public.leave_hangout(current_setting('b2.h1')::uuid)$$,
 '42501',null,'attendee leave denied');
select throws_ok($$select public.send_hangout_message(current_setting('b2.h1')::uuid,
 '53200000-0000-4000-8003-000000000040','After disable')$$,
 '42501',null,'attendee chat send denied');
select throws_ok($$select * from public.read_hangout_messages(current_setting('b2.h1')::uuid)$$,
 '42501',null,'attendee chat read denied');
select is((select count(*) from public.list_my_retained_hangout_ids()
 where hangout_id=current_setting('b2.h1')::uuid),1::bigint,
 'safety retained ID remains recoverable');
select is(public.get_hangout_participant_state(current_setting('b2.h1')::uuid,auth.uid()),
 'joined','attendee retains own state');
select is((select count(*) from public.submit_safety_report(
 '53200000-0000-4000-8003-000000000041','hangout',current_setting('b2.h1')::uuid,
 'harassment',null)),1::bigint,'retained safety Hangout report still works');
reset role;
select is((select count(*) from public.hangout_participants where hangout_id=current_setting('b2.h1')::uuid),
 2::bigint,'participant evidence retained');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is(public.set_safety_block('53200000-0000-4000-8000-000000000002',true),
 true,'global safety block reconciles disabled Hangout');
select is(public.get_hangout_participant_state(current_setting('b2.h1')::uuid,auth.uid()),
 'left','disabled participant safety state reflects internal reconciliation');
select throws_ok($$select public.join_hangout(current_setting('b2.h1')::uuid)$$,
 '42501',null,'reconciled attendee cannot rejoin disabled source');
select throws_ok($$select public.leave_hangout(current_setting('b2.h1')::uuid)$$,
 '42501',null,'reconciled attendee cannot use ordinary leave');
reset role;
select is((select state from public.hangout_participants
 where hangout_id=current_setting('b2.h1')::uuid
 and account_id='53200000-0000-4000-8000-000000000003'),'left',
 'internal block transition persisted on disabled Hangout');
select is((select state from public.hangout_participants
 where hangout_id=current_setting('b2.h1')::uuid
 and account_id='53200000-0000-4000-8000-000000000002'),'joined',
 'disabled Hangout host remains joined after attendee block');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select revision from public.apply_hangout_moderation_action(
 '53200000-0000-4000-8002-000000000002',
 '53200000-0000-4000-8003-000000000021',1,'Cancelled source')),2::bigint,
 'cancelled Hangout can be disabled');
select is((select target_status from public.get_moderation_report(
 '53200000-0000-4000-8002-000000000002')),'cancelled',
 'cancelled lifecycle retained in detail');
select is((select target_disabled from public.get_moderation_report(
 '53200000-0000-4000-8002-000000000002')),true,
 'cancelled target disabled in detail');
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.hangouts where id=current_setting('b2.h2')::uuid),
 0::bigint,'disabled cancelled host direct read masked');
select is((select count(*) from public.hangout_participants
 where hangout_id=current_setting('b2.h2')::uuid),0::bigint,
 'disabled cancelled host roster masked');
select is(public.get_hangout_participant_state(current_setting('b2.h2')::uuid,auth.uid()),
 'joined','disabled cancelled host retains only own safety state');
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.hangouts where id=current_setting('b2.h2')::uuid),
 0::bigint,'disabled cancelled attendee direct read masked');
select is((select count(*) from public.hangout_participants
 where hangout_id=current_setting('b2.h2')::uuid),0::bigint,
 'disabled cancelled attendee roster masked');
select is(public.get_hangout_participant_state(current_setting('b2.h2')::uuid,auth.uid()),
 'left','disabled cancelled attendee retains only own safety state');
select is((select count(*) from public.submit_safety_report(
 '53200000-0000-4000-8003-000000000042','hangout',current_setting('b2.h2')::uuid,
 'harassment',null)),1::bigint,
 'disabled cancelled attendee can file retained private report');
select set_config('request.jwt.claims',
 '{"sub":"53200000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select revision from public.transition_moderation_case(
 '53200000-0000-4000-8002-000000000001',
 '53200000-0000-4000-8003-000000000012',2,'reopen','Further review')),3::bigint,
 'reopen permitted without undoing disable');
reset role;
select ok((select disposition is null and hangout_disable_id is null
 from private.moderation_cases where report_id='53200000-0000-4000-8002-000000000001'),
 'reopen clears only current action link');
select is((select count(*) from private.hangout_disables),2::bigint,
 'historical disable rows retained');
select throws_ok($$delete from private.hangout_disables where report_id=
 '53200000-0000-4000-8002-000000000001'$$,
 '42501',null,'disable evidence immutable');
select throws_ok($$delete from private.safety_reports where id=
 '53200000-0000-4000-8002-000000000001'$$,
 '23503',null,'report deletion restricted');
select throws_ok($$delete from public.hangouts where id=current_setting('b2.h1')::uuid$$,
 '23503',null,'Hangout deletion restricted');
select * from finish();
rollback;
