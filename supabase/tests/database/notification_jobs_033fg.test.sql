begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts','people','friendship','notifications');
update private.hangout_feature_gate set enabled=true where singleton;
update private.notification_feature_gate set enabled=true where singleton;
update private.people_feature_gate set enabled=true where singleton;
update private.friendship_feature_gate set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('633f0000-0000-4000-8000-000000000001','jobs033fg-1@unc.edu',now()),
 ('633f0000-0000-4000-8000-000000000002','jobs033fg-2@unc.edu',now()),
 ('633f0000-0000-4000-8000-000000000003','jobs033fg-3@unc.edu',now());
select ok(not has_table_privilege('authenticated','private.notification_actions','SELECT')
 and not has_table_privilege('authenticated','private.notification_schedule_state','SELECT')
 and not has_table_privilege('authenticated','private.notification_reminder_occurrences','SELECT')
 and not has_table_privilege('authenticated','private.notification_late_joins','SELECT'),
 'all source and cursor tables are private');
select ok(not has_function_privilege('authenticated','private.run_notification_jobs(integer)','EXECUTE'),
 'browser cannot run the worker');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select enabled from public.get_notification_preferences() where category='campus_new_hangout'),false,
 'campus activity defaults off');
select is((select enabled from public.get_notification_preferences() where category='friend_created_hangout'),false,
 'friend create defaults off');
select is((select enabled from public.get_notification_preferences() where category='friend_joined_hangout'),false,
 'friend join defaults off');
select set_config('notification033fg.first',public.create_hangout('633f0000-0000-4000-8001-000000000001',
 'First source',now()+interval '2 hours','Campus area',35,-79)::text,true);
reset role;
select is((select count(*) from private.notification_actions where hangout_id=current_setting('notification033fg.first')::uuid),
 1::bigint,'one durable action on source creation');
select is((select count(*) from private.notification_reminder_occurrences
 where hangout_id=current_setting('notification033fg.first')::uuid),1::bigint,
 'one durable start occurrence');
select ok(private.run_notification_jobs(100)>=1,'bounded worker advances source cursor');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.first')::uuid
 and event_code='campus_new_hangout'),0::bigint,'default off emits no campus row');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.set_notification_preference('campus_new_hangout',true),true,'recipient opts in');
reset role;
select ok(private.run_notification_jobs(100)>=0,'retry after opt-in runs');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.first')::uuid
 and event_code='campus_new_hangout'),0::bigint,'opt-in does not backfill old action');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('notification033fg.second',public.create_hangout('633f0000-0000-4000-8001-000000000002',
 'Second source',now()+interval '30 minutes','Campus area',35,-79)::text,true);
reset role;
select is(private.run_notification_jobs(1),1,'due reminder advances before activity backlog');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.second')::uuid
 and recipient_id='633f0000-0000-4000-8000-000000000001' and event_code='hangout_start_reminder'),
 1::bigint,'due host reminder is delivered under activity backlog');
select ok(private.run_notification_jobs(100)>=1,'worker then processes opted-in activity');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.second')::uuid
 and recipient_id='633f0000-0000-4000-8000-000000000002' and event_code='campus_new_hangout'),
 1::bigint,'one authorized campus item');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.second')::uuid
 and recipient_id='633f0000-0000-4000-8000-000000000001' and event_code='hangout_start_reminder'),
 1::bigint,'joined host receives one backend reminder');
select ok(private.run_notification_jobs(100)>=0,'worker retry is safe');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.second')::uuid
 and event_code='hangout_start_reminder'),1::bigint,'reminder retry deduplicates');
insert into public.hangout_participants(hangout_id,account_id,state)
 values(current_setting('notification033fg.second')::uuid,'633f0000-0000-4000-8000-000000000003','joined');
update public.hangout_participants set state='left',left_at=clock_timestamp(),updated_at=clock_timestamp()
 where hangout_id=current_setting('notification033fg.second')::uuid
 and account_id='633f0000-0000-4000-8000-000000000003';
select ok(private.run_notification_jobs(100)>=0,'late join queue advances after leave');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.second')::uuid
 and recipient_id='633f0000-0000-4000-8000-000000000003' and event_code='hangout_start_reminder'),
 0::bigint,'departed late joiner receives no reminder');
select set_config('notification033fg.old_occurrence',(select source_id from private.notification_items
 where target_id=current_setting('notification033fg.second')::uuid
 and event_code='hangout_start_reminder' limit 1)::text,true);
select set_config('notification033fg.old_item',(select id from private.notification_items
 where source_id=current_setting('notification033fg.old_occurrence')::uuid limit 1)::text,true);
select set_config('notification033fg.original_start',(select starts_at from public.hangouts
 where id=current_setting('notification033fg.second')::uuid)::text,true);
update public.hangouts set starts_at=now()+interval '3 hours',revision=revision+1
 where id=current_setting('notification033fg.second')::uuid;
update public.hangouts set starts_at=current_setting('notification033fg.original_start')::timestamptz,
 revision=revision+1 where id=current_setting('notification033fg.second')::uuid;
select is((select count(*) from private.notification_reminder_occurrences
 where hangout_id=current_setting('notification033fg.second')::uuid),3::bigint,
 'A to B to A has three monotonic occurrence identities');
