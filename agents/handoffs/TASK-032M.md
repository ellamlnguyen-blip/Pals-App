# TASK-032 Stage M handoff — map preview and place-first creation

Status: source committed at8117ad4 plus reviewed031f1cf corrections; final candidate6c9278b has coordinator local QA. Parent remains incomplete. Branch `agent/TASK-032-interaction-photos`, baseline `e280837e104182ae5bc186918da7e656d621f9e4`.

## Outcome

- Saved map now keeps matching Mapbox markers across item updates. Preview dismissal tracks pointer over the pin/card and focus, with a short travel grace. Explicit Close/Escape returns focus and suppresses incidental reopening; an explicit click, tap, Enter or Space on the same pin reopens it. Preview placement prefers a side with room and avoids clipping where space permits. Selected pin uses CSS `scale: 1.08` without replacing Mapbox's positioning transform, and keeps a visible focus outline with reduced-motion handling.
- New Hangout creation now starts with the existing approximate public map picker, broad label and manual coordinate fallback. Continue validates the place fields and rounds coordinates to three decimals, then reveals the existing details form. Back keeps both steps' entries. Existing Hangout editing still shows the original combined editor. The caller-bound create action, replay/idempotency handling and server validation remain unchanged.
- Updated new-page copy to match the order. No provider, permission, schema, grant, hosted operation or GPS behavior changed.
- Follow-up review correction: explicit activation reopens the pin after Close/Escape, while incidental focus/hover remains suppressed; the preview Close control now has a 44×44px target.

## Scoped files

`apps/web/app/hangouts/saved/map.tsx`, `saved-discovery.tsx`, `saved.css`; `apps/web/app/hangouts/editor.tsx`, `create.css`, `new/page.tsx`; this handoff.

## Evidence and remaining review

- Targeted ESLint and `git diff --check` pass. Direct web TypeScript passed before parallel profile edits appeared. A later shared TypeScript run fails on the parallel profile editor's unresolved `react-easy-crop` module and inferred types; none of the diagnostics point to Stage M files.
- The normal pnpm wrapper cannot run here because shared `node_modules` links resolve to another worktree and it refuses to replace them. Direct local binaries were used for the checks above.
- Coordinator browser QA remains: slow/fast/corner pin hover, focus/Escape/Close, selected scale, 319px layout, map unavailable/manual coordinates, Continue/Back and create submission. `https://usepals.com/` was requested as visual context but its page was inaccessible to the web inspection tool.

## Coordinator final receipt

Final combined source review and93units/scoped lint/admin TypeScript/runtime webpack pass. Actual pointer-only preview/into-card travel, scale1.08/same base shadow, Close and same-pin Enter reopening passed. Real map-place-first Back/Continue/create persisted through normal owner action. Remaining trajectory/fallback/visibility/device gates are precisely listed in TASK-032-INTERACTION-PHOTO-QA.md; no blanket hover/mobile completion claim.
