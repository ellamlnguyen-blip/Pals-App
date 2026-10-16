-- TASK-033D2 / Accepted ADR-0042. Add friendship-derived consent without reviving retained DM generations.
begin;

alter table private.dm_pairs add column consent_origin text not null default 'request'
  check (consent_origin in ('request','friend'));
alter table private.dm_pairs add column recipient_consented boolean not null default false;
-- The historical writer could accept only through the recipient's explicit action.
update private.dm_pairs set recipient_consented=true where state='accepted';
alter table private.dm_pairs add constraint dm_request_origin_consent
  check (consent_origin<>'request' or state<>'accepted' or recipient_consented);
alter table private.dm_retries drop constraint dm_retries_kind_check;
alter table private.dm_retries add constraint dm_retries_kind_check
  check (kind in ('create','reply','send','friend_send'));

create function private.dm_friendship_current(p_actor uuid,p_peer uuid) returns boolean
language sql volatile security definer set search_path='' as $$
 select coalesce(p_actor is not null and p_peer is not null and p_actor<>p_peer
  and private.friendship_enabled() and exists(select 1 from private.friendships f
   where f.low_id=least(p_actor,p_peer) and f.high_id=greatest(p_actor,p_peer)
    and f.state='accepted'),false);
$$;
-- Reusable consent boundary for DM and subsequent poll/notification readers. The
-- caller must additionally require current DM/People/source eligibility.
create function private.dm_current_consent(p_generation_id uuid,p_actor uuid,p_peer uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select coalesce(exists(select 1 from private.dm_pairs d
  where d.generation_id=p_generation_id and d.state='accepted'
   and d.low_id=least(p_actor,p_peer) and d.high_id=greatest(p_actor,p_peer)
   and (d.recipient_consented or private.dm_friendship_current(p_actor,p_peer))),false);
$$;
revoke all on function private.dm_friendship_current(uuid,uuid),
 private.dm_current_consent(uuid,uuid,uuid) from public,anon,authenticated;

-- Request-only pair events are suppressed for friend-origin formation and
-- friend transition. A friend-origin first message gets the ordinary DM event.
create or replace function private.notification_dm_pair_source() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 if tg_op='INSERT' and new.consent_origin='request' then
  recipient:=case when new.initiator_id=new.low_id then new.high_id else new.low_id end;
  perform private.notification_emit(recipient,'dm',new.generation_id,new.generation_id,
   'dm_request',new.initiator_id,'social_requests');
 elsif tg_op='UPDATE' and old.state='pending' and new.state='accepted'
   and new.consent_origin='request' then
  recipient:=new.initiator_id;
  perform private.notification_emit(recipient,'dm',new.generation_id,new.generation_id,
   'dm_accepted',case when recipient=new.low_id then new.high_id else new.low_id end,'social_requests');
 end if;
 return new;
end; $$;
create or replace function private.notification_dm_message_source() returns trigger
language plpgsql security definer set search_path='' as $$
declare pair private.dm_pairs%rowtype; recipient uuid;
begin
 select * into pair from private.dm_pairs where generation_id=new.generation_id;
 if pair.state='accepted' and (new.sequence>1 or pair.consent_origin='friend') then
  recipient:=case when new.author_id=pair.low_id then pair.high_id else pair.low_id end;
  perform private.notification_emit(recipient,'dm',new.id,new.generation_id,
   'dm_message',new.author_id,'messages');
 end if;
 return new;
end; $$;

-- First actual friend send creates a generation or converts the existing
-- pending generation. The pair advisory lock also serializes opposite sends,
-- friendship teardown and blocks. The old request suppression is bypassed only
-- while a fresh accepted friendship is locked and rechecked.
create function public.send_friend_dm_message(p_peer_id uuid,p_request_id uuid,p_body text)
returns table(generation_id uuid,message_id uuid)
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); normalized text; fingerprint text;
 pair private.dm_pairs%rowtype; old_retry private.dm_retries%rowtype; new_message uuid;
