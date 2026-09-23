-- Accepted ADR-0015. Disposable-local, caller-bound Hangout text only.
begin;

create table private.hangout_chat_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into private.hangout_chat_feature_gate(singleton, enabled) values (true, false);

create table private.hangout_conversations (
  id uuid primary key default gen_random_uuid(),
  hangout_id uuid not null unique references public.hangouts(id),
  next_sequence bigint not null default 1 check (next_sequence > 0)
);
create table private.hangout_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references private.hangout_conversations(id),
  author_id uuid not null references public.accounts(id),
  sequence bigint not null check (sequence > 0),
  body text not null check (body = private.profile_trim(body) and length(body) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp(),
  unique (conversation_id, sequence)
);
create table private.hangout_message_requests (
  hangout_id uuid not null references public.hangouts(id),
  author_id uuid not null references public.accounts(id),
  request_id uuid not null,
  message_id uuid not null unique references private.hangout_messages(id),
  payload_fingerprint text not null,
  primary key (hangout_id, author_id, request_id)
);
create index hangout_messages_page_idx on private.hangout_messages(conversation_id, sequence);

alter table private.hangout_chat_feature_gate enable row level security;
alter table private.hangout_conversations enable row level security;
alter table private.hangout_messages enable row level security;
alter table private.hangout_message_requests enable row level security;
revoke all on private.hangout_chat_feature_gate, private.hangout_conversations,
  private.hangout_messages, private.hangout_message_requests from public, anon, authenticated;

-- No client path edits or deletes retained messages, including after cancellation.
create function private.chat_immutable_message() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'postgres' and current_setting('chat.allow_fixture_cleanup', true) = 'true' then
    return old;
  end if;
  raise exception 'Hangout messages are immutable' using errcode = '23514';
end;
$$;
create trigger chat_immutable_message before update or delete on private.hangout_messages
  for each row execute function private.chat_immutable_message();
revoke all on function private.chat_immutable_message() from public, anon, authenticated;

-- Called only after the Hangout parent-row lock. Order: Hangout gate, chat
-- gate, account, Auth user, membership, campus, profile, photo, participant.
-- FOR SHARE conflicts with mutable status/email/completeness/path updates and
-- deletes, unlike FOR KEY SHARE. A separate later statement rechecks all facts.
create function private.chat_lock_evidence(p_hangout_id uuid, p_actor uuid, p_campus uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare photo_path text;
begin
  perform 1 from private.hangout_feature_gate where singleton for share;
  perform 1 from private.hangout_chat_feature_gate where singleton for share;
  perform 1 from public.accounts where id = p_actor for share;
  perform 1 from auth.users where id = p_actor for share;
  perform 1 from public.university_memberships where user_id = p_actor for share;
  perform 1 from public.universities where id = p_campus for share;
  select primary_photo_path into photo_path from public.profiles where user_id = p_actor for share;
  perform 1 from storage.objects where bucket_id = 'profile-photos'
    and name = photo_path and owner_id = p_actor::text for share;
  perform 1 from public.hangout_participants
    where hangout_id = p_hangout_id and account_id = p_actor for share;
end;
$$;
revoke all on function private.chat_lock_evidence(uuid,uuid,uuid) from public, anon, authenticated;

create function private.chat_authorized(p_hangout_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select current_setting('transaction_isolation') = 'read committed'
    and exists(select 1 from private.hangout_feature_gate where singleton and enabled)
    and exists(select 1 from private.hangout_chat_feature_gate where singleton and enabled)
    and exists(select 1 from public.hangouts h
      join public.hangout_participants p on p.hangout_id = h.id
      where h.id = p_hangout_id and h.status = 'published' and h.visibility = 'campus'
        and p.account_id = auth.uid() and p.state = 'joined'
        and private.ready_subject_campus(auth.uid(), h.university_id));
$$;
create function private.chat_require(p_hangout_id uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_hangout_id is null or not coalesce(private.chat_authorized(p_hangout_id), false) then
    raise exception 'Hangout chat unavailable' using errcode = '42501';
  end if;
  return true;
end;
$$;
revoke all on function private.chat_authorized(uuid), private.chat_require(uuid)
  from public, anon, authenticated;

create function public.send_hangout_message(p_hangout_id uuid, p_request_id uuid, p_body text)
returns table (message_id uuid, sequence bigint, body text, created_at timestamptz,
  mine boolean, author_id uuid, author_label text)
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); h public.hangouts; normalized text;
  fingerprint text; old_message uuid; old_fingerprint text; conversation uuid;
  new_sequence bigint; new_message uuid;
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Hangout chat unavailable' using errcode = '42501';
  end if;
  -- Serialize with join, leave, remove and cancel using their existing parent
  -- lock. This also makes two sends of the same key strictly ordered.
  h := private.lock_hangout(p_hangout_id);
  perform private.chat_lock_evidence(h.id, actor, h.university_id);
  -- A fresh READ COMMITTED statement after lock waits sees committed revocation.
  perform private.chat_require(h.id);
  if p_request_id is null or p_body is null then
    raise exception 'Invalid Hangout message' using errcode = '22023';
  end if;
  normalized := private.profile_trim(p_body);
  if length(normalized) not between 1 and 2000 then
    raise exception 'Invalid Hangout message' using errcode = '22023';
  end if;
  fingerprint := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(normalized, 'UTF8')), 'hex');
  select r.message_id, r.payload_fingerprint into old_message, old_fingerprint
    from private.hangout_message_requests r
    where r.hangout_id = h.id and r.author_id = actor and r.request_id = p_request_id;
  if found then
    if old_fingerprint <> fingerprint then
      raise exception 'Message request conflict' using errcode = '23505';
    end if;
    return query select m.id, m.sequence, m.body, m.created_at, true, actor, null::text
      from private.hangout_messages m where m.id = old_message;
    return;
  end if;
  insert into private.hangout_conversations(hangout_id) values (h.id)
    on conflict(hangout_id) do nothing;
  update private.hangout_conversations c set next_sequence = c.next_sequence + 1
    where c.hangout_id = h.id returning c.id, c.next_sequence - 1 into conversation, new_sequence;
  insert into private.hangout_messages(conversation_id, author_id, sequence, body)
    values (conversation, actor, new_sequence, normalized) returning id into new_message;
  insert into private.hangout_message_requests(hangout_id, author_id, request_id, message_id, payload_fingerprint)
    values (h.id, actor, p_request_id, new_message, fingerprint);
  return query select m.id, m.sequence, m.body, m.created_at, true, actor, null::text
    from private.hangout_messages m where m.id = new_message;
