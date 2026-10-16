# TASK-040 owner Profile options removal — UI handoff

Status: bounded local source candidate for coordinator review. TASK-040 remains incomplete until rendered responsive QA, review, and canonical-main integration are complete.

## Source and behavior

- Branch: `agent/TASK-040-remove-profile-options` in `/private/tmp/pals-task040-ui`.
- Canonical main baseline: `fbdcf27`; exact reviewed TASK-039C source: `8ceca20fdcc017e9aad4ede1bb000846744824f4`; recorded merge baseline: `9849519`.
- The signed-in owner's `/profile` top bar now renders Back and Edit profile without a Profile options trigger, popup, or its former sharing and verification explanation. The shared top bar renders options only when menu children are supplied. Both peer-profile call sites still supply menu content; report/block safety actions remain in `PersonView` and were not edited.
- Owner profile display and footer links remain. No route, account permission, schema, API, migration, or hosted resource changed; this presentation removal has no new backend persistence requirement.

## Verification

- `tsc --noEmit` for `apps/web`: passed with the existing TASK-039A dependency installation linked only into this disposable worktree.
- Webpack production build: passed, including TypeScript, page generation, and `/profile` plus `/people/[id]` routes.
- Touched TypeScript ESLint with zero warnings, Prettier check, and `git diff --check`: passed.
- Source layout review: the owner top bar keeps accessible Back and Edit profile labels and 44px minimum controls; the owner Edit action drops the 62px menu reservation at desktop and phone breakpoints. The peer menu still receives its report/block content and 44px trigger. No blank owner trigger is rendered.
- Live `https://usepals.com/` inspection was attempted but DNS was unavailable. The checked-in design direction and existing tokens/components supplied the visual baseline.

## Remaining gates

- Authenticated 811px and 375px rendered checks of owner and peer profiles remain. This worktree has no isolated Auth/API/browser preview, and the shared 3035 stack was deliberately untouched. Check back/Edit focus and overflow, peer report/block access, and the owner footer links in that preview.
- Coordinator review, status publication and application-main integration remain. ADR-0046 acceptance was separately published on main after this task's baseline; TASK-039E migration reconciliation and TASK-039D browser evidence remain predecessor gates. TASK-039 and earlier release/hosted gates remain open.

Task branch publication and independently checked remote SHA will be recorded in a follow-up receipt below.
