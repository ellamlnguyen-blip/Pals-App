-- Bounded implementation of ADR-0002/0006/0008 and the accepted identity model.
-- No email-domain or enrollment eligibility policy is implemented here.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  active boolean not null default false,
  -- Empty until exact domains and the meaning of verification are accepted.
  allowed_email_domains text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at timestamptz not null default now()
);

create table public.university_memberships (
  user_id uuid primary key references public.accounts(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  verified_at timestamptz,
  verification_email text,
  check ((verified_at is null and verification_email is null) or
    (verified_at is not null and verification_email is not null and length(btrim(verification_email)) > 0)),
  created_at timestamptz not null default now()
);
create index university_memberships_university_idx on public.university_memberships(university_id);

create table public.profiles (
  user_id uuid primary key references public.accounts(id) on delete cascade,
  real_name text check (real_name is null or length(btrim(real_name)) between 1 and 100),
  graduation_year integer check (graduation_year between 1900 and 2200),
  major text check (major is null or length(btrim(major)) between 1 and 200),
  bio text check (bio is null or length(btrim(bio)) between 1 and 2000),
  -- A future private Storage object reference, never an arbitrary remote URL.
  primary_photo_path text check (primary_photo_path is null or length(btrim(primary_photo_path)) between 1 and 1024),
  -- Structural completeness only. Does not assert real identity or student eligibility.
  is_complete boolean generated always as (
    real_name is not null and graduation_year is not null and major is not null
    and bio is not null and primary_photo_path is not null
  ) stored,
  created_at timestamptz not null default now()
);

create table public.platform_roles (
  user_id uuid primary key references public.accounts(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  created_at timestamptz not null default now()
);

-- Provision only an account and empty profile. Ignore all user-editable metadata.
create function private.provision_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts(id) values (new.id);
  insert into public.profiles(user_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.provision_account() from public, anon, authenticated;
create trigger pals_provision_account after insert on auth.users
for each row execute function private.provision_account();

-- Existing Auth users also get a non-privileged foundation, without inferred membership.
insert into public.accounts(id) select id from auth.users on conflict do nothing;
insert into public.profiles(user_id) select id from public.accounts on conflict do nothing;

-- Caller-bound helpers: no arbitrary user argument and no trust in stale JWT metadata.
create function private.account_is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.accounts a where a.id = (select auth.uid()) and a.status = 'active');
$$;
create function private.has_verified_membership() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.accounts a
    join auth.users u on u.id = a.id
    join public.university_memberships m on m.user_id = a.id
    join public.universities c on c.id = m.university_id
    where a.id = (select auth.uid()) and a.status = 'active'
      and u.email_confirmed_at is not null and m.verified_at is not null and c.active
      and lower(u.email) = lower(m.verification_email)
  );
$$;
revoke all on function private.account_is_active(), private.has_verified_membership() from public, anon, authenticated;
grant execute on function private.account_is_active(), private.has_verified_membership() to authenticated;

alter table public.universities enable row level security;
alter table public.accounts enable row level security;
alter table public.university_memberships enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_roles enable row level security;

-- Explicit grants also override Supabase's hosted default grants on these tables.
revoke all on public.universities, public.accounts, public.university_memberships,
  public.profiles, public.platform_roles from public, anon, authenticated;
grant select on public.universities, public.accounts, public.university_memberships,
  public.profiles, public.platform_roles to authenticated;
grant update (real_name, graduation_year, major, bio, primary_photo_path) on public.profiles to authenticated;

create policy universities_active_read on public.universities for select to authenticated
using (active and (select private.account_is_active()));
-- Status remains readable by its owner so a future client can explain account restrictions.
create policy accounts_owner_read on public.accounts for select to authenticated
using (id = (select auth.uid()));
create policy memberships_owner_read on public.university_memberships for select to authenticated
using (user_id = (select auth.uid()) and (select private.account_is_active()));
create policy profiles_owner_read on public.profiles for select to authenticated
using (user_id = (select auth.uid()) and (select private.account_is_active()));
create policy profiles_owner_update on public.profiles for update to authenticated
using (user_id = (select auth.uid()) and (select private.account_is_active()))
with check (user_id = (select auth.uid()) and (select private.account_is_active()));
create policy roles_owner_read on public.platform_roles for select to authenticated
using (user_id = (select auth.uid()) and (select private.account_is_active()));

-- Operators get no blanket client bypass. Audited moderation access is a later task.
-- No client may mutate account state, membership, roles, or university policy.
commit;
