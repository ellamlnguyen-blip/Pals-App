-- Accepted ADR-0016: disposable-local, private direct-message consent.
begin;

create table private.dm_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into private.dm_feature_gate(singleton, enabled) values (true, false);

create table private.dm_pairs (
  generation_id uuid primary key default gen_random_uuid(),
  low_id uuid not null references public.accounts(id) on delete cascade,
  high_id uuid not null references public.accounts(id) on delete cascade,
  initiator_id uuid not null references public.accounts(id) on delete cascade,
  campus_id uuid not null references public.universities(id),
  state text not null default 'pending' check (state in
    ('pending','accepted','ignored','withdrawn','closed','blocked')),
  created_at timestamptz not null default clock_timestamp(),
  next_sequence bigint not null default 1 check (next_sequence > 0),
  check (low_id < high_id),
  check (initiator_id in (low_id,high_id))
);
create unique index dm_one_active_pair on private.dm_pairs(low_id,high_id)
  where state in ('pending','accepted');
create index dm_inbox_low on private.dm_pairs(low_id,created_at,generation_id)
  where state in ('pending','accepted');
create index dm_inbox_high on private.dm_pairs(high_id,created_at,generation_id)
  where state in ('pending','accepted');

create table private.dm_messages (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references private.dm_pairs(generation_id) on delete cascade,
  sequence bigint not null check (sequence > 0),
  author_id uuid not null references public.accounts(id) on delete cascade,
  body text not null check (body = private.profile_trim(body) and length(body) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp(),
  unique(generation_id,sequence)
);
create table private.dm_retries (
  actor_id uuid not null references public.accounts(id) on delete cascade,
  request_id uuid not null,
  kind text not null check (kind in ('create','reply','send')),
  target_id uuid not null references public.accounts(id) on delete cascade,
  generation_id uuid not null references private.dm_pairs(generation_id) on delete cascade,
  message_id uuid not null unique references private.dm_messages(id) on delete cascade,
  fingerprint text not null,
  primary key(actor_id,request_id)
);
create table private.dm_suppression (
  initiator_id uuid not null references public.accounts(id) on delete cascade,
  recipient_id uuid not null references public.accounts(id) on delete cascade,
  primary key(initiator_id,recipient_id),
  check (initiator_id <> recipient_id)
);
alter table private.dm_feature_gate enable row level security;
alter table private.dm_pairs enable row level security;
alter table private.dm_messages enable row level security;
alter table private.dm_retries enable row level security;
alter table private.dm_suppression enable row level security;
revoke all on private.dm_feature_gate,private.dm_pairs,private.dm_messages,
  private.dm_retries,private.dm_suppression from public,anon,authenticated;

create function private.dm_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'postgres' and current_setting('dm.allow_fixture_cleanup',true) = 'true' then
    return old;
  end if;
  raise exception 'DM evidence is immutable' using errcode = '23514';
end;
$$;
create trigger dm_immutable_message before update or delete on private.dm_messages
  for each row execute function private.dm_immutable();
create trigger dm_immutable_retry before update or delete on private.dm_retries
  for each row execute function private.dm_immutable();
revoke all on function private.dm_immutable() from public,anon,authenticated;

create function private.dm_enabled() returns boolean
language sql volatile security definer set search_path = '' as $$
  select exists(select 1 from private.dm_feature_gate where singleton and enabled);
$$;
-- Both principals must still satisfy the current People projection. This
-- deliberately does not use friendship or a stored campus as authority.
create function private.dm_eligible(p_peer uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare campus uuid;
begin
  campus := private.people_ready_campus();
  return coalesce(private.dm_enabled() and private.people_enabled()
    and private.people_active_owner() and campus is not null
    and exists(select 1 from private.people_preferences v
      where v.account_id = auth.uid() and v.opted_in)
    and private.people_visible(p_peer,campus),false);
end;
$$;
-- Pair lock precedes this helper. FOR SHARE conflicts with revoking updates
-- and deletes. A later statement rechecks eligibility at READ COMMITTED.
create function private.dm_lock_evidence(p_actor uuid,p_peer uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare subject uuid; campus uuid; photo_path text;
begin
  perform 1 from private.dm_feature_gate where singleton for share;
  perform 1 from private.people_feature_gate where singleton for share;
  for subject in select id from (values(p_actor),(p_peer)) v(id) order by id loop
    perform 1 from public.accounts where id=subject for share;
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
    perform 1 from auth.users where id=subject for share;
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
    select university_id into campus from public.university_memberships
      where user_id=subject for share;
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
    perform 1 from public.universities where id=campus for share;
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
    select primary_photo_path into photo_path from public.profiles
      where user_id=subject for share;
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
    perform 1 from storage.objects where bucket_id='profile-photos'
      and name=photo_path and owner_id=subject::text for share;
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
    perform 1 from private.people_preferences where account_id=subject for share;
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
  end loop;
end;
$$;
create function private.dm_active_caller() returns boolean
language sql volatile security definer set search_path = '' as $$
  select auth.uid() is not null and private.people_active_owner();
$$;
revoke all on function private.dm_enabled(),private.dm_eligible(uuid),
  private.dm_lock_evidence(uuid,uuid),private.dm_active_caller()
  from public,anon,authenticated;

create function public.create_dm_request(p_target_id uuid,p_request_id uuid,p_body text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); normalized text; fingerprint text;
  old_retry private.dm_retries%rowtype; pair private.dm_pairs%rowtype; message_id uuid;
begin
  perform private.people_require_read_committed();
  if actor is null or p_target_id is null or actor=p_target_id or p_request_id is null
     or p_body is null then raise exception 'DM unavailable' using errcode='42501'; end if;
  normalized := private.profile_trim(p_body);
  if length(normalized) not between 1 and 2000 then
    raise exception 'Invalid DM body' using errcode='22023'; end if;
  fingerprint := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(normalized,'UTF8')),'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'dm-request:'||actor::text||':'||p_request_id::text,0));
  perform private.friendship_lock_pair(actor,p_target_id);
  perform private.dm_lock_evidence(actor,p_target_id);
  if not private.dm_eligible(p_target_id) then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  select * into old_retry from private.dm_retries r
    where r.actor_id=actor and r.request_id=p_request_id;
  if found then
    if old_retry.kind <> 'create' or old_retry.target_id <> p_target_id
       or old_retry.fingerprint <> fingerprint then
      raise exception 'DM request conflict' using errcode='23505'; end if;
    select * into pair from private.dm_pairs d where d.generation_id=old_retry.generation_id
      and d.state in ('pending','accepted');
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
    return pair.generation_id;
  end if;
  if exists(select 1 from private.dm_suppression s
       where s.initiator_id=actor and s.recipient_id=p_target_id)
     or exists(select 1 from private.dm_pairs d
       where d.low_id=least(actor,p_target_id) and d.high_id=greatest(actor,p_target_id)
         and d.state in ('pending','accepted')) then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  insert into private.dm_pairs(low_id,high_id,initiator_id,campus_id,next_sequence)
    values(least(actor,p_target_id),greatest(actor,p_target_id),actor,
      private.people_ready_campus(),2) returning * into pair;
  insert into private.dm_messages(generation_id,sequence,author_id,body)
    values(pair.generation_id,1,actor,normalized) returning id into message_id;
  insert into private.dm_retries(actor_id,request_id,kind,target_id,generation_id,message_id,fingerprint)
    values(actor,p_request_id,'create',p_target_id,pair.generation_id,message_id,fingerprint);
  return pair.generation_id;
end;
$$;

create function public.transition_dm(p_peer_id uuid,p_generation_id uuid,p_action text,
  p_reply_request_id uuid default null,p_reply_body text default null)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); pair private.dm_pairs%rowtype;
  normalized text; message_id uuid; fingerprint text; old_retry private.dm_retries%rowtype;
begin
  perform private.people_require_read_committed();
  if actor is null or p_peer_id is null or p_peer_id=actor or p_generation_id is null
    or p_action is null or p_action not in ('accept','reply','ignore','withdraw','close')
    or not private.dm_enabled() or not private.dm_active_caller() then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  if p_action='reply' and p_reply_request_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'dm-request:'||actor::text||':'||p_reply_request_id::text,0));
  end if;
  perform private.friendship_lock_pair(actor,p_peer_id);
  if p_action in ('accept','reply') then
    perform private.dm_lock_evidence(actor,p_peer_id);
  end if;
  if not private.dm_enabled() or not private.dm_active_caller() then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  select * into pair from private.dm_pairs d where d.generation_id=p_generation_id
    and d.low_id=least(actor,p_peer_id) and d.high_id=greatest(actor,p_peer_id)
    and d.state in ('pending','accepted');
  if p_action='reply' and p_reply_request_id is not null and p_reply_body is not null then
    normalized := private.profile_trim(p_reply_body);
    if length(normalized) not between 1 and 2000 then
      raise exception 'Invalid DM body' using errcode='22023'; end if;
    fingerprint := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(normalized,'UTF8')),'hex');
    select * into old_retry from private.dm_retries r
      where r.actor_id=actor and r.request_id=p_reply_request_id;
    if found then
      if old_retry.kind <> 'reply' or old_retry.target_id <> p_peer_id
        or old_retry.generation_id <> p_generation_id or old_retry.fingerprint <> fingerprint then
        raise exception 'DM request conflict' using errcode='23505'; end if;
      if pair.generation_id is null or pair.state <> 'accepted'
        or not private.dm_eligible(p_peer_id) then
        raise exception 'DM unavailable' using errcode='42501'; end if;
      return true;
    end if;
  end if;
  if pair.generation_id is null or not ((p_action in ('accept','reply','ignore') and pair.state='pending'
        and pair.initiator_id=p_peer_id)
      or (p_action='withdraw' and pair.state='pending' and pair.initiator_id=actor)
      or (p_action='close' and pair.state='accepted')) then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  if p_action in ('accept','reply') then
    if not private.dm_eligible(p_peer_id) or private.people_ready_campus() <> pair.campus_id then
      raise exception 'DM unavailable' using errcode='42501'; end if;
    if p_action='reply' then
      if p_reply_request_id is null or p_reply_body is null then
        raise exception 'Invalid DM body' using errcode='22023'; end if;
      normalized := private.profile_trim(p_reply_body);
      if length(normalized) not between 1 and 2000 then
        raise exception 'Invalid DM body' using errcode='22023'; end if;
      insert into private.dm_messages(generation_id,sequence,author_id,body)
        values(pair.generation_id,pair.next_sequence,actor,normalized) returning id into message_id;
      update private.dm_pairs d set next_sequence=next_sequence+1
        where d.generation_id=pair.generation_id;
      insert into private.dm_retries(actor_id,request_id,kind,target_id,generation_id,message_id,fingerprint)
        values(actor,p_reply_request_id,'reply',p_peer_id,pair.generation_id,message_id,
          pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(normalized,'UTF8')),'hex'));
    elsif p_reply_request_id is not null or p_reply_body is not null then
      raise exception 'DM unavailable' using errcode='42501';
    end if;
    update private.dm_pairs d set state='accepted' where d.generation_id=pair.generation_id;
  else
    update private.dm_pairs d set state=case p_action when 'ignore' then 'ignored'
      when 'withdraw' then 'withdrawn' else 'closed' end
      where d.generation_id=pair.generation_id;
    insert into private.dm_suppression(initiator_id,recipient_id)
      values(pair.initiator_id,case when pair.initiator_id=pair.low_id
        then pair.high_id else pair.low_id end) on conflict do nothing;
  end if;
  return true;
