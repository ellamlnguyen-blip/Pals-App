-- TASK-028P2 / ADR-0036: separate, default-private rich peer consent.
begin;

create table private.rich_profile_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into private.rich_profile_feature_gate(singleton, enabled) values (true, false);
alter table private.rich_profile_feature_gate enable row level security;
revoke all on private.rich_profile_feature_gate from public, anon, authenticated;

create table private.rich_profile_preferences (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  opted_in boolean not null default false,
  revision bigint not null default 0 check (revision >= 0)
);
alter table private.rich_profile_preferences enable row level security;
revoke all on private.rich_profile_preferences from public, anon, authenticated;

-- Both consent writers enter the same graph, including opt-out. Missing policy
-- rows are tolerated only by opt-out; no gate is interpreted as enabled.
create function private.rich_lock_consent(p_actor uuid, p_opt_in boolean)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare campus uuid;
begin
  perform private.people_require_read_committed();
  perform private.social_hangout_mutation_lock();
  perform private.pilot_evidence_lock();
  perform 1 from private.pilot_availability where singleton for share;
  if not found and p_opt_in then raise exception 'People operation unavailable' using errcode='42501'; end if;
  perform 1 from private.pilot_capabilities where key='people' for share;
  if not found and p_opt_in then raise exception 'People operation unavailable' using errcode='42501'; end if;
  perform 1 from private.people_feature_gate where singleton for share;
  if not found and p_opt_in then raise exception 'People operation unavailable' using errcode='42501'; end if;
  perform 1 from private.rich_profile_feature_gate where singleton for share;
  if not found and p_opt_in then raise exception 'People operation unavailable' using errcode='42501'; end if;
  perform 1 from public.accounts where id=p_actor for update;
  if not found then raise exception 'People operation unavailable' using errcode='42501'; end if;
  if p_opt_in then
    perform 1 from auth.users where id=p_actor for share;
    if not found then raise exception 'People operation unavailable' using errcode='42501'; end if;
    select m.university_id into campus from public.university_memberships m where m.user_id=p_actor for share;
    if not found then raise exception 'People operation unavailable' using errcode='42501'; end if;
    perform 1 from public.universities where id=campus for share;
    if not found then raise exception 'People operation unavailable' using errcode='42501'; end if;
  end if;
  return campus;
end; $$;
revoke all on function private.rich_lock_consent(uuid,boolean) from public, anon, authenticated, service_role;

create or replace function public.set_people_preference(p_opted_in boolean) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); campus uuid;
begin
  if p_opted_in is null or actor is null then
    raise exception 'People operation unavailable' using errcode='42501'; end if;
  campus:=private.rich_lock_consent(actor,p_opted_in);
  -- Fresh checks after all waits. The locked membership is the campus source.
  if not private.people_active_owner() or
     (p_opted_in and (not private.people_enabled() or
       campus is distinct from private.people_ready_campus() or
       not private.ready_subject_campus(actor,campus))) then
    raise exception 'People operation unavailable' using errcode='42501'; end if;
  perform 1 from private.people_preferences where account_id=actor for update;
  perform 1 from private.rich_profile_preferences where account_id=actor for update;
  insert into private.people_preferences(account_id,opted_in) values(actor,p_opted_in)
    on conflict(account_id) do update set opted_in=excluded.opted_in;
  if not p_opted_in then
    update private.rich_profile_preferences
      set opted_in=false, revision=revision+1
      where account_id=actor and opted_in;
  end if;
  return p_opted_in;
end; $$;

create function public.get_my_rich_profile_preference()
returns table(opted_in boolean, revision bigint)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.people_require_read_committed();
  if not private.people_active_owner() then
    raise exception 'People operation unavailable' using errcode='42501'; end if;
  return query select coalesce(p.opted_in,false),coalesce(p.revision,0)::bigint
    from (select 1) seed left join private.rich_profile_preferences p on p.account_id=auth.uid();
end; $$;

