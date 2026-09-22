# Handoff — TASK-004
Date: 2026-09-22
Branch/worktree: `agent/TASK-004-map`, `/Users/ellanguyen/.codex/worktrees/3df5/Pals App`
Starting point: `7dc50cc` (TASK-003 coordinator status, including implementation `daebb67`), isolated worktree. Required branch created before edits.

## Outcome
TASK-004 is complete, including final live Mapbox basemap verification on the authenticated local route. This is not a production launch or deployment claim. No next implementation task, merge, push, production or hosted database operation occurred. The original offline verification below is supplemented by the final live acceptance addendum.

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
Set `NEXT_PUBLIC_MAPBOX_TOKEN` in `apps/web/.env.local` to the project's public `pk.` token, with minimal map read scopes and local/staging URL restrictions, then restart/rebuild. The token was unavailable during initial verification; after explicit user authorization and user-completed sign-in, the existing palsapp default public token was saved in ignored `apps/web/.env.local` (mode 0600). No third-party token was borrowed or token committed. Invalid/non-public values render the fallback, and only `pk.` values pass from the server page to the client. Live light-v11 delivery/provider authorization now pass. The existing default public token is usage-limited and has no URL restrictions; account/billing/token settings were not changed. Use appropriately restricted environment tokens when deploying. Dark-v11 rendered verification remains unrun.

Local Supabase restore initially produced a Storage 42P10 index mismatch with its restarted provider image. A normal local `pnpm db:reset` reapplied committed migrations and resolved it; public API fixture upload and full auth regression then passed. No migration/policy was changed to work around it. Reset removed only previously documented disposable local test data. Runtime startup/reset output was kept local; application clients continue using publishable keys only.

TASK-003 hosted HTTPS callback and arbitrary UNC SMTP delivery remain pending, unchanged. No hosted acceptance was inferred from local tests. Full CRUD/joining/ranking/backend discovery and remaining navigation are outside scope.

## Documentation/state
Updated map environment/setup notes, web and token READMEs, shared design guidance, current state, changelog, task contract and NOW queue. Task is now recorded in DONE after final real basemap acceptance, with production launch and hosted-auth gaps preserved. No unrelated backlog task or architectural redesign.

## Cleanup / Coordinator next step
Temporary runtime/harness and synthetic account cleanup is recorded below after shutdown. Review this branch's scoped changes and completed final live verification addendum. Do not auto-start TASK-005.

Cleanup: disposable TASK-004 local account and its private photo removed successfully using the local public API plus a fixture-ID-scoped local Auth deletion. Web/harness processes stopped; Supabase stopped cleanly with backup. Browser test tabs closed and final viewport override reset. Temporary harness/logs remain under `/private/tmp` as non-repository evidence; no test-only route or bypass is shipped.
Lima VM also stopped cleanly after Supabase shutdown. All task changes are saved in the local TASK-004 branch; no remote publication.


## Final live acceptance addendum (2026-09-22)
The user explicitly authorized retrieving the existing public token from their Mapbox console and completed sign-in. Verified account: `palsapp`; existing Default public token, usage-limited, no URL restrictions. Stored only in ignored `apps/web/.env.local`; token values are omitted from repository documentation. No token creation/refresh, billing change, production deployment or provider account mutation.

Actual `/hangouts` route behind the unchanged Supabase ready gate was tested using a disposable local account. **Real Mapbox light-v11 streets/campus tiles, glyphs, controls and Mapbox/OpenStreetMap attribution rendered successfully.** Desktop 1280×900 and phone 390×844 screenshots inspected in conversation; document width matched viewport width. Phone map container was 356×378 CSS pixels, with visible controls, pins/clusters and attribution. This was the shipped map component, without the offline test style or an auth bypass.

Keyboard activation expanded a three-Hangout cluster into an individual picnic pin and a two-Hangout cluster, returning focus to the map canvas. Activating the picnic pin opened its matching preview and focused its heading. Closing restored interaction, Back to UNC reset the map, category/time filters cleared all markers for the empty combination, and reset restored examples. Create opened the explicit nothing-saved-or-published modal and Escape closed it. Live browser console error/warning log was empty. Prior tested failure, denial and gate behaviors remain covered; no app code changed during this acceptance pass.

TASK-004 moved to Complete/DONE; current state, queue and changelog synchronized. The earlier full repository check (11 tests/both production builds) and auth regression remain valid because this final pass changed only ignored configuration and task documentation. Final documentation formatting/diff checks recorded below. Hosted HTTPS callback, public UNC SMTP delivery and deployment remain outside this completion.

Final cleanup: disposable live-map test account and photo removed; Next, Supabase and Lima stopped cleanly; verification tabs closed and viewport override reset. `pnpm format:check` and `git diff --check` pass. Public token configuration remains only in the ignored local environment for future local runs. No app code changed in the final acceptance pass.
