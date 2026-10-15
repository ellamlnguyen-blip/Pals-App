# TASK-032P4 map feedback handoff

Status: source-reviewed and disposable-local rendered candidate; parent TASK-032 remains incomplete. Application `e6564f01e12f03328517fec8ca617d5e36d64bc9`. Branch `agent/TASK-032-interaction-photos`, baseline `362c9d4b94879683353e5e7b7fb00690d818ea72`.

## Outcome

- Saved Hangout pin buttons retain a 48×56 rectangular Mapbox-controlled hitbox. The visual shape and existing period colors moved to the pointer-inert cue child. Hover, selected and keyboard focus lift only that child by 3px vertically; the outer marker has no scale, selection ring, background or shadow. Keyboard focus-visible outline and reduced-motion behavior remain.
- Removed the heading campus decoration, default location-help copy, period explanation, success count and routine Refresh Hangouts control. Explicit Locate waiting/failure/result messages, map load/error/retry, list loading/denial/error/empty/truncation and error-only Try again remain. Fetch, generation, preview, location coordinates and authorization logic were not changed.

## Verification

- `node --test tests/saved-pin-cue.test.mjs`: 2 passed, including UNC time shade.
- Scoped direct ESLint on three edited TSX files: passed.
- `next typegen` and `tsc --noEmit` from `apps/web`: passed.
- Prettier check on four edited source files and `git diff --check`: passed.
- The `pnpm` wrapper refused the inherited symlinked `node_modules` because its target is another temporary checkout. Installed binaries ran directly without changing dependencies.

## Remaining coordinator gates

At the worker handoff, real browser hover/corridor, keyboard Close/reopen, filter empty/recovery, responsive rendering and source review were assigned to the coordinator. The worker made no backend/hosted change; this is a presentation correction to existing persisted Hangout discovery. Later coordinator results follow. Parent physical-device, fault, staging, user sign-off and main-integration gates remain open.

## Coordinator verification

Contract0f98017b7bf43804d7f207cdef12b44b635d8ce0 and canonical integrationa06cdb2a9388b3a11311a79a064d240589ee9192 were pushed and independently remote verified before fresh implementation dispatch. Source baseline362c9d4 merged canonical documentation, resolving only record conflicts with canonical content. Fresh read-only GPT-6 Sol/medium source review cleared exacte6564f0: child-only movement, stable outer target, inherited selection outline override, keyboard/reduced-motion and actual error/retry states preserved. Standard speed cannot be configured/verified in dispatch tools.

Runtime production webpack build and web TypeScript passed at exacte6564f0. All440 tracked app/package/schema/test files match the source except the same two documented untracked local callback3035/IPv6 availability adapters (438 identical). No new dependencies, schema/migrations, backend actions, auth/RLS/grants or coordinates/data changes. Existing named disposableAPI55521/DB55522 and fictional fixture rows were only read; no new Hangout/photo mutation was needed. Prior93-test and persistence matrices remain historical scope; this correction ran focused2pin tests and the checks above.

Actual512×720 browser with scrollWidth512: all four rendered outer markers are48×56, scale none, transparent background and no shadow. For Study at Davis, pointer rest→hover kept x181/y418.59375 and Mapbox matrix(1,0,0,1,147,182) identical. Only cue child changed none→matrix(1,0,0,1,0,-3). Outer outline-style stayed none; visual period color and ordinary base shadow were identical. Native pointer travel into the preview title kept it open. Close→same-pin Enter reopened; Escape closed and returned focus with keyboard-only visible outline. All four periods off yielded zero pins/Choose a time period; restoring them yielded four pins. Normal-page DOM has zero campus-decoration/default-location-help/period-help/success-count paragraphs and no routine Refresh button. Current map/list remain usable. Native JPEG screenshots and safe geometry receipts are under docs/ux/evidence/task032p4 with exact hash/dimension manifest.

Actual location permission/error/failure injection, physical touch, exhaustive corner/fast trajectories and the parent's fault/staging/sign-off/application-main acceptance are not newly claimed. No hosted operation or automatic successor. Source publication and documentation-only main outcome publication are recorded after remote verification.
