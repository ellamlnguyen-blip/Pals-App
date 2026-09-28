-- TASK-021A1b3c / ADR-0027: current safety acquisition only.
-- Retained evidence, exact report replay, unblock and operator authority stay independent.
begin;

-- A separate fresh statement validates the exact values captured by the locker.
-- Only the locker and the two public safety writers call this internal guard.
create function private.pilot_require_current_safety(p_operation text,p_target_id uuid,p_bindings jsonb)
returns void language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); peer uuid; campus uuid; h public.hangouts;
 subject uuid; binding jsonb; subjects uuid[]; bound_subjects uuid[];
 purpose text; denial text;
begin
 denial:=case when p_operation='block_current_people' then 'Safety operation unavailable' else 'Safety report unavailable' end;
 if current_setting('transaction_isolation')<>'read committed' or actor is null or p_target_id is null
  or p_operation is null or p_operation not in ('report_current_people','report_current_hangout','block_current_people')
  or p_bindings is null or jsonb_typeof(p_bindings)<>'array' then
  raise exception '%',denial using errcode='42501'; end if;
 if p_operation='report_current_hangout' then
  purpose:='hangouts';
  select * into h from public.hangouts where id=p_target_id;
  if not found then raise exception '%',denial using errcode='42501'; end if;
  peer:=h.host_id; campus:=h.university_id;
 else
  purpose:='people'; peer:=p_target_id;
  if peer=actor then raise exception '%',denial using errcode='42501'; end if;
  select (b->>'membership_campus_id')::uuid into campus from jsonb_array_elements(p_bindings) b
   where (b->>'subject_id')::uuid=actor;
  if not found then raise exception '%',denial using errcode='42501'; end if;
 end if;
 select array_agg(s order by s) into subjects from (select distinct s from unnest(array[actor,peer]) s) ids;
 select array_agg((b->>'subject_id')::uuid order by (b->>'subject_id')::uuid) into bound_subjects
  from jsonb_array_elements(p_bindings) b;
 if bound_subjects is distinct from subjects or campus is null
  or not private.pilot_capability_enabled(purpose) or not private.safety_enabled()
  or not private.people_active_owner() then
  raise exception '%',denial using errcode='42501'; end if;
 foreach subject in array subjects loop
  select b into binding from jsonb_array_elements(p_bindings) b where (b->>'subject_id')::uuid=subject;
  if not found then raise exception '%',denial using errcode='42501'; end if;
  if (binding->>'membership_campus_id')::uuid is distinct from campus
   or binding->>'primary_photo_path' is null or binding->>'storage_object_id' is null
   or split_part(binding->>'primary_photo_path','/',1)<>subject::text
   or not private.ready_subject_campus(subject,campus)
   or not exists(select 1 from public.university_memberships m where m.user_id=subject and m.university_id=(binding->>'membership_campus_id')::uuid)
   or not exists(select 1 from public.profiles p where p.user_id=subject and p.primary_photo_path=binding->>'primary_photo_path')
   or not exists(select 1 from storage.objects o where o.id=(binding->>'storage_object_id')::uuid
    and o.bucket_id='profile-photos' and o.name=binding->>'primary_photo_path' and o.owner_id=subject::text) then
   raise exception '%',denial using errcode='42501'; end if;
 end loop;
 if p_operation='report_current_hangout' then
  if not private.hangouts_enabled() or not private.can_read_hangout(p_target_id,false) then
   raise exception '%',denial using errcode='42501'; end if;
 else
  if not private.people_enabled() or not private.people_visible(peer,campus) then
   raise exception '%',denial using errcode='42501'; end if;
 end if;
end; $$;
revoke all on function private.pilot_require_current_safety(text,uuid,jsonb) from public,anon,authenticated,service_role;

create function private.pilot_lock_current_safety(p_operation text,p_target_id uuid)
returns table(actor_id uuid,peer_or_host_id uuid,campus_id uuid,source_id uuid,locked_subject_bindings jsonb)
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; subjects uuid[]; subject uuid; target uuid;
 campus uuid; photo text; object_id uuid; binding jsonb; opted_in boolean;
 memberships jsonb:='{}'::jsonb; photos jsonb:='{}'::jsonb; objects jsonb:='{}'::jsonb;
 purpose text; denial text;
