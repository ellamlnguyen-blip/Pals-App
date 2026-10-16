-- ADR-0034 / TASK-027N: protect both caller-bound policy writers at the DB boundary.
begin;

create or replace function private.pilot_require_manager() returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  session_claim text := auth.jwt()->>'session_id';
  v_session_id uuid;
  v_factor_id uuid;
begin
  if current_setting('transaction_isolation') <> 'read committed'
    or actor is null
    or (auth.jwt()->>'aal') is distinct from 'aal2'
    or session_claim is null
    or session_claim !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Pilot management unavailable' using errcode='42501';
  end if;
  v_session_id := session_claim::uuid;

  -- Callers already hold the policy, account, manager and admission locks from
  -- pilot_lock_management. Recheck after those waits before touching Auth rows.
  if not exists(select 1 from public.accounts where id=actor and status='active')
    or not exists(select 1 from private.pilot_admission_managers
      where account_id=actor and state='active') then
    raise exception 'Pilot management unavailable' using errcode='42501';
  end if;

  -- Auth removes a factor before changing its sessions. Match that lock order.
  -- The initial session read selects a lock target only, never authority.
  select s.factor_id into v_factor_id from auth.sessions s
    where s.id=v_session_id and s.user_id=actor;
  if v_factor_id is null then
    raise exception 'Pilot management unavailable' using errcode='42501';
  end if;
  perform 1 from auth.mfa_factors f where f.id=v_factor_id for share;
  if not found then
    raise exception 'Pilot management unavailable' using errcode='42501';
  end if;
  perform 1 from auth.sessions s where s.id=v_session_id for share;
  if not found then
    raise exception 'Pilot management unavailable' using errcode='42501';
  end if;
  if not exists(select 1 from auth.sessions s
      join auth.mfa_factors f on f.id=s.factor_id
      where s.id=v_session_id and s.user_id=actor and s.factor_id=v_factor_id
        and s.aal::text='aal2'
        and (s.not_after is null or s.not_after > clock_timestamp())
        and f.user_id=actor and f.factor_type::text='totp'
        and f.status::text='verified') then
    raise exception 'Pilot management unavailable' using errcode='42501';
  end if;
  return actor;
end; $$;

revoke all on function private.pilot_require_manager() from public, anon, authenticated, service_role;

commit;
