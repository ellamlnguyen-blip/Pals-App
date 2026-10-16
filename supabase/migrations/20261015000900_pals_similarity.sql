-- TASK-034D / accepted ADR-0043. Disposable-local candidate; no hosted activation.
begin;

create or replace function private.pals_similarity_normalize(value text) returns text
language sql immutable set search_path = '' as $$
  select nullif(pg_catalog.lower(pg_catalog.btrim(pg_catalog.regexp_replace(
    coalesce(value,''), '[[:space:]]+', ' ', 'g'))), '');
$$;

create or replace function private.pals_similarity_shared_interests(owner_interests text[], peer_interests text[])
returns integer language sql immutable set search_path = '' as $$
  select least(4, count(*)::integer) from (
    select distinct private.pals_similarity_normalize(v) as interest
    from pg_catalog.unnest(coalesce(owner_interests, '{}'::text[])) as v
  ) o where o.interest is not null and o.interest in (
    select distinct private.pals_similarity_normalize(v)
    from pg_catalog.unnest(coalesce(peer_interests, '{}'::text[])) as v
  );
$$;

create table if not exists private.pals_similarity_snapshots (
  owner_id uuid primary key references public.accounts(id) on delete cascade,
  handle uuid not null unique default gen_random_uuid(),
  campus_id uuid not null,
  major_filter text,
  year_filter integer,
  owner_revision bigint not null,
  rich_gate_enabled boolean not null,
  owner_people_opted boolean not null,
  ranking_version integer not null default 1,
  candidates jsonb not null,
  cursor_tokens jsonb not null default '{}'::jsonb,
  rate_window_at timestamptz not null default clock_timestamp(),
  rate_count integer not null default 1 check (rate_count between 1 and 30),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  check (pg_catalog.jsonb_typeof(candidates) = 'array'),
  check (pg_catalog.jsonb_typeof(cursor_tokens) = 'object'),
  check (pg_catalog.jsonb_array_length(candidates) <= 10000)
);
create index if not exists pals_similarity_snapshots_expiry on private.pals_similarity_snapshots(expires_at);
alter table private.pals_similarity_snapshots enable row level security;
revoke all on private.pals_similarity_snapshots from public, anon, authenticated, service_role;

-- The existing owner profile revision increments on every update. The rich
-- preference revision increments on every consent transition, including off.
create or replace function public.browse_similar_pals(
  p_major text default null, p_graduation_year integer default null,
  p_cursor text default null, p_limit integer default 24
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); campus uuid; owner_profile public.profiles;
  filter_major text; snap private.pals_similarity_snapshots;
  rich_enabled boolean; owner_opted boolean;
  previous_snap private.pals_similarity_snapshots; ordered_candidates jsonb;
  start_offset integer := 0;
  candidate_count integer; candidate jsonb; page_candidates jsonb;
  visible_items jsonb := '[]'::jsonb; live_after boolean := false;
  position integer; next_position integer; response_cursor text;
