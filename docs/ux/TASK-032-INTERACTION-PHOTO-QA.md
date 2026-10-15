# TASK-032 interaction and profile photo QA

Date: 2026-10-14 America/New_York. **Reviewed local candidate; task incomplete.** Application `6c9278bd992bcf6ef6a96ad0017e01800a27c817`, branch `agent/TASK-032-interaction-photos`, dependency merge `e280837e104182ae5bc186918da7e656d621f9e4`. Contract5985e6be/main e669d987 was published before dispatch. P1 milestone2c86ca8 and documentation-only main e738550 were remote verified; the publication handoff records later verified hashes.

## Environment and evidence limits

Preview: `http://127.0.0.1:3035/hangouts/saved` and `/profile`. Named fictional disposable backend `pals-task029`, API55521/DB55522. Existing local stacks and real/hosted users were not changed. Browser operations used normal fake Maya credentials; denial checks used normal fake Alex. No database reset, trigger/RLS bypass or hosted change. The supplied public Mapbox token stays in private local configuration, absent from Git/evidence. All photo fixtures are synthetic shapes/text.

The runtime matches437 of439 tracked application/package/schema/test files. Only the previously documented untracked local `lib/config.ts` callback3035 and `lib/feature-runtime.ts` IPv6 loopback availability adapters differ. Tests/lockfile were synchronized after the build; those copies changed no built app code. Source permissions/gates are unchanged. Default Turbopack rejects the inherited external root dependency symlink; the production webpack build succeeds. Package `react-easy-crop` is pinned6.2.4 with lockfile; isolated local dependency links are not committed.

Actual primary phone viewport was319×720. Desktop DOM was1280×720; some viewport captures are944×720 and omit the far right of that DOM. Full-page profile captures1280×1975. Optional-photo crop/empty screenshots are1280×720, despite their earlier temporary filenames; renamed accurately before publication. No physical mobile device, pinch or native mobile picker claim follows from responsive rendering. Full-page map capture resizes its map and starts source reloading; the retained map image is a loaded normal viewport card. Native pointer checks were batched because separate automation calls restore the pointer. This does not prove every fast/corner trajectory.

## Executed checks

| Journey | Observed result |
| --- | --- |
| Primary in-place chooser → preview → slider up/down, Reset, keyboard reposition → Save | Actual server action assigned a new600×600 metadata-free WebP at revision5. Owner portrait and header immediately loaded it. Refresh and fresh independent normal Auth read the same path/revision. Name/bio/major/four extras preserved. |
| Primary narrow controls/Cancel | A319×720 check found hidden bottom actions;7e89 shortened crop/scroll/sticky actions. Repeat showed Cancel/Save at y608–652, Choose photo opening focus and no horizontal overflow. Cancel kept the saved primary. |
| Desktop primary wheel/drag/Cancel | Wheel changed zoom1→2.44; pointer drag changed visible translation to34.56px/19.4331px. Cancel returned to the profile without saving. |
| Extra Replace → Save → Reposition → zoom/Save | Replace initially disables Save until a newly validated file. Actual portrait source saved599×333WebP at revision6, recrop592×329 at revision7, old detached object removed. Primary/other fields unchanged. |
| Extra movement | Move right saved at revision8. At final source, native desktop drag moved first photo onto second, acknowledged Photo order saved with no accidental View dialog. Move right restored original order; reload and fresh Auth/byte checks confirmed it at revision18. No object upload/deletion for reordering. |
| Optional counts4→3→2→1→0 and empty Add | Actual Delete actions acknowledged each count. Zero shows a usable Add placeholder. Empty Add chose synthetic800×600, cropped and saved799×444WebP at revision15. |
| Field editing/errors | Inline name plus music/food/fact/Instagram saved at revision9 and survived refresh. Three-sentence bio failed with a clear error and retained the edited name/draft; corrected save succeeded. Root restored original text/optional fields through UI at revision10. School/email stay readonly. |
| Owner isolation/conflict | Normal Alex raw photo read, foreign namespace upload and Maya profile write denied. Stale/foreign reorder action attempts denied with profiles unchanged. The handcrafted forged-order request returned conflict: it proves denial, not isolated runtime permutation-validator coverage. The permutation helper has executed unit coverage and source review. |
| Sign-out/sign-in | With primary crop modal open in one tab, Sign out in another removed the old modal and decoded owner primary. Normal sign-in and profile navigation restored the saved primary/four extras. This checks ordinary cross-tab Auth loss, not a delayed in-flight upload race. |
| Map selected state and travel | Pointer-only Study preview loaded, moving into View kept card open in the same call. Selected pin computed scale1.08, unchanged Mapbox positioning transform and same base shadow as unselected pins; no selection filter/glow. Close removed card/returned focus; explicit Enter on same pin reopened it. |
| Place-first create | Initial page showed map/public label before details. Empty Continue did not advance. Actual map click populated35.909/-79.049; Continue→details→Back→Continue retained label/coords/title/date. Real Create persisted a fictional QA Hangout with expected public coordinates/time through normal owner action. No automatic GPS prompt. |

