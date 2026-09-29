# TASK-025 UNC pilot critical path handoff

Date: 2026-09-29
Status: Implemented release path; hosted pilot remains blocked on external configuration

## Outcome

Added a secret-free `apps/web/app/api/health/route.ts` release probe. It reports only environment name and boolean presence checks for Supabase, app origin, HTTPS origin, and Mapbox; it never returns provider URLs or credentials and is marked `no-store`.

Added `docs/operations/UNC_PILOT_CRITICAL_PATH.md` and the bounded task contract `tasks/active/TASK-025-unc-pilot-critical-path.md`. The records explicitly pause exhaustive TASK-021 static modeling and defer TASK-024 brand polish until the core pilot is usable. They preserve verified access, privacy/RLS, Hangout creation/joining, chat, blocking/reporting, and human moderation as the pilot boundary.

## Verification

- `pnpm install --frozen-lockfile` passed in a clean clone.
- `pnpm --filter @pals/web typecheck` passed.
- `pnpm --filter @pals/web build` passed and includes `/api/health`.
- Prettier check passed for all changed files.
- `git diff --check` passed.

The production build enumerated `/api/health` as a dynamic route. A live curl probe was attempted with intentionally placeholder provider credentials and was correctly rejected by the existing hosted-environment credential validation; no real credential was created or stored.

## Remaining blockers

The hosted pilot still needs an HTTPS frontend deployment, exact Supabase staging site/callback configuration and reviewed migration verification, custom SMTP with a controlled UNC mailbox, named moderator coverage/retention handling, and approved pilot participants/genuine Hangouts. No hosted gates were enabled and no students were invited by this task.

## Scope safety

No database migration, RLS policy, server action, student API payload, authorization rule, or hosted setting was changed. The health route is additive and does not weaken any existing access control.

## Readiness correction (2026-09-29, `agent/TASK-025-health-readiness`)

The original probe could return HTTP 200 and `status: "ok"` while checks were false. The corrected probe returns HTTP 503 and `status: "not_ready"` unless the app explicitly selects staging or production, the Supabase URL exactly matches the explicit project reference under the shared target validator, the configured public Supabase key passes the app's auth validation, `APP_ORIGIN` is a valid HTTPS origin, and a public Mapbox token is present. The proxy matcher exempts only `/api/health` so invalid configuration reaches this public probe instead of throwing before it; all other paths retain the existing proxy. The response contains only boolean checks and status; the no-store header remains. The release runbook now treats green as configuration readiness only. Hosted callbacks, SMTP, connectivity, end-to-end smoke, and launch approval remain separate gates.

Focused verification: the web typecheck, production build, targeted Prettier check, and shared Supabase target tests passed. Live requests against the built local server returned HTTP 503 with no hosted settings, HTTP 503 with a mismatched project target, and HTTP 200 with syntactically valid placeholder staging values. Responses contained only status and boolean checks, plus `Cache-Control: no-store, max-age=0`. These placeholder checks did not establish provider connectivity or hosted readiness.

## Remote receipts

- Task branch: `agent/TASK-025-unc-pilot-critical-path` at `ed9e82d7488aaed87c66acfa44f394f57fc7f84f`.
- Integrated `main`: `ed9e82d7488aaed87c66acfa44f394f57fc7f84f`.