end;
$$;

create function public.send_dm_message(p_peer_id uuid,p_generation_id uuid,
  p_request_id uuid,p_body text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); normalized text; fingerprint text;
  pair private.dm_pairs%rowtype; old_retry private.dm_retries%rowtype; message_id uuid;
begin
  perform private.people_require_read_committed();
  if actor is null or p_peer_id is null or p_peer_id=actor or p_generation_id is null
     or p_request_id is null or p_body is null then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  normalized := private.profile_trim(p_body);
  if length(normalized) not between 1 and 2000 then
    raise exception 'Invalid DM body' using errcode='22023'; end if;
  fingerprint := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(normalized,'UTF8')),'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'dm-request:'||actor::text||':'||p_request_id::text,0));
  perform private.friendship_lock_pair(actor,p_peer_id);
  perform private.dm_lock_evidence(actor,p_peer_id);
  if not private.dm_eligible(p_peer_id) then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  select * into pair from private.dm_pairs d where d.generation_id=p_generation_id
    and d.low_id=least(actor,p_peer_id) and d.high_id=greatest(actor,p_peer_id)
    and d.state='accepted';
  if not found or pair.campus_id <> private.people_ready_campus() then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  select * into old_retry from private.dm_retries r where r.actor_id=actor and r.request_id=p_request_id;
  if found then
    if old_retry.kind <> 'send' or old_retry.target_id <> p_peer_id
      or old_retry.generation_id <> p_generation_id or old_retry.fingerprint <> fingerprint then
      raise exception 'DM request conflict' using errcode='23505'; end if;
    return old_retry.message_id;
  end if;
  insert into private.dm_messages(generation_id,sequence,author_id,body)
    values(pair.generation_id,pair.next_sequence,actor,normalized) returning id into message_id;
  update private.dm_pairs d set next_sequence=next_sequence+1 where d.generation_id=pair.generation_id;
  insert into private.dm_retries(actor_id,request_id,kind,target_id,generation_id,message_id,fingerprint)
    values(actor,p_request_id,'send',p_peer_id,pair.generation_id,message_id,fingerprint);
  return message_id;
