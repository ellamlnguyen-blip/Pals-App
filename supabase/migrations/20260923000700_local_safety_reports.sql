-- ADR-0018 / TASK-016B. Disposable-local allegation intake; no client reader.
begin;

create table private.safety_reports (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default clock_timestamp(),
  reporter_id uuid not null references public.accounts(id) on delete cascade,
  target_type text not null check (target_type in ('user','hangout')),
  target_id uuid not null,
  category text not null check (category in
    ('harassment','safety concern','impersonation','spam/commercial promotion','other')),
  narrative text check (narrative is null or
    (narrative=private.profile_trim(narrative) and length(narrative) between 1 and 2000)),
  provenance_kind text not null check (provenance_kind in
    ('current_people','owned_block','friendship','friend_request','dm_generation',
     'hangout_host','hangout_overlap','current_hangout','retained_hangout','retained_host')),
  provenance_ref_id uuid not null,
  check ((category='other' and narrative is not null) or category<>'other')
);
create index safety_reports_reporter_time_idx on private.safety_reports
  (reporter_id,submitted_at desc);
alter table private.safety_reports enable row level security;
revoke all on private.safety_reports from public,anon,authenticated;

create table private.safety_report_requests (
  reporter_id uuid not null references public.accounts(id) on delete cascade,
  request_id uuid not null,
  input_fingerprint text not null,
  report_id uuid not null unique references private.safety_reports(id) on delete cascade,
  primary key (reporter_id,request_id)
);
alter table private.safety_report_requests enable row level security;
revoke all on private.safety_report_requests from public,anon,authenticated;

-- Match A's retained peer predicates. The reference is an opaque original
-- source identifier, retained privately; no source body or profile is copied.
create function private.safety_report_peer_source(p_actor uuid,p_peer uuid)
returns table(kind text,ref_id uuid)
language sql stable security definer set search_path='' as $$
  select v.kind,v.ref_id from (
    select 1 priority,'owned_block'::text kind,b.blocked_id ref_id
      from private.people_blocks b where b.blocker_id=p_actor and b.blocked_id=p_peer
    union all
    select 2,'friendship',f.generation_id from private.friendships f
      where f.low_id=least(p_actor,p_peer) and f.high_id=greatest(p_actor,p_peer)
    union all
    select 3,'friend_request',r.generation_id from private.friendship_create_requests r
      where (r.actor_id=p_actor and r.target_id=p_peer)
        or (r.actor_id=p_peer and r.target_id=p_actor)
    union all
    select 4,'dm_generation',d.generation_id from private.dm_pairs d
      where d.low_id=least(p_actor,p_peer) and d.high_id=greatest(p_actor,p_peer)
    union all
    select 5,'hangout_host',h.id from public.hangouts h
      join public.hangout_participants mine on mine.hangout_id=h.id
        and mine.account_id=p_actor where h.host_id=p_peer
    union all
    select 6,'hangout_overlap',v.hangout_id from private.hangout_peer_provenance v
      where v.low_id=least(p_actor,p_peer) and v.high_id=greatest(p_actor,p_peer)
    union all
    select 7,'hangout_overlap',mine.hangout_id
      from public.hangout_participants mine
      join public.hangout_participants peer on peer.hangout_id=mine.hangout_id
      where mine.account_id=p_actor and peer.account_id=p_peer
        and mine.joined_at < coalesce(peer.left_at,peer.removed_at,'infinity'::timestamptz)
        and peer.joined_at < coalesce(mine.left_at,mine.removed_at,'infinity'::timestamptz)
  ) v order by v.priority,v.ref_id limit 1;
$$;
revoke all on function private.safety_report_peer_source(uuid,uuid)
  from public,anon,authenticated;

-- The caller supplies a mode/reference, never a reporter or resolved host. An
-- original-input JSON array encodes null and empty narrative identically after
-- trimming; mode/reference remain distinct even if they resolve to one user.
create function public.submit_safety_report(
  p_request_id uuid,p_target_mode text,p_target_id uuid,
  p_category text,p_narrative text default null)
returns table(receipt_id uuid,submitted_at timestamptz)
language plpgsql volatile security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); normalized_category text; normalized_narrative text;
  input_fingerprint text; prior private.safety_report_requests%rowtype;
  retained boolean; target_type text; resolved_target uuid;
  provenance text; provenance_ref uuid; campus uuid;
  parent public.hangouts%rowtype; saved_id uuid; saved_at timestamptz;