begin
  perform private.people_require_read_committed();
  if actor is null or p_limit is null or p_limit not between 1 and 24
    or (p_major is not null and pg_catalog.length(p_major) > 200)
    or (p_graduation_year is not null and p_graduation_year not between 1900 and 2200)
    or (p_cursor is not null and pg_catalog.length(p_cursor) > 36) then
    raise exception 'Invalid Pals browse' using errcode='22023';
  end if;
  filter_major := private.pals_similarity_normalize(p_major);
  -- Every People/rich consent writer takes the social mutation key, including
  -- insertion of a previously absent rich preference. Keep it through return.
  perform pg_catalog.pg_advisory_xact_lock_shared(16016,1);
  if not private.people_enabled() or not private.pilot_capability_enabled('people') then
    raise exception 'Pals browse unavailable' using errcode='42501';
  end if;
  campus := private.people_ready_campus();
  if campus is null then raise exception 'Pals browse unavailable' using errcode='42501'; end if;
  select * into owner_profile from public.profiles where user_id=actor for share;
  if not found then raise exception 'Pals browse unavailable' using errcode='42501'; end if;
  perform 1 from private.rich_profile_feature_gate where singleton for share;
  rich_enabled := exists(select 1 from private.rich_profile_feature_gate
    where singleton and enabled);
  owner_opted := exists(select 1 from private.people_preferences
    where account_id=actor and opted_in);

  -- Serialize new snapshots for this owner. The random handle remains private;
  -- an offset alone can never access another owner's snapshot.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pals-similarity:'||actor::text, 0));
  if p_cursor is null then
    select * into previous_snap from private.pals_similarity_snapshots where owner_id=actor;
    -- Bounded cleanup work; ordinary reads never enumerate stale owners.
    delete from private.pals_similarity_snapshots where owner_id in (
      select owner_id from private.pals_similarity_snapshots
      where expires_at < clock_timestamp() order by expires_at limit 100
    );
    with ranked as (
      select p.user_id, p.revision,
        coalesce(rp.revision,0) as rich_revision,
        (rich_enabled and owner_opted and coalesce(rp.opted_in,false)) as rich_allowed,
        2 * private.pals_similarity_shared_interests(owner_profile.interests,p.interests)
        + case when private.pals_similarity_normalize(owner_profile.major) is not null
             and private.pals_similarity_normalize(owner_profile.major)=private.pals_similarity_normalize(p.major) then 3 else 0 end
        + case when owner_profile.graduation_year is not null
             and owner_profile.graduation_year=p.graduation_year then 2 else 0 end
        + case when rich_enabled and owner_opted and coalesce(rp.opted_in,false)
          then case when private.pals_similarity_normalize(owner_profile.hometown) is not null
            and private.pals_similarity_normalize(owner_profile.hometown)=
              private.pals_similarity_normalize(p.hometown) then 1 else 0 end
          else 0 end as score,
        private.pals_similarity_normalize(p.real_name) collate "C" as sort_name
      from public.profiles p
      join public.university_memberships m on m.user_id=p.user_id and m.university_id=campus
      left join private.rich_profile_preferences rp on rp.account_id=p.user_id
      where private.people_visible(p.user_id,campus)
        and (filter_major is null or private.pals_similarity_normalize(p.major)=filter_major)
        and (p_graduation_year is null or p.graduation_year=p_graduation_year)
      order by score desc, sort_name, p.user_id
      limit 10001
    )
    select count(*)::integer,
      coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id',user_id,'revision',revision,'rich_revision',rich_revision,
        'rich_allowed',rich_allowed)
        order by score desc, sort_name, user_id),'[]'::jsonb)
      into candidate_count, ordered_candidates from ranked;
    if candidate_count > 10000 then
      raise exception 'Pals browse unavailable' using errcode='42501';
    end if;
    if previous_snap.handle is not null and previous_snap.expires_at>clock_timestamp()
      and previous_snap.campus_id=campus
      and previous_snap.major_filter is not distinct from filter_major
      and previous_snap.year_filter is not distinct from p_graduation_year
      and previous_snap.owner_revision=owner_profile.revision
      and previous_snap.rich_gate_enabled=rich_enabled
      and previous_snap.owner_people_opted=owner_opted
      and previous_snap.candidates=ordered_candidates then
      snap:=previous_snap;
    else
      if previous_snap.handle is not null
        and previous_snap.rate_window_at>clock_timestamp()-interval '1 minute'
        and previous_snap.rate_count>=30 then
        raise exception 'Pals browse unavailable' using errcode='42501';
      end if;
      insert into private.pals_similarity_snapshots as current_snapshot
      (owner_id,campus_id,major_filter,year_filter,owner_revision,
        rich_gate_enabled,owner_people_opted,candidates,cursor_tokens,expires_at)
      values(actor,campus,filter_major,p_graduation_year,owner_profile.revision,
        rich_enabled,owner_opted,ordered_candidates,'{}'::jsonb,
        clock_timestamp()+interval '5 minutes')
      on conflict(owner_id) do update set handle=gen_random_uuid(),
        campus_id=excluded.campus_id,major_filter=excluded.major_filter,
        year_filter=excluded.year_filter,owner_revision=excluded.owner_revision,
        rich_gate_enabled=excluded.rich_gate_enabled,
        owner_people_opted=excluded.owner_people_opted,
        ranking_version=1,candidates=excluded.candidates,cursor_tokens='{}'::jsonb,
        rate_window_at=case when current_snapshot.rate_window_at>
          clock_timestamp()-interval '1 minute'
          then current_snapshot.rate_window_at else clock_timestamp() end,
        rate_count=case when current_snapshot.rate_window_at>
          clock_timestamp()-interval '1 minute'
          then current_snapshot.rate_count+1 else 1 end,
        created_at=clock_timestamp(),expires_at=excluded.expires_at
      returning * into snap;
    end if;
  else
    if p_cursor !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Stale Pals browse' using errcode='22023';
    end if;
    select * into snap from private.pals_similarity_snapshots
      where owner_id=actor;
    select key::integer into start_offset from pg_catalog.jsonb_each_text(snap.cursor_tokens)
      where value=p_cursor;
    if not found or snap.expires_at <= clock_timestamp() or snap.campus_id<>campus
      or snap.major_filter is distinct from filter_major
      or snap.year_filter is distinct from p_graduation_year
      or snap.owner_revision<>owner_profile.revision or snap.ranking_version<>1
      or snap.rich_gate_enabled<>rich_enabled or snap.owner_people_opted<>owner_opted
      or start_offset is null or start_offset<0
      or start_offset>=pg_catalog.jsonb_array_length(snap.candidates) then
      raise exception 'Stale Pals browse' using errcode='22023';
    end if;
  end if;

  -- Rank was built before the profile locks on the first page. If any row
  -- changed while we waited, abort instead of releasing an obsolete ranking.
  -- Both pages hold all subject profile and existing rich rows until return.
  perform 1 from public.profiles p
    join pg_catalog.jsonb_to_recordset(snap.candidates)
      as saved(id uuid,revision bigint,rich_revision bigint,rich_allowed boolean)
      on saved.id=p.user_id order by p.user_id for share of p;
  perform 1 from private.rich_profile_preferences rp
    join pg_catalog.jsonb_to_recordset(snap.candidates)
      as saved(id uuid,revision bigint,rich_revision bigint,rich_allowed boolean)
      on saved.id=rp.account_id order by rp.account_id for share of rp;
  -- Consent/profile edits invalidate even if an edited candidate was on an
  -- earlier page. Revocation without a revision simply omits the candidate.
  if exists (
      select 1 from pg_catalog.jsonb_to_recordset(snap.candidates)
        as saved(id uuid,revision bigint,rich_revision bigint,rich_allowed boolean)
      left join public.profiles p on p.user_id=saved.id
      left join private.rich_profile_preferences rp on rp.account_id=saved.id
      where p.revision is distinct from saved.revision
        or coalesce(rp.revision,0) is distinct from saved.rich_revision
        or (rich_enabled and owner_opted and coalesce(rp.opted_in,false)
          is distinct from saved.rich_allowed)
    ) then raise exception 'Stale Pals browse' using errcode='22023'; end if;

  -- One statement fetches at most 25 live candidates after the cursor. Denied
  -- IDs are scanned past and never affect has_more or visible pagination.
  with live as (
    select (e.ordinality-1)::integer as ord,p.user_id,p.real_name,
      p.graduation_year,p.major,c.name as campus_name
    from pg_catalog.jsonb_array_elements(snap.candidates) with ordinality as e(value,ordinality)
    join public.profiles p on p.user_id=(e.value->>'id')::uuid
    join public.universities c on c.id=campus
    where e.ordinality>start_offset and private.people_visible(p.user_id,campus)
        and (filter_major is null or private.pals_similarity_normalize(p.major)=filter_major)
        and (p_graduation_year is null or p.graduation_year=p_graduation_year)
    order by e.ordinality limit p_limit+1
  ) select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'ord',ord,'item',pg_catalog.jsonb_build_object('account_id',user_id,
      'real_name',real_name,'campus_name',campus_name,
      'graduation_year',graduation_year,'major',major)) order by ord),'[]'::jsonb)
    into page_candidates from live;
  live_after := pg_catalog.jsonb_array_length(page_candidates)>p_limit;
  for position in 0 .. least(p_limit,pg_catalog.jsonb_array_length(page_candidates))-1 loop
    candidate := page_candidates->position;
    visible_items := visible_items || pg_catalog.jsonb_build_array(candidate->'item');
    next_position := (candidate->>'ord')::integer+1;
  end loop;
  if live_after then
    response_cursor := snap.cursor_tokens->>next_position::text;
    if response_cursor is null then
      response_cursor := gen_random_uuid()::text;
      update private.pals_similarity_snapshots
        set cursor_tokens=cursor_tokens || pg_catalog.jsonb_build_object(next_position::text,response_cursor)
        where owner_id=actor and handle=snap.handle;
    end if;
  end if;
  return pg_catalog.jsonb_build_object('items',visible_items,'next_cursor',response_cursor,'has_more',live_after);
end;
$$;

revoke all on function private.pals_similarity_normalize(text),
  private.pals_similarity_shared_interests(text[],text[]),
  public.browse_similar_pals(text,integer,text,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.browse_similar_pals(text,integer,text,integer) to authenticated;
commit;