end;
$$;

-- The guard and each projection execute in one statement snapshot. A null
-- peer and no active generation return the same empty result.
create function private.dm_require() returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' or auth.uid() is null
    or not private.dm_enabled() or not private.dm_active_caller() then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  return true;
end;
$$;
revoke all on function private.dm_require() from public,anon,authenticated;

create function public.get_dm_status(p_peer_id uuid)
returns table(peer_id uuid,generation_id uuid,direction text,state text)
language sql volatile security definer set search_path = '' as $$
  with guard as materialized (select private.dm_require() allowed)
  select p_peer_id,d.generation_id,
    case when d.initiator_id=auth.uid() then 'outgoing' else 'incoming' end,d.state
  from guard g join private.dm_pairs d on g.allowed
    and d.low_id=least(auth.uid(),p_peer_id) and d.high_id=greatest(auth.uid(),p_peer_id)
    and d.state in ('pending','accepted');
$$;
create function public.list_dm_inbox(p_after_created_at timestamptz default null,
  p_after_generation_id uuid default null,p_limit integer default 24)
returns table(peer_id uuid,generation_id uuid,direction text,state text,
  created_at timestamptz,first_body text)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit not between 1 and 24 or
    ((p_after_created_at is null) <> (p_after_generation_id is null)) then
    raise exception 'Invalid DM page' using errcode='22023'; end if;
  return query with guard as materialized (select private.dm_require() allowed)
  select case when d.low_id=auth.uid() then d.high_id else d.low_id end,
    d.generation_id,case when d.initiator_id=auth.uid() then 'outgoing' else 'incoming' end,
    d.state,d.created_at,
    case when d.state='pending' and d.initiator_id<>auth.uid()
      and private.dm_eligible(d.initiator_id) then m.body else null::text end
  from guard g join private.dm_pairs d on g.allowed
    and (d.low_id=auth.uid() or d.high_id=auth.uid())
    and d.state in ('pending','accepted')
  left join private.dm_messages m on m.generation_id=d.generation_id and m.sequence=1
  where p_after_created_at is null or (d.created_at,d.generation_id) <
    (p_after_created_at,p_after_generation_id)
  order by d.created_at desc,d.generation_id desc limit p_limit;
