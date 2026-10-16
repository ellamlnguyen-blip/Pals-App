-- TASK-039B: run after the legacy retirement fixture and exact migration.
\set ON_ERROR_STOP on
begin;
insert into private.pilot_availability(singleton,enabled,revision) values(true,true,1)
 on conflict(singleton) do update set enabled=true;
insert into private.pilot_capabilities(key,enabled,revision) values
 ('onboarding',true,1),('people',true,1),('friendship',true,1),('dm',true,1),('notifications',true,1)
 on conflict(key) do update set enabled=true;
insert into private.people_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
insert into private.friendship_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
insert into private.dm_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
insert into private.notification_feature_gate values(true,true) on conflict(singleton) do update set enabled=true;
update public.profiles set real_name='Synthetic Student',major='Biology',graduation_year=2028,bio='Legacy fixture'
 where user_id::text like '39100000-%';
insert into private.people_preferences(account_id,opted_in)
 select id,true from public.accounts where id::text like '39100000-%' on conflict(account_id) do update set opted_in=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39100000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select 1/(case when (select count(*) from public.list_notifications() where label='Unavailable' and event_code is null)=1 then 1 else 0 end) as retired_request_neutral;
select 1/(case when not (select unread from public.get_notification_attention()) then 1 else 0 end) as retired_request_attention_quiet;
select 1/(case when (select count(*) from public.get_dm_status('39100000-0000-4000-8000-000000000001'))=0 then 1 else 0 end) as retired_request_status_hidden;
rollback;
