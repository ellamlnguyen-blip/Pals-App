begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at)
select ('53800000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'attendance-'||n||'@unc.edu',clock_timestamp() from generate_series(1,6) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
  from public.accounts where id::text like '53800000-%';
update public.profiles set real_name='Attendance fixture',major='Biology',
  graduation_year=2028,bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
  where user_id::text like '53800000-%';
insert into public.platform_roles(user_id,role) values
 ('53800000-0000-4000-8000-000000000006','admin');
insert into public.hangouts(id,university_id,host_id,title,starts_at,ends_at,
 public_place,public_latitude,public_longitude,updated_at,status,joining_state) values
 ('53800000-0000-4000-8001-000000000001','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','PRIVATE SOURCE',clock_timestamp()-interval '3 hours',clock_timestamp()-interval '1 hour','SECRET PLACE',35,-79,clock_timestamp()-interval '3 hours','published','open'),
 ('53800000-0000-4000-8001-000000000002','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','Fallback',clock_timestamp()-interval '3 hours',null,'Area',35,-79,clock_timestamp()-interval '3 hours','published','open'),
 ('53800000-0000-4000-8001-000000000003','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','Future',clock_timestamp()+interval '1 hour',null,'Area',35,-79,clock_timestamp(),'published','open'),
 ('53800000-0000-4000-8001-000000000004','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','Closed',clock_timestamp()-interval '34 days',clock_timestamp()-interval '32 days','Area',35,-79,clock_timestamp()-interval '34 days','published','open'),
 ('53800000-0000-4000-8001-000000000005','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','Precancel',clock_timestamp()-interval '3 hours',clock_timestamp()-interval '1 hour','Area',35,-79,clock_timestamp()-interval '4 hours','cancelled','closed'),
 ('53800000-0000-4000-8001-000000000006','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','Postcancel',clock_timestamp()-interval '3 hours',clock_timestamp()-interval '1 hour','Area',35,-79,clock_timestamp()-interval '2 hours','cancelled','closed');
insert into public.hangout_participants(hangout_id,account_id,state)
 select id,host_id,'joined' from public.hangouts where id::text like '53800000-%';
insert into public.hangout_participants(hangout_id,account_id,state,left_at,removed_at)
values
 ('53800000-0000-4000-8001-000000000001','53800000-0000-4000-8000-000000000002','joined',null,null),
 ('53800000-0000-4000-8001-000000000002','53800000-0000-4000-8000-000000000002','left',clock_timestamp(),null),
 ('53800000-0000-4000-8001-000000000003','53800000-0000-4000-8000-000000000002','joined',null,null),
 ('53800000-0000-4000-8001-000000000004','53800000-0000-4000-8000-000000000002','removed',null,clock_timestamp()),
 ('53800000-0000-4000-8001-000000000005','53800000-0000-4000-8000-000000000002','left',clock_timestamp(),null),
 ('53800000-0000-4000-8001-000000000006','53800000-0000-4000-8000-000000000002','removed',null,clock_timestamp()),
 ('53800000-0000-4000-8001-000000000001','53800000-0000-4000-8000-000000000004','left',clock_timestamp(),null);

select is((select enabled from private.attendance_feature_gate where singleton),false,'attendance gate defaults off');
select ok((select relrowsecurity from pg_class where oid='private.attendance_answers'::regclass)
 and (select relrowsecurity from pg_class where oid='private.attendance_feature_gate'::regclass),
 'both private relations have RLS');
select ok(not has_table_privilege('authenticated','private.attendance_answers','SELECT')
 and not has_table_privilege('authenticated','private.attendance_answers','INSERT')
 and not has_table_privilege('authenticated','private.attendance_answers','UPDATE')
 and not has_table_privilege('authenticated','private.attendance_answers','DELETE'),
 'no client table grants');
set local role anon;
select throws_ok($$select * from public.get_own_attendance('53800000-0000-4000-8001-000000000001')$$,'42501',null,'anon RPC denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.list_own_attendance()),0::bigint,'gate off list empty');
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000001')),0::bigint,'gate off exact empty');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,0)$$,'42501',null,'gate off write denied');
select throws_ok($$select * from private.attendance_answers$$,'42501',null,'direct answer read denied');
select throws_ok($$insert into private.attendance_answers(hangout_id,account_id,attended,revision,answered_at) values('53800000-0000-4000-8001-000000000001','53800000-0000-4000-8000-000000000002',true,1,now())$$,'42501',null,'direct answer insert denied');
select throws_ok($$update private.attendance_answers set attended=false$$,'42501',null,'direct answer update denied');
select throws_ok($$delete from private.attendance_answers$$,'42501',null,'direct answer delete denied');
reset role;
update private.attendance_feature_gate set enabled=true;
update private.hangout_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.list_own_attendance()),5::bigint,'past retained rows listed, future omitted');
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000001')),1::bigint,'own exact ID visible');
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000099')),0::bigint,'unknown exact ID neutral');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000003',true,0)$$,'42501',null,'early answer denied');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000004',true,0)$$,'42501',null,'late answer denied');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000005',true,0)$$,'42501',null,'pre-start cancelled denied');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000006',true,0)),1::bigint,'post-start cancelled eligible');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,0)),1::bigint,'first answer revision one');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,0)),1::bigint,'identical stale retry no-op');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',false,1)),2::bigint,'correction advances');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,1)$$,'42501',null,'stale conflicting write denied');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,2)),3::bigint,'change away and back advances');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000002',false,0)),1::bigint,'left participant may answer fallback');
select is((select count(*) from public.list_own_attendance('53800000-0000-4000-8001-000000000004')),2::bigint,'keyset bounds IDs');
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000001')
 where attended and revision=3 and answered_at is not null),1::bigint,'exact own read recovers current answer');