end;
$$;
create function public.read_dm_messages(p_peer_id uuid,p_generation_id uuid,
  p_after_sequence bigint default null,p_limit integer default 50)
returns table(message_id uuid,sequence bigint,body text,created_at timestamptz,mine boolean)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit not between 1 and 50
     or (p_after_sequence is not null and p_after_sequence < 1) then
    raise exception 'Invalid DM page' using errcode='22023'; end if;
  return query with guard as materialized (select private.dm_require() allowed)
  select m.id,m.sequence,m.body,m.created_at,m.author_id=auth.uid()
  from guard g join private.dm_pairs d on g.allowed
    and d.generation_id=p_generation_id and d.state in ('pending','accepted')
    and d.low_id=least(auth.uid(),p_peer_id) and d.high_id=greatest(auth.uid(),p_peer_id)
    and (d.state='accepted' or d.initiator_id<>auth.uid())
    and private.dm_eligible(p_peer_id)
  join private.dm_messages m on m.generation_id=d.generation_id
    and (p_after_sequence is null or m.sequence > p_after_sequence)
  order by m.sequence limit p_limit;
end;
$$;
revoke all on function public.create_dm_request(uuid,uuid,text),
  public.transition_dm(uuid,uuid,text,uuid,text),public.send_dm_message(uuid,uuid,uuid,text),
  public.get_dm_status(uuid),public.list_dm_inbox(timestamptz,uuid,integer),
  public.read_dm_messages(uuid,uuid,bigint,integer) from public,anon,authenticated;
