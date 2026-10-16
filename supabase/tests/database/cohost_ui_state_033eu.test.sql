-- TASK-033EU. Run only after 00600 on the named disposable database.
-- All synthetic source and identity rows roll back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts','notifications');
update private.hangout_feature_gate set enabled=true where singleton;
update private.notification_feature_gate set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('533f0000-0000-4000-8000-000000000001','cohost033eu-1@unc.edu',now()),
 ('533f0000-0000-4000-8000-000000000002','cohost033eu-2@unc.edu',now()),
 ('533f0000-0000-4000-8000-000000000003','cohost033eu-3@unc.edu',now());
create function pg_temp.hid() returns uuid language sql as $$select current_setting('cohost033eu.hid')::uuid$$;
create function pg_temp.iid() returns uuid language sql as $$select current_setting('cohost033eu.iid')::uuid$$;
create function pg_temp.rev() returns bigint language sql as $$select revision from public.hangouts where id=pg_temp.hid()$$;
select ok(not has_table_privilege('authenticated','private.cohost_invitations','SELECT'),
 'recipient reader does not grant raw invitation access');
set local role anon;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.get_own_cohost_invitation(gen_random_uuid())$$,
 '42501',null,'anonymous reader denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033eu.hid',public.create_hangout('533f0000-0000-4000-8001-000000000001',
 'UI state fixture',now()+interval '2 hours','Campus area',35,-79)::text,true);
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033eu.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533f0000-0000-4000-8000-000000000002','533f0000-0000-4000-8002-000000000001',pg_temp.rev()))::text,true);
select throws_ok($$select * from public.get_own_cohost_invitation(pg_temp.iid())$$,
 '42501',null,'host cannot use recipient reader');
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select * from public.get_own_cohost_invitation(pg_temp.iid())$$,
 '42501',null,'joined peer cannot forge recipient invitation ID');
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select invitation_id from public.get_own_cohost_invitation(pg_temp.iid())),pg_temp.iid(),
 'recipient reads exact own invitation ID');
select is((select hangout_id from public.get_own_cohost_invitation(pg_temp.iid())),pg_temp.hid(),
 'recipient reads only current published source ID');
select is((select state from public.get_own_cohost_invitation(pg_temp.iid())),'pending',
 'recipient sees pending without gaining co-host role');
select is((select revision from public.get_own_cohost_invitation(pg_temp.iid())),pg_temp.rev(),
 'reader supplies current expected revision for viewed source');
select is((select count(*) from public.get_own_cohost_invitation(pg_temp.iid())),1::bigint,
 'reader returns one exact row');
select is(public.respond_hangout_cohost_invitation(pg_temp.iid(),false,pg_temp.rev()),pg_temp.rev(),
 'decline advances revision');
select is((select state from public.get_own_cohost_invitation(pg_temp.iid())),'declined',
 'recipient may confirm terminal decline without replay');
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033eu.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533f0000-0000-4000-8000-000000000002','533f0000-0000-4000-8002-000000000002',pg_temp.rev()))::text,true);
reset role;
update private.hangout_feature_gate set enabled=false where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.get_own_cohost_invitation(pg_temp.iid())$$,
 '42501',null,'source gate denial masks invitation');
reset role;
update private.hangout_feature_gate set enabled=true where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select state from public.get_own_cohost_invitation(pg_temp.iid())),'unavailable',
 'gate terminalizes pending invitation, never reopens on restoration');
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.cancel_hangout(pg_temp.hid(),pg_temp.rev()),pg_temp.rev(),
 'host cancellation advances source revision');
select set_config('request.jwt.claims','{"sub":"533f0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.get_own_cohost_invitation(pg_temp.iid())$$,
 '42501',null,'cancelled source masks recipient invitation state');
reset role;
select * from finish();
rollback;
