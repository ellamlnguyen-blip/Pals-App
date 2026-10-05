# TASK-027H — Moderator MFA database boundary

Status: Ready
Parent: TASK-027
Date: 2026-10-05

Implement the accepted ADR-0031 database portion only. Read AGENTS, auth/security/data-model docs, ADR31 and current five moderation RPCs. Start fresh from canonical main and merge reviewed parent360d8e8. Commit migration20261005000300 requiring genuine JWT AAL2 plus live owned unexpired Auth session, current verified owned TOTP factor and live moderator/admin/account checks in shared moderation_actor. Deny missing AAL/session/factor, AAL1, role/status removal, expired/downgraded/revoked session and cached-AAL2 after factor deletion. Preserve lock order, conflicts, report privacy, reasons/revisions/audit and all ordinary student behavior. No manual approval of routine users/actions, no student MFA or per-operation TOTP enrollment/challenge requirement.

Add actual-role SQL tests and genuine local Auth enrollment/challenge/verification HTTP positive tests for all five RPCs and revocations; never forge positive HTTP MFA JWTs. Coordinate session/factor revocation locks with existing auth schema; inspect primary Supabase implementation when necessary and document exact semantics. Reconcile directly affected local moderation SQL fixtures as needed without dropping coverage; disclose all obsolete fixture failures requiring a separate bounded task rather than broadening silently. Run clean migration/RLS verification, focused MFA Auth tests and relevant enforcement tests; record failures honestly.

H exclusively owns the disposable local stack initially. Align ignored storage-version to parent v1.77.5 before official reset/start and keep actual runtime compatible. Immutable fixtures require resets; no provider DDL or hosted writes. Coordinate release to G after tests. Write handoff, commit/push and remote-verify; stop for fresh security review. No admin UI change or shared queue edit.
