# Testing Strategy
Automate critical behavior; do not optimize for arbitrary coverage percentages.

Required areas: authentication, visibility/RLS, exact-location privacy, block separation, host/co-host/admin permissions, hangout create/join/leave/open/close/edit/cancel, eligibility, friendship transitions, message requests, reports, suspension.

Core E2E: signup→verify→onboard; map→pin→join; create→another joins; group chat; people→DM request→reply; friend request→accept; block; report; host removal; attendance confirmation.

## Foundation checks

`pnpm db:verify` runs two local clean resets with pgTAP after each and lints both `public` and `private` schemas, failing on warnings. SQL tests use real database roles and synthetic JWT subjects in a rolled-back transaction. This is distinct from Auth API/session integration and hosted staging verification. CI declares a separate local database job; a local pass is not proof of a hosted CI run. See `supabase/tests/README.md` for the fixture matrix.

TASK-003 adds `pnpm test:auth:web` after SQL verification in database CI. It starts a local Next server with only local public configuration, then uses real Auth API, Mailpit confirmation links, the actual web PKCE callback/cookies, Storage API ownership and RLS, profile completion, escalation denial, page/photo gates and suspension. For an already-running web app, use `WEB_TEST_ORIGIN=http://127.0.0.1:3000 pnpm test:auth`. Plain `pnpm test:auth` omits web checks. The suite rejects non-local targets and uses disposable synthetic accounts. Hosted SMTP and HTTPS callback checks require separate deployment evidence.

TASK-006 adds database optional-shape/photo-membership tests, direct HTTP round trips/access revocation, actual Next server-action requests and deterministic concurrent SQL sessions. The concurrency suite waits for observed Postgres lock contention before releasing its first transaction and covers both assignment/deletion orders at READ COMMITTED and REPEATABLE READ, plus stale editor compare-and-swap. HTTP action tests include primary/extra management, malformed inputs, anonymous calls, stale revisions and safe cleanup. `scripts/profile-fault-injection.mjs` is loaded only by the local test helper to inject provider upload/assignment/cleanup failures and discard a real committed assignment response; it is never imported by app code or production builds. Fault control uses a private temporary file removed after the run. No hosted target is accepted.

## TASK-012A friendship verification

`local_friendship.test.sql` tests actual-role privacy and state transitions. `friendship-http.integration.mjs` uses real local Auth/PostgREST caller sessions; `friendship-concurrency.integration.mjs` waits for observed pair-lock contention to verify block teardown, post-wait gate revocation, and committed opt-out, gate-disable and photo-readiness writes racing after a create eligibility check. Run the two Node suites with `--test-concurrency=1` against a validated disposable loopback Supabase stack; both manipulate private local feature gates and clean fixtures. The normal `pnpm db:verify` pgTAP run includes the SQL file.

## TASK-013A local Hangout chat verification

`local_hangout_chat.test.sql` covers actual-role table/RPC denial, joined history, retries, author projection, pagination, readiness changes, both gates and cancellation. `hangout-chat-http.integration.mjs` uses real local Auth/PostgREST sessions. `hangout-chat-concurrency.integration.mjs` waits for observed Postgres lock contention before testing gate, profile, membership and duplicate-send races. Run the Node suites serially against the validated disposable loopback Supabase stack; each disables local gates and removes its fixtures. The pgTAP file is included in normal `pnpm db:verify`.