begin
 perform private.social_hangout_mutation_lock();
 actor_id:=auth.uid();
 denial:=case when p_operation='block_current_people' then 'Safety operation unavailable' else 'Safety report unavailable' end;
 if actor_id is null or p_target_id is null or p_operation is null
  or p_operation not in ('report_current_people','report_current_hangout','block_current_people') then
  raise exception '%',denial using errcode='42501'; end if;
 -- Reentrant social lock protects the selected current lane before pilot/lower locks.
 if p_operation='report_current_hangout' then
  if exists(select 1 from public.hangout_participants p where p.hangout_id=p_target_id and p.account_id=actor_id) then
   raise exception '%',denial using errcode='42501'; end if;
  purpose:='hangouts';
 else
  if p_target_id=actor_id or private.safety_peer_evidence(actor_id,p_target_id) then
   raise exception '%',denial using errcode='42501'; end if;
  purpose:='people';
 end if;
 perform private.pilot_evidence_lock();
 perform 1 from private.pilot_availability where singleton for share;
 if not found then raise exception '%',denial using errcode='42501'; end if;
 perform 1 from private.pilot_capabilities where key=purpose for share;
 if not found then raise exception '%',denial using errcode='42501'; end if;
 if p_operation='report_current_hangout' then
  select * into h from public.hangouts where id=p_target_id for update;
  if not found then raise exception '%',denial using errcode='42501'; end if;
  source_id:=h.id; peer_or_host_id:=h.host_id; campus_id:=h.university_id;
 else
  peer_or_host_id:=p_target_id; source_id:=null;
  perform private.friendship_lock_pair(actor_id,p_target_id);
  if p_operation='block_current_people' then
   -- Preserve full freshly discovered sorted shared parents even in this lane.
   for target in
    select x.hangout_id from public.hangout_participants x
    join public.hangout_participants y on y.hangout_id=x.hangout_id
    where x.account_id=actor_id and y.account_id=p_target_id
      and x.state='joined' and y.state='joined' order by x.hangout_id
   loop
    perform 1 from public.hangouts where id=target for update;
    if not found then raise exception '%',denial using errcode='42501'; end if;
   end loop;
  end if;
 end if;
 perform 1 from private.safety_feature_gate where singleton for share;
 if not found then raise exception '%',denial using errcode='42501'; end if;
 if p_operation='report_current_hangout' then
  perform 1 from private.hangout_feature_gate where singleton for share;
 else
  perform 1 from private.people_feature_gate where singleton for share;
 end if;
 if not found then raise exception '%',denial using errcode='42501'; end if;
 select array_agg(s order by s) into subjects from
  (select distinct s from unnest(array[actor_id,peer_or_host_id]) s) ids;
 foreach subject in array subjects loop
  perform 1 from public.accounts where id=subject for share;
  if not found then raise exception '%',denial using errcode='42501'; end if;
 end loop;
 foreach subject in array subjects loop
  perform 1 from private.pilot_account_admission where account_id=subject for share;
  if not found then raise exception '%',denial using errcode='42501'; end if;
 end loop;
 foreach subject in array subjects loop
  perform 1 from auth.users where id=subject for share;
  if not found then raise exception '%',denial using errcode='42501'; end if;
 end loop;
 foreach subject in array subjects loop
  select m.university_id into campus from public.university_memberships m where m.user_id=subject for share;
  if not found then raise exception '%',denial using errcode='42501'; end if;
  memberships:=memberships||jsonb_build_object(subject::text,campus);
 end loop;
 for campus in select distinct value::uuid from jsonb_each_text(memberships) order by value::uuid loop
  perform 1 from public.universities c where c.id=campus for share;
  if not found then raise exception '%',denial using errcode='42501'; end if;
 end loop;
 foreach subject in array subjects loop
  select p.primary_photo_path into photo from public.profiles p where p.user_id=subject for share;
  if not found then raise exception '%',denial using errcode='42501'; end if;
  if photo is null then raise exception '%',denial using errcode='42501'; end if;
  photos:=photos||jsonb_build_object(subject::text,photo);
 end loop;
 for subject,photo in select key::uuid,value from jsonb_each_text(photos) order by value,key::uuid loop
  select o.id into object_id from storage.objects o where o.bucket_id='profile-photos' and o.name=photo and o.owner_id=subject::text for share;
  if not found then raise exception '%',denial using errcode='42501'; end if;
  objects:=objects||jsonb_build_object(subject::text,object_id);
 end loop;
 if p_operation<>'report_current_hangout' then campus_id:=(memberships->>actor_id::text)::uuid; end if;
 locked_subject_bindings:='[]'::jsonb;
 foreach subject in array subjects loop
  binding:=jsonb_build_object('subject_id',subject,'membership_campus_id',memberships->>subject::text,
   'primary_photo_path',photos->>subject::text,'storage_object_id',objects->>subject::text);
  locked_subject_bindings:=locked_subject_bindings||jsonb_build_array(binding);
 end loop;
 -- Only the eligible peer's opt-in is required; actor preference is irrelevant.
 if p_operation<>'report_current_hangout' then
  select v.opted_in into opted_in from private.people_preferences v where v.account_id=peer_or_host_id for share;
  if not found then raise exception '%',denial using errcode='42501'; end if;
  if not opted_in then raise exception '%',denial using errcode='42501'; end if;
 end if;
 perform private.pilot_require_current_safety(p_operation,p_target_id,locked_subject_bindings);
 return next;
