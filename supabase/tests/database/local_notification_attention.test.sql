begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','people','notifications');
insert into auth.users(id,email,email_confirmed_at)
values
 ('53280000-0000-4000-8000-000000000001','attention-1@unc.edu',now()),
 ('53280000-0000-4000-8000-000000000002','attention-2@unc.edu',now());
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '53280000-%';
update public.profiles set real_name='Attention fixture',major='Science',graduation_year=2028,
 bio='Local test',primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '53280000-%';
insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
select '53280000-0000-4000-8000-000000000001','dm',gen_random_uuid(),gen_random_uuid(),
 'dm_message','53280000-0000-4000-8000-000000000002' from generate_series(1,30);
insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
values ('53280000-0000-4000-8000-000000000002','dm',gen_random_uuid(),gen_random_uuid(),
 'dm_message','53280000-0000-4000-8000-000000000001');
update private.notification_feature_gate set enabled=true where singleton;
set local role anon;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_notification_attention()$$,'42501',null,'anonymous summary denied');
select throws_ok($$select public.acknowledge_notification_attention(now())$$,'42501',null,'anonymous ack denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53280000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select unread from public.get_notification_attention()),true,'owner sees unread ledger');
select set_config('attention.cutoff',(select cutoff::text from public.get_notification_attention()),true);
select is(public.acknowledge_notification_attention(current_setting('attention.cutoff')::timestamptz),true,'owner can acknowledge snapshot');
select is((select unread from public.get_notification_attention()),false,'ack covers all pages');
select is(public.acknowledge_notification_attention(current_setting('attention.cutoff')::timestamptz),true,'ack is idempotent');
select throws_ok($$select public.acknowledge_notification_attention(now()+interval '1 day')$$,'22023',null,'future forged boundary rejected');
reset role;
select is((select count(*) from private.notification_items where recipient_id='53280000-0000-4000-8000-000000000001' and read_at is null),0::bigint,'all thirty owner items persisted read');
select is((select count(*) from private.notification_items where recipient_id='53280000-0000-4000-8000-000000000002' and read_at is null),1::bigint,'foreign item untouched');
insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
values ('53280000-0000-4000-8000-000000000001','dm',gen_random_uuid(),gen_random_uuid(),
 'dm_message','53280000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53280000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.acknowledge_notification_attention(current_setting('attention.cutoff')::timestamptz),true,'old cutoff can replay');
select is((select unread from public.get_notification_attention()),true,'post-snapshot arrival stays unread');
reset role;
update private.notification_feature_gate set enabled=false;
set local role authenticated;
select throws_ok($$select * from public.get_notification_attention()$$,'42501',null,'disabled gate denies summary');
select throws_ok($$select public.acknowledge_notification_attention(now())$$,'42501',null,'disabled gate denies ack');
reset role;
update private.notification_feature_gate set enabled=true;
update public.accounts set status='suspended' where id='53280000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select * from public.get_notification_attention()$$,'42501',null,'restricted owner summary denied');
select throws_ok($$select public.acknowledge_notification_attention(now())$$,'42501',null,'restricted owner ack denied');
reset role;
select * from finish();
rollback;
