# TASK-034A — Existing-data Pals presentation handoff

Status: implementation ready for coordinator review; TASK-034 remains incomplete. Worktree `/private/tmp/pals-task034-ui`, branch `agent/TASK-034-pals-chat-discovery`. No git stage, commit, push, runtime, hosted or backend mutation performed.

## Outcome

- Student navigation and visible discovery/profile/sharing copy now say **Pals**, and directory heading says **Discover your next Pal!** Existing `/people` URLs, RPC names and database types remain unchanged.
- Directory filtering now accepts only major, graduation year and a bounded cursor. The name field is gone, `browse_people` receives `p_search: null`, old `search` query/return links fail safely, and paging preserves only current filters.
- Directory cards and full peer profiles show a small accessible heart for an exact current accepted friendship or clock for an exact outgoing pending request. At most 24 card `get_friendship` reads occur per page, keyed by the displayed peer ID. Failed or mismatched reads show no badge. Profile badges follow current friendship control changes and the existing profile concealment behavior.
- `/people/friends` redirects to `/people`. Discovery and owner profile no longer link to the former list. Friendship notification destinations now open the exact actor's current peer profile, which rechecks live visibility; owner profile links to Notifications for incoming request management. Peer profiles retain accept, cancel and unfriend controls.

## Files

Presentation: `apps/web/app/student-shell.tsx`, `apps/web/app/people/page.tsx`, `apps/web/app/people/people.css`, `apps/web/app/people/friendship-badge.tsx`, `apps/web/app/people/friendship-badge-state.ts`, `apps/web/app/people/loading.tsx`, `apps/web/app/people/[id]/page.tsx`, `apps/web/app/people/[id]/person-view.tsx`, `apps/web/app/people/[id]/loading.tsx`, `apps/web/app/people/[id]/request-control.tsx`, `apps/web/app/people/friends/page.tsx`, `apps/web/app/people/friend-control.tsx`, `apps/web/app/people/privacy/page.tsx`, `apps/web/app/people/actions.ts`, `apps/web/app/profile/profile-summary.tsx`, `apps/web/app/profile/editor.tsx`, `apps/web/app/notifications/notifications-inbox.tsx`, `apps/web/app/safety/safety-client.tsx`, `apps/web/app/hangouts/saved/[id]/management-controls.tsx`, `apps/web/app/forms.tsx`, `apps/web/app/account/analytics/page.tsx`, `apps/web/lib/friendship-create-outcome.ts`, `apps/web/lib/notification-destination.ts`.

Selection logic: `apps/web/lib/people.ts`, `apps/web/lib/people-selection.ts` (pure helper extracted from server-only module for direct focused tests). Tests: `apps/web/lib/people-selection.test.mjs`, `apps/web/app/people/friendship-badge-state.test.mjs`, `apps/web/lib/notification-destination.test.mjs`.

## Checks and limits

- Focused Node tests: 5 passed. ESLint on changed core TS/TSX files: passed. Prettier check on changed core files: passed. `git diff --check`: passed.
- Full web TypeScript check was attempted but inherited linked dependencies are incomplete: `apps/web/node_modules` points to TASK-033's tree without `@phosphor-icons/react`; the linked `@pals/types` also lacks `RichPeopleDetail`. The same check reports errors in many unchanged files. Coordinator should restore/build the linked runtime before typecheck/render review.
- `https://usepals.com/` inspection was attempted; the web tool reported the URL inaccessible. Existing design direction, tokens and current components guided the preserved blue/white style. Desktop/mobile rendered states, live RPC behavior and backend persistence were not exercised by this bounded stage; coordinator owns runtime review and later accepted backend stages.

## Coordinator review addendum — 2026-10-15

- Restored the existing client boundary on the new icon leaf (`"use client"`); the first full Next build exposed its missing boundary during page-data collection. The subsequent full `next build --webpack` in the isolated runtime clone completed, including TypeScript. The runtime clone alone keeps its exact local origin `127.0.0.1:3035` and named disposable database proxy `[::1]:54321`; neither local-only adjustment is source-controlled.
- Verified the actual `/people` page at desktop and 375px mobile in the local preview. Navigation says Pals, the heading and major/year-only filters render, cards remain whole-profile links, and the current outgoing request clock appears on Alex's card and full profile. Evidence: `docs/ux/evidence/task034-local/pals-desktop.png` and `pals-mobile.png`. The browser is a local preview backed by the existing disposable data, not hosted evidence.
- Focused tests remain 5/5 and `git diff --check` passed. Similarity ranking and chat attention remain dependent on ADR-0043 acceptance and backend/UI stages.
