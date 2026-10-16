-- TASK-039B / Accepted ADR-0045: friendship is the only current DM consent.

begin;

-- Serialize migration retirement against every social/DM writer.

select private.social_hangout_mutation_lock();

alter table private.dm_pairs drop constraint dm_pairs_state_check;

alter table private.dm_pairs add constraint dm_pairs_state_check check (state in ('pending','accepted','ignored','withdrawn','closed','blocked','retired'));

update private.dm_pairs d set state='retired'
 where d.state='pending' or (d.state='accepted' and not exists (
  select 1 from private.friendships f where f.low_id=d.low_id and f.high_id=d.high_id and f.state='accepted'));

create or replace function private.dm_current_consent(p_generation_id uuid,p_actor uuid,p_peer uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select coalesce(exists(select 1 from private.dm_pairs d
  where d.generation_id=p_generation_id and d.state='accepted'
   and d.low_id=least(p_actor,p_peer) and d.high_id=greatest(p_actor,p_peer)
   and private.dm_friendship_current(p_actor,p_peer)),false);
$$;

-- Keep old RPC identities as denied stubs so stale callers receive a neutral denial.
create or replace function public.create_dm_request(p_target_id uuid,p_request_id uuid,p_body text)
returns uuid language plpgsql volatile security definer set search_path='' as $$
begin raise exception 'DM unavailable' using errcode='42501'; end; $$;
create or replace function public.accept_friend_dm_consent(p_peer_id uuid,p_generation_id uuid)
returns boolean language plpgsql volatile security definer set search_path='' as $$
begin raise exception 'DM unavailable' using errcode='42501'; end; $$;
revoke all on function public.create_dm_request(uuid,uuid,text),
 public.accept_friend_dm_consent(uuid,uuid) from public,anon,authenticated;


create or replace function private.notification_dm_pair_source() returns trigger
language plpgsql security definer set search_path='' as $$
begin return new; end; $$;

create or replace function public.send_friend_dm_message(p_peer_id uuid,p_request_id uuid,p_body text)
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
  and d.high_id=greatest(actor,p_peer_id) and d.state='accepted';
 if not found then
  insert into private.dm_pairs(low_id,high_id,initiator_id,campus_id,state,
   consent_origin,recipient_consented,next_sequence)
  values(least(actor,p_peer_id),greatest(actor,p_peer_id),actor,
   private.people_ready_campus(),'accepted','friend',false,1) returning * into pair;

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

create or replace function public.transition_dm(p_peer_id uuid,p_generation_id uuid,p_action text,
 p_reply_request_id uuid default null,p_reply_body text default null)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); pair private.dm_pairs%rowtype;
begin
 perform private.social_hangout_mutation_lock();
 perform private.people_require_read_committed();
 if actor is null or p_peer_id is null or actor=p_peer_id or p_generation_id is null
  or p_action is distinct from 'close' or p_reply_request_id is not null or p_reply_body is not null
  or not private.dm_enabled() or not private.dm_active_caller() then
  raise exception 'DM unavailable' using errcode='42501'; end if;
 perform private.friendship_lock_pair(actor,p_peer_id);
 perform private.dm_lock_evidence(actor,p_peer_id);
 perform 1 from private.friendship_feature_gate where singleton for share;
 if not private.dm_eligible(p_peer_id) or not private.dm_friendship_current(actor,p_peer_id) then
  raise exception 'DM unavailable' using errcode='42501'; end if;
 select * into pair from private.dm_pairs d where d.generation_id=p_generation_id
  and d.low_id=least(actor,p_peer_id) and d.high_id=greatest(actor,p_peer_id)
  and d.state='accepted';
 if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
 update private.dm_pairs d set state='closed' where d.generation_id=pair.generation_id;
 return true;
end; $$;

