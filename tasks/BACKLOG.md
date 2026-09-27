# Backlog

## Current pilot phase follow-ups — 2026-09-27

Accepted ADR-0026 governs the phase before the later public ADR-0025 MVP. TASK-021 remains open. Next authorized work is planning a narrower reviewed pilot preparation contract, not hosted execution.

- Pilot admission: name testers/cohort and owner; separately accept/review enforceable admission and removal across app/API/data paths. Hidden links are not access control; verified UNC alone is not admission.
- Pilot exposure preparation: audit exact routes/actions/APIs/RPCs and shared gate dependencies; contract fail-closed deferred surfaces while retaining block/report, removal, Hangout chat and moderation audit/enforcement/privacy. No implementation/gate change accepted by this docs plan.
- Later public-MVP re-enablement: Calendar, People discovery, friendship, DM, notifications, co-host UI, private attendance and optional rich profile/extra photos require separately reviewed release/gate/evidence packages. Preserve local implementations; pilot deferral does not mark these incomplete locally or remove backend safety.
- Analytics/safeguard and ADR-0025 post-launch deferrals retain their separate existing policy gates. Named human report handling, operator access/MFA/recovery, retention/legal hold/photo bearer policy, real UNC delivery/HTTPS callback and exact nonproduction manifest authorization remain pilot prerequisites.

See `docs/operations/TASK-021-PILOT-PREPARATION.md` for planned/unrun admission/deferred-route/privacy/gate/hosted tests. Older launch queue rows below describe the later public product unless still independently required for the pilot.

## Accepted initial-release deferrals — 2026-09-26

Under Accepted ADR-0025, these remain post-launch capability work, not initial-release implementation blockers or completed features. Each needs a separately bounded accepted contract and reviewed implementation; no hosted authorization follows.

- Initial-scope follow-up ACCESS: friends-only/invite-only Hangouts, direct invitations and deliberately supplied eligibility filters; authoritative access rules, block/moderation precedence and direct API/RPC/RLS tests. Keep unsupported modes disabled/fail-closed initially.
- Initial-scope follow-up FRIEND-CONTEXT: friend-attendance context across Hangouts/Calendar/People and friend-aware ranking, with explicit source authorization/privacy and no hidden-member input or public attendance history. Existing friendship remains required.
- Initial-scope follow-up PEER-PRESENTATION: peer photos and richer peer profile sections outside the People text allowlist; separately accepted metadata/delivery/block/revocation policy. Rich owner onboarding/photo editing stays required now; hosted bearer/cache policy is an independent unresolved launch gate.
- Initial-scope follow-up DELIVERY: Realtime, push and optional notification email plus any backfill. Preserve current authorized refresh/polling chat/DM/inbox/preferences with truthful expectations. This never defers actual UNC Auth verification email delivery or deployed HTTPS callback.
- Initial-scope follow-up MEASUREMENT: hosted external capture/complete funnel and repeat-attendance/repeat-host reports/aggregate endpoints, with ADR-0023 hosted region/access/deletion/consent/full-envelope/IP/geolocation/raw-retention review and separately authorized Postgres aggregates. Initial capture stays off; no private-answer export or complete-history claim.
- Initial-scope follow-up FEEDBACK: extra “happened as described?” and “comfortable attending again?” questions and aggregation under separately bounded privacy/moderation policy. Keep existing private attendance/report/block; neither is a verified outcome or safety finding.

Owner staffing/access/MFA/recovery, per-data retention/export/deletion/legal hold and owner-photo bearer/cache/incident policies remain separately Proposed and required before hosted use. TASK-021 is incomplete. Earlier backlog notes describe historical local increments; this section governs initial-release timing only, and accepted later block/moderation work takes precedence over old People-only limitations.

