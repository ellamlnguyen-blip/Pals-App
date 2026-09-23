-- ADR-0014: disposable-local mutual friendship, disabled after every reset.
begin;

create table private.friendship_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into private.friendship_feature_gate(singleton, enabled) values (true, false);
alter table private.friendship_feature_gate enable row level security;
revoke all on private.friendship_feature_gate from public, anon, authenticated;

create table private.friendships (
  low_id uuid not null references public.accounts(id) on delete cascade,
  high_id uuid not null references public.accounts(id) on delete cascade,
  requester_id uuid not null references public.accounts(id) on delete cascade,
  campus_id uuid not null references public.universities(id),
  generation_id uuid not null default gen_random_uuid(),
  state text not null default 'pending' check (state in ('pending','accepted')),
  primary key (low_id, high_id),
  unique (generation_id),
  check (low_id < high_id),
  check (requester_id in (low_id, high_id))
);
create index friendships_high_id_idx on private.friendships(high_id, low_id);
alter table private.friendships enable row level security;
revoke all on private.friendships from public, anon, authenticated;

-- Retain creation identity after any relationship teardown. One caller/key has
-- one immutable target and generation; a stale retry cannot create again.
create table private.friendship_create_requests (
  actor_id uuid not null references public.accounts(id) on delete cascade,
  request_id uuid not null,
  target_id uuid not null references public.accounts(id) on delete cascade,
  generation_id uuid not null,
  primary key (actor_id, request_id),
  unique (generation_id),
  check (actor_id <> target_id)
);
alter table private.friendship_create_requests enable row level security;
revoke all on private.friendship_create_requests from public, anon, authenticated;

create table private.friendship_suppression (
  requester_id uuid not null references public.accounts(id) on delete cascade,
  recipient_id uuid not null references public.accounts(id) on delete cascade,
  primary key (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);
alter table private.friendship_suppression enable row level security;
revoke all on private.friendship_suppression from public, anon, authenticated;

create function private.friendship_enabled() returns boolean
language sql volatile security definer set search_path = '' as $$
  select exists(select 1 from private.friendship_feature_gate g where g.singleton and g.enabled);
$$;

create function private.friendship_lock_pair(a uuid, b uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    least(a::text,b::text) || ':' || greatest(a::text,b::text), 0));
end;
$$;

