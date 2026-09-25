-- ADR-0024 / TASK-020A: disposable-local, default-off large-Hangout primitives.
begin;

create table private.large_hangout_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  ranking_epoch uuid not null default gen_random_uuid()
);
insert into private.large_hangout_feature_gate (singleton, enabled) values (true, false);
alter table private.large_hangout_feature_gate enable row level security;
revoke all on private.large_hangout_feature_gate from public, anon, authenticated;

-- A trusted gate update always invalidates an in-flight two-read map response.
create function private.advance_large_hangout_epoch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.ranking_epoch := gen_random_uuid();
  return new;
end;
$$;
create trigger advance_large_hangout_epoch before update on private.large_hangout_feature_gate
  for each row execute function private.advance_large_hangout_epoch();
revoke all on function private.advance_large_hangout_epoch() from public, anon, authenticated;

create table private.large_hangout_signals (
  hangout_id uuid not null references public.hangouts(id) on delete restrict,
  policy_version integer not null check (policy_version = 1),
  threshold_value integer not null check (threshold_value = 25),
  observed_at timestamptz not null default clock_timestamp(),
  primary key (hangout_id, policy_version)
);
alter table private.large_hangout_signals enable row level security;
revoke all on private.large_hangout_signals from public, anon, authenticated;
create function private.reject_large_hangout_signal_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Immutable large-Hangout signal' using errcode = '42501';
end;
$$;
create trigger large_hangout_signal_immutable before update or delete
  on private.large_hangout_signals for each row
  execute function private.reject_large_hangout_signal_change();
revoke all on function private.reject_large_hangout_signal_change() from public, anon, authenticated;

