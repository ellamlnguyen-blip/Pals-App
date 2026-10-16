# TASK-037 coordinator status — reviewed local candidate

Status: local implementation and verification complete; full task remains active behind TASK-032/033/034/035/036 release and accepted application-main gates. No hosted change or app code was integrated to main. Canonical main before this status milestone: remote-verified `389967c3d5ff94d81509fc47ce2db564949b4fb4`. The implementation branch `agent/TASK-037-chat-categories` is independently remote verified at `8aa18c5a8d8ee99d5d9164583c00bad432106720` and contains `agents/handoffs/TASK-037-UI.md`, source and screenshots.

## Outcome and evidence

- Hangouts and Messages now have separate sidebar categories on the existing authorized, ordered attention source; Message requests remain reachable. The visible Chats title and redundant sidebar copy are gone, while an accessible page heading remains. Hangout title opens its details; the separate detail link is gone.
- Both chat poll mounts and the web polls API were removed. Additive migration `20261016000100_retire_chat_polls.sql` revokes the four authenticated poll RPCs while retaining private poll records. It was applied only to `supabase_db_pals-task029-disposable`; the new current pgTAP suite passed 9/9, including runtime SQL denial and retained-table checks. No hosted database was touched.
- The direct-chat header now takes the peer name/photo from the same actor-scoped, People-checked thread response and clears identity on auth transition, denial, visibility mask and confirmed block. A fresh reviewer found the initial server-rendered identity leak, then re-reviewed and confirmed the fix. Category cursor and migration review found no further issue.
- Production `next build --webpack` passed compilation and TypeScript from the synchronized disposable runtime. Nine focused Node tests passed; formatting and diff checks passed. Real authenticated browser checks at 1280/375px covered category switching, request row, selected row, direct identity, hidden heading, title link, poll absence and no horizontal overflow. Evidence images are on the task branch under `docs/ux/evidence/task037-local/`.

## Limits and next gate

The fixture Hangout has no messages and the available DM is a pending request, so the reference image's illustrated message exchange and photos were not fabricated. Earlier release and integration gates remain open; reviewed TASK-037 app code stays on its task branch. This documentation milestone records that state on main. The task agent used GPT-6 Sol with medium reasoning; dispatch had no speed control, so Standard speed could not be independently verified.
