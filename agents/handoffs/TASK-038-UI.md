# TASK-038 student header handoff

Status: local CSS candidate built and rendered in the named disposable preview; publication and coordinator status review remain. Starting HEAD `149edc6` contains canonical main `83a0153` and reviewed TASK-037 source `8aa18c5`.

## Change

The shared student header keeps its existing three-column, single-row layout through 1088px. The stacking media query in `apps/web/app/globals.css` now begins at 720px rather than 1100px. This leaves the existing compact phone layout, navigation order, account concealment, current-page styling, focus styling and 44px account targets intact. No route, data or backend behavior changed.

## Verification and limits

- `git diff --check` passed.
- Prettier checked `apps/web/app/globals.css` successfully.
- Source layout calculation: at 1088px, the page inner width is 1020px after its 34px side padding; fixed header columns occupy 90px for the brand and 164px for the three 44px account targets plus two 16px gaps, leaving the flexible center column ample room for the three primary links. At 721px the inner width is 653px and the center track is at least 359px after fixed columns and two 20px gaps. The nav has three short labels and retains 44px minimum height.
- `https://usepals.com/` was attempted through web inspection, which reported the URL inaccessible.
- Coordinator copied this exact web source into the named disposable local runtime, where `next build --webpack` passed compilation and TypeScript. No dependency or lockfile changes were made.
- Authenticated Chats was measured in the local built preview: at 1088, 900, 768 and 721px, the logo, primary nav and account controls share one header row. The 1088px header shrank from 151px to 80px high; nav/account tops both measured 17.5px. The 721px nav ends at x521 and account controls begin at x541, leaving a 20px gap. At 720 and 375px, the existing two-row phone layout resumes. Document scroll width equalled the viewport at every checked width.
- Screenshots: `docs/ux/evidence/task038-local/header-1088.png`, `header-721.png`, `header-720.png`, and `header-375.png`. The present-page Chats icon and primary current-page CSS remain unchanged; 44px targets and `:focus-visible` rules remain intact. A ready-user visit to `/restricted` redirected to Hangouts, so a limited-account fixture was not rendered. Source inspection confirms its separate header overrides remain at max-width 720px; the layout change does not alter that state.
- `https://usepals.com/` and a local `file://` fixture were unavailable in the agent environment; the authenticated local preview supplied rendered evidence instead.

TASK-032/033/034/035/036/037 release and application-main gates remain open. The coordinator owns the task branch publication, shared status records, and main integration decision.
