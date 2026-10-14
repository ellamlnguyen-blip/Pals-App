# TASK-030 visual polish handoff

Scope: Calendar CSS and ready-account header utility visibility only. Reference: user-supplied October 2026 Calendar image. No calendar logic, time-grid height math, tokens, authorization, or data behavior changed.

## Outcome

- Calendar content now uses Nunito at normal body weight; Baloo remains on the page title, date heading and preview title. The page uses the existing accessible profile blue token for its main hierarchy.
- Reduced bulky type in tabs, grid headings and event cards; event names are 14px. Gave the category legend a local screen-reader-only style so its fieldset legend does not appear visually, while preserving its accessible name. Fixed checkbox dimensions against global input minimums and padding.
- Increased preview title and circular attendee photos toward the supplied reference. Kept existing 48px hour scale and 44px calendar controls.
- Ready-account header now shows the avatar alone in the account region. Safety and sign-out remain visible in the header while account readiness is false, preserving recovery access.

## Verification

- `git diff --check` passed.
- Direct installed Prettier check for both changed files passed.
- Direct installed ESLint check for `student-shell.tsx` passed.
- `pnpm exec` refused the worktree's shared `/private/tmp/pals-task029-ui/node_modules` symlink as outside its project root; the direct installed binaries ran successfully.
- Rendered desktop and phone QA remains with the coordinating TASK-030 session.

This is a bounded visual subtask. TASK-030 remains incomplete pending parent QA, review and publication.
