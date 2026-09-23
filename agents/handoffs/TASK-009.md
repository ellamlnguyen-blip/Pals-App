# Handoff — TASK-009 local saved Hangout Calendar

Date: 2026-09-23
Agent: task-specific implementation agent
Branch/worktree: `agent/TASK-009-calendar`, `/Users/ellanguyen/.codex/worktrees/a21e/Pals App`
Starting verified canonical main: `29c9343edc560dd0731804b3b9624f8329ad6d4c`
Task branch and pushed implementation SHA: `06101ee68ebb8b42e9f783769faf9fab0aea280e`, verified with `git ls-remote`
Integrated main commit SHA: `0c2af8e3401dd6acce6d87249886f7e31b2e7175`, pushed and independently remote-verified
Main status record: `tasks/active/TASK-009-calendar.md`; coordinator published dispatch milestone at `3ff9600963e9905c857683c5d82baa3b67d189d6`.
Outstanding blockers: coordinator integration/remote main receipt pending; no implementation or review findings remain.

## Outcome

Ready local students can open Calendar from primary Hangouts navigation, select a campus date, Day/Week and Discoverable/Joined/Hosting, navigate dates and return to Today. An accessible day-grouped agenda links to existing saved Hangout detail. Weeks run Monday–Sunday; America/New_York midnights form exclusive ranges, including 23/25-hour DST days. Known-end plans appear on each overlapping day; unknown-end plans appear only on their start day and say End not set. Past dates make no attendance claim. Inputs accept real dates from 2000-01-03 through 2100-12-26 and explicit view/filter enums.

Queries use caller-session RLS only. Published reads embed only the caller's joined/current-ready participant ID; Joined uses an inner embed before limit, Hosting filters immutable host before limit. Cancelled personal records use a separate bounded public read: existing RLS proves host/still-joined access while deliberately withholding the cancelled roster. Both subsets are ordered by start/ID, fetched with a 101st-row sentinel, merged deterministically and capped at 100 with truncation disclosure. Full bounded results and readiness are checked again before serialization. Returned fields are title, schedule, approximate public place, status, Hangout ID and caller relationship only; no host account ID, private instructions, roster, peer profile/photo or historical membership enters Calendar payloads.

Native GET forms/full-document links request fresh data, avoiding prefetched router results and asynchronous client-result races. A restored browser-history document reloads on persisted pageshow. Empty/invalid/error/loading/truncated states are explicit. Existing local configuration/loopback guard, ready-only route and default-disabled database gate remain authoritative. No schema, grants, RLS, dependencies or hosted operations changed.

## Files changed

- `apps/web/lib/calendar-time.ts`: date validation, DST-safe ranges, overlap and deterministic ordering.
- `apps/web/lib/calendar.ts`: bounded filtered caller-session reads and conservative revalidation.
- `apps/web/app/calendar/`: server agenda, responsive shared-token styles, loading/error and history-refresh leaf.
- `apps/web/app/hangouts/shell.tsx`: activate local Calendar navigation.
- `tests/calendar.test.mjs`: date/DST/overlap/order checks.
- `supabase/tests/calendar-http-checks.mjs`, invoked by existing Hangout action suite: real HTTP/role/record regression cases.
- `docs/ux/TASK-009-INTERACTION-PLAN.md`: design/interaction plan after Leon Taste and direct usepals.com browser inspection.

## Tests / verification

