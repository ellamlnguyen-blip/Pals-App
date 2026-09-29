# TASK-025 — UNC pilot critical path

Status: In progress
Date: 2026-09-29

## Goal

Turn the existing locally verified Pals MVP into a small, safe UNC staging pilot with the shortest release path. Keep verified student access, privacy/RLS, Hangout creation/joining, chat, blocking/reporting, and human moderation in scope.

## Required release path

1. Deploy the existing `apps/web` production build to an HTTPS staging origin.
2. Configure the authorized nonproduction Supabase project with the reviewed migration set and exact staging callback/site origin.
3. Configure custom SMTP and verify a controlled UNC mailbox can complete confirmation and sign-in.
4. Keep safety gates default-off until deployed smoke tests pass; then enable only reviewed pilot gates in nonproduction.
5. Verify the moderator console with named least-privilege operators, audit logging, suspension/ban/reinstatement, and Hangout disable actions.
6. Seed only genuine, approved pilot Hangouts and run the short core-loop rehearsal.

## Explicit deferrals

- Pause exhaustive TASK-021 static migration/modeling; resume only when a concrete staging check finds a missing migration or unsafe permission.
- Defer TASK-024 visual correction until the pilot path is usable. It is a polish task, not a pilot safety dependency.
- Defer attendance, analytics expansion, large-Hangout operations, domain cutover, Realtime, and mobile work unless a pilot safety check requires them.

## Essential safety checks

- Verification rejects non-UNC identities and unconfirmed accounts.
- RLS and server actions enforce caller, campus, membership, block, report, and moderator-role boundaries through direct API calls as well as the UI.
- Public Hangouts expose approximate areas only; private location stays owner/authorized-member data.
- Blocked users cannot discover, join, message, or report through a path that reveals private target data; unblock does not restore prior access.
- Reports retain minimum reviewer-safe information, and moderator actions are audited and limited to authorized operators.
- Suspension, ban, reinstatement, and one-way Hangout disable are tested with a second account after session refresh.
- Production build is tested at desktop and 390px phone widths for loading, empty, error, denied, and sign-out states.

## Exit criteria

- `/api/health` is green for the deployed build without exposing secrets.
- One controlled UNC mailbox completes confirmation, onboarding, Hangout create/join, chat, block/report, and sign-out/sign-in.
- A named moderator can review and resolve a test report and the audit trail is retained.
- Backup/rollback, cleanup, incident contact, and pilot participant list are documented.
- Staging URL and exact tested build SHA are recorded in `docs/operations/CURRENT_STATE.md` and this handoff.
