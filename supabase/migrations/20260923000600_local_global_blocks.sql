-- ADR-0018 / TASK-016A. Disposable-local global block boundary.
begin;

-- Two-integer advisory keys occupy a separate PostgreSQL advisory-lock namespace
-- from every existing one-integer hashtextextended lock in this repository.
create function private.social_hangout_mutation_lock() returns void
language plpgsql volatile security definer set search_path='' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Safety operation unavailable' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(16016,1);
end; $$;
revoke all on function private.social_hangout_mutation_lock() from public,anon,authenticated;

create table private.safety_feature_gate(
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into private.safety_feature_gate(singleton,enabled) values(true,false);
alter table private.safety_feature_gate enable row level security;
revoke all on private.safety_feature_gate from public,anon,authenticated;

-- Immutable unordered peer/Hangout overlap. The row is an authority hint for
-- safety actions, not a readable history or a peer directory.
create table private.hangout_peer_provenance(
  hangout_id uuid not null references public.hangouts(id) on delete cascade,
  low_id uuid not null references public.accounts(id) on delete cascade,
  high_id uuid not null references public.accounts(id) on delete cascade,
  primary key(hangout_id,low_id,high_id),
  check(low_id < high_id)
);
create index hangout_peer_provenance_pair_idx on private.hangout_peer_provenance(low_id,high_id);
alter table private.hangout_peer_provenance enable row level security;
revoke all on private.hangout_peer_provenance from public,anon,authenticated;

create function private.safety_enabled() returns boolean
language sql volatile security definer set search_path='' as $$
  select current_setting('transaction_isolation')='read committed'
    and exists(select 1 from private.safety_feature_gate where singleton and enabled);
$$;
create function private.safety_pair_blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.people_blocks x
    where (x.blocker_id=a and x.blocked_id=b)
       or (x.blocker_id=b and x.blocked_id=a));
