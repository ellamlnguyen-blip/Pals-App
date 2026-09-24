# Handoff — TASK-023B Calendar, People and profile visual adoption

Date: 2026-09-23 EDT
Agent: isolated TASK-023B implementation agent
Branch/worktree: `agent/TASK-023B-calendar-people-profile`, `/private/tmp/pals-task-023b-calendar-people-profile`
Baseline: canonical main `63314d88630950f1237ea04dfae286d8d93a8a73`
Implementation commit: `f231e0ca781013635f05bb453c029eec0734211b`
Task branch and pushed commit SHA: pending publication; coordinator should verify the final handoff commit tip remotely.
Integrated `main` commit SHA: pending independent exact-tip review and coordinator integration.
Main status-record path and last published milestone: `tasks/active/TASK-023B-student-route-adoption.md`; coordinator owns shared records.
Outstanding review/integration blockers: fresh exact-tip design/security review, coordinator-side rendered viewport QA, and inherited real authenticated route QA.

## Outcome

Calendar, People directory, friendships, People privacy, peer detail and owner profile now use TASK-023A's shared student shell and navigation where account readiness permits it. The duplicate Calendar and People primary navigation was removed. Route-specific panels, filters, cards, date controls, details, editor surfaces and loading/error presentation use shared light/dark tokens and responsive spacing. The owner profile is explicitly dynamic so private data and gate-aware navigation are never statically generated.

The live `https://usepals.com/` site was inspected afresh on 2026-09-23 EDT. Its visible white canvas, rounded Nunito-like headings, blue introductory area and activity/map framing informed the existing accepted TASK-023 plan. Its terminology and navigation did not alter the app contract.

## Files Changed

Only `apps/web/app/calendar/`, `apps/web/app/people/` and `apps/web/app/profile/` presentation files changed. No actions, API, `apps/web/lib/`, SQL, migration, RLS, provider, gate, admin, token package or hosted setting changed.

## Behavior / Architecture Impact

Existing Calendar day/week, discoverable/joined/hosting selection, public approximate place, People opt-in filtering, friendship/peer visibility, photo privacy, focus return, live regions, dialog behavior and action results are preserved. The shared nav only appears for ready routes; friends/privacy retain their unready access path without active navigation. Calendar's client error boundary has a standalone student header and skip target because it cannot call server-side gate functions.

## Tests / Verification

- ESLint for the changed route trees: pass.
- Web TypeScript check: pass.
- Existing unit suite: 37 pass, 0 fail.
- Web production build: pass; `/profile` is dynamic.
- `git diff --check`: pass.
- Disposable synthetic route mounted the shared student shell and representative Calendar, People and owner profile markup. A local server on owned port 4319 returned HTTP 200 and generated HTML for the Calendar preview. The fixture route was removed and the server stopped. No student data or hosted service was used.

## Known Limitations

This subagent's in-app browser rejected browser use in a subagent thread. It therefore could not inspect rendered 1280px, 820px, 390px or 320px screenshots, light/dark modes, horizontal overflow, or interactive focus/dialog behavior. The synthetic route's HTTP response is only a compilation/server smoke check and does not count as rendered QA. The inherited real authenticated route gap remains: local authentication is fixed to port 3000, assigned to another checkout. No authenticated Calendar, People, profile, denied, error, loading or gate-off flow was claimed as tested. Coordinator should conduct disposable rendered QA and retain the parent authenticated completion gate.

## Decisions

No ADR or product decision was needed. Calendar error treatment omits gate-dependent nav because the client error boundary cannot safely establish its availability.

## Follow-up Tasks

Coordinator: run rendered viewport/state review on an owned alternate port, obtain fresh exact-tip design/security review, then integrate if accepted. Parent TASK-023 must still close its real authenticated rendering gate. No new product task is proposed here.

## Documentation Updated

This handoff only. Coordinator owns `CURRENT_STATE`, queue and changelog updates on main.

## Ready for Next Task?

No. Exact-tip independent review, rendered QA and main integration remain coordinator-owned; TASK-023C must wait for accepted B integration.

Remote verification for both refs: pending branch publication and main integration by coordinator; this handoff records the local implementation SHA above.
