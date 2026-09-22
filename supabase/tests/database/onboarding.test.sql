begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('20000000-0000-4000-8000-000000000001','fixture@LIVE.UNC.EDU',now(),'{"role":"admin","verified":true}'),
 ('20000000-0000-4000-8000-000000000002','fixture@unc.edu',null,'{}'),
 ('20000000-0000-4000-8000-000000000003','fixture@sub.unc.edu',now(),'{}'),
 ('20000000-0000-4000-8000-000000000004','fixture@unc.edu.evil.test',now(),'{}'),
 ('20000000-0000-4000-8000-000000000005','peer@ad.unc.edu',now(),'{}'),
 ('20000000-0000-4000-8000-000000000006','fixture@business.unc.edu',now(),'{}'),
 ('20000000-0000-4000-8000-000000000007','fixture@kenan-flagler.unc.edu',now(),'{}');
select is((select count(*) from public.university_memberships),4::bigint,'only confirmed exact domains assigned');
select is((select count(*) from public.platform_roles),0::bigint,'metadata cannot grant roles');
select is((select public from storage.buckets where id='profile-photos'),false,'photos bucket private');
set local role anon;
select throws_ok('select public.get_access_state()','42501',null,'anonymous cannot invoke account RPC');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.get_access_state(),'onboarding','confirmed incomplete user needs onboarding');
select throws_ok($$update public.profiles set primary_photo_path='https://evil.test/p.png'$$,'23514',null,'remote photo URLs denied');
select throws_ok($$update public.profiles set primary_photo_path='20000000-0000-4000-8000-000000000001/missing.jpg'$$,'23514',null,'nonexistent photo denied');
select lives_ok($$insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','20000000-0000-4000-8000-000000000001/aaaaaaaa.jpg',auth.uid()::text)$$,'verified owner can upload own path');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','20000000-0000-4000-8000-000000000005/aaaaaaaa.jpg',auth.uid()::text)$$,'42501',null,'cannot upload in peer folder');
select lives_ok($$update public.profiles set real_name='Synthetic Student',graduation_year=2028,major='Biology',bio='Local fixture',primary_photo_path='20000000-0000-4000-8000-000000000001/aaaaaaaa.jpg'$$,'complete required profile with owned photo');
select is(public.get_access_state(),'ready','confirmed completed owner enters');
-- Direct SQL deletes are rejected by Storage's own protect_delete trigger;
-- referenced-object deletion is exercised through the HTTP integration suite.
with changed as(update storage.objects set name='20000000-0000-4000-8000-000000000001/bbbbbbbb.jpg' returning *) select is(count(*),0::bigint,'photos immutable') from changed;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select is((select count(*) from storage.objects where bucket_id='profile-photos'),0::bigint,'peer cannot read photo');
select throws_ok($$update public.profiles set primary_photo_path='20000000-0000-4000-8000-000000000001/aaaaaaaa.jpg'$$,'23514',null,'cannot claim peer photo');
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.get_access_state(),'unverified','unconfirmed email denied');
select throws_ok($$insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','20000000-0000-4000-8000-000000000002/aaaaaaaa.jpg',auth.uid()::text)$$,'42501',null,'unverified upload denied');
reset role;
update auth.users set email_confirmed_at=now() where id='20000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.get_access_state(),'onboarding','confirmation grants membership without client writes');
reset role;
update public.accounts set status='suspended' where id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.get_access_state(),'restricted','existing JWT denied on suspension');
select is((select count(*) from storage.objects where bucket_id='profile-photos'),0::bigint,'suspension denies photo');
reset role;
update public.accounts set status='active' where id='20000000-0000-4000-8000-000000000001';
update public.universities set active=false where slug='unc-chapel-hill';
set local role authenticated;
select is(public.get_access_state(),'unverified','inactive campus fails closed');
reset role;
update public.universities set active=true,allowed_email_domains=array['unc.edu'] where slug='unc-chapel-hill';
set local role authenticated;
select is(public.get_access_state(),'unverified','removed domain fails live check');
reset role;
update auth.users set email='changed@example.invalid' where id='20000000-0000-4000-8000-000000000002';
select is((select count(*) from public.university_memberships where user_id='20000000-0000-4000-8000-000000000002'),0::bigint,'email change removes old evidence');
select * from finish();
rollback;