select ok((select currently_actionable from public.list_own_attendance()
 where hangout_id='53800000-0000-4000-8001-000000000001'),'open row actionable');
select is((select currently_actionable from public.list_own_attendance()
 where hangout_id='53800000-0000-4000-8001-000000000005'),false,'pre-start cancellation not actionable');
select is((select within_window from public.list_own_attendance()
 where hangout_id='53800000-0000-4000-8001-000000000004'),false,'old answer closed');
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',false,0)),1::bigint,'retained host may answer');
select throws_ok($$select public.edit_hangout('53800000-0000-4000-8001-000000000001',1,'PRIVATE SOURCE',(select starts_at from public.hangouts where id='53800000-0000-4000-8001-000000000001'),'SECRET PLACE',35,-79,p_ends_at=>now())$$,'23514',null,'authoritative edit freezes scheduled end');
select is(public.edit_hangout('53800000-0000-4000-8001-000000000001',1,'New title',
 (select starts_at from public.hangouts where id='53800000-0000-4000-8001-000000000001'),
 'SECRET PLACE',35,-79,p_ends_at=>(select ends_at from public.hangouts where id='53800000-0000-4000-8001-000000000001')),2::bigint,'authoritative non-schedule edit allowed');
select is(public.edit_hangout('53800000-0000-4000-8001-000000000003',1,'Future moved',
 now()+interval '2 hours','Area',35,-79),2::bigint,'pre-opening host reschedule allowed');
select is((select count(*) from public.list_own_attendance() where hangout_id='53800000-0000-4000-8001-000000000003'),0::bigint,'pre-opening reschedule moves window');
reset role;
update public.profiles set primary_photo_path=null where user_id='53800000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,0)),1::bigint,'unready active retained owner eligible');
select is((select count(*) from public.list_own_attendance()),1::bigint,'unready owner gets ID only');
reset role;
insert into public.universities(id,slug,name,active,allowed_email_domains)
 values('53800000-0000-4000-8004-000000000001','attendance-other-campus','Other campus',true,array['unc.edu']);
update public.university_memberships
 set university_id='53800000-0000-4000-8004-000000000001'
 where user_id='53800000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000001')),1::bigint,'cross-campus retained owner still gets own ID');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',false,1)),2::bigint,'cross-campus retained owner corrects own answer');
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000006","role":"authenticated"}',true);
select is((select count(*) from public.list_own_attendance()),0::bigint,'operator has no owner bypass');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,0)$$,'42501',null,'operator cannot answer another owner');
reset role;
insert into private.people_blocks(blocker_id,blocked_id) values
 ('53800000-0000-4000-8000-000000000002','53800000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.hangouts where id='53800000-0000-4000-8001-000000000001'),0::bigint,'host block hides ordinary source');
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000001')),1::bigint,'blocked-host retained ID read survives');
reset role;
update public.accounts set status='suspended' where id='53800000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*) from public.list_own_attendance()),0::bigint,'suspended owner read denied');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',false,1)$$,'42501',null,'suspended owner write denied');
reset role;
update public.accounts set status='banned' where id='53800000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000001')),0::bigint,'banned owner exact read denied');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,2)$$,'42501',null,'banned owner write denied');
reset role;
update private.hangout_feature_gate set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000001')),1::bigint,'own read survives source gate off');
select is((select currently_actionable from public.list_own_attendance() where hangout_id='53800000-0000-4000-8001-000000000001'),false,'source gate off removes actionability');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',false,3)$$,'42501',null,'source gate off denies write');
select throws_ok($$update public.hangouts set starts_at=starts_at+interval '1 minute',revision=revision+1 where id='53800000-0000-4000-8001-000000000001'$$,'42501',null,'client direct schedule update denied');
reset role;
select throws_ok($$update public.hangouts set starts_at=starts_at+interval '1 minute',revision=revision+1 where id='53800000-0000-4000-8001-000000000001'$$,'23514',null,'privileged direct schedule update frozen');
update public.hangouts set title='Allowed other edit',revision=revision+1 where id='53800000-0000-4000-8001-000000000001';
select is((select title from public.hangouts where id='53800000-0000-4000-8001-000000000001'),'Allowed other edit','non-schedule edit preserved');
-- The new opening instant is set to the database clock by a permitted edit.
-- Each subsequent RPC runs after that stored instant, with no sleep or wall
-- clock assumption. The old opening is safely in the future at edit time.
update private.hangout_feature_gate set enabled=true;
insert into public.hangouts(id,university_id,host_id,title,starts_at,ends_at,
 public_place,public_latitude,public_longitude) values
 ('53800000-0000-4000-8001-000000000007','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','Exact end',clock_timestamp()-interval '1 hour',clock_timestamp()+interval '10 minutes','Area',35,-79),
 ('53800000-0000-4000-8001-000000000008','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','Exact fallback',clock_timestamp()-interval '1 hour',null,'Area',35,-79),
 ('53800000-0000-4000-8001-000000000009','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','Before close',clock_timestamp()-interval '31 days',clock_timestamp()-interval '30 days'+interval '10 minutes','Area',35,-79),
 ('53800000-0000-4000-8001-000000000010','00000000-0000-4000-8000-000000000001','53800000-0000-4000-8000-000000000001','At close',clock_timestamp()-interval '31 days',clock_timestamp()-interval '30 days','Area',35,-79);
