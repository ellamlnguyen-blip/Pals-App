begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at) values
 ('16000000-0000-4000-8000-000000000001','notification-1@unc.edu',now()),
 ('16000000-0000-4000-8000-000000000002','notification-2@unc.edu',now());
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id::text like '16000000-%';
update public.profiles set real_name='Notification fixture',major='Science',graduation_year=2028,
 bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id::text like '16000000-%';
insert into private.people_preferences(account_id,opted_in)
select id,true from public.accounts where id::text like '16000000-%';
update private.people_feature_gate set enabled=true;
update private.friendship_feature_gate set enabled=true;
update private.dm_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.list_notifications()$$,'42501',null,'notification gate defaults off');
select throws_ok($$select * from public.get_notification_preferences()$$,'42501',null,'preference read gated');
select throws_ok($$select * from private.notification_items$$,'42501',null,'no raw item read');
select throws_ok($$select * from private.notification_preferences$$,'42501',null,'no raw preference read');
select throws_ok($$insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
 values('16000000-0000-4000-8000-000000000001','dm',gen_random_uuid(),gen_random_uuid(),'dm_message',
 '16000000-0000-4000-8000-000000000002')$$,'42501',null,'no forged insert');
select public.create_friend_request('16000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000091');
reset role;
select is((select count(*) from private.notification_items),0::bigint,'disabled gate never creates item');
update private.notification_feature_gate set enabled=true;
set local role authenticated;
select is((select count(*) from public.get_notification_preferences()),4::bigint,'four deterministic defaults');
select ok((select bool_and(enabled) from public.get_notification_preferences()),'all default on');
select throws_ok($$select * from public.list_notifications(p_limit=>25)$$,'22023',null,'page bounded');
select throws_ok($$select * from public.list_notifications(p_after_id=>'16000000-0000-4000-8000-000000000001')$$,
 '22023',null,'cursor requires both parts');
select is(public.set_notification_preference('social_requests',false),false,'owner mutes social');
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.accept_friend_request('16000000-0000-4000-8000-000000000001',
 (select generation_id from public.get_friendship('16000000-0000-4000-8000-000000000001')));
select public.unfriend('16000000-0000-4000-8000-000000000001',
 (select generation_id from public.get_friendship('16000000-0000-4000-8000-000000000001')));
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_friend_request('16000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000092');
reset role;
select is((select count(*) from private.notification_items),1::bigint,'mute suppresses recipient A acceptance while request to B remains');
set local role authenticated;
select is(public.set_notification_preference('social_requests',true),true,'owner unmutes social');
-- The second pending pair is cancelled, then the reverse direction creates an item.
select public.cancel_friend_request('16000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_friendship('16000000-0000-4000-8000-000000000002')));
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.create_friend_request('16000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000093');
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select event_code from public.list_notifications() limit 1),'friend_request','incoming request visible');
select is((select actor_id from public.list_notifications() limit 1),'16000000-0000-4000-8000-000000000002'::uuid,
 'incoming actor is current peer');
select ok(public.mark_notification_read((select notification_id from public.list_notifications() limit 1)),'owner mark read');
select ok((select read_at is not null from public.list_notifications() limit 1),'read timestamp set');
select is(public.mark_notification_read('16000000-0000-4000-8000-0000000000ff'),false,'missing item neutral');
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.list_notifications()),1::bigint,'owner sees only own two retained items');
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.accept_friend_request('16000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_friendship('16000000-0000-4000-8000-000000000002')));
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select event_code from public.list_notifications() limit 1),'friend_accepted','requester sees acceptance');
select public.unfriend('16000000-0000-4000-8000-000000000001',
 (select generation_id from public.get_friendship('16000000-0000-4000-8000-000000000001')));
select is((select label from public.list_notifications() limit 1),'Unavailable','teardown neutralizes old item');
select is((select actor_id from public.list_notifications() limit 1),null::uuid,'teardown hides peer ID');
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.create_friend_request('16000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000094');
reset role;
select is((select count(*) from private.notification_items where event_code='friend_request'),3::bigint,
 'later generation distinct from retained first request');
-- DM request, atomic first reply, and later send.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_dm_request('16000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000095','First');
select is(public.create_dm_request('16000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000095','First'),
 (select generation_id from public.get_dm_status('16000000-0000-4000-8000-000000000002')),'DM exact retry stable');
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select event_code from public.list_notifications() limit 1),'dm_request','DM incoming request');
select public.transition_dm('16000000-0000-4000-8000-000000000001',
 (select generation_id from public.get_dm_status('16000000-0000-4000-8000-000000000001')),
 'reply','16000000-0000-4000-8000-000000000096','Reply');
reset role;
select is((select count(*) from private.notification_items where event_code='dm_message'),0::bigint,
 'atomic first reply only creates acceptance item');
select is((select count(*) from private.notification_items where event_code='dm_accepted'),1::bigint,
 'one acceptance item');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.send_dm_message('16000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('16000000-0000-4000-8000-000000000002')),
 '16000000-0000-4000-8000-000000000097','Later');
reset role;
select is((select count(*) from private.notification_items where event_code='dm_message'),1::bigint,'later message one item');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.send_dm_message('16000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('16000000-0000-4000-8000-000000000002')),
 '16000000-0000-4000-8000-000000000097','Later');
reset role;
select is((select count(*) from private.notification_items where event_code='dm_message'),1::bigint,'exact send retry creates no second item');
update private.people_preferences set opted_in=false where account_id='16000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok((select bool_and(label='Unavailable' and actor_id is null and target_id is null)
 from public.list_notifications() where source_kind is null), 'opt-out neutralizes revoked sources');
reset role;
update private.people_preferences set opted_in=true where account_id='16000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.transition_dm('16000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('16000000-0000-4000-8000-000000000002')),'close');
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.create_dm_request('16000000-0000-4000-8000-000000000001',
 '16000000-0000-4000-8000-000000000098','Reverse request');
select set_config('request.jwt.claims','{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.transition_dm('16000000-0000-4000-8000-000000000002',
 (select generation_id from public.get_dm_status('16000000-0000-4000-8000-000000000002')),'accept');
reset role;
select is((select count(*) from private.notification_items where event_code='dm_accepted'),2::bigint,
 'explicit acceptance creates second generation acceptance item');
update private.notification_feature_gate set enabled=false;
select * from finish();
rollback;
