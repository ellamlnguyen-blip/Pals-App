# Handoff — TASK-027B
Date: 2026-10-05
Agent: task-specific staging-control implementation agent
Branch/worktree: `agent/TASK-027B-staging-controls` at `/private/tmp/pals-task027-controls`
Task branch and pushed correction commit SHA: `1560f8faeb391f61b81ca3edb24fb00401a1e9cb`, remote verified 2026-10-05; earlier reviewed implementation SHA `9c7c030c79277492cb8b33f464bc4f9e564d57e0`
Integrated `main` commit SHA: pending coordinator review/integration
Main status-record path and last published milestone: `tasks/active/TASK-027B-staging-control-bootstrap.md`, published on canonical main before dispatch
Outstanding review/integration blockers: Proposed ADR-0029 acceptance, coordinator integration, and hosted launch gates; no hosted operation in this task

## Outcome
Prepared an inert audit migration and staging-only CLI-backed first-manager, sole-moderator and source-gate controls. No hosted write or account/role/gate activation was performed. Parent TASK-027 remains incomplete.

## Files changed
- `supabase/migrations/20261005000100_staging_control_audit.sql`: append-only private evidence, RLS and revoked client access; no role/account/gate binding.
- `scripts/staging-control/`: exact-target runner, separate manager/moderator/gate SQL, local rolled-back SQL test generator, CLI transport tests and runbook.
- `decisions/ADR-0029-staging-first-manager-bootstrap.md`: replaced speculative unique-login proposal with a concrete Proposed shared-CLI Management API design.
- This handoff and the published TASK-027B contract copy.

## Behavior and security boundary
The runner uses the existing logged-in Supabase CLI session and exact `--project-ref ffabdrgsmtfylrehwmfo`. It verifies `Pals Staging` in the CLI project list, a reviewed checkout SHA, migration versions, `postgres` database/session, and the immutable receipt. It never reads a token, uses a client privileged key, or calls the hosted fixture writer. A hardcoded Ella UUID/email binds grants. Revocations remain available for the same still-existing UUID after email/status loss. Existing `pilot_lock_management` ordering is preserved; manager transitions append both the legacy immutable manager audit and new control audit atomically. Moderator transitions serialize role writes and grant only `moderator`. Source gate SQL accepts only nine fixed table mappings; analytics and large safeguards are excluded. Capability/availability changes remain the real Ella caller-bound `set_pilot_policy` RPC.

The Management API SQL session is shared `postgres`. Its login/PID prove database provenance, not a uniquely identified human. `authorization_ref` and the fixed existing-CLI-session credential label provide separate administrative references, not proof of who held the CLI credential. A named operator/reviewer change record remains required.

## Tests and verification
- Applied the audit-only migration to the named disposable local database; it created only the audit table/trigger and grants.
- Ran `test-local.mjs` through the named local Postgres container in one transaction ending `ROLLBACK`; passed current confirmed Ella fixture, first-manager exact retry, changed request payload denial, stale revision denial, changed Auth email denial, moderator and gate grants/revocations, stale gate denial, two manager audit rows, account status/email loss rollback, and actual anon/authenticated/service-role grant checks. The local test left no Ella fixture or gate transition.
- `node --test scripts/staging-control/run.test.mjs`: 4/4 passed, including wrong target/subject/gate rejection, SQL delimiter/input escaping, fixed CLI project/ref ordering, wrong project failure before SQL, and malformed receipt denial.
- `git diff --check`: passed before commit.
- Read-only local CLI query confirmed installed CLI JSON is `{boundary, rows, warning}`; runner parses `rows` exactly. Existing logged-in CLI `projects list --output-format json` shape was separately confirmed by coordinator as `{projects:[...]}`.
- Independent security reviewer examined clean SHA `9c7c030c79277492cb8b33f464bc4f9e564d57e0`, reran runner tests 4/4, checked installed CLI flags, and found no remaining blocking local-code issue. No hosted operation was part of that review.
- `git ls-remote origin refs/heads/agent/TASK-027B-staging-controls` returned `9c7c030c79277492cb8b33f464bc4f9e564d57e0` after push. The final documentation receipt commit SHA is separately reported to the coordinator after its push.

## 2026-10-05 bounded transport correction
The coordinator's actual read-only hosted CLI query found `--project-ref` alone fails with `LegacyDbQueryMutuallyExclusiveFlagsError`; the runner now uses `db query --linked --project-ref ffabdrgsmtfylrehwmfo`. It also requires the audit migration `20261005000100` and the deployed TASK-027 migration `20261005000200`, with `20261005000200` as the latest version. The audit migration is not yet deployed to staging, so this preflight currently fails closed. Focused tests cover exact CLI flags, migration preflight metadata, and missing-migration denial before control SQL. No hosted control SQL, role, manager, or gate write was made. This correction requires a fresh independent review before any hosted operation.

`node --test scripts/staging-control/run.test.mjs` passed 5/5 on the clean correction commit. A read-only CLI query with the exact corrected `--linked --project-ref ffabdrgsmtfylrehwmfo --file ... --output-format json` flags returned migration versions `20261004000100` and `20261005000200`; it returned no `20261005000100` row. `git ls-remote` confirmed origin task SHA `1560f8faeb391f61b81ca3edb24fb00401a1e9cb`. The final handoff-only receipt commit SHA is separately reported to the coordinator after push.

## Decisions and limitations
ADR-0029 remains Proposed and requires independent review/acceptance before any hosted administrative query. The runner requires the reviewed Git commit and latest migration version exactly; new migrations require a reviewed runner update. A Manager/role grant requires live current confirmed Ella Auth/account/UNC evidence. Role/manager rollback accepts the exact UUID after status/email loss. This task does not build Ella's signed-in policy UI or an emergency policy shutdown path. Hosted MFA/authorization, operator attribution evidence, exact hosted migration application and TASK-027 action-time access-opening gate remain with the coordinator. No `admin` role is provisioned. External analytics and large-Hangout safeguards stay off.

## Follow-up
Independent security review of this branch and accepted ADR-0029, then coordinator-controlled canonical integration. After that, review live staging account/CLI target and hosted migration before any operation. Complete separately bounded genuine-Ella-session policy controls and browser lifecycle/denial smoke. Confirm the unresolved admin sanction/reinstatement and MFA decisions before launch operations as applicable.

## Ready for next task?
No. TASK-027 parent remains incomplete. TASK-027B preparation passed independent local-code review; Proposed ADR-0029 acceptance, hosted execution and main integration remain outstanding.
