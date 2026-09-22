# Handoff — TASK-005 Hangout backend foundation

Date: 2026-09-22
Agent: GPT-6 Sol implementation agent
Branch/worktree: `agent/TASK-005-hangout-foundation`, `/Users/ellanguyen/.codex/worktrees/5153/Pals App`
Task implementation commit: `57f4164679409b86d37e990fe45927de3d503726`, pushed and verified at `origin/agent/TASK-005-hangout-foundation` before this handoff receipt
Starting authoritative main: `90500306ff634999939a112e52e71a80bd2dcfdd`
Integrated main SHA: pending coordinator review/integration
Main status-record path: `tasks/NOW.md`, `docs/operations/CURRENT_STATE.md`, `CHANGELOG.md` (coordinator owned)
Outstanding blocker: main integration and remote verification, not backend verification

## Outcome

Implemented the latest Accepted ADR-0010 and expanded TASK-005 contract as a **local-only** backend foundation. The default-disabled database feature gate, campus/ready RLS, current-ready participant roster, private instructions table, host/member transition RPCs, exact field/time constraints, atomic public/private writes, owner-scoped retry UUID and monotonic revision checks are in the committed task branch. No application Hangout flow, hosted migration or block/moderation policy was added. The later TASK-007 UI will consume this backend after coordinator integration.

## Files changed

- `supabase/migrations/20260922000300_hangout_foundation.sql`: tables, grants, RLS, caller-bound RPCs, constraints, gate and retry ledger.
- `supabase/tests/database/hangout_foundation.test.sql`: actual-role permissions, revocation, bounds, gate, atomic rollback, retry and CAS checks.
- `supabase/tests/hangout-http-checks.mjs`, `auth-storage.integration.mjs`: real local Auth/PostgREST/Storage paths, private embeds and direct DML denial.
- `supabase/tests/hangout-concurrency.integration.mjs`, `scripts/test-auth-web.mjs`: overlapping SQL race/isolation suite, serialized with the existing profile suite in CI.
- `docs/engineering/AUTHORIZATION.md`, `DATA_MODEL.md`, `supabase/README.md`, `supabase/tests/README.md`, `tasks/active/TASK-005-hangout-foundation.md`: implementation contract and local gate procedure.

## Authorization and behavior

The gate starts false in every reset and has no client grants. Read committed is required for all Hangout client operations; stronger isolation levels fail closed. Live ready same-campus callers may read published public rows, and the public roster exposes only currently joined **and currently ready** account IDs. The host can inspect member state; members can inspect their own existing state while the Hangout remains visible. Cancelled public rows remain host/still-joined only; private rows are unreadable by every client role after cancellation. Joining closed preserves current private access; leaving/removal/readiness loss revokes it. Clients cannot directly insert/update/delete any of the three tables or use a co-host/operator bypass. No peer profile/photo access was expanded.

Creation writes public, private and host membership atomically. A private ledger binds a request UUID to its owner and a SHA-256 digest of normalized input, with timestamps encoded as epoch instants. Retries first recheck current authorization and then return only the original ID if the payload matches, including after the start passes. Details and lifecycle writes require expected revision; stale writes return SQLSTATE `40001`. Join/remove/cancel lock the parent row. Public coordinates remain deliberately host-supplied approximate areas; validation cannot prove the host's text/pin contains no sensitive address.

## Verification

- `pnpm db:verify`: passed two fresh resets and all **226** pgTAP checks on each run; schema lint reported no issues.
- `pnpm test:auth:web`: passed real local Auth/Storage/Hangout HTTP checks plus serialized TASK-005 and TASK-006 concurrency suites (3/3).
- `pnpm check`: passed format, ESLint, TypeScript, 13 unit tests and web/admin production builds (coordinator-run in the shared worktree; `/private/tmp/task005-check.log`).
- `git diff --check` and staged diff check: passed.
- Fresh GPT-6 Sol security review: **clear**, no remaining actionable findings; reviewer explicitly checked cancelled-state probing and campus-transfer retry regressions. Coordinator maintains its separate review artifact.

The race suite holds real overlapping local transactions and checks duplicate creation, stale revision, join/remove, cancel/join, post-lock readiness/gate revocation, and repeatable-read/serializable denial. SQL tests force private writes to fail after public writes and verify transaction rollback. HTTP checks use actual local Auth sessions and confirm direct DML/anonymous denial, private embed filtering and live email revocation. No hosted or production permission claim is made.

## Decisions and limitations

Accepted ADR-0010 is the authority; its latest TASK-007 revision supersedes the earlier wider bounds and all-joined roster. TASK-003 deployed callback/real UNC email delivery remains open separately. Blocking/reporting/moderation and their precedence over private access are explicit prerequisites before hosted integration. No automatic Hangout expiry or production retention policy is inferred. Host-created public labels/coordinates remain user supplied, so the later UI must explain approximate public area and separate exact instructions. Optional private instructions omitted on edit are cleared, which the TASK-007 caller must handle deliberately.

## Ready for next task?

Ready for coordinator review and integration of this backend branch into main; **TASK-005 is not complete until main is pushed and its remote SHA verified.** Do not dispatch TASK-007 before that receipt. No follow-up code task is authorized by this handoff.

## Remote verification

`git push -u origin agent/TASK-005-hangout-foundation` succeeded. `git ls-remote origin refs/heads/agent/TASK-005-hangout-foundation` returned `57f4164679409b86d37e990fe45927de3d503726` for the implementation commit. This handoff receipt will be a subsequent documentation commit; its remote tip and integrated main SHA are reported separately to the coordinator after publication.
