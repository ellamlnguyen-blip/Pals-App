-- TASK-021A1b1 / ADR-0027: caller admission and required owner lifecycle only.
begin;

-- Internal subject check also guards Storage's final service-role write. No client grant.
create function private.pilot_owner_subject_eligible(subject uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.pilot_is_available() and private.pilot_capability_enabled('onboarding')
 and exists(select 1 from public.accounts a
 join private.pilot_account_admission r on r.account_id=a.id and r.state='active'
 join auth.users u on u.id=a.id
 join public.university_memberships m on m.user_id=a.id
 join public.universities c on c.id=m.university_id
 where a.id=subject and a.status='active' and c.slug='unc-chapel-hill' and c.active
 and u.email_confirmed_at is not null and m.verified_at is not null
 and lower(u.email)=lower(m.verification_email)
 and u.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
 and lower(split_part(u.email,'@',2))=any(c.allowed_email_domains));
$$;
revoke all on function private.pilot_owner_subject_eligible(uuid) from public,anon,authenticated,service_role;
create function private.pilot_onboarding_eligible() returns boolean
language sql stable security definer set search_path='' as $$
 select private.pilot_owner_subject_eligible((select auth.uid()));
$$;
revoke all on function private.pilot_onboarding_eligible() from public,anon,authenticated,service_role;
-- RLS invokes only this caller-bound boolean, never a subject/admission reader.
grant usage on schema private to authenticated;
grant execute on function private.pilot_onboarding_eligible() to authenticated;

create or replace function public.get_access_state() returns text
language sql stable security definer set search_path='' as $$
 select case
  when (select auth.uid()) is null or not exists(select 1 from public.accounts where id=(select auth.uid())) then 'signed_out'
  when not private.account_is_active() then 'restricted'
  when not private.pilot_is_available() or not private.pilot_caller_is_admitted() then 'pilot_unavailable'
  when not private.has_verified_membership() or not exists(select 1 from public.university_memberships m
    join public.universities c on c.id=m.university_id where m.user_id=(select auth.uid()) and c.slug='unc-chapel-hill') then 'unverified'
  when not exists(select 1 from public.profiles p join storage.objects o
    on o.bucket_id='profile-photos' and o.name=p.primary_photo_path and o.owner_id=p.user_id::text
    and split_part(o.name,'/',1)=p.user_id::text
    where p.user_id=(select auth.uid()) and p.is_complete) then 'onboarding'
  else 'ready' end;
$$;
revoke all on function public.get_access_state() from public,anon,authenticated,service_role;
grant execute on function public.get_access_state() to authenticated;

create or replace function private.ready_subject_campus(subject uuid,campus uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.pilot_is_available() and exists(select 1 from public.accounts a
 join private.pilot_account_admission r on r.account_id=a.id and r.state='active'
 join auth.users u on u.id=a.id
 join public.university_memberships m on m.user_id=a.id
 join public.universities c on c.id=m.university_id
 join public.profiles p on p.user_id=a.id
 join storage.objects o on o.bucket_id='profile-photos' and o.name=p.primary_photo_path
  and o.owner_id=a.id::text and split_part(o.name,'/',1)=a.id::text
 where a.id=subject and a.status='active' and c.id=campus and c.active and c.slug='unc-chapel-hill'
 and u.email_confirmed_at is not null and m.verified_at is not null
 and lower(u.email)=lower(m.verification_email)
 and u.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
 and lower(split_part(u.email,'@',2))=any(c.allowed_email_domains) and p.is_complete);
$$;
revoke all on function private.ready_subject_campus(uuid,uuid) from public,anon,authenticated,service_role;

drop policy universities_active_read on public.universities;
create policy universities_active_read on public.universities for select to authenticated
using(active and (select private.pilot_onboarding_eligible())
 and id=(select university_id from public.university_memberships where user_id=(select auth.uid())));
drop policy accounts_owner_read on public.accounts;
create policy accounts_owner_read on public.accounts for select to authenticated
using(id=(select auth.uid()) and (select private.pilot_onboarding_eligible()));
drop policy memberships_owner_read on public.university_memberships;
create policy memberships_owner_read on public.university_memberships for select to authenticated
using(user_id=(select auth.uid()) and (select private.pilot_onboarding_eligible()));
drop policy profiles_owner_read on public.profiles;
create policy profiles_owner_read on public.profiles for select to authenticated
using(user_id=(select auth.uid()) and (select private.pilot_onboarding_eligible()));
drop policy profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated
using(user_id=(select auth.uid()) and (select private.pilot_onboarding_eligible()))
with check(user_id=(select auth.uid()) and (select private.pilot_onboarding_eligible()));
drop policy roles_owner_read on public.platform_roles;
create policy roles_owner_read on public.platform_roles for select to authenticated
using(user_id=(select auth.uid()) and (select private.pilot_onboarding_eligible()));

drop policy profile_photos_owner_read on storage.objects;
create policy profile_photos_owner_read on storage.objects for select to authenticated
using(bucket_id='profile-photos' and owner_id=(select auth.uid())::text
 and (select private.pilot_onboarding_eligible()));
drop policy profile_photos_owner_insert on storage.objects;
create policy profile_photos_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='profile-photos' and owner_id=(select auth.uid())::text
 and name ~ ('^'||(select auth.uid())::text||'/[a-f0-9-]+\.(jpg|png|webp)$')
 and (select private.pilot_onboarding_eligible()));
drop policy profile_photos_owner_delete on storage.objects;
create policy profile_photos_owner_delete on storage.objects for delete to authenticated
using(bucket_id='profile-photos' and owner_id=(select auth.uid())::text
 and (select private.pilot_onboarding_eligible())
 and not exists(select 1 from public.profiles p where p.user_id=(select auth.uid())
 and (p.primary_photo_path=name or name=any(p.additional_photo_paths))));

-- Direct rows are already acquired. Never take social after these rows.
create function private.pilot_lock_owner_evidence(subject uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare campus uuid;
begin
 perform private.pilot_evidence_lock();
 perform 1 from private.pilot_availability where singleton for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 perform 1 from private.pilot_capabilities where key='onboarding' for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 -- One involved account, hence trivially sorted UUID order.
 perform 1 from public.accounts where id=subject for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 perform 1 from private.pilot_account_admission where account_id=subject for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 perform 1 from auth.users where id=subject for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 select university_id into campus from public.university_memberships where user_id=subject for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 perform 1 from public.universities where id=campus for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 -- This separate volatile statement receives a fresh READ COMMITTED snapshot.
 if subject is null or not private.pilot_owner_subject_eligible(subject)
  or not exists(select 1 from public.university_memberships where user_id=subject and university_id=campus) then
  raise exception 'Owner operation unavailable' using errcode='42501'; end if;
end; $$;
revoke all on function private.pilot_lock_owner_evidence(uuid) from public,anon,authenticated,service_role;

create or replace function private.require_active_profile_write() returns trigger
language plpgsql volatile security definer set search_path='' as $$
begin
 if current_setting('role',true)='authenticated' then
  perform private.pilot_lock_owner_evidence(auth.uid());
  if auth.uid() is distinct from new.user_id then
   raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 end if;
 return new;
end; $$;
create or replace function private.require_active_photo_write() returns trigger
language plpgsql volatile security definer set search_path='' as $$
declare target storage.objects%rowtype; subject uuid; original_role text:=current_setting('role',true);
begin
 target:=case when tg_op='DELETE' then old else new end;
 if target.bucket_id='profile-photos' then
  if original_role='authenticated' then
   subject:=auth.uid();
   if subject is null or target.owner_id is distinct from subject::text then
    raise exception 'Owner operation unavailable' using errcode='42501'; end if;
  elsif original_role='service_role' then
   -- Real Storage first checks client permission separately, then persists as
   -- supabase_storage_admin/service_role with auth.uid null. Guard that final
   -- row through commit using its server-assigned owner; no service RPC grant.
   if tg_op<>'INSERT' or session_user<>'supabase_storage_admin' or target.owner_id is null
    or target.owner_id !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then
    raise exception 'Owner operation unavailable' using errcode='42501'; end if;
   subject:=target.owner_id::uuid;
   -- Storage finalizes via UPSERT even for a create request. Never let its
   -- privileged final insert overwrite an already committed immutable name.
   if exists(select 1 from storage.objects o where o.bucket_id=target.bucket_id and o.name=target.name) then
    raise exception 'Owner operation unavailable' using errcode='42501'; end if;
  end if;
  if original_role in ('authenticated','service_role') then
   if target.name !~ ('^'||subject::text||'/[a-f0-9-]+\.(jpg|png|webp)$') then
    raise exception 'Owner operation unavailable' using errcode='42501'; end if;
   perform private.pilot_lock_owner_evidence(subject);
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
revoke all on function private.require_active_profile_write(),private.require_active_photo_write() from public,anon,authenticated,service_role;
-- Existing trigger bindings/order, revision and reference checks remain intact.
-- Auth provision/sync and trusted profile INSERT remain unchanged.
commit;
