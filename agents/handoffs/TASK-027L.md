# TASK-027L — Caller-session launch policy controls

Branch: `agent/TASK-027L-caller-policy`
Base: `baccedae0c780eb7ed7edeeead87679c2cf0b5fe`
Status: local implementation corrected after independent review; fresh re-review and parent integration pending
Date: 2026-10-05

## Outcome

Added `/policy` to the existing admin app, reusing its password/TOTP session flow and avoiding any dependency on the closed moderation source gate. The form takes an allowlisted key, desired boolean, manual current revision from the separate read-only preflight, bounded reason and explicit exact-target confirmation. It creates a fresh request UUID, calls only `set_pilot_policy` with the caller's publishable-key session, shows the returned revision/request receipt, and retains the exact pending payload for an uncertain-response retry. Analytics and large-Hangout safeguards are unavailable. A definite denied response or session change clears private form state. The API enforces exact Origin, current fixed Ella ID, active account, Auth AAL2 and verified TOTP preflight. It does not read `platform_roles` or UNC evidence for each policy action. The database's live manager MFA guard remains final authority. SQL permission denial is 403; transport, other RPC errors and malformed receipts return private/no-store 503, retaining the exact pending UUID/payload in the UI. No hosted gate changed.

## Verification

- Policy input/preflight and definite/uncertain outcome tests passed alongside existing admin tests, 16/16 total. TypeScript and the final Next production webpack build passed with only `/policy` and `/api/policy` added.
- Local API with mismatched Origin returned 403 and `private, no-store`; local request without cookies returned the same.
- Genuine disposable local Auth flow: fixed Ella-shaped test user and local admin/manager, password sign-in, TOTP challenge/verification, AAL2 `hangouts` on revision 1→2, exact UUID/payload retry returning revision 2, off revision 2→3. Browser form then performed on 3→4 and off 4→5 with visible receipts. Database readback showed hangouts off, availability off, and four policy audit/request receipts.
- Rendered desktop policy form and narrow 375px form; the narrow document width was 360px, with no horizontal overflow. The narrow sign-in state also rendered.
- Disposable local database reset through migration 006. Readback: fixed test user, managers, platform roles and management audits all zero; availability false revision 1 and enabled capabilities zero. Synthetic TOTP secret/cookies were removed.
- After the review correction, an attempted repeat of the genuine manager-MFA HTTP suite could not reach setup: local Auth returned 503 before signup while its container restarted from a Docker DNS failure resolving the healthy local database container. No new fixture was created. Earlier TASK-027N genuine Auth tests already proved manager revocation denial. This infrastructure failure is a retest limitation, not a passing L integration result.

## Boundaries and review note

There is no email, campus or `platform_roles` read in the policy action route. A live AAL2 fixed-subject caller without manager authority reaches the RPC and is denied there. The shared console's separate session display still passes through TASK-027J's `roles_owner_read` RLS, which checks current UNC evidence; it may hide this page after evidence loss even while the ADR-0034 manager RPC would allow an otherwise valid AAL2 manager. This existing UI limitation remains for parent review and avoids broadening this route fix. The form requires a separate read-only current-revision preflight; it does not expose private policy tables. Stale revisions fail closed through the existing RPC and require reconciliation before a new request.

No staging/production deployment, hosted role grant, policy change or domain cutover occurred here. The parent coordinates security review, integration and any hosted sequence.
