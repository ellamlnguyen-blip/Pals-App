begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at) values
 ('51900000-0000-4000-8000-000000000001','moderation-operator@unc.edu',now()),
 ('51900000-0000-4000-8000-000000000002','moderation-reporter@unc.edu',now()),
 ('51900000-0000-4000-8000-000000000003','moderation-target@unc.edu',now()),
 ('51900000-0000-4000-8000-000000000004','moderation-second@unc.edu',now());
insert into public.platform_roles(user_id,role) values
 ('51900000-0000-4000-8000-000000000001','moderator'),
 ('51900000-0000-4000-8000-000000000004','admin');
insert into private.safety_reports(id,reporter_id,target_type,target_id,category,narrative,
 provenance_kind,provenance_ref_id,submitted_at) values
 ('51900000-0000-4000-8002-000000000001','51900000-0000-4000-8000-000000000002',
  'user','51900000-0000-4000-8000-000000000003','other','Private allegation',
  'current_people','51900000-0000-4000-8000-000000000003','2026-09-24 10:00:00+00'),
 ('51900000-0000-4000-8002-000000000002','51900000-0000-4000-8000-000000000002',
  'user','51900000-0000-4000-8000-000000000003','harassment',null,
  'current_people','51900000-0000-4000-8000-000000000003','2026-09-24 10:00:00+00');
insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
 provenance_kind,provenance_ref_id,submitted_at) values
 ('51900000-0000-4000-8002-000000000000',
  '51900000-0000-4000-8000-000000000001','user',
  '51900000-0000-4000-8000-000000000003','harassment',
  'current_people','51900000-0000-4000-8000-000000000003',
  '2026-09-24 09:00:00+00');
insert into public.hangouts(id,university_id,host_id,title,starts_at,
 public_place,public_latitude,public_longitude) values
 ('51900000-0000-4000-8004-000000000001',
  (select id from public.universities where slug='unc-chapel-hill'),
  '51900000-0000-4000-8000-000000000001','Local fixture',now()+interval '1 hour',
  'Approximate place',35,-79);
insert into public.hangout_participants(hangout_id,account_id,state) values
 ('51900000-0000-4000-8004-000000000001',
  '51900000-0000-4000-8000-000000000001','joined');
select throws_ok($$update public.hangouts set host_id=
 '51900000-0000-4000-8000-000000000003',revision=revision+1
 where id='51900000-0000-4000-8004-000000000001'$$,
 '23514',null,'Hangout host mutation is impossible under existing guard');

select is((select enabled from private.moderation_feature_gate where singleton),false,
 'moderation defaults off');
select ok((select bool_and(relrowsecurity) from pg_class where oid in
 ('private.moderation_feature_gate'::regclass,'private.moderation_cases'::regclass,
  'private.moderation_requests'::regclass,'private.moderation_audit'::regclass)),
 'all moderation relations have RLS');
select ok(not has_table_privilege('authenticated','private.moderation_audit','SELECT'),
 'client cannot read audit');
select ok(not has_table_privilege('service_role','private.moderation_audit','SELECT')
 and not has_table_privilege('service_role','private.moderation_cases','SELECT'),
 'platform service role has no raw moderation reader');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"51900000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501',null,'operator denied while gate off');
select throws_ok($$select * from private.moderation_audit$$,
 '42501',null,'operator has no raw audit reader');
reset role;
update private.moderation_feature_gate set enabled=true;
set local role authenticated;
select is((select count(*) from public.list_moderation_reports()),2::bigint,
 'operator receives bounded queue');
select is((select count(*) from public.get_moderation_report(
 '51900000-0000-4000-8002-000000000001')),1::bigint,'operator opens detail');
select is((select case_revision from public.get_moderation_report(
 '51900000-0000-4000-8002-000000000001')),0::bigint,
 'exact detail projects zero for an absent case row');