## Product Build
- TASK-021A pilot admission/capability preparation — ADR-0027 explicitly accepted 2026-09-27 for staged disposable-local work. Prepare/review/publish A1 backend contract before dispatch; dependent A2 app contract follows reviewed integrated A1. No hosted operation authorized.
- Integration-helper maintenance: local TASK-024 QA exposed optional Auth web helpers referencing the removed People `blockPerson` action and chat removal/cancellation probes assuming Hangout revision 1 after TASK-010. Update these helpers in a separately bounded test task; preserve actor binding and authorization assertions. Temporary TASK-024 probes exercised current contracts successfully.
- Development-runtime investigation: on the TASK-023 disposable local setup, Next.js `dev --webpack` returned a `cookies` outside request scope error for Hangout chat API, and denied Notifications/Safety probes plus an email-confirmation callback error. The same signed-in account successfully loaded Safety/Notifications and sent a Hangout message under `next build --webpack` + `next start`. Reproduce from a clean local setup, isolate the dev-only cause, and add a focused regression check without changing authorization behavior.
- Older original checkout (`5321e04`) local-server response investigation: after TASK-023 returned port 3000, its restored Next process listened but `/` and `/signin` requests timed out under both original Turbopack startup and a clean-cache webpack retry. The prior generated cache is preserved at `/private/tmp/pals-original-dev-cache-before-task023`. Diagnose separately from the reviewed TASK-023 production build, which served authenticated QA normally.
- TASK-007 create/edit Hangouts — complete locally; see `DONE.md`, its contract and handoffs. Hosted enablement remains gated on separate safety/deployment work.
- TASK-008 map discovery/detail/joining — complete locally; see `DONE.md`, its contract and handoffs. Hosted safety gates remain open
- TASK-009 calendar — reviewed local-only implementation accepted; see `DONE.md`, contract and handoffs. Friend context remains dependent on accepted friendship access; hosted gates remain open.
- TASK-010 host/co-host management — Accepted ADR-0012, reviewed local backend and UI are implemented; see `DONE.md` and the stage handoffs after canonical integration. Hosted use remains separately gated.
- TASK-011 people discovery — bounded local opt-in text directory, privacy and People-only blocks complete under Accepted ADR-0013; see `DONE.md` and its handoffs. Peer photos, recommendations, attendance context and social actions remain deferred.
- TASK-012 friendship — bounded local backend and People UI complete and independently reviewed on remote-verified main; see `DONE.md` and handoffs. Friend-aware ranking, friends-only Hangout authorization and global block precedence remain separate.
- TASK-013 hangout chat — complete for bounded local scope under Accepted ADR-0015 on remote-verified main `f2404941aaf5cea5a830e9813950b33871b5e796`; see `DONE.md` and handoffs. Realtime/global block/hosted access remain separate.
- TASK-014 DM requests/direct chat — complete for bounded disposable-local scope under Accepted ADR-0016; see `DONE.md`, its contract and handoffs. Hosted messaging, Realtime and global block/reporting remain open.
- TASK-015 notification inbox/preferences — complete for the bounded disposable-local increment under Accepted ADR-0017; reviewed A/B/C stages, final handoff and main integration are recorded in `DONE.md`. Hosted delivery, Realtime and later safety/eligibility events remain separate.
- TASK-016 blocking/reporting — all bounded local stages reviewed and verified under Accepted ADR-0018; complete on remote-verified canonical main. See DONE and parent/A/B/C handoffs. Hosted moderation/retention/deployment remain separate.
- TASK-023 student web frontend design alignment — start after TASK-016C is reviewed/integrated and before TASK-017. Apply the usepals.com-informed visual system to existing student routes now; later student-facing UI tasks should use its shared tokens/components. Backend/schema/RLS/API/authorization changes are out of scope. Contract: `active/TASK-023-frontend-design-alignment.md`.
- TASK-024 brand correction — complete for bounded visual scope; reviewed source and local QA integrated on remote-verified canonical main. See `agents/handoffs/TASK-024.md`.
- TASK-017 admin moderation console — complete for disposable-local scope; see `DONE.md` and stage handoffs. Hosted staffing, retention and deployment remain separate.
- TASK-018 attendance confirmation — complete for bounded disposable-local scope under Accepted ADR-0022; see `DONE.md`, its active contract and A/B/parent handoffs. Hosted work and gate enablement remain separate.
- TASK-019 PostHog instrumentation — complete for disposable-local scope; see `DONE.md` and `agents/handoffs/TASK-019.md`. Hosted release and five deliberately unwired events need separate reviewed work.
- TASK-020 large-Hangout basic safeguards — complete for bounded disposable-local scope under Accepted ADR-0024; see `DONE.md` and A/B/parent handoffs. Hosted use and the private-signal review consumer remain separate.
- Post-launch hosted large-Hangout bundle — explicitly deferred from initial MVP on 2026-09-26 under the accepted ADR-0024 amendment. Keep the safeguard gate off: size warning, map dampening and signal creation/review are all deferred; basic open/close joining remains MVP independently. Preserve local TASK-020 work. Before future enablement, accept and implement the operational consumer, audited access, retention and response policy; ADR-0019 remains report-only. The absent consumer is not a TASK-021 launch blocker for the narrower gate-off scope. Hosted migration inclusion/dependencies and any retained signals remain separately reviewed.
- TASK-021 staging launch rehearsal — planning contract/readiness runbook independently reviewed; hosted execution blocked on dependency/policy/target authorization. See `active/TASK-021-staging-launch-rehearsal.md` and `docs/operations/TASK-021-STAGING-READINESS.md`. Full task remains open.
- TASK-022 domain migration/cutover

