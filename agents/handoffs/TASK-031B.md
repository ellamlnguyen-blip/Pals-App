# TASK-031 Stage B handoff — saved Hangouts map

Status: Stage B implementation committed for coordinator browser and source review. TASK-031 remains incomplete pending fixture runtime checks, independent review, task publication and applicable main integration gates.

Branch: `agent/TASK-031-hangouts-map`. Stage B code commit: `dff8a04444207174e929bd61079d3956670ef485`. Stage A verified parent: `7040131a35dcff06cb15c41229d34401c95c4b11`.

## Outcome

- Replaced the saved Hangouts marketing hero and persistent rail with a compact Hangouts/UNC heading, Create action, and a single large rounded Mapbox canvas. The existing Frame retains the five navigation tabs and account avatar.
- Added independent Today, Tomorrow, This week and Later checkboxes. The mask defaults to `1111`, supports mixed and explicit `0000`, and passes directly to the Stage A source adapter. Legacy `upcoming`/`all` browse-return preferences restore as all four upcoming periods. The below-map text explains the disjoint New York civil-day categories.
- Replaced numbered markers with deterministic emoji cues from the public title/description, a neutral pin fallback and time-period blue shades. A marker remains a button after Mapbox construction. Zoom is bottom right; Back to UNC and optional Locate me remain explicit controls. The camera still remembers only coarse campus-bound navigation; Locate me clears it.
- Added anchored hover/focus/tap preview from the existing `/api/calendar/[id]` public authorized projection. It renders consent-allowed host/co-host/attendee identities and photos or neutral fallbacks, public date/place/description, View Hangout and only currently authorized Join. No raw saved detail or private instructions are serialized by this UI. Acknowledged Join clears preview and refreshes source; other outcomes do not claim success.
- Added pointer continuity, keyboard Escape/Close focus return, preview request abort/generation guards, overlapping Auth transition token handling, hidden/pagehide concealment and reload-before-redisplay. The alternate list remains available below the map when the renderer/token fails, with explicit empty, error, denied and 100-result states.

Owned changes: saved route `page.tsx`, `saved-discovery.tsx`, `map.tsx`, `saved.css`, `browse-context.ts`, new `pin-cue.ts`, and two focused tests. No migration, query adapter, Calendar, shared records, keys or provider configuration changed.

## Verification

- `node --test tests/saved-browse-context.test.mjs tests/saved-pin-cue.test.mjs`: 4/4 pass. Tests cover strict browse masks including all-off/prefix rejection, camera privacy, deterministic cues and Sunday boundary color classification.
- `tsc --noEmit -p apps/web/tsconfig.json`: pass.
- Scoped ESLint and Prettier: pass; `git diff --check`: pass.
- `next build --webpack` in `apps/web`: pass, including TypeScript and route generation. The default Turbopack build cannot traverse the deliberately symlinked `apps/web/node_modules` outside this worktree; it fails before compiling app source. No package installation was attempted.
- Rendered browser interaction, fixture authorization, loading/error screenshots and mobile layout remain for coordinator QA. The existing 3035 server was a TASK-030 build during implementation; this handoff makes no rendered-browser claim.

## Review focus and remaining gates

Verify real map tile rendering and attribution with the local-only public token, marker roles/hover transition, selected preview placement and mobile 320/390/820/1280 widths. Exercise fixture authorized/denied preview and Join, all-off and mixed masks, >100 truncation, token/error fallback, Escape focus return, Auth transition concealment and stale response handling. Stage A security/SQL evidence and parent task acceptance remain coordinator-owned. TASK-027/TASK-028 staged acceptance still gates application main integration; no hosted or release action follows this stage.
