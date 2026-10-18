-- TASK-032P8 / Proposed ADR-0041: owner-only attention over the existing ledger.
begin;

create function public.get_notification_attention()
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
  ), clock_timestamp();
end; $$;

create function public.acknowledge_notification_attention(p_cutoff timestamptz)
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

revoke all on function public.get_notification_attention(),
  public.acknowledge_notification_attention(timestamptz) from public,anon,authenticated;
grant execute on function public.get_notification_attention(),
  public.acknowledge_notification_attention(timestamptz) to authenticated;
commit;