Execution order note: TASK-023 is deliberately numbered after the existing launch tasks to avoid renumbering established contracts. Its dependency places it immediately after TASK-016C and before TASK-017; tasks 018–020 should use its shared design system for any student-facing UI they add. Staging still checks consistency across the complete product.

## Later
Expo mobile; native release pipeline; organization accounts; polls; optional capacity/waitlists; multi-campus.

Unrelated technical debt discovered during work becomes a separate task here.

## Hangout access dependencies
Accepted ADR-0025 defers friends-only, invite-only, direct invitations and eligibility-restricted Hangouts from initial release. They remain disabled until accepted, tested access rules use authoritative friendship, invitation and deliberately supplied profile attributes. TASK-012 supplies friendship; invitation/eligibility enforcement still needs separately bounded contracts. TASK-016 block precedence/private-access rules and TASK-017 audited moderation remain safety dependencies before launch. Accepted ADR-0010 permits only disposable local Hangout work until those hosted-use gates are resolved; do not infer access policy from absent data.

TASK-003 deployed HTTPS callback and real UNC email delivery acceptance remains independently open in NOW.

## Engineering follow-ups
- CI maintenance: review Node 20 runtime deprecation annotations for checkout/setup-node/pnpm actions and the announced ubuntu-latest runner migration. TASK-006 CI passes; update action/runtime pins in a separate bounded maintenance task, not profile scope.
- Local web test helper: investigate Next 16 dev `/signin` HTTP 500 (`Invariant: Expected workUnitAsyncStorage to have a store`) seen during TASK-008 `pnpm test:auth:web`. The equivalent real Auth/HTTP/action/concurrency suites passed against the built loopback server; restore the dev-helper path in a separate bounded maintenance task.

- Confirmed pre-existing CI action-manifest failure: pre-Calendar main `e2e3b2d` [run 35806871829](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35806871829) and Calendar implementation `06101ee` [run 35810561283](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35810561283) both fail the same `ids.createHangout && ids.editHangout && ids.searchSaved && ids.changeSavedMembership` assertion in the dev-server action harness before Calendar checks. Validate and SQL checks pass; equivalent built-server suites pass locally. Include this distinct dev-manifest symptom in the bounded test-helper maintenance task; TASK-009 does not repair it or claim green CI.

- Notification SQL fixture investigation: during TASK-016B verification, unchanged `local_notifications_hangouts.test.sql` assertions 43/45 returned NULL once in a full stream; 61 later standalone/instrumented runs passed. Cause unresolved; timestamp ties were not substantiated. Investigate deterministic fixture/source ordering and retain failure diagnostics in a bounded maintenance task. No B notification code changed, and independent B review assessed this as nonblocking for B. See `agents/handoffs/TASK-016B.md`.
