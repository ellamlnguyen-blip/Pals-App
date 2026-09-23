-- Accepted ADR-0017 / TASK-015A: disposable-local notification ledger.
begin;
create table private.notification_feature_gate(singleton boolean primary key default true check(singleton), enabled boolean not null default false);
insert into private.notification_feature_gate values(true,false);
create table private.notification_preferences(
 recipient_id uuid not null references public.accounts(id) on delete cascade,
 category text not null check(category in('social_requests','messages','hangout_updates','host_activity')),
 enabled boolean not null,primary key(recipient_id,category));
-- No source FK: source teardown cannot erase or alias retained evidence.
create table private.notification_items(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.accounts(id) on delete cascade,
 source_kind text not null check(source_kind in('friendship','dm')),
 source_id uuid not null,target_id uuid not null,
 event_code text not null check(event_code in('friend_request','friend_accepted','dm_request','dm_accepted','dm_message')),
 actor_id uuid not null references public.accounts(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),read_at timestamptz,
 unique(recipient_id,source_kind,source_id,event_code),check(recipient_id<>actor_id),
 check((source_kind='friendship' and event_code in('friend_request','friend_accepted') and source_id=target_id)
  or (source_kind='dm' and event_code in('dm_request','dm_accepted') and source_id=target_id)
  or (source_kind='dm' and event_code='dm_message')));
create index notification_owner_page on private.notification_items(recipient_id,created_at desc,id desc);
alter table private.notification_feature_gate enable row level security;
alter table private.notification_preferences enable row level security;
alter table private.notification_items enable row level security;
revoke all on private.notification_feature_gate,private.notification_preferences,private.notification_items from public,anon,authenticated;

create function private.notification_enabled() returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from private.notification_feature_gate where singleton and enabled);
$$;
create function private.notification_lock_recipient(p_recipient uuid) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('notification-recipient:'||p_recipient::text,0));
end; $$;
-- Source locks precede this helper. Gate row FOR SHARE precedes the recipient lock.
create function private.notification_emit(p_recipient uuid,p_kind text,p_source uuid,p_target uuid,p_code text,p_actor uuid,p_category text)
returns void language plpgsql volatile security definer set search_path='' as $$
begin
 perform 1 from private.notification_feature_gate where singleton for share;
 perform private.notification_lock_recipient(p_recipient);
 -- Fresh READ COMMITTED statement after any lock wait.
 if private.notification_enabled() and not exists(select 1 from private.notification_preferences
   where recipient_id=p_recipient and category=p_category and not enabled) then
  insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
   values(p_recipient,p_kind,p_source,p_target,p_code,p_actor)
   on conflict(recipient_id,source_kind,source_id,event_code) do nothing;
 end if;
end; $$;
create function private.notification_friend_source() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 if tg_op='INSERT' then
  recipient:=case when new.requester_id=new.low_id then new.high_id else new.low_id end;
  perform private.notification_emit(recipient,'friendship',new.generation_id,new.generation_id,'friend_request',new.requester_id,'social_requests');
 elsif old.state='pending' and new.state='accepted' then
  recipient:=new.requester_id;
  perform private.notification_emit(recipient,'friendship',new.generation_id,new.generation_id,'friend_accepted',
    case when recipient=new.low_id then new.high_id else new.low_id end,'social_requests');
 end if;
 return new;
end; $$;
create trigger notification_friend_insert after insert on private.friendships for each row execute function private.notification_friend_source();
create trigger notification_friend_accept after update of state on private.friendships for each row execute function private.notification_friend_source();
create function private.notification_dm_pair_source() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 if tg_op='INSERT' then
  recipient:=case when new.initiator_id=new.low_id then new.high_id else new.low_id end;
  perform private.notification_emit(recipient,'dm',new.generation_id,new.generation_id,'dm_request',new.initiator_id,'social_requests');
 elsif old.state='pending' and new.state='accepted' then
  recipient:=new.initiator_id;
  perform private.notification_emit(recipient,'dm',new.generation_id,new.generation_id,'dm_accepted',
    case when recipient=new.low_id then new.high_id else new.low_id end,'social_requests');
 end if;
 return new;
end; $$;
create trigger notification_dm_pair_insert after insert on private.dm_pairs for each row execute function private.notification_dm_pair_source();
create trigger notification_dm_pair_accept after update of state on private.dm_pairs for each row execute function private.notification_dm_pair_source();
create function private.notification_dm_message_source() returns trigger language plpgsql security definer set search_path='' as $$
declare pair private.dm_pairs%rowtype;recipient uuid;
begin
 select * into pair from private.dm_pairs where generation_id=new.generation_id;
 -- Initial request and first reply have pair-level items only.
 if new.sequence>1 and pair.state='accepted' then
  recipient:=case when new.author_id=pair.low_id then pair.high_id else pair.low_id end;
  perform private.notification_emit(recipient,'dm',new.id,new.generation_id,'dm_message',new.author_id,'messages');
 end if;
 return new;
