begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

-- All fixtures and gate changes roll back; no existing local account is touched.
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key='onboarding';
insert into auth.users(id,email,email_confirmed_at) values
  ('76000000-0000-4000-8000-000000000001','hometown-owner@unc.edu',now()),
  ('76000000-0000-4000-8000-000000000002','hometown-peer@unc.edu',now());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"76000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select hometown from public.profiles),null::text,'new owner has no inferred hometown');
select lives_ok($$update public.profiles set hometown='Durham, NC'$$,'owner writes hometown');
select is((select hometown from public.profiles),'Durham, NC','owner reads own hometown');
select is(public.get_access_state(),'ready','optional hometown is no access prerequisite');
select lives_ok($$update public.profiles set hometown=repeat('🌎',100)$$,'100 Unicode code points accepted');
select throws_ok($$update public.profiles set hometown=repeat('🌎',101)$$,'23514',null,'101 Unicode code points denied');
select throws_ok($$update public.profiles set hometown=' Durham'$$,'23514',null,'untrimmed hometown denied');
select throws_ok($$update public.profiles set hometown=U&'\00A0'$$,'23514',null,'Unicode-only whitespace denied');
select throws_ok($$update public.profiles set hometown=''$$,'23514',null,'empty string denied; use null');
select lives_ok($$update public.profiles set hometown=null$$,'owner clears hometown');
select is((select hometown from public.profiles),null::text,'cleared value remains null');
select is(public.get_access_state(),'ready','clear leaves access ready');
select lives_ok($$update public.profiles set hometown='Chapel Hill'$$,'owner saves a new value');
select set_config('request.jwt.claims','{"sub":"76000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.profiles where user_id='76000000-0000-4000-8000-000000000001'),0::bigint,'peer cannot read owner row');
with changed as (
  update public.profiles set hometown='Peer overwrite'
  where user_id='76000000-0000-4000-8000-000000000001' returning user_id
) select is(count(*),0::bigint,'peer cannot update owner hometown') from changed;
select set_config('request.jwt.claims','{"sub":"76000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select hometown from public.profiles),'Chapel Hill','peer update did not alter hometown');
select throws_ok($$update public.profiles set revision=0$$,'42501',null,'owner cannot bypass revision column grant');
with saved as (
  update public.profiles set hometown='Cary, NC'
  where user_id=auth.uid() and revision=(select revision from public.profiles where user_id=auth.uid())
  returning revision
) select is(count(*),1::bigint,'matching revision writes hometown') from saved;
with stale as (
  update public.profiles set hometown='Stale overwrite'
  where user_id=auth.uid() and revision=0 returning revision
) select is(count(*),0::bigint,'stale revision cannot overwrite hometown') from stale;
select is((select hometown from public.profiles),'Cary, NC','stale write preserved current value');
reset role;
update public.accounts set status='banned' where id='76000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"76000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.profiles),0::bigint,'banned owner cannot read hometown');
with changed as (update public.profiles set hometown='Denied' returning user_id)
  select is(count(*),0::bigint,'banned owner cannot write hometown') from changed;
set local role anon;
select throws_ok('select hometown from public.profiles','42501',null,'anon cannot read hometown');
select * from finish();
rollback;