begin
  perform private.social_hangout_mutation_lock();
  -- Shape validation never probes the target. Invalid UUID text is rejected by
  -- PostgREST before this function with its ordinary parameter error.
  normalized_category:=pg_catalog.lower(private.profile_trim(p_category));
  normalized_narrative:=nullif(private.profile_trim(p_narrative),'');
  if actor is null or p_request_id is null or p_target_id is null
    or p_target_mode is null or p_target_mode not in ('user','hangout','hangout_host')
    or normalized_category is null or normalized_category not in
      ('harassment','safety concern','impersonation','spam/commercial promotion','other')
    or (normalized_narrative is not null and pg_catalog.length(normalized_narrative)>2000)
    or (normalized_category='other' and normalized_narrative is null) then
    raise exception 'Safety report unavailable' using errcode='42501';
  end if;
  input_fingerprint:=pg_catalog.md5(pg_catalog.jsonb_build_array(
    p_target_mode,p_target_id,normalized_category,normalized_narrative)::text);

  -- The shared transaction lock serializes every caller, including retries.
  -- A replay only reads its own ledger and never resolves its target again.
  select * into prior from private.safety_report_requests r
    where r.reporter_id=actor and r.request_id=p_request_id;
  if found then
    perform 1 from private.safety_feature_gate where singleton for share;
    perform 1 from public.accounts where id=actor for share;
    if not private.safety_enabled() or not private.people_active_owner() then
      raise exception 'Safety report unavailable' using errcode='42501'; end if;
    if prior.input_fingerprint<>input_fingerprint then
      raise exception 'Safety report unavailable' using errcode='42501'; end if;
    return query select r.id,r.submitted_at from private.safety_reports r
      where r.id=prior.report_id and r.reporter_id=actor;
    return;
  end if;

  -- A nonlocking hint chooses the path before any lower gate/account lock.
  -- Its authority is checked again after those locks are held.
  if p_target_mode='user' then
    retained:=private.safety_peer_evidence(actor,p_target_id);
  else
    retained:=exists(select 1 from public.hangout_participants p
      where p.hangout_id=p_target_id and p.account_id=actor);
  end if;
  if not retained then
    if p_target_mode='hangout_host' then
      raise exception 'Safety report unavailable' using errcode='42501';
    elsif p_target_mode='user' then
      perform private.friendship_lock_pair(actor,p_target_id);
    else
      select * into parent from public.hangouts h where h.id=p_target_id for update;
      if not found then raise exception 'Safety report unavailable' using errcode='42501'; end if;
    end if;
  end if;

  perform 1 from private.safety_feature_gate where singleton for share;
  if not retained then
    if p_target_mode='user' then
      perform private.safety_lock_visible_evidence(actor,p_target_id);
    else
      perform 1 from private.hangout_feature_gate where singleton for share;
      perform private.safety_lock_hangout_evidence(actor,parent.university_id);
    end if;
  else
    perform 1 from public.accounts where id=actor for share;
  end if;

  -- Each of these checks is a fresh READ COMMITTED statement after all waits.
  if not private.safety_enabled() or not private.people_active_owner() then
    raise exception 'Safety report unavailable' using errcode='42501'; end if;
  if retained then
    if p_target_mode='user' then
      select kind,ref_id into provenance,provenance_ref
        from private.safety_report_peer_source(actor,p_target_id);
      if not found or not private.safety_peer_evidence(actor,p_target_id) then
        raise exception 'Safety report unavailable' using errcode='42501'; end if;
      target_type:='user'; resolved_target:=p_target_id;
    else
      select h.host_id into resolved_target from public.hangout_participants p
        join public.hangouts h on h.id=p.hangout_id
        where p.hangout_id=p_target_id and p.account_id=actor;
      if not found then raise exception 'Safety report unavailable' using errcode='42501'; end if;
      if p_target_mode='hangout_host' then
        target_type:='user'; provenance:='retained_host';
        provenance_ref:=p_target_id;
      else
        target_type:='hangout'; resolved_target:=p_target_id;
        provenance:='retained_hangout'; provenance_ref:=p_target_id;
      end if;
    end if;
  elsif p_target_mode='user' then
    campus:=private.people_ready_campus();
    if not private.people_enabled() or campus is null
      or not private.people_visible(p_target_id,campus) then
      raise exception 'Safety report unavailable' using errcode='42501'; end if;
    target_type:='user'; resolved_target:=p_target_id;
    provenance:='current_people'; provenance_ref:=p_target_id;
  else
    if not private.hangouts_enabled() or not private.can_read_hangout(p_target_id,false) then
      raise exception 'Safety report unavailable' using errcode='42501'; end if;
    target_type:='hangout'; resolved_target:=p_target_id;
    provenance:='current_hangout'; provenance_ref:=p_target_id;
  end if;
  if target_type='user' and resolved_target=actor then
    raise exception 'Safety report unavailable' using errcode='42501'; end if;

  -- Inclusive lower edge: a row at exactly now-1 hour still consumes a slot.
  -- The clock is sampled after contention and after final authorization.
  saved_at:=clock_timestamp();
  if (select count(*) from private.safety_reports r where r.reporter_id=actor
      and r.submitted_at between saved_at-interval '1 hour' and saved_at)>=5 then
    raise exception 'Safety report unavailable' using errcode='42501'; end if;
  insert into private.safety_reports(reporter_id,target_type,target_id,category,narrative,
    provenance_kind,provenance_ref_id,submitted_at)
    values(actor,target_type,resolved_target,normalized_category,normalized_narrative,
      provenance,provenance_ref,saved_at) returning id into saved_id;
  insert into private.safety_report_requests(reporter_id,request_id,input_fingerprint,report_id)
    values(actor,p_request_id,input_fingerprint,saved_id);
  return query select saved_id,saved_at;
end; $$;
revoke all on function public.submit_safety_report(uuid,text,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.submit_safety_report(uuid,text,uuid,text,text)
  to authenticated;

commit;