The four-extra backup was restored through normal owner Storage upload and profile CAS after the zero/Add journey, then only the detached new Add object was removed. Final independent normal Auth read at revision18 confirms exact original extra bytes/order, preserved primary/text, five references/five stored objects, zero missing/unreferenced. This is local synthetic fixture recovery, not migration or a production cleanup sweep. The intentionally named fictional QA creation remains in the disposable backend.

## Automated/source review

- Final `node --test tests/*.test.mjs`: **93 pass,0 fail,0 skip**, loopback listener allowed.
- Scoped ESLint on11 changed web TypeScript/TSX files: pass/no warnings. Admin `tsc --noEmit`: pass. Final runtime `next build --webpack` including web TypeScript: pass. `git diff --check`: pass.
- Included image tests independently exercise actual JPEG/PNG/WebP framing/decode, orientation6, metadata removal, transparent input, square/9:5 limits, portrait/landscape, animation, trailing/corrupt bytes,5MiB/20MP caps and tiny-image rejection. Order tests verify exact permutation; existing Account/profile validation tests pass.
- Fresh independent StageM review cleared031f; P1 review cleared8b89 plus7e89 modal fix; P2 review cleared730/6c file-selection and crop-state fixes. Final fresh Sol-medium combined source/React review at6c found no concrete blocking issue. Dispatch cannot configure or verify Standard speed.

## Preserved boundaries and remaining acceptance

Primary and optional photos reuse immutable owner upload→revision CAS→post-detach cleanup. The server is authoritative for actual format/aspect/output; crop stays local until Save. Existing saved pixels are the starting point for recrop; cropped-away original pixels cannot be recovered. Invalidation is payload-free. Current owner/header and authorized server pictures refresh; only Calendar/saved previews hold client photo data and re-read their existing no-store API. Chat/DM threads, People browse/friends and notifications currently have no photo JSX to refresh. Other users' open sessions see replacements on their next authorized fetch; no new push service or permission was added.

Still open: physical iOS/Android touch/pinch/native library picker and keyboard fit; real OS file-drop onto uploader/slot; interrupted/slow network, refresh during upload and precisely timed parallel save/Auth/source revocation tests; current cross-tab Calendar/saved preview invalidation under a photo replacement; exhaustive fast/corner hover trajectories, unavailable-map/manual fallback and targeted all-off/visibility/BFCache timing on this exact candidate. Source guards/unit fixtures are evidence, not executed browser fault tests. No production-ready/full completion claim. Ella's concrete sign-off, TASK-027/028 staged student/peer/moderation/recovery acceptance and reviewed application integration to canonical main remain required. Hosted resources, migrations, gates, provider credentials/restrictions, domains and production were untouched.

## Screenshots

Synthetic-only files and SHA256/dimensions are in [evidence/task032/manifest.json](evidence/task032/manifest.json). Primary phone crop, desktop circular/rectangular crop, empty gallery, full profile and map preview are preserved without editing. The manifest distinguishes actual image sizes/source stages. Aggregate safe QA receipts are published without credentials, Storage paths, personal files or raw provider URLs.
