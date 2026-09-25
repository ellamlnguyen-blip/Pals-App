# TASK-010 — Local host/co-host management

Status: ADR-0012 accepted; Stages A/B reviewed and implemented for disposable-local use; canonical integration pending
Date: 2026-09-22
Planning branch: `agent/TASK-010-planning`
Starting verified clean main/origin: `49d6e780aebf5f23f384efe24d0a8bd55232888a`

## Goal
Let a live-ready local host manage joining, cancellation, participants and delegated co-hosts, with clear, database-enforced boundaries and immediate future-access revocation. Disposable local development only.

## Prerequisites and decision gates
- TASK-005/007/008/009 are reviewed and integrated. Calendar reviewed tip `777d4b875bedd26ea925a4982433809d3b048cc2` integrated at `0c2af8e3401dd6acce6d87249886f7e31b2e7175`; final starting main above was independently verified with `git ls-remote`, and canonical main/worktree were clean before branching.
- Accepted ADR-0010 remains authoritative. The user explicitly accepted ADR-0012 unchanged on 2026-09-23 after the reviewed proposal was published. Acceptance establishes the local co-host policy but does not itself change existing permissions.
- Coordinator publishes a narrower reviewed TASK-010A contract to canonical main before a fresh task-specific backend agent starts from the latest origin/main. TASK-010B follows reviewed A integration and its own published contract.
- Preserve default-disabled database gate; APP_ENV=local and validated loopback Supabase target on saved routes/actions; live ready campus access; denied direct DML; separate private instructions and mock/saved Hangouts.
- Hosted block/private-access precedence, reporting/moderation, TASK-003 deployed HTTPS callback/real UNC email and deployment/launch checks remain independent gates. No hosted changes or live students.

## Required context
AGENTS.md; this contract; NOW/BACKLOG/CURRENT_STATE; Accepted ADR-0010 and Proposed/then Accepted ADR-0012; TASK-005/007/008/009 contracts, handoffs and reviews; MVP/PRINCIPLES; ARCHITECTURE, AUTHORIZATION, DATA_MODEL, SECURITY_AND_SAFETY, TESTING, LOCATION_AND_MAPS; UX USER_FLOWS, INFORMATION_ARCHITECTURE, DESIGN_DIRECTION and existing interaction plans. Read actual Hangout migration, role/readiness helpers, RLS and concurrency tests, saved detail/actions, create/edit, Calendar and shared tokens.

## Bounded stages after acceptance
Coordinator writes and publishes each stage's narrower dispatch contract before its fresh agent begins. Review the backend handoff and independently review permissions before UI depends on it; do not give one agent an unbounded full-stack extension.

1. **TASK-010A backend**, planned branch `agent/TASK-010A-cohost-backend`: additive committed local migration and necessary shared types/tests only. Implement accepted role matrix, joined-role invariants, current-ready role projection, caller-bound management operations, revision/lock/revocation guarantees. Preserve host primitives and all existing API consumers, updating scoped regression expectations where the accepted policy changes. No UI or hosted operation. Fresh independent security review and reviewed main integration are prerequisites for stage B.
2. **TASK-010B management UI**, planned branch `agent/TASK-010B-host-management`: consume reviewed APIs in saved detail/management and existing edit flows. Host open/close/cancel/removal/promote/demote; accepted co-host edit/joining/removal/step-down/leave. Clear permission/role labels, destructive confirmations, stale/uncertain recovery and no private-content leakage. Preserve host-only meaning of Calendar Hosting; co-hosts remain in Joined. Add only a bounded manageable-Hangouts entry if required to reopen co-host edits, without relabeling ownership. No new permissions or migration. Fresh security/design review and rendered coordinator inspection before integration.

## Accepted local scope (implementation still requires stage contracts)
- Implement exactly ADR-0012's accepted matrix, assignment/readiness restoration, role visibility and revocation rules in separately reviewed stages.
- Current-ready account IDs and role labels only; no peer profile/photo expansion. Host/co-host controls act on authorized current roster entries, with database checks against forged targets and bounded reads/truncation disclosure. The host also gets a separate bounded current-co-host assignment list including nonready assigned IDs, for demotion only, as proposed in ADR-0012; it must offer pagination or another bounded way to reach every assignment. No profiles or historical assignments. Preserve the host's accepted backend historical-state lookup without building a historical roster UI.
- Explain: demotion/step-down removes management powers but does not remove a joined participant or revoke their private instructions. Removing someone is terminal for self-rejoin, cancellation is terminal, and already-delivered instructions cannot be recalled.
- Uncached caller-session pages/actions reauthorize actual role and persisted outcome. Public map/Calendar/action payloads exclude private instructions. No privileged credentials, optimistic grants or client-written feature gate.
- Before UI, apply installed Leon Taste skill, inspect https://usepals.com/ and existing components/tokens, and write a desktop/phone interaction plan. This planning task makes no rendered UI verification claim.

