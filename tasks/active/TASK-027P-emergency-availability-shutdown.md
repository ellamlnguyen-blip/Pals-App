# TASK-027P — Audited emergency availability-off operation

Status: Ready only after ADR-0035 acceptance
Parent: TASK-027
Date: 2026-10-05

From reviewed TASK-027G control source, implement only ADR-0035's staging availability true→false emergency operation. Use one inert migration after the current reviewed migration lane to add audit vocabulary and permit this operation's truthful null subject/gate target shape, preserving all existing shapes. Update the fixed-project runner's exact latest-migration preflight and keep operational SQL outside replay. Acquire the established availability lock and validate exact request retry before live-state checks. No enable operation, generic table SQL, role change, source-gate change, client grant or hosted action.

Run clean migration replay, exact-target/no-arbitrary-key runner tests, audit before/after boolean and revision checks, expected-revision retry checks, rolled-back local SQL including actual anon/authenticated/service_role audit denial, CAS/retry/wrong-project/stale checks and audit readback. Get fresh security review and write a handoff. Parent owns staging deployment, any actual emergency use, and separately reviewed production adaptation before cutover.