select ok(private.run_notification_jobs(100)>=1,'new current occurrence is processed');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.second')::uuid
 and event_code='hangout_start_reminder'),2::bigint,'return to A creates only a fresh current reminder');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(exists(select 1 from public.list_notifications() where notification_id=current_setting('notification033fg.old_item')::uuid
 and label='Unavailable'),'old A reminder remains neutral after return');
reset role;
insert into private.friendships(low_id,high_id,requester_id,campus_id,state) values
 ('633f0000-0000-4000-8000-000000000001','633f0000-0000-4000-8000-000000000002',
  '633f0000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','accepted'),
 ('633f0000-0000-4000-8000-000000000002','633f0000-0000-4000-8000-000000000003',
  '633f0000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','accepted');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.set_notification_preference('friend_created_hangout',true),true,'friend creation category enabled');
select is(public.set_notification_preference('friend_joined_hangout',true),true,'friend join category enabled');
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('notification033fg.third',public.create_hangout('633f0000-0000-4000-8001-000000000003',
 'Friend source',now()+interval '2 hours','Campus area',35,-79)::text,true);
reset role;
select ok(private.run_notification_jobs(100)>=1,'friend-created action processed');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.third')::uuid
 and recipient_id='633f0000-0000-4000-8000-000000000002' and event_code='friend_created_hangout'),
 1::bigint,'friend-created wins over campus for same action');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.third')::uuid
 and recipient_id='633f0000-0000-4000-8000-000000000002' and event_code='campus_new_hangout'),
 0::bigint,'precedence emits no second category');
insert into public.hangout_participants(hangout_id,account_id,state)
 values(current_setting('notification033fg.third')::uuid,'633f0000-0000-4000-8000-000000000003','joined');
select ok(private.run_notification_jobs(100)>=1,'friend-joined action processed');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.third')::uuid
 and recipient_id='633f0000-0000-4000-8000-000000000002' and event_code='friend_joined_hangout'),
 1::bigint,'current accepted friend join creates one item');
update private.friendship_feature_gate set enabled=false where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(exists(select 1 from public.list_notifications() where event_code is null and label='Unavailable'),
 'friend source rows neutral when friendship gate closes');
reset role;
update private.friendship_feature_gate set enabled=true where singleton;
insert into private.people_blocks(blocker_id,blocked_id) values
 ('633f0000-0000-4000-8000-000000000002','633f0000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(not exists(select 1 from public.list_notifications() where event_code='friend_joined_hangout'
 and target_id=current_setting('notification033fg.third')::uuid),
 'bilateral block neutralizes retained friend-joined item');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(exists(select 1 from public.list_notifications() where event_code='campus_new_hangout'
 and target_id=current_setting('notification033fg.second')::uuid),'fresh owner read projects source');
select is(public.set_notification_preference('campus_new_hangout',false),false,'recipient mutes future activity');
select ok(exists(select 1 from public.list_notifications() where event_code='campus_new_hangout'
 and target_id=current_setting('notification033fg.second')::uuid),'mute does not erase existing row');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('notification033fg.stale_hid',public.create_hangout('633f0000-0000-4000-8001-000000000005',
 'Stale reminder source',now()+interval '30 minutes','Campus area',35,-79)::text,true);
reset role;
update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1
 where id=current_setting('notification033fg.stale_hid')::uuid;
update private.notification_actions set finished_at=clock_timestamp()
 where hangout_id=current_setting('notification033fg.stale_hid')::uuid;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('notification033fg.active_hid',public.create_hangout('633f0000-0000-4000-8001-000000000006',
 'Active activity source',now()+interval '2 hours','Campus area',35,-79)::text,true);
reset role;
select ok(private.run_notification_jobs(100)>=1,
 'stale cancelled reminder does not discard later published activity');
select is((select count(*) from private.notification_items where target_id=current_setting('notification033fg.active_hid')::uuid
 and recipient_id='633f0000-0000-4000-8000-000000000002' and event_code='friend_created_hangout'),
 1::bigint,'activity phase reads its own locked source after stale reminder phase');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"633f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('notification033fg.error_hid',public.create_hangout('633f0000-0000-4000-8001-000000000004',
 'Forced worker error',now()+interval '30 minutes','Campus area',35,-79)::text,true);
reset role;
create function pg_temp.fail_fg_reminder_insert() returns trigger language plpgsql as $$
begin
 if new.event_code='hangout_start_reminder'
  and new.target_id=current_setting('notification033fg.error_hid')::uuid then
  raise exception 'Synthetic reminder insert failure';
 end if;
 return new;
end; $$;
create trigger notification_fg_forced_error before insert on private.notification_items
 for each row execute function pg_temp.fail_fg_reminder_insert();
select is(private.run_notification_jobs(1),0,'failed reminder attempt returns no delivery');
select is((select attempts from private.notification_reminder_occurrences
 where hangout_id=current_setting('notification033fg.error_hid')::uuid),1,
 'failed attempt retains one retry record');
select ok((select last_error is not null from private.notification_reminder_occurrences
 where hangout_id=current_setting('notification033fg.error_hid')::uuid),
 'retry evidence retains SQL error');
select ok((select cursor_id is null from private.notification_actions
 where hangout_id=current_setting('notification033fg.error_hid')::uuid),
 'failed attempt consumes the sole run slot before optional activity');
drop trigger notification_fg_forced_error on private.notification_items;
select * from finish();
rollback;
