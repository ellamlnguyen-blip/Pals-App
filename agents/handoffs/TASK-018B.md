# TASK-018B — Private student attendance UI handoff

Status: Implementation delivered on task branch for independent exact-tip design/security review and coordinator integration. TASK-018 parent remains active.
Date: 2026-09-25
Branch: `agent/TASK-018B-attendance-ui`
Baseline: independently remote-verified canonical `origin/main` `4179ca3399d0589829308dd8283bfdd48c6271ff` (accepted ADR-0022, integrated TASK-018A, reconciled B contract).

## Outcome

- Added local-only `/attendance` using `access()` for signed-in active states, the existing Frame, an account-menu entry for active signed-in owners, and a small Calendar entry. Primary navigation remains five destinations.
- Added an actor-bound, no-store attendance server path. It accepts only a bounded 24-item ID keyset owner list, exact owner read, and expected-revision answer through TASK-018A RPCs. IDs and answers never appear in route URLs, browser storage, analytics or error messages.
- The student surface deliberately stays ID-only. Exact retained Hangout IDs are selectable, including when source details are hidden. It shows own answer, open/closed/non-actionable states, neutral zero-row and denial states, and the general 30-day rule without deriving a deadline from unauthorized source data. Reporting is a separate `/safety` link.
- A save is only confirmed after a fresh exact own-read followed by a fresh current owner page, so source-gate-off and stale-revision cases cannot leave older actionable controls enabled. Stale or uncertain outcomes show the observed answer or offer an explicit exact recheck, then require a deliberate new choice. Duplicate simultaneous saves are blocked. Auth changes, page hide/restore, focus revalidation and denial mask in-memory records, pagination IDs, selection/retry state and invalidate late responses. `load()` establishes a new cursor/history only after masking; a successful zero-row owner page clears them again and its neutral Retry starts from page one. Genuine fetch errors retain the requested current-page cursor for Retry.
- No migration, SQL permission, gate, fixture, hosted service, notification or analytics change.

## Verification

- `pnpm check` passed: formatting, lint, typechecking, all 37 workspace tests, and web/admin production builds. `git diff --check` passed.
- Inspected `https://usepals.com/` on 2026-09-25; the current public reference has a white canvas, rounded heavy typography and a soft Carolina blue feature area. This utility uses existing Nunito and shared color tokens, with a narrow one-column owner list and no sixth primary destination.
- Restarted the existing disposable Lima VM and local Supabase from this checkout, reset committed migrations, then served the production Next build at loopback. Authenticated HTTP checks with a synthetic local owner and past Hangout passed: owner page and list, forged actor denial, answer then exact own-read, stale revision conflict, source-gate-off non-actionability, and attendance-gate-off ambiguous empty/exact-null behavior.
- The coordinator used an authenticated in-app browser with an active but unready synthetic owner. The ID-only row, saved answer, answer correction, account entry, and immediate signout masking were observed. Rendered light viewports at 1280, 820, 390 and 320px showed no narrow horizontal overflow. A complete keyboard path passed: Tab reached the radio with visible focus, Space selected it, ArrowDown changed the choice, Tab focused Save, and Enter saved with an announced status.
- A separate authenticated headless Chrome rendering at 390px with dark emulation showed readable shared dark tokens, ID, radio labels, Save and Safety link, with document width equal to the viewport. The local screenshot was visually inspected at `/private/tmp/pals-task-018b-dark-390.png`.
- Rendered source-gate-off state kept the ID-only row and own saved answer, showed generic unavailable copy and removed Change/Save. Stopping disposable Supabase while the page was open produced the neutral 403 denial shell and masked the ID. A temporary loopback proxy faulted only exact own-reads with 503 after a real write; the page kept the prior answer, disabled choice/save/pagination, and showed a neutral uncertain status plus explicit Check answer. Removing the fault and pressing Check answer recovered the committed answer through exact own-read and refreshed owner page before restoring Change. No repository code or hosted service was altered by the proxy.
- Rendered stale conflict used a second authenticated local owner client to advance the answer from revision 1 to 3 while the page held a different revision-1 choice. Save kept the authoritative answer, cleared the pending choice, and asked for a deliberate new choice. The transient fixture and proxy were local only.


## Review focus and remaining gates

- Fresh exact-tip design/security review should inspect actor-bound API validation, zero-row ambiguity, 403/zero-row masking, auth transition invalidation, response-loss exact reread, and ID-only display. The rendered closed-unanswered state and moderation-disabled-source denial were not separately exercised; they use the reviewed read-only copy and no-row masking paths. The temporary dark screenshot is local and may not survive cleanup. A fresh exact-tip design/security review is still required before integration.
- Coordinator owns NOW/BACKLOG/CURRENT_STATE/CHANGELOG, independent task-tip review, accepted integration to `main`, and remote verification. This branch does not mark TASK-018 complete or dispatch the next task.

## Cleanup

After each QA session, removed every disposable Auth user (including the first failed setup attempt), synthetic Hangout and answer. Final verification returned `0` Auth users, `0` Hangouts, `0` attendance answers and both local gates false. Stopped the proxy, headless Chrome, production server, local Supabase and existing Lima VM. Temporary fixture credentials and scripts were removed.

## Publication receipt

Task branch commit and remote SHA: corrected exact tip pending push below.
Canonical main integration SHA: pending coordinator review and integration.
