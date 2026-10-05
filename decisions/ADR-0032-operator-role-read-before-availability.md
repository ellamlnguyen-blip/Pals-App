# ADR-0032 — Own operator role read before launch availability

Status: Proposed
Date: 2026-10-05
Scope: TASK-027 staging preparation

## Problem

The current `roles_owner_read` policy on `public.platform_roles` depends on `private.pilot_onboarding_eligible()`. That helper requires availability and the onboarding capability to be enabled. TASK-027I's caller-session admin UI therefore cannot see even Ella's own already granted operator role while staging remains closed. Opening availability and onboarding to enroll her authenticator would expose student onboarding before the launch safety and smoke gates are complete.

## Decision proposed

In one committed migration, replace only `roles_owner_read` with an authenticated caller-own-row policy using `user_id = auth.uid()` and the existing live `private.has_verified_membership()` helper. That helper requires an active account, current confirmed Auth email equal to the verified membership email, an active campus and exact allowed email domain. It does not depend on launch availability. Keep the table's no-client-write grants, all other RLS policies, moderation source gate, AAL2/live session/factor guard, and report/audit RPCs unchanged.

This lets an eligible operator read only their own role label before availability opens, so the admin UI can require that role before TOTP setup. It gives no report, profile, other role, source, policy or application access. Revocation, suspension, campus or email loss must immediately remove the row from the caller's read result. A role row alone never authorizes moderation.

## Evidence required

Prove under actual `anon` and `authenticated` roles that an active confirmed allowlisted UNC operator can read only their own role with all launch gates false, while another person's role, unconfirmed/non-UNC/stale-email/inactive/suspended/banned callers remain denied. Prove no client role write and no report access at AAL1 or with moderation gate false. Run migration reset and SQL tests, then genuine local admin sign-in/enrollment with gates closed. Independently review the exact policy and UI dependency before staging migration deployment.

## Acceptance

This permission change requires explicit acceptance under AGENTS.md's ADR policy. The proposed status grants no migration or hosted write authorization by itself. Production remains out of scope.
