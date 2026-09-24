# TASK-017 — Disposable-local admin moderation console
Status: Planning; privileged implementation awaits explicit acceptance of Proposed ADR-0019
Date: 2026-09-23
Branch: `agent/TASK-017-admin-moderation` from verified `origin/main` `78e074247b03eafb554a4a7ecad6ab11644308dd`

## Goal

Build a locally verified operator workflow to review private safety reports and take audited account/Hangout actions under Accepted ADR-0006. Do not treat it as a staffed or hosted moderation service.

## Dependencies and policy gate

TASK-016A/B/C and TASK-023 are complete on canonical main. Read AGENTS, MVP, architecture, authorization, security/safety, data model, ADR-0006, ADR-0018 and existing report contracts. ADR-0019 proposes the missing authority, evidence, audit and sanction rules. Publish and independently review this contract and the proposed ADR on main, then seek explicit acceptance before any privileged code or schema change. Resolve material policy objections in a revised, reviewed ADR rather than guessing.

## Bounded stages after acceptance

1. **A — audited review backend:** committed migrations, including the reporter FK deletion restriction, for a default-off moderation gate, private case/audit/retry records and caller-bound operator queue/detail/case RPCs. Preserve current student report submission and no-reader boundary when the gate is off. Stage A includes actual-role SQL, REST and concurrency checks and independent security review before integration.
2. **B — enforcement backend:** narrow suspension/ban/reinstatement and Hangout-disable actions with transactional audit and idempotent retries. Update every affected existing database read/write boundary; test direct table, old RPC, API and concurrent revocation paths. Independently review and integrate before UI work.
3. **C — admin UI:** authenticate against live Supabase cookie/account/role, show bounded report queue/detail and supported case/actions with confirmation, reason, loading/empty/error/denied states and no sensitive browser persistence. Use shared tokens appropriately while keeping a distinct operator workspace. Verify rendered desktop/mobile and production-build local flows. Independently review before main integration.

Each stage needs a narrower reviewed contract on canonical main before its fresh implementation dispatch. A stage agent edits its bounded files and handoff only; the coordinator owns shared queue/state records and final integration. Stop and propose an ADR revision if backend enforcement needs authority wider than ADR-0019.

## Exclusions

No hosted migration, deployment, production data, live operator access or feature enablement; no service-role key in browser/Next app; no general user search, chat/DM transcript reader, attachments, exact location, profile-photo access, arbitrary raw-table browser, automatic sanctions, role grants, bulk actions, appeals, push/email, or production retention/deletion policy. Existing student safety APIs and gates retain their accepted semantics except the expressly accepted moderation enforcement paths.

## Acceptance criteria

- Reviewed and explicitly accepted policy precedes schema/permission implementation. All migrations are committed; moderation gate defaults false.
- Operator access is database enforced from live account and platform role, including direct API bypass attempts. Report detail access, case transitions and sanctions have immutable server-authored audit; replay and concurrent changes cannot duplicate actions or omit audit.
- Queue/detail/case/action conflict checks exclude an operator's own report, own target and own hosted Hangout even by exact ID. Queue/detail projections use ADR-0019's field allowlist, with unavailable-target behavior and no accidental profile/location/message expansion.
- Disabled Hangouts follow ADR-0019's explicit student read/write and safety-recovery matrix. Case `duplicate` and `action_taken` dispositions have linked evidence and atomicity; account deletion cannot cascade away an audit trail.
- Direct action RPCs require a case target exactly matching the sanctioned user or disabled Hangout; Hangout-to-host inference is forbidden. Queue-page and detail audit completeness is tested against returned IDs.
- Reporter/target/student clients gain no report list, narrative or case-status reader. No direct table, Storage or broad service-role bypass is introduced.
- Suspension/ban and Hangout disable take effect across existing student discovery, detail, joining, private instructions, chat and mutation paths, including direct REST and stale in-flight attempts under the documented transaction boundary.
- Local operator queue/detail/case/action UI displays only supported data, handles denied and unknown outcomes honestly, remains accessible/responsive, and never logs or persists allegation text in browser storage/URLs/analytics.
- Two clean disposable database resets, schema lint, actual-role SQL/REST/security/concurrency tests, relevant source regressions, workspace checks and rendered desktop/mobile production-build flows pass within recorded limits. Test gates and fixtures are reset/cleared; no hosted operation occurs.
- Each stage has an exact-tip independent review and handoff. Final branch and canonical main are pushed and independently remote-verified with SHA receipts; shared status, CURRENT_STATE, DONE and CHANGELOG reflect the actual outcome.

## Planning outcome

The existing `apps/admin` is a token-importing Next.js placeholder without auth or data access. `private.safety_reports` and retry ledger are private, RLS-protected and grant no client/operator reads; ADR-0018 explicitly excludes moderation. `public.platform_roles` contains moderator/admin identities but grants only an active owner's own role read. The older checkout's port-3000 timeout and TASK-023 dev-runtime issue remain separate BACKLOG items.
