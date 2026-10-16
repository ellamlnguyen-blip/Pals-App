-- TASK-033FG / Accepted ADR-0042. Private, bounded database notification work.
begin;
-- Close the backfill/install gap: existing writers finish before the snapshot,
-- and later writers wait until the capture triggers are committed.
lock table public.hangouts in share row exclusive mode;

alter table private.notification_preferences drop constraint notification_preferences_category_check;
alter table private.notification_preferences add constraint notification_preferences_category_check
 check(category in ('social_requests','messages','hangout_updates','host_activity',
  'campus_new_hangout','friend_created_hangout','friend_joined_hangout'));
alter table private.notification_preferences add column enabled_at timestamptz;
update private.notification_preferences set enabled_at=clock_timestamp() where enabled and enabled_at is null;

create or replace function public.get_notification_preferences() returns table(category text,enabled boolean)
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
 owner_id:=private.notification_require_owner();
 return query select c.category,coalesce(p.enabled,c.default_on) from
 (values ('social_requests',true),('messages',true),('hangout_updates',true),('host_activity',true),
  ('campus_new_hangout',false),('friend_created_hangout',false),('friend_joined_hangout',false)) c(category,default_on)
 left join private.notification_preferences p on p.recipient_id=owner_id and p.category=c.category
 order by c.category;
end; $$;

create or replace function public.set_notification_preference(p_category text,p_enabled boolean) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
 perform private.people_require_read_committed();
 if p_category is null or p_category not in ('social_requests','messages','hangout_updates','host_activity',
   'campus_new_hangout','friend_created_hangout','friend_joined_hangout') or p_enabled is null then
  raise exception 'Invalid notification preference' using errcode='22023'; end if;
 owner_id:=auth.uid();
 if owner_id is null then raise exception 'Notifications unavailable' using errcode='42501'; end if;
 perform 1 from private.notification_feature_gate where singleton for share;
 perform private.notification_lock_recipient(owner_id);
 if not private.notification_enabled() or not private.people_active_owner() then
  raise exception 'Notifications unavailable' using errcode='42501'; end if;
 insert into private.notification_preferences(recipient_id,category,enabled,enabled_at)
 values(owner_id,p_category,p_enabled,case when p_enabled then clock_timestamp() else null end)
 on conflict(recipient_id,category) do update set enabled=excluded.enabled,
  enabled_at=case when excluded.enabled and not private.notification_preferences.enabled
    then clock_timestamp() when excluded.enabled then private.notification_preferences.enabled_at else null end;
 return p_enabled;
end; $$;

-- One row per source transition. Insertion is constant time and never enumerates a campus.
create table private.notification_actions (
 id uuid primary key default gen_random_uuid(),
 hangout_id uuid not null references public.hangouts(id) on delete cascade,
 actor_id uuid not null references public.accounts(id) on delete cascade,
 action_kind text not null check(action_kind in ('created','joined')),
 created_at timestamptz not null default clock_timestamp(),
 cursor_id uuid,
 finished_at timestamptz,
 retry_at timestamptz,
 attempts integer not null default 0,
 last_error text
);
create index notification_actions_pending on private.notification_actions(created_at,id) where finished_at is null;
alter table private.notification_actions enable row level security;
revoke all on private.notification_actions from public,anon,authenticated,service_role;

-- Monotonic schedule identity: A -> B -> A must not revive A's old cursor or
-- its retained inbox rows. The Hangout parent is locked before this state.
create table private.notification_schedule_state (
 hangout_id uuid primary key references public.hangouts(id) on delete cascade,
 current_revision bigint not null check(current_revision>0)
);
alter table private.notification_schedule_state enable row level security;
revoke all on private.notification_schedule_state from public,anon,authenticated,service_role;

