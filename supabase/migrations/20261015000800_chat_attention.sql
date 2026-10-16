-- TASK-034C / Accepted ADR-0043. Owner-private, disposable-local chat attention.
begin;

create table if not exists private.chat_attention_state (
 owner_id uuid not null references public.accounts(id) on delete cascade,
 source_kind text not null check(source_kind in ('dm','hangout')),
 source_id uuid not null,
 read_through_sequence bigint not null default 0 check(read_through_sequence>=0),
 last_used_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,source_kind,source_id)
);
create table if not exists private.chat_attention_snapshots (
 owner_id uuid primary key references public.accounts(id) on delete cascade,
 snapshot_id uuid not null unique default gen_random_uuid(),
 created_at timestamptz not null,
 expires_at timestamptz not null,
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=10000)
);
create index if not exists chat_attention_snapshots_expiry on private.chat_attention_snapshots(expires_at);
create table if not exists private.chat_attention_cursor_secret (
 singleton boolean primary key default true check(singleton),
 secret bytea not null
);
insert into private.chat_attention_cursor_secret values(true,
 pg_catalog.convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8'))
 on conflict(singleton) do nothing;
alter table private.chat_attention_state enable row level security;
alter table private.chat_attention_snapshots enable row level security;
alter table private.chat_attention_cursor_secret enable row level security;
revoke all on private.chat_attention_state,private.chat_attention_snapshots,
 private.chat_attention_cursor_secret from public,anon,authenticated,service_role;

-- The management row and body permission deliberately differ for DMs. This
-- mirrors list_dm_inbox and read_dm_messages, including friend-origin pause.
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
    and a.id in (d.low_id,d.high_id) and d.state in ('pending','accepted')
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
   and (d.state='pending' and d.initiator_id<>d.actor_id
    or d.state='accepted' and (d.recipient_consented or
     (exists(select 1 from private.friendship_feature_gate g where g.singleton and g.enabled)
      and exists(select 1 from private.friendships f where
       f.low_id=d.low_id and f.high_id=d.high_id and f.state='accepted')))),false)
 from dm_source d
 union all
 select null::uuid,null::text,'joined'::text,h.title,h.created_at,true
 from public.hangouts h where p_kind='hangout' and h.id=p_source
  and private.chat_authorized(h.id);
$$;
revoke all on function private.chat_attention_source(text,uuid) from public,anon,authenticated,service_role;

-- The visible-message predicate is intentionally the thread reader's one:
-- pending recipient / accepted consent for DM; blocked authors excluded for
-- Hangout before sequence paging and latest-message selection.
create or replace function private.chat_attention_visible(p_kind text,p_source uuid,p_after bigint,
 p_limit integer default 50)