create function public.set_my_rich_profile_preference(p_opted_in boolean,p_expected_revision bigint)
returns table(opted_in boolean, revision bigint)
language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); campus uuid; old_opted boolean; old_revision bigint;
begin
  if actor is null or p_opted_in is null or p_expected_revision is null or p_expected_revision<0 then
    raise exception 'People operation unavailable' using errcode='42501'; end if;
  campus:=private.rich_lock_consent(actor,p_opted_in);
  if not private.people_active_owner() then
    raise exception 'People operation unavailable' using errcode='42501'; end if;
  -- Opt-out deliberately has no readiness, gate, People, or content prerequisite.
  if p_opted_in and (
    not private.pilot_capability_enabled('people') or
    not private.people_enabled() or
    not exists(select 1 from private.rich_profile_feature_gate where singleton and enabled) or
    campus is distinct from private.people_ready_campus() or
    not private.ready_subject_campus(actor,campus) or
    not exists(select 1 from private.people_preferences pp where pp.account_id=actor and pp.opted_in) or
    not exists(select 1 from public.profiles where user_id=actor and real_name is not null
      and graduation_year is not null and major is not null and bio is not null)
  ) then raise exception 'People operation unavailable' using errcode='42501'; end if;
  perform 1 from private.people_preferences where account_id=actor for update;
  select p.opted_in,p.revision into old_opted,old_revision
    from private.rich_profile_preferences p where p.account_id=actor for update;
  old_opted:=coalesce(old_opted,false);
  old_revision:=coalesce(old_revision,0);
  if p_expected_revision<>old_revision then
    raise exception 'People operation unavailable' using errcode='42501'; end if;
  if p_opted_in is distinct from old_opted then
    insert into private.rich_profile_preferences(account_id,opted_in,revision)
      values(actor,p_opted_in,old_revision+1)
      on conflict(account_id) do update set opted_in=excluded.opted_in,revision=excluded.revision;
    old_revision:=old_revision+1;
  end if;
  opted_in:=p_opted_in;
  revision:=old_revision;
  return next;
end; $$;

-- The RETURN QUERY authorization and projection use one READ COMMITTED
-- statement snapshot. Missing/denied subjects both yield zero rows.
create function public.get_rich_people_detail(p_account_id uuid)
returns table(account_id uuid,real_name text,campus_name text,graduation_year integer,
  major text,bio text,interests text[],down_to_do text[],hometown text,
  prompts jsonb,unc_email_verified boolean,photo_revision bigint,photo_slots text[])
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.people_require_read_committed();
  return query select p.user_id,p.real_name,c.name,p.graduation_year,p.major,p.bio,p.interests,
    p.down_to_do,p.hometown,p.prompts,true,p.revision,
    array_remove(array[
      case when p.primary_photo_path is not null then 'primary'::text end,
      case when cardinality(p.additional_photo_paths)>=1 then '0'::text end,
      case when cardinality(p.additional_photo_paths)>=2 then '1'::text end,
      case when cardinality(p.additional_photo_paths)>=3 then '2'::text end,
      case when cardinality(p.additional_photo_paths)>=4 then '3'::text end
    ],null::text)
  from public.profiles p
  join public.accounts subject on subject.id=p.user_id and subject.status='active'
  join public.accounts viewer on viewer.id=auth.uid() and viewer.status='active'
  join auth.users su on su.id=subject.id
  join auth.users vu on vu.id=viewer.id
  join public.university_memberships sm on sm.user_id=subject.id and sm.verified_at is not null
  join public.university_memberships vm on vm.user_id=viewer.id and vm.verified_at is not null
    and vm.university_id=sm.university_id
  join public.universities c on c.id=sm.university_id and c.active and c.slug='unc-chapel-hill'
  join private.pilot_availability pa on pa.singleton and pa.enabled
  join private.pilot_capabilities pc on pc.key='people' and pc.enabled
  join private.people_feature_gate pg on pg.singleton and pg.enabled
  join private.rich_profile_feature_gate rg on rg.singleton and rg.enabled
  join private.people_preferences sp on sp.account_id=subject.id and sp.opted_in
  join private.people_preferences vp on vp.account_id=viewer.id and vp.opted_in
  join private.rich_profile_preferences rp on rp.account_id=subject.id and rp.opted_in
  where p.user_id=p_account_id and p.user_id<>viewer.id
    and p.real_name is not null and p.graduation_year is not null
    and p.major is not null and p.bio is not null
    and su.email_confirmed_at is not null and vu.email_confirmed_at is not null
    and lower(su.email)=lower(sm.verification_email)
    and lower(vu.email)=lower(vm.verification_email)
    and su.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
    and vu.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
    and lower(split_part(su.email,'@',2))=any(c.allowed_email_domains)
    and lower(split_part(vu.email,'@',2))=any(c.allowed_email_domains)
    and not exists(select 1 from private.people_blocks b where
      (b.blocker_id=viewer.id and b.blocked_id=subject.id) or
      (b.blocker_id=subject.id and b.blocked_id=viewer.id));
end;
$$;

revoke all on function public.get_my_rich_profile_preference(),
  public.set_my_rich_profile_preference(boolean,bigint),public.get_rich_people_detail(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.get_my_rich_profile_preference(),
  public.set_my_rich_profile_preference(boolean,bigint),public.get_rich_people_detail(uuid)
  to authenticated;
commit;
