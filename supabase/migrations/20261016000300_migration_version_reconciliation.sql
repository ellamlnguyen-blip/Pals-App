-- TASK-039E / ADR-0046: reconcile both meanings of historical ledger version
-- 20261014000100. Keep the original saved-mask migration byte-for-byte;
-- restore the missing acknowledgment RPC and reassert current function bodies.
-- Existing notification rows, saved Hangouts and migration ledger are untouched.
begin;

create or replace function public.acknowledge_notification_attention(p_cutoff timestamptz)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
  perform private.people_require_read_committed();
  owner_id := auth.uid();
  if owner_id is null then
    raise exception 'Notifications unavailable' using errcode='42501';
  end if;
  perform 1 from private.notification_feature_gate where singleton for share;
  perform private.notification_lock_recipient(owner_id);
  if not private.notification_enabled() or not private.people_active_owner() then
    raise exception 'Notifications unavailable' using errcode='42501';
  end if;
  if p_cutoff is null or p_cutoff > clock_timestamp() then
    raise exception 'Invalid notification boundary' using errcode='22023';
  end if;
  update private.notification_items n
    set read_at=clock_timestamp()
    where n.recipient_id=owner_id and n.read_at is null
      and n.created_at <= p_cutoff;
  return true;
end; $$;


create or replace function public.get_notification_attention()
returns table(unread boolean, cutoff timestamptz)
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
  perform private.people_require_read_committed();
  owner_id := auth.uid();
  if owner_id is null then
    raise exception 'Notifications unavailable' using errcode='42501';
  end if;
  perform 1 from private.notification_feature_gate where singleton for share;
  perform private.notification_lock_recipient(owner_id);
  if not private.notification_enabled() or not private.people_active_owner() then
    raise exception 'Notifications unavailable' using errcode='42501';
  end if;
  -- Emission also holds the recipient lock. Its created_at is assigned after
  -- that lock, so a later arrival is strictly beyond this server boundary.
  return query select exists(
    select 1 from private.notification_items n
    where n.recipient_id=owner_id and n.read_at is null
      and (n.source_kind<>'dm' or (n.event_code='dm_message'
       and private.dm_enabled() and private.people_enabled()
       and private.dm_eligible(n.actor_id)
       and private.dm_current_consent(n.target_id,owner_id,n.actor_id)
       and exists(select 1 from private.dm_messages m where m.id=n.source_id
        and m.generation_id=n.target_id and m.author_id=n.actor_id)))
  ), clock_timestamp();
end; $$;

create or replace function public.query_saved_hangouts(
  p_west double precision, p_south double precision,
  p_east double precision, p_north double precision,
  p_time_filter text, p_joining_filter text, p_cutoff timestamptz
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare gate_enabled boolean; gate_epoch uuid; campus uuid; result jsonb;
  local_day date; tomorrow_start timestamptz; day_after_start timestamptz;
  next_monday_start timestamptz; later_start timestamptz;
begin
  if auth.uid() is null or current_setting('transaction_isolation') <> 'read committed'
    or p_west is null or p_south is null or p_east is null or p_north is null
    or p_west < -79.13 or p_east > -78.98 or p_south < 35.85 or p_north > 35.97
    or not (p_west < p_east and p_south < p_north)
    or p_time_filter is null
    or not (p_time_filter in ('upcoming', 'all')
      or (length(p_time_filter) = 4 and translate(p_time_filter, '01', '') = ''))
    or p_joining_filter not in ('any', 'open') or p_joining_filter is null
    or p_cutoff is null or not isfinite(p_cutoff)
    or abs(extract(epoch from (clock_timestamp() - p_cutoff))) > 120 then
    raise exception 'Saved Hangouts unavailable' using errcode = '42501';
  end if;
  local_day := (p_cutoff at time zone 'America/New_York')::date;
  tomorrow_start := (local_day + 1)::timestamp at time zone 'America/New_York';
  day_after_start := (local_day + 2)::timestamp at time zone 'America/New_York';
  next_monday_start := (local_day + (8 - extract(isodow from local_day)::integer))::timestamp
    at time zone 'America/New_York';
  later_start := greatest(day_after_start, next_monday_start);
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
      and (p_time_filter = 'all'
        or (p_time_filter = 'upcoming' and h.starts_at >= p_cutoff)
        or (length(p_time_filter) = 4 and h.starts_at >= p_cutoff and (
          (substr(p_time_filter, 1, 1) = '1' and h.starts_at < tomorrow_start)
          or (substr(p_time_filter, 2, 1) = '1' and h.starts_at >= tomorrow_start
            and h.starts_at < day_after_start)
          or (substr(p_time_filter, 3, 1) = '1' and h.starts_at >= day_after_start
            and h.starts_at < next_monday_start)
          or (substr(p_time_filter, 4, 1) = '1' and h.starts_at >= later_start)
        )))
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
-- Preserve the exact established function privilege boundary.
revoke all on function public.query_saved_hangouts(double precision,double precision,double precision,double precision,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.query_saved_hangouts(double precision,double precision,double precision,double precision,text,text,timestamptz)
  to authenticated;

revoke all on function public.get_notification_attention(),
  public.acknowledge_notification_attention(timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_notification_attention(),
  public.acknowledge_notification_attention(timestamptz)
  to authenticated;
commit;