-- A late join uses the current occurrence identity for the present revision.
create table private.notification_reminder_occurrences (
 id uuid primary key default gen_random_uuid(),
 hangout_id uuid not null references public.hangouts(id) on delete cascade,
 schedule_revision bigint not null,
 starts_at timestamptz not null,
 due_at timestamptz not null,
 cursor_id uuid,
 finished_at timestamptz,
 retry_at timestamptz,
 attempts integer not null default 0,
 last_error text,
 unique(hangout_id,schedule_revision)
);
create index notification_reminders_pending on private.notification_reminder_occurrences(due_at,id) where finished_at is null;
alter table private.notification_reminder_occurrences enable row level security;
revoke all on private.notification_reminder_occurrences from public,anon,authenticated,service_role;

-- Existing sources need a schedule identity even though there is no historical
-- optional activity backfill. Only future published starts get pending work.
insert into private.notification_schedule_state(hangout_id,current_revision)
 select h.id,1 from public.hangouts h;
insert into private.notification_reminder_occurrences(hangout_id,schedule_revision,starts_at,due_at)
 select h.id,1,h.starts_at,h.starts_at-interval '1 hour' from public.hangouts h
 where h.status='published' and h.starts_at>clock_timestamp();

create table private.notification_late_joins (
 occurrence_id uuid not null references private.notification_reminder_occurrences(id) on delete cascade,
 recipient_id uuid not null references public.accounts(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 retry_at timestamptz,
 attempts integer not null default 0,
 last_error text,
 primary key(occurrence_id,recipient_id)
);
create index notification_late_joins_pending on private.notification_late_joins(created_at) where finished_at is null;
alter table private.notification_late_joins enable row level security;
revoke all on private.notification_late_joins from public,anon,authenticated,service_role;

create function private.notification_source_hangout() returns trigger
language plpgsql security definer set search_path='' as $$
declare next_revision bigint;
begin
 if tg_op='INSERT' then
  if new.status='published' then
   insert into private.notification_schedule_state(hangout_id,current_revision) values(new.id,1);
   insert into private.notification_actions(hangout_id,actor_id,action_kind) values(new.id,new.host_id,'created');
   insert into private.notification_reminder_occurrences(hangout_id,schedule_revision,starts_at,due_at)
    values(new.id,1,new.starts_at,new.starts_at-interval '1 hour');
  end if;
 elsif new.starts_at is distinct from old.starts_at and new.status='published' then
  update private.notification_schedule_state set current_revision=current_revision+1
   where hangout_id=new.id returning current_revision into next_revision;
  if next_revision is null then raise exception 'Missing reminder schedule state'; end if;
  insert into private.notification_reminder_occurrences(hangout_id,schedule_revision,starts_at,due_at)
   values(new.id,next_revision,new.starts_at,new.starts_at-interval '1 hour');
 end if;
 return new;
end; $$;
create trigger notification_source_hangout after insert or update of starts_at on public.hangouts
 for each row execute function private.notification_source_hangout();

create function private.notification_source_join() returns trigger
language plpgsql security definer set search_path='' as $$
declare h public.hangouts; occ uuid;
begin
 if new.state<>'joined' or (tg_op='UPDATE' and old.state='joined') then return new; end if;
 select * into h from public.hangouts where id=new.hangout_id;
 if h.status<>'published' or new.account_id=h.host_id then return new; end if;
 insert into private.notification_actions(hangout_id,actor_id,action_kind)
  values(h.id,new.account_id,'joined');
 if h.starts_at>clock_timestamp() and h.starts_at-interval '1 hour'<=clock_timestamp() then
  select o.id into occ from private.notification_reminder_occurrences o
   join private.notification_schedule_state s on s.hangout_id=o.hangout_id
    and s.current_revision=o.schedule_revision
   where o.hangout_id=h.id and o.starts_at=h.starts_at;
  if occ is not null then
   insert into private.notification_late_joins(occurrence_id,recipient_id)
    values(occ,new.account_id) on conflict do nothing;
  end if;
 end if;
 return new;
end; $$;
create trigger notification_source_join after insert or update of state on public.hangout_participants
 for each row execute function private.notification_source_join();

alter table private.notification_items drop constraint notification_items_event_code_check;
alter table private.notification_items add constraint notification_items_event_code_check check(event_code in
 ('friend_request','friend_accepted','dm_request','dm_accepted','dm_message','hangout_edited',
 'hangout_cancelled','hangout_joined','hangout_left','hangout_chat_message','cohost_invitation',
 'campus_new_hangout','friend_created_hangout','friend_joined_hangout','hangout_start_reminder'));
alter table private.notification_items drop constraint notification_items_source_kind_check;
alter table private.notification_items add constraint notification_items_source_kind_check check(source_kind in
 ('friendship','dm','hangout','hangout_chat','hangout_invitation','hangout_activity','hangout_reminder'));
alter table private.notification_items drop constraint notification_items_check;
alter table private.notification_items add constraint notification_items_check check(
 (source_kind='friendship' and event_code in('friend_request','friend_accepted') and source_id=target_id)
 or (source_kind='dm' and event_code in('dm_request','dm_accepted') and source_id=target_id)
 or (source_kind='dm' and event_code='dm_message')
 or (source_kind='hangout' and event_code in('hangout_edited','hangout_cancelled','hangout_joined','hangout_left'))
 or (source_kind='hangout_chat' and event_code='hangout_chat_message')
 or (source_kind='hangout_invitation' and event_code='cohost_invitation')
 or (source_kind='hangout_activity' and event_code in('campus_new_hangout','friend_created_hangout','friend_joined_hangout'))
 or (source_kind='hangout_reminder' and event_code='hangout_start_reminder'));
-- A host is also a joined reminder recipient. The earlier Hangout extension
-- replaced its broad actor check with a source-shape check.
alter table private.notification_items add constraint notification_items_actor_check
 check(recipient_id<>actor_id or event_code='hangout_start_reminder');
create unique index notification_activity_one_per_action
 on private.notification_items(recipient_id,source_id) where source_kind='hangout_activity';

-- All recipient decisions are repeated at delivery and inbox read. No caller identity is accepted.
create function private.notification_recipient_can_discover(p_hangout uuid,p_recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select private.pilot_capability_enabled('hangouts') and private.hangouts_enabled()
  and private.notification_enabled() and exists(select 1 from public.hangouts h
   where h.id=p_hangout and h.status='published' and h.visibility='campus'
    and h.location_precision='approximate_area' and private.ready_subject_campus(h.host_id,h.university_id)
    and private.ready_subject_campus(p_recipient,h.university_id)
    and not exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
    and not private.safety_pair_blocked(p_recipient,h.host_id));
$$;
create function private.notification_current_friend(p_a uuid,p_b uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select private.friendship_enabled() and private.people_enabled()
  and private.pilot_capability_enabled('friendship') and private.pilot_capability_enabled('people')
  and exists(select 1 from private.friendships f where f.low_id=least(p_a,p_b)
   and f.high_id=greatest(p_a,p_b) and f.state='accepted')
  and not private.safety_pair_blocked(p_a,p_b);
$$;
create function private.notification_activity_category(p_action uuid,p_recipient uuid)
returns text language plpgsql stable security definer set search_path='' as $$
declare a private.notification_actions; h public.hangouts; candidate text;
begin
 select * into a from private.notification_actions where id=p_action;
 if not found or a.actor_id=p_recipient or not private.notification_recipient_can_discover(a.hangout_id,p_recipient)
  then return null; end if;
 select * into h from public.hangouts where id=a.hangout_id;
 if a.action_kind='joined' and (p_recipient=h.host_id
  or not private.ready_subject_campus(a.actor_id,h.university_id)
  or not exists(select 1 from public.hangout_participants p
   where p.hangout_id=h.id and p.account_id=a.actor_id and p.state='joined')) then return null; end if;
 if a.action_kind='created' and private.notification_current_friend(h.host_id,p_recipient) then
  candidate:='friend_created_hangout';
  if exists(select 1 from private.notification_preferences p where p.recipient_id=p_recipient
   and p.category=candidate and p.enabled and p.enabled_at<=a.created_at) then return candidate; end if;
 end if;
 if a.action_kind='joined' and private.notification_current_friend(a.actor_id,p_recipient) then
  candidate:='friend_joined_hangout';
  if exists(select 1 from private.notification_preferences p where p.recipient_id=p_recipient
   and p.category=candidate and p.enabled and p.enabled_at<=a.created_at) then return candidate; end if;
 end if;
 if a.action_kind='created' and exists(select 1 from private.notification_preferences p where p.recipient_id=p_recipient
  and p.category='campus_new_hangout' and p.enabled and p.enabled_at<=a.created_at) then
  return 'campus_new_hangout'; end if;
 return null;
end; $$;

-- Inbox authorization intentionally ignores current preference: muting affects
-- later delivery, not previously delivered rows.
create function private.notification_activity_readable(p_action uuid,p_recipient uuid,p_code text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare a private.notification_actions; h public.hangouts;
begin
 select * into a from private.notification_actions where id=p_action;
 if not found or a.actor_id=p_recipient or not private.notification_recipient_can_discover(a.hangout_id,p_recipient)
  then return false; end if;
 select * into h from public.hangouts where id=a.hangout_id;
 if p_code='campus_new_hangout' then return a.action_kind='created'; end if;
 if p_code='friend_created_hangout' then return a.action_kind='created'
  and private.notification_current_friend(h.host_id,p_recipient); end if;
 if p_code='friend_joined_hangout' then return a.action_kind='joined'
  and p_recipient<>h.host_id and private.notification_current_friend(a.actor_id,p_recipient)
  and private.ready_subject_campus(a.actor_id,h.university_id)
  and exists(select 1 from public.hangout_participants p where p.hangout_id=h.id
   and p.account_id=a.actor_id and p.state='joined'); end if;
 return false;
end; $$;

create function private.notification_deliver_activity(p_action uuid,p_recipient uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare a private.notification_actions; h public.hangouts; code text;
begin
 select * into a from private.notification_actions where id=p_action;
 if not found then return; end if;
 select * into h from public.hangouts where id=a.hangout_id for share;
 if not found then return; end if;
 perform 1 from private.hangout_feature_gate where singleton for share;
 perform 1 from private.notification_feature_gate where singleton for share;
 perform private.notification_lock_recipient(p_recipient);
 code:=private.notification_activity_category(p_action,p_recipient);
 if code is not null then
  insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
   values(p_recipient,'hangout_activity',a.id,h.id,code,a.actor_id)
   on conflict do nothing;
 end if;
end; $$;

create function private.notification_deliver_reminder(p_occurrence uuid,p_recipient uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare o private.notification_reminder_occurrences; h public.hangouts;
begin
 select * into o from private.notification_reminder_occurrences where id=p_occurrence;
 if not found then return; end if;
 select * into h from public.hangouts where id=o.hangout_id for share;
 if not found then return; end if;
 perform 1 from private.hangout_feature_gate where singleton for share;
 perform 1 from private.notification_feature_gate where singleton for share;
 perform private.notification_lock_recipient(p_recipient);
 if h.starts_at=o.starts_at and o.due_at<=clock_timestamp() and h.starts_at>clock_timestamp()
  and exists(select 1 from private.notification_schedule_state s
   where s.hangout_id=h.id and s.current_revision=o.schedule_revision)
  and private.notification_recipient_can_discover(h.id,p_recipient)
  and not exists(select 1 from private.notification_preferences p where p.recipient_id=p_recipient
   and p.category='hangout_updates' and not p.enabled)
  and exists(select 1 from public.hangout_participants p where p.hangout_id=h.id
   and p.account_id=p_recipient and p.state='joined') then
  insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
   values(p_recipient,'hangout_reminder',o.id,h.id,'hangout_start_reminder',h.host_id)
   on conflict(recipient_id,source_kind,source_id,event_code) do nothing;
 end if;
end; $$;

-- A single cron call advances at most 100 recipient positions across all queues.
-- Errors retain the row and the SQLSTATE for a later bounded retry.
create function private.run_notification_jobs(p_limit integer default 100) returns integer
language plpgsql volatile security definer set search_path='' as $$
declare remaining integer; phase_budget integer; processed integer:=0;
 item record; locked record; source_row public.hangouts; recipient uuid; n integer; had_error boolean;
begin
 if session_user not in ('postgres','supabase_admin') then
  raise exception 'Worker unavailable' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'Invalid batch' using errcode='22023'; end if;
 remaining:=p_limit;
 -- Reserve one third for due occurrences before activity fan-out. The cron
 -- schedule uses 100, so even a campus backlog cannot starve reminders.
 phase_budget:=least(remaining,greatest(1,(p_limit+2)/3));
 for item in select o.id,o.hangout_id from private.notification_reminder_occurrences o
  where o.finished_at is null and o.due_at<=clock_timestamp()
   and (o.retry_at is null or o.retry_at<=clock_timestamp())
  order by o.due_at,o.id limit p_limit loop
  exit when phase_budget<=0;
  select * into source_row from public.hangouts h where h.id=item.hangout_id for share;
  select o.* into locked from private.notification_reminder_occurrences o
   where o.id=item.id and o.finished_at is null for update skip locked;
  if not found then continue; end if;
  if source_row.status<>'published' or source_row.starts_at<>locked.starts_at
   or not exists(select 1 from private.notification_schedule_state s
    where s.hangout_id=locked.hangout_id and s.current_revision=locked.schedule_revision) then
   update private.notification_reminder_occurrences set finished_at=clock_timestamp() where id=locked.id;
   continue;
  end if;
  had_error:=false; n:=0;
  for recipient in select p.account_id from public.hangout_participants p
   where p.hangout_id=locked.hangout_id and p.state='joined'
    and (locked.cursor_id is null or p.account_id>locked.cursor_id)
   order by p.account_id limit phase_budget loop
   begin
    perform private.notification_deliver_reminder(locked.id,recipient);
    update private.notification_reminder_occurrences set cursor_id=recipient where id=locked.id;
    n:=n+1; processed:=processed+1;
   exception when others then
    update private.notification_reminder_occurrences set attempts=attempts+1,
     last_error=sqlstate||': '||left(sqlerrm,400),retry_at=clock_timestamp()+interval '1 minute'
     where id=locked.id;
    remaining:=remaining-1; phase_budget:=phase_budget-1;
    had_error:=true; exit;
   end;
  end loop;
  if not had_error and n<phase_budget then
   update private.notification_reminder_occurrences set finished_at=clock_timestamp() where id=locked.id;
  end if;
  remaining:=remaining-n; phase_budget:=phase_budget-n;
 end loop;
 -- Late joins have their own share even if an older occurrence has thousands
 -- of joined recipients. The same occurrence ID deduplicates either path.
 if remaining>0 then
  phase_budget:=least(remaining,greatest(1,(p_limit+2)/3));
  for item in select l.occurrence_id,l.recipient_id,o.hangout_id,o.starts_at,o.schedule_revision
   from private.notification_late_joins l
   join private.notification_reminder_occurrences o on o.id=l.occurrence_id
   where l.finished_at is null and (l.retry_at is null or l.retry_at<=clock_timestamp())
   order by l.created_at,l.occurrence_id,l.recipient_id limit p_limit loop
   exit when phase_budget<=0;
   select * into source_row from public.hangouts h where h.id=item.hangout_id for share;
   select l.* into locked from private.notification_late_joins l
    where l.occurrence_id=item.occurrence_id and l.recipient_id=item.recipient_id
     and l.finished_at is null for update skip locked;
   if not found then continue; end if;
   if source_row.status<>'published' or source_row.starts_at<>item.starts_at
    or not exists(select 1 from private.notification_schedule_state s
     where s.hangout_id=item.hangout_id and s.current_revision=item.schedule_revision) then
    update private.notification_late_joins set finished_at=clock_timestamp()
     where occurrence_id=locked.occurrence_id and recipient_id=locked.recipient_id;
    continue;
   end if;
   begin
    perform private.notification_deliver_reminder(locked.occurrence_id,locked.recipient_id);
    update private.notification_late_joins set finished_at=clock_timestamp()
     where occurrence_id=locked.occurrence_id and recipient_id=locked.recipient_id;
    processed:=processed+1; remaining:=remaining-1; phase_budget:=phase_budget-1;
   exception when others then
    update private.notification_late_joins set attempts=attempts+1,
     last_error=sqlstate||': '||left(sqlerrm,400),retry_at=clock_timestamp()+interval '1 minute'
     where occurrence_id=locked.occurrence_id and recipient_id=locked.recipient_id;
    remaining:=remaining-1; phase_budget:=phase_budget-1;
   end;
  end loop;
 end if;
 if remaining>0 then
  for item in select a.id,a.hangout_id,h.university_id from private.notification_actions a
   join public.hangouts h on h.id=a.hangout_id where a.finished_at is null
    and (a.retry_at is null or a.retry_at<=clock_timestamp())
   order by a.created_at,a.id limit 1 loop
   select * into source_row from public.hangouts h where h.id=item.hangout_id for share;
   select a.* into locked from private.notification_actions a
    where a.id=item.id and a.finished_at is null for update skip locked;
   if not found then continue; end if;
   if source_row.status<>'published' or (locked.action_kind='joined' and not exists
    (select 1 from public.hangout_participants p where p.hangout_id=locked.hangout_id
     and p.account_id=locked.actor_id and p.state='joined')) then
    update private.notification_actions set finished_at=clock_timestamp() where id=locked.id;
    continue;
   end if;
   had_error:=false; n:=0;
   for recipient in select ac.id from public.accounts ac
    join public.university_memberships m on m.user_id=ac.id
    where m.university_id=item.university_id and (locked.cursor_id is null or ac.id>locked.cursor_id)
    order by ac.id limit remaining loop
    begin
     perform private.notification_deliver_activity(locked.id,recipient);
     update private.notification_actions set cursor_id=recipient where id=locked.id;
     n:=n+1; processed:=processed+1;
    exception when others then
     update private.notification_actions set attempts=attempts+1,
      last_error=sqlstate||': '||left(sqlerrm,400),retry_at=clock_timestamp()+interval '1 minute'
      where id=locked.id;
     remaining:=remaining-1;
     had_error:=true; exit;
    end;
   end loop;
   if not had_error and n<remaining then
    update private.notification_actions set finished_at=clock_timestamp() where id=locked.id;
   end if;
   remaining:=remaining-n;
  end loop;
 end if;
 return processed;
end; $$;

revoke all on function private.notification_source_hangout(),private.notification_source_join(),
 private.notification_recipient_can_discover(uuid,uuid),private.notification_current_friend(uuid,uuid),
 private.notification_activity_category(uuid,uuid),private.notification_activity_readable(uuid,uuid,text),
 private.notification_deliver_activity(uuid,uuid),
 private.notification_deliver_reminder(uuid,uuid),private.run_notification_jobs(integer)
 from public,anon,authenticated,service_role;

create extension if not exists pg_cron with schema extensions;
select cron.schedule('pals-notification-jobs-minute','* * * * *',
 'select private.run_notification_jobs(100)');

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
       where m.id=n.source_id and m.generation_id=d.generation_id and m.author_id=n.actor_id and (m.sequence>1 or d.consent_origin='friend')))))
  and private.dm_eligible(n.actor_id)
  and (n.event_code='dm_request' or private.dm_current_consent(n.target_id,owner_id,n.actor_id))
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

commit;
