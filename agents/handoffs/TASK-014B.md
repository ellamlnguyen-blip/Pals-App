# TASK-014B local DM UI handoff

Status: implementation branch pushed for independent review; TASK-014B remains incomplete until signed-in local Auth/render checks and review. Coordinator owns canonical integration and shared records.

## Baseline and scope

- Isolated branch `agent/TASK-014B-dm-ui` from independently verified canonical `origin/main` `9b76bcc19850f28b856a770f9539ad1608a7f670`.
- Accepted ADR-0016 and the published TASK-014B contract govern this disposable-local UI. No migration, backend RPC, Realtime, hosted enablement, notification or Hangout authorization change.
- GPT-6 Sol medium was specified by the coordinator. The dispatch tool did not expose a speed selector, so Standard speed was not independently verified here.

## Outcome

- Added no-store, loopback-guarded, current-session HTTP endpoints for DM inbox, request creation, status/messages and transitions. The actor header only binds the original page account to the server-derived session; the database RPC remains the authority. Request creation rechecks current People detail before attempting the first message.
- Added People-detail first-message request composer and consent copy; retained the exact UUID/body for deliberate uncertain-result retry. Updated People block confirmation and action messages for local DM teardown and unchanged Hangout access/chat.
- Added Requests and Direct chats areas beside existing Hangout chats. Active but temporarily unready accounts can reach minimal DM management; Hangout chat keeps its independent ready-account gate. Inbox text uses only the authorized first-body projection. Unknown peers show a neutral label and full participant-owned ID.
- Added direct route with pending-recipient accept/reply/ignore, outgoing waiting/withdraw, accepted send/pages/close, paused cleanup, ready-caller People block, generic denials and explicit same-payload retries. Bodies render as literal React text with line breaks, server time and You/Peer. Client masks on visibility/pagehide/auth changes, discards stale requests, and polls only the visible page.
- Added `docs/ux/TASK-014B-INTERACTION-PLAN.md`. Live `usepals.com` was attempted via web and in-app browser on 2026-09-23 but failed DNS/navigation; existing direct reference observations and current tokens/components guided the implementation.

## Verification

- Final `pnpm check` passed: formatting, lint, workspace typecheck, 23 unit tests, and web/admin production builds. The build includes `/api/dm`, `/api/dm/[id]`, `/chats`, and `/chats/direct/[id]` as dynamic routes. `git diff --check` passed.
- With a non-secret dummy local publishable key and no Supabase service, a local Next server returned neutral 403 JSON with `Cache-Control: private, no-store` for anonymous inbox GET, direct GET and request POST. That server was stopped.
- Real signed-in Auth/PostgREST/web action and rendered desktop/tablet/390px/320px/keyboard checks were **not** run. Existing disposable Lima `pals-task002` reached VZ running and Ubuntu serial login, but `limactl start` timed out with `did not receive an event with the running status`; host-agent log showed vsock forwarder `bad file descriptor`, SSH/usernet fallback, and no Docker socket. The failed VM was force-stopped; `pnpm db:start` without that runtime reported `docker: command not found`. No fixtures or gates were changed.

## Review focus and remaining gates

- Run the contract's real local Auth/HTTP and browser matrix before acceptance: visible/hidden targets, all pending/accepted/paused/terminal states, exact-key retry and changed-body conflict, stale generation, pagination, no-store/escaping, cross-tab auth transitions, bfcache and in-flight response invalidation, direct and People block copy, and preserved Hangout chat. Restore all local gates false and clean fixtures after testing.
- Review request/transition response uncertainty, account binding, paused management and UI masking at the exact pushed tip. The current branch is intentionally unintegrated; TASK-014 is not complete and no next product task is authorized from this stage alone.
