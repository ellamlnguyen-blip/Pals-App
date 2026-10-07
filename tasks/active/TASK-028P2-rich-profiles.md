# TASK-028P2 — Opt-in rich peer profiles

Status: Active; accepted disposable-local scope only. Date: 2026-10-06.
Branch: `agent/TASK-028P2-rich-profiles`.
Parent: TASK-028P / TASK-028. Canonical application integration remains gated by TASK-027 staged acceptance. No successor chat from this substage.

## Baseline and authorization

Fresh canonical main c67fd283bd00a227532284af6a19c8a1ffc1d696 plus this published contract. On the task branch only, merge reviewed P1 source fdd831b3ea19cf9a94784803ff7fb41de5da41a3 (application954b396 / review97884f5). Preserve canonical shared records during merges. User explicitly accepted ADR-0036 by ‘yes’ to the default-off verified-same-campus rich sharing question. ADR-0037 hometown already exists; do not recreate it.

Read AGENTS, ADR-0036/0037, docs/engineering/TASK-028P-RICH-PROFILE-CONTRACT.md, relevant MVP/PRINCIPLES/DATA_MODEL/AUTHORIZATION/SECURITY_AND_SAFETY/UX docs and current migrations. The security contract is binding, including consent lock order, live authorization snapshot, owner-private raw rows, image limits and all denial/revocation tests.

## Bounded lanes and dependency review

A DATA: add default-off private rich gate/preferences, caller-bound CAS get/set RPCs, replace People writer with atomic rich clear and safe lock order, separate single-snapshot rich detail, focused SQL/Auth HTTP/concurrency tests. Own migration20261006000200, associated tests and shared type definitions only. No gateway/resolver or UI changes. Publish handoff; coordinator independently reviews before dependent implementation. Use only named disposable local DB55422 and API55421; no reset, no hosted access. Preserve original fixtures/gates. Rollback test mutations. Persistent migration only after independent review.

B SECURITY DESIGN: fresh read-only review of the narrow service-only resolver and cookie auth.getUser→actor binding, server credential isolation/provisioning, exact object authorization and image decoder boundary. Review current code and technical contract before any B implementation. Record actionable findings or clearance in handoff; no app/schema changes.

C PHOTO: starts only after B design clearance and reviewed A predicate/contract. Implement service_role-only exact-slot/revision resolver in separate migration20261006000300, narrow server-only credentials/client scoped to route, authenticated GET photo gateway, bounded maintained decoder and meaningful image/HTTP/revocation tests. Full no-store headers including methods/errors, no raw paths/signed URLs in client. Own gateway, resolver migration, server-only helper, direct image dependency/lockfile and focused tests. No UI/consent migration edits. Re-read and validate installed image library against primary documentation/registry. Provision no hosted key; root provisions exact disposable-local server secret without printing it. Independent code/security review required before local use.

D UI: after reviewed DATA/PHOTO handoffs, owner accurate preview and explicit default-off rich choice with CAS/loading/error recovery and gate/eligibility-independent opt-out; peer rich profile matching supplied reference with optional hometown/pin, photos/2×2gallery/prompts and actual friendship/DM/safety controls. Clicking peer photos offers View only; owner retains View/Edit. Use each subject's data, honest missing sections and immediate whole-peer clearing on authorization loss. Existing legacy text remains policy-compatible. Own web UI/user client helpers only; no database/gateway changes. Read installed Leon taste and React guidance, inspect usepals.com, verify responsive/loading/empty/error interactions. Keep existing auth, readiness, profile-save and image ownership rules.

Coordinator owns contracts/shared records, local runtime/environment, actual browser QA, final independent review and publication. Fresh Sol gpt-6-sol/medium agents; speed unavailable to tool and not claimed verified. No agents edit the shared user checkout. Avoid overlapping files and review handoffs before dependents.

## Acceptance

Implement and independently review default-off/CAS/atomic-clear/privacy matrix, both relevant race orders and account/social/evidence lock graph; real Auth detail/gateway tests, hostile image/metadata bounds and revocation; existing critical tests/lint/typecheck/build. Apply only independently reviewed migrations to exact named disposable local stack without reset/history drift. Opt local fictional fixtures in through real UI; never auto-share old content. Actual browser owner preview/opt-in/off, peer View-only images, populated/empty peer states, hometown per user, friendship/DM/safety and revoked images at320/390/793/1280. Root compares rendered reference, records evidence and honest limits. Task branch committed/pushed/remote verified; docs/evidence/status only integrated into main and remote verified. Parent remains incomplete while canonical app integration/staged acceptance are gated. No hosted migration/gate/credential/production/domain action.
