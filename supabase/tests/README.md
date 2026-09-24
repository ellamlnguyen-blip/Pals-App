# Database tests

TASK-017B1's `local_account_enforcement.test.sql` exercises the caller-bound
action, role matrix, exact retry/cross-RPC UUID boundary, linked sanction and
case audit, restrictive deletion, reopen history and restricted notification
marker under actual SQL roles. `moderation-http.integration.mjs` covers real
local Auth/PostgREST/Storage, including post-sanction owner denials and the
preissued signed-photo URL through local expiry. The separate
`account-enforcement-concurrency.integration.mjs` observes real lock waits in
both commit orders for direct profile, Storage photo delete, notification
preference and friendship cleanup, plus operator gate/role and target-role
revocation. Run these suites serially against `http://127.0.0.1:54321`.
Moderation audit and sanction records are append-only; reset the disposable
database after HTTP/concurrency tests to remove fixtures and restore all
feature gates to false.

`pnpm db:test` runs real pgTAP tests against local Supabase Postgres via `supabase test db --local`. Run after `pnpm db:reset`; the suite expects the clean reference seed and no existing accounts. All synthetic users and auxiliary campuses are inside a transaction rolled back at the end.

Tests switch to `anon` and `authenticated` roles with simulated JWT subjects. This exercises actual SQL grants, policies, constraints and database identity helpers, not mocked application authorization. Fixtures cover verified, email-unconfirmed, campus-unverified, missing membership, inactive campus, suspended, banned, admin, moderator, cross-user/campus, forged metadata, email changes, column/role escalation and null subject behavior. A service-role/superuser query is never mistaken for an RLS client check.

`pnpm db:verify` performs two clean resets with 75 checks after each, then schema linting. Hosted CI has its own database job. New onboarding checks cover exact domains, confirmation-derived membership, private photo ownership, no overwrite, live policy changes and access gates.

`pnpm test:auth` separately runs real HTTP Auth and Storage integration against the disposable local stack. It reads the local public key from CLI status, captures confirmation in Mailpit, exchanges PKCE, uploads an actual PNG and verifies server-assigned ownership, cross-user read/overwrite/delete denial, referenced-primary deletion denial, escalation prevention and stale-session suspension. It cleans its synthetic accounts and refuses hosted targets. Use `SUPABASE_CLI=/path/to/supabase` only when an explicit local CLI fallback is needed.

With Next.js running at the configured local origin, `WEB_TEST_ORIGIN=http://127.0.0.1:3000 pnpm test:auth` additionally exercises `/auth/callback`, HttpOnly session cookies, anonymous/incomplete/complete/restricted page gates, invalid callback handling and authenticated photo serving. Database CI uses `pnpm test:auth:web`, which starts/stops Next.js with only local public configuration and enables all web checks. Do not run that helper while another server owns port 3000. SMTP and deployed HTTPS staging callbacks are separate checks, never inferred from Mailpit success.

TASK-006: `profile_enrichment.test.sql` adds 37 actual-role assertions (112 total with foundation/onboarding) for optional bounds/shape/Unicode whitespace, owner-only fields, four extras, missing/foreign/duplicate membership, clearing and immutable revision. `profile-http-checks.mjs` and `profile-action-checks.mjs` extend the existing real Auth fixture suite. `profile-concurrency.integration.mjs` exercises overlapping SQL sessions against the named local container with real authenticated roles; its only privileged operations set up/clean disposable fixtures and observe locks. For SQL-only deletion tests it sets Storage's documented internal `storage.allow_delete_query` guard locally so the same owner policy and custom row trigger execute; actual Storage API deletions are separately covered by HTTP.

TASK-005: `hangout_foundation.test.sql` enables the disabled-by-default feature gate only inside a rolled-back local fixture. It checks actual-role permissions, ready/campus revocation, current-ready roster filtering, private detail separation, bounds, retry/revision behavior, forced transaction rollback and disabled-gate denial. `hangout-http-checks.mjs` extends the real Auth/Storage fixture with PostgREST table/RPC/embed checks and disables/cleans its gate and Hangouts in `finally`. `hangout-concurrency.integration.mjs` uses overlapping local Postgres sessions for duplicate request identity, stale CAS, post-lock readiness/gate revocation, join/remove/cancel races and stronger-isolation denial. `test:auth:web` runs the HTTP and both concurrency suites serially; CI invokes it after the database checks. These tests target only the validated loopback local stack.

TASK-011A: `people_text_directory.test.sql` creates rolled-back local fixtures, enables the separate People gate inside that transaction and checks default-private preferences, actual-role grants, text projections, search/cursor bounds, owner-only raw profiles, opt-out under readiness/gate loss and directional block visibility. The cursor regression includes 28 authorized rows across two pages, a valid 105-character raw boundary name with U+00A0, shared-name UUID ordering and unavailable hidden or filter-mismatched cursor IDs. Direct authenticated PostgREST tests ID-only pagination with a long raw name. HTTP and overlapping-session tests use the same loopback-only target validation and must restore the People gate to false after use. No hosted database is a test target.

TASK-016B: `local_safety_reports.test.sql` rolls back actual-role report fixtures; `safety-report-http.integration.mjs` exercises signed local Auth and REST callers; `safety-report-concurrency.integration.mjs` observes PostgreSQL lock waits. They require the local-only stack, run serially, and clean report/retry/source fixtures and all changed gates. In the Lima setup, `supabase test db` cannot mount a `/private/tmp` checkout; streaming each SQL fixture to the local Postgres container with `psql -v ON_ERROR_STOP=1` runs the same SQL and requires checking both process status and pgTAP `not ok` output.