returns table(sequence bigint,author_id uuid,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 with guard as materialized (
  select 1 allowed from private.chat_attention_source(p_kind,p_source) s where s.can_read),
 visible as (
  select m.sequence,m.author_id,m.created_at from guard g
   join private.dm_messages m on p_kind='dm' and m.generation_id=p_source
    and m.sequence>coalesce(p_after,0)
  union all
  select m.sequence,m.author_id,m.created_at from guard g
   join private.hangout_conversations c on p_kind='hangout' and c.hangout_id=p_source
   join private.hangout_messages m on m.conversation_id=c.id
    and m.sequence>coalesce(p_after,0)
    and not private.safety_pair_blocked(auth.uid(),m.author_id)
 )
 select sequence,author_id,created_at from visible order by sequence limit p_limit;
$$;
revoke all on function private.chat_attention_visible(text,uuid,bigint,integer)
 from public,anon,authenticated,service_role;

-- Existing currently readable history is baseline-read. An absent future row
-- remains at zero after a later join/reauthorization.
do $baseline$
declare x record; prior_sub text:=current_setting('request.jwt.claim.sub',true);
 prior_claims text:=current_setting('request.jwt.claims',true); max_sequence bigint;
begin
 for x in
  select d.low_id owner_id,'dm'::text source_kind,d.generation_id source_id
   from private.dm_pairs d where d.state in ('pending','accepted')
  union all
  select d.high_id,'dm',d.generation_id from private.dm_pairs d where d.state in ('pending','accepted')
  union all
  select p.account_id,'hangout',p.hangout_id from public.hangout_participants p where p.state='joined'
 loop
  perform pg_catalog.set_config('request.jwt.claim.sub',x.owner_id::text,true);
  perform pg_catalog.set_config('request.jwt.claims',jsonb_build_object('sub',x.owner_id,'role','authenticated')::text,true);
  if exists(select 1 from private.chat_attention_source(x.source_kind,x.source_id) s where s.can_read) then
   select coalesce(max(v.sequence),0) into max_sequence
    from private.chat_attention_visible(x.source_kind,x.source_id,0,2147483647) v;
   insert into private.chat_attention_state(owner_id,source_kind,source_id,read_through_sequence)
    values(x.owner_id,x.source_kind,x.source_id,max_sequence)
    on conflict(owner_id,source_kind,source_id) do nothing;
  end if;
 end loop;
 perform pg_catalog.set_config('request.jwt.claim.sub',coalesce(prior_sub,''),true);
 perform pg_catalog.set_config('request.jwt.claims',coalesce(prior_claims,''),true);
end $baseline$;

create or replace function private.chat_attention_cursor(p_snapshot uuid,p_offset integer) returns text
language sql stable security definer set search_path='' as $$
 select p_snapshot::text||'.'||p_offset::text||'.'||
  pg_catalog.encode(pg_catalog.sha256((select secret from private.chat_attention_cursor_secret where singleton)
   ||pg_catalog.convert_to(p_snapshot::text||'.'||p_offset::text,'UTF8')),'hex');
$$;
revoke all on function private.chat_attention_cursor(uuid,integer) from public,anon,authenticated,service_role;

-- This owner gate runs before snapshot cleanup, owner-row locks, cursor
-- validation, or candidate reads on every request. It does not reveal which
-- source gate or identity fact failed.
create or replace function private.chat_attention_owner_ready() returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); campus uuid;
begin
 if actor is null or current_setting('transaction_isolation')<>'read committed'
  or not private.people_active_owner() then return false; end if;
 campus:=private.people_ready_campus();
 return coalesce(campus is not null and private.ready_subject_campus(actor,campus)
  and ((private.dm_enabled() and private.pilot_capability_enabled('dm'))
   or (private.hangouts_enabled() and private.pilot_capability_enabled('hangout_chat')
    and exists(select 1 from private.hangout_chat_feature_gate where singleton and enabled))),false);
end $$;
revoke all on function private.chat_attention_owner_ready() from public,anon,authenticated,service_role;

-- Maintenance runs through the existing private local pg_cron pattern, not a
-- student RPC. Each run deletes at most 100 expired owner snapshots.
create or replace function private.chat_attention_cleanup_expired(p_limit integer default 100)
returns integer language plpgsql volatile security definer set search_path='' as $$
declare removed integer;
begin
 if p_limit is null or p_limit not between 1 and 100 then
  raise exception 'Chat attention unavailable' using errcode='42501'; end if;
 delete from private.chat_attention_snapshots where owner_id in (
  select owner_id from private.chat_attention_snapshots
   where expires_at<clock_timestamp() order by expires_at limit p_limit);
 get diagnostics removed=row_count;
 return removed;
end $$;
revoke all on function private.chat_attention_cleanup_expired(integer)
 from public,anon,authenticated,service_role;
create extension if not exists pg_cron with schema extensions;
select cron.schedule('pals-chat-attention-cleanup-minute','* * * * *',
 'select private.chat_attention_cleanup_expired(100)');

create or replace function public.list_my_chat_attention(p_cursor text default null,p_limit integer default 24)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); snap private.chat_attention_snapshots%rowtype;
 item jsonb; entries jsonb:='[]'::jsonb; result_items jsonb:='[]'::jsonb;
 kind text; source uuid; pos integer:=0; n integer; live_count integer:=0;
 projected record; more_live boolean:=false; next_token text;
 parts text[]; work_count integer; reuse_snapshot boolean:=false;