create or replace function public.transition_friendship(p_peer_id uuid, p_generation_id uuid, p_action text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
declare pair private.friendships%rowtype;
begin
  perform private.social_hangout_mutation_lock();
  perform private.people_require_read_committed();
  if actor is null or p_peer_id is null or actor = p_peer_id or p_generation_id is null
    or p_action not in ('accept','decline','cancel','unfriend') or p_action is null
    or not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  perform private.friendship_lock_pair(actor,p_peer_id);
  perform 1 from private.friendship_feature_gate where singleton for share;
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
    if p_action='unfriend' then
      update private.dm_pairs d set state='retired' where d.low_id=pair.low_id
       and d.high_id=pair.high_id and d.state in ('pending','accepted');
    end if;
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

create or replace function public.get_dm_status(p_peer_id uuid)
returns table(peer_id uuid,generation_id uuid,direction text,state text)
language sql volatile security definer set search_path = '' as $$
  with guard as materialized (select private.dm_require() allowed)
  select p_peer_id,d.generation_id,
    case when d.initiator_id=auth.uid() then 'outgoing' else 'incoming' end,d.state
  from guard g join private.dm_pairs d on g.allowed
    and d.low_id=least(auth.uid(),p_peer_id) and d.high_id=greatest(auth.uid(),p_peer_id)
    and d.state='accepted' and private.dm_eligible(p_peer_id)
    and private.dm_current_consent(d.generation_id,auth.uid(),p_peer_id);
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
    null::text
  from guard g join private.dm_pairs d on g.allowed
    and (d.low_id=auth.uid() or d.high_id=auth.uid())
    and d.state='accepted'
    and private.dm_eligible(case when d.low_id=auth.uid() then d.high_id else d.low_id end)
    and private.dm_current_consent(d.generation_id,auth.uid(),
      case when d.low_id=auth.uid() then d.high_id else d.low_id end)
  where p_after_created_at is null or (d.created_at,d.generation_id) <
    (p_after_created_at,p_after_generation_id)
  order by d.created_at desc,d.generation_id desc limit p_limit;
end;
$$;

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
    and d.generation_id=p_generation_id and d.state='accepted'
    and d.low_id=least(auth.uid(),p_peer_id) and d.high_id=greatest(auth.uid(),p_peer_id)
    and private.dm_eligible(p_peer_id)
    and private.dm_current_consent(d.generation_id,auth.uid(),p_peer_id)
  join private.dm_messages m on m.generation_id=d.generation_id
    and (p_after_sequence is null or m.sequence > p_after_sequence)
  order by m.sequence limit p_limit;
end;
$$;

create or replace function public.get_dm_consent_ui_state(p_peer_id uuid)
returns table(peer_id uuid,generation_id uuid,direction text,state text,
  consent_origin text,recipient_consented boolean,friend_send_available boolean,
  can_allow_dm boolean)
language sql volatile security definer set search_path = '' as $$
  with guard as materialized (select private.dm_require() allowed)
  select p_peer_id,d.generation_id,
    case when d.initiator_id=auth.uid() then 'outgoing' else 'incoming' end,
    d.state,d.consent_origin,d.recipient_consented,
    private.dm_eligible(p_peer_id)
      and private.dm_friendship_current(auth.uid(),p_peer_id),
    false
  from guard g join private.dm_pairs d on g.allowed
    and d.low_id=least(auth.uid(),p_peer_id)
    and d.high_id=greatest(auth.uid(),p_peer_id)
    and d.state='accepted' and private.dm_eligible(p_peer_id)
    and private.dm_current_consent(d.generation_id,auth.uid(),p_peer_id);
$$;

create or replace function private.chat_attention_source(p_kind text,p_source uuid)
returns table(peer_id uuid,direction text,source_state text,label text,
 source_created_at timestamptz,can_read boolean)
language sql stable security definer set search_path='' as $$
 with actor as (select auth.uid() id), dm_source as (
  select d.*,
   case when d.low_id=a.id then d.high_id else d.low_id end peer_id,
   a.id actor_id
   from private.dm_pairs d cross join actor a
   where p_kind='dm' and p_source=d.generation_id and a.id is not null
    and a.id in (d.low_id,d.high_id) and d.state='accepted'
    and private.dm_current_consent(d.generation_id,a.id,
      case when d.low_id=a.id then d.high_id else d.low_id end)
    and private.dm_eligible(case when d.low_id=a.id then d.high_id else d.low_id end)
    and current_setting('transaction_isolation')='read committed'
    and private.pilot_capability_enabled('dm')
    and exists(select 1 from private.dm_feature_gate g where g.singleton and g.enabled)
    and exists(select 1 from public.accounts x where x.id=a.id and x.status='active')
    and public.get_access_state()='ready'
    and private.ready_subject_campus(a.id,d.campus_id)
    and exists(select 1 from public.university_memberships m
     where m.user_id=a.id and m.university_id=d.campus_id)
 )
 select d.peer_id,
  case when d.initiator_id=d.actor_id then 'outgoing'::text else 'incoming'::text end,
  d.state,null::text,d.created_at,
  coalesce(
   exists(select 1 from private.people_feature_gate g where g.singleton and g.enabled)
   and exists(select 1 from private.people_preferences v where v.account_id=d.actor_id and v.opted_in)
   and private.ready_subject_campus(d.peer_id,d.campus_id)
   and exists(select 1 from private.people_preferences v where v.account_id=d.peer_id and v.opted_in)
   and exists(select 1 from public.profiles p where p.user_id=d.peer_id
    and p.real_name is not null and p.graduation_year is not null
    and p.major is not null and p.bio is not null)
   and not private.safety_pair_blocked(d.actor_id,d.peer_id)
   and private.dm_current_consent(d.generation_id,d.actor_id,d.peer_id),false)
 from dm_source d
 union all
 select null::uuid,null::text,'joined'::text,h.title,h.created_at,true
 from public.hangouts h where p_kind='hangout' and h.id=p_source
  and private.chat_authorized(h.id);
$$;

create or replace function private.notification_dm_message_source() returns trigger
language plpgsql security definer set search_path='' as $$
declare pair private.dm_pairs%rowtype; recipient uuid;
begin
 select * into pair from private.dm_pairs where generation_id=new.generation_id;
 if pair.state='accepted' and private.dm_friendship_current(pair.low_id,pair.high_id) then
  recipient:=case when new.author_id=pair.low_id then pair.high_id else pair.low_id end;
  perform private.notification_emit(recipient,'dm',new.id,new.generation_id,
   'dm_message',new.author_id,'messages');
 end if;
 return new;
end; $$;

create or replace function public.list_notifications(p_after_created_at timestamptz default null,p_after_id uuid default null,p_limit integer default 24)
returns table(notification_id uuid,source_kind text,source_id uuid,event_code text,actor_id uuid,target_id uuid,label text,created_at timestamptz,read_at timestamptz)
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
 if p_limit is null or p_limit not between 1 and 24 or ((p_after_created_at is null)<>(p_after_id is null)) then
  raise exception 'Invalid notification page' using errcode='22023';end if;
 owner_id:=private.notification_require_owner();
 return query with page as materialized (
  select n.* from private.notification_items n where n.recipient_id=owner_id
  and (p_after_created_at is null or (n.created_at,n.id)<(p_after_created_at,p_after_id))
  order by n.created_at desc,n.id desc limit p_limit
 ), checked as (select n.*,case when n.source_kind='friendship' then
  private.friendship_enabled() and private.people_enabled()
  and exists(select 1 from private.friendships f where f.generation_id=n.target_id
   and f.low_id=least(owner_id,n.actor_id) and f.high_id=greatest(owner_id,n.actor_id)
   and ((n.event_code='friend_request' and f.state='pending' and f.requester_id=n.actor_id)
    or (n.event_code='friend_accepted' and f.state='accepted' and f.requester_id=owner_id)))
  and private.friendship_eligible(n.actor_id)
 when n.source_kind='dm' then private.dm_enabled() and private.people_enabled()
  and n.event_code='dm_message'
  and exists(select 1 from private.dm_pairs d where d.generation_id=n.target_id and d.state='accepted'
   and d.low_id=least(owner_id,n.actor_id) and d.high_id=greatest(owner_id,n.actor_id)
   and exists(select 1 from private.dm_messages m where m.id=n.source_id
    and m.generation_id=d.generation_id and m.author_id=n.actor_id))
  and private.dm_eligible(n.actor_id)
  and private.dm_current_consent(n.target_id,owner_id,n.actor_id)
 when n.source_kind='hangout_invitation' then n.event_code='cohost_invitation'
  and n.source_id<>n.target_id and n.recipient_id=owner_id
  and private.cohost_invitation_current(n.source_id,owner_id)
  and exists(select 1 from private.cohost_invitations i where i.id=n.source_id
   and i.hangout_id=n.target_id and i.host_id=n.actor_id and i.recipient_id=owner_id)
 when n.source_kind='hangout_activity' then
  exists(select 1 from private.notification_actions a where a.id=n.source_id
   and a.hangout_id=n.target_id and a.actor_id=n.actor_id
   and private.notification_activity_readable(a.id,owner_id,n.event_code))
 when n.source_kind='hangout_reminder' then
  n.event_code='hangout_start_reminder'
  and exists(select 1 from private.notification_reminder_occurrences o
   join public.hangouts h on h.id=o.hangout_id
   join public.hangout_participants p on p.hangout_id=h.id and p.account_id=owner_id
   where o.id=n.source_id and o.hangout_id=n.target_id and h.host_id=n.actor_id
    and h.starts_at=o.starts_at and h.status='published' and p.state='joined'
    and exists(select 1 from private.notification_schedule_state s where s.hangout_id=h.id
     and s.current_revision=o.schedule_revision)
    and private.notification_recipient_can_discover(h.id,owner_id))
 when n.source_kind='hangout' then
  not private.safety_pair_blocked(owner_id,n.actor_id) and (case when n.event_code='hangout_edited' then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangout_participants p where p.hangout_id=n.target_id and p.account_id=owner_id and p.state='joined')
    and exists(select 1 from public.hangouts h where h.id=n.target_id
      and (h.host_id=n.actor_id or private.can_read_hangout_roster(h.id,n.actor_id)))
   when n.event_code='hangout_cancelled' then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangout_participants p where p.hangout_id=n.target_id and p.account_id=owner_id and p.state='joined')
   when n.event_code in('hangout_joined','hangout_left') then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangouts h where h.id=n.target_id and h.host_id=owner_id)
   else false end)
 when n.source_kind='hangout_chat' then n.event_code='hangout_chat_message'
  and private.chat_authorized(n.target_id)
  and not private.safety_pair_blocked(owner_id,n.actor_id)
  and exists(select 1 from private.hangout_conversations c join private.hangout_messages m on m.conversation_id=c.id
   where c.hangout_id=n.target_id and m.id=n.source_id and m.author_id=n.actor_id)
 else false end allowed from page n)
 select n.id,case when n.allowed then n.source_kind else null::text end,
 case when n.allowed then n.source_id else null::uuid end,
 case when n.allowed then n.event_code else null::text end,
 case when n.allowed and n.event_code not in('hangout_joined','hangout_left','hangout_chat_message','hangout_start_reminder',
  'campus_new_hangout','friend_created_hangout','friend_joined_hangout') then n.actor_id else null::uuid end,
 case when n.allowed then n.target_id else null::uuid end,
 case when not n.allowed then 'Unavailable' when n.event_code='friend_request' then 'Friend request'
 when n.event_code='friend_accepted' then 'Friend request accepted' when n.event_code='dm_request' then 'Message request'
 when n.event_code='dm_accepted' then 'Message request accepted' when n.event_code='dm_message' then 'Direct message'
 when n.event_code='cohost_invitation' then 'Co-host invitation'
 when n.event_code='campus_new_hangout' then 'New campus Hangout'
 when n.event_code='friend_created_hangout' then 'A friend created a Hangout'
 when n.event_code='friend_joined_hangout' then 'A friend joined a Hangout'
 when n.event_code='hangout_start_reminder' then 'Hangout starts soon'
 when n.event_code='hangout_edited' then 'Hangout updated' when n.event_code='hangout_cancelled' then 'Hangout cancelled'
 when n.event_code='hangout_joined' then 'Someone joined your Hangout' when n.event_code='hangout_left' then 'Someone left your Hangout'
 else 'Hangout message' end,
 n.created_at,n.read_at from checked n order by n.created_at desc,n.id desc;
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

revoke all on function public.transition_dm(uuid,uuid,text,uuid,text),
 public.send_friend_dm_message(uuid,uuid,text),public.send_dm_message(uuid,uuid,uuid,text),
 public.get_dm_status(uuid),public.list_dm_inbox(timestamptz,uuid,integer),
 public.read_dm_messages(uuid,uuid,bigint,integer),public.get_dm_consent_ui_state(uuid),
 public.list_notifications(timestamptz,uuid,integer),public.get_notification_attention()
 from public,anon,authenticated;
grant execute on function public.transition_dm(uuid,uuid,text,uuid,text),
 public.send_friend_dm_message(uuid,uuid,text),public.send_dm_message(uuid,uuid,uuid,text),
 public.get_dm_status(uuid),public.list_dm_inbox(timestamptz,uuid,integer),
 public.read_dm_messages(uuid,uuid,bigint,integer),public.get_dm_consent_ui_state(uuid),
 public.list_notifications(timestamptz,uuid,integer),public.get_notification_attention()
 to authenticated;
commit;
