# TASK-027L — Caller-session launch policy controls

Branch: `agent/TASK-027L-caller-policy`
Base: `baccedae0c780eb7ed7edeeead87679c2cf0b5fe`
Status: implemented locally; independent review and parent integration pending
Date: 2026-10-05

## Outcome

Added `/policy` to the existing admin app, reusing its password/TOTP session flow and avoiding any dependency on the closed moderation source gate. The form takes an allowlisted key, desired boolean, manual current revision from the separate read-only preflight, bounded reason and explicit exact-target confirmation. It creates a fresh request UUID, calls only `set_pilot_policy` with the caller's publishable-key session, shows the returned revision/request receipt, and retains the exact pending payload for an uncertain-response retry. Analytics and large-Hangout safeguards are unavailable. A denied response or session change clears private form state. The API enforces exact Origin, current fixed Ella ID, active account, admin role, Auth AAL2 and verified TOTP preflight. The database's live manager MFA guard remains final authority. All API responses are private/no-store through the existing server helper. No hosted gate changed.

## Verification

- Policy input/preflight tests passed alongside existing admin tests, 15/15 total. TypeScript and the final Next production webpack build passed with only `/policy` and `/api/policy` added.
- Local API with mismatched Origin returned 403 and `private, no-store`; local request without cookies returned the same.
- Genuine disposable local Auth flow: fixed Ella-shaped test user and local admin/manager, password sign-in, TOTP challenge/verification, AAL2 `hangouts` on revision 1→2, exact UUID/payload retry returning revision 2, off revision 2→3. Browser form then performed on 3→4 and off 4→5 with visible receipts. Database readback showed hangouts off, availability off, and four policy audit/request receipts.
- Rendered desktop policy form and narrow 375px form; the narrow document width was 360px, with no horizontal overflow. The narrow sign-in state also rendered.
- Disposable local database reset through migration 006. Readback: fixed test user, managers, platform roles and management audits all zero; availability false revision 1 and enabled capabilities zero. Synthetic TOTP secret/cookies were removed.

## Boundaries and review note

There is no explicit email or campus recheck in TASK-027L. Its own-role UI preflight passes through TASK-027J's `roles_owner_read` RLS, which checks current UNC evidence. Thus this screen can deny after Ella loses UNC evidence even while an already authorized AAL2 manager could call the ADR-0034 RPC directly. This difference follows existing role visibility and should be assessed in independent review against the user's preference not to add repeated UNC checks. The form requires a separate read-only current-revision preflight; it does not expose private policy tables. Stale revisions fail closed through the existing RPC and require reconciliation before a new request.

No staging/production deployment, hosted role grant, policy change or domain cutover occurred here. The parent coordinates security review, integration and any hosted sequence.
