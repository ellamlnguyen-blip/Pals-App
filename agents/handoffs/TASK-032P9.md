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

## Coordinator review and local verification — 2026-10-15

Contract `97b4015a0dfeb1a49c9b1fd37d1dbddef593f325` and canonical main `9c0700a17b55f91d0354f2efa28a5872756e67a1` were published and independently remote verified before fresh GPT-6 Sol/medium dispatch. Application source `50887e9f946212eb4f7974c84cef268b3d32a348` reviewed in full: markup/location/unused heading CSS and pin visual only; map.tsx/data/authorization/create actions unchanged. Runtime webpack production build (including web TypeScript) exited0. Coordinator reran existing pin/period tests:5/5, no skips, with existing Node typeless-package advisory. Worker scoped lint/format/typegen/TS passed.

Rendered default desktop1280×720 and narrow375×812 with live local-authorized map data. Visible heading row gone; accessible hidden h1 retained. Create is a labeled/title44×44 plus within map top right. Desktop filter measured394×56 vs prior475×60 (prior viewport1128); checks are24px with44px label targets. Narrow filter wraps two rows with about9px clearance before plus, no page overflow. Screenshots visually inspected; rounded head/pointed tip, emoji/time shades remain.

Real hover: outer marker stayed48×56 at x639.594/y245 and matrix(1,0,0,1,578,131), both at rest and selected; outline/shadow none, child transform none→translateY(-3px) only. Preview retained on pointer travel into card; Escape closed. Enter on plus navigated to Make a plan / Step1of2 Public place; cancelled without creating. All periods off displayed Choose a time period; restoring all recovered pins. No records, preferences, coordinates, permissions, backend config or hosted environment were mutated. Viewport override reset. Evidence: docs/ux/evidence/task032p9.

Browser recovery: original automation tab refused localhost after server restart despite a healthy HTTP200 outside sandbox. A fresh tab in the same selected browser rendered and completed all checks; retained as preview deliverable. No browser-security bypass. No physical mobile-device gesture test. Parent TASK-032 remains incomplete behind existing device/fault/staging/sign-off/application-main gates; no automatic successor. Tools do not expose Standard speed configuration/verification.

Source candidate `673f812e0abde468b00f080c103362520295a3c6` (application50887e9) is pushed and independently remote verified. Canonical outcome publication is documentation/evidence only while parent gates remain.

## Canonical publication receipt

Documentation branch `bd6707f46e87dd481409c522fe2086d323871246` and documentation-only main integration `8d93f0ac10fa81cfcde8266ba8d720cdd280bb8d` were pushed and independently remote verified. Twelve documentation/evidence files only were integrated; application source remains on673f812 behind parent gates. This receipt does not declare TASK-032 complete or dispatch a successor.
