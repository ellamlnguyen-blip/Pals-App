begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

select ok(not has_function_privilege('anon','public.resolve_rich_peer_photo_for_gateway(uuid,uuid,text,bigint)','EXECUTE'),
  'anon cannot call gateway resolver');
select ok(not has_function_privilege('authenticated','public.resolve_rich_peer_photo_for_gateway(uuid,uuid,text,bigint)','EXECUTE'),
  'authenticated cannot call gateway resolver');
select ok(has_function_privilege('service_role','public.resolve_rich_peer_photo_for_gateway(uuid,uuid,text,bigint)','EXECUTE'),
  'service role alone can call gateway resolver');
select throws_ok($$select * from public.resolve_rich_peer_photo_for_gateway(
  '79000000-0000-4000-8000-000000000001',
  '79000000-0000-4000-8000-000000000002','primary',1)$$,
  '42501','Photo unavailable','original postgres role cannot bypass service-role check');

insert into auth.users(id,email,email_confirmed_at) values
 ('79000000-0000-4000-8000-000000000001','photo-viewer@unc.edu',now()),
 ('79000000-0000-4000-8000-000000000002','photo-subject@unc.edu',now()),
 ('79000000-0000-4000-8000-000000000003','photo-third@unc.edu',now());
update public.profiles set real_name='Photo Test',major='Biology',graduation_year=2028,bio='Local'
 where user_id::text like '79000000-%';
insert into storage.objects(id,bucket_id,name,owner_id) values
 ('79000000-0000-4000-8000-000000000099','profile-photos',
  '79000000-0000-4000-8000-000000000002/photo.png','79000000-0000-4000-8000-000000000002');
update public.profiles set primary_photo_path='79000000-0000-4000-8000-000000000002/photo.png'
 where user_id='79000000-0000-4000-8000-000000000002';
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key='people';
update private.people_feature_gate set enabled=true where singleton;
update private.rich_profile_feature_gate set enabled=true where singleton;
insert into private.people_preferences(account_id,opted_in) values
 ('79000000-0000-4000-8000-000000000001',true),
 ('79000000-0000-4000-8000-000000000002',true);
insert into private.rich_profile_preferences(account_id,opted_in,revision) values
 ('79000000-0000-4000-8000-000000000002',true,1);

do $$ begin
  perform set_config('pals.photo_test_revision',
    (select revision::text from public.profiles where user_id='79000000-0000-4000-8000-000000000002'),true);
end $$;
set local role service_role;
select is((select object_id from public.resolve_rich_peer_photo_for_gateway(
  '79000000-0000-4000-8000-000000000001',
  '79000000-0000-4000-8000-000000000002','primary',
  current_setting('pals.photo_test_revision')::bigint)),
  '79000000-0000-4000-8000-000000000099'::uuid,'authorized exact object ID');
select is((select object_path from public.resolve_rich_peer_photo_for_gateway(
  '79000000-0000-4000-8000-000000000001',
  '79000000-0000-4000-8000-000000000002','primary',
  current_setting('pals.photo_test_revision')::bigint)),
  '79000000-0000-4000-8000-000000000002/photo.png','authorized exact path');
select is((select count(*) from public.resolve_rich_peer_photo_for_gateway(
  '79000000-0000-4000-8000-000000000003',
  '79000000-0000-4000-8000-000000000002','primary',
  current_setting('pals.photo_test_revision')::bigint)),
  0::bigint,'viewer without People opt-in denied');
select is((select count(*) from public.resolve_rich_peer_photo_for_gateway(
  '79000000-0000-4000-8000-000000000001',
  '79000000-0000-4000-8000-000000000002','primary',1)),
  0::bigint,'stale profile revision denied');
select is((select count(*) from public.resolve_rich_peer_photo_for_gateway(
  '79000000-0000-4000-8000-000000000001',
  '79000000-0000-4000-8000-000000000002','0',
  current_setting('pals.photo_test_revision')::bigint)),
  0::bigint,'absent photo slot denied');
reset role;

insert into private.people_blocks(blocker_id,blocked_id) values
 ('79000000-0000-4000-8000-000000000002','79000000-0000-4000-8000-000000000001');
set local role service_role;
select is((select count(*) from public.resolve_rich_peer_photo_for_gateway(
  '79000000-0000-4000-8000-000000000001',
  '79000000-0000-4000-8000-000000000002','primary',
  current_setting('pals.photo_test_revision')::bigint)),
  0::bigint,'subject block revokes photo');
reset role;

select * from finish();
rollback;
