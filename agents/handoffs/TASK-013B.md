# Handoff — TASK-013B local Hangout chat UI

Date: 2026-09-23
Agent: fresh GPT-6 Sol medium TASK-013B implementer; the dispatch tool did not expose or verify Standard speed
Branch/worktree: `agent/TASK-013B-hangout-chat-ui`, `/Users/ellanguyen/.codex/worktrees/task-013b-chat-ui/Pals App`
Dispatch baseline: `4e1ca92f20d715cdf0a92d40846819d83845969c`, independently remote-verified canonical main by the coordinator before dispatch
Verified implementation branch push: `916f96b08b9fbb20c2abb16732c60a6ec544ba18` (`git ls-remote origin refs/heads/agent/TASK-013B-hangout-chat-ui` matched local `HEAD`)
Canonical main integration: pending coordinator review; this agent made no main merge
Main status records: `tasks/NOW.md`, `docs/operations/CURRENT_STATE.md`, and parent TASK-013, owned by the coordinator

## Outcome

- Added a local Chats path and saved Hangout detail entry. The list uses a 24-candidate deterministic `hangout_id` keyset page from existing RLS-authorized current membership. Every candidate and the detail entry require a fresh successful `read_hangout_messages` RPC, including valid empty responses, before a thread link appears. Denial has neutral text and no clickable link.
- Added a directly guarded Hangout thread and no-store GET/POST API. The server derives the caller session and enforces the existing local target guard; the accepted chat RPC remains authoritative. The page account ID is carried only as an anti-stale-account check, never as an authority grant.
- The thread renders literal escaped text with line breaks, server time, and only `You`, a currently projected participant account ID, or `Former participant`. No profile, photo, private-place preview, Realtime or direct table read was added. The composer explains future-joiner full history and that People blocking does not mute this local chat.
- Bounded 50-row forward paging, visible polling with full displayed-author reprojection, generation invalidation, hidden/pagehide masking, pageshow/focus reauthorization, and same-origin cross-tab signout signaling are implemented. Sending uses one UUID and frozen payload per composed message. Uncertain transport responses keep the same-key retry; known denial clears content and draft. Successful send restores focus to the textarea.

## Files Changed

Chat routes/components/style: `apps/web/app/chats/`, `apps/web/app/api/chat/[id]/route.ts`, `apps/web/lib/chat.ts`.
Navigation/detail entry: `apps/web/app/hangouts/saved/[id]/page.tsx`, `saved.css`, Hangouts shell, Calendar, People, and shared Frame signout signal.
Plan and tests: `docs/ux/TASK-013B-INTERACTION-PLAN.md`, `supabase/tests/chat-ui-http.integration.mjs`.

## Tests / Verification

- `pnpm check`: pass on final implementation tree (format, lint, types, 20 Node tests, web/admin builds). `git diff --check`: pass.
- Focused real local Auth/PostgREST and Next web test: `WEB_TEST_ORIGIN=http://127.0.0.1:3000 node --test supabase/tests/chat-ui-http.integration.mjs`: pass. It covered anonymous/discoverer denial, gate off while public membership remained, guarded list/detail/direct route, 24-candidate keyset pagination, empty authorized thread, no-store API, exact-key retry and changed-payload conflict, 50-row forward page, post-leave author redaction, left/removed/cancelled/readiness denial, and stale page-account read/send denial.
- Coordinator inspected the running local page with CUA because this subagent's in-app browser refused attachment. At 1280, 768, 390 and 320 pixels, saved-detail link, populated Chats row, direct thread, empty/composer, and layout rendered. After the primary-nav style fix, document scroll width equaled client width at 768/390/320. At 320, Enter inserted a second textarea line without sending; the explicit button sent one message, retained line breaks in display and cleared the draft. A post-send keyboard focus loss was found and fixed by returning focus to the textarea; that final focus change was typechecked but not browser-retested.
- The temporary test and visual accounts, Hangouts, messages and ledgers were removed. Final local query returned Hangout gate `false`, chat gate `false`, zero chat messages and zero `chat-%` Auth users. The web server, Supabase services and Lima VM were stopped; ignored `.env.local` and temporary fixture files were removed. No hosted environment was touched.

## Decisions

- Used the existing public participant `hangout_id`/`account_id` grant and RLS for list candidates. The `state` column is intentionally not readable by clients, so the list never filters it directly. Fresh chat RPC authorization is still required for every candidate.
- Re-read displayed pages during visible polling so an author who later leaves or loses readiness does not leave a stale account ID projected in the UI. Message text is never placed in a shared cache, URL or localStorage.
- Preserved hidden uncertain-send text/key only in component memory while removing it from the DOM. Return requires a fresh read and the original page-account match before redisplay. Account change and denial erase it.

## Known Limitations / Review Focus

- This is disposable-local polling, not hosted messaging or Realtime. People blocks remain People-only under Accepted ADR-0015; TASK-016 must resolve global block and moderation policy before hosted chat.
- Browser automation in this task-agent thread was unavailable. The coordinator's rendered check covered layout and a normal send, but hidden/pagehide/bfcache, cross-tab signout, lost-response retry, changed draft after uncertainty, stale in-flight read after denial, and the final post-send focus fix were not independently exercised in a browser. The UI has explicit code paths for each; a fresh reviewer should test those paths before integration. The focused HTTP suite verifies database and route outcomes, not browser lifecycle behavior.
- `pnpm db:verify` was not rerun because B changed no schema/RLS/backend function. The reviewed TASK-013A backend tests remain the database authorization evidence.

## Follow-up / Ownership

The coordinator owns a fresh security/design review, any browser lifecycle follow-up, shared status/main integration, and remote verification of main. This stage does not start TASK-014 or hosted work. No new ADR or backend change was needed.
