begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

-- Synthetic accounts and source are confined to this rollback transaction.
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts');
update private.hangout_feature_gate set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('533e7000-0000-4000-8000-000000000001','cohost-trigger-probe@unc.edu',null);
select ok(exists(select 1 from public.accounts where id='533e7000-0000-4000-8000-000000000001')
 and exists(select 1 from public.profiles where user_id='533e7000-0000-4000-8000-000000000001'),
 'new Auth user receives ordinary account and profile');
update auth.users set email_confirmed_at=clock_timestamp()
 where id='533e7000-0000-4000-8000-000000000001';
select ok(exists(select 1 from public.university_memberships
 where user_id='533e7000-0000-4000-8000-000000000001' and verified_at is not null),
 'ordinary Auth email confirmation writes membership without trigger error');

insert into auth.users(id,email,email_confirmed_at) values
 ('533e7000-0000-4000-8000-000000000002','cohost-trigger-host@unc.edu',clock_timestamp()),
 ('533e7000-0000-4000-8000-000000000003','cohost-trigger-target@unc.edu',clock_timestamp());
insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude)
 values ('533e7000-0000-4000-8001-000000000001',
 '00000000-0000-4000-8000-000000000001','533e7000-0000-4000-8000-000000000002',
 'Trigger fixture',clock_timestamp()+interval '2 hours','Campus area',35,-79);
insert into public.hangout_participants(hangout_id,account_id,state) values
 ('533e7000-0000-4000-8001-000000000001','533e7000-0000-4000-8000-000000000002','joined'),
 ('533e7000-0000-4000-8001-000000000001','533e7000-0000-4000-8000-000000000003','joined');
insert into private.cohost_invitations(id,hangout_id,host_id,recipient_id,request_id) values
 ('533e7000-0000-4000-8002-000000000001','533e7000-0000-4000-8001-000000000001',
  '533e7000-0000-4000-8000-000000000002','533e7000-0000-4000-8000-000000000003',gen_random_uuid());
update auth.users set email_confirmed_at=clock_timestamp()
 where id='533e7000-0000-4000-8000-000000000003';
select is((select state from private.cohost_invitations where id='533e7000-0000-4000-8002-000000000001'),
 'pending','still-eligible Auth timestamp update preserves pending invitation');
update auth.users set email='cohost-trigger-target@example.edu'
 where id='533e7000-0000-4000-8000-000000000003';
select is((select state from private.cohost_invitations where id='533e7000-0000-4000-8002-000000000001'),
 'unavailable','Auth email domain loss terminalizes pending invitation');
update auth.users set email='cohost-trigger-target@unc.edu'
 where id='533e7000-0000-4000-8000-000000000003';
select is((select state from private.cohost_invitations where id='533e7000-0000-4000-8002-000000000001'),
 'unavailable','restored Auth email cannot revive invitation');

insert into private.cohost_invitations(id,hangout_id,host_id,recipient_id,request_id) values
 ('533e7000-0000-4000-8002-000000000002','533e7000-0000-4000-8001-000000000001',
  '533e7000-0000-4000-8000-000000000002','533e7000-0000-4000-8000-000000000003',gen_random_uuid());
update public.university_memberships set verified_at=null,verification_email=null
 where user_id='533e7000-0000-4000-8000-000000000003';
select is((select state from private.cohost_invitations where id='533e7000-0000-4000-8002-000000000002'),
 'unavailable','membership readiness loss terminalizes invitation');
update public.university_memberships set verified_at=clock_timestamp(),
 verification_email='cohost-trigger-target@unc.edu'
 where user_id='533e7000-0000-4000-8000-000000000003';
select is((select state from private.cohost_invitations where id='533e7000-0000-4000-8002-000000000002'),
 'unavailable','restored membership cannot revive invitation');

insert into private.cohost_invitations(id,hangout_id,host_id,recipient_id,request_id) values
 ('533e7000-0000-4000-8002-000000000003','533e7000-0000-4000-8001-000000000001',
  '533e7000-0000-4000-8000-000000000002','533e7000-0000-4000-8000-000000000003',gen_random_uuid());
update public.accounts set status='suspended'
 where id='533e7000-0000-4000-8000-000000000003';
select is((select state from private.cohost_invitations where id='533e7000-0000-4000-8002-000000000003'),
 'unavailable','target account suspension terminalizes invitation');
update public.accounts set status='active'
 where id='533e7000-0000-4000-8000-000000000003';
select is((select state from private.cohost_invitations where id='533e7000-0000-4000-8002-000000000003'),
 'unavailable','restored account cannot revive invitation');
insert into private.cohost_invitations(id,hangout_id,host_id,recipient_id,request_id) values
 ('533e7000-0000-4000-8002-000000000004','533e7000-0000-4000-8001-000000000001',
  '533e7000-0000-4000-8000-000000000002','533e7000-0000-4000-8000-000000000003',gen_random_uuid());
update public.accounts set status='suspended'
 where id='533e7000-0000-4000-8000-000000000002';
select is((select state from private.cohost_invitations where id='533e7000-0000-4000-8002-000000000004'),
 'unavailable','host account suspension terminalizes invitation');
select * from finish();
rollback;
