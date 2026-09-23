# Handoff — TASK-013B local Hangout chat UI

Date: 2026-09-23
Agent: fresh GPT-6 Sol medium TASK-013B implementer; the dispatch tool did not expose or verify Standard speed
Branch/worktree: `agent/TASK-013B-hangout-chat-ui`, `/Users/ellanguyen/.codex/worktrees/task-013b-chat-ui/Pals App`
Dispatch baseline: `4e1ca92f20d715cdf0a92d40846819d83845969c`, independently remote-verified canonical main by the coordinator before dispatch
Initial UI implementation commit: `916f96b08b9fbb20c2abb16732c60a6ec544ba18`; initial handoff tip: `9da44c96f8ec91bf61953a0a73d7136b68d923ee`
Auth lifecycle follow-up implementation commit: `7135026d00ee59d15939f3df8240791ca7f50ea8`; final task-branch push and remote SHA are reported to the coordinator after this handoff receipt commit
Second review baseline: `5db260be3284af6fe18c1729d270d862c63d750f`; reviewer blocked URL-only transition settlement and unbounded whole-history polling. This handoff records the bounded follow-up; its final remote tip is reported separately after the handoff commit.
Canonical main integration: pending coordinator review; this agent made no main merge
Main status records: `tasks/NOW.md`, `docs/operations/CURRENT_STATE.md`, and parent TASK-013, owned by the coordinator

## Outcome

- Added a local Chats path and saved Hangout detail entry. The list uses a 24-candidate deterministic `hangout_id` keyset page from existing RLS-authorized current membership. Every candidate and the detail entry require a fresh successful `read_hangout_messages` RPC, including valid empty responses, before a thread link appears. Denial has neutral text and no clickable link.
- Added a directly guarded Hangout thread and no-store GET/POST API. The server derives the caller session and enforces the existing local target guard; the accepted chat RPC remains authoritative. The page account ID is carried only as an anti-stale-account check, never as an authority grant.
- The thread renders literal escaped text with line breaks, server time, and only `You`, a currently projected participant account ID, or `Former participant`. No profile, photo, private-place preview, Realtime or direct table read was added. The composer explains future-joiner full history and that People blocking does not mute this local chat.
- Bounded 50-row forward paging uses one visible page with Previous and Load newer cursor navigation. Each visible poll rereads only that page once to reproject current authors; it never walks later pages or auto advances. A failed poll clears private text and offers retry. Generation invalidation, hidden/pagehide masking, pageshow/focus reauthorization, and same-origin cross-tab auth transition signaling are implemented. Sending uses one UUID and frozen payload per composed message. Uncertain transport responses keep the same-key retry; known denial clears content and draft. Successful send restores focus to the textarea.
- All in-app signout forms and the sign-in form announce a pending transition before submission. Visible chat tabs stay masked while a transition token is pending; storage, focus, pageshow and polling cannot release it. The URL completion marker is only a prompt to probe the existing guarded chat API and is never treated as proof of an auth mutation. The probe discards its message body. An old actor's authorized 200 response keeps the mask, including after a spoofed marker or delayed action. A 403 enters terminal denial, clears transition work, stops polling, and keeps the stale page denied through focus/pageshow until a full server-rendered reload. A failed sign-in sends a distinct cancellation signal; only a fresh authorized old-actor probe can restore the old page. Auth callback navigation broadcasts a separate revalidation signal.

## Files Changed

Chat routes/components/style: `apps/web/app/chats/`, `apps/web/app/api/chat/[id]/route.ts`, `apps/web/lib/chat.ts`.
Navigation/detail entry: `apps/web/app/hangouts/saved/[id]/page.tsx`, `saved.css`, Hangouts shell, Calendar, People, and shared Frame signout signal.
Plan and tests: `docs/ux/TASK-013B-INTERACTION-PLAN.md`, `supabase/tests/chat-ui-http.integration.mjs`, `tests/auth-transition.test.mjs`, `tests/chat-page.test.mjs`.

## Tests / Verification

