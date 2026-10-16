# TASK-036 UI handoff

Status: scoped implementation ready for coordinator review on `agent/TASK-036-chat-reference-ui`. No commit, push, hosted change, schema change or shared status edit was made by this agent.

## Outcome

- `/chats` now presents a visible blue Chats heading and the authorized combined inbox in a rounded sidebar beside an empty-selection pane. Conversation rows retain their original server order, unread marker, request status, cursor paging and caller-bound `/api/chats` reader. A message-request cue counts only incoming requests on the currently loaded page and says so; all conversations stay in the one paged list.
- Hangout and direct routes reuse the sidebar and show their existing threads in a right pane. The current row is marked with `aria-current`. At 700px and below, thread routes show a back link to the list and hide the sidebar; the index shows the list. The site header is unchanged.
- Both thread routes show the visible Chats page heading and a route-specific detail title. Hangout threads use the existing `pinCue` from the authorized Hangout title/description, plus its actual start time and public place in a concise strip with the Hangout detail link. The real empty-message state remains intact. DM headers stay generic because a current peer name is not available in that route's authorized thread response. No sample people, faces, messages, counts, previews or activity details were added.
- Chat bubbles, composer spacing, loading/empty/error surfaces and safety actions received scoped CSS treatment. Existing send/retry, polling, attention, message pagination, request management, ChatPolls and block/report controls remain in place.
- Hangout message author display now uses the current authorized `author_label` or a neutral participant label; a UUID is no longer presented as identity. The direct thread no longer prints the peer UUID as a decorative header.

## Evidence and remaining checks

- `git diff --check` passed.
- Eight focused tests passed with `node --test apps/web/app/chats/combined-projection.test.mjs apps/web/app/chats/thread-attention.test.mjs apps/web/app/chats/poll-input.test.mjs`.
- Dependencies are absent in this worktree, so production web build/TypeScript and browser rendering were not run here. Coordinator should verify desktop and 375px index/Hangout/DM routes, genuine empty thread, denied/loading/error states, selected row, keyboard focus, composer/send, polls and overflow in its configured local environment.
- `https://usepals.com/` inspection was attempted; DNS resolution failed in this environment. Existing design direction and supplied reference description informed the scoped layout.
- No live or hosted backend reads/writes were performed. The source dependency and release/signoff gates remain as recorded in the task contract.

## Coordinator review — 2026-10-16

- Reviewed the bounded diff against the TASK-035 source dependency. The existing combined reader, access checks, message requests, polling, unread projection, poll controls and safety boundaries remain the data/permission paths. The new sidebar is a second presentation of the existing caller-bound list on conversation routes. No example identities or messages from the reference were introduced.
- Built the synchronized disposable local web preview with `next build --webpack`; build and TypeScript passed. Re-ran the eight focused chat tests, `git diff --check`, and Prettier checks after the final composer and mobile-header adjustments.
- Inspected real local `/chats`, Hangout and direct routes at 1280px and 375px in the in-app browser. The Hangout sidebar selected row exposes `aria-current="page"`; mobile list and thread have a clear back path. No horizontal overflow at either width. The actual Hangout has no messages and the available direct route is a pending request, so screenshots honestly show those states. A draft enables the Hangout Send button; the draft was cleared without sending. Poll creation control remains reachable. Loading, denied and error branches remain in the existing components but could not be forced with the authorized local fixtures.
- Screenshots: `docs/ux/evidence/task036-local/chats-hangout-1280.png`, `chats-direct-1280.png`, `chats-hangout-375.png`, `chats-list-375.png`.
- The image's sample participant photos, message previews and filled thread cannot be represented by this fixture. The unified list remains intact from the user's prior instruction, so a decorative Hangouts/Messages switch was not added. The right pane of `/chats` asks the user to pick a conversation; an actual route shows the selected thread.
- Parent TASK-032/033/034/035 gates still prevent app-main integration. This candidate is for task-branch publication only until those gates clear.
