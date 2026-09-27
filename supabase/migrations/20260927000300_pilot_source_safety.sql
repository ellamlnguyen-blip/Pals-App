-- TASK-021A1b2 / ADR-0027: ordinary source purpose and immutable-host closure.
-- Snapshot readers do not acquire pilot locks; retained safety/operators remain independent.
begin;

create or replace function private.ready_campus() returns uuid
language sql stable security definer set search_path='' as $$
 select university_id from public.university_memberships
 where user_id=(select auth.uid()) and private.pilot_capability_enabled('hangouts') and private.hangouts_enabled() and public.get_access_state()='ready';
$$;

create or replace function private.can_read_hangout(target uuid, private_details boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hangouts h
 where h.id=target and h.university_id=private.ready_campus() and h.visibility='campus'
 and h.location_precision='approximate_area'
 and private.ready_subject_campus(h.host_id,h.university_id)
 and not exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
 and not private.safety_pair_blocked(auth.uid(),h.host_id)
 and (case when private_details then h.status='published' and
       (h.host_id=auth.uid() or exists(select 1 from public.hangout_participants p
         where p.hangout_id=h.id and p.account_id=auth.uid() and p.state='joined'))
   else h.status='published' or (h.status='cancelled' and
       (h.host_id=auth.uid() or exists(select 1 from public.hangout_participants p
         where p.hangout_id=h.id and p.account_id=auth.uid() and p.state='joined'))) end));
$$;

create or replace function private.chat_authorized(p_hangout_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select current_setting('transaction_isolation')='read committed'
    and private.pilot_capability_enabled('hangout_chat')
    and private.ready_campus() is not null
    and exists(select 1 from private.hangout_feature_gate where singleton and enabled)
    and exists(select 1 from private.hangout_chat_feature_gate where singleton and enabled)
    and exists(select 1 from public.hangouts h
      join public.hangout_participants p on p.hangout_id=h.id
      where h.id=p_hangout_id and h.status='published' and h.visibility='campus'
        and h.location_precision='approximate_area'
        and h.university_id=private.ready_campus()
        and private.ready_subject_campus(h.host_id,h.university_id)
        and not exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
        and p.account_id=auth.uid() and p.state='joined'
        and not private.safety_pair_blocked(auth.uid(),h.host_id)
        and private.ready_subject_campus(auth.uid(),h.university_id));
$$;

create or replace function private.effective_hangout_cohost(p_hangout_id uuid, p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.hangouts h
    join private.hangout_cohosts c on c.hangout_id = h.id and c.account_id = p_actor
    join public.hangout_participants p on p.hangout_id = c.hangout_id
      and p.account_id = c.account_id and p.state = 'joined'
    where h.id = p_hangout_id and h.status = 'published'
      and h.host_id <> p_actor and h.visibility = 'campus'
      and not exists(select 1 from private.hangout_disables d where d.hangout_id = h.id)
      and private.hangouts_enabled()
      and private.pilot_capability_enabled('hangouts')
      and h.location_precision='approximate_area'
      and private.ready_subject_campus(h.host_id,h.university_id)
      and private.ready_subject_campus(p_actor, h.university_id)
      and not private.safety_pair_blocked(p_actor, h.host_id));
$$;

create or replace function public.set_safety_block(p_account_id uuid,p_blocked boolean) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; hangout_row public.hangouts%rowtype; effect text;
begin
  perform private.social_hangout_mutation_lock();
  if actor is null or p_account_id is null or p_account_id=actor or p_blocked is null
      or not private.people_active_owner() then
    raise exception 'Safety operation unavailable' using errcode='42501';
  end if;
  perform private.friendship_lock_pair(actor,p_account_id);
  -- A fresh READ COMMITTED statement discovers the full currently shared set
  -- after every preceding mutation. Sorted parents precede gate/evidence rows.
  for target in
    select x.hangout_id from public.hangout_participants x
    join public.hangout_participants y on y.hangout_id=x.hangout_id
    where x.account_id=actor and y.account_id=p_account_id
      and x.state='joined' and y.state='joined' order by x.hangout_id
  loop
    perform 1 from public.hangouts where id=target for update;
  end loop;
  perform 1 from private.safety_feature_gate where singleton for share;
  if not private.safety_enabled() or not private.people_active_owner() then
    raise exception 'Safety operation unavailable' using errcode='42501';
  end if;
  perform 1 from public.accounts where id=actor for share;
  if not private.people_active_owner() then
    raise exception 'Safety operation unavailable' using errcode='42501'; end if;
  if p_blocked then
    if not private.safety_peer_evidence(actor,p_account_id) then
      perform private.safety_lock_visible_evidence(actor,p_account_id);
    end if;
    if not (private.safety_peer_evidence(actor,p_account_id)
      or (private.pilot_capability_enabled('people') and private.people_enabled() and private.people_ready_campus() is not null
         and private.people_visible(p_account_id,private.people_ready_campus()))) then
      raise exception 'Safety operation unavailable' using errcode='42501';
    end if;
    insert into private.people_blocks(blocker_id,blocked_id)
      values(actor,p_account_id) on conflict do nothing;
    -- Recheck the entire affected set after lock waits. The shared lock keeps
    -- membership stable through commit; this also repairs old-block retries.
    for hangout_row in select hh.* from public.hangouts hh
      join public.hangout_participants x on x.hangout_id=hh.id
        and x.account_id=actor and x.state='joined'
      join public.hangout_participants y on y.hangout_id=hh.id
        and y.account_id=p_account_id and y.state='joined'
      order by hh.id
    loop
      perform private.safety_record_joined_overlap(hangout_row.id,actor);
      perform private.safety_record_joined_overlap(hangout_row.id,p_account_id);
      effect:=case when hangout_row.host_id=actor then 'removed' else 'left' end;
      update public.hangout_participants set state=effect,
        left_at=case when effect='left' then clock_timestamp() else left_at end,
        removed_at=case when effect='removed' then clock_timestamp() else removed_at end,
        updated_at=clock_timestamp()
      where hangout_id=hangout_row.id and account_id=case when effect='removed' then p_account_id else actor end
        and state='joined';
    end loop;
    delete from private.friendships f where f.low_id=least(actor,p_account_id)
      and f.high_id=greatest(actor,p_account_id);
    update private.dm_pairs d set state='blocked' where d.low_id=least(actor,p_account_id)
      and d.high_id=greatest(actor,p_account_id) and d.state in('pending','accepted');
  else
    delete from private.people_blocks b where b.blocker_id=actor and b.blocked_id=p_account_id;
  end if;
  return p_blocked;
end; $$;

create or replace function public.submit_safety_report(
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
    if not private.pilot_capability_enabled('people') or not private.people_enabled() or campus is null
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

-- CREATE OR REPLACE preserves old ACLs; declare the final boundary explicitly.
revoke all on function private.ready_campus(),private.can_read_hangout(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function private.ready_campus(),private.can_read_hangout(uuid,boolean) to authenticated;
revoke all on function private.chat_authorized(uuid),private.effective_hangout_cohost(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.set_safety_block(uuid,boolean),public.submit_safety_report(uuid,text,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.set_safety_block(uuid,boolean),public.submit_safety_report(uuid,text,uuid,text,text) to authenticated;
commit;