begin
 if actor is null or current_setting('transaction_isolation')<>'read committed'
  or p_limit is null or p_limit not between 1 and 24
  or (p_cursor is not null and length(p_cursor)>160)
  or not private.chat_attention_owner_ready() then
  raise exception 'Chat attention unavailable' using errcode='42501'; end if;
 if p_cursor is null then
  -- Match source-writer lock order before the account row. This serializes
  -- source creation across the 10,001-ID precheck and full ranking query.
  perform private.social_hangout_mutation_lock();
  if not private.chat_attention_owner_ready() then
   raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  -- The account lock serializes direct readiness changes. Recheck after its
  -- possible wait before snapshot creation.
  perform 1 from public.accounts where id=actor for update;
  if not private.chat_attention_owner_ready() then
   raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  select * into snap from private.chat_attention_snapshots where owner_id=actor for update;
  reuse_snapshot:=found and snap.created_at>clock_timestamp()-interval '100 milliseconds';
  -- Full eligible universe is ordered before any page limit. The LATERAL
  -- source guard removes terminal, revoked, and gate-disabled sources.
  if not reuse_snapshot then
  with candidates as (
   select 'dm'::text kind,d.generation_id id from private.dm_pairs d
    where d.state in ('pending','accepted') and (d.low_id=actor or d.high_id=actor)
   union all
   select 'hangout',p.hangout_id from public.hangout_participants p
    where p.account_id=actor and p.state='joined'
  )
  select count(*)::integer into work_count from (
   select 1 from candidates c
    join lateral private.chat_attention_source(c.kind,c.id) s on true
    limit 10001) bounded;
  if work_count>10000 then raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  with candidates as (
   select 'dm'::text kind,d.generation_id id from private.dm_pairs d
    where d.state in ('pending','accepted') and (d.low_id=actor or d.high_id=actor)
   union all
   select 'hangout',p.hangout_id from public.hangout_participants p
    where p.account_id=actor and p.state='joined'
  ), ranked as (
   select c.kind,c.id,greatest(v.latest_at,case when s.can_read then a.last_used_at end) activity,s.source_created_at
   from candidates c join lateral private.chat_attention_source(c.kind,c.id) s on true
   left join private.chat_attention_state a on a.owner_id=actor and a.source_kind=c.kind and a.source_id=c.id
   left join lateral (select max(m.created_at) latest_at from
    private.chat_attention_visible(c.kind,c.id,0,2147483647) m) v on s.can_read
  )
  select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'id',id)
    order by coalesce(activity,source_created_at) desc,kind collate "C" desc,id desc),'[]'::jsonb)
   into entries from ranked;
  if jsonb_array_length(entries)>10000 then
   raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  end if;
  if not reuse_snapshot then
   insert into private.chat_attention_snapshots(owner_id,snapshot_id,created_at,expires_at,items)
    values(actor,gen_random_uuid(),clock_timestamp(),clock_timestamp()+interval '5 minutes',entries)
    on conflict(owner_id) do update set snapshot_id=excluded.snapshot_id,
     created_at=excluded.created_at,expires_at=excluded.expires_at,items=excluded.items
    returning * into snap;
  end if;
 else
  parts:=string_to_array(p_cursor,'.');
  if array_length(parts,1)<>3 or parts[1] !~ '^[0-9a-f-]{36}$'
   or parts[2] !~ '^[0-9]{1,5}$' or parts[3] !~ '^[0-9a-f]{64}$' then
   raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  pos:=parts[2]::integer;
  if pos<1 or pos>10000 or private.chat_attention_cursor(parts[1]::uuid,pos)<>p_cursor then
   raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  select * into snap from private.chat_attention_snapshots
   where owner_id=actor and snapshot_id=parts[1]::uuid and expires_at>clock_timestamp();
  if not found or pos>=jsonb_array_length(snap.items) then
   raise exception 'Chat attention unavailable' using errcode='42501'; end if;
 end if;
 n:=jsonb_array_length(snap.items);
 while pos<n loop
  item:=snap.items->pos; pos:=pos+1;
  kind:=item->>'kind'; source:=(item->>'id')::uuid;
  -- One statement snapshot binds the current source guard, allowed label,
  -- watermark, and owner-visible message activity for this returned row.
  select s.peer_id,s.direction,s.source_state,s.label,
   coalesce(greatest(m.latest_at,case when s.can_read then a.last_used_at end),s.source_created_at) rank_time,
   coalesce(m.unread,false) has_unread
   into projected from private.chat_attention_source(kind,source) s
   left join private.chat_attention_state a on a.owner_id=actor
    and a.source_kind=kind and a.source_id=source
   left join lateral (
    select max(v.created_at) latest_at,
     bool_or(v.author_id<>actor and v.sequence>coalesce(a.read_through_sequence,0)) unread
    from private.chat_attention_visible(kind,source,0,2147483647) v
   ) m on s.can_read;
  if not found then continue; end if;
  if live_count>=p_limit then more_live:=true; exit; end if;
  result_items:=result_items||jsonb_build_array(jsonb_build_object(
   'source_kind',kind,'source_id',source,'peer_id',projected.peer_id,
   'direction',projected.direction,'state',projected.source_state,'label',projected.label,
   'sort_time',projected.rank_time,'has_unread',projected.has_unread));
  live_count:=live_count+1;
 end loop;
 if more_live then next_token:=private.chat_attention_cursor(snap.snapshot_id,pos-1); end if;
 return jsonb_build_object('items',result_items,'has_more',more_live,'next_cursor',next_token);
