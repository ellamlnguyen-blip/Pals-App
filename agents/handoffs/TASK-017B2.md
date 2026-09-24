# Handoff — TASK-017B2 disposable-local Hangout disable backend

Date: 2026-09-24
Agent: GPT-6 Sol medium task agent; the dispatch tool did not expose Standard-speed verification
Branch/worktree: `agent/TASK-017B2-approved-disable` at `/private/tmp/pals-task-017b2-approved`
Task branch and pushed commit SHA: previous verified tip `346e8d4816e18c687d5787b4fca7c970677ba2a1`; revised exact tip independently verified and sent to coordinator after this handoff commit
Integrated `main` commit SHA: pending fresh exact-tip review and coordinator integration
Main status-record path and last published milestone: coordinator-owned `tasks/NOW.md`, `tasks/BACKLOG.md`, `docs/operations/CURRENT_STATE.md`, `CHANGELOG.md`; independently remote-verified B2 baseline `08e42c4c42ef63a96c073ec3d72840230a07c511`
Outstanding review/integration blockers: fresh exact-tip security review, coordinator status update and canonical-main integration

## Outcome

Implemented the explicitly approved disposable-local Hangout disable under Accepted ADR-0019. One authenticated caller-bound RPC acts on the exact stored Hangout target of an `in_review` report and requires a live active moderator/admin, current moderation gate, no reporter/host conflict, expected case revision, operator-scoped request UUID and trimmed 1–2000-code-point reason. A new action atomically writes one private immutable disable, linked `action_taken` case closure, minimal retry result and private audit. An exact replay checks current authority and returns only saved state/revision/disabled state. Changed or cross-RPC request UUID reuse denies neutrally. No re-enable, admin UI, hosted migration or default-on gate was added.

## Files Changed

- `supabase/migrations/20260924000300_local_hangout_disable.sql`: private disable/action binding, audited caller RPC, detail projection and source authorization.
- `supabase/tests/database/local_hangout_disable.test.sql`: actual-role and source matrix, 75 assertions.
- `supabase/tests/hangout-disable-http.integration.mjs`: real local Auth/PostgREST bypass and source checks.
- `supabase/tests/hangout-disable-concurrency.integration.mjs`: observed commit-order waits and revocation checks.
- `supabase/tests/moderation-http.integration.mjs`: existing detail allowlist updated for nullable `target_disabled`.
- `supabase/README.md`, `supabase/tests/README.md`: local API, lock order and test boundary.

## Behavior / Architecture Impact

The private `hangout_disables` row is unique by exact Hangout, references the stored `(report_id,'hangout',target_id)` and retains authoritative current campus, actor, request, server time, reason and previous/new disabled state. Restrictive references protect report, Hangout, campus and operator. Its update/delete trigger is append-only, RLS is enabled and client/service-role table grants remain absent. The case constraint requires exactly one linked account sanction or Hangout disable for `action_taken`; reopening clears only the current link. Audit contains the exact link, actor, subject/campus, case state/revision and disabled-state transition, with no allegation, profile, message or place.

Lock order: shared TASK-016 social/Hangout advisory lock; Stage A moderation advisory lock, gate, actor account and role; stored report; one target Hangout parent `FOR UPDATE`; operator request UUID; case; writes. The RPC rechecks gate, active actor, role and reporter/host conflict after the parent wait, and READ COMMITTED is required. Source mutations already take the shared lock and parent, so admitted source-first writes commit before disable; disable-first writers wait and then deny.

Student authorization inventory: `private.can_read_hangout` masks direct public Hangout, roster and private-location RLS reads, which also removes map and Calendar source rows; `private.chat_authorized` masks old chat reads/sends; `private.lock_hangout` denies old edit, joining-state, cancellation, join, leave, removal and chat-send RPC paths after the parent wait. Existing notification projection uses those source checks, so retained Hangout and chat rows show `Unavailable` with no destination. The safety-only own retained ID/state and evidence-qualified report routes remain available under their existing gate without exposing details. Internal global-block reconciliation still transitions retained participants and does not emit an ordinary disable notice.

## Tests / Verification

- At least two clean disposable local resets applied every migration, including B2, successfully. The final reset plus rollback-only fixture check showed zero Auth users, reports, cases, account sanctions, Hangout disables, audit rows and moderation retries, with all eight feature gates false. Task-owned Supabase services and Lima VM were stopped.
- All 15 actual-role SQL fixtures passed on the final migration/test revision: **808 assertions, zero failures**. The B2 fixture covers gate/role/reporter/host denial, exact/changed/cross-RPC retry, stale revision, published and cancelled targets, missing target nullable detail, immutable/restrictive evidence, exact linked action, reopen history, direct host/attendee RLS/RPC masking on published and cancelled Hangouts, chat, notifications, retained safety reporting after a cancelled disable, and internal global-block reconciliation on a disabled Hangout while ordinary join/leave continue to deny.
- B2 real Auth/PostgREST passed: anonymous, student and forged `admin` metadata denial; moderator action/replay; direct table/detail/roster/private-instruction and old RPC after-commit denial; host/attendee own-state safety recovery; private table absence; role-revoked replay denial; cancelled Hangout REST/embedded masking and retained report; published map and Calendar source queries before/after disable. A local production server also verified saved-detail, owned-detail and Calendar pages showed the fixture before disable and masked it afterward. The owned-detail Next.js streamed not-found response can retain HTTP 200, so the test asserts the absent title/private details and not-found body. Existing Stage A/B1 moderation HTTP regression passed with the revised detail field.
- Source HTTP regressions passed serially (6/6): account enforcement, global block, Hangout chat, B2, Hangout notifications and safety reporting. On a clean reset, source concurrency regressions passed serially (7/7): global block, chat, Hangout writes, B2, Hangout notifications and report intake. B2 observed actual PostgreSQL lock waits in both disable-first and source-first orders for edit, join, chat send and cancel, plus gate/role/account revocation and two-operator case contention. No deadlock or partial disable was observed.
- Local schema lint reported no warnings. With offline dependencies installed inside the isolated checkout, the full `pnpm check` passed: repository Prettier, ESLint, all workspace TypeScript checks, 37 Node tests, and both web/admin production builds. The local production web server served the route checks successfully. An earlier dev server with borrowed external `node_modules` returned a general Next.js `workUnitAsyncStorage` invariant even on `/signin`; that borrowed setup was replaced for the successful production verification. No frontend code changed.

## Decisions

The existing source guards were extended instead of adding a student-visible disabled flag or re-enable path. The safety own-ID/state exception remains explicit. No new ADR was needed; the implementation follows Accepted ADR-0019 and the reviewed B2 contract.

## Known Limitations

This is disposable-local evidence only. The saved map discovery list is client-fed by the same `hangouts` RLS source that the REST map query verifies; the test did not automate a browser map pin. Hosted retention/deletion/legal hold, operator onboarding/MFA, appeals, staffed response, hosted deployment and admin UI remain outside B2. A read already in flight before disable commit may finish under its earlier snapshot; every later direct read is masked. Exact-tip independent security review and main integration are pending.

## Follow-up Tasks

The coordinator owns exact-tip review, shared status records and remote-verified main integration. TASK-017C must wait for accepted B2 integration.

## Documentation Updated

`supabase/README.md` and `supabase/tests/README.md` document the new backend and local verification.

## Ready for Next Task?

No — TASK-017C must not depend on the backend until independent security review and canonical-main integration. Remote verification for the task ref will be reported to the coordinator after push; the integrated main ref is coordinator-owned.