- `pnpm check`: pass after the bounded paging/auth probe follow-up (format, lint, types, 23 Node tests, web/admin builds). `git diff --check`: pass.
- Focused real local Auth/PostgREST and Next web test: `WEB_TEST_ORIGIN=http://127.0.0.1:3000 node --test supabase/tests/chat-ui-http.integration.mjs`: pass. It covered anonymous/discoverer denial, gate off while public membership remained, guarded list/detail/direct route, 24-candidate keyset pagination, empty authorized thread, no-store API, exact-key retry and changed-payload conflict, 50-row forward page, post-leave author redaction, left/removed/cancelled/readiness denial, and stale page-account read/send denial.
- Coordinator inspected the running local page with CUA because this subagent's in-app browser refused attachment. At 1280, 768, 390 and 320 pixels, saved-detail link, populated Chats row, direct thread, empty/composer, and layout rendered. After the primary-nav style fix, document scroll width equaled client width at 768/390/320. At 320, Enter inserted a second textarea line without sending; the explicit button sent one message, retained line breaks in display and cleared the draft. The post-send focus defect was traced to a missing textarea ref. After attachment, the coordinator's live CUA retest confirmed AX focus and `document.activeElement` both returned to `#chat-message` after successful send.
- Coordinator's live CUA auth lifecycle checks confirmed both Hangouts and shared Frame signout paths immediately masked the other chat tab and stayed denied, a different-account switch stayed denied, and Back restored a thread only after a visible Checking state and fresh authorization. The server completion-marker refinement was made after these browser checks; its wrong-path/wrong-intent cases are covered by the focused Node test and the final build, but that exact refinement was not browser-retested.
- Coordinator's second live CUA pass used a disposable 70-message Hangout: the first page showed 01–50, remained at exactly 50 after an 8.5-second poll, Load newer showed only 51–70, and Previous returned to 01–50 with Load newer available again. The focused page test checks one request per visible page, cursor back/forward behavior, and author reprojection on the current page. The focused auth test checks a spoofed/early marker returning 200 stays masked, network uncertainty stays masked, 403 denies, and failed sign-in reauthorizes only after a successful old-actor probe.
- The focused real local HTTP test was rerun and passed after the first auth follow-up. The temporary test and visual accounts, Hangouts, messages and ledgers were removed. Final local query after the second browser pass returned Hangout gate `false`, chat gate `false`, zero chat messages and zero `chat-page-%` Auth users; the earlier check also confirmed zero `chat-auth-%` users. The web server, Supabase services and Lima VM were stopped; ignored `.env.local` and temporary fixture files were removed. No hosted environment was touched.

## Decisions

- Used the existing public participant `hangout_id`/`account_id` grant and RLS for list candidates. The `state` column is intentionally not readable by clients, so the list never filters it directly. Fresh chat RPC authorization is still required for every candidate.
- Re-read only the current displayed page during visible polling so an author who later leaves or loses readiness does not leave a stale account ID projected in the UI. Earlier and later pages remain reachable through explicit cursor controls. Message text is never placed in a shared cache, URL or localStorage.
- Preserved hidden uncertain-send text/key only in component memory while removing it from the DOM. Return requires a fresh read and the original page-account match before redisplay. Account change and denial erase it.

## Known Limitations / Review Focus

- This is disposable-local polling, not hosted messaging or Realtime. People blocks remain People-only under Accepted ADR-0015; TASK-016 must resolve global block and moderation policy before hosted chat.
- Browser automation in this task-agent thread was unavailable. The coordinator's rendered checks covered layout, successful multiline send, cross-tab signout, different-account denial, Back reauthorization, final textarea focus, and 70-message page navigation/polling. Hidden/pagehide, lost-response retry, changed draft after uncertainty and stale in-flight read after denial were not independently exercised in a browser. The focused HTTP suite verifies database and route outcomes, and the focused Node tests verify transition-token decisions and single-page fetches; neither replaces every browser lifecycle scenario. The fail-closed auth probe change was code/unit reviewed but was not directly browser-retested as a spoofed marker.
- `pnpm db:verify` was not rerun because B changed no schema/RLS/backend function. The reviewed TASK-013A backend tests remain the database authorization evidence.

## Follow-up / Ownership

The coordinator owns a fresh security/design review, any browser lifecycle follow-up, shared status/main integration, and remote verification of main. This stage does not start TASK-014 or hosted work. No new ADR or backend change was needed.
