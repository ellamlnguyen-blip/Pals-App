# TASK-018B — Private student attendance UI handoff

Status: Implementation delivered on task branch for independent exact-tip design/security review and coordinator integration. TASK-018 parent remains active.
Date: 2026-09-25
Branch: `agent/TASK-018B-attendance-ui`
Baseline: independently remote-verified canonical `origin/main` `4179ca3399d0589829308dd8283bfdd48c6271ff` (accepted ADR-0022, integrated TASK-018A, reconciled B contract).

## Outcome

- Added local-only `/attendance` using `access()` for signed-in active states, the existing Frame, an account-menu entry for active signed-in owners, and a small Calendar entry. Primary navigation remains five destinations.
- Added an actor-bound, no-store attendance server path. It accepts only a bounded 24-item ID keyset owner list, exact owner read, and expected-revision answer through TASK-018A RPCs. IDs and answers never appear in route URLs, browser storage, analytics or error messages.
- The student surface deliberately stays ID-only. Exact retained Hangout IDs are selectable, including when source details are hidden. It shows own answer, open/closed/non-actionable states, neutral zero-row and denial states, and the general 30-day rule without deriving a deadline from unauthorized source data. Reporting is a separate `/safety` link.
- A save is only confirmed after a fresh exact own-read followed by a fresh current owner page, so source-gate-off and stale-revision cases cannot leave older actionable controls enabled. Stale or uncertain outcomes show the observed answer or offer an explicit exact recheck, then require a deliberate new choice. Duplicate simultaneous saves are blocked. Auth changes, page hide/restore, focus revalidation and denial mask in-memory records and invalidate late responses.
- No migration, SQL permission, gate, fixture, hosted service, notification or analytics change.

## Verification

- `pnpm check` passed: formatting, lint, typechecking, all 37 workspace tests, and web/admin production builds. `git diff --check` passed.
- Inspected `https://usepals.com/` on 2026-09-25; the current public reference has a white canvas, rounded heavy typography and a soft Carolina blue feature area. This utility uses existing Nunito and shared color tokens, with a narrow one-column owner list and no sixth primary destination.
- Restarted the existing disposable Lima VM and local Supabase from this checkout, reset committed migrations, then served the production Next build at loopback. Authenticated HTTP checks with a synthetic local owner and past Hangout passed: owner page and list, forged actor denial, answer then exact own-read, stale revision conflict, source-gate-off non-actionability, and attendance-gate-off ambiguous empty/exact-null behavior. The coordinator used the authenticated in-app browser with the synthetic unready owner and saw the ID-only row, changed an answer through radio/Save and saw the saved correction and status, checked the account entry, and saw signout mask the row. Coordinator screenshots covered 1280, 820, 390 and 320 widths with no narrow horizontal overflow; light appearance and semantic radio/button controls were inspected. A complete keyboard-only tab sequence, dark visual emulation, and rendered loading/denial/unknown simulations were not completed. The subagent browser tool could not open an in-app tab. The public site inspection did not use student data.

## Review focus and remaining gates

- Fresh exact-tip design/security review should inspect actor-bound API validation, zero-row ambiguity, 403/zero-row masking, auth transition invalidation, response-loss exact reread, and ID-only display. The remaining keyboard-only, dark appearance, and rendered loading/denial/unknown-state checks should be completed during exact-tip review or recorded as explicit limits before integration.
- Coordinator owns NOW/BACKLOG/CURRENT_STATE/CHANGELOG, independent task-tip review, accepted integration to `main`, and remote verification. This branch does not mark TASK-018 complete or dispatch the next task.

## Cleanup

After QA, removed both disposable Auth users (including the first failed setup attempt), the synthetic Hangout and answer; verified `0` Auth users, `0` Hangouts, `0` attendance answers and both local gates false. Stopped the production server, local Supabase and existing Lima VM. Temporary fixture credentials and scripts were removed.

## Publication receipt

Task branch commit and remote SHA: pending push below.
Canonical main integration SHA: pending coordinator review and integration.
