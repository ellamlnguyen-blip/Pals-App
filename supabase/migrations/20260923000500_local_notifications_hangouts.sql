-- Accepted ADR-0017 / TASK-015B. Disposable-local Hangout and chat inbox events.
begin;
alter table private.notification_items drop constraint notification_items_source_kind_check;
alter table private.notification_items add constraint notification_items_source_kind_check check(source_kind in('friendship','dm','hangout','hangout_chat'));
alter table private.notification_items drop constraint notification_items_event_code_check;
alter table private.notification_items add constraint notification_items_event_code_check check(event_code in('friend_request','friend_accepted','dm_request','dm_accepted','dm_message','hangout_edited','hangout_cancelled','hangout_joined','hangout_left','hangout_chat_message'));
alter table private.notification_items drop constraint notification_items_check1;
alter table private.notification_items drop constraint notification_items_check;
alter table private.notification_items add constraint notification_items_check check(
 (source_kind='friendship' and event_code in('friend_request','friend_accepted') and source_id=target_id)
 or (source_kind='dm' and event_code in('dm_request','dm_accepted') and source_id=target_id)
 or (source_kind='dm' and event_code='dm_message')
 or (source_kind='hangout' and event_code in('hangout_edited','hangout_cancelled','hangout_joined','hangout_left'))
 or (source_kind='hangout_chat' and event_code='hangout_chat_message'));

-- Only source RPCs/triggers call this helper after their parent-row locks.
-- Source gate SHARE, then notification gate SHARE, precede recipient advisory
-- locks in ascending UUID order. A source gate disabled during the mutation
-- silently skips its event without rolling back the source transition.
create function private.notification_emit_hangout(p_event uuid,p_hangout uuid,p_actor uuid,p_code text)
returns void language plpgsql volatile security definer set search_path='' as $$
declare recipient uuid; event_category text; essential boolean; kind text;
begin
 if p_code not in('hangout_edited','hangout_cancelled','hangout_joined','hangout_left','hangout_chat_message') then
  raise exception 'Invalid notification event' using errcode='22023'; end if;
 perform 1 from private.hangout_feature_gate where singleton for share;
 -- A fresh READ COMMITTED check after any source-gate lock wait.
 if not private.hangouts_enabled() then return; end if;
 if p_code='hangout_chat_message' then
  perform 1 from private.hangout_chat_feature_gate where singleton for share;
  if not exists(select 1 from private.hangout_chat_feature_gate where singleton and enabled) then return; end if;
 end if;
 perform 1 from private.notification_feature_gate where singleton for share;
 if not private.notification_enabled() then return; end if;
 essential:=p_code='hangout_cancelled';
 event_category:=case when p_code='hangout_chat_message' then 'messages'
  when p_code in('hangout_joined','hangout_left') then 'host_activity' else 'hangout_updates' end;
 kind:=case when p_code='hangout_chat_message' then 'hangout_chat' else 'hangout' end;
 for recipient in
  select p.account_id from public.hangout_participants p join public.hangouts h on h.id=p.hangout_id
  where p.hangout_id=p_hangout and p.state='joined' and p.account_id<>p_actor
   and (p_code not in('hangout_joined','hangout_left') or p.account_id=h.host_id)
  order by p.account_id
 loop
  perform private.notification_lock_recipient(recipient);
  -- Fresh statement after waiting for a preference write.
  if private.notification_enabled() and (essential or not exists(
    select 1 from private.notification_preferences pref where pref.recipient_id=recipient
      and pref.category=event_category and not pref.enabled)) then
   insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
    values(recipient,kind,p_event,p_hangout,p_code,p_actor)
    on conflict(recipient_id,source_kind,source_id,event_code) do nothing;
  end if;
 end loop;
end; $$;
revoke all on function private.notification_emit_hangout(uuid,uuid,uuid,text) from public,anon,authenticated;

