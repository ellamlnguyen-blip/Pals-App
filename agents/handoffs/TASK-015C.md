# TASK-015C handoff — local Notifications inbox and preferences UI

Status: implementation task branch prepared for independent exact-tip security/design review; canonical main integration remains coordinator-owned.

## Baseline and boundary

- Branch: `agent/TASK-015C-notifications-ui` in isolated task worktree.
- Exact reviewed canonical starting baseline: `3ce5f8c88144fe8ca0f7867b55ab22361f468ca5`.
- Authority: Accepted ADR-0017 and reviewed TASK-015C contract/UX plan. GPT-6 Sol medium was assigned; dispatch exposed no speed selector, so Standard speed was not independently configured or verified.
- No schema, RLS, RPC, source-hook, Realtime, push/email, hosted or global safety change. Shared queue/current state/changelog and main integration are coordinator-owned.

## Outcome

- Added local-only `/notifications` route and no-store API for the four reviewed caller-bound owner RPCs. The server checks `APP_ENV=local`, validated loopback Supabase, a current active actor bound to the request cookie, bounded cursor/UUID/category/boolean inputs, and database gate via RPC. API success, invalid, error and denied responses carry `private, no-store`; the built page does too. Hosted route resolves to not-found; hosted API denies.
- Inbox renders at most one 24-item page at a time, descending from the RPC, with explicit newer/older navigation and visible-page refresh. Each row uses the returned generic label, server timestamp and read state. A neutral unavailable row never has a link or identifying source information. Only explicit event-code/validated-ID combinations build destinations; friendship events land on generic `/people/friends` with “View friendships.” Destination pages perform their existing current authorization. Mark-read is owner-only/idempotent, with no unread reversal.
- Four owner category controls describe that muting affects future optional inbox items only. No essential cancellation toggle exists; a small note says cancellations still arrive. An uncertain preference/read write masks rows and asks for reload instead of claiming success.
- Client clears sensitive rows on transition begin, signout/account mismatch/denial, visibility loss, refresh start and failed/uncertain read. It probes current account/gate before each page read; stale responses are ignored by revision and actor checks. Settled overlapping tokens remain masked until each current-owner probe succeeds. A failed pending probe can recover on focus/visibility or a visible retry control. Existing primary-nav placeholders were replaced only in the six contracted surfaces, with a link only for validated local routes.
- Uses existing Nunito/shared design tokens. No new design dependency or unrelated navigation shell was added. The live `usepals.com` DNS lookup failed in this task environment; implementation followed the reviewed UX plan and the coordinator's recorded live reference inspection.

## Verification and limits

- `pnpm check` passed: format, ESLint, all workspace types, 31 unit tests, web/admin builds. Five new focused tests cover all event-code destinations, neutral/inconsistent projection, overlapping transition tokens, failed/wrong-account retry state and denied masking. `git diff --check` passed.
- Real signed-in local Auth/HTTP suite passed against disposable Supabase: anonymous and wrong actor denial, owner probe, empty/preferences defaults, invalid cursor, 24+1 keyset paging, neutral revoked rows, owner isolation, read, preference write, invalid essential category, and gate-off denial. Responses were checked for private no-store. Built local `/notifications` response was also verified `private, no-store`; Next dev mode emits its standard `no-cache, must-revalidate` page header, while the built server honors the configured private no-store header.
- Coordinator's Codex in-app browser reviewed 390px phone, 768px tablet and 1024px desktop: primary navigation, keyboard focus/tab order, inbox/preferences layout without horizontal overflow, loading and empty states, neutral unavailable rows, 24+3 paging, mark-read result, Messages preference off/on, and authorized friendship link target. After live source deletion, Refresh neutralized the formerly linked friend request. Signout immediately masked items; browser Back showed generic signed-out denial. A second ready owner had an empty inbox, and back/forward kept that owner's data. Gate-off Refresh cleared controls/items into neutral denial. A temporary local GET-503 fixture produced the generic error with Try again and no rows/preferences; the original API route was restored byte-for-byte (SHA-256 `b6b8b8e1ace98229a210870320c7eb660a4e7d656575bd686289b5d3166e8393`), and Try again recovered to the empty state. This fixture was never committed.
- The signed-in HTTP suite was rerun after adding a changed-account cursor/actor check; it passed. Synthetic review owners/peer and HTTP accounts were deleted. Final local inspection showed zero notification items/preferences/synthetic users; notification, People and friendship gates false. Local web, Supabase and VM were stopped. No hosted target was used.

## Review focus

- Inspect the exact-tip API authorization/no-store behavior, event-code destination allowlist, and client mask/revision lifecycle around overlapping transitions and failed probes. Check that page-level no-store remains true in built mode and local-only nav is maintained.
- A source may revoke after an inbox read. The row's link is not authority; its destination route/RPC rechecks access. Browser signout/switch with Back/Forward and a signed-in changed-account cursor HTTP check passed. An instrumented in-flight response crossing account switch was not observed in a real browser; revision checks and overlapping-token unit tests cover that implementation path. Exact-tip review should inspect this race.
- Coordinator owns independent review, handoff acceptance, remote-verified main integration and shared records. A task branch push alone does not complete TASK-015.
