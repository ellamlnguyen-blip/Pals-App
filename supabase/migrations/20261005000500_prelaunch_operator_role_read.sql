-- ADR-0032: an eligible UNC operator can read only their own role before launch.
begin;

create function private.prelaunch_operator_eligible() returns boolean
language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from public.accounts a
  join auth.users u on u.id=a.id
  join public.university_memberships m on m.user_id=a.id
  join public.universities c on c.id=m.university_id
  where a.id=(select auth.uid()) and a.status='active'
   and c.slug='unc-chapel-hill' and c.active
   and u.email_confirmed_at is not null and m.verified_at is not null
   and lower(u.email)=lower(m.verification_email)
   and u.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
   and lower(split_part(u.email,'@',2))=any(c.allowed_email_domains)
 );
$$;
revoke all on function private.prelaunch_operator_eligible() from public,anon,authenticated,service_role;
grant execute on function private.prelaunch_operator_eligible() to authenticated;

drop policy roles_owner_read on public.platform_roles;
create policy roles_owner_read on public.platform_roles for select to authenticated
using (user_id=(select auth.uid()) and (select private.prelaunch_operator_eligible()));

commit;
