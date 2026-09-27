# TASK-021A — Local pilot admission and capability enforcement

Status: **Proposed contract — blocked on ADR-0027 acceptance and independent contract review/publication**
Date: 2026-09-27
Parent: TASK-021 (incomplete)
Proposed branch: `agent/TASK-021A-pilot-admission-capabilities`
Planning baseline: canonical main `8e49922c5cb9d5331ca6c0b01fcf49c34541a6ae`; executor must start from latest verified main containing all accepted prerequisites.

## Goal and gates

Implement only the local closed-pilot boundary selected by Accepted ADR-0026 and the exact mechanism in [ADR-0027](../../decisions/ADR-0027-closed-pilot-admission.md) **after explicit acceptance**. Product acceptance does not accept this schema/auth change. Do not dispatch implementation until the coordinator independently reviews/publishes this contract on main. Resolve any ADR-0026/0027/contract conflict before changing code. Use a fresh task-specific GPT-6 Sol medium agent and fresh independent security reviewer; Standard speed is app-controlled and cannot be verified by dispatch tools.

## Required reading

AGENTS; accepted ADR-0026 and accepted final ADR-0027; TASK-021/readiness/initial-decision documents; MVP/PRINCIPLES; DATA_MODEL/AUTHORIZATION/SECURITY_AND_SAFETY/AUTH/REALTIME_AND_MESSAGING; ADR-0009/0010/0011/0013–0025 and source migrations/tests. For substantial UI changes read Leon's `design-taste-frontend` skill, DESIGN_DIRECTION, current tokens/components and inspect usepals.com before the interaction/visual plan.

## Bounded implementation

1. Publish a source-to-check inventory for every affected table grant/RLS, helper, RPC, route/action/API/Storage path, retry and operator path. Distinguish ordinary admission, admitted incomplete onboarding, caller-only status and narrow evidence-qualified safety recovery. Include `get_access_state`, independent `ready_subject_campus`, `has_verified_membership` consumers, profile owner policies, photo delivery/signing, host admission and peer projections.
2. Add committed local migrations for private default-deny account admission, default-off pilot availability and authoritative capabilities, controlled trusted management and immutable audit. No student grants or arbitrary-subject admission oracle; no signup metadata/JWT-only privilege. Exact final schema follows Accepted ADR-0027; no major provider or broad admin proxy.
3. Enforce live admission and capability checks throughout the inventoried database and app boundaries. Required owner drafts/primary photo lifecycle must work before ready; nonadmitted users get neutral status/invite-pending guidance. Preserve current UNC verification, account/campus/readiness, global block, moderation disable and photo concurrency rules. Existing sessions/retries lose ordinary access after committed revocation/shutdown. Update typed access states, callbacks and redirects without loops.
4. Extend mutation serialization/rechecks to admission/policy evidence in existing deterministic lock order; include absent-row races and operator transitions. Preserve READ COMMITTED semantics and documented in-flight snapshot limitation, never imply recall of delivered bytes.
5. Keep Hangouts/map/host/join/private instructions, Hangout chat, safety and narrow report-only moderation. Make `/chats` Hangout-only, removing its People availability dependency and pilot `DmInbox` rendering. Calendar and attendance require independent disabled capabilities rather than inheriting Hangout availability.
6. Deny Calendar, People/opt-in, friendship, DM, notification inbox/preferences, attendance, optional rich-profile expansion/editor, additional-photo assignment/gallery and external analytics through presentation and authoritative route/action/API/database checks. Test accidental legacy gate enablement does not revive them in pilot. Deny optional-field writes while preserving required-field updates and retained private optional data. Keep primary replacement upload/assignment/cleanup and retained private objects; do not add a destructive deletion policy. Keep original map order and safeguards/capture off.
7. Co-host deferral is UI-only: hide/deny assignment pages, controls and application server-action entry points. Preserve existing backend roles, authorized role RPC behavior, invariants and safety; any change to backend co-host authority is out of scope and needs separate accepted policy. Preserve notification hooks/global reconciliation/private evidence/dependency migrations while delivery features are off.
8. Preserve narrow active-account safety recovery after admission/readiness loss and shutdown exactly as ADR-0027 specifies; no new source reader. Operators remain separately authorized/audited and do not acquire student admission or broader readers. Do not create hosted operator roles.
9. Adapt existing local regression fixture helpers to synthetic admission and explicit temporary capability settings. No admission bypass or production “nonpilot” fallback; off means ordinary student access denied. Update specs for actual behavior and source inventory, without redefining hosted readiness.