- `pnpm check` passed: formatting, ESLint, typechecks, 17 unit tests and web/admin builds. Subsequent CSS-only refinement was rebuilt successfully; final formatting/lint and all 17 unit tests also passed.
- `pnpm db:verify` passed two clean local resets, 226 pgTAP assertions each and clean public/private schema lint. SQL tests ran with actual database roles and read-only worktree test mount.
- Equivalent built-loopback runner passed all three serialized Auth/Storage/Next HTTP/action/Hangout/profile concurrency suites (3/3). The separately tracked Next dev-helper invariant was not repaired or claimed as passing. The temporary runner was the existing helper with `pnpm --filter @pals/web start` substituted for dev and its existing profile-fault-loader path made absolute.
- Calendar real HTTP cases: published truncation above 100; joined plan after first 100 campus rows still found without false truncation; host/joined classifications; join/leave/removal; cancelled joined/host visibility; left/removed/unrelated cancellation exclusion; known-end cross-midnight overlap; exclusive end boundary; previous-day unknown-end exclusion; invalid inputs; anonymous/ready-revoked/gate-disabled denial; no private sentinel or host account ID in Calendar HTML/RSC. Existing SQL/HTTP suites verify cross-campus, stale-email, unready and direct-permission denial under unchanged RLS.
- GitHub implementation-tip CI run `35810561283`, database job `107020974081`, failed before Calendar assertions at the existing `hangout-action-checks.mjs:34` action-ID manifest assertion (`createHangout`, `editHangout`, `searchSaved`, `changeSavedMembership`). Validate, both SQL passes and concurrency checks passed. Coordinator verified the identical assertion failure on canonical pre-Calendar baseline `e2e3b2d` ([run 35806871829](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35806871829), job `107009578459`, line 33); the new import shifts it to line 34 in [Calendar run 35810561283](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35810561283). This pre-existing helper issue remains separately bounded; no helper repair is included and hosted CI is not claimed green. Built-loopback actual suites above passed.
- Local temporary logs: `/private/tmp/pals-task009-check.log`, `pals-task009-web-build.log`, `pals-task009-db.log`, `pals-task009-http.log`. These are execution evidence, not durable repository artifacts.
- Coordinator rendered desktop Day/Week and Joined controls; phone layouts at 325px and 390px showed no horizontal overflow. Browser Back from saved detail visibly showed loading, then the independently updated public title on the original Week/Joined selection. Keyboard form submission and visible focus passed. The joined week displayed a clear red Cancelled label and first-100 disclosure without phone overflow. A temporary outside-repository Node fetch preload returned 503 only for loopback public Hangout GET reads, preserving Auth/readiness: at 390px the Calendar rendered its safe read-error, retry link and no old Hangout content. The preload was removed and normal server restored. Suspending the disposable account redirected Calendar to `/restricted` with no Calendar content. Empty and loading states also passed; temporary browser override was reset and tab closed.

## Decisions and limitations

Existing ADR-0010 exactly supplies the required cancelled-personal access; no prerequisite/schema expansion was needed. Calendar intentionally has no friends/restricted views or private detail reads. Authorization rechecks detect observed changes between bounded reads; later transitions retain normal HTTP delivery race limits. Previously delivered public information cannot be recalled. Disabled gate is indistinguishable from an empty RLS result, preserving the existing feature-gate policy without adding an oracle. Existing hosted Auth delivery and launch safety prerequisites remain open.

## Cleanup / publication

Coordinator reviewed source and actual desktop/phone states with no remaining findings. Cleanup removed the disposable visual account and its Hangouts/photo, then a final local reset cleared an orphan Storage record from the regression suites. The final reset verified `gate=false`, `hangouts=0`, `auth.users=0` and private profile-photo object rows `=0`. Local web/Supabase stopped; Lima shutdown and temporary read-only mount removal completed before receipt publication. Coordinator owns queue/current-state/changelog and main integration. No next task is dispatched.

## Ready for next task?

TASK-009 complete. No next task is automatically dispatched.

## Coordinator integration receipt
Reviewed task tip `777d4b875bedd26ea925a4982433809d3b048cc2` and main `0c2af8e3401dd6acce6d87249886f7e31b2e7175` were pushed and independently verified with `git ls-remote`. Fresh review, rendered checks, cleanup and shared status records are complete. The documented pre-existing CI manifest failure remains a separate maintenance task; bounded local Calendar checks pass.
