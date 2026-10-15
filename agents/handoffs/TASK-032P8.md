# TASK-032P8 notification attention handoff

Status: isolated candidate, pending fresh review, rendered runtime verification, parent gates and Ella's hosted sign-off. Branch: `agent/TASK-032-interaction-photos`; baseline `57bbacb1b88b4ca1f05527e1a76e0561ad218212`.

## Outcome

- Moved Chats and Notifications from primary text navigation into 44px envelope and bell controls beside the avatar. The bell displays an accessible, server-backed unread dot; account transitions and hidden/BFCache conceal it. Summary refreshes on route/focus/visibility, every 30 seconds, and after a same-tab or cross-tab acknowledgment.
- Removed the marked visible Notifications introduction and recent-update sentence. Kept a visually hidden h1. Refresh is a labeled arrow button.
- Added owner-only notification attention summary and cutoff acknowledgment RPCs over existing `private.notification_items.read_at`. Both follow gate/recipient locking, recheck active account state, and expose no source details. The inbox acknowledges only after a validated visible load; failed reads or acknowledgments never claim a clear. The prior per-item read and preferences APIs remain.

## Evidence

- Scoped ESLint, `tsc --noEmit -p apps/web/tsconfig.json`, and `git diff --check` passed.
- `node --test tests/notifications-auth.test.mjs tests/notifications-ui.test.mjs`: 5/5 passed.
- `next build --webpack`: passed. Default Turbopack build could not traverse the preexisting external `node_modules` symlink in this worktree.
- Parent applied the committed migration candidate to named disposable DB `supabase_db_pals-task029-disposable` and ran the rollback-only pgTAP fixture: 15/15 passed. The fixture was then made self-contained by explicitly enabling the notification gate; parent will rerun that revision.

## Remaining gates

Parent owns rerunning revised SQL test, desktop/narrow rendered behavior and fault checks, fresh security/design review, task publication and remote SHA verification. Hosted migration/application changes remain pending Ella's explicit candidate sign-off and existing release gates. No hosted operation or data reset occurred in this task branch.

## Review follow-up

- A notification-summary 403 now masks the bell badge without reloading the entire page, so a disabled notification gate cannot cause a healthy header to reload repeatedly. Existing auth transition handlers still conceal account chrome when the account changes.
- If snapshot acknowledgment is unconfirmed, the visible inbox shows “Could not mark updates as seen. Refresh to retry.” The existing refresh button loads a new snapshot and retries. Both confirmed failure and a lost response trigger a fresh server summary; the client never reports a successful acknowledgment without its response.
- Follow-up checks: scoped ESLint, TypeScript, five notification auth/destination tests, `git diff --check`, and `next build --webpack` all passed.
- A failed secondary `Frame` account lookup now leaves the page and icon controls usable with the attention badge unverified. With no actor, polling waits until a subsequent server navigation supplies one; the lookup cannot crash an already resolved route.
- A bell click while already on `/notifications` now refreshes the first inbox page through its existing probe and visible-load acknowledgment path. This lets a later arrival shown by the bell poll be loaded and acknowledged without leaving the route. Cross-route bell navigation is unchanged.
