begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

select is((select enabled from private.pilot_availability where singleton),false,
 'launch availability remains closed');
select is((select enabled from private.moderation_feature_gate where singleton),false,
 'moderation remains closed');
select ok((select bool_and(not enabled) from private.pilot_capabilities),
 'capabilities remain closed');

insert into auth.users(id,email,email_confirmed_at) values
 ('62710000-0000-4000-8000-000000000001','role-owner@unc.edu',now()),
 ('62710000-0000-4000-8000-000000000002','role-peer@unc.edu',now()),
 ('62710000-0000-4000-8000-000000000003','role-unconfirmed@unc.edu',null),
 ('62710000-0000-4000-8000-000000000004','role-external@example.edu',now()),
 ('62710000-0000-4000-8000-000000000005','role-stale@unc.edu',now()),
 ('62710000-0000-4000-8000-000000000006','role-suspended@unc.edu',now()),
 ('62710000-0000-4000-8000-000000000007','role-banned@unc.edu',now());
insert into public.platform_roles(user_id,role)
select id,'moderator' from auth.users where id::text like '62710000-%';
update public.university_memberships set verification_email='old@unc.edu'
 where user_id='62710000-0000-4000-8000-000000000005';
update public.accounts set status='suspended'
 where id='62710000-0000-4000-8000-000000000006';
update public.accounts set status='banned'
 where id='62710000-0000-4000-8000-000000000007';

set local role anon;
select throws_ok($$select * from public.platform_roles$$,'42501',null,
 'anonymous cannot read operator roles');
select throws_ok($$select private.prelaunch_operator_eligible()$$,'42501',null,
 'anonymous cannot call eligibility helper');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"62710000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*) from public.platform_roles),1::bigint,
 'eligible UNC operator reads exactly their own role with launch closed');
select is((select role from public.platform_roles),'moderator',
 'own role label is readable');
select is((select count(*) from public.platform_roles
 where user_id='62710000-0000-4000-8000-000000000002'),0::bigint,
 'other operator role remains hidden');
select is((select count(*) from public.university_memberships),0::bigint,
 'role permission does not open membership read');
select throws_ok($$insert into public.platform_roles(user_id,role)
 values(auth.uid(),'admin')$$,'42501',null,'client role insert denied');
select throws_ok($$update public.platform_roles set role='admin'$$,
 '42501',null,'client role update denied');
select throws_ok($$delete from public.platform_roles$$,
 '42501',null,'client role delete denied');
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','AAL1 report read denied with launch closed');
select throws_ok($$select * from public.get_moderation_report(
 '62710000-0000-4000-8000-000000000010')$$,
 '42501','Moderation unavailable','AAL1 report detail denied');
select throws_ok($$select * from public.transition_moderation_case(
 '62710000-0000-4000-8000-000000000010',
 '62710000-0000-4000-8000-000000000011',0,'start_review')$$,
 '42501','Moderation unavailable','AAL1 case transition denied');
select throws_ok($$select * from public.apply_account_moderation_action(
 '62710000-0000-4000-8000-000000000010',
 '62710000-0000-4000-8000-000000000012',1,'suspend','Cause')$$,
 '42501','Moderation unavailable','AAL1 account action denied');
select throws_ok($$select * from public.apply_hangout_moderation_action(
 '62710000-0000-4000-8000-000000000010',
 '62710000-0000-4000-8000-000000000013',1,'Cause')$$,
 '42501','Moderation unavailable','AAL1 Hangout action denied');
select set_config('request.jwt.claims',
 '{"sub":"62710000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501','Moderation unavailable','AAL2 without session denied while gate closed');

select set_config('request.jwt.claims',
 '{"sub":"62710000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.platform_roles),0::bigint,'unconfirmed denied');
select set_config('request.jwt.claims',
 '{"sub":"62710000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*) from public.platform_roles),0::bigint,'non-UNC denied');
select set_config('request.jwt.claims',
 '{"sub":"62710000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select is((select count(*) from public.platform_roles),0::bigint,'stale membership email denied');
select set_config('request.jwt.claims',
 '{"sub":"62710000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select is((select count(*) from public.platform_roles),0::bigint,'suspended denied');
select set_config('request.jwt.claims',
 '{"sub":"62710000-0000-4000-8000-000000000007","role":"authenticated"}',true);
select is((select count(*) from public.platform_roles),0::bigint,'banned denied');
reset role;

update public.universities set active=false where slug='unc-chapel-hill';
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"62710000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.platform_roles),0::bigint,'inactive UNC campus denied');
reset role;
update public.universities set active=true where slug='unc-chapel-hill';
insert into public.universities(id,slug,name,active,allowed_email_domains)
 values('62710000-0000-4000-8000-000000000020','other-campus','Other campus',true,
 array['unc.edu']);
update public.university_memberships set university_id='62710000-0000-4000-8000-000000000020'
 where user_id='62710000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from public.platform_roles),0::bigint,
 'active non-UNC campus with allowlisted domain denied');
reset role;
update public.university_memberships set university_id='00000000-0000-4000-8000-000000000001'
 where user_id='62710000-0000-4000-8000-000000000001';
update auth.users set email='role-owner@example.edu'
 where id='62710000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from public.platform_roles),0::bigint,
 'live Auth email loss revokes own role read');
reset role;

select * from finish();
rollback;
