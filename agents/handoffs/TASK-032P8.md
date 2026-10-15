# TASK-032P8 notification attention handoff

Status: isolated candidate, pending fresh review, rendered runtime verification, parent gates and Ella's hosted sign-off. Branch: `agent/TASK-032-interaction-photos`; baseline `57bbacb1b88b4ca1f05527e1a76e0561ad218212`.

## Outcome

- Moved Chats and Notifications from primary text navigation into 44px envelope and bell controls beside the avatar. The bell displays an accessible, server-backed unread dot; account transitions and hidden/BFCache conceal it. Summary refreshes on route/focus/visibility, every 30 seconds, and after a same-tab or cross-tab acknowledgment.
- Removed the marked visible Notifications introduction and recent-update sentence. Kept a visually hidden h1. Refresh is a labeled arrow button.
- Added owner-only notification attention summary and cutoff acknowledgment RPCs over existing `private.notification_items.read_at`. Both follow gate/recipient locking, recheck active account state, and expose no source details. The inbox acknowledges only after a validated visible load; failed reads or acknowledgments never claim a clear. The prior per-item read and preferences APIs remain.

## Evidence

- Scoped ESLint, `tsc --noEmit -p apps/web/tsconfig.json`, and `git diff --check` passed.
- `node --test tests/notifications-auth.test.mjs tests/notifications-ui.test.mjs`: 5/5 passed.
- `next build --webpack`: passed. Default Turbopack build could not traverse the preexisting external `node_modules` symlink in this worktree.
- Parent applied the committed migration candidate to named disposable DB `supabase_db_pals-task029-disposable` and ran the rollback-only pgTAP fixture: 15/15 passed. The fixture was then made self-contained by explicitly enabling the notification gate; parent will rerun that revision.

## Remaining gates

Parent owns rerunning revised SQL test, desktop/narrow rendered behavior and fault checks, fresh security/design review, task publication and remote SHA verification. Hosted migration/application changes remain pending Ella's explicit candidate sign-off and existing release gates. No hosted operation or data reset occurred in this task branch.

## Review follow-up

- A notification-summary 403 now masks the bell badge without reloading the entire page, so a disabled notification gate cannot cause a healthy header to reload repeatedly. Existing auth transition handlers still conceal account chrome when the account changes.
- If snapshot acknowledgment is unconfirmed, the visible inbox shows “Could not mark updates as seen. Refresh to retry.” The existing refresh button loads a new snapshot and retries. Both confirmed failure and a lost response trigger a fresh server summary; the client never reports a successful acknowledgment without its response.
- Follow-up checks: scoped ESLint, TypeScript, five notification auth/destination tests, `git diff --check`, and `next build --webpack` all passed.
- A failed secondary `Frame` account lookup now leaves the page and icon controls usable with the attention badge unverified. With no actor, polling waits until a subsequent server navigation supplies one; the lookup cannot crash an already resolved route.
- A bell click while already on `/notifications` now refreshes the first inbox page through its existing probe and visible-load acknowledgment path. This lets a later arrival shown by the bell poll be loaded and acknowledged without leaving the route. Cross-route bell navigation is unchanged.

## Coordinator local verification — 2026-10-15

Final application source `f2a4b4cca1f56d22a1edd888202563d71a79b041`; contract `b569cc067fb96060fe4d38602b83c7ce32179d64` and canonical main `ec585d6cce06ebcf1debfbebec529b31ca67b1f6` were pushed and independently remote verified before fresh GPT-6 Sol/medium dispatch. Fresh reviewer resolved the Frame failure finding and inspected the same-route bell follow-up; see TASK-032P8-REVIEW.md. Coordinator reviewed the complete application/migration diff and runtime copied source.

Applied only the additive committed migration to the named disposable `supabase_db_pals-task029-disposable` (API55521/DB55522), without reset or persistent gate changes. Revised self-contained rollback pgTAP: 15/15 passed, zero failures. Covers anonymous denial, owner summary/all thirty rows across pages, foreign rows unchanged, idempotence, future-boundary denial, post-snapshot arrival and disabled/restricted denial. No client table grant/RLS/source/preference change. Final runtime webpack production build including web TypeScript exited0. Coordinator reran notification auth/destination units:5/5, no skips; Node emitted its existing typeless-package advisory.

Real fictional Maya browser/API journey: existing unread dot on People → bell click → successful Inbox display and confirmed acknowledgment → dot clears, rows Read → Refresh arrow works → fresh Auth verifies unread=false. API owner summary/no-store passed; wrong actor, anonymous, malformed query and future cutoff denied without acknowledgment. Inserted one explicitly named disposable notification fixture, observed the later dot through polling while still on the inbox, then ordinary bell activation reloaded/acknowledged the new row. Fresh Auth again verified read persistence, and only that test fixture was deleted. Existing six notification rows now persist read state; no source content/preferences/photos were changed. Envelope navigates to Chats and bell returns to Inbox normally.

Actual narrow319×720 and desktop1333×900 DOM geometry: envelope, bell and avatar share a row in that order, each about44×44, no page overflow. Primary text links are Hangouts/Calendar/People. Removed all marked visible copy; Notifications h1 remains a hidden1×1 accessible heading. Refresh button is labeled and arrow-only. Viewport override reset. Saved native screenshots and sanitized checks in docs/ux/evidence/task032p8; screenshots visually inspected. Earlier desktop/unread captures precede only the same-route/format follow-up; final narrow capture records final source.

Limits: no physical-device gestures, browser network-fault interception, second-tab broadcast journey, or actual concurrent two-connection emitter scheduling test was run. SQL post-snapshot semantics and lifecycle/auth-state logic tests passed; do not convert those into claims of device/fault/concurrency acceptance. Secondary Frame lookup failure leaves unknown badge until next server navigation; server polling is30seconds/focus/routes, not Realtime. Parent TASK-032 remains incomplete behind existing device/fault/staging/sign-off/application-main gates; ADR0041 remains Proposed. No hosted migration/application change or automatic successor. This is a verified disposable-local candidate.

## Task source publication

Candidate `7fcbf896deea649507e65bd51f421bb7b332e3bc` (application f2a4b4c) is pushed and independently remote verified. ProposedADR0041 remains unaccepted; canonical outcome integration contains only reviewed documentation/evidence. Backend migration stays on source branch pending accepted release/sign-off gates.

## Canonical publication receipt

Reviewed documentation branch `1994384b92aba48343a2b10f51594e2311669240` and documentation-only main integration `3728f0c35e4d32b5425aec15d28599a52c7159b3` were pushed and independently remote verified. Inventory contained eighteen documentation/evidence files only; no application/backend migration/tests/dependency/config source was integrated into main. Candidate7fcbf896 remains on its task branch behind parent acceptance gates. This receipt records the observed integration, does not accept ADR0041 or declare TASK-032 complete, and does not dispatch a successor.
