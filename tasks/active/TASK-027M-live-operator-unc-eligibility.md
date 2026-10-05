# TASK-027M — Enforce live operator UNC eligibility

Status: Ready only after ADR-0033 acceptance
Parent: TASK-027
Date: 2026-10-05

Start from the reviewed combined TASK-027G/H/I/J source. In one committed migration after TASK-027J, tighten only `private.moderation_actor()` as specified in ADR-0033. Do not alter student eligibility, role storage, Auth provider schema, recovery, moderation audit, or source gates.

## Acceptance criteria

1. All five privileged RPCs require live active, confirmed, exact allowlisted UNC email and matching verified membership/campus evidence in addition to the existing AAL2 session/factor, role, account and gate checks.
2. Actual-role SQL and genuine local Auth tests cover email/domain/confirmation, membership/campus/status, role and session/factor denials plus valid AAL2 audit success.
3. Lock-order/race tests cover concurrent Auth email and campus/membership changes without deadlock or stale post-commit success; a fresh security review inspects the exact graph.
4. Clean replay, schema lint, relevant HTTP and SQL suites pass. Local gates and fixtures are cleaned. Write handoff; parent owns staging deployment and launch acceptance.