end; $$;
revoke all on function private.pilot_lock_current_safety(text,uuid) from public,anon,authenticated,service_role;

create or replace function public.set_safety_block(p_account_id uuid,p_blocked boolean) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; hangout_row public.hangouts%rowtype; effect text; retained boolean; evidence record;
begin
  perform private.social_hangout_mutation_lock();
  if actor is null or p_account_id is null or p_account_id=actor or p_blocked is null
      or not private.people_active_owner() then
    raise exception 'Safety operation unavailable' using errcode='42501';
  end if;
  -- Classify before every lower pair/parent/gate/account lock; no late fallback.
  retained:=p_blocked and private.safety_peer_evidence(actor,p_account_id);
  if p_blocked and not retained then
    select * into evidence from private.pilot_lock_current_safety('block_current_people',p_account_id);
  else
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
  end if;
  if p_blocked then
    if retained then
      if not private.safety_peer_evidence(actor,p_account_id) then
        raise exception 'Safety operation unavailable' using errcode='42501'; end if;
    else
      -- Final visibility guard is before the intentional block, never after it.
      perform private.pilot_require_current_safety('block_current_people',p_account_id,evidence.locked_subject_bindings);
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
  evidence record; current_operation text; fresh_provenance text; fresh_ref uuid;
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
      raise exception 'Safety report unavailable' using errcode='42501'; end if;
    current_operation:=case when p_target_mode='user' then 'report_current_people' else 'report_current_hangout' end;
    select * into evidence from private.pilot_lock_current_safety(current_operation,p_target_id);
  else
    perform 1 from private.safety_feature_gate where singleton for share;
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
  else
    perform private.pilot_require_current_safety(current_operation,p_target_id,evidence.locked_subject_bindings);
    if p_target_mode='user' then
      target_type:='user'; resolved_target:=p_target_id;
      provenance:='current_people'; provenance_ref:=p_target_id;
    else
      target_type:='hangout'; resolved_target:=p_target_id;
      provenance:='current_hangout'; provenance_ref:=p_target_id;
    end if;
  end if;
  if target_type='user' and resolved_target=actor then
    raise exception 'Safety report unavailable' using errcode='42501'; end if;

  -- Separate fresh guard immediately before the clock/rate/insert, with no new locks.
  if retained then
    if not private.safety_enabled() or not private.people_active_owner() then
      raise exception 'Safety report unavailable' using errcode='42501'; end if;
    if p_target_mode='user' then
      select kind,ref_id into fresh_provenance,fresh_ref from private.safety_report_peer_source(actor,p_target_id);
      if not found or not private.safety_peer_evidence(actor,p_target_id)
        or fresh_provenance is distinct from provenance or fresh_ref is distinct from provenance_ref then
        raise exception 'Safety report unavailable' using errcode='42501'; end if;
    elsif not exists(select 1 from public.hangout_participants p join public.hangouts h on h.id=p.hangout_id
      where p.hangout_id=p_target_id and p.account_id=actor
        and (p_target_mode<>'hangout_host' or h.host_id=resolved_target)) then
      raise exception 'Safety report unavailable' using errcode='42501'; end if;
  else
    perform private.pilot_require_current_safety(current_operation,p_target_id,evidence.locked_subject_bindings);
  end if;

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

-- CREATE OR REPLACE leaves both existing public ACLs and defaults intact.
alter function private.pilot_require_current_safety(text,uuid,jsonb) owner to postgres;
alter function private.pilot_lock_current_safety(text,uuid) owner to postgres;
commit;
