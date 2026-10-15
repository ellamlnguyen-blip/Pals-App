# TASK-032 Stage P1 handoff: primary profile photo

Status: primary-photo source and basic disposable-local vertical accepted for StageP2 reuse at `7e89a14f6fd0fa6ef4b5ef7d562b5a9d6b438dac`. Parent TASK-032 remains incomplete; the coordinator owns publication, broader verification and user sign-off. Branch `agent/TASK-032-interaction-photos`, baseline `e280837`.

## Outcome

- Added pinned `react-easy-crop@6.2.4` and a compact in-place primary-photo modal. The portrait edit icon and empty portrait action open it; the existing photo View option can enter it. It supports browse, drag and drop, circle crop, pointer/touch drag, wheel/pinch and slider zoom, keyboard arrows, Reset, Cancel/Escape, and explicit Save. A selected image remains local until Save. Recropping starts from the currently stored rendition.
- Save produces a bounded PNG square for the server's single WebP quality-90 encode, then calls the existing owner-bound immutable upload, revision CAS, and guarded cleanup action. Conflict and uncertain results trigger an authoritative refresh and disable retry from the stale modal; ordinary failures retain the local crop for retry. Pending saves block crop, drop and file changes. The profile editor immediately conceals owner details/photos/drafts on auth transition, tab hiding or pagehide, clears local state and ignores late action results until a full authorized reload. The crop modal also clears its local image and generation on those transitions.
- Fresh review identified a pre-action canvas race: generation is now checked immediately after the asynchronous square export, before `changePhoto` can submit under changed Auth cookies. The post-action generation check remains in place for late responses.
- A real 319×720 browser check found the original 48dvh crop area pushed Cancel/Save below the visible modal. The crop area now uses a shorter viewport-responsive height, the dialog scrolls, and its actions stay at the bottom of the visible scroll area. The hidden native file input is removed from tab order and opening focus moves to the visible Choose photo button. The coordinator repeated the rendered viewport check at7e89a14; both actions fit, as recorded below.
- The server now verifies actual JPEG/PNG/WebP framing, Sharp-decoded format, static pages, 5 MiB input, 20 MP source, and output bounds. It auto-orients, strips metadata, and normalizes the primary square to at most 1024 px and legacy extra submissions to 9:5 at most 1440×800. No schema/RLS/Storage policy or new peer reader was added. Old referenced objects remain until CAS succeeds.
- Successful Save returns the authoritative revision, updates the local portrait URL, refreshes the existing server profile/header, and broadcasts only a payload-free invalidation. `StudentHeader` refreshes server-rendered projections and remounts its avatar on local and cross-tab invalidation; it immediately masks private header account details during auth transitions and reloads before redisplay. The only two currently rendered client-held avatar previews, Calendar and saved Hangouts, abort stale preview requests and re-read their existing no-store preview API when an invalidation arrives. Other users refresh on their next authorized fetch.

## Files

`apps/web/app/profile/primary-photo-editor.tsx` (new), `apps/web/app/profile/editor.tsx`, `apps/web/app/profile/actions.ts`, `apps/web/app/profile/profile.css`, `apps/web/app/student-shell.tsx`, `apps/web/app/calendar/calendar-client.tsx`, `apps/web/app/hangouts/saved/saved-discovery.tsx`, `apps/web/lib/rich-peer-photo-image.ts`, `apps/web/package.json`, `pnpm-lock.yaml`, `tests/owner-photo-normalization.test.mjs` (new).

## Evidence

- `node_modules/.bin/eslint` on changed TS/JS: pass.
- `node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json`: pass.
- `node --test tests/owner-photo-normalization.test.mjs tests/rich-peer-photo-gateway.test.mjs`: 17/17 pass. Normalizer tests cover square and 9:5 bounds, orientation, transparency, metadata stripping, trailing/corrupt bytes, animation, input/pixel caps and tiny-image rejection.
- `apps/web/node_modules/.bin/next build --webpack` from `apps/web`: pass. Default Turbopack build is blocked by the inherited root `node_modules` symlink pointing outside this worktree; no dependency cache was altered.
- The coordinator rendered the crop modal at319×720, exercised its file chooser, and repeated the corrected action/focus layout. Authenticated Storage/CAS Save, refresh/fresh-session persistence and second-owner denial passed as recorded below; broader desktop/touch, faults/concurrency and cross-tab consumer checks remain. Existing root-owned fake runtime and fixtures were not changed by this worker. No hosted operation was performed.

## Review focus and remaining gates

Basic crop keyboard/slider/reset, focus, real owner Storage/CAS and second-owner denial passed. Still verify touch, fault/concurrency/old-reference behavior and cross-tab Calendar/saved preview refresh; broaden actual rendered widths to desktop/tablet. This was the P1-only review boundary; P2 later reused the reviewed vertical. See the final coordinator receipt below.

## Coordinator primary vertical receipt

Fresh source/security review cleared8b89b2e and the7e89a14 modal delta. Actual319×720 browser at8b89 selected synthetic800×600 PNG, showed immediate preview, adjusted slider up/down, Reset and keyboard position, then saved through the real server action. Portrait and header immediately loaded the new600×600 metadata-free WebP at revision5. Refresh and an independent freshly signed-in fictional Maya session read that same stored photo. Normal fictional Alex raw object read, foreign namespace upload and Maya profile update were denied; current name/bio/major and four extras stayed intact. Private safe receipt is outsideGit. At7e89 actual319×720 repeat, both Cancel/Save fit at y608–652, opening focus was Choose photo, no page overflow; Cancel kept revision5. Screenshot primary-crop-phone.jpg shows synthetic content only; final evidence publication is tracked by TASK-032-PUBLICATION. Real iOS/Android pinch and picker behavior, full desktop, fault/concurrency and cross-tab consumer checks still need acceptance. StageP2 is now dispatched to reuse the full vertical. No hosted operation or final user sign-off claimed.

## Coordinator final receipt

At final6c source, desktop wheel1→2.44/drag/Cancel and cross-tab Sign out with modal open passed; modal/decoded owner primary cleared, normal sign-in restored stored primary/four extras. Final fresh review/93units/build/lint pass. P2 rectangular crop/empty screenshots are1280×720, not phone evidence. Full exact executed/open checks and publication are in TASK-032-INTERACTION-PHOTO-QA.md/TASK-032-PUBLICATION.md. Physical touch, actual drop, current cross-feature replacement and fault/race acceptance remain open.
