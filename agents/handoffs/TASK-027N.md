# TASK-027N — Manager policy MFA guard

Branch: `agent/TASK-027N-manager-policy-mfa`
Base: `4b42a13` (reviewed TASK-027J integration)
Status: local implementation complete; independent security review, publication and hosted application pending.
Date: 2026-10-05

## Outcome

Migration `20261005000600_pilot_manager_mfa_guard.sql` changes only the shared `private.pilot_require_manager()` guard used by `set_pilot_policy` and `set_pilot_account_admission`. It requires an AAL2 JWT backed by a current owned, unexpired AAL2 Auth session and owned verified TOTP factor. The factor is locked before the session and both are checked after any lock wait. Existing management locks, active manager/account checks, RPC ABI, CAS, retry and immutable audit remain in place. No per-action UNC eligibility recheck was added, honoring the user's rejection of ADR-0033. No hosted state changed.

## Evidence

- Clean disposable migration replay applied all migrations through `20261005000600`.
- Genuine local Auth HTTP suite passed 1/1: AAL1 denial on both RPCs, AAL2 policy/admission success and audit, stale revision denial, cached AAL2 denial after session downgrade, expiry or deletion, factor unverify, manager revocation or account suspension. Denied calls created no management audit.
- Observed local concurrency suite passed 1/1: policy waiters blocked on factor, session, manager and account changes, then denied; availability remained false.
- Existing authority HTTP suite updated to enroll genuine TOTP before positive manager calls and passed 1/1.
- New actual-role SQL denial suite passed. Full database suite passed 28/29 files and 1,677 assertions; `private_pilot_admission_authority.test.sql` aborts at its first historical manager-positive AAL1 call at line 65. It requires a separately bounded genuine Auth-backed fixture update. No positive Auth token or factor was fabricated to force this legacy test green.
- Schema lint passed without warnings. Targeted formatting and `git diff --check` passed.
- Final disposable reset/readback: availability false, moderation false, all capabilities false, Auth users 0, managers 0, factors 0, management audit 0.

## Remaining work

Independent security review should examine the lock order, fresh checks and concurrent factor/session changes. The historical SQL fixture and older SQL concurrency scripts still assume manager AAL1; update them in a bounded follow-up before claiming a full green policy suite. The existing owner HTTP lifecycle suite reaches an unrelated open-UNC expectation mismatch (`ready` versus `onboarding`); its source was left unchanged. The parent owns hosted migration, caller-session UI, reviewed emergency shutdown, release/rollback and shared queue/status records. If Ella loses a valid TOTP or session while availability is on, routine caller-session shutdown is unavailable until the ADR-0035 emergency path is implemented.
