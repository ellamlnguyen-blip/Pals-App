# TASK-032 Stage P1 handoff: primary profile photo

Status: implementation ready for fresh review; no commit or publication yet. Branch `agent/TASK-032-interaction-photos` at baseline `e280837`. Scope is the primary-photo vertical only. The coordinator owns integration and shared queue records.

## Outcome

- Added pinned `react-easy-crop@6.2.4` and a compact in-place primary-photo modal. The portrait edit icon and empty portrait action open it; the existing photo View option can enter it. It supports browse, drag and drop, circle crop, pointer/touch drag, wheel/pinch and slider zoom, keyboard arrows, Reset, Cancel/Escape, and explicit Save. A selected image remains local until Save. Recropping starts from the currently stored rendition.
- Save produces a bounded PNG square for the server's single WebP quality-90 encode, then calls the existing owner-bound immutable upload, revision CAS, and guarded cleanup action. Conflict and uncertain results trigger an authoritative refresh and disable retry from the stale modal; ordinary failures retain the local crop for retry. Pending saves block crop, drop and file changes. The profile editor immediately conceals owner details/photos/drafts on auth transition, tab hiding or pagehide, clears local state and ignores late action results until a full authorized reload. The crop modal also clears its local image and generation on those transitions.
- Fresh review identified a pre-action canvas race: generation is now checked immediately after the asynchronous square export, before `changePhoto` can submit under changed Auth cookies. The post-action generation check remains in place for late responses.
- A real 319×720 browser check found the original 48dvh crop area pushed Cancel/Save below the visible modal. The crop area now uses a shorter viewport-responsive height, the dialog scrolls, and its actions stay at the bottom of the visible scroll area. The hidden native file input is removed from tab order and opening focus moves to the visible Choose photo button. Root will repeat the rendered viewport check after this commit.
- The server now verifies actual JPEG/PNG/WebP framing, Sharp-decoded format, static pages, 5 MiB input, 20 MP source, and output bounds. It auto-orients, strips metadata, and normalizes the primary square to at most 1024 px and legacy extra submissions to 9:5 at most 1440×800. No schema/RLS/Storage policy or new peer reader was added. Old referenced objects remain until CAS succeeds.
- Successful Save returns the authoritative revision, updates the local portrait URL, refreshes the existing server profile/header, and broadcasts only a payload-free invalidation. `StudentHeader` refreshes server-rendered projections and remounts its avatar on local and cross-tab invalidation; it immediately masks private header account details during auth transitions and reloads before redisplay. The only two currently rendered client-held avatar previews, Calendar and saved Hangouts, abort stale preview requests and re-read their existing no-store preview API when an invalidation arrives. Other users refresh on their next authorized fetch.

## Files

`apps/web/app/profile/primary-photo-editor.tsx` (new), `apps/web/app/profile/editor.tsx`, `apps/web/app/profile/actions.ts`, `apps/web/app/profile/profile.css`, `apps/web/app/student-shell.tsx`, `apps/web/app/calendar/calendar-client.tsx`, `apps/web/app/hangouts/saved/saved-discovery.tsx`, `apps/web/lib/rich-peer-photo-image.ts`, `apps/web/package.json`, `pnpm-lock.yaml`, `tests/owner-photo-normalization.test.mjs` (new).

## Evidence

- `node_modules/.bin/eslint` on changed TS/JS: pass.
- `node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json`: pass.
- `node --test tests/owner-photo-normalization.test.mjs tests/rich-peer-photo-gateway.test.mjs`: 17/17 pass. Normalizer tests cover square and 9:5 bounds, orientation, transparency, metadata stripping, trailing/corrupt bytes, animation, input/pixel caps and tiny-image rejection.
- `apps/web/node_modules/.bin/next build --webpack` from `apps/web`: pass. Default Turbopack build is blocked by the inherited root `node_modules` symlink pointing outside this worktree; no dependency cache was altered.
- The coordinator rendered the crop modal at 319×720 and exercised its file chooser; the original action visibility issue was corrected as above but needs a repeat render. Authenticated Storage/CAS Save, persistence, broader desktop/mobile and cross-tab checks remain for the coordinator/fresh reviewer. Existing root-owned fake runtime and fixtures were not changed by this worker. No hosted operation was performed.

## Review focus and remaining gates

Review crop keyboard/touch behavior, error and focus states, cross-tab Calendar/saved preview refresh, and the real owner Storage/CAS path. Verify a second owner cannot modify photos and old references survive failures. Render at desktop/mobile widths with actual viewport dimensions. Stage P2 is intentionally untouched; existing extra-photo controls remain until its separate contract and P1 review.
