begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into public.universities(id, slug, name, active) values
 ('00000000-0000-4000-8000-000000000002', 'test-campus', 'Synthetic second campus', true),
 ('00000000-0000-4000-8000-000000000003', 'inactive-campus', 'Synthetic inactive campus', false);

-- Confirmed email is not enough; metadata must never grant membership or roles.
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data)
select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'fixture-' || n || '@example.invalid',
  case when n = 4 then null else now() end,
  '{"role":"admin","verified":true,"university_id":"00000000-0000-4000-8000-000000000001"}'::jsonb
from generate_series(1, 11) n;
select is((select count(*) from public.accounts), 11::bigint, 'Auth trigger provisions all fixture accounts');
select is((select count(*) from public.profiles), 11::bigint, 'Auth trigger provisions empty profiles');
select is((select count(*) from public.platform_roles), 0::bigint, 'malicious metadata grants no roles');
select is((select count(*) from public.university_memberships), 0::bigint, 'malicious metadata grants no membership');
select is((select count(*) from public.profiles where is_complete), 0::bigint, 'profiles start incomplete');

insert into public.university_memberships(user_id, university_id, verified_at, verification_email)
select id,
 case when email = 'fixture-3@example.invalid' then '00000000-0000-4000-8000-000000000002'::uuid
      when email = 'fixture-10@example.invalid' then '00000000-0000-4000-8000-000000000003'::uuid
      else '00000000-0000-4000-8000-000000000001'::uuid end,
 case when email = 'fixture-5@example.invalid' then null else now() end,
 case when email = 'fixture-5@example.invalid' then null else email end
from auth.users where email <> 'fixture-11@example.invalid';
update public.accounts set status = 'suspended' where id = '10000000-0000-4000-8000-000000000006';
update public.accounts set status = 'banned' where id = '10000000-0000-4000-8000-000000000009';
insert into public.platform_roles(user_id, role) values
 ('10000000-0000-4000-8000-000000000007', 'admin'),
 ('10000000-0000-4000-8000-000000000008', 'moderator');