create function private.friendship_eligible(target uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare campus uuid;
begin
  campus := private.people_ready_campus();
  return coalesce(private.people_enabled() and campus is not null
    and exists(select 1 from private.people_preferences p
      where p.account_id = auth.uid() and p.opted_in)
    and private.people_visible(target, campus), false);
end;
$$;

-- Hold every row that can revoke current People eligibility until commit.
-- The caller first takes the unordered-pair lock, then these shared row locks;
-- all eligibility predicates are evaluated again in a later statement.
create function private.friendship_lock_eligibility(actor uuid, target uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare subject uuid;
declare campus uuid;
declare photo_path text;
begin
  perform 1 from private.people_feature_gate g where g.singleton for share;
  perform 1 from private.friendship_feature_gate g where g.singleton for share;
  for subject in select id from (values(actor),(target)) v(id) order by id loop
    perform 1 from public.accounts a where a.id = subject for share;
    if not found then raise exception 'Friendship unavailable' using errcode = '42501'; end if;
    perform 1 from auth.users u where u.id = subject for share;
    if not found then raise exception 'Friendship unavailable' using errcode = '42501'; end if;
    select m.university_id into campus from public.university_memberships m
      where m.user_id = subject for share;
    if not found then raise exception 'Friendship unavailable' using errcode = '42501'; end if;
    perform 1 from public.universities c where c.id = campus for share;
    if not found then raise exception 'Friendship unavailable' using errcode = '42501'; end if;
    select p.primary_photo_path into photo_path from public.profiles p
      where p.user_id = subject for share;
    if not found then raise exception 'Friendship unavailable' using errcode = '42501'; end if;
    perform 1 from storage.objects o where o.bucket_id = 'profile-photos'
      and o.name = photo_path and o.owner_id = subject::text for share;
    if not found then raise exception 'Friendship unavailable' using errcode = '42501'; end if;
    perform 1 from private.people_preferences v where v.account_id = subject for share;
    if not found then raise exception 'Friendship unavailable' using errcode = '42501'; end if;
  end loop;
end;
$$;
revoke all on function private.friendship_enabled(), private.friendship_lock_pair(uuid,uuid),
  private.friendship_eligible(uuid), private.friendship_lock_eligibility(uuid,uuid)
  from public, anon, authenticated;

create function public.create_friend_request(p_target_id uuid, p_request_id uuid)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
declare old_request private.friendship_create_requests%rowtype;
declare existing private.friendships%rowtype;
declare new_generation uuid;
begin
  perform private.people_require_read_committed();
  if actor is null or p_target_id is null or p_target_id = actor or p_request_id is null
    or not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  -- Serialize retries of one creation key before locking the unordered pair.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'friendship-request:' || actor::text || ':' || p_request_id::text, 0));
  perform private.friendship_lock_pair(actor, p_target_id);
  perform private.friendship_lock_eligibility(actor, p_target_id);
  if not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  select * into old_request from private.friendship_create_requests r
    where r.actor_id = actor and r.request_id = p_request_id;
  if found then
    if old_request.target_id <> p_target_id then
      raise exception 'Friendship unavailable' using errcode = '42501';
    end if;
    select * into existing from private.friendships f
      where f.low_id = least(actor,p_target_id) and f.high_id = greatest(actor,p_target_id)
        and f.generation_id = old_request.generation_id;
    if not found or not private.friendship_eligible(p_target_id) then
      raise exception 'Friendship unavailable' using errcode = '42501';
    end if;
    return existing.generation_id;
  end if;
  if not private.friendship_eligible(p_target_id)
    or exists(select 1 from private.friendship_suppression s
      where s.requester_id = actor and s.recipient_id = p_target_id)
    or exists(select 1 from private.friendships f
      where f.low_id = least(actor,p_target_id) and f.high_id = greatest(actor,p_target_id)) then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  new_generation := gen_random_uuid();
  insert into private.friendships(low_id,high_id,requester_id,campus_id,generation_id)
    values(least(actor,p_target_id),greatest(actor,p_target_id),actor,
      private.people_ready_campus(),new_generation);
  insert into private.friendship_create_requests(actor_id,request_id,target_id,generation_id)
    values(actor,p_request_id,p_target_id,new_generation);
  return new_generation;
end;
$$;

create function public.list_friendships(p_after_peer_id uuid default null, p_limit integer default 24)
returns table(peer_id uuid, generation_id uuid, direction text, state text)
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  perform private.people_require_read_committed();
  if p_limit is null or p_limit not between 1 and 24 then
    raise exception 'Invalid friendship page size' using errcode = '22023';
  end if;
  if actor is null or not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  return query select case when f.low_id = actor then f.high_id else f.low_id end,
    f.generation_id,
    case when f.requester_id = actor then 'outgoing' else 'incoming' end,
    f.state
  from private.friendships f where (f.low_id = actor or f.high_id = actor)
    and (p_after_peer_id is null or
      (case when f.low_id = actor then f.high_id else f.low_id end) > p_after_peer_id)
  order by 1 limit p_limit;
end;
$$;

create function public.get_friendship(p_peer_id uuid)
returns table(peer_id uuid, generation_id uuid, direction text, state text)
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  perform private.people_require_read_committed();
  if actor is null or not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  return query select p_peer_id,f.generation_id,
    case when f.requester_id = actor then 'outgoing' else 'incoming' end,f.state
    from private.friendships f
    where p_peer_id is not null and f.low_id = least(actor,p_peer_id)
      and f.high_id = greatest(actor,p_peer_id);
end;
$$;

