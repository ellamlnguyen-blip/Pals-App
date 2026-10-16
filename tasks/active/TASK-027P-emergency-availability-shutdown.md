# TASK-027P — Audited emergency availability-off operation

Status: Complete locally; independently reviewed and integrated into TASK-027 parent, staging-only and unpublished
Parent: TASK-027
Date: 2026-10-05

From reviewed TASK-027G control source, implement only ADR-0035's staging availability true→false emergency operation. Use one inert migration after the current reviewed migration lane to add audit vocabulary and permit this operation's truthful null subject/gate target shape, preserving all existing shapes. Update the fixed-project runner's exact latest-migration preflight and keep operational SQL outside replay. Acquire the established availability lock, validate exact request retry first, and require current availability still false before returning a historical receipt. No enable operation, generic table SQL, role change, source-gate change, client grant or hosted action.

Run clean migration replay, exact-target/no-arbitrary-key runner tests, audit before/after boolean and revision checks, expected-revision retry and old-request-after-reopen denial checks, rolled-back local SQL including actual anon/authenticated/service_role audit denial, CAS/retry/wrong-project/stale checks and audit readback. Get fresh security review and write a handoff. Parent owns staging deployment, any actual emergency use, and separately reviewed production adaptation before cutover.
