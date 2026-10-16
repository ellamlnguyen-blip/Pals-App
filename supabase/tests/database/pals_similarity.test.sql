begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at)
select ('79000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'similar-'||n||'@unc.edu',now() from generate_series(1,32) n;
update public.profiles set real_name='Pal '||right(user_id::text,2),
  major=case when user_id='79000000-0000-4000-8000-000000000032' then 'History' else 'Fixtureology' end,
  graduation_year=case when user_id='79000000-0000-4000-8000-000000000031' then 2027 else 2028 end,
  bio='Coffee?',interests=case when user_id='79000000-0000-4000-8000-000000000002'
    then array['HIKING','hiking','Board  games'] else array[]::text[] end,
  hometown='Durham'
  where user_id::text like '79000000-%';
update public.profiles set interests=array['hiking','board games'],major='Fixtureology',
  graduation_year=2028,hometown='Durham'
  where user_id='79000000-0000-4000-8000-000000000001';
insert into private.people_preferences(account_id,opted_in)
select id,true from public.accounts where id::text like '79000000-%'
  and id<>'79000000-0000-4000-8000-000000000001';
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key='people';
update private.people_feature_gate set enabled=true where singleton;

select ok(not has_table_privilege('authenticated','private.pals_similarity_snapshots','SELECT'),
  'private ordered IDs have no client table reader');
select ok(not has_function_privilege('anon','public.browse_similar_pals(text,integer,text,integer)','EXECUTE'),
  'anon has no browse grant');
select ok(not has_function_privilege('authenticated','private.pals_similarity_normalize(text)','EXECUTE'),
  'normalizer is not a client oracle');
select is(private.pals_similarity_normalize(E'  HIKING\t CLUB  '),'hiking club',
  'case and whitespace normalize');
select is(private.pals_similarity_shared_interests(array['HIKING','hiking','BOARD games'],
  array['hiking','board games']),2,'interest matches are distinct');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"79000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.browse_similar_pals(p_major=>'FIXTUREOLOGY',p_graduation_year=>2028,p_limit=>24)
  ->'items'->0->>'account_id')::uuid,
  '79000000-0000-4000-8000-000000000002'::uuid,
  'normalized interests put closest eligible Pal first');
select ok((public.browse_similar_pals(p_major=>'FIXTUREOLOGY',p_graduation_year=>2028,p_limit=>24)
  ->>'has_more')::boolean,'more than 24 filtered candidates page');
select set_config('pals_similarity.test_cursor',
  public.browse_similar_pals(p_major=>'FIXTUREOLOGY',p_graduation_year=>2028,p_limit=>24)
  ->>'next_cursor',true);
select is(pg_catalog.jsonb_array_length(public.browse_similar_pals(
  p_major=>'fixtureology',p_graduation_year=>2028,
  p_cursor=>current_setting('pals_similarity.test_cursor'),p_limit=>24)->'items'),
  5,'second page contains remaining filtered candidates');
reset role;
select set_config('pals_similarity.test_handle',
  (select handle::text from private.pals_similarity_snapshots
    where owner_id='79000000-0000-4000-8000-000000000001'),true);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"79000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.browse_similar_pals(p_major=>'fixtureology',
  p_graduation_year=>2028,p_cursor=>pg_catalog.encode(pg_catalog.convert_to(
  current_setting('pals_similarity.test_handle')||':25','UTF8'),'base64'))$$,
  '22023',null,'known snapshot handle cannot forge an offset');
select throws_ok($$select public.browse_similar_pals(p_cursor=>'forged')$$,
  '22023',null,'forged cursor is stale');
select throws_ok($$select public.browse_similar_pals(p_major=>'fixtureology',
  p_graduation_year=>2028,p_cursor=>
    left(current_setting('pals_similarity.test_cursor'),35)||
    case when right(current_setting('pals_similarity.test_cursor'),1)='0'
      then '1' else '0' end)$$,
  '22023',null,'altered issued token cannot forge an offset');
select throws_ok($$select public.browse_similar_pals(p_major=>'history',
  p_cursor=>current_setting('pals_similarity.test_cursor'))$$,
  '22023',null,'cursor cannot switch filters');
select set_config('request.jwt.claims',
  '{"sub":"79000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.browse_similar_pals(p_major=>'fixtureology',
  p_graduation_year=>2028,p_cursor=>current_setting('pals_similarity.test_cursor'))$$,
  '22023',null,'another owner cannot redeem a cursor');
select set_config('request.jwt.claims',
  '{"sub":"79000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok((public.browse_similar_pals(p_major=>'fixtureology',p_graduation_year=>2028,p_limit=>24)->'items'->0) ? 'account_id',
  'safe browse has account ID');
select ok(not ((public.browse_similar_pals(p_major=>'fixtureology',p_graduation_year=>2028,p_limit=>24)->'items'->0)
  ?| array['score','hometown','interests','email','profile_revision']),
  'browse never projects score or private match evidence');
select is((select count(*) from public.profiles
  where user_id='79000000-0000-4000-8000-000000000002'),0::bigint,
  'raw peer profile remains denied');
select throws_ok($$select public.browse_similar_pals(p_limit=>25)$$,
  '22023',null,'limit above 24 denied');
reset role;

-- A profile edit invalidates every outstanding page, including an already
-- returned candidate; the next first page recomputes instead.
update public.profiles set major='Chemistry'
  where user_id='79000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok($$select public.browse_similar_pals(p_major=>'fixtureology',
  p_graduation_year=>2028,p_cursor=>current_setting('pals_similarity.test_cursor'))$$,
  '22023',null,'subject revision invalidates cursor');
reset role;

-- Hometown contributes only after explicit rich sharing; withdrawing it
-- invalidates a cursor even though the public People row stays eligible.
insert into private.rich_profile_preferences(account_id,opted_in,revision)
  values('79000000-0000-4000-8000-000000000030',true,1);
update private.rich_profile_feature_gate set enabled=true where singleton;
set local role authenticated;
select is((public.browse_similar_pals(p_major=>'fixtureology',p_graduation_year=>2028,
  p_limit=>1)->'items'->0->>'account_id')::uuid,
  '79000000-0000-4000-8000-000000000003'::uuid,
  'viewer without rich People consent gets no hometown rank');
reset role;
-- Owner consent changes the ranking-policy input without publishing it.
insert into private.people_preferences(account_id,opted_in)
  values('79000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((public.browse_similar_pals(p_major=>'fixtureology',p_graduation_year=>2028,
  p_limit=>1)->'items'->0->>'account_id')::uuid,
  '79000000-0000-4000-8000-000000000030'::uuid,
  'rich-consented hometown lifts matching Pal above otherwise equal peers');
select set_config('pals_similarity.rich_cursor',public.browse_similar_pals(
  p_major=>'fixtureology',p_graduation_year=>2028,p_limit=>1)->>'next_cursor',true);
reset role;
update private.rich_profile_preferences set opted_in=false,revision=revision+1
  where account_id='79000000-0000-4000-8000-000000000030';
set local role authenticated;
select throws_ok($$select public.browse_similar_pals(p_major=>'fixtureology',
  p_graduation_year=>2028,p_cursor=>current_setting('pals_similarity.rich_cursor'),
  p_limit=>1)$$,'22023',null,'rich withdrawal invalidates rank snapshot');
reset role;
select * from finish();
rollback;