insert into public.hangout_participants(hangout_id,account_id,state)
 select h.id,x.account_id,'joined' from public.hangouts h
 cross join (values ('53800000-0000-4000-8000-000000000001'::uuid),
                    ('53800000-0000-4000-8000-000000000002'::uuid)) x(account_id)
 where h.id in ('53800000-0000-4000-8001-000000000007','53800000-0000-4000-8001-000000000008',
                '53800000-0000-4000-8001-000000000009','53800000-0000-4000-8001-000000000010');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000007',true,0)$$,'42501',null,'explicit end before opening denies');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000008',true,0)$$,'42501',null,'two-hour fallback before opening denies');
reset role;
update public.hangouts set ends_at=clock_timestamp(),revision=revision+1
 where id='53800000-0000-4000-8001-000000000007';
update public.hangouts set starts_at=clock_timestamp()-interval '2 hours',revision=revision+1
 where id='53800000-0000-4000-8001-000000000008';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000007',true,0)),1::bigint,'explicit end opens at its stored instant');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000008',true,0)),1::bigint,'start plus two hours opens at its stored instant');
select is((select revision from public.answer_own_attendance('53800000-0000-4000-8001-000000000009',true,0)),1::bigint,'correction window remains open before 30-day close');
reset role;
insert into private.attendance_answers(hangout_id,account_id,attended,revision,answered_at)
 select id,'53800000-0000-4000-8000-000000000002',true,1,ends_at+interval '1 day'
 from public.hangouts where id='53800000-0000-4000-8001-000000000010';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000010',true,1)$$,'42501',null,'identical retry at 30-day close still denies');
select is((select revision from public.get_own_attendance('53800000-0000-4000-8001-000000000010')),1::bigint,'exact own-read recovers saved answer after close');
select is((select within_window from public.list_own_attendance() where hangout_id='53800000-0000-4000-8001-000000000010'),false,'list marks answer closed at 30-day boundary');
reset role;
insert into private.safety_reports(id,reporter_id,target_type,target_id,category,provenance_kind,provenance_ref_id)
 values('53800000-0000-4000-8002-000000000001','53800000-0000-4000-8000-000000000002',
 'hangout','53800000-0000-4000-8001-000000000001','harassment',
 'retained_hangout','53800000-0000-4000-8001-000000000001');
insert into private.hangout_disables(report_id,hangout_id,operator_id,request_id,subject_campus_id,reason)
 values('53800000-0000-4000-8002-000000000001','53800000-0000-4000-8001-000000000001',
 '53800000-0000-4000-8000-000000000006','53800000-0000-4000-8003-000000000001',
 '00000000-0000-4000-8000-000000000001','Test disable');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000001')),0::bigint,'disable revokes exact own read');
select is((select count(*) from public.list_own_attendance() where hangout_id='53800000-0000-4000-8001-000000000001'),0::bigint,'disable revokes owner list row');
select throws_ok($$select * from public.answer_own_attendance('53800000-0000-4000-8001-000000000001',true,3)$$,'42501',null,'disable revokes write');
reset role;
update private.attendance_feature_gate set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"53800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.list_own_attendance()),0::bigint,'attendance gate revoke clears list');
select is((select count(*) from public.get_own_attendance('53800000-0000-4000-8001-000000000002')),0::bigint,'attendance gate revoke clears exact');
select * from finish();
rollback;
