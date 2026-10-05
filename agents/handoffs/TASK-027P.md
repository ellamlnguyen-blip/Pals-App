# TASK-027P — Audited staging emergency availability-off

Date: 2026-10-05
Branch: `agent/TASK-027P-emergency-availability`
Status: Implementation and local verification complete; independent security review and integration pending.
Base: TASK-027 parent `0c1bc49a5056d731ac97c08bda76e307774c6c27`.
Implementation: `8247961`.

## Outcome

Added one fixed staging-control operation, `emergency_availability_off`. It requires an exact positive expected availability revision, request UUID, incident reason, authorization reference, reviewed clean checkout, existing CLI session, exact Pals Staging project and latest migration preflight. Its SQL takes the established availability management lock, validates an exact prior request under that lock, and otherwise changes only the existing availability singleton from true to false at the expected revision. It writes an immutable control-audit row in the same transaction with true/false values, old/new revisions, request and CLI database-session provenance. It does not write `pilot_management_audit`, enable availability, select a gate or policy key, or grant a client operation.

Following the security review, exact retry additionally requires the current locked availability row to remain off at the recorded shutdown revision. An old request UUID fails after a later reopen; a new incident requires a new request and current expected revision. The README distinguishes Ella's live identity prerequisite for role/manager writes from this emergency route, which is available when her app session is unavailable.

Migration `20261005000700` only adds the audit operation and its null subject/gate target shape. Replay does not change availability. All staging-control operations now require migrations `005` through `007`, with `007` latest, before any write. README records incident authorization and read-only reconciliation. Production remains outside this operation.

## Verification

- Clean disposable local reset replayed all migrations through `20261005000700`; availability remained false.
- Clean-checkout runner tests passed 8/8: fixed project/subject, no arbitrary emergency gate or desired state, positive bounded revision, migration preflight, wrong project, missing migration, exact audit receipt and malformed receipt denial.
- Rolled-back local SQL passed true→false revision 1→2, exact retry, one immutable emergency audit, separate management audit, cross-operation UUID conflict, changed-payload and changed-revision retry denial, stale new request denial, audit update/delete denial, and actual `anon`, `authenticated`, and `service_role` read/write denial. No SQL step partially mutated state on failure.
- Security-review follow-up added old-UUID-after-reopen denial; the focused rolled-back SQL rerun passed. After a final clean reset, readback showed availability false at revision 1, zero control audits, Auth users, platform roles or admission managers, and `007` as the latest migration.
- After rollback, readback showed availability false, zero control audits, zero Auth users, zero platform roles, and migrations `005`–`007` present. `git diff --check` passed. No hosted write was attempted.

## Remaining gates

Fresh security re-review of the corrected migration, runner and SQL is required before integration. The coordinator owns task/main publication and hosted staging release. Hosted use requires the reviewed SHA, exact project/migration/CLI preflight, incident authorization, named human executor/reviewer record and independent read-only audit/state reconciliation. Production rollback needs a separately reviewed adaptation. This work does not authorize opening staging or production access.
