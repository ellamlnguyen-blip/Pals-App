# Handoff — TASK-010B local host/co-host management UI

Date: 2026-09-25
Agent: bounded TASK-010B UI agent (GPT-6 Sol/medium requested by the coordinator; dispatch has no Standard-speed selector or verification)
Branch/worktree: `agent/TASK-010B-host-management` at `/private/tmp/pals-task010b-host-management`
Starting independently remote-verified `origin/main`: `a57789e94a27318b8b693975745c2c09a48faa1c`
Local implementation SHA: `b262f43b3573689f71b3d0ace2a12b54b5c6c862` (follows review fix `38c7123798e0a586e713f4c18a06c96cd61a05ca` and initial UI commit `d590b7921981602bf383131f7047bf37b3f32244`). Task branch `origin/agent/TASK-010B-host-management` independently remote-verified at `903827995917e8bdbd2d98640ef24c4e861d1bfc` after the final handoff commit.
Independent review: coordinator reports reviewer cleared implementation SHA `b262f43b3573689f71b3d0ace2a12b54b5c6c862` with no remaining P1/P2 findings.
Integrated `main` SHA: pending coordinator publication and integration.
Main status record: coordinator owns `tasks/NOW.md`, `docs/operations/CURRENT_STATE.md`, `CHANGELOG.md` and queue updates.
Outstanding: coordinator acceptance and main integration. The Step down browser confirmation and final-tip screenshots remain unverified because available browser control could not open a tab.

## Outcome

Existing saved Hangout detail now displays the current-ready, account-ID-only roster with host/co-host/participant labels from TASK-010A's paginated RPC. Hosts can promote, demote and remove visible members, cancel the Hangout, and inspect/demote retained co-host assignments on a separate host-only paginated panel. Co-hosts can edit through the reused editor, open/close joining through the existing control, remove visible ordinary members and step down; ordinary participants receive no management controls. Host-only coarse size state remains only in the host joining branch. Nonhosts can still leave after cancellation; removed users remain barred from rejoining.

Server actions require local APP_ENV/loopback target, caller-session ready access and the TASK-010A RPCs. Management writes carry expected revision; stale/uncertain responses pause both management and sibling joining controls until authoritative refresh/reload, with no automatic destructive replay. Paginated list errors hide loaded IDs and private instructions, permission loss masks the detail, and an edit link is hidden while management is locked. Cancellation attempts hide private instructions immediately; the co-host editor clears private text after denial/uncertain response. The backend remains the authority for every role/target decision.

Review correction: block reconciliation can remove roster and retained assignment IDs without advancing the Hangout revision. Both initial detail and subsequent page reads now re-read their exact authorized RPC page after the source/ready check and reject any changed IDs or role labels before returning them. Host assignment re-read remains host-only; a mismatch returns a reload state and clears previously mounted IDs.

Second review correction: a successfully completed leave from a cancelled Hangout makes its source RLS-invisible to the now-left caller. The action now confirms the successful RPC with a fresh ready-state check and directs the caller to Saved Hangouts. The page performs another full sensitive-detail check after potentially slow chat reads, so a block, cancellation or readiness loss during chat does not render the earlier private instructions or roster/assignment IDs.

## Files Changed

- `apps/web/lib/saved-hangouts.ts`: paginated role and host-assignment reads, own-role check, revised detail recheck.
- `apps/web/lib/saved-hangouts-types.ts`: exact visible-page comparison for a second authorized read.
- `apps/web/app/hangouts/saved/management-actions.ts`: gated paginated readers and revision-required management actions.
- `apps/web/app/hangouts/saved/[id]/management-controls.tsx`, `page.tsx`, `host-joining-control.tsx`, `membership-control.tsx`, `saved.css`: responsive management UI, co-host joining, private masking, cancelled-member leave.
- `apps/web/app/hangouts/saved/[id]/edit/page.tsx`, `apps/web/app/hangouts/actions.ts`, `editor.tsx`: co-host edit route using the existing editor and authoritative post-save read.
- `docs/ux/TASK-010B-INTERACTION-PLAN.md`: desktop/phone interaction plan and reference inspection limit.
- `tests/hangout-visible-page.test.mjs`, `supabase/tests/database/local_cohost_authority.test.sql`: stable-revision visibility regression coverage.
- `supabase/tests/hangout-action-checks.mjs`: cancelled-leave and delayed-chat revocation assertions, plus the corrected post-removal cancel fixture revision.

