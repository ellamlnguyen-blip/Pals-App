# Handoff — TASK-004
Date: 2026-09-22
Branch/worktree: `agent/TASK-004-map`, `/Users/ellanguyen/.codex/worktrees/3df5/Pals App`
Starting point: `7dc50cc` (TASK-003 coordinator status, including implementation `daebb67`), isolated worktree. Required branch created before edits.

## Outcome
Bounded map shell implemented and locally verified. Live Mapbox basemap acceptance remains pending a project-owned public token. This is not a launch-ready or deployed map claim. No next task, merge, push, production or hosted database operation occurred.

Read AGENTS, task and prerequisite handoffs; all required product/map/security/architecture/UX sources; accepted Mapbox/Hangout/trust/campus ADRs; Leon Taste; existing components/tokens; directly inspected live usepals.com in the browser. Used React best-practices review. Wrote `docs/ux/TASK-004-INTERACTION-PLAN.md` before UI implementation.

## Delivered
- Authenticated `/hangouts` retains `requireAccess("ready")` and live account/profile gate. Header identity uses the existing private owner photo route. Hangouts is first/active navigation. Future destinations open honest unavailable shells.
- Official pinned Mapbox GL JS 3.31.0 with GeoJSON types, UNC initial center, pan/zoom/reset, source/worker clustering, accessible HTML pin/cluster buttons, connected preview and alternate example list. Cluster expansion honors reduced motion.
- Five explicit synthetic Hangouts at approximate public campus areas. No real host, student, attendee, private address, feed, popularity metric, joining or backend Hangout record.
- Category and example-time filters, empty/reset, selected preview with focus movement/restoration, native Create modal with explicit nothing-saved/published copy and no publish action.
- Missing/non-public token fallback, reserved loading frame, initial timeout/error/retry, nonfatal post-load tile warning/reload. Native Mapbox attribution remains available with real styles.
- Optional explicit one-shot location, low accuracy, 10-second timeout. Campus coordinates are rounded to 0.001 degrees and used only for a local camera jump. Outside-campus results keep UNC. No watcher, user-location layer, storage, analytics, server submission or broadcast. Ordinary provider tile requests reflect the viewed area.

## Verification and concrete evidence
- `pnpm check`: PASS after final product changes. Prettier, zero-warning ESLint command, strict workspace types, **11 Node tests**, web/admin production builds. Existing Rosetta performance and React root-detection notices are tooling notices; no check failure. Log: `/private/tmp/task004-final-check.log`.
- New fixture tests verify explicit mock/public feature shape, combined filters/empty result and finite/in-campus/coarse geolocation output.
- Existing real local Auth/Storage/web suite: PASS after final strengthened assertions. Confirms authenticated HTML actually includes the map shell, and anonymous/incomplete/suspended access does not disclose it; PKCE callback, HttpOnly cookies and private Storage ownership regressions also pass. Log: `/private/tmp/task004-auth-final.log`. No schema changes required, so pgTAP was not rerun for this task.
- Authenticated actual route inspected at 1280px desktop, 768px tablet, 390px phone and 320px narrow phone modal. DOM viewport/document widths match, with no horizontal overflow. Tablet rail stacks under map; desktop is two columns; phone controls/notice/modal remain legible. Local synthetic one-pixel profile photo is intentionally blank test data, not a shipped avatar asset.
- Actual route: missing-token copy, disabled map-only controls, working alternate previews, category/time empty result and reset, create no-publish dialog, native Escape and focus return, Calendar unavailable dialog with correct title, preview heading focus and return, skip-to-main. App console error/warning query returned empty.
- Isolated `/private/tmp/task004-map-harness` on loopback port 3002 used **the real Mapbox renderer and GeoJSON clustering worker**, with a test-only background style and `testMode` for the absent project token. It copied the shell, never added an auth bypass or test route to the repository. This harness verifies map mechanics, not live geographic tiles.
- Offline renderer: desktop 1280px, tablet 768px and phone 390px/325px inspected. Keyboard cluster activation expands a three-item cluster to an individual pin plus two-item cluster; canvas gains focus. Pin activation opens the matching preview and focuses its heading. ArrowRight shifted each marker by exactly 100 rendered pixels. Zoom/reset work. Empty filters produce zero DOM markers; reset restores clustered markers. Create remains visible and previews accessible below map on phone.
- Harness injected only a geolocation permission-denied callback; Locate me produces the nonblocking denial message and map remains usable. **No actual device location was requested or observed.** Successful location/out-of-campus handling has unit/static coverage, not an actual-location browser claim.
- Invalid-token harness: observed loading → clear error → Retry → loading. Missing token separately verified on actual authenticated route. Real successful Mapbox style/tile requests remain unverified.
- Browser screenshots were inspected in conversation at desktop/tablet/phone and modal states. No durable screenshot files or Lighthouse report were exported. Dark tokens reviewed statically; no rendered dark-mode claim.

## Review and fixes
Fresh independent design/privacy reviewer found modal opening before its accessible name committed, same-ID preview focus omission, and overly fatal handling of post-load tile errors. All three fixed; reviewer rechecked current code and reports no additional static findings. Independent rendered review could not run because that agent's browser surface listed no browsers; rendered evidence above is implementer evidence.

Actual renderer testing caught Mapbox assigning `role=img` to custom button markers and its stylesheet overriding map container positioning. Restored `role=button` after marker construction and increased CSS selector specificity; retested visible pins/controls, nonzero canvas dimensions, cluster/pin keyboard behavior and responsive layouts. Shared design guidance records these integration details.

## Runtime/configuration limitations
Set `NEXT_PUBLIC_MAPBOX_TOKEN` in `apps/web/.env.local` to the project's public `pk.` token, with minimal map read scopes and local/staging URL restrictions, then restart/rebuild. The requested project token was unavailable; no third-party token was borrowed or committed. Invalid/non-public values render the fallback, and only `pk.` values pass from the server page to the client. Live light-v11/dark-v11 delivery and provider authorization must be checked before closing final map acceptance.

Local Supabase restore initially produced a Storage 42P10 index mismatch with its restarted provider image. A normal local `pnpm db:reset` reapplied committed migrations and resolved it; public API fixture upload and full auth regression then passed. No migration/policy was changed to work around it. Reset removed only previously documented disposable local test data. Runtime startup/reset output was kept local; application clients continue using publishable keys only.

TASK-003 hosted HTTPS callback and arbitrary UNC SMTP delivery remain pending, unchanged. No hosted acceptance was inferred from local tests. Full CRUD/joining/ranking/backend discovery and remaining navigation are outside scope.

## Documentation/state
Updated map environment/setup notes, web and token READMEs, shared design guidance, current state, changelog, task contract and NOW queue. Task remains implemented/locally verified with live basemap acceptance pending; not silently promoted to launch-ready DONE. No unrelated backlog task or architectural redesign.

## Cleanup / Coordinator next step
Temporary runtime/harness and synthetic account cleanup is recorded below after shutdown. Review this branch's scoped changes and supply/configure the project public Mapbox token for final live basemap verification. Do not auto-start TASK-005.

Cleanup: disposable TASK-004 local account and its private photo removed successfully using the local public API plus a fixture-ID-scoped local Auth deletion. Web/harness processes stopped; Supabase stopped cleanly with backup. Browser test tabs closed and final viewport override reset. Temporary harness/logs remain under `/private/tmp` as non-repository evidence; no test-only route or bypass is shipped.
Lima VM also stopped cleanly after Supabase shutdown. All task changes are saved in the local TASK-004 branch; no remote publication.
