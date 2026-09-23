-- ADR-0013: disposable-local, default-private text People directory.
begin;

create table private.people_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into private.people_feature_gate(singleton, enabled) values (true, false);
alter table private.people_feature_gate enable row level security;
revoke all on private.people_feature_gate from public, anon, authenticated;

create table private.people_preferences (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  opted_in boolean not null default false
);
alter table private.people_preferences enable row level security;
revoke all on private.people_preferences from public, anon, authenticated;

create table private.people_blocks (
  blocker_id uuid not null references public.accounts(id) on delete cascade,
  blocked_id uuid not null references public.accounts(id) on delete cascade,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index people_blocks_blocked_idx on private.people_blocks(blocked_id, blocker_id);
alter table private.people_blocks enable row level security;
revoke all on private.people_blocks from public, anon, authenticated;

create function private.people_require_read_committed() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
end;
$$;

create function private.people_active_owner() returns boolean
language sql volatile security definer set search_path = '' as $$
  select exists(select 1 from public.accounts a
    where a.id = (select auth.uid()) and a.status = 'active');
$$;

create function private.people_ready_campus() returns uuid
language sql volatile security definer set search_path = '' as $$
  select m.university_id from public.university_memberships m
  where m.user_id = (select auth.uid())
    and public.get_access_state() = 'ready';
$$;

create function private.people_enabled() returns boolean
language sql volatile security definer set search_path = '' as $$
  select exists(select 1 from private.people_feature_gate g where g.singleton and g.enabled);
$$;

create function private.people_visible(subject uuid, campus uuid) returns boolean
language sql volatile security definer set search_path = '' as $$
  select subject <> (select auth.uid())
    and private.ready_subject_campus(subject, campus)
    and exists(select 1 from private.people_preferences v
      where v.account_id = subject and v.opted_in)
    and not exists(select 1 from private.people_blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = subject)
         or (b.blocker_id = subject and b.blocked_id = (select auth.uid())));
$$;

revoke all on function private.people_require_read_committed(),
  private.people_active_owner(), private.people_ready_campus(),
  private.people_enabled(), private.people_visible(uuid,uuid)
  from public, anon, authenticated;

-- Active owners can inspect their own preference even when the gate is off.
create function public.get_people_preference() returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.people_require_read_committed();
  if not private.people_active_owner() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  return coalesce((select v.opted_in from private.people_preferences v
    where v.account_id = (select auth.uid())), false);
end;
$$;

create function public.set_people_preference(p_opted_in boolean) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  perform private.people_require_read_committed();
  if p_opted_in is null or actor is null then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  -- Lock the owner row before checking live state; a waiting mutation rechecks.
  perform 1 from public.accounts a where a.id = actor for update;
  if not private.people_active_owner()
    or (p_opted_in and (not private.people_enabled() or private.people_ready_campus() is null)) then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  insert into private.people_preferences(account_id, opted_in) values(actor, p_opted_in)
    on conflict(account_id) do update set opted_in = excluded.opted_in;
  return p_opted_in;
end;
$$;

create function public.browse_people(
  p_search text default null, p_graduation_year integer default null,
  p_major text default null, p_after_name text default null,
  p_after_id uuid default null, p_limit integer default 24
) returns table(account_id uuid, real_name text, campus_name text,
  graduation_year integer, major text)
