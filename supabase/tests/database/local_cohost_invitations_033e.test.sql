begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts','people','notifications');
update private.hangout_feature_gate set enabled=true where singleton;
update private.notification_feature_gate set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('533e0000-0000-4000-8000-000000000001','cohost033e-1@unc.edu',now()),
 ('533e0000-0000-4000-8000-000000000002','cohost033e-2@unc.edu',now()),
 ('533e0000-0000-4000-8000-000000000003','cohost033e-3@unc.edu',now());
create function pg_temp.hid() returns uuid language sql as $$select current_setting('cohost033e.hid')::uuid$$;
create function pg_temp.iid() returns uuid language sql as $$select current_setting('cohost033e.iid')::uuid$$;
create function pg_temp.rev() returns bigint language sql as $$select revision from public.hangouts where id=pg_temp.hid()$$;
select ok(not has_table_privilege('authenticated','private.cohost_invitations','SELECT')
 and not has_table_privilege('authenticated','private.cohost_invitations','INSERT'),
 'invitation ledger has no client table grant');
select ok(not has_function_privilege('authenticated','public.promote_hangout_cohost(uuid,uuid,bigint)','EXECUTE'),
 'legacy promotion cannot bypass consent');
set local role anon;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select * from public.invite_hangout_cohost(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),1)$$,
 '42501',null,'anonymous cannot invite');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033e.hid',public.create_hangout('533e0000-0000-4000-8001-000000000001',
 'Invitation fixture',now()+interval '2 hours','Campus area',35,-79)::text,true);
select throws_ok($$select * from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000002',gen_random_uuid(),pg_temp.rev())$$,
 '42501',null,'host cannot invite a nonmember');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select throws_ok($$select * from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000002',gen_random_uuid(),pg_temp.rev())$$,
 '42501',null,'ordinary member cannot invite');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033e.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000002','533e0000-0000-4000-8002-000000000001',pg_temp.rev()))::text,true);
reset role;
select is((select count(*) from private.hangout_cohosts where hangout_id=pg_temp.hid()
 and account_id='533e0000-0000-4000-8000-000000000002'),0::bigint,'pending invitation has no authority');
select is((select count(*) from private.notification_items where source_id=pg_temp.iid()
 and event_code='cohost_invitation'),1::bigint,'one target item per real invite');
set local role authenticated;
select is((select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000002','533e0000-0000-4000-8002-000000000001',pg_temp.rev())),
 pg_temp.iid(),'exact host retry returns same invitation');
select throws_ok($$select * from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003','533e0000-0000-4000-8002-000000000001',pg_temp.rev())$$,
 '23505',null,'request key cannot change recipient');
select throws_ok($$select * from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000002',gen_random_uuid(),pg_temp.rev())$$,
 '23505',null,'duplicate pending invitation denied');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'forged recipient denied');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev()),
 pg_temp.rev(),'acceptance increments revision atomically');
reset role;
select is((select count(*) from private.hangout_cohosts where hangout_id=pg_temp.hid()
 and account_id='533e0000-0000-4000-8000-000000000002'),1::bigint,'accepted target has assignment');
set local role authenticated;
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'terminal acceptance cannot replay');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select state from public.list_hangout_cohost_invitations(pg_temp.hid()) where invitation_id=pg_temp.iid()),
 'accepted','host status sees accepted');
select throws_ok($$select public.promote_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003',pg_temp.rev())$$,
 '42501',null,'legacy direct promote executable path denied');
select set_config('cohost033e.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003','533e0000-0000-4000-8002-000000000002',pg_temp.rev()))::text,true);
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is(public.respond_hangout_cohost_invitation(pg_temp.iid(),false,pg_temp.rev()),
 pg_temp.rev(),'decline consumes invitation');
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'declined invitation cannot become authority');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033e.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003','533e0000-0000-4000-8002-000000000003',pg_temp.rev()))::text,true);
select is(public.withdraw_hangout_cohost_invitation(pg_temp.iid(),pg_temp.rev()),
 pg_temp.rev(),'host withdrawal consumes invitation');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'withdrawn invitation cannot be accepted');
select ok(exists(select 1 from public.list_notifications() where label='Unavailable'),
 'withdrawn invitation notification projects neutral');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033e.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003','533e0000-0000-4000-8002-000000000004',pg_temp.rev()))::text,true);
reset role;
update private.hangout_feature_gate set enabled=false where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.list_hangout_cohost_invitations(pg_temp.hid())$$,
 '42501',null,'host status denied while Hangout gate disabled');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'recipient response denied while Hangout gate disabled');
reset role;
select is((select state from private.cohost_invitations where id=pg_temp.iid()),'unavailable',
 'source gate disable terminalizes pending invitation');
update private.hangout_feature_gate set enabled=true where singleton;
set local role authenticated;
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'gate restoration does not revive invitation');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033e.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003','533e0000-0000-4000-8002-000000000005',pg_temp.rev()))::text,true);
reset role;
update private.pilot_capabilities set enabled=false where key='hangouts';
set local role authenticated;
select throws_ok($$select * from public.list_hangout_cohost_invitations(pg_temp.hid())$$,
 '42501',null,'host status denied while Hangout capability disabled');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'recipient response denied while Hangout capability disabled');
reset role;
update private.pilot_capabilities set enabled=true where key='hangouts';
select is((select state from private.cohost_invitations where id=pg_temp.iid()),'unavailable',
 'capability restoration does not revive invitation');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033e.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003','533e0000-0000-4000-8002-000000000006',pg_temp.rev()))::text,true);
reset role;
update public.universities set allowed_email_domains=array['example.edu'] where slug='unc-chapel-hill';
select is((select state from private.cohost_invitations where id=pg_temp.iid()),'unavailable',
 'campus domain loss terminalizes invitation');
update public.universities set allowed_email_domains=array['unc.edu'] where slug='unc-chapel-hill';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'domain restoration does not revive invitation');
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('cohost033e.iid',(select invitation_id from public.invite_hangout_cohost(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003','533e0000-0000-4000-8002-000000000007',pg_temp.rev()))::text,true);
select is(public.remove_hangout_participant(pg_temp.hid(),
 '533e0000-0000-4000-8000-000000000003',pg_temp.rev()),pg_temp.rev(),
 'host removal advances source revision');
reset role;
select is((select state from private.cohost_invitations where id=pg_temp.iid()),'unavailable',
 'host removal terminally invalidates invitation');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533e0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.respond_hangout_cohost_invitation(pg_temp.iid(),true,pg_temp.rev())$$,
 '42501',null,'removed target cannot accept retained invitation');
select * from finish();
rollback;
