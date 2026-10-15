# TASK-032P9 map controls and classic pins handoff

Status: bounded source candidate for coordinator review. Parent TASK-032 remains incomplete. Branch `agent/TASK-032-interaction-photos`; baseline `b0483193a807c2b8cc398cf97ec653d9ec0d65a8`.

## Outcome

- Removed the visible Hangouts heading row. A screen-reader-only page h1 remains.
- Moved the existing `/hangouts/new` link into the top-right corner of the map as an existing-library Phosphor plus icon. It keeps the Create Hangout accessible name and title with a 44×44px target and visible keyboard focus.
- Reduced the period fieldset padding, label text, and checkbox sizes. Labels remain 44px tall; the fieldset's width reserves space for the plus control at desktop and narrow widths.
- Changed only the pointer-inert marker cue to a rounded head with a narrow tip. The outer 48×56px Mapbox marker, hover transform, period colors, emoji, preview flow, and data logic remain as before.

## Verification

- Existing `saved-pin-cue` and `saved-periods` tests: 5 passed.
- Scoped ESLint on edited TSX: passed.
- Web `next typegen` and `tsc --noEmit`: passed.
- Prettier on three source files and `git diff --check`: passed.

## Coordinator review

Review the rendered desktop and narrow filter/plus geometry, pin silhouette, pointer corridor and keyboard focus, and unchanged create/place-first flow. Runtime build and browser checks, source publication, main/shared-record integration, and parent device/fault/staging/sign-off gates remain with the coordinator. No backend, hosted, persistent-data, package, schema, or permission change was needed for this display adjustment. This worker did not touch unrelated untracked `node_modules` links.