$$;
-- Call only while holding the shared mutation lock, before a participant is
-- overwritten by an ordinary or safety transition.
create function private.safety_record_joined_overlap(p_hangout uuid,p_actor uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
begin
  if not exists(select 1 from public.hangout_participants own
    where own.hangout_id=p_hangout and own.account_id=p_actor and own.state='joined') then
    return;
  end if;
  insert into private.hangout_peer_provenance(hangout_id,low_id,high_id)
  select p_hangout,least(p_actor,p.account_id),greatest(p_actor,p.account_id)
  from public.hangout_participants p
  where p.hangout_id=p_hangout and p.state='joined' and p.account_id<>p_actor
  on conflict do nothing;
end; $$;
-- A retained interval proves overlap only if each person's current/last
-- interval intersects with positive duration. Discarded earlier intervals
-- are intentionally not reconstructed.
create function private.safety_peer_evidence(p_actor uuid,p_peer uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.people_blocks b where b.blocker_id=p_actor and b.blocked_id=p_peer)
 or exists(select 1 from private.friendships f where f.low_id=least(p_actor,p_peer) and f.high_id=greatest(p_actor,p_peer))
 or exists(select 1 from private.friendship_create_requests r
     where (r.actor_id=p_actor and r.target_id=p_peer)
        or (r.actor_id=p_peer and r.target_id=p_actor))
 or exists(select 1 from private.dm_pairs d where d.low_id=least(p_actor,p_peer) and d.high_id=greatest(p_actor,p_peer))
 or exists(select 1 from private.hangout_peer_provenance v where v.low_id=least(p_actor,p_peer) and v.high_id=greatest(p_actor,p_peer))
 or exists(select 1 from public.hangouts h join public.hangout_participants mine
     on mine.hangout_id=h.id and mine.account_id=p_actor
     where h.host_id=p_peer)
 or exists(select 1 from public.hangout_participants mine
     join public.hangout_participants peer on peer.hangout_id=mine.hangout_id
     where mine.account_id=p_actor and peer.account_id=p_peer
       and mine.joined_at < coalesce(peer.left_at,peer.removed_at,'infinity'::timestamptz)
       and peer.joined_at < coalesce(mine.left_at,mine.removed_at,'infinity'::timestamptz));
$$;
revoke all on function private.safety_enabled(),private.safety_pair_blocked(uuid,uuid),
 private.safety_record_joined_overlap(uuid,uuid),private.safety_peer_evidence(uuid,uuid)
 from public,anon,authenticated;

-- Existing owned blocks are reconciled while every feature gate remains off.
-- Determine all effects from one initial joined-pair snapshot. A host-owned
-- outbound block removes its nonhost target; every other nonhost blocker in a
-- conflicting pair leaves. Removal wins for a person with both roles.
create table private.safety_reconciliation_effects(
  hangout_id uuid not null, account_id uuid not null, effect text not null
    check(effect in('left','removed')),
  primary key(hangout_id,account_id)
);
alter table private.safety_reconciliation_effects enable row level security;
revoke all on private.safety_reconciliation_effects from public,anon,authenticated;

create function private.safety_reconcile_existing_blocks() returns void
language plpgsql volatile security definer set search_path='' as $$
declare target uuid; p record;
begin
  perform private.social_hangout_mutation_lock();
  delete from private.safety_reconciliation_effects;
  insert into private.safety_reconciliation_effects(hangout_id,account_id,effect)
  with conflict as (
    select h.id hangout_id,h.host_id,b.blocker_id,b.blocked_id
    from private.people_blocks b
    join public.hangout_participants x on x.account_id=b.blocker_id and x.state='joined'
    join public.hangout_participants y on y.hangout_id=x.hangout_id
      and y.account_id=b.blocked_id and y.state='joined'
    join public.hangouts h on h.id=x.hangout_id
  ), effects as (
    select hangout_id,blocked_id account_id,'removed'::text effect from conflict
      where blocker_id=host_id and blocked_id<>host_id
    union all
    select hangout_id,blocker_id,'left' from conflict where blocker_id<>host_id
  )
  select hangout_id,account_id,
    case when bool_or(effect='removed') then 'removed' else 'left' end
  from effects group by hangout_id,account_id;
  -- New writes cannot alter membership while the shared lock is held. Parent
  -- rows still have a documented ascending lock order for gate/row writers.
  for target in select distinct hangout_id from private.safety_reconciliation_effects order by hangout_id loop
    perform 1 from public.hangouts where id=target for update;
  end loop;
  -- Record overlap from the original roster, before the first state change.
  for p in select distinct hangout_id,account_id from private.safety_reconciliation_effects
      order by hangout_id,account_id loop
    perform private.safety_record_joined_overlap(p.hangout_id,p.account_id);
  end loop;
  for p in select * from private.safety_reconciliation_effects order by hangout_id,account_id loop
    update public.hangout_participants set state=p.effect,
      left_at=case when p.effect='left' then clock_timestamp() else left_at end,
      removed_at=case when p.effect='removed' then clock_timestamp() else removed_at end,
      updated_at=clock_timestamp()
    where hangout_id=p.hangout_id and account_id=p.account_id and state='joined';
  end loop;
  delete from private.safety_reconciliation_effects;
end; $$;
revoke all on function private.safety_reconcile_existing_blocks() from public,anon,authenticated;
-- Current-visibility block writes hold the People gate and live identity rows
-- through commit. Historical-evidence writes need only the actor account lock.
create function private.safety_lock_visible_evidence(p_actor uuid,p_peer uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare subject uuid; campus uuid; photo_path text;
begin
  perform 1 from private.people_feature_gate where singleton for share;
  for subject in select id from (values(p_actor),(p_peer)) v(id) order by id loop
    perform 1 from public.accounts where id=subject for share;
    perform 1 from auth.users where id=subject for share;
    select university_id into campus from public.university_memberships
      where user_id=subject for share;
    perform 1 from public.universities where id=campus for share;
    select primary_photo_path into photo_path from public.profiles
      where user_id=subject for share;
    perform 1 from storage.objects where bucket_id='profile-photos'
      and name=photo_path and owner_id=subject::text for share;
    perform 1 from private.people_preferences where account_id=subject for share;
  end loop;
end; $$;
revoke all on function private.safety_lock_visible_evidence(uuid,uuid) from public,anon,authenticated;


create function public.set_safety_block(p_account_id uuid,p_blocked boolean) returns boolean
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
      or (private.people_enabled() and private.people_ready_campus() is not null
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
revoke all on function public.set_safety_block(uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_safety_block(uuid,boolean) to authenticated;

-- The old signature is retained for stale clients, but has exactly one policy.
create or replace function public.set_people_block(p_account_id uuid,p_blocked boolean) returns boolean
language sql volatile security definer set search_path='' as $$
  select public.set_safety_block(p_account_id,p_blocked);
$$;
create or replace function public.list_people_blocked_ids(p_after_id uuid default null,p_limit integer default 24)
returns table(account_id uuid) language plpgsql volatile security definer set search_path='' as $$
begin
  perform private.people_require_read_committed();
  if not private.safety_enabled() or not private.people_active_owner() then
    raise exception 'Safety operation unavailable' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 24 then
    raise exception 'Invalid safety page' using errcode='22023'; end if;
  return query select b.blocked_id from private.people_blocks b
    where b.blocker_id=auth.uid() and (p_after_id is null or b.blocked_id>p_after_id)
    order by b.blocked_id limit p_limit;
end; $$;

create function public.list_my_retained_hangout_ids(p_after_id uuid default null,p_limit integer default 24)
returns table(hangout_id uuid,own_state text)
language plpgsql volatile security definer set search_path='' as $$
begin
  perform private.people_require_read_committed();
  if not private.safety_enabled() or not private.people_active_owner() then
    raise exception 'Safety operation unavailable' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 24 then
    raise exception 'Invalid safety page' using errcode='22023'; end if;
  return query select p.hangout_id,p.state from public.hangout_participants p
    where p.account_id=auth.uid() and (p_after_id is null or p.hangout_id>p_after_id)
    order by p.hangout_id limit p_limit;
end; $$;
revoke all on function public.list_my_retained_hangout_ids(uuid,integer) from public,anon,authenticated;
grant execute on function public.list_my_retained_hangout_ids(uuid,integer) to authenticated;

create or replace function private.can_read_hangout(target uuid, private_details boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hangouts h
 where h.id=target and h.university_id=private.ready_campus() and h.visibility='campus'
 and not private.safety_pair_blocked(auth.uid(),h.host_id)
 and (case when private_details then h.status='published' and
       (h.host_id=auth.uid() or exists(select 1 from public.hangout_participants p
         where p.hangout_id=h.id and p.account_id=auth.uid() and p.state='joined'))
   else h.status='published' or (h.status='cancelled' and
       (h.host_id=auth.uid() or exists(select 1 from public.hangout_participants p
         where p.hangout_id=h.id and p.account_id=auth.uid() and p.state='joined'))) end));
$$;
create or replace function private.can_read_hangout_roster(target uuid, subject uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hangouts h
 join public.hangout_participants p on p.hangout_id=h.id
 where h.id=target and h.status='published' and p.account_id=subject
 and p.state='joined' and private.can_read_hangout(target)
 and not private.safety_pair_blocked(auth.uid(),subject)
 and private.ready_subject_campus(subject,h.university_id));
$$;
create or replace function public.get_hangout_participant_state(p_hangout_id uuid,p_account_id uuid) returns text
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
 if p_account_id=auth.uid() and
   ((private.safety_enabled() and private.people_active_owner())
     or private.can_read_hangout(p_hangout_id)) then
   return (select p.state from public.hangout_participants p
     where p.hangout_id=p_hangout_id and p.account_id=auth.uid());
 end if;
 if private.ready_campus() is null then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 select * into h from public.hangouts where id=p_hangout_id;
 if not found or not private.can_read_hangout(h.id) or h.host_id<>auth.uid() then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if p_account_id is null or private.safety_pair_blocked(auth.uid(),p_account_id) then
   return null;
 end if;
 return (select state from public.hangout_participants
   where hangout_id=h.id and account_id=p_account_id);
end; $$;

create or replace function private.chat_authorized(p_hangout_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select current_setting('transaction_isolation')='read committed'
    and exists(select 1 from private.hangout_feature_gate where singleton and enabled)
    and exists(select 1 from private.hangout_chat_feature_gate where singleton and enabled)
    and exists(select 1 from public.hangouts h
      join public.hangout_participants p on p.hangout_id=h.id
      where h.id=p_hangout_id and h.status='published' and h.visibility='campus'
        and p.account_id=auth.uid() and p.state='joined'
        and not private.safety_pair_blocked(auth.uid(),h.host_id)
        and private.ready_subject_campus(auth.uid(),h.university_id));
$$;

-- Reconcile retained blocks before any feature gate is enabled. No notification
-- source hook runs on these direct safety transitions.
select private.social_hangout_mutation_lock();
update private.people_feature_gate set enabled=false where singleton;
update private.friendship_feature_gate set enabled=false where singleton;
update private.dm_feature_gate set enabled=false where singleton;
update private.hangout_feature_gate set enabled=false where singleton;
update private.hangout_chat_feature_gate set enabled=false where singleton;
update private.notification_feature_gate set enabled=false where singleton;
-- Preserve every overlap still provable from the one retained interval per
-- participant before a later rejoin can overwrite it. Two IDs on a Hangout
-- without intersecting intervals never become evidence.
insert into private.hangout_peer_provenance(hangout_id,low_id,high_id)
select a.hangout_id,a.account_id,b.account_id
from public.hangout_participants a
join public.hangout_participants b on b.hangout_id=a.hangout_id
  and a.account_id<b.account_id
where a.joined_at<coalesce(b.left_at,b.removed_at,'infinity'::timestamptz)
  and b.joined_at<coalesce(a.left_at,a.removed_at,'infinity'::timestamptz)
on conflict do nothing;
select private.safety_reconcile_existing_blocks();

-- Parent row, source gate, then live caller evidence. Every Hangout writer
-- rechecks readiness after possible waits; the gate cannot flip before commit.
create function private.safety_lock_hangout_evidence(p_actor uuid,p_campus uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare photo_path text;
begin
  perform 1 from public.accounts where id=p_actor for share;
  perform 1 from auth.users where id=p_actor for share;
  perform 1 from public.university_memberships where user_id=p_actor for share;
  perform 1 from public.universities where id=p_campus for share;
  select primary_photo_path into photo_path from public.profiles where user_id=p_actor for share;
  perform 1 from storage.objects where bucket_id='profile-photos'
    and name=photo_path and owner_id=p_actor::text for share;
end; $$;
revoke all on function private.safety_lock_hangout_evidence(uuid,uuid) from public,anon,authenticated;

create or replace function private.lock_hangout(target uuid) returns public.hangouts
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
  select * into h from public.hangouts where id=target for update;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  perform 1 from private.hangout_feature_gate where singleton for share;
  perform private.safety_lock_hangout_evidence(auth.uid(),h.university_id);
  if h.university_id is distinct from private.ready_campus() then
    raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  update public.hangouts set updated_at=updated_at where id=target;
  return h;
end; $$;

-- Re-declare every client-executable mutation at its entry point. The shared
-- lock comes before legacy request/pair/Hangout locks, never in a late trigger.

create or replace function public.create_hangout(p_request_id uuid,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare campus uuid; result uuid; existing_id uuid; existing_fingerprint text; fingerprint text; normalized_private text;
begin
  perform private.social_hangout_mutation_lock();
 campus=private.ready_campus();
 if campus is null then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.validate_hangout_input(p_title,p_starts_at,p_public_place,p_public_latitude,p_public_longitude,p_description,p_ends_at,p_campus_zone,p_visibility,p_location_precision,p_eligibility);
 perform private.validate_hangout_instructions(p_private_instructions);
 if p_request_id is null then raise exception 'Invalid Hangout input' using errcode='22023'; end if;
 normalized_private=nullif(private.profile_trim(p_private_instructions),'');
 fingerprint=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(jsonb_build_array(private.profile_trim(p_title),extract(epoch from p_starts_at),
   private.profile_trim(p_public_place),p_public_latitude,p_public_longitude,
   nullif(private.profile_trim(p_description),''),extract(epoch from p_ends_at),
   nullif(private.profile_trim(p_campus_zone),''),normalized_private,
   p_visibility,p_location_precision,p_eligibility)::text,'UTF8')),'hex');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_request_id::text,0));
 perform 1 from private.hangout_feature_gate where singleton for share;
 perform private.safety_lock_hangout_evidence(auth.uid(),campus);
 if private.ready_campus() is distinct from campus then
   raise exception 'Hangout operation not permitted' using errcode='42501';
 end if;
 select r.hangout_id,r.payload_fingerprint into existing_id,existing_fingerprint
 from private.hangout_create_requests r where r.host_id=auth.uid() and r.request_id=p_request_id;
 if found then
   -- The current gate/readiness/campus and row access must still hold. Never
   -- replay private content, even when the original write had it.
   if not private.can_read_hangout(existing_id) then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
   if existing_fingerprint<>fingerprint then raise exception 'Creation request conflict' using errcode='23505'; end if;
   return existing_id;
 end if;
 if p_starts_at<clock_timestamp() or p_starts_at>clock_timestamp()+interval '366 days' then
   raise exception 'Invalid Hangout input' using errcode='22023';
 end if;
 insert into public.hangouts(university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude,description,ends_at,campus_zone)
 values(campus,auth.uid(),private.profile_trim(p_title),p_starts_at,private.profile_trim(p_public_place),p_public_latitude,p_public_longitude,nullif(private.profile_trim(p_description),''),p_ends_at,nullif(private.profile_trim(p_campus_zone),'')) returning id into result;
 insert into public.hangout_participants(hangout_id,account_id,state) values(result,auth.uid(),'joined');
 if normalized_private is not null then
   insert into public.hangout_private_locations(hangout_id,instructions) values(result,normalized_private);
 end if;
 insert into private.hangout_create_requests(host_id,request_id,hangout_id,payload_fingerprint) values(auth.uid(),p_request_id,result,fingerprint);
 return result;
end;
$$;

create or replace function public.edit_hangout(p_hangout_id uuid,p_expected_revision bigint,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint; normalized_private text; old_private text; material boolean;
begin
  perform private.social_hangout_mutation_lock();
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

create or replace function public.set_hangout_joining(p_hangout_id uuid,p_expected_revision bigint,p_joining_state text) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint;
begin
  perform private.social_hangout_mutation_lock();
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 if p_joining_state is null or p_joining_state not in ('open','closed') then raise exception 'Invalid joining state' using errcode='22023'; end if;
 update public.hangouts set joining_state=p_joining_state,revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 return next_revision;
end;
$$;

create or replace function public.cancel_hangout(p_hangout_id uuid,p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint;
begin
  perform private.social_hangout_mutation_lock();
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_cancelled');
 return next_revision;
end; $$;

create or replace function public.join_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; participant_state text; did_join boolean;
begin
  perform private.social_hangout_mutation_lock();
 h=private.lock_hangout(p_hangout_id);
 if h.status<>'published' or h.joining_state<>'open' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if exists(select 1 from public.hangout_participants p where p.hangout_id=h.id
   and p.state='joined' and p.account_id<>auth.uid()
   and private.safety_pair_blocked(auth.uid(),p.account_id)) then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 select state into participant_state from public.hangout_participants where hangout_id=h.id and account_id=auth.uid();
 if participant_state='removed' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if participant_state='joined' then return; end if;
 insert into public.hangout_participants(hangout_id,account_id,state) values(h.id,auth.uid(),'joined')
 on conflict(hangout_id,account_id) do update set state='joined',joined_at=clock_timestamp(),left_at=null,updated_at=clock_timestamp()
 where hangout_participants.state='left';
 did_join:=found;
 if did_join then perform private.safety_record_joined_overlap(h.id,auth.uid()); end if;
 if did_join then perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_joined'); end if;
end; $$;

create or replace function public.leave_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
  perform private.social_hangout_mutation_lock();
 h=private.lock_hangout(p_hangout_id);
 if h.host_id=auth.uid() then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.safety_record_joined_overlap(h.id,auth.uid());
 update public.hangout_participants set state='left',left_at=clock_timestamp(),updated_at=clock_timestamp()
 where hangout_id=h.id and account_id=auth.uid() and state='joined';
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_left');
end; $$;

create or replace function public.remove_hangout_participant(p_hangout_id uuid,p_account_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
  perform private.social_hangout_mutation_lock();
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or p_account_id is null or p_account_id=h.host_id then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.safety_record_joined_overlap(h.id,p_account_id);
 update public.hangout_participants set state='removed',removed_at=clock_timestamp(),updated_at=clock_timestamp()
 where hangout_id=h.id and account_id=p_account_id and state in ('joined','left');
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
end;
$$;

create or replace function public.create_friend_request(p_target_id uuid, p_request_id uuid)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid();
declare old_request private.friendship_create_requests%rowtype;
declare existing private.friendships%rowtype;
declare new_generation uuid;
begin
  perform private.social_hangout_mutation_lock();
  perform private.people_require_read_committed();
  if actor is null or p_target_id is null or p_target_id = actor or p_request_id is null
    or not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  -- Serialize retries of one creation key before locking the unordered pair.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'friendship-request:' || actor::text || ':' || p_request_id::text, 0));
  perform private.friendship_lock_pair(actor, p_target_id);
  perform private.friendship_lock_eligibility(actor, p_target_id);
  if not private.friendship_enabled() or not private.people_active_owner() then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  select * into old_request from private.friendship_create_requests r
    where r.actor_id = actor and r.request_id = p_request_id;
  if found then
    if old_request.target_id <> p_target_id then
      raise exception 'Friendship unavailable' using errcode = '42501';
    end if;
    select * into existing from private.friendships f
      where f.low_id = least(actor,p_target_id) and f.high_id = greatest(actor,p_target_id)
        and f.generation_id = old_request.generation_id;
    if not found or not private.friendship_eligible(p_target_id) then
      raise exception 'Friendship unavailable' using errcode = '42501';
    end if;
    return existing.generation_id;
  end if;
  if not private.friendship_eligible(p_target_id)
    or exists(select 1 from private.friendship_suppression s
      where s.requester_id = actor and s.recipient_id = p_target_id)
    or exists(select 1 from private.friendships f
      where f.low_id = least(actor,p_target_id) and f.high_id = greatest(actor,p_target_id)) then
    raise exception 'Friendship unavailable' using errcode = '42501';
  end if;
  new_generation := gen_random_uuid();
  insert into private.friendships(low_id,high_id,requester_id,campus_id,generation_id)
    values(least(actor,p_target_id),greatest(actor,p_target_id),actor,
      private.people_ready_campus(),new_generation);
  insert into private.friendship_create_requests(actor_id,request_id,target_id,generation_id)
    values(actor,p_request_id,p_target_id,new_generation);
  return new_generation;
end;
$$;

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
    if not found then raise exception 'DM unavailable' using errcode='42501'; end if;
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
        or not private.dm_eligible(p_peer_id) then
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
    update private.dm_pairs d set state='accepted' where d.generation_id=pair.generation_id;
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
  if not private.dm_eligible(p_peer_id) then
    raise exception 'DM unavailable' using errcode='42501'; end if;
  select * into pair from private.dm_pairs d where d.generation_id=p_generation_id
    and d.low_id=least(actor,p_peer_id) and d.high_id=greatest(actor,p_peer_id)
    and d.state='accepted';
  if not found then
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

create or replace function public.send_hangout_message(p_hangout_id uuid, p_request_id uuid, p_body text)
returns table (message_id uuid, sequence bigint, body text, created_at timestamptz,
  mine boolean, author_id uuid, author_label text)
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := auth.uid(); h public.hangouts; normalized text;
  fingerprint text; old_message uuid; old_fingerprint text; conversation uuid;
  new_sequence bigint; new_message uuid;
begin
  perform private.social_hangout_mutation_lock();
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Hangout chat unavailable' using errcode = '42501';
  end if;
  -- Serialize with join, leave, remove and cancel using their existing parent
  -- lock. This also makes two sends of the same key strictly ordered.
  h := private.lock_hangout(p_hangout_id);
  perform private.chat_lock_evidence(h.id, actor, h.university_id);
  -- A fresh READ COMMITTED statement after lock waits sees committed revocation.
  perform private.chat_require(h.id);
  if p_request_id is null or p_body is null then
    raise exception 'Invalid Hangout message' using errcode = '22023';
  end if;
  normalized := private.profile_trim(p_body);
  if length(normalized) not between 1 and 2000 then
    raise exception 'Invalid Hangout message' using errcode = '22023';
  end if;
  fingerprint := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(normalized, 'UTF8')), 'hex');
  select r.message_id, r.payload_fingerprint into old_message, old_fingerprint
    from private.hangout_message_requests r
    where r.hangout_id = h.id and r.author_id = actor and r.request_id = p_request_id;
  if found then
    if old_fingerprint <> fingerprint then
      raise exception 'Message request conflict' using errcode = '23505';
    end if;
    return query select m.id, m.sequence, m.body, m.created_at, true, actor, null::text
      from private.hangout_messages m where m.id = old_message;
    return;
  end if;
  insert into private.hangout_conversations(hangout_id) values (h.id)
    on conflict(hangout_id) do nothing;
  update private.hangout_conversations c set next_sequence = c.next_sequence + 1
    where c.hangout_id = h.id returning c.id, c.next_sequence - 1 into conversation, new_sequence;
  insert into private.hangout_messages(conversation_id, author_id, sequence, body)
    values (conversation, actor, new_sequence, normalized) returning id into new_message;
  insert into private.hangout_message_requests(hangout_id, author_id, request_id, message_id, payload_fingerprint)
    values (h.id, actor, p_request_id, new_message, fingerprint);
  return query select m.id, m.sequence, m.body, m.created_at, true, actor, null::text
    from private.hangout_messages m where m.id = new_message;
end;
$$;

create or replace function public.read_hangout_messages(p_hangout_id uuid, p_after_sequence bigint default null,
  p_limit integer default 50)
returns table (message_id uuid, sequence bigint, body text, created_at timestamptz,
  mine boolean, author_id uuid, author_label text)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Hangout chat unavailable' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 50
     or (p_after_sequence is not null and p_after_sequence < 1) then
    raise exception 'Invalid Hangout chat page' using errcode = '22023';
  end if;
  return query
  with guard as materialized (select private.chat_require(p_hangout_id) as allowed)
  select page.id, page.sequence, page.body, page.created_at,
    page.author_id = auth.uid() as mine,
    case when private.ready_subject_campus(page.author_id, h.university_id)
       and exists (select 1 from public.hangout_participants ap
         where ap.hangout_id = h.id and ap.account_id = page.author_id and ap.state = 'joined')
      then page.author_id else null::uuid end as author_id,
    case when private.ready_subject_campus(page.author_id, h.university_id)
       and exists (select 1 from public.hangout_participants ap
         where ap.hangout_id = h.id and ap.account_id = page.author_id and ap.state = 'joined')
      then null::text else 'Former participant'::text end as author_label
  from guard g
  left join lateral (
    select m.* from private.hangout_conversations c
    join private.hangout_messages m on m.conversation_id = c.id
    where g.allowed and c.hangout_id = p_hangout_id
      and (p_after_sequence is null or m.sequence > p_after_sequence)
      and not private.safety_pair_blocked(auth.uid(),m.author_id)
    order by m.sequence limit p_limit
  ) page on true
  left join public.hangouts h on h.id = p_hangout_id
  where page.id is not null
  order by page.sequence;
end;
$$;

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
  not private.safety_pair_blocked(owner_id,n.actor_id) and (case when n.event_code='hangout_edited' then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangout_participants p where p.hangout_id=n.target_id and p.account_id=owner_id and p.state='joined')
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