create or replace function public.edit_hangout(p_hangout_id uuid,p_expected_revision bigint,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint; normalized_private text; old_private text; material boolean;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 perform private.validate_hangout_input(p_title,p_starts_at,p_public_place,p_public_latitude,p_public_longitude,p_description,p_ends_at,p_campus_zone,p_visibility,p_location_precision,p_eligibility);
 perform private.validate_hangout_instructions(p_private_instructions);
 if p_starts_at is distinct from h.starts_at and (p_starts_at<clock_timestamp() or p_starts_at>clock_timestamp()+interval '366 days') then
   raise exception 'Invalid Hangout input' using errcode='22023'; end if;
 normalized_private=nullif(private.profile_trim(p_private_instructions),'');
 select instructions into old_private from public.hangout_private_locations where hangout_id=h.id;
 update public.hangouts set title=private.profile_trim(p_title),starts_at=p_starts_at,public_place=private.profile_trim(p_public_place),public_latitude=p_public_latitude,public_longitude=p_public_longitude,description=nullif(private.profile_trim(p_description),''),ends_at=p_ends_at,campus_zone=nullif(private.profile_trim(p_campus_zone),''),revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 if normalized_private is null then delete from public.hangout_private_locations where hangout_id=h.id;
 else insert into public.hangout_private_locations(hangout_id,instructions) values(h.id,normalized_private)
  on conflict(hangout_id) do update set instructions=excluded.instructions,updated_at=clock_timestamp(); end if;
 material:=row(h.title,h.starts_at,h.public_place,h.public_latitude,h.public_longitude,h.description,h.ends_at,h.campus_zone,old_private)
  is distinct from row(private.profile_trim(p_title),p_starts_at,private.profile_trim(p_public_place),p_public_latitude,p_public_longitude,
   nullif(private.profile_trim(p_description),''),p_ends_at,nullif(private.profile_trim(p_campus_zone),''),normalized_private);
 if material then perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_edited'); end if;
 return next_revision;
end; $$;

create or replace function public.cancel_hangout(p_hangout_id uuid,p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_cancelled');
 return next_revision;
end; $$;

create or replace function public.join_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; participant_state text;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.status<>'published' or h.joining_state<>'open' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 select state into participant_state from public.hangout_participants where hangout_id=h.id and account_id=auth.uid();
 if participant_state='removed' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if participant_state='joined' then return; end if;
 insert into public.hangout_participants(hangout_id,account_id,state) values(h.id,auth.uid(),'joined')
 on conflict(hangout_id,account_id) do update set state='joined',joined_at=clock_timestamp(),left_at=null,updated_at=clock_timestamp()
 where hangout_participants.state='left';
 if found then perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_joined'); end if;
end; $$;

create or replace function public.leave_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.host_id=auth.uid() then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 update public.hangout_participants set state='left',left_at=clock_timestamp(),updated_at=clock_timestamp()
 where hangout_id=h.id and account_id=auth.uid() and state='joined';
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_left');
end; $$;

-- Chat insertion is the unique new-message path, including exact request retries.
create function private.notification_chat_source() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 select c.hangout_id into target from private.hangout_conversations c where c.id=new.conversation_id;
 perform private.notification_emit_hangout(new.id,target,new.author_id,'hangout_chat_message');
 return new;
end; $$;
create trigger notification_chat_insert after insert on private.hangout_messages
 for each row execute function private.notification_chat_source();
revoke all on function private.notification_chat_source() from public,anon,authenticated;

-- The original social checks remain byte-for-byte equivalent. Each new code
-- requires current source rights; host activity never reveals its actor.
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
  and exists(select 1 from private.dm_pairs d where d.generation_id=n.target_id and d.state in('pending','accepted')
   and d.low_id=least(owner_id,n.actor_id) and d.high_id=greatest(owner_id,n.actor_id)
   and ((n.event_code='dm_request' and d.state='pending' and d.initiator_id=n.actor_id
     and n.source_id=d.generation_id and exists(select 1 from private.dm_messages m where m.generation_id=d.generation_id and m.sequence=1))
    or (n.event_code='dm_accepted' and d.state='accepted' and d.initiator_id=owner_id and n.source_id=d.generation_id)
    or (n.event_code='dm_message' and d.state='accepted' and exists(select 1 from private.dm_messages m
       where m.id=n.source_id and m.generation_id=d.generation_id and m.author_id=n.actor_id and m.sequence>1))))
  and private.dm_eligible(n.actor_id)
 when n.source_kind='hangout' then
  (case when n.event_code='hangout_edited' then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangout_participants p where p.hangout_id=n.target_id and p.account_id=owner_id and p.state='joined')
   when n.event_code='hangout_cancelled' then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangout_participants p where p.hangout_id=n.target_id and p.account_id=owner_id and p.state='joined')
   when n.event_code in('hangout_joined','hangout_left') then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangouts h where h.id=n.target_id and h.host_id=owner_id)
   else false end)
 when n.source_kind='hangout_chat' then n.event_code='hangout_chat_message'
  and private.chat_authorized(n.target_id)
  and exists(select 1 from private.hangout_conversations c join private.hangout_messages m on m.conversation_id=c.id
   where c.hangout_id=n.target_id and m.id=n.source_id and m.author_id=n.actor_id)
 else false end allowed from page n)
 select n.id,case when n.allowed then n.source_kind else null::text end,
 case when n.allowed then n.source_id else null::uuid end,
 case when n.allowed then n.event_code else null::text end,
 case when n.allowed and n.event_code not in('hangout_joined','hangout_left','hangout_chat_message') then n.actor_id else null::uuid end,
 case when n.allowed then n.target_id else null::uuid end,
 case when not n.allowed then 'Unavailable' when n.event_code='friend_request' then 'Friend request'
 when n.event_code='friend_accepted' then 'Friend request accepted' when n.event_code='dm_request' then 'Message request'
 when n.event_code='dm_accepted' then 'Message request accepted' when n.event_code='dm_message' then 'Direct message'
 when n.event_code='hangout_edited' then 'Hangout updated' when n.event_code='hangout_cancelled' then 'Hangout cancelled'
 when n.event_code='hangout_joined' then 'Someone joined your Hangout' when n.event_code='hangout_left' then 'Someone left your Hangout'
 else 'Hangout message' end,
 n.created_at,n.read_at from checked n order by n.created_at desc,n.id desc;
end; $$;
commit;