begin
 perform private.social_hangout_mutation_lock();
 perform private.people_require_read_committed();
 if actor is null or p_peer_id is null or p_peer_id=actor or p_request_id is null or p_body is null then
  raise exception 'DM unavailable' using errcode='42501'; end if;
 normalized:=private.profile_trim(p_body);
 if length(normalized) not between 1 and 2000 then
  raise exception 'Invalid DM body' using errcode='22023'; end if;
 fingerprint:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(normalized,'UTF8')),'hex');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'dm-request:'||actor::text||':'||p_request_id::text,0));
 perform private.friendship_lock_pair(actor,p_peer_id);
 perform private.dm_lock_evidence(actor,p_peer_id);
 perform 1 from private.friendship_feature_gate where singleton for share;
 perform 1 from private.friendships f where f.low_id=least(actor,p_peer_id)
  and f.high_id=greatest(actor,p_peer_id) and f.state='accepted' for share;
 if not private.dm_eligible(p_peer_id) then
  raise exception 'DM unavailable' using errcode='42501'; end if;
 select * into old_retry from private.dm_retries r where r.actor_id=actor and r.request_id=p_request_id;
 if found then
  if old_retry.kind<>'friend_send' or old_retry.target_id<>p_peer_id
   or old_retry.fingerprint<>fingerprint then
   raise exception 'DM request conflict' using errcode='23505'; end if;
  if not private.dm_current_consent(old_retry.generation_id,actor,p_peer_id) then
   raise exception 'DM unavailable' using errcode='42501'; end if;
  return query select old_retry.generation_id,old_retry.message_id;
  return;
 end if;
 if not private.dm_friendship_current(actor,p_peer_id) then
  raise exception 'DM unavailable' using errcode='42501'; end if;
 select * into pair from private.dm_pairs d where d.low_id=least(actor,p_peer_id)
  and d.high_id=greatest(actor,p_peer_id) and d.state in ('pending','accepted');
 if not found then
  insert into private.dm_pairs(low_id,high_id,initiator_id,campus_id,state,
   consent_origin,recipient_consented,next_sequence)
  values(least(actor,p_peer_id),greatest(actor,p_peer_id),actor,
   private.people_ready_campus(),'accepted','friend',false,1) returning * into pair;
 elsif pair.state='pending' then
  update private.dm_pairs d set state='accepted',consent_origin='friend'
   where d.generation_id=pair.generation_id returning * into pair;
 elsif not private.dm_current_consent(pair.generation_id,actor,p_peer_id) then
  raise exception 'DM unavailable' using errcode='42501';
 end if;
 insert into private.dm_messages(generation_id,sequence,author_id,body)
  values(pair.generation_id,pair.next_sequence,actor,normalized) returning id into new_message;
 update private.dm_pairs d set next_sequence=next_sequence+1 where d.generation_id=pair.generation_id;
 insert into private.dm_retries(actor_id,request_id,kind,target_id,generation_id,message_id,fingerprint)
  values(actor,p_request_id,'friend_send',p_peer_id,pair.generation_id,new_message,fingerprint);
 return query select pair.generation_id,new_message;
end; $$;
revoke all on function public.send_friend_dm_message(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.send_friend_dm_message(uuid,uuid,text) to authenticated;

-- Explicit recipient action may preserve a friend-origin generation after
-- unfriending. It is callable only by the original recipient while active.
create function public.accept_friend_dm_consent(p_peer_id uuid,p_generation_id uuid)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); pair private.dm_pairs%rowtype;
begin
 perform private.social_hangout_mutation_lock();
 perform private.people_require_read_committed();
 if actor is null or p_peer_id is null or actor=p_peer_id or p_generation_id is null then
  raise exception 'DM unavailable' using errcode='42501'; end if;
 perform private.friendship_lock_pair(actor,p_peer_id);
 perform private.dm_lock_evidence(actor,p_peer_id);
 if not private.dm_eligible(p_peer_id) then
  raise exception 'DM unavailable' using errcode='42501'; end if;
 select * into pair from private.dm_pairs d where d.generation_id=p_generation_id
  and d.low_id=least(actor,p_peer_id) and d.high_id=greatest(actor,p_peer_id)
  and d.state='accepted' and d.consent_origin='friend' and d.initiator_id=p_peer_id;
 if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
 if not pair.recipient_consented then
  update private.dm_pairs d set recipient_consented=true where d.generation_id=p_generation_id;
 end if;
 return true;
