# TASK-010 prerequisite contract reconciliation

Date: 2026-09-25
Branch/worktree: `agent/TASK-010-contract-reconciliation`, `/private/tmp/pals-task010-contract-reconciliation`
Starting canonical main: `5dd585638387b1e72e57724bebf5ee0ef09e17a5`, independently verified with `git ls-remote origin refs/heads/main` before branch creation.
Scope: documentation and contract reconciliation only for accepted TASK-021 readiness plan. TASK-010 and TASK-021 remain incomplete.

## Outcome
Accepted ADR-0012 was already accepted unchanged on 2026-09-23. Created narrower TASK-010A backend and dependent TASK-010B UI planning contracts against the current integrated migrations. A captures the shared global safety lock and participant provenance, direct block reconciliation, notification sources, moderator disable, attendance schedule freeze and TASK-020 host-only size warning/joining control. B consumes reviewed A and existing saved Hangout/TASK-020 UI without a second joining flow. No implementation agent, code, migration, runtime test, gate enablement, hosted operation or live user was involved.

No accepted-policy conflict requires a new ADR. The current backend has implementation details that Stage A must change narrowly: the two-argument revision-free removal RPC must be removed, and the cancelled-row ownership trigger must permit revision-only bookkeeping for authorized post-cancel leave/removal while keeping `updated_at` unchanged. The latter protects attendance's pre-start cancellation eligibility check. A tests the cross-start case and all direct safety teardown paths. Stage B may remove only members visible in its current authorized roster; the backend's known-ID host right to remove a left member does not create a historical-roster UI.

## Evidence and independent review
Read current AGENTS, TASK-010, TASK-021 readiness/acceptance, accepted ADR-0012/0018/0019/0022/0024, product/UX/authorization/engineering specifications, current migrations and TASK-020 contract. Fresh GPT-6 Sol medium read-only dependency audit identified the exact latest RPC/lock/notification/attendance/size functions. Separate fresh GPT-6 Sol medium read-only contract reviewer found the cancelled-trigger/attendance hazard and the left-member UI enumeration mismatch. Both were corrected; reviewer rechecked revised A/B and found no further actionable issue. The dispatch tool has no Standard-speed selector, so app speed could not be independently verified.

Documentation checks: `git diff --check`, source reference/path checks and scoped diff review before publication. No runtime verification is claimed for this documentation-only increment. Known CI/dev-helper limitations remain separately tracked.

## Next
Publish and verify this branch and canonical main, then report the A/B readiness to the existing TASK-021 task. A fresh TASK-010A implementation agent may be dispatched only from then-current verified main under its published contract, followed by exact-tip security review and reviewed integration. B is dependent on A. This planning substage does not create a duplicate product/successor task or authorize hosted execution.

## Publication receipt
After independent review, the planning branch and canonical main were pushed and independently verified with `git ls-remote` at `10a3b6d409902988594776d2d468bf83e6a80777`. A subsequent documentation-only receipt may advance main; this immutable SHA records the reviewed contract integration. TASK-010A implementation remains undispatched, TASK-010B dependent, and both parent TASK-010 and TASK-021 incomplete.
