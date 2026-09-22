-- ADR-0009: confirmed exact-domain UNC email, complete profile and owned photo.
begin;

insert into public.universities(id, slug, name, active, allowed_email_domains)
values ('00000000-0000-4000-8000-000000000001', 'unc-chapel-hill',
 'University of North Carolina at Chapel Hill', true,
 array['live.unc.edu','unc.edu','ad.unc.edu','business.unc.edu','kenan-flagler.unc.edu'])
on conflict (slug) do update set allowed_email_domains = excluded.allowed_email_domains;

create function private.sync_confirmed_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare campus uuid;
begin
  if new.email_confirmed_at is not null and new.email ~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    select id into campus from public.universities
    where slug = 'unc-chapel-hill' and active
      and lower(split_part(new.email, '@', 2)) = any(allowed_email_domains);
  end if;
  if campus is null then
    delete from public.university_memberships where user_id = new.id;
  else
    insert into public.university_memberships(user_id, university_id, verified_at, verification_email)
    values (new.id, campus, new.email_confirmed_at, lower(new.email))
    on conflict (user_id) do update set university_id = excluded.university_id,
      verified_at = excluded.verified_at, verification_email = excluded.verification_email;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_confirmed_membership() from public, anon, authenticated;
-- Alphabetically after pals_provision_account, so the account FK already exists.
create trigger pals_sync_confirmed_membership after insert or update of email, email_confirmed_at on auth.users
for each row execute function private.sync_confirmed_membership();

create or replace function private.has_verified_membership() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.accounts a
    join auth.users u on u.id = a.id
    join public.university_memberships m on m.user_id = a.id
    join public.universities c on c.id = m.university_id
    where a.id = (select auth.uid()) and a.status = 'active'
      and u.email_confirmed_at is not null and m.verified_at is not null and c.active
      and lower(u.email) = lower(m.verification_email)
      and u.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
      and lower(split_part(u.email, '@', 2)) = any(c.allowed_email_domains)
  );
$$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

create policy profile_photos_owner_read on storage.objects for select to authenticated
using (bucket_id='profile-photos' and owner_id=(select auth.uid())::text
  and (select private.has_verified_membership()));
create policy profile_photos_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='profile-photos' and owner_id=(select auth.uid())::text
  and name ~ ('^' || (select auth.uid())::text || '/[a-f0-9-]+\.(jpg|png|webp)$')
  and (select private.has_verified_membership()));
-- Immutable object names: replace by uploading a fresh name, then change the profile.
create policy profile_photos_owner_delete on storage.objects for delete to authenticated
using (bucket_id='profile-photos' and owner_id=(select auth.uid())::text
  and (select private.has_verified_membership())
  and not exists (select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.primary_photo_path=name));

create function private.validate_primary_photo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.primary_photo_path is not null and not exists (
    select 1 from storage.objects o where o.bucket_id='profile-photos'
      and o.name=new.primary_photo_path and o.owner_id=new.user_id::text
      and split_part(o.name, '/', 1)=new.user_id::text
  ) then
    raise exception 'Primary photo must be an owned private profile photo' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_primary_photo() from public, anon, authenticated;
create trigger validate_primary_photo before insert or update of primary_photo_path on public.profiles
for each row execute function private.validate_primary_photo();

-- Caller-bound live gate, shared by web and future authenticated features.
create function public.get_access_state() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when not exists(select 1 from public.accounts where id=(select auth.uid())) then 'signed_out'
    when not private.account_is_active() then 'restricted'
    when not private.has_verified_membership() then 'unverified'
    when not exists (
      select 1 from public.profiles p join storage.objects o
        on o.bucket_id='profile-photos' and o.name=p.primary_photo_path and o.owner_id=p.user_id::text
      where p.user_id=(select auth.uid()) and p.is_complete
    ) then 'onboarding'
    else 'ready' end;
$$;
revoke all on function public.get_access_state() from public, anon, authenticated;
grant execute on function public.get_access_state() to authenticated;

-- Reconcile existing accounts only from current confirmed Auth evidence.
update auth.users set email_confirmed_at=email_confirmed_at;
commit;