No migration, RLS, RPC, provider, hosted/deployment, operator, notification/analytics or coordinator-owned status file changed.

## Verification

- Full final `pnpm check` passed after the review corrections: Prettier, ESLint, all workspace TypeScript checks, root tests (48 pass, 1 sandbox loopback skip) and both Next production builds.
- Disposable local Supabase at `127.0.0.1:54321`/`:54322` reset through TASK-010A migration. Actual-role co-host SQL suite passed 68/68 after five new assertions showing that a block removes an ID from both host list readers while Hangout revision stays fixed. Real Auth/PostgREST co-host suite passed 1/1. Observed-lock co-host concurrency suite passed 1/1.
- Existing built-loopback Auth/action/concurrency harness passed 4/4 on a clean database after **temporary, uncommitted** test isolation: skip unrelated People cache-header and friendship assertions, run the already-built Next server rather than dev so its action IDs match the production manifest, and correct its post-removal cancel fixture revision from 4 to 5. All harness files were restored before handoff. The unmodified harness previously failed at those unrelated assertions; its unmodified pass is not claimed.
- Following the second review correction, the built-loopback Auth/action suite passed 1/1 with the cancelled-leave and deterministic delayed-chat assertions. The test held a local chat table lock, waited until the detail request was blocked in `read_hangout_messages`, suspended the caller, released the lock, then checked the HTML contained neither private instructions nor the host/roster ID. The same run confirmed a cancelled participant's successful leave returns `saved` with a Saved Hangouts redirect even though the source becomes unreadable. Temporary unrelated People/friendship skips were restored; the Hangout test's expected revision correction is now committed so its added assertions are reachable.
- Real browser session with disposable local users: host saw only ID/role roster and host-only assignment panel; co-host saw edit/joining/removal/step-down but no host size message, cancellation or assignment panel. Co-host public and private edit saved, and close joining refreshed to closed. Desktop, 390px and 320px rendering inspected; 320px `scrollWidth=innerWidth=320`; keyboard Tab moved between roster actions with visible focus. The browser control timed out at the JavaScript step-down confirmation, so that final click was not visually verified; backend SQL/HTTP cover step-down. A later bounded retry found no enabled browser surface in CUA, its in-app tab could not open, and the installed `agent-browser` skill's CLI was absent; no final-tip screenshots or Step down click are claimed. `https://usepals.com/` could not be loaded by the available web tool; existing `DESIGN_DIRECTION.md` records its earlier direct inspection.
- Following the focused built-loopback suite, a local database reset verified 0 Auth users, 0 Hangouts, 0 photo objects and the Hangout gate off. The regression SQL runs in a rolled-back transaction. No credential or local fixture is committed.

## Decisions and limits

The current-ready roster and retained assignment panels use TASK-010A's 24-row keyset readers. The UI never queries historical members or peer profiles. A host's existing nonready/left removal RPC permission remains but has no new enumeration control. Page-reload guidance is deliberate after response loss; there is no blind retry. A second exact page read catches visibility transitions during preceding awaits; separate RPC calls cannot form a single atomic snapshot if a new transition occurs after the final read. Local built-loopback action verification used temporary harness edits only because existing helper assumptions did not match the current People cache response and revision/manifest state. The unmodified action harness needs a separate bounded fix if required for CI.

## Ready for next task?

No. TASK-010B passed independent code review but still requires coordinator approval, remote task-branch publication/verification, coordinator-owned status receipts and verified main integration. The parent TASK-010 stays active until those gates complete. This agent stops at its bounded handoff and local commit, per coordinator instruction.
