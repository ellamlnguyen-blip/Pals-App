# TASK-013A — Local Hangout chat backend handoff

Status: Implementation complete on task branch; independent security review and main integration remain with coordinator.
Date: 2026-09-23
Branch: `agent/TASK-013A-hangout-chat-backend`
Dispatch baseline: independently remote-verified `origin/main` `cb81a094d86d2e67d5d80043942c855cd8141780`
Verified implementation branch push: `576b106c3e57fda43df6cf5e59cfab3630922aae` (`git ls-remote origin refs/heads/agent/TASK-013A-hangout-chat-backend`)
Verified canonical main at handoff drafting: `b88897f64ced6be5a1d9273d3d47f92d281cc543` (`git ls-remote origin refs/heads/main`); coordinator advanced main after dispatch. No main merge was made here.

## Outcome

- Added one additive local migration: private default-disabled chat gate, one conversation per saved Hangout on first send, immutable text messages with server IDs/time and monotonic per-Hangout sequence, and private caller/Hangout/key retry ledger. Every new table has RLS and explicit client revokes. There is no raw client table read/write, Realtime publication, platform-role bypass or hosted enablement.
- Added fixed-empty-search-path, caller-bound `send_hangout_message` and `read_hangout_messages`. Both require READ COMMITTED, both local gates, live ready same-campus joined membership and a published campus Hangout. Send takes the existing Hangout parent-row serialization lock, then transaction-held `FOR SHARE` locks on both gates and caller account, Auth user, membership, campus, profile, referenced photo and participant in documented order. It rechecks in a fresh statement after waits. Exact authorized retries return the original row; changed text under the same key conflicts; revoked retries deny.
- Reads enforce authorization in the same SQL statement as keyset projection, including the empty-thread case. Page limit is 1–50, ascending by sequence. Author IDs are present only for currently ready joined authors; otherwise the row has a neutral `Former participant` label and no author ID. A late joiner or permitted rejoiner can page retained history. Leave/removal/cancellation/readiness loss deny future reads. An already authorized in-flight page can still complete after revocation, as Accepted ADR-0015 states.
- Updated only backend/API/security/data/testing messaging documentation. People blocks and friendship remain independent of this accepted disposable-local chat policy.

## Verification

- `pnpm check`: passed on the final tree (format, ESLint, types, 20 unit tests, web/admin builds).
- Two clean `pnpm db:reset` runs applied the new migration. After each, every pgTAP SQL file was run directly through `docker exec -i ... psql -v ON_ERROR_STOP=1` using the exact repository test files. Existing suite plans on each run: Hangout 114, identity 53, friendship 38, onboarding 22, People 82, profile 37. Chat had 69 passing assertions on the two-reset run; the final three author-leave/People-block assertions were rerun after the second reset for 72/72. No `not ok` lines or SQL errors.
- `pnpm db:lint --schema public,private --level warning --fail-on warning`: passed with no schema errors after the final reset.
- Real local Auth/PostgREST suite `hangout-chat-http.integration.mjs`: passed with synthetic users. Covered anonymous/private REST denial, caller-bound send/read, empty thread, joining, leave, idempotency and disabled gate.
- Deterministic overlapping-session suite `hangout-chat-concurrency.integration.mjs`: passed after final changes. It observed Postgres lock waits for gate, account, Auth email, campus, profile detachment, photo replacement/deletion, leave and duplicate-key races; verified revocation-first denial and send-first commit ordering, an in-flight versus later read, and stronger-isolation denial.
- Final disposable-local query returned Hangout gate `false`, chat gate `false`, zero messages and zero chat HTTP/race fixture users. Supabase services and the preserved Lima VM were stopped. No hosted service or data was touched.

## Harness limitation and review focus

`pnpm db:verify` itself could not complete: Supabase's pgTAP wrapper asked the Lima Docker daemon to bind-mount `/private/tmp/pals-task-013a-backend/supabase/tests`, and the VM denied creating that host path. The same migration/reset, exact pgTAP SQL files, lint, real HTTP and concurrency checks were run directly against the validated loopback local stack. Do not label this as a green `pnpm db:verify` or hosted CI run.

Independent security review should inspect the empty-thread authorization guard, fresh post-lock send check, photo/storage lock order and the accepted in-flight read limitation. The coordinator owns review, status records, main integration, remote verification and TASK-013B dispatch. No UI, notification, Realtime, moderation, global block policy or hosted work was done in A. Tooling had no Standard-speed selector; the app's Standard preference was used, but speed was not verified.