end; $$;
create trigger notification_dm_message_insert after insert on private.dm_messages for each row execute function private.notification_dm_message_source();
revoke all on function private.notification_enabled(),private.notification_lock_recipient(uuid),
 private.notification_emit(uuid,text,uuid,uuid,text,uuid,text),private.notification_friend_source(),
 private.notification_dm_pair_source(),private.notification_dm_message_source() from public,anon,authenticated;
create function private.notification_require_owner() returns uuid language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid:=auth.uid();
begin
 perform private.people_require_read_committed();
 if owner_id is null or not private.notification_enabled() or not private.people_active_owner() then
  raise exception 'Notifications unavailable' using errcode='42501';end if;
 return owner_id;
end; $$;
revoke all on function private.notification_require_owner() from public,anon,authenticated;
create function public.get_notification_preferences() returns table(category text,enabled boolean)
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
 owner_id:=private.notification_require_owner();
 return query select c.category,coalesce(p.enabled,true) from
 (values('social_requests'),('messages'),('hangout_updates'),('host_activity')) c(category)
 left join private.notification_preferences p on p.recipient_id=owner_id and p.category=c.category
 order by c.category;
end; $$;
create function public.set_notification_preference(p_category text,p_enabled boolean) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
 perform private.people_require_read_committed();
 if p_category is null or p_category not in('social_requests','messages','hangout_updates','host_activity') or p_enabled is null then
  raise exception 'Invalid notification preference' using errcode='22023';end if;
 owner_id:=auth.uid();
 if owner_id is null then raise exception 'Notifications unavailable' using errcode='42501';end if;
 perform 1 from private.notification_feature_gate where singleton for share;
 perform private.notification_lock_recipient(owner_id);
 if not private.notification_enabled() or not private.people_active_owner() then
  raise exception 'Notifications unavailable' using errcode='42501';end if;
 insert into private.notification_preferences(recipient_id,category,enabled) values(owner_id,p_category,p_enabled)
 on conflict(recipient_id,category) do update set enabled=excluded.enabled;
 return p_enabled;
end; $$;
create function public.list_notifications(p_after_created_at timestamptz default null,p_after_id uuid default null,p_limit integer default 24)
returns table(notification_id uuid,source_kind text,source_id uuid,event_code text,actor_id uuid,target_id uuid,label text,created_at timestamptz,read_at timestamptz)
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
 if p_limit is null or p_limit not between 1 and 24 or ((p_after_created_at is null)<>(p_after_id is null)) then
  raise exception 'Invalid notification page' using errcode='22023';end if;
 owner_id:=private.notification_require_owner();
 -- Authorization and output projection use one SELECT snapshot.
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
 else false end allowed from page n)
 select n.id,case when n.allowed then n.source_kind else null::text end,
 case when n.allowed then n.source_id else null::uuid end,
 case when n.allowed then n.event_code else null::text end,
 case when n.allowed then n.actor_id else null::uuid end,
 case when n.allowed then n.target_id else null::uuid end,
 case when not n.allowed then 'Unavailable' when n.event_code='friend_request' then 'Friend request'
 when n.event_code='friend_accepted' then 'Friend request accepted' when n.event_code='dm_request' then 'Message request'
 when n.event_code='dm_accepted' then 'Message request accepted' else 'Direct message' end,
 n.created_at,n.read_at from checked n order by n.created_at desc,n.id desc;
end; $$;
create function public.mark_notification_read(p_notification_id uuid) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
 owner_id:=private.notification_require_owner();
 if p_notification_id is null then return false;end if;
 perform 1 from private.notification_feature_gate where singleton for share;
 if not private.notification_enabled() or not private.people_active_owner() then
  raise exception 'Notifications unavailable' using errcode='42501';end if;
 update private.notification_items n set read_at=coalesce(n.read_at,clock_timestamp())
  where n.id=p_notification_id and n.recipient_id=owner_id;
 return found;
end; $$;
revoke all on function public.get_notification_preferences(),public.set_notification_preference(text,boolean),
 public.list_notifications(timestamptz,uuid,integer),public.mark_notification_read(uuid) from public,anon,authenticated;
grant execute on function public.get_notification_preferences(),public.set_notification_preference(text,boolean),
 public.list_notifications(timestamptz,uuid,integer),public.mark_notification_read(uuid) to authenticated;
commit;
