# ADR-0033 — Live UNC eligibility for moderation authority

Status: Proposed
Date: 2026-10-05
Scope: TASK-027 operator authorization

## Problem

TASK-027H's shared moderation guard requires AAL2, a live owned session and verified TOTP, active account, current operator role and moderation gate. It does not recheck the operator's current confirmed UNC email, synchronized verified membership, active campus and exact allowed domain. A still-live AAL2 session could therefore retain report/action authority after email or campus eligibility loss while the role row remains.

## Decision proposed

Tighten only the shared `private.moderation_actor()` guard in a committed migration after TASK-027J. A valid privileged caller must also satisfy current live confirmed UNC Auth email, matching verified membership, active UNC campus and exact allowlisted email domain at the point of action. Keep the existing AAL2/session/factor, account/role/gate, report conflict and audit checks. Use a reviewed lock order and fresh recheck after waits against concurrent Auth email, membership and campus changes. Never trust a stale JWT email claim, revoke role implicitly, or broaden student/source access.

This is a denial-only addition to the five moderation RPCs. It does not add student approval, student MFA, service-role proxying or operator recovery bypass.

## Evidence required

Actual-role SQL and genuine Auth HTTP tests must prove the five RPCs reject unconfirmed, changed/non-UNC email, stale membership, inactive campus, suspended/banned account, AAL1, factor/session loss and role removal, while valid AAL2 Ella-shaped authority succeeds and audits. Concurrency tests must verify email/membership/campus changes racing a moderation request either serialize safely or deny after the change commits. Review the lock graph against Auth trigger/order and factor/session revocation before staging. No hosted migration, role or gate change follows merely from this proposal.

## Acceptance

AGENTS.md requires explicit acceptance for this authorization change. Current user instructions already require live email/campus enforcement, but implementation and hosted rollout still need this reviewed decision.