grant execute on function public.create_dm_request(uuid,uuid,text),
  public.transition_dm(uuid,uuid,text,uuid,text),public.send_dm_message(uuid,uuid,uuid,text),
  public.get_dm_status(uuid),public.list_dm_inbox(timestamptz,uuid,integer),
  public.read_dm_messages(uuid,uuid,bigint,integer) to authenticated;

-- Preserve People and friendship behavior, adding only active-DM participation
-- as a hidden-target block exception and an atomic DM terminal transition.
create or replace function public.set_people_block(p_account_id uuid,p_blocked boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); campus uuid; has_pair boolean;
begin
  perform private.people_require_read_committed();
  if actor is null or p_account_id is null or p_account_id=actor or p_blocked is null
    or not private.people_enabled() then
    raise exception 'People operation unavailable' using errcode='42501'; end if;
  perform private.friendship_lock_pair(actor,p_account_id);
  if not private.people_enabled() or not private.people_active_owner() then
    raise exception 'People operation unavailable' using errcode='42501'; end if;
  if p_blocked then
    campus := private.people_ready_campus();
    select exists(select 1 from private.friendships f
      where f.low_id=least(actor,p_account_id) and f.high_id=greatest(actor,p_account_id))
      or exists(select 1 from private.dm_pairs d
      where d.low_id=least(actor,p_account_id) and d.high_id=greatest(actor,p_account_id)
        and d.state in ('pending','accepted')) into has_pair;
    if campus is null or (not exists(select 1 from private.people_blocks b
        where b.blocker_id=actor and b.blocked_id=p_account_id)
      and not has_pair and not private.people_visible(p_account_id,campus)) then
      raise exception 'People operation unavailable' using errcode='42501'; end if;
    insert into private.people_blocks(blocker_id,blocked_id)
      values(actor,p_account_id) on conflict do nothing;
    delete from private.friendships f where f.low_id=least(actor,p_account_id)
      and f.high_id=greatest(actor,p_account_id);
    update private.dm_pairs d set state='blocked' where d.low_id=least(actor,p_account_id)
      and d.high_id=greatest(actor,p_account_id) and d.state in ('pending','accepted');
  else
    delete from private.people_blocks b where b.blocker_id=actor and b.blocked_id=p_account_id;
  end if;
  return p_blocked;
end;
$$;
commit;