end; $$;
revoke all on function public.accept_friend_dm_consent(uuid,uuid) from public,anon,authenticated;
grant execute on function public.accept_friend_dm_consent(uuid,uuid) to authenticated;

-- Exact create retries may return pending metadata, but accepted generations
-- need current consent after any pending-to-friend conversion.
create or replace function public.create_dm_request(p_target_id uuid,p_request_id uuid,p_body text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); normalized text; fingerprint text;
  old_retry private.dm_retries%rowtype; pair private.dm_pairs%rowtype; message_id uuid;
begin
  perform private.social_hangout_mutation_lock();
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
  perform 1 from private.friendship_feature_gate where singleton for share;
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
    if not found or (pair.state='accepted' and not private.dm_current_consent(
      pair.generation_id,actor,p_target_id)) then
      raise exception 'DM unavailable' using errcode='42501'; end if;
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

-- Existing request transitions keep their caller, pair and evidence locks.
create or replace function public.transition_dm(p_peer_id uuid,p_generation_id uuid,p_action text,
  p_reply_request_id uuid default null,p_reply_body text default null)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); pair private.dm_pairs%rowtype;
  normalized text; message_id uuid; fingerprint text; old_retry private.dm_retries%rowtype;
begin
  perform private.social_hangout_mutation_lock();
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
  perform 1 from private.dm_feature_gate where singleton for share;
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
        or not private.dm_eligible(p_peer_id)
        or not private.dm_current_consent(pair.generation_id,actor,p_peer_id) then
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
    if not private.dm_eligible(p_peer_id) then
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
    update private.dm_pairs d set state='accepted',recipient_consented=true
      where d.generation_id=pair.generation_id;
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

-- Existing generation-bound send and exact retry require current consent.
create or replace function public.send_dm_message(p_peer_id uuid,p_generation_id uuid,
  p_request_id uuid,p_body text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); normalized text; fingerprint text;
  pair private.dm_pairs%rowtype; old_retry private.dm_retries%rowtype; message_id uuid;
begin
  perform private.social_hangout_mutation_lock();
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
  perform 1 from private.friendship_feature_gate where singleton for share;
  if not private.dm_eligible(p_peer_id) then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  select * into pair from private.dm_pairs d where d.generation_id=p_generation_id
    and d.low_id=least(actor,p_peer_id) and d.high_id=greatest(actor,p_peer_id)
    and d.state='accepted';
  if not found or not private.dm_current_consent(p_generation_id,actor,p_peer_id) then
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

-- Preserve active-pair management metadata while consent pauses.
create or replace function public.get_dm_status(p_peer_id uuid)
returns table(peer_id uuid,generation_id uuid,direction text,state text)
language sql volatile security definer set search_path = '' as $$
  with guard as materialized (select private.dm_require() allowed)
  select p_peer_id,d.generation_id,
    case when d.initiator_id=auth.uid() then 'outgoing' else 'incoming' end,d.state
  from guard g join private.dm_pairs d on g.allowed
    and d.low_id=least(auth.uid(),p_peer_id) and d.high_id=greatest(auth.uid(),p_peer_id)
    and d.state in ('pending','accepted');
$$;
create or replace function public.list_dm_inbox(p_after_created_at timestamptz default null,
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

-- Message bodies require current consent in the projection statement.
create or replace function public.read_dm_messages(p_peer_id uuid,p_generation_id uuid,
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
    and (d.state='pending' or private.dm_current_consent(d.generation_id,auth.uid(),p_peer_id))
  join private.dm_messages m on m.generation_id=d.generation_id
    and (p_after_sequence is null or m.sequence > p_after_sequence)
  order by m.sequence limit p_limit;
end;
$$;

commit;
