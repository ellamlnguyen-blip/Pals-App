-- Run after exact migration against the isolated TASK-039B fixture database.
\set ON_ERROR_STOP on
select 1/(case when (select count(*) from private.dm_pairs where generation_id in
 ('49100000-0000-4000-8000-000000000002','49100000-0000-4000-8000-000000000003')
 and state='retired')=2 then 1 else 0 end) as nonfriend_legacy_retired;
select 1/(case when (select state from private.dm_pairs where generation_id=
 '49100000-0000-4000-8000-000000000001')='accepted' then 1 else 0 end) as friend_legacy_preserved;
select 1/(case when (select count(*) from private.dm_messages where generation_id::text like '49100000-%')=3 then 1 else 0 end) as messages_retained;
select 1/(case when (select count(*) from private.dm_retries where generation_id::text like '49100000-%')=3 then 1 else 0 end) as retries_retained;
select 1/(case when (select count(*) from private.notification_items where source_kind='dm' and target_id::text like '49100000-%')=2 then 1 else 0 end) as old_notifications_retained;
select 1/(case when (select count(*) from private.dm_suppression)=0 then 1 else 0 end) as no_new_suppression;
