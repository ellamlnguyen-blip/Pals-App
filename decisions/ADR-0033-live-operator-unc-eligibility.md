# ADR-0033 — Live UNC eligibility for moderation authority

Status: Rejected
Date: 2026-10-05
Scope: TASK-027 operator authorization

## Problem

TASK-027H's shared moderation guard requires AAL2, a live owned session and verified TOTP, active account, current operator role and moderation gate. It does not recheck the operator's current confirmed UNC email, synchronized verified membership, active campus and exact allowed domain. A still-live AAL2 session could therefore retain report/action authority after email or campus eligibility loss while the role row remains.

## Decision proposed

Tighten only the shared `private.moderation_actor()` guard in a committed migration after TASK-027J. A valid privileged caller must also satisfy current live confirmed UNC Auth email, matching verified membership, active UNC campus and exact allowlisted email domain at the point of action. After existing gate/account/role locks, lock the actor's `auth.users` row, then membership row capturing campus ID, then that campus row, all FOR SHARE; follow with the existing TOTP factor then session lock order. In a separate READ COMMITTED statement after waits, recheck non-null confirmation and verification, matching current email, valid single-@ shape, exact active `unc-chapel-hill` campus and its allowed domain. Keep the existing AAL2/session/factor, account/role/gate, report conflict and audit checks. Never trust a stale JWT email claim, revoke role implicitly, or broaden student/source access.

This is a denial-only addition to the five moderation RPCs. It does not add student approval, student MFA, service-role proxying or operator recovery bypass.

## Evidence required

Actual-role SQL and genuine Auth HTTP tests must prove the five RPCs reject unconfirmed, changed/non-UNC email, stale membership, inactive campus, suspended/banned account, AAL1, factor/session loss and role removal, while valid AAL2 Ella-shaped authority succeeds and audits. Concurrency tests must verify email/membership/campus changes racing a moderation request either serialize safely or deny after the change commits. Review the lock graph against Auth trigger/order and factor/session revocation before staging. No hosted migration, role or gate change follows merely from this proposal.

## Acceptance

The user explicitly rejected rechecking UNC email/campus eligibility on every moderation action on 2026-10-05, prioritizing the shortest route to a working MVP. This proposal is retained as a rejected design record; TASK-027M will not implement it. Existing active-account, current-role, live AAL2 session/factor and source-gate checks remain. A granted operator role must be removed through the existing reviewed administrative path if the operator later loses UNC eligibility; this is an operational limitation to verify during launch review.
