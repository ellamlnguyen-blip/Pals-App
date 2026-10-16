-- TASK-039B: run only against isolated pals_task039b; transaction rolls back fixture.
\set ON_ERROR_STOP on
begin;
insert into public.universities(id,slug,name,active) values
 ('00000000-0000-4000-8000-000000000001','unc-chapel-hill','UNC',true) on conflict(id) do nothing;
update public.universities set allowed_email_domains=array['unc.edu'] where slug='unc-chapel-hill';
insert into private.pilot_availability(singleton,enabled,revision) values(true,true,1) on conflict(singleton) do update set enabled=true;
insert into private.pilot_capabilities(key,enabled,revision) values
 ('onboarding',true,1),('people',true,1),('friendship',true,1),('dm',true,1),('notifications',true,1) on conflict(key) do update set enabled=true;
insert into private.people_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
insert into private.friendship_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
insert into private.dm_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
insert into private.notification_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
insert into private.safety_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
insert into auth.users(id,email,email_confirmed_at)
select ('39000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'task039b-'||n||'@unc.edu',now() from generate_series(1,3) n;
update public.profiles set real_name='Synthetic Student',major='Biology',graduation_year=2028,
 bio='TASK-039B disposable fixture' where user_id::text like '39000000-%';
insert into private.people_preferences(account_id,opted_in)
 select id,true from public.accounts where id::text like '39000000-%';
insert into private.friendships(low_id,high_id,requester_id,campus_id,state) values
 ('39000000-0000-4000-8000-000000000001','39000000-0000-4000-8000-000000000002',
  '39000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','accepted');
insert into private.friendships(low_id,high_id,requester_id,campus_id,state) values
 ('39000000-0000-4000-8000-000000000001','39000000-0000-4000-8000-000000000003',
 '39000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','pending');
select generation_id as declined_generation from private.friendships where low_id='39000000-0000-4000-8000-000000000001'
 and high_id='39000000-0000-4000-8000-000000000003' \gset
update private.notification_items set read_at=now() where event_code='friend_request';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select generation_id as friend_generation from public.send_friend_dm_message(
 '39000000-0000-4000-8000-000000000002','39000000-0000-4000-8000-000000000011','first friend text') \gset
select 1/(case when (select count(*) from public.read_dm_messages(
 '39000000-0000-4000-8000-000000000002',:'friend_generation'))=1 then 1 else 0 end) as friend_body_count;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.decline_friend_request('39000000-0000-4000-8000-000000000001',:'declined_generation') as decline_succeeded;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select 1/(case when (select count(*) from public.get_dm_status('39000000-0000-4000-8000-000000000003'))=0 then 1 else 0 end) as no_nonfriend_status;
select 1/(case when (select count(*) from public.list_dm_inbox())=1 then 1 else 0 end) as inbox_only_friend;
select 1/(case when (select count(*) from public.get_dm_consent_ui_state('39000000-0000-4000-8000-000000000002') where can_allow_dm)=0 then 1 else 0 end) as old_allow_control_denied;
do $$ begin
 begin perform public.create_dm_request('39000000-0000-4000-8000-000000000003',gen_random_uuid(),'request');
  raise exception 'legacy request unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.accept_friend_dm_consent('39000000-0000-4000-8000-000000000002',gen_random_uuid());
  raise exception 'legacy consent unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.transition_dm('39000000-0000-4000-8000-000000000002',gen_random_uuid(),'accept');
  raise exception 'legacy accept unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.send_friend_dm_message('39000000-0000-4000-8000-000000000003',gen_random_uuid(),'nonfriend');
  raise exception 'nonfriend send unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
select 1/(case when jsonb_array_length(public.list_my_chat_attention(null,24)->'items')=1 then 1 else 0 end) as attention_friend_only;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select 1/(case when (select count(*) from public.list_notifications() where event_code='dm_message')=1 then 1 else 0 end) as friend_message_notification;
select 1/(case when (select unread from public.get_notification_attention()) then 1 else 0 end) as friend_notification_attention;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.transition_dm('39000000-0000-4000-8000-000000000002',:'friend_generation','close') as close_succeeded;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select 1/(case when (select count(*) from public.list_notifications() where label='Unavailable' and event_code is null)>=1 then 1 else 0 end) as closed_notification_neutral;
select 1/(case when not (select unread from public.get_notification_attention()) then 1 else 0 end) as closed_attention_quiet;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select 1/(case when (select count(*) from public.read_dm_messages('39000000-0000-4000-8000-000000000002',:'friend_generation'))=0 then 1 else 0 end) as closed_history_hidden;
do $$ begin
 begin perform public.send_friend_dm_message('39000000-0000-4000-8000-000000000002',
  '39000000-0000-4000-8000-000000000011','first friend text');
  raise exception 'closed retry unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
select generation_id as restart_generation from public.send_friend_dm_message(
 '39000000-0000-4000-8000-000000000002','39000000-0000-4000-8000-000000000012','restart text') \gset
select 1/(case when :'restart_generation'<>:'friend_generation' then 1 else 0 end) as fresh_after_close;
reset role;
select generation_id as friendship_generation from private.friendships where low_id='39000000-0000-4000-8000-000000000001'
 and high_id='39000000-0000-4000-8000-000000000002' \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.unfriend('39000000-0000-4000-8000-000000000002',:'friendship_generation') as unfriend_succeeded;
select 1/(case when (select count(*) from public.read_dm_messages('39000000-0000-4000-8000-000000000002',:'restart_generation'))=0 then 1 else 0 end) as unfriend_history_hidden;
select 1/(case when (select count(*) from public.list_dm_inbox())=0 then 1 else 0 end) as unfriend_inbox_hidden;
do $$ begin
 begin perform public.send_friend_dm_message('39000000-0000-4000-8000-000000000002',
  '39000000-0000-4000-8000-000000000012','restart text');
  raise exception 'unfriend retry unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 1/(case when (select state from private.dm_pairs where generation_id=:'restart_generation')='retired' then 1 else 0 end) as unfriend_terminalized;
insert into private.friendships(low_id,high_id,requester_id,campus_id,state) values
 ('39000000-0000-4000-8000-000000000001','39000000-0000-4000-8000-000000000002',
  '39000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','accepted');
insert into private.dm_suppression(initiator_id,recipient_id) values
 ('39000000-0000-4000-8000-000000000001','39000000-0000-4000-8000-000000000002') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select generation_id as renewed_generation from public.send_friend_dm_message(
 '39000000-0000-4000-8000-000000000002','39000000-0000-4000-8000-000000000013','renewed text') \gset
select 1/(case when :'renewed_generation'<>:'restart_generation' then 1 else 0 end) as fresh_after_refriend;
select 1/(case when (select count(*) from public.read_dm_messages('39000000-0000-4000-8000-000000000002',:'restart_generation'))=0 then 1 else 0 end) as old_history_hidden_after_refriend;
reset role;
update private.people_preferences set opted_in=false where account_id='39000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select 1/(case when (select count(*) from public.read_dm_messages('39000000-0000-4000-8000-000000000002',:'renewed_generation'))=0 then 1 else 0 end) as optout_read_denied;
do $$ begin
 begin perform public.send_friend_dm_message('39000000-0000-4000-8000-000000000002',gen_random_uuid(),'optout');
  raise exception 'optout send unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update private.people_preferences set opted_in=true where account_id='39000000-0000-4000-8000-000000000002';
update private.friendship_feature_gate set enabled=false where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select 1/(case when (select count(*) from public.read_dm_messages('39000000-0000-4000-8000-000000000002',:'renewed_generation'))=0 then 1 else 0 end) as friendship_gate_read_denied;
reset role;
update private.friendship_feature_gate set enabled=true where singleton;
update auth.users set email_confirmed_at=null where id='39000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select 1/(case when (select count(*) from public.read_dm_messages('39000000-0000-4000-8000-000000000002',:'renewed_generation'))=0 then 1 else 0 end) as readiness_read_denied;
reset role;
update auth.users set email_confirmed_at=now() where id='39000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.set_people_block('39000000-0000-4000-8000-000000000002',true) as block_succeeded;
select 1/(case when (select count(*) from public.read_dm_messages('39000000-0000-4000-8000-000000000002',:'renewed_generation'))=0 then 1 else 0 end) as block_read_denied;
reset role;
select 1/(case when (select state from private.dm_pairs where generation_id=:'renewed_generation')='blocked' then 1 else 0 end) as block_terminalized;
update private.dm_feature_gate set enabled=false where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 begin perform public.read_dm_messages('39000000-0000-4000-8000-000000000002',gen_random_uuid());
  raise exception 'gate read unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 1/(case when not has_table_privilege('authenticated','private.dm_pairs','select')
 and not has_table_privilege('authenticated','private.dm_messages','select')
 and not has_table_privilege('authenticated','private.dm_retries','select')
 and not has_function_privilege('authenticated','public.create_dm_request(uuid,uuid,text)','execute')
 and not has_function_privilege('authenticated','public.accept_friend_dm_consent(uuid,uuid)','execute') then 1 else 0 end) as private_grants;
rollback;
