# Hosted integration environment
Updated: 2026-09-22

## Repository and backend
GitHub: https://github.com/ellamlnguyen-blip/Pals-App

Supabase project reference: `plqhsyhdfgqygauntsts` (us-east-2, Postgres 17).
This is the user-authorized hosted integration backend for the current build. It has not been launched as a public production service. Local development and synthetic verification still use the isolated local Supabase stack; production is never a default environment.

The foundation branch is `agent/TASK-002-supabase`; GitHub currently uses it as the default branch. TASK-003 is developed on `agent/TASK-003-auth`. Branch changes are pushed, not automatically merged. Foundation GitHub Actions run `35687124484` passed.

## Verified foundation
The coordinator confirmed hosted migration `20260921000100`, public/private schema lint, and RLS/client grants on all five foundation tables. Before TASK-003, the hosted project had no Auth users, university rows, or profile-photo bucket. The local seed and test fixtures were not pushed.

## Hosted Auth configuration
### Deployed onboarding schema
Migration `20260922000100_verified_onboarding.sql` was committed at `827159d`, previewed with `db push --linked --dry-run`, and applied to this project. No seeds or synthetic users were pushed. Both local migration versions match hosted history; hosted public/private schema lint passes.

Post-deployment read-only checks confirmed all five approved exact UNC domains, a private `profile-photos` bucket with a 5 MB limit and JPEG/PNG/WebP MIME allowlist, all three owner photo policies, and authenticated-only execution of `get_access_state()` (anonymous execution denied). Hosted Auth still has zero users. Actual confirmation, callbacks, Storage ownership and suspension behavior passed against local services; these catalog checks do not substitute for hosted end-to-end verification.

### Managed Auth settings
`supabase/hosted-auth.toml` records only explicitly managed hosted Auth properties. Do not push the local `supabase/config.toml` to a hosted project: it contains local-only service toggles.

The coordinator previewed and applied exactly two changes: password minimum 12, and exact callback allowlist entries `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`. Email confirmation and double-confirmation of email changes were already enabled and remain enabled. The CLI reported 11 undeclared remote settings preserved. The existing hosted site URL remains `http://localhost:3000`.

These loopback entries support development, not a deployed staging frontend. The web app requires HTTPS origin/cookies in hosted environment mode. A future frontend deployment must add its exact HTTPS callback and configure its site origin before staging browser verification or public launch. No DNS or frontend deployment was performed here.

For future hosted configuration changes, copy the reviewed minimal file into `supabase/config.toml` in an isolated temporary workdir, run `supabase config diff --project-ref plqhsyhdfgqygauntsts --workdir <directory>`, review declared updates, then use `config push` with the same explicit target. The native pinned CLI on this host is `/Users/ellanguyen/.local/bin/supabase`. Run hosted CLI commands sequentially to avoid racing temporary login roles.

## Email delivery and credentials
No custom email-provider credentials were supplied or configured by this task. General student confirmation-email delivery is unverified. Supabase's default sender restricts delivery to project-team addresses; configure a custom SMTP provider before inviting students. See https://supabase.com/docs/guides/auth/auth-smtp . Do not disable confirmation to bypass delivery setup.

CLI personal access tokens stay in native credential storage. Application environments use the project's publishable key, never the CLI token or service-role key. No hosted secrets belong in Git. The user-authorized exact UNC domains and verification semantics are in Accepted ADR-0009.
