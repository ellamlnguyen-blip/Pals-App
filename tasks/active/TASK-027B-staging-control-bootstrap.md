# TASK-027B — Staging control bootstrap preparation

Status: In progress — prepare and independently review; no hosted execution by implementation agent
Date: 2026-10-05
Parent: TASK-027 (incomplete)
Baseline: published Task-027 f89bf3031edf036c02b728bdad60e192533624b1

## Contract

Prepare a minimal auditable staging administrative channel for first-manager provisioning, sole moderator assignment and legacy source-gate configuration. Replace the unimplemented Proposed ADR-0029 unique-vault-login design with a concrete proposed operating design. The user authorized staging activation and sole Ella moderation. This contract authorizes preparation/review/tests; the proposal and exact operations must be reviewed before hosted execution.

Target is only Pals Staging ffabdrgsmtfylrehwmfo. Ella's confirmed account UUID is 8ebd74bb-2a72-4689-9580-72268106d91b; resolve and recheck live Auth/account evidence rather than trusting email alone. No production operations, no client privileged keys, no spoofed auth.uid, no fixture bootstrap on hosted.

## Deliverables

- Staging-only committed administrative scripts outside automatic migration replay, with endpoint/provider target verification, exact actor/subject expectations, transaction locks/rechecks, request UUID and atomic truthful audit. Management API shared postgres session must be described as postgres; receipt records current user authorization and authenticated administrative credential provenance separately, without claiming a unique human database login.
- A normal committed migration for narrowly scoped immutable role/source-gate administrative audit if required; it must install no role, manager, gate activation or staging account binding during normal replay. Deny all client writes/reads and verify actual roles.
- Separate idempotent first-manager and sole moderator operations; preserve established lock order and least privilege. Normal capability/availability changes remain caller-bound set_pilot_policy using Ella's genuine authenticated session. No arbitrary-target role-assignment client RPC.
- Exact gate allowlist and reviewed rollback/disable operations with retained audit; analytics external capture and large-Hangout safeguards remain off.
- Revise Proposed ADR-0029 concretely, tests for targets/mismatch/retries/atomicity/current account checks/denied roles, handoff. No hosted action by task agent.

## Acceptance

Independent security review finds no bypass or production activation path; local migration/RLS and targeted administrative-operation tests pass. Handoff explicitly lists approval/design decisions and any unverified administrative-human attribution. Parent remains incomplete until hosted operations, browser lifecycle/denial smoke and reviewed main integration pass.
