# TASK-007 — Create/edit Hangouts

Status: Contract approved; ADR-0010 explicitly accepted; awaiting separately completed TASK-005 backend
Date: 2026-09-22
Planning branch: `agent/TASK-007-planning`
Implementation branch after prerequisites: `agent/TASK-007-create-edit-hangouts`

## Goal
A live-ready UNC host can create a casual campus Hangout and edit its public details and optional private meeting instructions, with honest persistence, conflict and privacy feedback. This is a local development increment, not a public release.

## Why
TASK-004 currently opens an explicitly unsaved Create shell over mock Hangouts. Real creation needs an authoritative backend; adding a form alone cannot satisfy this task.

## Dependencies / stop gates
- TASK-001/002 foundation, TASK-003 local identity/readiness, TASK-004 map shell and TASK-006 owner profile are integrated on main. TASK-003 hosted HTTPS callback/real UNC delivery remains independently open.
- The user explicitly accepted revised ADR-0010 on 2026-09-22 (“1. yes / 2. yes”), including the local-only safety sequence and concrete schema/write semantics. Read its acceptance/reconciliation evidence; the existing TASK-005 implementation must use this latest revision.
- TASK-005 must separately implement, test, pass fresh security review, integrate and remote-verify the accepted backend. Required interface: caller-derived host/campus; atomic public/private create plus host membership; owner-scoped retry identity; host read/edit with revision conflict rejection; accepted field/time/location validation; feature gate; restricted-mode rejection; live RLS/private-field isolation. Coordinator records its actual operations/types and verified SHA here before dispatch. Do not invent RPC names or write migrations in TASK-007.
- Under the accepted sequence, blocking does not prevent disposable local tests; it does prevent hosted/live use. Later hosted enablement requires separately accepted/tested block precedence plus the remaining safety/deployment prerequisites.
- Coordinator publishes reviewed contract/status to main before any implementation dispatch. Fresh implementation agent starts from latest origin/main only after these gates; TASK-005 is already active in its separate task; do not duplicate dispatch.

## Required context
AGENTS.md; this contract; NOW/BACKLOG; accepted ADR-0010 and actual TASK-005 contract/handoff/API evidence; TASK-003/004/006 handoffs; MVP/PRINCIPLES; ARCHITECTURE, DATA_MODEL, AUTH, AUTHORIZATION, SECURITY_AND_SAFETY, LOCATION_AND_MAPS, TESTING; UX USER_FLOWS, INFORMATION_ARCHITECTURE, SCREEN_INVENTORY, UX_PRINCIPLES and DESIGN_DIRECTION; accepted ADRs 0002–0009; existing access/actions/config, map shell, shared tokens and validation.

Before substantial UI, read installed Leon Taste, inspect current https://usepals.com/, existing components/tokens and write `docs/ux/TASK-007-INTERACTION-PLAN.md`. This planning task introduces no UI and makes no live-site inspection claim.

## Allowed scope after prerequisites
- Replace the Create shell entry with a ready-only local create flow. Require title, explicit campus time and safe public area/label; optional description/end/private instructions. Use accepted backend limits. Make campus visibility clear; no enabled restricted-mode or eligibility controls.
- Deliberately choose the public area on the existing Mapbox surface, with accessible manual coordinate/label alternative when the map is unavailable. Do not seed it from device location, private instructions or an exact residential address. Explain public versus participant-only information. No new geocoder/service dependency.
- Show a minimal owner confirmation and edit route for the returned record, plus a bounded owner-only recent-Hangouts entry to reopen edits (not a discovery feed/calendar). Never add locally saved records to the mock map as if they were live discovery. Keep fixtures explicitly labeled; pin/discovery integration remains TASK-008.
- Edit only accepted public fields and optional private instructions on published owned records. No host/campus/visibility/role mutation. Consume the backend revision; rejected stale edits preserve safe entered text and offer reload/review. Cancel/back discards unsaved form changes; it does not cancel the Hangout.
- Handle loading, optional-empty, validation, denied/missing record, saving, success, stale conflict and uncertain transport outcomes. Keep the same creation request identity across retry; verify persisted outcome before claiming success. No exact details in logs, URLs, telemetry, public payloads or cached responses. Do not persist private form drafts in browser storage.
- Use caller-session server actions and authoritative backend operations; preserve live readiness checks and owner-only profiles/photos. Nonlocal pages/actions fail closed; database feature gate independently denies reads/writes when disabled. Keep typed validation/data access additions bounded to consuming TASK-005.

## Out of scope
TASK-005 implementation/migrations; general discovery/detail/join/leave; public attendee UI; cancelling/open-close/removal/co-host management UI (TASK-010 contract must cover these); chat creation (TASK-013); notifications (TASK-015); calendar, friendship, invitations, eligibility, blocking/report/moderation implementation; analytics, capacity/waitlists, persisted drafts, photo upload for Hangouts; hosted Supabase/Vercel changes/deployment. The accepted full Create → pin + chat journey remains incomplete until its separate tasks land; never claim those effects on save.

## Acceptance criteria
- [ ] ADR acceptance and TASK-005 reviewed integrated SHA/API evidence recorded before dispatch; local-only safety boundary accepted and enforced.
- [ ] Create persists one Hangout, host membership and optional private instructions atomically through the actual backend. Double submission, concurrent retry and committed-but-lost response do not create duplicates or report false success/failure.
- [ ] Owner can reopen/edit persisted public/private fields. Stale tabs cannot overwrite newer revisions; errors retain safe form input and recovery is clear. Cancelled records are not editable and revoked private instructions never reach the page/action response.
- [ ] Public area is explicit; public/private fields remain separate; time zone, daylight-saving ambiguity, limits and optional clearing follow accepted backend rules.
- [ ] Direct page/action/API access cannot bypass ownership, live readiness, campus boundary, local environment restriction, disabled database feature gate or unsupported-mode denial. Existing profile/photo readers remain unchanged.
- [ ] Rendered desktop and phone create → save → reopen → edit verified against disposable local backend; keyboard/focus, loading, empty, missing-map, denied, validation, conflict and transport recovery verified with evidence. Mock map labels remain truthful.
- [ ] Appropriate workspace, actual HTTP/action/database regressions and privacy tests pass; fresh security/design review findings resolved and coordinator reviews handoff.
- [ ] Task branch and accepted integration pushed, remote SHAs verified, state/queue/changelog/handoff synchronized. TASK-007 is not complete at contract publication.

## Tests / verification
Run relevant `pnpm check`, `pnpm db:verify`, `pnpm test:auth:web` plus meaningful create/edit HTTP/action tests using disposable data. Test host versus peer, forged IDs/revisions/retry identities, anonymous/unverified/incomplete/suspended/changed-email/inactive-campus callers, feature gate off, nonlocal server path denial, forbidden restricted inputs, stale edits, cancellation/readiness revocation between load and save, public/private atomic rollback and lost-response retry. Inspect direct reads/embeds and uncached errors for private-field leaks. Reuse TASK-005 database matrix; do not substitute privileged fixtures for caller authorization evidence. Preserve loopback forwarding and read-only SQL-test mounts if local runtime is started.

## Documentation / handoff
Use agents/HANDOFF_TEMPLATE.md. Implementation agent supplies outcomes, tests, visual evidence, limitations, actual branch/pushed SHA and suggested shared updates; coordinator owns shared records/integration. Publish material blockers on main. Planning handoff: `agents/handoffs/TASK-007-CONTRACT.md`. Do not auto-dispatch later tasks.
