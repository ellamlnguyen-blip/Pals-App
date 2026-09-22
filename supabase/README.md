# Supabase identity and onboarding

All schema changes use committed migrations. TASK-002 implements universities, accounts, one current university membership per account, profile drafts, and platform role assignments. TASK-003 adds confirmation-derived membership, private photos and access gates. See `../LOCAL_SETUP.md` for local commands.

## Security contract

- `auth.users` owns email confirmation. An Auth insert provisions an active account and empty profile, ignoring user metadata.
- The trusted Auth trigger assigns membership/verification from the current confirmed email and approved exact domain allowlist. Only trusted operators may change account status, campus policy or platform roles. No client mutation API for these exists. No bulk client moderation bypass exists; a later audited workflow is required.
- Membership verification records the confirmed email. `private.has_verified_membership()` requires it still match the current confirmed Auth email, current domain allowlist, active account and active university. This implements Accepted ADR-0009 email ownership, not independent enrollment verification.
- Clients can read their own account status; active accounts can read/edit their own profile draft and read their own membership/role. Only editable profile columns have UPDATE grants. Photos additionally require verified membership and actual owned Storage objects; unverified draft edits never grant access.
- Profiles are owner-only at this foundation stage. Peer discovery requires its own privacy/block policy before access expands. A platform role never implies unrestricted direct access.
- University reference metadata is readable by active authenticated accounts; this is not cross-campus people discovery. No campus geospatial data is needed in TASK-002.
- All five tables enable RLS, all client grants are explicit, and definer helpers use an empty search path. Do not expose `private` in API schemas or grant client CREATE/privileged DML.
- The local API disables automatic exposure grants. The migrations revoke client defaults on their own tables/functions so hosted defaults cannot defeat them. Server clients use public keys and user sessions; no privileged key is wired. New migrations must explicitly review grants and RLS.

Accepted `ADR-0009` defines the exact UNC domains and badge meaning. The TASK-003 migration installs this policy and reference campus. `profiles.is_complete` remains structural; `get_access_state()` additionally requires live verification/status and an existing owned photo. Private photo readers are active verified owners only. See `docs/engineering/AUTH.md` and `AUTHORIZATION.md`. Rich optional fields and peer access remain future tasks.

## Hosted procedure

A configured, authorized non-production Supabase project is required before these steps. Its Postgres major version must match local 17. Review the project name and reference against the environment inventory; never infer staging from a URL or substitute production. Use a disposable checkout dedicated to hosted operations. Current target and actual verification evidence are recorded in `docs/operations/HOSTED_ENVIRONMENT.md`.

1. Run local `pnpm db:verify` and review migrations and open ADRs.
2. With environment-scoped credentials, link **only the verified staging reference** using `pnpm exec supabase link --project-ref "$PALS_STAGING_PROJECT_REF"`.
3. Inspect `pnpm exec supabase migration list --linked`, then `pnpm exec supabase db push --linked --dry-run`.
4. Review that plan; when the staging application is authorized, run `pnpm exec supabase db push --linked`.
5. Record the applied versions, run staging-specific smoke/permission checks with authorized synthetic accounts, and document the result. Never label the local pgTAP run as staging evidence.

Do not use `db reset --linked`, `--include-seed`, or the local pgTAP fixture suite on hosted projects. Local tests intentionally assume an empty account set and privileged transactional fixture setup. TASK-003's migration provisions the accepted UNC reference/allowlist; local seed is never sent to hosted projects. Minimal hosted Auth settings are separate from local configuration. Do not push local rate limits or local-only service settings to a hosted project.
