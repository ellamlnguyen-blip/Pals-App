# TASK-033NU handoff — notification inbox actions and settings

Status: source candidate for coordinator review. No task branch commit, push, database change, runtime gate, or hosted operation was performed by this agent. Shared checkout also contains unrelated TASK-033D/E edits and dependency directories; stage only the files listed below.

## Scope delivered

- Inbox renders inline accept/decline controls only for a source checked `friend_request` row whose friendship source and target IDs match. The existing `changeFriendship` server action rechecks the current peer relationship and exact generation before its authoritative RPC. Unavailable, stale and uncertain responses cannot silently apply to a newer request.
- Inbox mounts the reviewed `CohostInvitation` leaf only for an authorized `hangout_invitation`/`cohost_invitation` row with validated invitation and Hangout IDs. Activity and one-hour reminder codes link to the saved Hangout reader using the source checked target; neutral rows do not link or offer actions.
- Three independent optional, default-off activity preferences appear at `/account/notifications` via the Account page. The route reads owner preferences through a dedicated no-store GET and persists each setting through existing `set_notification_preference`; it rereads committed values before displaying them. The original four inbox category controls remain. The settings route does not fetch inbox rows or acknowledge attention.
- No client notification creation, job, direct ledger write, new dependency or backend schema was added.

## Files to stage

`apps/web/app/account/account.css`, `apps/web/app/account/page.tsx`, `apps/web/app/account/notifications/page.tsx`, `apps/web/app/account/notifications/settings.tsx`, `apps/web/app/api/notifications/route.ts`, `apps/web/app/notifications/notifications-inbox.tsx`, `apps/web/app/notifications/notifications.css`, `apps/web/lib/notification-destination.ts`, `apps/web/lib/notification-destination.test.mjs`, `apps/web/lib/notifications.ts`, `agents/handoffs/TASK-033NU.md`.

## Verification and remaining gates

- `node --test apps/web/lib/notification-destination.test.mjs`: 2/2 passed, covering new code destinations, neutral/invalid rows and exact friendship generation extraction.
- Scoped Prettier applied. Scoped ESLint gave no output for over 90 seconds and was interrupted; it has no pass claim.
- `tsc --noEmit -p apps/web/tsconfig.json` is blocked by pre-existing missing workspace package exports and dependencies (`@phosphor-icons/react`, `RichPeopleDetail`, profile validation types, `react-easy-crop`, `sharp`) across unrelated files. No new diagnostic appeared in this task's authored files apart from the same missing Phosphor import already present in the inbox.
- The live visual reference `https://usepals.com/` was requested through the browsing tool but inaccessible. Desktop/mobile rendered review and actual fresh-auth/browser flows remain coordinator gates.
- Fresh source review found and corrected a settings save race: focus/visibility/auth wake now defers owner GETs until an in-flight POST settles. Confirmed POSTs always reread persisted preferences afterward. Lost/uncertain responses keep controls masked and offer an exact same-choice retry; that idempotent POST must confirm before persisted values are reread and shown. Hidden or auth-changing responses cannot restore old values. This correction is in `settings.tsx`; no backend/API files changed in the fix. Scoped TypeScript still reports only the previously noted workspace errors, with no `settings.tsx` diagnostic.
- Rendered QA found the new settings route nested a `<main>` inside Frame's own main landmark. Both ready and unavailable wrappers now use `<div class="account-page">`, preserving layout with one main landmark.
- Coordinator to run full runtime/API and real owner persistence checks, inspect auth-transition and lost-response behavior, review the shared diff, stage only these files, commit/push and verify the remote SHA. Existing backend verification, named-environment persistence and final integration remain coordinator owned.
