# TASK-023 — Student web frontend design alignment
Status: Planned
Date: 2026-09-23
Execution order: after TASK-016C is reviewed and integrated; before TASK-017 begins

## Goal
Bring the student-facing Pals web experience into a coherent, polished visual system informed by the current usepals.com site, while preserving Pals' accepted product behavior and all existing backend contracts.

## Why
The existing shared tokens are provisional, and prior frontend tasks delivered their scoped flows without a website-wide visual alignment pass. The design instructions require inspecting usepals.com before substantial UI work, but inspection alone does not ensure that existing or future screens follow a coherent design. This task makes that work explicit before staging.

## Dependencies
- Complete and integrate TASK-016C's student safety UI first, so this pass does not edit the same routes/components concurrently.
- Do not wait for TASK-017 through TASK-020 to begin this pass. TASK-023 establishes the shared visual language for the existing student product early; any student-facing UI added by later work should use its tokens/components and receive route-level visual checks in that task.
- Keep TASK-021 staging and TASK-022 domain cutover after this task. TASK numbering identifies work; this dependency order makes TASK-023 precede TASK-017 and all later MVP tasks.
- Start its implementation branch from the latest `origin/main`; inspect current routes and backend contracts at dispatch time.

## Required Context
- `AGENTS.md`, `docs/product/MVP.md`, `docs/product/PRINCIPLES.md`, relevant `docs/ux/` specifications and `docs/ux/DESIGN_DIRECTION.md`.
- Read the installed `design-taste-frontend` (Leon's Taste) skill, current shared tokens/components, and inspect the live `https://usepals.com/` site before planning or coding.
- Inspect the accepted backend contracts, RLS, server actions, access gates, and current web flows for every route in scope.

## Allowed Scope
- Create a concise visual and interaction audit, then refine shared frontend tokens, components, and layouts to make the existing student-facing web product meaningfully consistent with the current reference site's visual character.
- Cover the student-facing routes already implemented when this work begins: authentication/onboarding, Hangouts map/discovery/detail/create/edit/management, profiles, Calendar, People, Chats, Notifications, and TASK-016C safety UI.
- Adapt the visual reference to Pals' accepted product: retain Hangouts terminology and navigation, map-first discovery, privacy/safety behavior, accessible contrast/focus, and responsive desktop/tablet/mobile layouts.
- Use only data and actions supported by current backend contracts. If an expected visual state lacks backend support, present the actual supported state and record the limitation as follow-up work.
- Verify rendered key routes and loading, empty, error, and denied-access states at desktop and mobile sizes; run relevant existing UI checks and regression flows.

## Out of Scope
- Any database/schema migration, Supabase or Postgres change, RLS/policy change, authorization/access-control change, feature-gate change, server-action/API contract change, or backend refactor.
- New product features, changing MVP behavior, changing Hangout visibility/eligibility rules, or relaxing privacy/safety requirements to imitate the reference.
- Hosted environment changes, deployment, domain cutover, or production data.
- Redesigning the internal admin product to resemble a student-facing marketing site; shared tokens may be used where appropriate, but admin scope requires its own contract if needed.

## Acceptance Criteria
- [ ] The task handoff records the current reference-site observations and an approved interaction/visual plan before implementation.
- [ ] Shared tokens and frontend components provide a coherent visual language, and all in-scope student routes use it consistently rather than receiving isolated cosmetic patches.
- [ ] The result is recognizably informed by usepals.com while following Pals' accepted product terminology, navigation, accessibility, privacy, and safety requirements.
- [ ] Existing backend/schema/RLS/permission/action/API behavior is unchanged; only presentation and frontend interaction needed to render already-supported states are modified.
- [ ] Desktop, tablet, and mobile rendering is checked for core routes and loading, empty, error, and denied states; critical existing flows remain functional.
- [ ] Later student-facing UI tasks use the resulting shared tokens/components; TASK-021 staging verifies consistency across all screens added since this pass and tracks any needed polish without repeating the full redesign.
- [ ] Relevant automated checks pass, limitations are recorded, and handoff plus shared status records are integrated into and verified on `main` before TASK-021 begins.

## Tests / Verification
- Use relevant workspace checks and existing route/action tests; add or adjust tests only when needed to verify meaningful UI behavior.
- Perform rendered desktop, tablet, and phone review for the in-scope routes and interactive states.
- Compare before/after behavior of sign-in/onboarding, profile editing, Hangout create/edit/discovery/join/leave/management, Calendar filters, People, Chats, and Notifications against their current contracts.
- Review the final diff to confirm no migration, SQL, RLS, backend permission, API contract, or server-action changes entered the task.

## Documentation Updates
Before implementation dispatch, coordinator publishes this contract and its queue entry to main. At material milestones/blockers and handoff, publish reviewed status to main with branch, verified pushed SHA, evidence and remaining work. Record task and main remote SHAs in the final handoff. A push or main integration failure leaves the task incomplete and must be recorded; never force-push.

## Handoff Requirements
Use `agents/HANDOFF_TEMPLATE.md`. State the usepals.com reference inspection date, routes changed, token/component decisions, rendered verification sizes/states, backend behavior preserved, tests run, known limitations, and task/main remote SHAs.

## Follow-ups
Backend changes, unsupported features, internal-admin redesign, and issues unrelated to visual consistency require separate bounded tasks; do not expand this scope.
