# TASK-034F — Similarity-ranked Pals UI handoff

Status: bounded source candidate ready for coordinator review; TASK-034 remains incomplete. Worktree `/private/tmp/pals-task034f-pals-ranking-ui`, branch `agent/TASK-034F-pals-ranking-ui`. Baseline supplied by coordinator: canonical main `c1612a4` plus reviewed TASK-034D source merge `37f2ea8`. No git stage, commit, push, database apply, runtime server, or hosted operation was performed.

## Outcome

- `/people` now requests `browse_similar_pals` with major/year filters, a backend-issued opaque cursor, and limit 24. Name search and old `afterId` links remain rejected. Filter submission begins a new first page. Paging and profile return links preserve current filters and cursor.
- A narrow parser accepts at most 24 unique safe card records plus coherent `has_more`/`next_cursor`, then copies only the five public card fields. It rejects malformed or inconsistent responses without rendering rows. No rank, score, hometown, interests, match explanation, or hidden count is displayed.
- A stale/invalid backend cursor (`22023`) shows a refresh action to the first page under the same filters. A page emptied by later visibility changes offers the same refresh. Access-closure (`42501`) retains the existing manage-visibility state. Friend heart, outgoing clock, whole-card profile link, and photo projection remain unchanged.

## Files

`apps/web/app/people/page.tsx`, `apps/web/lib/people-selection.ts`, `apps/web/lib/people-selection.test.mjs`, `apps/web/lib/similar-pals-page.ts`, `apps/web/lib/similar-pals-page.test.mjs`.

## Checks and remaining verification

- Focused Node tests: 4/4 passed. `git diff --check`: passed.
- Full web TypeScript/build were attempted, but this worktree has no linked package binaries and the package manager attempted unavailable registry fetches. They did not complete. Restore/link the existing dependencies and rerun both checks before acceptance.
- `https://usepals.com/` inspection was attempted; the web tool reported it inaccessible. Existing design direction and cards were preserved without visual redesign.
- No runtime server or browser was authorized for this stage. Desktop and 375px screenshots, named-disposable major/year filtering, >24 pagination, profile-edit/rich-withdrawal stale refresh, hidden/block/opt-out omission, and badges still need coordinator verification. No screenshots were captured. TASK-034 parent still needs final review, sign-off, hosted evidence where applicable, main integration, and remote SHA verification.