-- Called only on the existing serialized, caller-bound genuine-join path.
create function private.record_large_hangout_join(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare gate_enabled boolean;
begin
  select enabled into gate_enabled from private.large_hangout_feature_gate
    where singleton for share;
  if gate_enabled and (select count(*) from public.hangout_participants
      where hangout_id = p_hangout_id and state = 'joined') >= 25 then
    insert into private.large_hangout_signals(hangout_id, policy_version, threshold_value)
      values (p_hangout_id, 1, 25) on conflict (hangout_id, policy_version) do nothing;
  end if;
end;
$$;
revoke all on function private.record_large_hangout_join(uuid) from public, anon, authenticated;

create or replace function public.join_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare h public.hangouts; participant_state text; did_join boolean;
begin
  perform private.social_hangout_mutation_lock();
  h = private.lock_hangout(p_hangout_id);
  if h.status <> 'published' or h.joining_state <> 'open' then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  if exists(select 1 from public.hangout_participants p where p.hangout_id = h.id
    and p.state = 'joined' and p.account_id <> auth.uid()
    and private.safety_pair_blocked(auth.uid(), p.account_id)) then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  select state into participant_state from public.hangout_participants
    where hangout_id = h.id and account_id = auth.uid();
  if participant_state = 'removed' then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  if participant_state = 'joined' then return; end if;
  insert into public.hangout_participants(hangout_id, account_id, state)
    values (h.id, auth.uid(), 'joined')
    on conflict(hangout_id, account_id) do update
      set state = 'joined', joined_at = clock_timestamp(), left_at = null,
          updated_at = clock_timestamp()
      where hangout_participants.state = 'left';
  did_join := found;
  if did_join then
    perform private.safety_record_joined_overlap(h.id, auth.uid());
    perform private.record_large_hangout_join(h.id);
    perform private.notification_emit_hangout(gen_random_uuid(), h.id, auth.uid(), 'hangout_joined');
  end if;
end;
$$;

-- The host receives one coarse flag, never a count or an identity list.
create function public.get_hangout_large_state(p_hangout_id uuid)
returns table(is_large boolean)
language plpgsql volatile security definer set search_path = '' as $$
declare h public.hangouts; gate_enabled boolean;
begin
  if auth.uid() is null or p_hangout_id is null
    or current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Hangout size unavailable' using errcode = '42501';
  end if;
  select * into h from public.hangouts where id = p_hangout_id for share;
  if not found then raise exception 'Hangout size unavailable' using errcode = '42501'; end if;
  perform 1 from private.hangout_feature_gate where singleton for share;
  select enabled into gate_enabled from private.large_hangout_feature_gate
    where singleton for share;
  if not gate_enabled or not private.hangouts_enabled()
    or h.host_id <> auth.uid() or h.status <> 'published'
    or h.visibility <> 'campus' or h.university_id is distinct from private.ready_campus()
    or not private.can_read_hangout(h.id) then
    raise exception 'Hangout size unavailable' using errcode = '42501';
  end if;
  return query select (count(*) >= 25) from public.hangout_participants p
    where p.hangout_id = h.id and p.state = 'joined';
end;
$$;
revoke all on function public.get_hangout_large_state(uuid) from public, anon, authenticated;
grant execute on function public.get_hangout_large_state(uuid) to authenticated;

-- RPC contract: JSON {pins: SavedPin[0..101], epoch: opaque UUID,
-- ranking_mode: "small_first" | "chronological"}. The web
-- adapter makes two identical calls around get_access_state and compares the
-- complete ordered 101-item arrays, mode and epoch before releasing the first 100.
create function public.query_saved_hangouts(
  p_west double precision, p_south double precision,
  p_east double precision, p_north double precision,
  p_time_filter text, p_joining_filter text, p_cutoff timestamptz
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare gate_enabled boolean; gate_epoch uuid; campus uuid; result jsonb;
begin
  if auth.uid() is null or current_setting('transaction_isolation') <> 'read committed'
    or p_west is null or p_south is null or p_east is null or p_north is null
    or p_west < -79.13 or p_east > -78.98 or p_south < 35.85 or p_north > 35.97
    or not (p_west < p_east and p_south < p_north)
    or p_time_filter not in ('upcoming', 'all') or p_time_filter is null
    or p_joining_filter not in ('any', 'open') or p_joining_filter is null
    or p_cutoff is null or not isfinite(p_cutoff)
    or abs(extract(epoch from (clock_timestamp() - p_cutoff))) > 120 then
    raise exception 'Saved Hangouts unavailable' using errcode = '42501';
  end if;
  perform 1 from private.hangout_feature_gate where singleton for share;
  campus := private.ready_campus();
  if campus is null then raise exception 'Saved Hangouts unavailable' using errcode = '42501'; end if;
  select enabled, ranking_epoch into gate_enabled, gate_epoch
    from private.large_hangout_feature_gate where singleton for share;
  if gate_epoch is null or not private.hangouts_enabled() then
    raise exception 'Saved Hangouts unavailable' using errcode = '42501';
  end if;
  with candidates as materialized (
    select h.id, h.title, h.description, h.starts_at, h.ends_at,
      h.public_place, h.public_latitude, h.public_longitude,
      h.campus_zone, h.joining_state
    from public.hangouts h
    where h.university_id = campus and h.status = 'published' and h.visibility = 'campus'
      and h.public_longitude between p_west and p_east
      and h.public_latitude between p_south and p_north
      and (p_time_filter = 'all' or h.starts_at >= p_cutoff)
      and (p_joining_filter = 'any' or h.joining_state = 'open')
      and private.can_read_hangout(h.id)
  ), ranked as (
    select c.*, case when gate_enabled then (
      select count(*) >= 25 from public.hangout_participants p
      where p.hangout_id = c.id and p.state = 'joined'
        and private.can_read_hangout_roster(c.id, p.account_id)
    ) else false end as visible_large
    from candidates c
  ), probe as (
    select * from ranked order by visible_large, starts_at, id limit 101
  ), ordered as (
    select row_number() over (order by visible_large, starts_at, id) as ordinal,
      jsonb_build_object(
        'id', id, 'title', title, 'description', description,
        'starts_at', starts_at, 'ends_at', ends_at,
        'public_place', public_place, 'public_latitude', public_latitude,
        'public_longitude', public_longitude, 'campus_zone', campus_zone,
        'joining_state', joining_state) as pin from probe
  )
  select jsonb_build_object('pins', coalesce(jsonb_agg(pin order by ordinal), '[]'::jsonb),
    'epoch', gate_epoch,
    'ranking_mode', case when gate_enabled then 'small_first' else 'chronological' end)
    into result from ordered;
  return result;
end;
$$;
revoke all on function public.query_saved_hangouts(double precision,double precision,double precision,double precision,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.query_saved_hangouts(double precision,double precision,double precision,double precision,text,text,timestamptz)
  to authenticated;

commit;
