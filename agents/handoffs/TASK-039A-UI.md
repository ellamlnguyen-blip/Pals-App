# TASK-039A UI handoff

Status: bounded source candidate, pending coordinator review and predecessor integration gates.
Branch: `agent/TASK-039A-quiet-chat-ui` from `origin/main` with exact TASK-038 source `f04a4a39eda28718e06ac316a28af92f226e188a` merged at `b6007c359fecb0863296302af6c97974d5357e4d`.

## Outcome

- Removed redundant Hangout/direct row subtitles and thread-header eyebrows while keeping Hangouts/Messages category tabs, names, masked avatars, selection and unread dots.
- Kept Hangout detail title navigation and changed its displayed New York date/time to `date · time ET · public place` without changing stored instants.
- Hid visible composer labels with semantic labels retained for accessible textareas. Removed idle Hangout empty card, redundant ready/empty statuses and direct composer instruction. Send, retry, denial, error, request and paused/opt-out feedback remain.
- Moved the Hangout history/block explanation into native keyboard-accessible `Chat privacy` details. Request controls and current DM consent policy remain until separately accepted/enforced TASK-039B.

## Verification

- `node --test apps/web/app/chats/chat-date.test.mjs apps/web/app/chats/combined-projection.test.mjs apps/web/app/chats/thread-attention.test.mjs`: 9 passed.
- `next build --webpack` from `apps/web`: passed compilation, TypeScript and route generation using existing cached dependencies; no manifest/lock change.
- Prettier on changed files and `git diff --check`: passed.
- Targeted ESLint: blocked by pre-existing `react-hooks/immutability` in `combined-inbox.tsx` at line 123, where `read` is recursively referenced before declaration. This region was not modified in TASK-039A.
- Live `https://usepals.com/` reference could not be fetched by the available web reader; authoritative design direction and existing local tokens/components were used.
- Authenticated rendered desktop/phone QA: pending local preview check.

## Risks and remaining gates

This is a presentation-only candidate. It neither changes DM authorization nor removes request paths. The coordinator owns review, documentation status, predecessor acceptance and canonical-main integration. No hosted operation performed.
