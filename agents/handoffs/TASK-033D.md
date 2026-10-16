# TASK-033D handoff — chat poll web integration

Status: scoped source candidate for coordinator review. Worker did not stage, commit, push, deploy, or run a hosted operation.

## Outcome

- Added cookie-bound, caller-header checked, no-store `/api/polls` GET/POST. It validates the exact Hangout ID or accepted DM generation and peer, bounds page size to 24, validates action IDs and poll text/options, and calls only the four accepted RPCs. DM requests additionally check the current consent projection and first-message body access. Backend RPCs repeat source authorization under current locks.
- Added a shared poll view to authorized Hangout and accepted DM thread bodies. It shows the question, aggregate counts, own choice, creator close action, 24-item older page and native create form with 2–6 options. It states that changes in small-group totals may reveal a choice and notes the five-per-hour limit before creation. No voter list or new notification path.
- A pending action freezes its key/payload for uncertain retry. A fresh list read precedes each mutation. Poll state and request keys clear on component unmount, hidden/pagehide/focus recheck, and parent thread auth/denial masking. Stale responses are dropped by generation tickets. A pending DM request or paused body does not mount polls.
- Vote success is reconciled against both the RPC receipt and a fresh authorized poll projection; an exact retry whose earlier choice was superseded never claims that choice was saved. A mutation 403 masks private poll data immediately, then rereads current source access to distinguish a closed/unavailable poll from source revocation. A create 22023 response gives neutral form or five-per-hour guidance.
- Styling follows existing chat tokens and controls, with mobile width handling and native focus behavior.

## Exact worker files

`apps/web/app/api/polls/route.ts`; `apps/web/app/chats/chat-polls.tsx`; `apps/web/app/chats/chat-polls.css`; `apps/web/app/chats/poll-input.ts`; `apps/web/app/chats/poll-input.test.mjs`; minimal mounts in `apps/web/app/chats/hangouts/[id]/thread.tsx` and `apps/web/app/chats/direct/[id]/thread.tsx`; this handoff. Unrelated co-host/notification work in the shared checkout was untouched.

## Verification and remaining gates

- Focused poll input and vote reconciliation tests: 2/2 passed. Prettier and `git diff --check` passed on worker changes. Full `tsc --noEmit -p apps/web/tsconfig.json` reported existing unrelated missing package/type errors; a filtered rerun found no poll or thread diagnostics. Scoped ESLint produced no diagnostics for over two minutes and was interrupted; no lint pass is claimed.
- Web reference `https://usepals.com/` was attempted but inaccessible through the available browser tool; followed `docs/ux/DESIGN_DIRECTION.md` and existing tokens/components.
- Coordinator must review source, run HTTP and actual create/vote/change/close/reload/fresh-auth/denial checks, and verify desktop/narrow render. Final application build and hosted persistence remain coordinator gates.