end $$;
revoke all on function public.list_my_chat_attention(text,integer) from public,anon,authenticated;
grant execute on function public.list_my_chat_attention(text,integer) to authenticated;

create or replace function public.touch_my_chat(p_source_kind text,p_source_id uuid) returns timestamptz
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); src record; peer uuid; prior timestamptz; now_at timestamptz;
begin
 perform private.social_hangout_mutation_lock();
 if actor is null or p_source_id is null or p_source_kind not in ('dm','hangout') then
  raise exception 'Chat attention unavailable' using errcode='42501'; end if;
 if p_source_kind='dm' then
  select case when low_id=actor then high_id else low_id end into peer from private.dm_pairs
   where generation_id=p_source_id and (low_id=actor or high_id=actor);
  if peer is null then raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  perform private.friendship_lock_pair(actor,peer);
 else
  perform private.lock_hangout(p_source_id);
 end if;
 select * into src from private.chat_attention_source(p_source_kind,p_source_id);
 if not found or not src.can_read or (p_source_kind='dm' and src.source_state<>'accepted') then
  raise exception 'Chat attention unavailable' using errcode='42501'; end if;
 select last_used_at into prior from private.chat_attention_state
  where owner_id=actor and source_kind=p_source_kind and source_id=p_source_id for update;
 now_at:=clock_timestamp();
 if prior is not null and prior>now_at-interval '5 seconds' then return prior; end if;
 insert into private.chat_attention_state(owner_id,source_kind,source_id,last_used_at)
  values(actor,p_source_kind,p_source_id,now_at)
  on conflict(owner_id,source_kind,source_id) do update
   set last_used_at=greatest(private.chat_attention_state.last_used_at,excluded.last_used_at),
       updated_at=excluded.last_used_at
  returning last_used_at into prior;
 return prior;
end $$;
revoke all on function public.touch_my_chat(text,uuid) from public,anon,authenticated;
grant execute on function public.touch_my_chat(text,uuid) to authenticated;

create or replace function public.acknowledge_chat_page(p_source_kind text,p_source_id uuid,
 p_highest_visible_sequence bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); src record; peer uuid; watermark bigint; allowed boolean;
begin
 perform private.social_hangout_mutation_lock();
 if actor is null or p_source_id is null or p_source_kind not in ('dm','hangout')
  or p_highest_visible_sequence is null or p_highest_visible_sequence<1 then
  raise exception 'Chat attention unavailable' using errcode='42501'; end if;
 if p_source_kind='dm' then
  select case when low_id=actor then high_id else low_id end into peer from private.dm_pairs
   where generation_id=p_source_id and (low_id=actor or high_id=actor);
  if peer is null then raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  perform private.friendship_lock_pair(actor,peer);
 else
  perform private.lock_hangout(p_source_id);
 end if;
 select * into src from private.chat_attention_source(p_source_kind,p_source_id);
 if not found or not src.can_read then raise exception 'Chat attention unavailable' using errcode='42501'; end if;
 insert into private.chat_attention_state(owner_id,source_kind,source_id)
  values(actor,p_source_kind,p_source_id) on conflict do nothing;
 select read_through_sequence into watermark from private.chat_attention_state
  where owner_id=actor and source_kind=p_source_kind and source_id=p_source_id for update;
 -- A stale replay is harmless only while the source still authorizes.
 if p_highest_visible_sequence<=watermark then return watermark; end if;
 select exists(select 1 from private.chat_attention_visible(p_source_kind,p_source_id,watermark,50) m
  where m.sequence=p_highest_visible_sequence) into allowed;
 if not allowed then raise exception 'Chat attention unavailable' using errcode='42501'; end if;
 update private.chat_attention_state set read_through_sequence=p_highest_visible_sequence,
  updated_at=clock_timestamp() where owner_id=actor and source_kind=p_source_kind and source_id=p_source_id;
 return p_highest_visible_sequence;
end $$;
revoke all on function public.acknowledge_chat_page(text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.acknowledge_chat_page(text,uuid,bigint) to authenticated;
commit;
