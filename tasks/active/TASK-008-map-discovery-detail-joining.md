# TASK-008 — Local map discovery, Hangout detail and joining

Status: Contract ready for implementation — local only
Date: 2026-09-22
Planning branch: `agent/TASK-008-planning`
Implementation branch: `agent/TASK-008-map-discovery`

## Goal
A live-ready UNC student can discover a saved campus Hangout on the map, inspect its public details, join or leave it, and read optional private meeting instructions only while authorized. This is a disposable local development increment, not a hosted or public release.

## Dependencies and safety gates
- Start implementation from the latest `origin/main`, which includes reviewed TASK-005 backend and TASK-007 create/edit. Read their contracts, handoffs and reviews, and Accepted ADR-0010. The TASK-005 database gate remains disabled by default and is enabled only for explicit disposable local tests.
- Existing TASK-005 `hangouts`, `hangout_participants`, `hangout_private_locations`, `get_hangout_participant_state`, `join_hangout` and `leave_hangout` are the authority. Read the actual migration and RLS tests before wiring UI. No schema or policy change is authorized in this task.
- All saved-Hangout pages, reads and actions require `APP_ENV=local`, the validated loopback Supabase URL and a live ready caller. The database gate and RLS independently deny access. No hosted migration, hosted gate enablement, deployment or live-student flow.
- Friends-only, invite-only and eligibility-restricted modes remain unsupported and fail closed. No friend context, peer profile/photo reader or operator bypass may be inferred from the current data.
- Blocking/private-access precedence, reporting and moderation remain separate hosted-use and launch prerequisites under ADR-0010. Do not describe this local flow as launch-ready.

## Required context
`AGENTS.md`, this contract, NOW/BACKLOG; TASK-005 and TASK-007 contracts/handoffs/reviews; Accepted ADR-0010; MVP/PRINCIPLES; ARCHITECTURE, DATA_MODEL, AUTHORIZATION, SECURITY_AND_SAFETY, LOCATION_AND_MAPS, TESTING; UX USER_FLOWS, INFORMATION_ARCHITECTURE, UX_PRINCIPLES, DESIGN_DIRECTION; existing map shell, create/edit flow, access helpers and design tokens.

Before substantial UI work, read installed `design-taste-frontend` (Leon's Taste), inspect `https://usepals.com/` and current rendered/components/tokens, and write `docs/ux/TASK-008-INTERACTION-PLAN.md` for desktop and phone behavior.

## Allowed scope
- Add a clearly identified **Saved Hangouts** local discovery surface using the existing Mapbox map. Query published campus Hangouts through the caller's RLS session for the visible region, with a bounded result set and clear result-limit/loading/error/empty states. Refresh after panning/filter changes and after a successful join/leave. Initial campus viewport must work without device location. The matching accessible list remains usable without Mapbox.
- Provide useful filters supported by stored fields, such as time and open joining; no invented category or friend signal. A deterministic time-relevant ordering may break ties, but no popularity score or mass-event promotion. The map shows approximate public Hangout places only, never device or people coordinates. Preserve optional one-shot local map centering without persistence.
- Keep TASK-004 mock examples explicitly marked and visually/data separated from saved records, or retire them from the saved view. A mock pin must never link to a saved detail or offer joining. Saved create/edit records become discoverable only through authorized database reads; do not insert them into a fixture array.
- Add a stable saved-Hangout detail route with public title, description, time, approximate place, host account ID and current-ready participant IDs available under existing RLS. Do not fetch/display peer names, photos or historical membership. Explain that private instructions can remain readable to joined members while the Hangout is published, even after its scheduled end, until they leave, are removed, lose readiness or the host cancels.
- Show join, leave, joined, closed, removed, cancelled, missing and access-denied states honestly. Host is already joined and cannot leave. Closed joining blocks new joining but does not evict members. A left member may rejoin an open published Hangout; a removed member cannot. Do not infer attendance from passing time.
- Use caller-session server actions/RPCs for join/leave. Recheck live readiness and authoritative persisted membership after mutation before claiming success. An interrupted response with unverifiable outcome stays uncertain and asks the user to reload; never show private instructions based on optimistic local state. Private instructions are fetched separately on an uncached authorized detail request and rechecked before rendering; no exact details in public map payloads, logs, URLs, telemetry, browser storage or action results.
- Use existing shared design tokens, accessible map pins/list/preview/focus and responsive layouts. Update app/docs only for implemented behavior.

## Out of scope
Database migration or RLS expansion; TASK-010 host lifecycle/removal controls; TASK-013 chat; calendar; friends/invitations/eligibility; peer profile/photo display; reporting/blocking/moderation implementation; notifications/analytics; capacity/waitlists; hosted environment or deployment. TASK-008 may consume existing backend join/leave behavior but must not silently implement dependent features.

## Acceptance criteria
- [ ] Default-disabled database gate and nonlocal/anonymous/unready/cross-campus denials hold on direct route, data read and action paths. No service-role use or client-writable gate.
- [ ] A created local saved Hangout appears as a saved approximate map pin and matching list item for a ready same-campus caller, with bounded viewport query and truthful loading, empty, error and truncation behavior. Mock examples cannot be mistaken for saved records.
- [ ] Public preview/detail reveal only allowed fields. Current-ready participant IDs follow TASK-005 RLS; no peer profile/photo or private instructions leak through list/preview/errors/embeds.
- [ ] Join/leave/rejoin and host/closed/removed/cancelled cases reflect the actual RPC outcomes and persisted state. Concurrent or uncertain results do not claim success without verification.
- [ ] Private instructions appear only to a currently authorized published host/joined member, disappear after leave/removal/cancellation/readiness or gate revocation, and are never cached or passed to public map clients.
- [ ] Desktop and phone rendered map/list/detail/action flows, keyboard/focus, no-map fallback, and loading/empty/error/denied states are inspected. Relevant workspace, database and actual HTTP/action privacy tests pass; a fresh security/design review is clear.
- [ ] Scoped task branch/handoff are reviewed, pushed and remote-verified; accepted work and shared state records are integrated to canonical main and its remote SHA verified.

## Verification
Run `pnpm check`, `pnpm db:verify`, `pnpm test:auth:web` and focused actual web/API tests against disposable local ready accounts. Cover gate off, nonlocal path, anonymous/unready/revoked/other-campus caller, owner/peer/left/removed states, closed/cancelled Hangouts, private read after each revocation, stale visible-region responses, map failure, rapid pan/query ordering, uncertain join/leave response and retry/reload. Reuse the TASK-005 actual-role SQL matrix for database authorization. Clean disposable users, photos and Hangouts; leave the gate disabled and local stack stopped. Record actual results and unrun checks.

## Documentation and handoff
The coordinator publishes this contract and NOW/BACKLOG status to main before implementation dispatch. The implementation agent owns its task branch, interaction plan, code, scoped tests and `agents/handoffs/TASK-008.md`; the coordinator owns shared queue/current-state/changelog updates and integration. Record task and main pushed SHAs, review evidence, remaining hosted blockers and concrete limitations. Do not auto-dispatch TASK-009/010/013 or safety follow-ups.
