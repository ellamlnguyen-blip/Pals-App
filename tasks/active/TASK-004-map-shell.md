# TASK-004 — Hangouts map shell
Status: Planned

## Goal
Create the primary Hangouts tab as a polished Mapbox surface before full hangout CRUD.

## Scope
map rendering; UNC viewport; pan/zoom; locate control; mock pins; clustering; preview shell; filters shell; + Create Hangout shell.

## Out of Scope
final create flow, joining, final ranking, full hangout backend.

## Dependencies
TASK-001 shared tokens/tooling required; TASK-003 required for integration into the verified product. Mock map preparation can proceed independently only in an isolated task branch. Use a fresh implementation agent on `agent/TASK-004-map`.

## Required Context
- `AGENTS.md`, this task, direct prerequisite handoffs
- `docs/product/MVP.md`, `PRINCIPLES.md`
- `docs/engineering/LOCATION_AND_MAPS.md`, `SECURITY_AND_SAFETY.md`, `ARCHITECTURE.md`
- `docs/ux/USER_FLOWS.md`, `INFORMATION_ARCHITECTURE.md`, `UX_PRINCIPLES.md`, `DESIGN_DIRECTION.md`
- Accepted Mapbox, Hangout and privacy ADRs; installed Leon Taste skill; existing shared design tokens/components; live `https://usepals.com/`

## Design / Privacy Contract
Plan pins, clusters, selection/preview, filter shell, create action, desktop/tablet/mobile layout and map loading/empty/error/token-missing states before coding. Clearly identify development fixtures; do not imply real students or real activity. Device geolocation is optional and used locally; do not persist/broadcast coordinates or require permission at initial load. Display only map-safe mock Hangout locations.

## Verification
Run relevant automated checks and inspect rendered desktop/mobile map interactions, cluster expansion, pin preview, keyboard/focus behavior and location denial. Verify the create shell does not imply a successful publish. Use a fresh design reviewer when practical; evaluate against Taste and the Pals reference while preserving accepted product requirements.

## Documentation / Handoff
Update shared design guidance, current state, changelog and task queue. Write `agents/handoffs/TASK-004.md` with visual/test evidence and Mapbox configuration limitations. Stop after this task.

## Acceptance Criteria
- [ ] Hangouts is primary nav item
- [ ] map responsive desktop/mobile web
- [ ] pins/clusters work
- [ ] pin selection opens preview
- [ ] create action visible
- [ ] no user location broadcast.
