begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at)
select ('54020000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'cohost-notify-'||n||'@unc.edu',now() from generate_series(1,3) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '54020000-%';
update public.profiles set real_name='Cohost notification',major='Science',
 graduation_year=2028,bio='Local',primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '54020000-%';
update private.hangout_feature_gate set enabled=true;
update private.notification_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost.notice_id',public.create_hangout(
 '54020000-0000-4000-8001-000000000001','Original',now()+interval '1 hour',
 'Area',35,-79)::text,true);
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(current_setting('cohost.notice_id')::uuid);
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.join_hangout(current_setting('cohost.notice_id')::uuid);
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.promote_hangout_cohost(current_setting('cohost.notice_id')::uuid,
 '54020000-0000-4000-8000-000000000002',1),2::bigint,'host assigns cohost');
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.edit_hangout(current_setting('cohost.notice_id')::uuid,2,
 'Cohost edit',(select starts_at from public.hangouts
 where id=current_setting('cohost.notice_id')::uuid),'Area',35,-79),
 3::bigint,'cohost material edit emits existing event');
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select actor_id from public.list_notifications()
 where event_code='hangout_edited'),
 '54020000-0000-4000-8000-000000000002'::uuid,
 'current-ready cohost edit actor visible to joined recipient');
reset role;
update public.profiles set primary_photo_path=null
 where user_id='54020000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select actor_id from public.list_notifications()
 where label='Unavailable'),null::uuid,
 'unready former source ID is hidden');
select is((select count(*) from public.list_notifications()
 where event_code='hangout_edited'),0::bigint,
 'unready actor makes old edit neutral');
reset role;
update public.profiles set primary_photo_path=user_id::text||'/primary.png'
 where user_id='54020000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select actor_id from public.list_notifications()
 where event_code='hangout_edited'),
 '54020000-0000-4000-8000-000000000002'::uuid,
 'ready still-joined source can reappear');
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.leave_hangout(current_setting('cohost.notice_id')::uuid);
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select actor_id from public.list_notifications()
 where label='Unavailable'),null::uuid,
 'departed cohost edit actor ID hidden');
select is((select count(*) from public.list_notifications()
 where event_code='hangout_edited'),0::bigint,
 'departed cohost edit event neutral');
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.edit_hangout(current_setting('cohost.notice_id')::uuid,4,
 'Host edit',(select starts_at from public.hangouts
 where id=current_setting('cohost.notice_id')::uuid),'Area',35,-79),
 5::bigint,'host material edit remains allowed');
select set_config('request.jwt.claims',
 '{"sub":"54020000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select actor_id from public.list_notifications()
 where event_code='hangout_edited'),
 '54020000-0000-4000-8000-000000000001'::uuid,
 'immutable host edit actor remains visible');
select * from finish();
rollback;
