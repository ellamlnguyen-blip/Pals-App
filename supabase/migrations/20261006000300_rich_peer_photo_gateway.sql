-- TASK-028P2 / ADR-0036: one-snapshot, service-only exact-object resolver.
begin;

create function public.resolve_rich_peer_photo_for_gateway(
  actor_id uuid, subject_id uuid, slot text, expected_revision bigint
)
returns table(object_id uuid, object_path text, photo_revision bigint)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.people_require_read_committed();
  if current_setting('role', true) is distinct from 'service_role'
    or actor_id is null or subject_id is null or actor_id=subject_id
    or slot is null or slot not in ('primary','0','1','2','3')
    or expected_revision is null or expected_revision <= 0 then
    raise exception 'Photo unavailable' using errcode='42501';
  end if;

  -- Authorization, selected slot, profile revision and Storage object are
  -- projected by this one READ COMMITTED statement snapshot. A second call
  -- after the exact-path download must match all three returned values.
  return query
  select o.id, o.name, p.revision
  from public.profiles p
  join public.accounts subject on subject.id=p.user_id and subject.status='active'
  join public.accounts viewer on viewer.id=actor_id and viewer.status='active'
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
  cross join lateral (select case slot
    when 'primary' then p.primary_photo_path
    when '0' then p.additional_photo_paths[1]
    when '1' then p.additional_photo_paths[2]
    when '2' then p.additional_photo_paths[3]
    when '3' then p.additional_photo_paths[4]
    end as path) selected
  join storage.objects o on o.bucket_id='profile-photos' and o.name=selected.path
    and o.owner_id=subject.id::text and split_part(o.name,'/',1)=subject.id::text
  where p.user_id=subject_id and p.revision=expected_revision
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

revoke all on function public.resolve_rich_peer_photo_for_gateway(uuid,uuid,text,bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.resolve_rich_peer_photo_for_gateway(uuid,uuid,text,bigint)
  to service_role;

commit;
