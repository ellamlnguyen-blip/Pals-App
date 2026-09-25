-- Accepted ADR-0012 / TASK-010A. Disposable-local, gate-bound co-host authority.
begin;

create table private.hangout_cohosts (
  hangout_id uuid not null,
  account_id uuid not null,
  assigned_at timestamptz not null default clock_timestamp(),
  primary key (hangout_id, account_id),
  foreign key (hangout_id, account_id)
    references public.hangout_participants(hangout_id, account_id) on delete cascade
);
alter table private.hangout_cohosts enable row level security;
revoke all on private.hangout_cohosts from public, anon, authenticated;

-- All membership writers, including safety teardown and migration reconciliation,
-- use this one transition point. The parent has already been locked by their
-- shared social-lock protocol; deletion rolls back with the membership update.
create function private.clear_departing_cohost() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.state = 'joined' and new.state <> 'joined' then
    delete from private.hangout_cohosts c
      where c.hangout_id = old.hangout_id and c.account_id = old.account_id;
  end if;
  return new;
end;
$$;
create trigger clear_departing_cohost before update of state on public.hangout_participants
  for each row execute function private.clear_departing_cohost();
revoke all on function private.clear_departing_cohost() from public, anon, authenticated;

-- Terminal cancellation admits only a revision increment; the original
-- cancellation timestamp remains attendance eligibility evidence.
create or replace function private.enforce_hangout_ownership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.host_id is distinct from old.host_id or new.university_id is distinct from old.university_id
    or (old.status = 'cancelled' and new is distinct from old
      and (new.revision <> old.revision + 1
        or (to_jsonb(new) - 'revision') is distinct from (to_jsonb(old) - 'revision')))
    or (new.revision <> old.revision + 1 and new is distinct from old) then
    raise exception 'Immutable Hangout ownership or lifecycle' using errcode = '23514';
  end if;
  if (new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at)
    and clock_timestamp() >= coalesce(old.ends_at, old.starts_at + interval '2 hours') then
    raise exception 'Hangout schedule is closed' using errcode = '23514';
  end if;
  return new;
end;
$$;

create function private.effective_hangout_cohost(p_hangout_id uuid, p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.hangouts h
    join private.hangout_cohosts c on c.hangout_id = h.id and c.account_id = p_actor
    join public.hangout_participants p on p.hangout_id = c.hangout_id
      and p.account_id = c.account_id and p.state = 'joined'
    where h.id = p_hangout_id and h.status = 'published'
      and h.host_id <> p_actor and h.visibility = 'campus'
      and not exists(select 1 from private.hangout_disables d where d.hangout_id = h.id)
      and private.hangouts_enabled()
      and private.ready_subject_campus(p_actor, h.university_id)
      and not private.safety_pair_blocked(p_actor, h.host_id));
$$;
revoke all on function private.effective_hangout_cohost(uuid,uuid) from public, anon, authenticated;