## Out of scope
Host transfer, invitations/acceptance inbox unless user revises policy, friendship/restricted visibility/eligibility, peer identities/profiles/photos, chat/notifications, report/block/moderation, attendance, automatic expiry, hard deletion, capacity/waitlists, analytics, hosted environments/migrations/enabling/deployment and unrelated CI/dev-helper repair.

## Acceptance criteria
- [ ] Explicit ADR acceptance recorded and published before migrations/implementation; each stage contract published before dispatch.
- [ ] Role assignment/loss/restoration and permission matrix enforced in database, including forged self-promotion, co-host-on-co-host removal, host-target denial, cross-campus and revoked callers.
- [ ] Parent-row serialization, post-lock authorization and revisions prevent stale role actions or membership changes from restoring privileges; cancellation/private access remains terminal as specified.
- [ ] Hosts and co-hosts can complete their accepted local desktop/phone management flows with honest confirmation, stale conflict, loading, empty, error, denied and uncertain-response recovery.
- [ ] Private instructions never leak through public payloads/roles/errors; demotion versus removal behavior is accurately explained and tested; peer readers and operator access remain unchanged.
- [ ] Workspace, two clean actual-role SQL resets/lint and all three actual built-server Auth/HTTP/action/concurrency suites pass with relevant new cases. Fresh independent security/design review clear, rendered desktop/phone/keyboard checks documented.
- [ ] Disposable data cleaned, gate false, local services stopped; scoped task branches and reviewed integrations pushed/remote-verified; coordinator records/handoffs synchronized before completion.

## Required verification matrix
Host, current/former co-host, ordinary/left/removed participant, nonparticipant, anonymous, other campus, incomplete/missing-photo, changed email, inactive campus, suspended/banned and forged operator. Test direct DML and every exposed RPC/read with gate on/off and READ COMMITTED versus denied stronger isolation. Exercise promotion versus leave/removal, demotion versus edit/open-close/removal, cancellation versus all writes, readiness/gate revocation during lock waits, stale revision and lost-response recovery. Verify no role resurrection on rejoin and explicit readiness restoration behavior. Cover host-only assignment lookup and demotion of nonready target; no co-host historical-state reads; private access after demotion, leave, removal and cancellation. Preserve create retry, atomic public/private edit, profile/photo and Calendar regressions.

`pnpm check`, `pnpm db:verify`, and actual local web/action suites are required for relevant stages. Baseline SQL is 226 assertions per reset, not a target count for expanded tests. Known dev `/signin` invariant and action-manifest CI failure are separately tracked in BACKLOG, reproduced before Calendar. Equivalent built-loopback suites may verify behavior; disclose CI failure without claiming green CI or repairing unrelated harness scope.

## Ownership and handoff
Coordinator owns shared queues/CURRENT_STATE/CHANGELOG, policy acceptance records, stage contracts, review and integration. Agents own only assigned stage files and stage handoffs using agents/HANDOFF_TEMPLATE.md. Record verified remote branch/main SHAs and exact tests/limitations. No code dispatch or migration exists at this planning milestone. Do not auto-dispatch later product tasks.

## Planning publication and policy acceptance
Reviewed contract/proposal published and independently remote-verified on planning branch and canonical main at `304fc81bc11b38f351341c6bdd285d55eb37bad2`. At that planning milestone, ADR-0012 was Proposed and implementation was blocked on the user's decision.
On 2026-09-23, the user explicitly accepted ADR-0012 unchanged after the co-host authority and alternatives were summarized. The policy gate is cleared; no stage contract, migration, code implementation, gate enablement or hosted operation has yet been dispatched by this acceptance record.

## TASK-021 prerequisite reconciliation — 2026-09-25
TASK-021's accepted readiness plan requires completing the already accepted local co-host policy while preserving later block, notification, moderation, attendance and large-Hangout behavior. `active/TASK-010A-cohost-backend.md` and `active/TASK-010B-host-management-ui.md` now narrow the backend and dependent UI boundaries. A requires shared social lock order, post-lock gate/actor/target checks, safety-transition role cleanup, provenance before membership overwrite, removal RPC replacement, notification preservation, one-way disable denial, attendance schedule freeze and host-only size awareness. B consumes reviewed A and existing TASK-020 joining control. This planning milestone adds no new co-host policy or hosted authority and does not complete TASK-010 or TASK-021. See `agents/handoffs/TASK-010-RECONCILIATION.md`.
