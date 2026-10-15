# TASK-032P4 map feedback handoff

Status: source candidate for coordinator review; parent TASK-032 remains incomplete. Branch `agent/TASK-032-interaction-photos`, baseline `362c9d4b94879683353e5e7b7fb00690d818ea72`.

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

Real browser hover and preview corridor, keyboard Close/reopen, filter empty/recovery, mobile layout and source review. No hosted backend or application operation was performed; this is a presentation-only correction to existing persisted Hangout discovery. Parent physical-device, fault, staging, user sign-off and main-integration gates remain open.