-- Only the host may assign or revoke. The participant and readiness checks
-- happen after the parent-row wait under the same transaction.
create function public.promote_hangout_cohost(p_hangout_id uuid,
  p_account_id uuid, p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare h public.hangouts; next_revision bigint;
begin
  perform private.social_hangout_mutation_lock();
  h := private.lock_hangout(p_hangout_id);
  if p_account_id is not null and p_account_id <> h.host_id then
    perform private.safety_lock_hangout_evidence(p_account_id, h.university_id);
  end if;
  if h.host_id <> auth.uid() or h.status <> 'published' or p_account_id is null
    or p_account_id = h.host_id or not exists(
      select 1 from public.hangout_participants p where p.hangout_id = h.id
        and p.account_id = p_account_id and p.state = 'joined')
    or not private.ready_subject_campus(p_account_id, h.university_id)
    or private.safety_pair_blocked(h.host_id, p_account_id)
    or exists(select 1 from private.hangout_cohosts c where c.hangout_id = h.id
      and c.account_id = p_account_id) then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  perform private.check_hangout_revision(h, p_expected_revision);
  insert into private.hangout_cohosts(hangout_id, account_id) values(h.id, p_account_id);
  update public.hangouts set revision = revision + 1, updated_at = clock_timestamp()
    where id = h.id returning revision into next_revision;
  return next_revision;
end;
$$;

create function public.demote_hangout_cohost(p_hangout_id uuid,
  p_account_id uuid, p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare h public.hangouts; next_revision bigint;
begin
  perform private.social_hangout_mutation_lock();
  h := private.lock_hangout(p_hangout_id);
  if h.host_id <> auth.uid() or h.status <> 'published' or p_account_id is null
    or p_account_id = h.host_id or not exists(
      select 1 from private.hangout_cohosts c where c.hangout_id = h.id
        and c.account_id = p_account_id) then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  perform private.check_hangout_revision(h, p_expected_revision);
  delete from private.hangout_cohosts where hangout_id = h.id and account_id = p_account_id;
  update public.hangouts set revision = revision + 1, updated_at = clock_timestamp()
    where id = h.id returning revision into next_revision;
  return next_revision;
end;
$$;

create function public.step_down_hangout_cohost(p_hangout_id uuid,
  p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare h public.hangouts; next_revision bigint;
begin
  perform private.social_hangout_mutation_lock();
  h := private.lock_hangout(p_hangout_id);
  if h.status <> 'published' or not private.effective_hangout_cohost(h.id, auth.uid()) then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  perform private.check_hangout_revision(h, p_expected_revision);
  delete from private.hangout_cohosts where hangout_id = h.id and account_id = auth.uid();
  update public.hangouts set revision = revision + 1, updated_at = clock_timestamp()
    where id = h.id returning revision into next_revision;
  return next_revision;
end;
$$;

-- Keyset pagination is complete for every retained assignment, including
-- suspended/nonready targets. No profile or membership history is projected.
create function public.list_hangout_cohosts(p_hangout_id uuid,
  p_after_account_id uuid default null, p_limit integer default 24)
returns table(account_id uuid)
language plpgsql volatile security definer set search_path = '' as $$
declare h public.hangouts;
begin
  if auth.uid() is null or p_hangout_id is null or p_limit is null
    or p_limit not between 1 and 24
    or current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  select * into h from public.hangouts where id = p_hangout_id for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode = '42501'; end if;
  perform 1 from private.hangout_feature_gate where singleton for share;
  perform private.safety_lock_hangout_evidence(auth.uid(), h.university_id);
  if h.host_id <> auth.uid() or h.status <> 'published'
    or h.university_id is distinct from private.ready_campus()
    or not private.can_read_hangout(h.id) then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  return query select c.account_id from private.hangout_cohosts c
    where c.hangout_id = h.id
      and (p_after_account_id is null or c.account_id > p_after_account_id)
    order by c.account_id limit p_limit;
end;
$$;

-- This label reader has precisely the existing current-ready roster surface.
create function public.list_hangout_roster_roles(p_hangout_id uuid,
  p_after_account_id uuid default null, p_limit integer default 24)
returns table(account_id uuid, role_label text)
language plpgsql volatile security definer set search_path = '' as $$
declare h public.hangouts;
begin
  if auth.uid() is null or p_hangout_id is null or p_limit is null
    or p_limit not between 1 and 24
    or current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  select * into h from public.hangouts where id = p_hangout_id for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode = '42501'; end if;
  perform 1 from private.hangout_feature_gate where singleton for share;
  perform private.safety_lock_hangout_evidence(auth.uid(), h.university_id);
  if not private.can_read_hangout(h.id) or h.status <> 'published' then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  return query select p.account_id,
    case when p.account_id = h.host_id then 'host'
      when private.effective_hangout_cohost(h.id,p.account_id) then 'cohost'
      else 'participant' end
    from public.hangout_participants p where p.hangout_id = h.id
      and (p_after_account_id is null or p.account_id > p_after_account_id)
      and private.can_read_hangout_roster(h.id,p.account_id)
    order by p.account_id limit p_limit;
end;
$$;
create or replace function public.edit_hangout(p_hangout_id uuid,p_expected_revision bigint,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint; normalized_private text; old_private text; material boolean;
begin
  perform private.social_hangout_mutation_lock();
 h=private.lock_hangout(p_hangout_id);
 if (h.host_id<>auth.uid() and not private.effective_hangout_cohost(h.id,auth.uid())) or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
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
 if (h.host_id<>auth.uid() and not private.effective_hangout_cohost(h.id,auth.uid())) or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 if p_joining_state is null or p_joining_state not in ('open','closed') then raise exception 'Invalid joining state' using errcode='22023'; end if;
 update public.hangouts set joining_state=p_joining_state,revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 return next_revision;
end;
$$;

create or replace function public.leave_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; was_cohost boolean;
begin
  perform private.social_hangout_mutation_lock();
 h=private.lock_hangout(p_hangout_id);
 if h.host_id=auth.uid() then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 was_cohost:=exists(select 1 from private.hangout_cohosts c where c.hangout_id=h.id and c.account_id=auth.uid());
 perform private.safety_record_joined_overlap(h.id,auth.uid());
 update public.hangout_participants set state='left',left_at=clock_timestamp(),updated_at=clock_timestamp()
 where hangout_id=h.id and account_id=auth.uid() and state='joined';
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if was_cohost then
   update public.hangouts set revision=revision+1,
     updated_at=case when status='cancelled' then updated_at else clock_timestamp() end
     where id=h.id;
 end if;
 perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_left');
end; $$;

-- No revision-free compatibility overload may survive migration.
revoke all on function public.remove_hangout_participant(uuid,uuid)
  from public, anon, authenticated;
drop function public.remove_hangout_participant(uuid,uuid);

create function public.remove_hangout_participant(p_hangout_id uuid,
  p_account_id uuid, p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare h public.hangouts; next_revision bigint; target_state text;
begin
  perform private.social_hangout_mutation_lock();
  h := private.lock_hangout(p_hangout_id);
  if p_account_id is null or p_account_id = h.host_id
    or (h.host_id <> auth.uid() and not private.effective_hangout_cohost(h.id, auth.uid()))
    or (h.host_id <> auth.uid() and h.status <> 'published') then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  perform private.check_hangout_revision(h, p_expected_revision);
  select state into target_state from public.hangout_participants p
    where p.hangout_id = h.id and p.account_id = p_account_id;
  if target_state not in ('joined','left') or target_state is null then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  if h.host_id <> auth.uid() then
    perform private.safety_lock_hangout_evidence(p_account_id, h.university_id);
    if target_state <> 'joined'
      or not private.ready_subject_campus(p_account_id, h.university_id)
      or exists(select 1 from private.hangout_cohosts c
        where c.hangout_id = h.id and c.account_id = p_account_id)
      or private.safety_pair_blocked(auth.uid(), p_account_id)
      or not private.effective_hangout_cohost(h.id, auth.uid()) then
      raise exception 'Hangout operation not permitted' using errcode = '42501';
    end if;
  end if;
  perform private.safety_record_joined_overlap(h.id, p_account_id);
  update public.hangout_participants set state = 'removed',
    removed_at = clock_timestamp(), updated_at = clock_timestamp()
    where hangout_id = h.id and account_id = p_account_id and state in ('joined','left');
  if not found then raise exception 'Hangout operation not permitted' using errcode = '42501'; end if;
  update public.hangouts set revision = revision + 1,
    updated_at = case when status = 'cancelled' then updated_at else clock_timestamp() end
    where id = h.id returning revision into next_revision;
  return next_revision;
end;
$$;

revoke all on function public.promote_hangout_cohost(uuid,uuid,bigint),
  public.demote_hangout_cohost(uuid,uuid,bigint),
  public.step_down_hangout_cohost(uuid,bigint),
  public.list_hangout_cohosts(uuid,uuid,integer),
  public.list_hangout_roster_roles(uuid,uuid,integer),
  public.remove_hangout_participant(uuid,uuid,bigint)
  from public, anon, authenticated;
grant execute on function public.promote_hangout_cohost(uuid,uuid,bigint),
  public.demote_hangout_cohost(uuid,uuid,bigint),
  public.step_down_hangout_cohost(uuid,bigint),
  public.list_hangout_cohosts(uuid,uuid,integer),
  public.list_hangout_roster_roles(uuid,uuid,integer),
  public.remove_hangout_participant(uuid,uuid,bigint)
  to authenticated;
commit;