set local role anon;
select throws_ok('select * from public.profiles', '42501', null, 'anonymous cannot read profiles');
select throws_ok('select * from public.accounts', '42501', null, 'anonymous cannot read account state');
select throws_ok('select * from public.universities', '42501', null, 'anonymous cannot enumerate campus metadata');
select throws_ok('select private.has_verified_membership()', '42501', null, 'anonymous cannot invoke private helper');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select ok(private.has_verified_membership(), 'confirmed active campus member qualifies independently of profile completion');
select is((select count(*) from public.accounts), 1::bigint, 'account state is owner-only');
select is((select count(*) from public.profiles), 1::bigint, 'verified user sees only own foundation profile');
select is((select count(*) from public.profiles where user_id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'same-campus peer profile is withheld until discovery/block policy exists');
select is((select count(*) from public.profiles where user_id = '10000000-0000-4000-8000-000000000003'), 0::bigint, 'cross-campus profile is withheld');
select is((select count(*) from public.university_memberships), 1::bigint, 'membership details are owner-only');
select is((select count(*) from public.platform_roles), 0::bigint, 'ordinary user cannot enumerate operator assignments');
select is((select count(*) from public.universities), 2::bigint, 'active university reference rows readable; inactive campus hidden');
select lives_ok($$update public.profiles set real_name='Test Student', graduation_year=2028, major='Biology', bio='Synthetic fixture', primary_photo_path='fixture/photo' where user_id=auth.uid()$$, 'owner edits own profile fields');
select ok((select is_complete from public.profiles), 'structural completion is derived');
select throws_ok('update public.profiles set is_complete=false', '428C9', null, 'generated completion cannot be forged');
select throws_ok($$update public.profiles set user_id='10000000-0000-4000-8000-000000000002'$$, '42501', null, 'ownership column is not writable');
select throws_ok($$update public.accounts set status='active'$$, '42501', null, 'client cannot change account status');
select throws_ok($$update public.university_memberships set verified_at=now()$$, '42501', null, 'client cannot verify membership');
select throws_ok($$update public.university_memberships set university_id='00000000-0000-4000-8000-000000000002'$$, '42501', null, 'client cannot transfer campus');
select throws_ok($$insert into public.platform_roles(user_id,role) values(auth.uid(),'admin')$$, '42501', null, 'client cannot grant admin');
select throws_ok($$update public.universities set allowed_email_domains=array['example.invalid']$$, '42501', null, 'client cannot alter domain policy');
select throws_ok('delete from public.profiles', '42501', null, 'client cannot delete profile foundation');
with changed as (update public.profiles set bio='intrusion' where user_id <> auth.uid() returning *)
select is(count(*), 0::bigint, 'cross-user updates affect zero rows') from changed;
select throws_ok($$update public.profiles set real_name=' '$$, '23514', null, 'blank required fields rejected');

-- Changing account email invalidates the evidence binding, even after reconfirmation.
reset role;
update auth.users set email='changed@example.invalid' where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select ok(not private.has_verified_membership(), 'changed email cannot inherit previous campus verification');
reset role;
update auth.users set email='fixture-1@example.invalid' where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select ok(not private.has_verified_membership(), 'unconfirmed email denied despite fixture membership');
select is((select count(*) from public.profiles), 1::bigint, 'unconfirmed account may read its own onboarding draft');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated","user_metadata":{"verified":true,"role":"admin"}}', true);
select ok(not private.has_verified_membership(), 'confirmed email and forged claims cannot replace campus verification');
select lives_ok($$update public.profiles set real_name='Draft Student', graduation_year=2027, major='Math', bio='Fixture', primary_photo_path='fixture/photo'$$, 'unverified user may complete own draft');
select ok(not private.has_verified_membership(), 'profile completion never grants verification');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000011","role":"authenticated"}', true);
select ok(not private.has_verified_membership(), 'missing membership fails closed');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000010","role":"authenticated"}', true);
select ok(not private.has_verified_membership(), 'inactive campus denied');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select ok(not private.has_verified_membership(), 'suspended account denied with existing JWT');
select is((select count(*) from public.profiles), 0::bigint, 'suspended cannot read profiles');
select is((select status from public.accounts), 'suspended', 'suspended account may read own restriction');
with changed as (update public.profiles set bio='bypass' returning *)
select is(count(*), 0::bigint, 'suspended profile edits affect zero rows') from changed;
select throws_ok($$update public.accounts set status='active'$$, '42501', null, 'suspended cannot self-reinstate');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000009","role":"authenticated"}', true);
select ok(not private.has_verified_membership(), 'banned account denied');
select is((select count(*) from public.profiles), 0::bigint, 'banned cannot read profiles');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
select is((select role from public.platform_roles), 'admin', 'admin sees own role');
select is((select count(*) from public.profiles), 1::bigint, 'admin role is not a blanket peer-profile bypass');
select throws_ok($$update public.accounts set status='suspended'$$, '42501', null, 'admin client cannot bypass future audited moderation');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000008","role":"authenticated"}', true);
select is((select role from public.platform_roles), 'moderator', 'moderator sees own role');
select throws_ok($$update public.platform_roles set role='admin'$$, '42501', null, 'moderator cannot promote self');
reset role;
update public.accounts set status='suspended' where id='10000000-0000-4000-8000-000000000008';
set local role authenticated;
select is((select count(*) from public.platform_roles), 0::bigint, 'suspension hides privileged role with unchanged JWT');
select set_config('request.jwt.claims', '{}', true);
select is((select count(*) from public.profiles), 0::bigint, 'missing subject fails closed');
select ok(not private.has_verified_membership(), 'missing subject is never verified');

reset role;
select is((select count(*) from public.universities where slug='unc-chapel-hill' and cardinality(allowed_email_domains)=0), 1::bigint, 'UNC seed contains no invented domain policy');
select * from finish();
rollback;
