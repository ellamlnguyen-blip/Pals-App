# Handoff — TASK-017A
Date: 2026-09-24
Agent: bounded Stage A implementation agent
Branch/worktree: `agent/TASK-017A-audited-review` / `/private/tmp/pals-task-017a-approved`
Task branch and pushed commit SHA: task-tip SHA is verified after this self-referential handoff is committed; coordinator records the exact remote SHA on main
Integrated `main` commit SHA: Stage A not integrated; accepted ADR-0020 and contract merged from remote-verified main `56468f3d2d5cc503628d273fdd22a14eaf4cdbd5`
Main status-record path and last published milestone: coordinator-owned `tasks/NOW.md` and `docs/operations/CURRENT_STATE.md` on `56468f3d2d5cc503628d273fdd22a14eaf4cdbd5`
Outstanding review/integration blockers: fresh exact-tip security review and coordinator integration; ADR-0020 is now Accepted on canonical main

## Outcome

Implemented the disposable-local Stage A private moderation gate, case, retry,
and audit relations and three caller-bound public RPCs. The gate is false after
every reset. New case actions are review, annotation, no-action/duplicate
closure, and reopen; there is no sanction or Hangout disable path. Student
report intake and its no-reader boundary remain intact.

## Files Changed

- `supabase/migrations/20260924000100_local_moderation_review.sql`
- `supabase/tests/database/local_moderation_review.test.sql`
- `supabase/tests/moderation-http.integration.mjs`
- `supabase/tests/moderation-concurrency.integration.mjs`
- `supabase/README.md`
- This handoff

## Behavior / Architecture Impact

The migration changes `private.safety_reports.reporter_id` to restrictive
deletion, and cases reference reports restrictively. Audit actor/subject IDs
are retained UUID values, with no cascading foreign keys. All new private
relations have RLS and no client or service-role raw grants. The public RPCs
return bounded allowlisted queue/detail projections and minimal transition
results. Every successful page/detail appends an audit row in the same
transaction. Accepted transitions, their retry result, and audit append are
atomic. Exact replays pass current gate, actor, and conflict checks before the
saved result is returned.

Accepted ADR-0020 adds server-owned `case_revision` only to audited exact-ID
detail. The queue and student APIs remain unchanged. A missing case row
projects zero; a second operator can read the current revision and receives
neutral denial on a stale transition without a case mutation or extra audit.

The lock order is moderation advisory lock, gate row, actor account `FOR SHARE`
row, actor role row, report row, target account or Hangout row, then
case/retry. Queue/detail user targets use `FOR SHARE`; case actions use target
`FOR UPDATE` to block a concurrent platform-role insertion's FK key-share
until the action commits. The actor `FOR SHARE` and read-target `FOR SHARE`
avoid deadlock cycles with existing Hangout report and block writers that lock
Hangout parents before actor/peer accounts. RPCs require READ COMMITTED and
make fresh authorization checks after waits. Hangout host ownership is
immutable under the existing trigger, so a committed host-change race cannot
occur.

## Tests / Verification

- Two clean disposable local database resets applied the final ADR-0020
  revision projection; earlier resets verified the narrowed lock modes.
- Schema lint: no warnings after the final migration adjustment.
- Focused pgTAP: 39 assertions passing, including gate/RLS/grants,
  student/unknown/conflict denial, deletion restriction, tied-time pagination,
  unavailable target, duplicate reference rules, audit counts, replay and
  absent/current case revision projection, revision behavior, and immutable
  Hangout host guard.
- Existing report pgTAP: 43 assertions passing. Existing global-block pgTAP:
  62 assertions passing.
- Real local Auth/PostgREST moderation HTTP test: passing for anon/student,
  forged user-metadata admin claim, active/suspended/banned operator, direct
  private table denial, exact-ID self-filed/self-target/own-host conflicts,
  output allowlists, no audit on denial, exact replay, gate-off replay,
  second-operator case revision read, and stale-action denial with no audit.
  Existing report HTTP and concurrency tests
  pass when run serially; running them together caused their fixture gates to
  interfere, then a clean reset and serial rerun passed.
- Overlapping-session test: observed `pg_stat_activity` lock waits for gate
  disable, operator-role deletion and account suspension in both commit orders
  (each operation-first read audited once, later denied read unaudited), target-role
  insertion and action in both orders, two operators racing one case revision,
  concurrent same-key first actions, current Hangout report versus detail in
  both commit orders, and safety-block versus a queue that visits the user
  target before its Hangout report. Stronger-isolation denial passed.
- Node syntax, direct ESLint and Prettier checks passed for the new JS tests.
  `pnpm check` could not run in this disposable checkout: its dependency guard
  tried to purge a borrowed `node_modules` symlink and aborted without a TTY.
- Cleanup query found zero reports, cases, audits and moderation retries; all
  eight feature gates were false. Local services stopped at final handoff.

## Decisions

ADR-0020 acceptance resolved the case revision allowlist conflict. The field
is added only to audited exact-ID detail; queue and student APIs remain
unchanged.

## Known Limitations

No hosted operation, retention/appeals policy, sanction, Hangout disable, or
admin UI is included. The queue scans until it fills a bounded result page;
large-data performance was not measured in this disposable local stage.
No separate security review has yet signed off on the exact task tip.

## Follow-up Tasks

Obtain fresh exact-tip security review, then let the coordinator integrate
accepted Stage A code and its records to canonical main. Stage B must not
depend on this branch before those gates complete.

## Documentation Updated

`supabase/README.md` describes the local RPCs, lock order and hosted
prerequisites. Shared queue/state/changelog files remain coordinator-owned.

## Ready for Next Task?

No — exact-tip security review and canonical integration remain.

Remote verification for both refs: accepted ADR-0020 main
`56468f3d2d5cc503628d273fdd22a14eaf4cdbd5` was independently verified
and merged into this branch. The task-tip SHA is
verified after this handoff commit and reported to the coordinator for the
canonical status record. No integration has occurred.
