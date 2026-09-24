begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at) values
 ('53100000-0000-4000-8000-000000000001','b1-moderator@unc.edu',now()),
 ('53100000-0000-4000-8000-000000000002','b1-admin@unc.edu',now()),
 ('53100000-0000-4000-8000-000000000003','b1-reporter@unc.edu',now()),
 ('53100000-0000-4000-8000-000000000004','b1-target@unc.edu',now());
insert into public.platform_roles(user_id,role) values
 ('53100000-0000-4000-8000-000000000001','moderator'),
 ('53100000-0000-4000-8000-000000000002','admin');
insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
 provenance_kind,provenance_ref_id) values
 ('53100000-0000-4000-8002-000000000001','53100000-0000-4000-8000-000000000003',
 'user','53100000-0000-4000-8000-000000000004','harassment',
 'current_people','53100000-0000-4000-8000-000000000004'),
 ('53100000-0000-4000-8002-000000000002','53100000-0000-4000-8000-000000000003',
 'user','53100000-0000-4000-8000-000000000004','harassment',
 'current_people','53100000-0000-4000-8000-000000000004');
select is((select enabled from private.moderation_feature_gate where singleton),false,
 'moderation gate defaults off');
select ok((select relrowsecurity from pg_class where oid='private.account_sanctions'::regclass),
 'sanctions have RLS');
select ok(not has_table_privilege('authenticated','private.account_sanctions','SELECT'),
 'no client sanction table reader');
select ok(not has_table_privilege('service_role','private.account_sanctions','SELECT'),
 'service role has no raw sanction table reader');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53100000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.apply_account_moderation_action(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000001',1,'suspend','Cause')$$,
 '42501',null,'gate-off enforcement denied');
select throws_ok($$select * from private.account_sanctions$$,
 '42501',null,'raw sanction read denied');
reset role;
update private.moderation_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53100000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select revision from public.transition_moderation_case(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000010',0,'start_review')),1::bigint,
 'Stage A starts exact case');
select throws_ok($$select * from public.apply_account_moderation_action(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000011',1,'ban','Cause')$$,
 '42501',null,'moderator cannot ban');
select throws_ok($$select * from public.apply_account_moderation_action(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000010',1,'suspend','Cause')$$,
 '42501',null,'Stage A request UUID cannot become enforcement');
select throws_ok($$select * from public.apply_account_moderation_action(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000011',0,'suspend','Cause')$$,
 '42501',null,'stale revision denied');
select is((select account_status from public.apply_account_moderation_action(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000011',1,'suspend','  Cause  ')),
 'suspended','moderator suspends active exact target');
select is((select revision from public.apply_account_moderation_action(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000011',1,'suspend','Cause')),2::bigint,
 'normalized exact replay returns original revision');
select throws_ok($$select * from public.apply_account_moderation_action(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000011',1,'suspend','Changed')$$,
 '42501',null,'changed-payload replay denied');
select throws_ok($$select * from public.transition_moderation_case(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000011',2,'reopen','Later')$$,
 '42501',null,'enforcement request UUID cannot become Stage A transition');
reset role;
select is((select status from public.accounts where id=
 '53100000-0000-4000-8000-000000000004'),'suspended',
 'account status changed in transaction');
select is((select disposition from private.moderation_cases where report_id=
 '53100000-0000-4000-8002-000000000001'),'action_taken',
 'case closed with action_taken');
select ok((select sanction_id is not null from private.moderation_cases where report_id=
 '53100000-0000-4000-8002-000000000001'),'case links committed sanction');
select is((select reason from private.account_sanctions where report_id=
 '53100000-0000-4000-8002-000000000001'),'Cause','sanction stores trimmed reason');
select is((select count(*) from private.moderation_audit where sanction_id is not null),
 1::bigint,'one enforcement audit, no duplicate on replay');
select is((select previous_account_status||'>'||new_account_status
 from private.moderation_audit where sanction_id is not null),'active>suspended',
 'audit records exact account status transition');
insert into private.notification_items(id,recipient_id,source_kind,source_id,
 target_id,event_code,actor_id) values
 ('53100000-0000-4000-8006-000000000001',
 '53100000-0000-4000-8000-000000000004','friendship',
 '53100000-0000-4000-8007-000000000001',
 '53100000-0000-4000-8007-000000000001','friend_request',
 '53100000-0000-4000-8000-000000000003');
update private.notification_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53100000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.mark_notification_read(
 '53100000-0000-4000-8006-000000000001')$$,
 '42501',null,'sanctioned owner cannot mark retained notification read');
reset role;
select ok((select read_at is null from private.notification_items where id=
 '53100000-0000-4000-8006-000000000001'),
 'failed read marker leaves retained item unchanged');
update private.notification_feature_gate set enabled=false;
select throws_ok($$delete from private.safety_reports where id=
 '53100000-0000-4000-8002-000000000001'$$,
 '23503',null,'report deletion cannot erase sanction');
select throws_ok($$delete from public.accounts where id=
 '53100000-0000-4000-8000-000000000004'$$,
 '23503',null,'account deletion cannot erase sanction');
select throws_ok($$delete from private.account_sanctions where report_id=
 '53100000-0000-4000-8002-000000000001'$$,
 '42501',null,'sanction is immutable');
select throws_ok($$delete from private.moderation_audit where sanction_id is not null$$,
 '42501',null,'enforcement audit is immutable');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"53100000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select revision from public.transition_moderation_case(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000012',2,'reopen','New evidence')),3::bigint,
 'reopening follows Stage A revision behavior');
reset role;
select ok((select sanction_id is null from private.moderation_cases where report_id=
 '53100000-0000-4000-8002-000000000001'),'reopen clears current sanction link');
select is((select count(*) from private.account_sanctions),1::bigint,
 'reopen retains historical sanction');
select is((select status from public.accounts where id=
 '53100000-0000-4000-8000-000000000004'),'suspended',
 'reopen never reverses status');
set local role authenticated;
select is((select revision from public.transition_moderation_case(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000013',3,'annotate','Reviewed')),4::bigint,
 'reopened case can be reviewed');
select set_config('request.jwt.claims',
 '{"sub":"53100000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select account_status from public.apply_account_moderation_action(
 '53100000-0000-4000-8002-000000000001',
 '53100000-0000-4000-8003-000000000014',4,'reinstate','Review complete')),
 'active','admin reinstates suspended target');
reset role;
select is((select status from public.accounts where id=
 '53100000-0000-4000-8000-000000000004'),'active',
 'reinstatement changes only account status');
select * from finish();
rollback;