select is((select revision from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000001',0,'start_review')),1::bigint,
 'open case starts review');
select is((select revision from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000001',0,'start_review')),1::bigint,
 'exact replay returns saved revision');
select throws_ok($$select * from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000001',0,'annotate','Changed')$$,
 '42501',null,'changed retry payload denied');
select throws_ok($$select * from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000002',0,'annotate','Stale')$$,
 '42501',null,'stale new action denied');
select is((select revision from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000003',1,'annotate','Review note')),2::bigint,
 'annotation advances revision');
select is((select revision from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000004',2,'close_no_action','Insufficient evidence')),3::bigint,
 'non-sanction closure advances revision');
select is((select revision from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000005',3,'reopen','New information')),4::bigint,
 'reopen advances revision');
select is((select case_revision from public.get_moderation_report(
 '51900000-0000-4000-8002-000000000001')),4::bigint,
 'exact detail projects current case revision after transitions');
select is((select revision from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000002',
 '51900000-0000-4000-8003-000000000006',0,'start_review')),1::bigint,
 'tied-time second report starts review');
select is((select revision from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000002',
 '51900000-0000-4000-8003-000000000007',1,'close_duplicate',
 'Earlier same-target allegation',
 '51900000-0000-4000-8002-000000000001')),2::bigint,
 'strict tied-time earlier report is valid duplicate');
select throws_ok($$select * from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000008',4,'close_duplicate',
 'Later reference','51900000-0000-4000-8002-000000000002')$$,
 '42501',null,'later duplicate reference denied');
select throws_ok($$select * from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000010',4,'close_duplicate',
 'Conflicted reference','51900000-0000-4000-8002-000000000000')$$,
 '42501',null,'self-filed duplicate reference denied');
select throws_ok($$select * from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000011',4,'close_duplicate',
 'Unknown reference','51900000-0000-4000-8002-000000000099')$$,
 '42501',null,'unknown duplicate reference denied');
select throws_ok($$select * from public.get_moderation_report(
 '51900000-0000-4000-8002-000000000099')$$,
 '42501',null,'unknown report denied neutrally');
reset role;
select is((select count(*) from private.moderation_audit where action='queue_read'),1::bigint,
 'one queue audit');
select is((select count(*) from private.moderation_audit where action='detail_read'),3::bigint,
 'every successful exact detail call has its own audit');
select is((select count(*) from private.moderation_audit where action='start_review'
 and report_id='51900000-0000-4000-8002-000000000001'),1::bigint,
 'replay did not duplicate audit');
select ok(not exists(select 1 from private.moderation_audit where
  reason like '%Private allegation%'), 'audit does not copy allegation');
select is((select duplicate_report_id from private.moderation_cases where
 report_id='51900000-0000-4000-8002-000000000002'),
 '51900000-0000-4000-8002-000000000001'::uuid,
 'duplicate link retained privately');
set local role authenticated;
select is((select report_id from public.list_moderation_reports(
 '2026-09-24 10:00:00+00',
 '51900000-0000-4000-8002-000000000002',24)),
 '51900000-0000-4000-8002-000000000001'::uuid,
 'equal-time cursor returns strictly earlier ID');
reset role;
select is((select count(*) from private.moderation_audit where action='queue_read'),
 2::bigint,'cursor page writes its own audit');
set local role authenticated;
select is((select count(*) from public.list_moderation_reports(
 '2026-09-24 10:00:00+00',
 '51900000-0000-4000-8002-000000000001',24)),0::bigint,
 'next cursor page is empty after excluding operator conflict');
reset role;
select is((select count(*) from private.moderation_audit where action='queue_read'
 and page_count=0),1::bigint,'empty page still has one audit');
insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
 provenance_kind,provenance_ref_id,submitted_at) values
 ('51900000-0000-4000-8002-000000000003',
  '51900000-0000-4000-8000-000000000002','user',
  '51900000-0000-4000-8000-000000000099','harassment',
  'current_people','51900000-0000-4000-8000-000000000099',
  '2026-09-24 08:00:00+00');
set local role authenticated;
select is((select target_status from public.get_moderation_report(
 '51900000-0000-4000-8002-000000000003')),'unavailable',
 'missing current target leaves allegation reviewable with unavailable context');
reset role;
select throws_ok($$delete from public.accounts where id=
 '51900000-0000-4000-8000-000000000002'$$,'23503',null,
 'reporter cannot cascade-delete allegation');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"51900000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.list_moderation_reports()$$,
 '42501',null,'student has no queue');
select throws_ok($$select * from public.get_moderation_report(
 '51900000-0000-4000-8002-000000000001')$$,
 '42501',null,'student has no detail');
reset role;
insert into public.platform_roles(user_id,role) values
 ('51900000-0000-4000-8000-000000000003','moderator');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"51900000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select * from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000009',4,'annotate','Target is operator')$$,
 '42501',null,'platform target is unavailable for case action');
reset role;
update public.accounts set status='suspended'
 where id='51900000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"51900000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from public.transition_moderation_case(
 '51900000-0000-4000-8002-000000000001',
 '51900000-0000-4000-8003-000000000001',0,'start_review')$$,
 '42501',null,'replay denied after suspension');
reset role;
select * from finish();
rollback;
