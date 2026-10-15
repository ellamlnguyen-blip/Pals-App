-- Accepted ADR-0037. Self-declared hometown belongs to the active owner only.
begin;
alter table public.profiles
  add column hometown text
  constraint profiles_hometown_valid check (
    hometown is null or (
      hometown = private.profile_trim(hometown)
      and length(hometown) between 1 and 100
    )
  );
grant update(hometown) on public.profiles to authenticated;
commit;
