# TASK-001 — Bootstrap monorepo
Status: Complete (local validation; hosted CI pending repository hosting)

## Goal
Create clean repository structure and development conventions.

## Scope
web/admin/mobile placeholder; shared packages; formatting/lint/typecheck/tests; env conventions; CI baseline.

## Out of Scope
Substantive feature implementation; domain cutover.

## Dependencies
None. Initialize Git for this existing specification-only folder and use branch `agent/TASK-001-monorepo`.

## Required Context
- `AGENTS.md`, `README.md`, `tasks/NOW.md`
- `docs/engineering/ARCHITECTURE.md`, `WEB_AND_MOBILE_STRATEGY.md`, `TESTING.md`, `DEPLOYMENT.md`
- `docs/product/PRINCIPLES.md`, `docs/ux/INFORMATION_ARCHITECTURE.md`
- Accepted ADR-0001, ADR-0002, ADR-0005
- `docs/operations/CURRENT_STATE.md`, `agents/HANDOFF_TEMPLATE.md`
- Installed `design-taste-frontend` skill at `/Users/ellanguyen/.codex/skills/leon-taste-skill/SKILL.md`
- `docs/ux/DESIGN_DIRECTION.md` and live `https://usepals.com/`

## Implementation Boundaries
Create runnable Next.js/TypeScript web and admin placeholders, mobile placeholder only, and the six specified shared packages. Choose minimal workspace tooling; document routine tooling choices. Establish initial shared design tokens without claiming a final product design. Include safe environment examples and consistent local/CI validation commands. Do not implement authentication, database schema, product navigation flows, or map features.

## Acceptance Criteria
- [x] web/admin run locally
- [x] workspace scripts consistent
- [x] package boundaries established
- [x] env template safe; no secrets committed
- [x] CI baseline passes.
- [x] Taste availability and initial shared design-token usage documented.
- [x] web/admin placeholder pages inspected at desktop/mobile sizes.

## Tests / Verification
Run frozen-lockfile install, formatting, lint, typecheck, baseline meaningful tests, and production builds. Start both apps and verify local responses. Distinguish locally reproduced CI checks from an actual hosted CI run. Record exact blockers rather than claiming unrun checks passed.

## Documentation Updates
Update local setup, README, current state, changelog, task status, NOW/DONE, and package guidance as appropriate.

## Handoff Requirements
Write `agents/handoffs/TASK-001.md` using the handoff template, including verification results, visual review, limitations, and readiness for TASK-002. Stop after TASK-001.
