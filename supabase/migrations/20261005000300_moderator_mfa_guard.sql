begin;

-- All five privileged RPCs enter through this caller-bound guard.  Lock the
-- factor before the session, matching Auth's factor removal path; repeat the
-- session/factor check after both locks so a waiting request sees revocation.
create or replace function private.moderation_actor() returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  session_claim text := auth.jwt()->>'session_id';
  v_session_id uuid;
  v_factor_id uuid;
begin
  perform pg_advisory_xact_lock(17017,1);
  if current_setting('transaction_isolation') <> 'read committed'
    or actor is null
    or (auth.jwt()->>'aal') is distinct from 'aal2'
    or session_claim is null
    or session_claim !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;
  v_session_id := session_claim::uuid;

  perform 1 from private.moderation_feature_gate where singleton for share;
  if not found then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;
  perform 1 from public.accounts where id=actor for share;
  if not found then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;
  perform 1 from public.platform_roles where user_id=actor for share;
  if not found then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;
  if not exists(select 1 from private.moderation_feature_gate where singleton and enabled)
    or not exists(select 1 from public.accounts where id=actor and status='active')
    or not exists(select 1 from public.platform_roles where user_id=actor and role in ('moderator','admin')) then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;

  -- This first read is only a lock target.  No decision uses it until the
  -- locked session row is checked again below.
  select s.factor_id into v_factor_id from auth.sessions s
    where s.id=v_session_id and s.user_id=actor;
  if v_factor_id is null then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;
  perform 1 from auth.mfa_factors f where f.id=v_factor_id for share;
  if not found then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;
  perform 1 from auth.sessions s where s.id=v_session_id for share;
  if not found then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;
  if not exists(select 1 from auth.sessions s
      join auth.mfa_factors f on f.id=s.factor_id
      where s.id=v_session_id and s.user_id=actor and s.factor_id=v_factor_id
        and s.aal::text='aal2'
        and (s.not_after is null or s.not_after > clock_timestamp())
        and f.user_id=actor and f.factor_type::text='totp'
        and f.status::text='verified') then
    raise exception 'Moderation unavailable' using errcode='42501';
  end if;
  return actor;
end; $$;

revoke all on function private.moderation_actor() from public, anon, authenticated, service_role;

commit;
