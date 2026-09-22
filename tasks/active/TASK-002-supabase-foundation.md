# TASK-002 — Supabase foundation
Status: Complete — local and hosted foundation reviewed on 2026-09-22

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
- [x] migration workflow works local/staging
- [x] UNC seed exists
- [x] verified-user/profile foundation exists
- [x] admin roles separated from hangout roles
- [x] baseline RLS tests pass
- [x] production not used for development.

## TASK-002 outcome

Local migration/reset/seed workflow and pgTAP verification passed. Following explicit user authorization, migration `20260921000100` was applied to hosted project `plqhsyhdfgqygauntsts`. On 2026-09-22, the coordinator verified matching local/remote migration versions, clean hosted lint for public/private schemas, and RLS/client grant catalog checks on all five foundation tables. Hosted checks did not run the local fixture suite or claim end-to-end Auth coverage. This project is the current hosted integration target; it is not a public production launch. No local seed/test identities were pushed. Independent security review had no actionable findings. ADR-0009 is now Accepted by explicit user choices; TASK-003 may proceed. See the dated addendum in `agents/handoffs/TASK-002.md`.
