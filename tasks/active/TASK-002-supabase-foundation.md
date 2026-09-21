# TASK-002 — Supabase foundation
Status: Planned

## Goal
Establish schema, migration workflow, RLS conventions, and environment separation.

## Scope
universities; user/profile foundation; platform roles; migrations; seed; RLS tests.

## Dependencies
TASK-001 reviewed and complete. Use fresh agent and branch `agent/TASK-002-supabase`.

## Required Context
- `AGENTS.md`, this task, `agents/handoffs/TASK-001.md`
- `docs/engineering/ARCHITECTURE.md`, `DATA_MODEL.md`, `AUTH.md`, `AUTHORIZATION.md`, `SECURITY_AND_SAFETY.md`, `DEPLOYMENT.md`, `TESTING.md`
- `docs/product/MVP.md`
- Accepted ADR-0001, ADR-0002, ADR-0006, ADR-0008
- Existing shared packages and environment/tooling conventions

## Boundaries
Implement the accepted university/account/profile/platform-role foundation only. No Hangout, social graph, chat, admin UI or onboarding UI. Use committed reproducible migrations and local synthetic fixtures. Preserve separation of confirmed email, campus membership, profile completion and suspension. Clients must never grant themselves verification or privileged platform roles.

Do not invent an accepted UNC email-domain policy: confirm it from authoritative sources and surface unresolved eligibility decisions. Any proposed durable schema/authorization decision outside accepted specifications remains Proposed pending explicit acceptance. Do not silently accept an ADR.

Document staging migration commands separately from executed staging verification. No production access or domain changes. Do not create paid cloud resources or claim staging applied without a configured authorized environment.

## Tests / Verification
Rebuild the local database from migrations/seed and run meaningful RLS tests for anonymous, unverified, verified, suspended and privileged identities; include cross-user/cross-campus isolation and role escalation attempts. Verify repeated clean reset. Record infrastructure blockers accurately and complete unaffected work.

## Documentation / Handoff
Update local setup, data-model/authorization implementation notes, current state, changelog and task queue. Write `agents/handoffs/TASK-002.md` using the template. Include migration/reset/test results and unresolved decisions. Stop after this task; request a fresh security reviewer through the orchestrator.

## Acceptance Criteria
- [ ] migration workflow works local/staging
- [ ] UNC seed exists
- [ ] verified-user/profile foundation exists
- [ ] admin roles separated from hangout roles
- [ ] baseline RLS tests pass
- [ ] production not used for development.