language plpgsql volatile security definer set search_path = '' as $$
declare campus uuid;
declare query_text text := nullif(pg_catalog.btrim(p_search), '');
declare major_text text := nullif(pg_catalog.btrim(p_major), '');
begin
  perform private.people_require_read_committed();
  if p_limit is null or p_limit not between 1 and 24
    or (p_search is not null and pg_catalog.length(p_search) > 100)
    or (p_major is not null and pg_catalog.length(p_major) > 200)
    or (p_graduation_year is not null and p_graduation_year not between 1900 and 2200)
    or ((p_after_name is null) <> (p_after_id is null))
    or (p_after_name is not null and
       (pg_catalog.length(p_after_name) not between 1 and 100
        or p_after_name <> pg_catalog.lower(pg_catalog.btrim(p_after_name)))) then
    raise exception 'Invalid People browse input' using errcode = '22023';
  end if;
  if not private.people_enabled() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  campus := private.people_ready_campus();
  if campus is null then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  return query
    select p.user_id, p.real_name, c.name, p.graduation_year, p.major
    from public.profiles p
    join public.university_memberships m on m.user_id = p.user_id and m.university_id = campus
    join public.universities c on c.id = m.university_id
    where private.people_visible(p.user_id, campus)
      and (query_text is null or pg_catalog.strpos(pg_catalog.lower(p.real_name), pg_catalog.lower(query_text)) > 0)
      and (p_graduation_year is null or p.graduation_year = p_graduation_year)
      and (major_text is null or pg_catalog.lower(p.major) = pg_catalog.lower(major_text))
      and (p_after_id is null or
        ((pg_catalog.lower(pg_catalog.btrim(p.real_name)) collate "C"), p.user_id) >
        ((p_after_name collate "C"), p_after_id))
    order by pg_catalog.lower(pg_catalog.btrim(p.real_name)) collate "C", p.user_id
    limit p_limit;
end;
$$;

create function public.get_people_detail(p_account_id uuid)
returns table(account_id uuid, real_name text, campus_name text,
  graduation_year integer, major text, bio text, interests text[], down_to_do text[])
language plpgsql volatile security definer set search_path = '' as $$
declare campus uuid;
begin
  perform private.people_require_read_committed();
  if not private.people_enabled() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  campus := private.people_ready_campus();
  if campus is null then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  return query
    select p.user_id, p.real_name, c.name, p.graduation_year, p.major,
      p.bio, p.interests, p.down_to_do
    from public.profiles p
    join public.university_memberships m on m.user_id = p.user_id and m.university_id = campus
    join public.universities c on c.id = m.university_id
    where p.user_id = p_account_id and private.people_visible(p.user_id, campus);
end;
$$;

create function public.set_people_block(p_account_id uuid, p_blocked boolean) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
declare campus uuid;
begin
  perform private.people_require_read_committed();
  if actor is null or p_account_id is null or p_account_id = actor or p_blocked is null
    or not private.people_enabled() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  -- Both directions use one transaction lock. A waiter rechecks all authority
  -- after acquisition, including an opposite-direction block just committed.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    least(actor::text, p_account_id::text) || ':' ||
    greatest(actor::text, p_account_id::text), 0));
  if not private.people_enabled() or not private.people_active_owner() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  if p_blocked then
    campus := private.people_ready_campus();
    if campus is null or
      (not exists(select 1 from private.people_blocks b
        where b.blocker_id = actor and b.blocked_id = p_account_id)
       and not private.people_visible(p_account_id, campus)) then
      raise exception 'People operation unavailable' using errcode = '42501';
    end if;
    insert into private.people_blocks(blocker_id, blocked_id)
      values(actor, p_account_id) on conflict do nothing;
  else
    delete from private.people_blocks b
      where b.blocker_id = actor and b.blocked_id = p_account_id;
  end if;
  return p_blocked;
end;
$$;

create function public.list_people_blocked_ids(p_after_id uuid default null, p_limit integer default 24)
returns table(account_id uuid)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.people_require_read_committed();
  if not private.people_enabled() or not private.people_active_owner() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 24 then
    raise exception 'Invalid People block page size' using errcode = '22023';
  end if;
  return query select b.blocked_id from private.people_blocks b
    where b.blocker_id = (select auth.uid())
      and (p_after_id is null or b.blocked_id > p_after_id)
    order by b.blocked_id limit p_limit;
end;
$$;

revoke all on function public.get_people_preference(), public.set_people_preference(boolean),
  public.browse_people(text,integer,text,text,uuid,integer), public.get_people_detail(uuid),
  public.set_people_block(uuid,boolean), public.list_people_blocked_ids(uuid,integer)
  from public, anon, authenticated;
grant execute on function public.get_people_preference(), public.set_people_preference(boolean),
  public.browse_people(text,integer,text,text,uuid,integer), public.get_people_detail(uuid),
  public.set_people_block(uuid,boolean), public.list_people_blocked_ids(uuid,integer)
  to authenticated;

commit;
