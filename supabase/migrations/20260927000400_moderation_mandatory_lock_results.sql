-- TASK-021A1b2 reviewed mandatory operator authority lock-result repair.
-- No lock graph, caller ABI, student authority or data changes.
begin;

create or replace function private.moderation_actor() returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  perform pg_advisory_xact_lock(17017,1);
  if current_setting('transaction_isolation')<>'read committed' or actor is null then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  perform 1 from private.moderation_feature_gate where singleton for share;
  if not found then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  -- SHARE blocks status/deletion changes but is compatible with the existing
  -- report intake actor SHARE after its Hangout parent lock.
  perform 1 from public.accounts where id=actor for share;
  if not found then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  perform 1 from public.platform_roles where user_id=actor for share;
  if not found then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  if not exists(select 1 from private.moderation_feature_gate where singleton and enabled)
    or not exists(select 1 from public.accounts where id=actor and status='active')
    or not exists(select 1 from public.platform_roles where user_id=actor and role in ('moderator','admin')) then
    raise exception 'Moderation unavailable' using errcode='42501'; end if;
  return actor;
end; $$;

revoke all on function private.moderation_actor() from public, anon, authenticated, service_role;

commit;
