# TASK-027 — sole launch moderation owner policy handoff

Date: 2026-10-05  
Branch: `agent/TASK-027-open-unc-mvp`  
Starting branch SHA: `f89bf3031edf036c02b728bdad60e192533624b1`  
Status: Documentation update for coordinator review; TASK-027 remains incomplete.

## Decision and outcome

The user explicitly removed the backup moderator requirement. Ella Nguyen (`ella_nguyen@unc.edu`) solely owns launch moderation. The earlier `ella_nguyen@kenan-flagler.unc.edu` nomination is historical and must not be counted as another person or a launch gate. Current TASK-027 contract, launch plan, critical path, MVP and authorization/safety specifications, ADR-0028 and Proposed ADR-0029 now use this rule. The current state and earlier TASK-027 handoff identify superseded dated receipts as historical.

The documentation continues to require verified account identity, least-privilege moderator role, MFA/recovery, audited role provisioning and moderation access, report response/retention handling and an incident contact before invitations. ADR-0019's operator conflicts and action limits, immutable audit, block/report handling, suspension/ban enforcement and RLS remain unchanged. The decision does not accept Proposed ADR-0029 or enable any hosted gate.

## Evidence and boundaries

- Read the active task contract, accepted moderation and release ADRs, current MVP/authorization/safety policy, critical path, launch plan and current state.
- Searched current task, product, engineering, operations and decision documents for backup requirements. The remaining backup references are current statements that the backup is unnecessary or clearly dated historical receipts. `tasks/NOW.md` and `tasks/BACKLOG.md` are coordinator-owned shared records; the coordinator should update current status on `main` during review and integration.
- Reviewed the documentation diff and ran `git diff --check`. No automated or hosted tests were run because this change is documentation only. No app code, migration, hosted setting, moderator role or student access was changed.

## Remaining TASK-027 gates

The staged access/denial and feature-flow smoke checks, Storage upload proof, auditable first-manager path, Ella's moderation readiness, release review and action-time hosted access decision remain. The coordinator must review this documentation and publish the shared queue/current-state receipt and accepted task work to canonical `main` before marking TASK-027 complete. The task-branch push by itself is not completion.
