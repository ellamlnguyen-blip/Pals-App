# TASK-011B — Local People directory and privacy controls

Status: Published on canonical main; UI implementation dispatched in isolated worktree
Parent: TASK-011; authority: Accepted ADR-0013
Implementation branch: `agent/TASK-011B-people-ui` from verified main `6cf286ed72269ac603cb298b30a52d5fba74ecf1`
Backend task branch: `ca1d6d234ea1af3f08af8c21d76f7db8ffc88f0d`; reviewed main integration: `ef4da666dbd89996190aa7fb0fd1f31aba7b7d40`

## Goal
Build the local ready-only People experience on reviewed TASK-011A caller-bound APIs: browse, literal name search, year/major filters, text detail, explicit opt-in/out and People-only block controls. Preserve existing map, Calendar, owner profile and private photos.

## Prerequisites
TASK-011A handoff and independent security review clear; reviewed backend integrated and remote-verified on main. Consume `get_people_preference`, `set_people_preference`, `browse_people`, `get_people_detail`, `set_people_block` and `list_people_blocked_ids` with their accepted database contracts. Coordinator then publishes this narrower contract and status on main, creates an isolated task branch from fresh origin/main and dispatches a fresh GPT-6 Sol / medium implementation agent under the app's Standard speed preference (speed not exposed in agent dispatch API).

Before UI coding: read AGENTS.md, this contract, parent TASK-011, Accepted ADR-0013, relevant product/UX docs, existing components/tokens and installed Leon Taste skill. Inspect https://usepals.com/ or record access failure and use already documented reference. Write desktop/phone interaction plan. The accepted privacy and accessibility rules supersede any generic marketing-page pattern.

## Scope
- Replace People coming-later navigation with a real `/people` route in the existing primary nav, only under APP_ENV=local and validated loopback Supabase. Keep saved/mock Hangouts distinct. Preserve existing route and session gates.
- Ready callers can browse the 24-row backend pages without sharing their own profile, search by literal name, use exact year/major filters, open a known-ID text detail, and navigate back with filter/page/focus state preserved. Never show hidden campus totals or synthesized recommendations/popularity signals. Use the authoritative API cursor; invalid input gets bounded, recoverable feedback, not a broad query.
- Existing owner `/profile` gets a clear preview of exactly the card/detail text fields and a default-off visibility control. Add a local active-owner privacy-management path that remains usable from onboarding/unverified states, because the existing `/profile` route is ready-only; restricted/suspended accounts still have no management access. Explain future edits of those fields will be shared while on. Opt-out must remain available to active owners when readiness is lost or People gate is off, using an appropriately gated path outside the ready-only People route. Avoid claiming all profile data are owner-only after opt-in; photos and excluded fields remain private.
- Detail allows blocking a currently visible peer with confirmation stating People discovery is hidden both ways but existing Hangout participation/private instructions are unchanged. After success or uncertain result, re-fetch authority; clear currently displayed peer text and drop controls rather than retaining a stale card. No toggle/replay for uncertain block requests. Outbound block management shows full stable IDs only, copy/select and exact-ID confirmation before unblock; explain its local identification limitation. Unblock is idempotent desired state. Never disclose incoming block or hidden peer reason.
- Page/action responses including errors are no-store, use the caller's session public client, never service role or profile table peer reads. No route accepts photo paths, exposes photo bytes/links or logs peer bio. Late search/detail responses may not replace a newer filter/navigation state; ensure deleted/blocked records do not linger in client caches or browser storage. No fake DM/friend actions.
- Interaction states: loading, empty list, no results, invalid filters/cursor, gate off, readiness loss, opt-out, block, network error, uncertain write and retry. Desktop and 320–390px phone with keyboard, screen reader labels and clear focus on navigation/dialog close. Use shared tokens, real labels, contrast and reduced motion.

## Verification
Run `pnpm check`, relevant existing DB/HTTP suites as regression, and real local browser/action checks for opt-in, direct detail, search/filter/page, bilateral blocking and blocked known-ID, opt-out during detail, nonready/gate-off opt-out, outbound unblock and no-store denied/error responses. Inspect rendered desktop/phone/keyboard states; record actual evidence and limitations. Keep both gates false at cleanup, disposable data removed, services stopped. Independent security/design review and coordinator inspection before main integration; handoff with exact checks and remote SHA.

## Exclusions
No new migration/permission/grant; no photo processing or peer photo delivery; no friendship, DM, invitations, attendance, Hangout access/block precedence, reporting/moderation, hosted deployment or test-helper repair. If backend API lacks an accepted operation, return to coordinator for a bounded backend fix rather than inventing authorization in the UI.