If this work cannot be completed as one reviewed boundary, stop at a proposed split and have the coordinator publish fresh bounded subcontracts; a partial database or UI gate is not releasable.

## Required acceptance evidence

- [ ] Default missing/disabled policy, absent/revoked roster, anonymous, unverified, wrong-domain/campus, incomplete profile/missing photo and restricted account states fail correctly. Active invited UNC onboarding can upload/assign primary photo and become ready without admission/readiness circularity.
- [ ] Old JWT, email change, new account at previously admitted email, roster revocation/reactivation, shutdown/re-enable and readiness loss obey current state. Activation never grants verification, platform role or readiness.
- [ ] Admitted caller/nonadmitted subject and nonadmitted caller/admitted subject tests cover list, known-ID, embeds, roster, chat authors, host public/private location, profile/Storage/app photo and direct REST/RPC attempts. No roster/existence oracle, peer photos, incoming blocks or broad moderation reader.
- [ ] Concurrent revoke/shutdown versus create/join/edit/chat/retry/primary assignment tests prove serialization and fresh checks. Existing block/removal/cancel/disable/sanction privacy tests still pass; denied retry exposes no content. Missing-row activation races cannot authorize a stale operation.
- [ ] Deferred capabilities deny stale URLs/actions, direct APIs/RPCs and raw table paths with legacy feature gates accidentally on; verify UI cannot trigger them. Co-host application entries deny while authorized existing backend role behavior remains unchanged. Hangout-only Chats works with People/DM off; Calendar/attendance remain off with Hangouts on.
- [ ] Safety recovery after revocation/shutdown exposes only previously allowed caller evidence/receipts and outbound IDs; unadmitted/no-evidence actor denied. Independent moderation role checks/audit/conflicts remain effective, and admission-manager operations cannot self-grant operator authority or read source private data.
- [ ] Trusted management changes/audit are atomic and attributable; client table DML/function execution and audit rewriting denied. No browser credential or secret leakage. Schema grants/RLS tests and appropriate build/type checks pass.
- [ ] Desktop/mobile render and interaction verification covers verification/pending invitation, onboarding, core loop, chat, block/report and moderation, plus loading/empty/error/denial states; no hidden deferred control or broken redirect.
- [ ] Temporary fixtures/gates cleanly removed/reset after each test and failure path, final default-off state proven; full local reset only in proven disposable environment. Record sanitized evidence and remaining limits.
- [ ] Independent security/implementation review resolved; handoff/specs/task/shared records reviewed, task branch pushed and SHA verified, then accepted integration pushed to main and remote SHA verified by coordinator.

## Exclusions and environment discipline

Disposable local tests only, temporary synthetic identities/photos/Hangouts/cases/roster/audit fixtures, cleaned afterward. Use existing local target guards and refuse nonlocal/unidentified targets before any reset or gate/role write. No hosted migration/configuration/gate, Auth provider/signup change, SMTP send, live user, role bootstrap, deploy/domain/DNS, external analytics transport or production operation. Do not weaken current local-only application guards to deploy this work. Exact hosted target manifest/guard preparation and approved operating policies remain separate contracts. No named staffing commitment, retention duration, URL lifetime or hosted bearer acceptance is selected here.

## Handoff and completion

Executor records source inventory, migrations/checks, test/browser evidence, cleanup/default state, risks and verified task SHA. Coordinator owns NOW/BACKLOG/CURRENT_STATE/CHANGELOG and remote main receipt; no concurrent queue edits. TASK-021A is incomplete until accepted reviewed integration is remote-verified. Completing this local increment does not complete TASK-021 or trigger duplicate product-task chats; hosted admission/provider/callback/email, safety operations, retention/photo and rehearsal gates remain open.
