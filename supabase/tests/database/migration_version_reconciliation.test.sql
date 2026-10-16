-- TASK-039E: final bridge keeps friend-aware DM attention and restores owner ack.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','people','notifications');
insert into auth.users(id,email,email_confirmed_at) values
 ('53900000-0000-4000-8000-000000000001','bridge-one@unc.edu',now()),
 ('53900000-0000-4000-8000-000000000002','bridge-two@unc.edu',now());
update private.notification_feature_gate set enabled=true where singleton;
insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
values ('53900000-0000-4000-8000-000000000001','dm',gen_random_uuid(),gen_random_uuid(),
  'dm_message','53900000-0000-4000-8000-000000000002');
insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
select '53900000-0000-4000-8000-000000000001','friendship',g,g,
 'friend_request','53900000-0000-4000-8000-000000000002' from (select gen_random_uuid() g) s;
select ok(not has_function_privilege('anon','public.get_notification_attention()','EXECUTE'),
 'anonymous summary has no grant');
select ok(not has_function_privilege('anon','public.acknowledge_notification_attention(timestamptz)','EXECUTE'),
 'anonymous acknowledgment has no grant');
select ok(has_function_privilege('authenticated','public.get_notification_attention()','EXECUTE'),
 'authenticated summary is granted');
select ok(has_function_privilege('authenticated','public.acknowledge_notification_attention(timestamptz)','EXECUTE'),
 'authenticated acknowledgment is granted');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53900000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select unread from public.get_notification_attention()),true,
 'owner sees ordinary unread item');
select set_config('bridge.cutoff',(select cutoff::text from public.get_notification_attention()),true);
select is(public.acknowledge_notification_attention(current_setting('bridge.cutoff')::timestamptz),true,
 'owner acknowledges existing items');
select is((select unread from public.get_notification_attention()),false,
 'retained orphan DM does not reappear as unread');
select is(public.acknowledge_notification_attention(current_setting('bridge.cutoff')::timestamptz),true,
 'acknowledgment replay is idempotent');
select throws_ok($$select public.acknowledge_notification_attention(now()+interval '1 day')$$,
 '22023',null,'future acknowledgment denied');
reset role;
select is((select count(*) from private.notification_items where recipient_id=
 '53900000-0000-4000-8000-000000000001' and read_at is null),0::bigint,
 'acknowledgment persisted for owner');
select * from finish();
rollback;
