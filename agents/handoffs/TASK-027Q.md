# TASK-027Q — Manager authority fixture reconciliation

Branch: `agent/TASK-027Q-manager-authority-fixtures`
Base: `0c1bc49` (reviewed TASK-027N integration)
Status: implementation and disposable-local verification complete; independent security review clear and local parent integration complete. Publication pending.
Date: 2026-10-05

## Outcome

The legacy SQL authority test retains initial/default state, grants and RLS checks, trusted manager bootstrap and original-role guard, and actual-role AAL1/no-manager denials. It no longer treats a simulated JWT as a positive MFA session. Its manager-positive cases now run in the existing local Auth/PostgREST HTTP fixture after password sign-in and real TOTP enrollment, challenge and verification yield an AAL2 token. Trusted local SQL is used only to create/remove fixtures, change target evidence for adversarial tests, and read authoritative results.

The HTTP fixture covers normalized/exact request retry, changed and cross-operation UUID denial, stale and no-op revisions, invalid policy/admission input and target, target email/campus verification loss and reactivation, another manager's same UUID, genuine AAL2 admin and ordinary account denial without a manager grant, continued AAL2 manager policy authority after the manager's own Auth email changes to non-UNC under the user's rejected ADR-0033, manager revocation before retry, missing capability and availability singleton, audit/receipt counts and immutability, actor-deletion manager cascade with retained historical receipt, target-deletion admission cascade, and AAL2 manager denial for target profile, private photo, private place and Hangout chat. Denials leave management audit unchanged. No database guard or product authorization code changed.

## Evidence

- Clean disposable migration replay through `20261005000600` succeeded.
- Full database suite after a separate clean reset: 29 files, 1,686 assertions, all passed.
- Focused manager authority HTTP suite: 1/1 passed from clean reset with genuine local Auth TOTP AAL2, including the three independent-review coverage additions.
- Final guarded reset and nonsecret readback: availability false; all capabilities off; both legacy Hangout gates false; zero Auth users, managers, management audit/receipts, Hangouts and Storage objects.
- Source format and whitespace checks passed.

## Remaining work

Obtain a fresh security review of the assertion mapping and temporary SQL setup/readback boundary, then integrate only reviewed changes. The separately bounded manager concurrency fixture remains TASK-027R. No hosted write or production operation occurred.
