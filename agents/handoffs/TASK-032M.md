# TASK-032 Stage M handoff — map preview and place-first creation

Status: implementation ready for coordinator browser QA and review; not committed or published. Branch `agent/TASK-032-interaction-photos`, baseline `e280837e104182ae5bc186918da7e656d621f9e4`.

## Outcome

- Saved map now keeps matching Mapbox markers across item updates. Preview dismissal tracks pointer over the pin/card and focus, with a short travel grace. Explicit Close/Escape returns focus and suppresses immediate reopening; later keyboard focus can reopen after blur. Preview placement prefers a side with room and avoids clipping where space permits. Selected pin uses CSS `scale: 1.08` without replacing Mapbox's positioning transform, and keeps a visible focus outline with reduced-motion handling.
- New Hangout creation now starts with the existing approximate public map picker, broad label and manual coordinate fallback. Continue validates the place fields and rounds coordinates to three decimals, then reveals the existing details form. Back keeps both steps' entries. Existing Hangout editing still shows the original combined editor. The caller-bound create action, replay/idempotency handling and server validation remain unchanged.
- Updated new-page copy to match the order. No provider, permission, schema, grant, hosted operation or GPS behavior changed.

## Scoped files

`apps/web/app/hangouts/saved/map.tsx`, `saved-discovery.tsx`, `saved.css`; `apps/web/app/hangouts/editor.tsx`, `create.css`, `new/page.tsx`; this handoff.

## Evidence and remaining review

- Targeted ESLint and `git diff --check` pass. Direct web TypeScript passed before parallel profile edits appeared. A later shared TypeScript run fails on the parallel profile editor's unresolved `react-easy-crop` module and inferred types; none of the diagnostics point to Stage M files.
- The normal pnpm wrapper cannot run here because shared `node_modules` links resolve to another worktree and it refuses to replace them. Direct local binaries were used for the checks above.
- Coordinator browser QA remains: slow/fast/corner pin hover, focus/Escape/Close, selected scale, 319px layout, map unavailable/manual coordinates, Continue/Back and create submission. `https://usepals.com/` was requested as visual context but its page was inaccessible to the web inspection tool.
