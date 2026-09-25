# TASK-021 — Staging launch rehearsal

Status: Planning accepted 2026-09-25; hosted execution blocked on prerequisite decisions and authorization
Date: 2026-09-25
Branch: `agent/TASK-021-staging-rehearsal`
Baseline: remote main independently verified at `737ca32f1eefd4b347940e367b3923b47c2e0884`.

## Goal
Produce a source-backed readiness audit and a bounded, reviewable staging rehearsal plan. Keep TASK-021 open until separately authorized hosted rehearsal passes; a planning publication is not a launch or task-completion receipt.

## Required context
AGENTS.md; NOW/BACKLOG/CURRENT_STATE; MVP/PRINCIPLES; ARCHITECTURE, DEPLOYMENT, AUTHORIZATION, DATA_MODEL, SECURITY_AND_SAFETY; HOSTED_ENVIRONMENT and RELEASE_CHECKLIST; TASK-003/010/017/019/020 contracts and handoffs; Accepted ADR-0009/0010/0012/0018/0019/0021/0023/0024 and applicable amendments. Current explicit instructions and accepted ADRs take precedence over historical queue entries.

## Authorized planning scope
- Audit repository evidence, existing hosted inventory and unresolved MVP dependencies. Label historical inventory separately from freshly verified hosted state.
- Publish this contract, a readiness matrix/runbook, current status and planning handoff after independent review.
- Define exact prerequisite decisions, evidence, stop conditions, cleanup and ownership for later narrow rehearsal stages.
- No meaningful implementation dispatch until its narrower reviewed contract is published on canonical main. Use fresh GPT-6 Sol medium agents, review handoffs before dependent dispatch. Standard speed is app-controlled; tool calls do not expose a speed selector.

## Exclusions and authorization boundary
No hosted migration/configuration/deployment, persistent feature gates, role bootstrap, external analytics, SMTP send, live users, production traffic, DNS or domain cutover. No schema, application, permissions or architecture change. No implicit acceptance of hosted policy from local ADR acceptance. Historical authorization of the foundation integration project does not authorize deploying all later local migrations there.

## Dependencies and decisions
1. TASK-010: ADR-0012 accepted; narrower backend/UI contracts and implementation remain absent. Reconcile those contracts with subsequent safety/moderation/notification/safeguard changes before dispatch. Local host close/reopen from TASK-020 does not complete co-host, cancel or removal management UI.
2. TASK-003: actual deployed HTTPS callback and UNC email delivery remain open. Need an explicit staging origin/target and approved SMTP setup and a controlled real UNC test mailbox before hosted verification. Synthetic database fixtures cannot prove inbox delivery; the later contract must name the approved recipient/sender/callback and cleanup of resulting Auth/profile/photo records, without public invitations.
3. Hosted safety: accepted operator access, role bootstrap/MFA, staffing/response, escalation/appeal, retention/deletion/legal hold and recovery policy must precede hosted moderation migration/live use. Do not widen ADR-0019 report-only access.
4. TASK-020: private size observation is unconsumed. A separately accepted consumer/access/retention/response policy and tested implementation are prerequisites to hosted safeguard use. No implicit size report, sanction, queue or emergency response.
5. TASK-019 hosted analytics: vendor region/access/deletion, IP/geolocation, consent copy, actual outbound payload and verifiable raw retention <=90 days require separate review before capture; otherwise capture stays off.
6. Remaining MVP access/ranking/measurement gaps require bounded implementation or explicit product-scope decisions. The rehearsal may record gaps; it cannot silently waive them.

## Planned execution after prerequisites
A. Publish/review readiness audit (this authorized increment).
B. Separately contracted release preparation: accepted hosted policies, target/origin/migration manifest, app local-only guard changes, secrets/configuration, backups/recovery, default-off gate plan and named authorized testers. Obtain explicit authorization for the exact hosted operations after the package is reviewable.
C. Fresh bounded hosted executor: verify exact target and starting state, apply only approved operations, run the approved controlled-test rehearsal matrix, capture sanitized evidence, stop on privacy/permission or environment mismatch, then perform approved cleanup and verify final gates/data/services.
D. Independent evidence review and go/no-go receipt. Resolve failures in separate tasks; no domain cutover or public launch follows automatically.

## Acceptance criteria
Planning milestone:
- [x] Source-backed blocker matrix distinguishes implemented locally, accepted-but-unimplemented, hosted-unverified and undecided policy.
- [x] Rehearsal matrix includes identity, core loop, revocation/privacy, operator controls, failure recovery, responsive states, analytics boundaries and cleanup evidence.
- [x] Independent planning/security review resolved; task branch and canonical integration published and remotely verified; status/handoff synchronized.
Full TASK-021 completion (not satisfied by planning):
- [ ] Required product/policy dependencies resolved by reviewed implementation or explicit accepted scope changes.
- [ ] Exact hosted target, operations and temporary test/gate plan authorized in a published narrower contract.
- [ ] Actual deployed HTTPS/UNC delivery and approved end-to-end rehearsal verified; evidence independently reviewed with no unresolved launch blocker.
- [ ] Cleanup/recovery verified, final gate/target status recorded, handoff and shared records integrated and remote-verified.

## Verification and handoff
For this docs-only increment: inspect source references, validate Markdown paths, run `git diff --check`, independent review. Do not claim new runtime tests or current hosted state. Later stages need automated permission/critical-flow tests and actual HTTPS browser/API evidence; local historical passes cannot substitute.
Coordinator owns NOW/BACKLOG/CURRENT_STATE/CHANGELOG and `agents/handoffs/TASK-021-CONTRACT.md`; audit/runbook lives in `docs/operations/TASK-021-STAGING-READINESS.md`. Final parent handoff requires branch/main remote receipts and honest limits.

## Successor workflow
After full TASK-021 acceptance, review, publication and integration, create exactly one successor Codex task from current verified canonical main, checking for existing active work first. Use GPT-6 Sol medium and the app's Standard setting. Select the next ready dependency/task; TASK-022 cutover still requires its own authorized scope. Do not create a completion-triggered successor while TASK-021 is blocked or planning-only.

## User plan acceptance
On 2026-09-25 the user replied “accept” after the published TASK-021 readiness audit and rehearsal plan. This accepts the reviewed planning direction and prerequisite sequence. It does not select or accept any still-undefined hosted policy, authorize hosted execution, or complete TASK-021. Next, resume the existing TASK-010 task to reconcile and publish its narrower co-host contracts under already Accepted ADR-0012; no duplicate successor task is created.
