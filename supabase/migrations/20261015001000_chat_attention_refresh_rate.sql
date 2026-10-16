-- TASK-034C additive rate remediation after applied 00800. Do not rewrite 00800.
begin;
alter table private.chat_attention_snapshots
 add column if not exists rate_window_started_at timestamptz;
alter table private.chat_attention_snapshots
 add column if not exists rate_creation_count integer
 check(rate_creation_count between 1 and 12);
-- Existing rows have NULL budget and start their first counted refresh hereafter.
-- The owner account lock in the RPC serializes all same-owner counter changes.
create or replace function public.list_my_chat_attention(p_cursor text default null,p_limit integer default 24)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); snap private.chat_attention_snapshots%rowtype;
 item jsonb; entries jsonb:='[]'::jsonb; result_items jsonb:='[]'::jsonb;
 kind text; source uuid; pos integer:=0; n integer; live_count integer:=0;
 projected record; more_live boolean:=false; next_token text;
 parts text[]; work_count integer; reuse_snapshot boolean:=false;
 refresh_time timestamptz; next_window timestamptz; next_count integer;
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
  refresh_time:=clock_timestamp();
  reuse_snapshot:=found and snap.expires_at>refresh_time
   and snap.created_at>refresh_time-interval '1 second';
  if not reuse_snapshot then
   if snap.rate_window_started_at is not null
    and snap.rate_window_started_at>refresh_time-interval '1 minute'
    and coalesce(snap.rate_creation_count,0)>=12 then
    raise exception 'Chat attention unavailable' using errcode='42501'; end if;
   if snap.rate_window_started_at is null
    or snap.rate_window_started_at<=refresh_time-interval '1 minute' then
    next_window:=refresh_time; next_count:=1;
   else
    next_window:=snap.rate_window_started_at;
    next_count:=coalesce(snap.rate_creation_count,0)+1;
   end if;
  end if;
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
  select coalesce(jsonb_agg(jsonb_build_object('kind',r.kind,'id',r.id)
    order by coalesce(r.activity,r.source_created_at) desc,r.kind collate "C" desc,r.id desc),'[]'::jsonb)
   into entries from ranked r;
  if jsonb_array_length(entries)>10000 then
   raise exception 'Chat attention unavailable' using errcode='42501'; end if;
  end if;
  if not reuse_snapshot then
   insert into private.chat_attention_snapshots(owner_id,snapshot_id,created_at,expires_at,items,
    rate_window_started_at,rate_creation_count)
    values(actor,gen_random_uuid(),refresh_time,refresh_time+interval '5 minutes',entries,
     next_window,next_count)
    on conflict(owner_id) do update set snapshot_id=excluded.snapshot_id,
     created_at=excluded.created_at,expires_at=excluded.expires_at,items=excluded.items,
     rate_window_started_at=excluded.rate_window_started_at,
     rate_creation_count=excluded.rate_creation_count
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
commit;
