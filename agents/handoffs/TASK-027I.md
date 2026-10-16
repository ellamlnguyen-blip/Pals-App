# TASK-027I — Hosted admin MFA UI handoff

Date: 2026-10-05
Branch: `agent/TASK-027I-admin-mfa`
Status: Local implementation verified; parent integration and hosted checks pending.

## Outcome

The existing admin console now accepts an exact configured HTTPS staging origin and matching explicit Supabase project, while rejecting production and secret/service-role keys. Hosted cookies use HttpOnly, Secure and SameSite=Lax. Private API responses remain no-store, and all writes require exact Origin. The moderation route checks the caller's active account, current owner-visible operator role, AAL2 assurance and verified TOTP factor before forwarding to the five database RPCs; migration 003's live session/factor/role guard remains the final authority.

The console now has password sign-in, first TOTP enrollment with QR and same-phone manual key, returning-session challenge, locked/error states, and sign-out. It clears private report and MFA data on session/role loss; rechecks on focus and every 30 seconds in enrollment, challenge and ready states. Ordinary students have no MFA or operator approval step. Enrollment is default closed and can open only for an exact Auth user UUID with a UTC deadline within 24 hours. An unverified factor cannot finish challenge or verification after that window closes. Close the staging window immediately after Ella personally enrolls; factor loss requires separately reviewed recovery verification and a new temporary window. No agent should collect her secret.

## Verification

- Admin flow/security tests: 12 passed, including exact staging-origin validation, request Origin/HTTPS, hosted cookie policy, exact-subject enrollment expiry, and unverified-factor denial after expiry.
- TypeScript typecheck and Next.js production build passed with webpack using the existing dependency tree. Turbopack could not follow the temporary borrowed dependency symlink in this isolated checkout; no dependency or lockfile change was made.
- Rendered desktop and narrow-phone sign-in, loading and returning challenge states in the local browser. No horizontal overflow observed. Local cross-Origin MFA POST returned 403 with private no-store headers.
- Genuine disposable local Auth/UI flow: password sign-in, Auth TOTP enrollment and verification, AAL2 report workspace, sign-out, AAL1 returning challenge, second verification back to report workspace. Two synthetic local Auth accounts were removed. Local availability, onboarding and moderation gates were read back false after cleanup.
- A separate reviewer found and had fixed sign-out error reporting, password-only factor replacement risk, same-phone setup key, unverified-factor expiry, and MFA-state clearing. No remaining blocker was reported for those fixes.

## Integration dependency

With availability and onboarding closed, existing `roles_owner_read` RLS hides the operator's own role. The local UI test needed those gates temporarily enabled. Staging cannot safely open availability just to let Ella enroll before activation. Publish and review a bounded pre-activation operator-status/RLS change before hosted enrollment. Do not weaken general student access or use service-role proxying. This was not silently included in TASK-027I.

Hosted exact HTTPS configuration, Ella's personal factor enrollment and recovery check, migration 003/004 deployment, role bootstrap, enabled staging smoke and final release remain parent TASK-027 gates. This branch made no hosted mutation.
