# TASK-005 — Hangout data and authorization foundation

Status: In progress — ADR-0010 explicitly accepted; implementation authorized
Date: 2026-09-22

## Goal
Establish a locally verified backend foundation for Hangout records, ownership, participation and private meeting details. The user explicitly approved ADR-0010 on 2026-09-22. Local backend implementation is authorized under the accepted rules.

## Why
Hangouts are the core coordination object. Their database permissions must protect campus boundaries and private meeting places before create/discovery/join interfaces consume them.

## Dependencies and decision gate
- TASK-001 tooling and TASK-002 identity/RLS foundation are complete.
- TASK-003 local verified-membership and live profile/photo readiness behavior is available. Its deployed HTTPS callback and hosted delivery to real UNC addresses remain a separate open acceptance gap; TASK-005 cannot close or imply completion of it.
- TASK-004 map shell is complete but uses synthetic fixtures; do not connect it to this backend in TASK-005.
- Read Accepted `decisions/ADR-0010-hangout-foundation.md`, including both acceptance milestones and the latest TASK-007-approved current-ready roster, field/time, gate and atomic-write rules.
- TASK-006 is complete under Accepted ADR-0011. Preserve owner-only enrichment, profile revision/CAS and Storage assignment/deletion locks.
- The existing bounded implementation agent owns `agent/TASK-005-hangout-foundation`; reconcile its contract with latest `origin/main` without overwriting its work. Do not duplicate dispatch. Review its handoff and fresh security review before downstream work.

## Required Context
- `AGENTS.md`, this contract, `tasks/NOW.md`, `tasks/BACKLOG.md`
- TASK-002, TASK-003 and TASK-004 contracts/handoffs; TASK-002 security review
- `docs/product/MVP.md`, `docs/product/PRINCIPLES.md`
- `docs/engineering/ARCHITECTURE.md`, `DATA_MODEL.md`, `AUTHORIZATION.md`, `SECURITY_AND_SAFETY.md`, `LOCATION_AND_MAPS.md`, `TESTING.md`
- `docs/ux/USER_FLOWS.md`
- Accepted ADR-0001 through ADR-0009 and Accepted ADR-0010/ADR-0011, TASK-006 handoff and review
- Existing migrations, live readiness helpers, grants, SQL tests and Supabase setup instructions

## Allowed Scope after decision acceptance
- Committed local migrations for core Hangout, participant and separate private-location records, with constraints and RLS; server-derived host/campus identity and timestamps.
- Core fields: ID, university ID, immutable host ID, title, optional description, start time, optional end time, lifecycle status, joining state, campus visibility, public place label/coordinates/zone/precision, created/updated timestamps. Exact types, bounds and lifecycle follow the accepted ADR.
- Lifecycle: published → cancelled; joining open/closed independently; time passing does not assert attendance or successful completion. No persisted drafts or restore operation in this increment unless explicitly accepted in the ADR.
- Membership: unique Hangout/account record with joined/left/removed state and transition timestamps; host ownership separate from ordinary participation. Host is a joined participant; no co-host privileges/assignment in this increment.
- Separate optional private exact meeting details, protected independently from public approximate location. Public means permitted campus readers, never anonymous internet access.
- Local feature gate (default disabled), atomic public/private create/edit, server revision conflicts and owner-scoped creation retry identity as explicitly accepted in the revised ADR-0010; reconcile the active implementation with this revision before review/integration.
- Minimal database operations needed to enforce/test accepted transitions atomically. SQL/RPC primitives may be tested directly; no application create/edit/join workflow or client wiring.
- Minimal shared domain types/validation/data-access contracts only where needed for this backend boundary; no unused future-feature framework.
- Campus-only, unrestricted Hangouts in this increment. Reject friends-only, invite-only and eligibility-restricted creation/updates through every write path. Do not expose these modes until friendship, invitations and deliberately supplied profile attributes support accepted, tested access rules. No permissive fallback to campus visibility.

## Out of Scope
UI of any kind; map queries, viewport/geospatial discovery and ranking; connecting TASK-004 fixtures; application create/edit or discovery/join flows; calendar; messaging/chat creation; social graph or profile UI; friend/invitation/eligibility feature implementation; co-host management workflow; moderation/report/block workflow; attendance confirmation; large-event automation; capacity/waitlists; analytics; hosted Supabase/Vercel operations, deployment or production launch.

