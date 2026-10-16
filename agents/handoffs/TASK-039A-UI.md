# TASK-039A UI handoff

Status: bounded source candidate, pending coordinator review and predecessor integration gates.
Branch: `agent/TASK-039A-quiet-chat-ui` from `origin/main` with exact TASK-038 source `f04a4a39eda28718e06ac316a28af92f226e188a` merged at `b6007c359fecb0863296302af6c97974d5357e4d`.
Publication receipt: task candidate `9c91f31024e37e58f1fb3a80493885ec5e2f95e7` and canonical `main` `55a6326bf96a32c0fa95edcd6109e81ce415769b` independently verified with `git ls-remote origin` on 2026-10-16. The later handoff receipt commit is reported to the coordinator separately; application-main integration remains gated.

## Outcome

- Removed redundant Hangout/direct row subtitles and thread-header eyebrows while keeping Hangouts/Messages category tabs, names, masked avatars, selection and unread dots.
- Kept Hangout detail title navigation and changed its displayed New York date/time to `date · time ET · public place` without changing stored instants.
- Hid visible composer labels with semantic labels retained for accessible textareas. Removed idle Hangout empty card, redundant ready/empty statuses and direct composer instruction. Send, retry, denial, error, request and paused/opt-out feedback remain.
- Moved the Hangout history/block explanation into native keyboard-accessible `Chat privacy` details. Request controls and current DM consent policy remain until separately accepted/enforced TASK-039B.

## Verification

- `node --test apps/web/app/chats/chat-date.test.mjs apps/web/app/chats/combined-projection.test.mjs apps/web/app/chats/thread-attention.test.mjs`: 9 passed.
- `next build --webpack` from `apps/web`: passed compilation, TypeScript and route generation using existing cached dependencies; no manifest/lock change.
- Prettier on changed files and `git diff --check`: passed.
- Named disposable preview `/private/tmp/pals-task032-runtime` rebuilt with unchanged `.env.local` and restarted at `http://127.0.0.1:3035`. Authenticated browser checks at **811×900** and **375×812** captured visual views of the empty Board games Hangout and pending Alex direct thread. Both had `documentElement.scrollWidth === innerWidth`; desktop split pane and phone back navigation worked. The Hangout header/title, `Oct 15, 2026 · 5:00 PM ET · Carolina Union` strip, empty open message area, semantic Message textarea label, collapsed/expanded privacy details and 44px summary target were verified. Direct header/row omit subtitles, and pending request withdrawal and safety controls remained visible. The fixture had no accepted direct conversation, so that state was source/build checked but not browser rendered.
- Targeted ESLint: blocked by pre-existing `react-hooks/immutability` in `combined-inbox.tsx` at line 123, where `read` is recursively referenced before declaration. This region was not modified in TASK-039A.
- Live `https://usepals.com/` reference could not be fetched by the available web reader; authoritative design direction and existing local tokens/components were used.

## Risks and remaining gates

This is a presentation-only candidate. It neither changes DM authorization nor removes request paths. The coordinator owns review, documentation status, predecessor acceptance and canonical-main integration. No hosted operation performed.
