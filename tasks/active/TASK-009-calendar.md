# TASK-009 — Local saved Hangout Calendar

Status: Active — contract published; implementation and review pending
Date: 2026-09-22
Planning branch: `agent/TASK-009-planning`
Implementation branch: `agent/TASK-009-calendar`

## Goal
A live-ready UNC student can answer what is happening today or this week and find their joined/hosted saved Hangouts. This is a disposable local increment, not a hosted release.

## Prerequisites and safety gates
- Canonical main and origin/main were clean and equal at `e2e3b2d0b59d32100dfca91c04801b96d551f5ab` before planning. Reviewed TASK-005 backend, TASK-007 create/edit and TASK-008 discovery/detail/joining are integrated. Their final reviewed task tips are `a59b4a6900e5bc50f47a0beb0ff7fdd6e79741cd`, `b6f338e314f1eca489cea0592acd5abc069a8884` and `0ef4bbb67f5fab908092eba47243ebea3b394931` respectively; see their handoffs/reviews.
- Accepted ADR-0010 governs every read. Preserve the default-disabled database gate, caller-session RLS, live ready same-campus access, `APP_ENV=local` and validated loopback Supabase target. Enable the gate only for explicit disposable local tests, then disable it and clean up.
- No hosted operations, migrations, deployment or live student use. TASK-003 hosted callback/email, accepted block/private-access precedence, reporting/moderation and launch safeguards remain independent prerequisites.
- No schema/grant/RLS changes. If existing authorized reads cannot support an acceptance criterion, surface the exact gap and split a prerequisite rather than widening access.
- Friends-only/invite-only/eligibility modes and friend context remain deferred until authoritative data and accepted access rules exist. No peer profile/photo or operator bypass.
- Publish this contract and shared records to main before a fresh implementation agent starts from latest origin/main.

## Required context
AGENTS.md; this contract; NOW/BACKLOG; TASK-005/007/008 contracts, handoffs and reviews; Accepted ADR-0010; MVP/PRINCIPLES; ARCHITECTURE, DATA_MODEL, AUTHORIZATION, SECURITY_AND_SAFETY, LOCATION_AND_MAPS, TESTING; UX INFORMATION_ARCHITECTURE, SCREEN_INVENTORY, USER_FLOWS, UX_PRINCIPLES, DESIGN_DIRECTION. Read actual Hangout migrations/RLS, saved reads/detail, local/access helpers, navigation, time helpers and tokens.

Before substantial UI read installed Leon Taste (`design-taste-frontend`), inspect https://usepals.com/ and existing components/tokens, and write `docs/ux/TASK-009-INTERACTION-PLAN.md`. Product/safety/accessibility and the existing design system take precedence over generic marketing-page patterns.

## Allowed scope and behavior
- Wire the existing Calendar navigation to a ready-only `/calendar` saved-Hangout surface, clearly labeled local-only and separate from mock examples. Keep primary navigation names and map-first Hangouts intact.
- Provide Today/day and Week temporal views, date navigation and return-to-Today. Use campus time America/New_York explicitly, independent of browser/server timezone. Week is Monday through Sunday; day/week ranges use local midnights with exclusive upper bounds, including 23/25-hour DST days. Validate bounded date/view/filter inputs before querying.
- Show discoverable published campus Hangouts, with filters for Joined and Hosting based only on authoritative caller membership/host identity. Host is also joined per ADR-0010. Never classify left/removed membership as joined. Include authorized cancelled records in Joined/Hosting with a clear Cancelled label; do not expose cancelled records in campus discovery or infer attendance/completion from elapsed time.
- Include Hangouts overlapping the selected interval: known end after interval start and start before interval end; records without an end belong to their start day only. Show multi-day records without inventing an end. Explain date range/time and deterministic start/id ordering. Date navigation may show past records without asserting attendance.
- Use bounded caller-session database queries and disclose result truncation. Apply membership/host filters before limiting the final result; a first-page campus slice must not masquerade as all joined Hangouts. Avoid unbounded per-row requests. Recheck readiness and the relevant bounded public/membership result before serialization, following existing conservative saved-discovery practices. Fail closed on changed or uncertain authorization/results.
- Calendar payloads contain only necessary public fields and caller relationship; no private instructions, full roster, peer profiles/photos, historical member states or fixture data. Link each saved row to existing TASK-008 detail; join/leave and private reads stay there. Use uncached dynamic requests and fresh data on date/filter navigation and return from detail.
- Responsive day-grouped agenda or similarly accessible calendar presentation, with keyboard-operable controls, clear current date/range/filter, empty/loading/error/denied/truncated states, usable phone layout and no overflow. No external calendar provider/library required.

## Out of scope
Schema/RPC/RLS expansion; friend context/graph; restricted modes/invitations/eligibility; peer profiles/photos; external calendar sync/export, reminders, recurring Hangouts, drag/drop editing, general scheduling tooling; host lifecycle/co-host UI; messaging, notifications, analytics, block/report/moderation implementation; hosted environments/deployment; unrelated dev-helper repair.

## Acceptance criteria
- [x] Contract/gates published on main and fresh implementation branch starts from verified latest origin/main.
- [ ] Today/day and Week display saved records using campus dates with DST-safe exclusive boundaries; cross-midnight/endless records and date navigation behave as documented.
- [ ] Discoverable, Joined and Hosting filters match actual caller-visible rows, including host membership, left/removed exclusion and authorized cancelled labels; limits are honest and deterministic.
- [ ] Every route/read fails closed for nonlocal, anonymous/unready/revoked, other-campus and disabled-gate access under existing policies. No private/peer/historical data enters Calendar payloads.
- [ ] Saved detail navigation and return refresh reflect create/edit/join/leave/cancel changes; stale client responses cannot restore old results after a new selection.
- [ ] Desktop/phone rendered interactions and keyboard, loading/empty/error/denied/truncated states verified. Time/DST/filter tests and actual local HTTP/database authorization regressions pass.
- [ ] Fresh security/design review is clear; scoped implementation/handoff and coordinator shared records are integrated/pushed and task/main remote SHAs verified before completion.

## Verification
Run `pnpm check`, focused time/date tests, `pnpm db:verify`, and actual local Auth/HTTP/action suites with Calendar cases. The known Next dev-helper invariant is tracked separately: attempt the existing helper, or document use of the equivalent built loopback server and run all three serialized suites without claiming a helper pass. Cover date/DST boundaries, overlap, no-end, filters applied before limit, cancellation/membership changes, 100+ rows/truncation, gate/readiness/campus denials and private marker absence in HTML/RSC/results/errors. Reuse real-role RLS regressions; mock-only tests do not prove permissions. Preserve loopback ports and read-only test mounts. Clean disposable accounts/photos/Hangouts, verify gate false, stop web/Supabase/Lima.

## Handoff and ownership
Implementation agent owns bounded app/test code, interaction plan and `agents/handoffs/TASK-009.md`, with exact verification evidence/limitations and pushed task SHA. Coordinator owns NOW/BACKLOG/DONE/CURRENT_STATE/CHANGELOG, contract status, review and main integration. Use `agents/HANDOFF_TEMPLATE.md`. Publish meaningful blockers/status on main while unfinished code stays on the task branch. Do not auto-dispatch TASK-010 or other follow-ups.

## Dispatch receipt
Planning branch and canonical main were pushed and independently verified at `29c9343edc560dd0731804b3b9624f8329ad6d4c`. Fresh implementation agent `calendar_implementation` dispatched on `agent/TASK-009-calendar` from that baseline. No implementation SHA published yet; review, checks and integration remain pending.