Do not introduce blanket operator access, peer profile/photo access or unrelated architecture changes. If a safety dependency is necessary, stop and split/revise the contract rather than silently implementing a new feature. Full block/report/moderation safety remains a launch gate.

## Eventual Implementation Acceptance Criteria
- [ ] ADR-0010 choices explicitly accepted and recorded before migrations; all material conflicts resolved or excluded with a fail-closed boundary.
- [ ] Fresh local resets reproduce the schema from committed migrations; no dashboard-only changes or hosted operations.
- [ ] Constraints enforce ownership, campus consistency, valid coordinates/time bounds, permitted status transitions and one participant record per Hangout/account. No default capacity requirement.
- [ ] RLS and grants independently require live ready access: active account/campus, current confirmed approved email membership, required profile and existing owned photo. Web/JWT claims alone cannot authorize access.
- [ ] Same-campus eligible readers can access only accepted public Hangout/participation fields; anonymous, cross-campus, incomplete, unverified, suspended/banned and stale-evidence callers cannot. Peer profile/photo access stays unchanged.
- [ ] Host/participant writes follow the accepted authorization matrix. Clients cannot forge host/campus/account IDs, roles, timestamps or membership states, resurrect removals, bypass closed joining/cancellation, or promote themselves. Atomic operations prevent races from bypassing authorization.
- [ ] Private exact details are separately protected under the accepted read/revocation policy. Public reads, joins/embeds, views, RPC return values and error payloads do not disclose them. No device location is persisted or broadcast.
- [ ] Restricted visibility/eligibility inputs fail closed at the database/API boundary, including direct authenticated writes and mutation of existing records; unsupported modes cannot be read as campus Hangouts.
- [ ] Real database permission/privacy tests pass for every allowed and denied operation, including immediate revocation and concurrency-sensitive transitions; existing identity/onboarding tests remain passing.
- [ ] Scoped implementation and fresh security review findings resolved; relevant repository checks pass; docs, task state and handoff synchronized without marking TASK-003 hosted acceptance complete.
- [ ] Task branch pushed and remote SHA verified; coordinator reviews/integrates into main and records verified main SHA before TASK-005 is marked complete.

## Tests / Verification
Use actual `anon`/`authenticated` database roles and synthetic callers, not only privileged SQL or mocked helpers. Cover host, participant, nonparticipant, left/removed participant, forged co-host/operator, another campus, no subject, unconfirmed/changed email, incomplete/missing photo, inactive campus and suspended/banned accounts. Exercise SELECT/INSERT/UPDATE/DELETE and each exposed RPC, forbidden column writes, unsupported modes, private-row joins/embeds and transitions after role/access revocation. Test closed/cancelled joins and concurrent join/remove/cancel behavior against accepted transaction semantics. Verify owner-only profile/photo regression. Use `pnpm db:verify` and relevant repository/auth checks from the existing local setup; record actual results and unrun checks. No production fixtures or hosted test claims.

## Documentation / Handoff
Implementation updates relevant data-model/authorization docs, current state, changelog and queues only when behavior actually exists. Use `agents/HANDOFF_TEMPLATE.md`; record accepted decision evidence, changed files, policy matrix, test results, limitations, branch and verified remote task/main SHAs. Planning handoff: `agents/handoffs/TASK-005-CONTRACT.md`. Contract preparation does not complete TASK-005.

## Follow-ups
TASK-007 owns application create/edit; TASK-008 discovery/detail/join; TASK-010 co-host management; TASK-012 friendship; TASK-016 blocking/reporting; TASK-017 audited moderation; TASK-018 attendance. Invitation and eligibility enforcement need separate bounded contracts/data dependencies before restricted Hangouts can ship. Do not auto-dispatch these tasks.

## Revised acceptance milestone — TASK-007 prerequisite
The user explicitly accepted the revised ADR-0010 linked from TASK-007 planning commit `f049184` and approved publication. The latest rules supersede the concurrent earlier ADR constraints; the existing TASK-005 coordinator/implementation agent retains ownership. TASK-005 validates supplied timestamptz instants and accepted database time bounds; America/New_York input/display and ambiguous/nonexistent local-time handling belong to the later TASK-007 UI, not backend UI work. Required tests include feature-gate-off denial on every public operation, current-ready roster filtering without peer profile exposure, field/time bounds, atomic create/edit rollback, owner-scoped retry identities and stale revisions. No duplicate dispatch, TASK-007 migration work or hosted operation.
