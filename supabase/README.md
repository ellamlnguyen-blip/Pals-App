# Supabase foundation

All schema changes use committed migrations. TASK-002 implements only universities, accounts, one current university membership per account, profile drafts, and platform role assignments. See `../LOCAL_SETUP.md` for local commands.

## Security contract

- `auth.users` owns email confirmation. An Auth insert provisions an active account and empty profile, ignoring user metadata.
- Only a trusted database operator may assign university membership, verification evidence, account status, or platform roles. No client mutation API for these exists yet. No bulk client moderation bypass exists; a later audited workflow is required.
- Membership verification records the email against which evidence was checked. `private.has_verified_membership()` requires that email still matches current confirmed Auth email, an active account, explicit membership verification, and an active university. This helper is not a production enrollment policy.
- Clients can read their own account status; active accounts can read/edit their own profile draft and read their own membership/role. Both unconfirmed and unverified authenticated accounts can complete drafts. Only editable profile columns have UPDATE grants.
- Profiles are owner-only at this foundation stage. Peer discovery requires its own privacy/block policy before access expands. A platform role never implies unrestricted direct access.
- University reference metadata is readable by active authenticated accounts; this is not cross-campus people discovery. No campus geospatial data is needed in TASK-002.
- All five tables enable RLS, all client grants are explicit, and definer helpers use an empty search path. Do not expose `private` in API schemas or grant client CREATE/privileged DML.
- The local API disables automatic exposure grants. The migration also revokes client defaults on its own tables so hosted defaults cannot defeat it. Service-role integration is deferred; no server client/key is wired. New migrations must explicitly review grants and RLS.

`ADR-0009` remains Proposed. No email domain, badge meaning, enrollment evidence mechanism, or automatic membership assignment has been accepted. The UNC local seed deliberately leaves its allowlist empty. Structural `profiles.is_complete` is not proof of identity, campus membership, photo ownership, or verified enrollment. Rich optional fields, storage, and onboarding UI belong to later tasks.

## Staging procedure — documented, NOT executed

A configured, authorized, separate staging Supabase project is required before these steps. Its Postgres major version must match local 17. Review the project name and reference against the team's environment inventory; never infer staging from a URL or substitute production. Use a disposable checkout dedicated to staging operations, not the local development checkout. This task has no authorized hosted target.

1. Run local `pnpm db:verify` and review migrations and open ADRs.
2. With environment-scoped credentials, link **only the verified staging reference** using `pnpm exec supabase link --project-ref "$PALS_STAGING_PROJECT_REF"`.
3. Inspect `pnpm exec supabase migration list --linked`, then `pnpm exec supabase db push --linked --dry-run`.
4. Review that plan; when the staging application is authorized, run `pnpm exec supabase db push --linked`.
5. Record the applied versions, run staging-specific smoke/permission checks with authorized synthetic accounts, and document the result. Never label the local pgTAP run as staging evidence.

Do not use `db reset --linked`, `--include-seed`, or the local pgTAP fixture suite on hosted projects. Local tests intentionally assume an empty account set and privileged transactional fixture setup. Provisioning the hosted UNC reference record is separate reviewed environment data work; the local seed is not a production migration. No hosted Auth configuration or DNS/deployment was performed by TASK-002.
