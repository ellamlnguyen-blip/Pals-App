# TASK-037 UI and poll retirement handoff

Status: reviewed local source candidate; incomplete until predecessor release gates and accepted main integration. Branch `agent/TASK-037-chat-categories`; starting HEAD `c977d557143226b70963a6f9362eda6a856be9fa` (canonical main `389967c` plus exact TASK-036 source `1fac4f6`). Task branch SHA and publication are recorded in the coordinator status receipt.

## Outcome

- Chats sidebar now has Hangouts and Messages controls; each uses the existing caller-bound `list_my_chat_attention` source with the original order and unread flags. The server scans up to eight complete 24-item combined source pages to find category matches. A sparse category can return an empty page with an explicit continuation cursor and UI instruction to continue, so no source items are skipped or global counts invented. Category changes clear rows/cursors and reauthorize; the direct-thread mobile back link opens Messages. Message requests remain reachable from either category and incoming request rows appear in Messages. The extra Conversations copy was removed to match the reference layout.
- The Chats page heading is visually hidden but retained for screen readers. The Hangout title links to saved details; the separate text detail action is removed and the time/public place strip remains. Direct-chat peer identity now comes through the actor-scoped thread API after DM and People authorization checks, and is cleared with messages on account transitions, visibility changes, denial or confirmed block. Opted-out or unavailable peers retain the generic header. No identity is inferred from a UUID.
- Removed both poll mounts, poll UI/input modules and `/api/polls`. Additive migration `20261016000100_retire_chat_polls.sql` revokes authenticated execution of the four public poll RPC signatures while retaining private poll/option/vote/retry tables and rows. The prior pgTAP fixture is preserved as `.historical.sql` outside the current test glob; the new current fixture checks grants, SQL execution denial and retained tables. No old migration changed.
- Updated MVP, messaging, UX design direction and migration README to reflect ADR-0044's supersession of the poll clause.

## Evidence

- `node --test apps/web/app/chats/combined-projection.test.mjs apps/web/app/chats/thread-attention.test.mjs tests/chat-page.test.mjs`: 9 passed after coordinator fixes. Category tests cover mixed source pages, source cursor continuation, and an empty bounded category page. `git diff --check` and changed-source Prettier checks passed.
- Synchronized this branch into the disposable `/private/tmp/pals-task032-runtime/apps/web` preview and ran `next build --webpack`: compilation, TypeScript and route collection passed. The route list contains no `/api/polls`.
- Applied `20261016000100_retire_chat_polls.sql` only to `supabase_db_pals-task029-disposable` after confirming the previous authenticated grant. The current `chat_polls_retired_037.test.sql` pgTAP suite passed all 9 checks, including four grant denials, four SQL execution denials, and private table retention. No hosted database was touched.
- Real in-app browser checks at 1280 and 375 px: Hangouts and Messages switched and showed only their own rows; the request row was reachable, the selected row showed, the Hangout title pointed to saved details, no poll controls or horizontal overflow appeared, and direct chat displayed the authorized peer identity. Screenshots: `docs/ux/evidence/task037-local/desktop-hangout.png`, `mobile-inbox.png`, `mobile-messages.png`, `mobile-hangout.png`, `mobile-direct.png`. Illustration-only faces/messages in the supplied sample were not inserted.
- A fresh reviewer found one direct-header identity leak on account transition. The coordinator moved that identity into the client masked thread read; the reviewer rechecked and cleared the finding.

## Review and remaining gates

The implementation and local verification are complete. Publish and independently verify the task branch and docs-only main status receipt. Earlier TASK-032/033/034/035/036 gates remain open, so application code stays off main. Any hosted application/database change remains outside this local candidate and requires the existing final sign-off gates.
