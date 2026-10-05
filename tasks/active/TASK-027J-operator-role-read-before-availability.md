# TASK-027J — Pre-activation own operator role read

Status: Ready only after ADR-0032 acceptance
Parent: TASK-027
Date: 2026-10-05

Implement the exact bounded policy and caller-bound UNC helper in ADR-0032 from the reviewed combined TASK-027G/H source. Use one committed migration after `20261005000400`. Do not modify the shared `has_verified_membership()`, prior applied migrations or other RLS policies; do not enable gates or use a service-role proxy.

## Acceptance criteria

1. An active confirmed UNC caller with a current own `platform_roles` row can read only that role while availability/onboarding/moderation gates are false.
2. Another role row and unconfirmed, non-UNC, stale-email, inactive-campus, suspended and banned callers cannot read it; client insert/update/delete remain denied.
3. All five moderation RPCs still deny AAL1 and closed gate, and require the TASK-027H live AAL2/factor/role guard when enabled.
4. Clean migration replay and actual-role SQL tests pass. Genuine local TASK-027I admin sign-in and TOTP enrollment work with launch gates closed. Return local state to closed/clean afterward.
5. Fresh security review, task handoff, and parent integration record exact evidence. Hosted migration waits for reviewed staging preflight; this task does not enable hosted gates or role grants.
