# TASK-027J — Prelaunch own operator role read

Branch: `agent/TASK-027J-operator-role-read`
Status: implementation and local verification complete; independent security review clear and local parent integration complete. Publication and hosted staging application pending.
Date: 2026-10-05

## Outcome

Migration `20261005000500` adds a caller-bound private UNC eligibility helper and replaces only `roles_owner_read`. An active account with current confirmed allowlisted Auth email, matching verified membership and active `unc-chapel-hill` campus can read only its own platform role while launch availability and onboarding remain false. No client role writes, other table policies, moderation RPCs, gates or hosted state changed. The helper is unexposed to API clients and grants only authenticated execution for policy evaluation. `docs/engineering/AUTHORIZATION.md` records the new boundary.

## Evidence

- Clean migration replay succeeded with the checkout's documented nonsecret Storage v1.77.5 pin.
- Full local database suite passed: 28 files, 1,717 assertions. New tests use actual `anon`/`authenticated` roles and cover own/other role, unconfirmed/non-UNC/stale email, suspended/banned, inactive/wrong campus, denied client insert/update/delete, all five AAL1 moderation RPCs, and closed moderation gate.
- Local schema lint passed without warnings.
- Genuine disposable Auth and admin HTTP flow with availability, onboarding and moderation false: synthetic UNC account password sign-in 200, own admin role and `mfa=enroll` returned by `/api/session`, `/api/mfa` TOTP enrollment/challenge/verify all 200, then `mfa=ready`. This used the existing admin routes unchanged. The temporary local Next probe used webpack because borrowed dependencies in this isolated worktree triggered a Turbopack external-symlink error; it did not affect application code.
- Final clean local reset/readback: availability false, moderation false, every capability false, Auth users 0, platform roles 0, MFA factors 0, moderation audit 0; actual Storage image v1.77.5.

## Follow-up

The parent coordinator should obtain a fresh security review of this exact migration/policy, integrate reviewed work, then run the reviewed staging preflight before applying it there. Ella's real role grant and personal factor setup remain separate supervised staging steps. No production, hosted migration, role grant or gate change was made here. The user's rejection of ADR-0033 is respected; this task did not change moderation RPC eligibility checks.