end;
$$;

-- The authorization guard and page projection are one SQL statement. A read
-- that began before revocation may finish; a later statement must deny.
create function public.read_hangout_messages(p_hangout_id uuid, p_after_sequence bigint default null,
  p_limit integer default 50)
returns table (message_id uuid, sequence bigint, body text, created_at timestamptz,
  mine boolean, author_id uuid, author_label text)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Hangout chat unavailable' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 50
     or (p_after_sequence is not null and p_after_sequence < 1) then
    raise exception 'Invalid Hangout chat page' using errcode = '22023';
  end if;
  return query
  with guard as materialized (select private.chat_require(p_hangout_id) as allowed)
  select page.id, page.sequence, page.body, page.created_at,
    page.author_id = auth.uid() as mine,
    case when private.ready_subject_campus(page.author_id, h.university_id)
       and exists (select 1 from public.hangout_participants ap
         where ap.hangout_id = h.id and ap.account_id = page.author_id and ap.state = 'joined')
      then page.author_id else null::uuid end as author_id,
    case when private.ready_subject_campus(page.author_id, h.university_id)
       and exists (select 1 from public.hangout_participants ap
         where ap.hangout_id = h.id and ap.account_id = page.author_id and ap.state = 'joined')
      then null::text else 'Former participant'::text end as author_label
  from guard g
  left join lateral (
    select m.* from private.hangout_conversations c
    join private.hangout_messages m on m.conversation_id = c.id
    where g.allowed and c.hangout_id = p_hangout_id
      and (p_after_sequence is null or m.sequence > p_after_sequence)
    order by m.sequence limit p_limit
  ) page on true
  left join public.hangouts h on h.id = p_hangout_id
  where page.id is not null
  order by page.sequence;
end;
$$;
revoke all on function public.send_hangout_message(uuid,uuid,text),
  public.read_hangout_messages(uuid,bigint,integer) from public, anon, authenticated;
grant execute on function public.send_hangout_message(uuid,uuid,text),
  public.read_hangout_messages(uuid,bigint,integer) to authenticated;
commit;