create function public.transition_friendship(p_peer_id uuid, p_generation_id uuid, p_action text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
declare pair private.friendships%rowtype;
begin
  perform private.people_require_read_committed();
  if actor is null or p_peer_id is null or actor = p_peer_id or p_generation_id is null
    or p_action not in ('accept','decline','cancel','unfriend') or p_action is null
    or not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  perform private.friendship_lock_pair(actor,p_peer_id);
  if p_action = 'accept' then
    perform private.friendship_lock_eligibility(actor,p_peer_id);
  end if;
  if not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  select * into pair from private.friendships f
    where f.low_id = least(actor,p_peer_id) and f.high_id = greatest(actor,p_peer_id)
      and f.generation_id = p_generation_id;
  if not found or not (
    (p_action = 'accept' and pair.state = 'pending' and pair.requester_id = p_peer_id)
    or (p_action = 'decline' and pair.state = 'pending' and pair.requester_id = p_peer_id)
    or (p_action = 'cancel' and pair.state = 'pending' and pair.requester_id = actor)
    or (p_action = 'unfriend' and pair.state = 'accepted')) then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  if p_action = 'accept' then
    if not private.friendship_eligible(p_peer_id)
      or private.people_ready_campus() <> pair.campus_id then
      raise exception 'Friendship unavailable' using errcode = '42501';
    end if;
    update private.friendships f set state = 'accepted'
      where f.low_id = pair.low_id and f.high_id = pair.high_id;
  else
    delete from private.friendships f where f.low_id = pair.low_id and f.high_id = pair.high_id;
    if p_action in ('decline','cancel') then
      insert into private.friendship_suppression(requester_id,recipient_id)
        values(pair.requester_id,case when pair.requester_id = pair.low_id
          then pair.high_id else pair.low_id end) on conflict do nothing;
    end if;
  end if;
  return true;
end;
$$;

create function public.accept_friend_request(p_peer_id uuid, p_generation_id uuid)
returns boolean language sql volatile security definer set search_path = '' as $$
  select public.transition_friendship(p_peer_id,p_generation_id,'accept');
$$;
create function public.decline_friend_request(p_peer_id uuid, p_generation_id uuid)
returns boolean language sql volatile security definer set search_path = '' as $$
  select public.transition_friendship(p_peer_id,p_generation_id,'decline');
$$;
create function public.cancel_friend_request(p_peer_id uuid, p_generation_id uuid)
returns boolean language sql volatile security definer set search_path = '' as $$
  select public.transition_friendship(p_peer_id,p_generation_id,'cancel');
$$;
create function public.unfriend(p_peer_id uuid, p_generation_id uuid)
returns boolean language sql volatile security definer set search_path = '' as $$
  select public.transition_friendship(p_peer_id,p_generation_id,'unfriend');
$$;

revoke all on function public.create_friend_request(uuid,uuid), public.list_friendships(uuid,integer),
  public.get_friendship(uuid), public.transition_friendship(uuid,uuid,text),
  public.accept_friend_request(uuid,uuid), public.decline_friend_request(uuid,uuid),
  public.cancel_friend_request(uuid,uuid), public.unfriend(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.create_friend_request(uuid,uuid), public.list_friendships(uuid,integer),
  public.get_friendship(uuid), public.accept_friend_request(uuid,uuid),
  public.decline_friend_request(uuid,uuid), public.cancel_friend_request(uuid,uuid),
  public.unfriend(uuid,uuid) to authenticated;

-- Retain the exact People gate/caller rules; current pair participation adds
-- only a target-visibility exception and block tears down that pair atomically.
create or replace function public.set_people_block(p_account_id uuid, p_blocked boolean) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
declare campus uuid;
declare has_pair boolean;
begin
  perform private.people_require_read_committed();
  if actor is null or p_account_id is null or p_account_id = actor or p_blocked is null
    or not private.people_enabled() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  perform private.friendship_lock_pair(actor,p_account_id);
  if not private.people_enabled() or not private.people_active_owner() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  if p_blocked then
    campus := private.people_ready_campus();
    select exists(select 1 from private.friendships f
      where f.low_id = least(actor,p_account_id) and f.high_id = greatest(actor,p_account_id))
      into has_pair;
    if campus is null or
      (not exists(select 1 from private.people_blocks b
        where b.blocker_id = actor and b.blocked_id = p_account_id)
       and not has_pair and not private.people_visible(p_account_id,campus)) then
      raise exception 'People operation unavailable' using errcode = '42501';
    end if;
    insert into private.people_blocks(blocker_id,blocked_id)
      values(actor,p_account_id) on conflict do nothing;
    delete from private.friendships f
      where f.low_id = least(actor,p_account_id) and f.high_id = greatest(actor,p_account_id);
  else
    delete from private.people_blocks b
      where b.blocker_id = actor and b.blocked_id = p_account_id;
  end if;
  return p_blocked;
end;
$$;

commit;
