# Backlog
## Product Build
- TASK-007 create/edit Hangouts — complete locally; see `DONE.md`, its contract and handoffs. Hosted enablement remains gated on separate safety/deployment work.
- TASK-008 map discovery/detail/joining — complete locally; see `DONE.md`, its contract and handoffs. Hosted safety gates remain open
- TASK-009 calendar — reviewed local-only implementation accepted; see `DONE.md`, contract and handoffs. Friend context remains dependent on accepted friendship access; hosted gates remain open.
- TASK-010 host/co-host management — ADR-0012 explicitly accepted on 2026-09-23. Backend then management UI stages require separately reviewed/published contracts and fresh agents; no implementation dispatched. See `active/TASK-010-host-cohost-management.md`.
- TASK-011 people discovery — bounded local opt-in text directory, privacy and People-only blocks complete under Accepted ADR-0013; see `DONE.md` and its handoffs. Peer photos, recommendations, attendance context and social actions remain deferred.
- TASK-012 friendship — bounded local backend and People UI complete and independently reviewed on remote-verified main; see `DONE.md` and handoffs. Friend-aware ranking, friends-only Hangout authorization and global block precedence remain separate.
- TASK-013 hangout chat — complete for bounded local scope under Accepted ADR-0015 on remote-verified main `f2404941aaf5cea5a830e9813950b33871b5e796`; see `DONE.md` and handoffs. Realtime/global block/hosted access remain separate.
- TASK-014 DM requests/direct chat — complete for bounded disposable-local scope under Accepted ADR-0016; see `DONE.md`, its contract and handoffs. Hosted messaging, Realtime and global block/reporting remain open.
- TASK-015 notification inbox/preferences — complete for the bounded disposable-local increment under Accepted ADR-0017; reviewed A/B/C stages, final handoff and main integration are recorded in `DONE.md`. Hosted delivery, Realtime and later safety/eligibility events remain separate.
- TASK-016 blocking/reporting — all bounded local stages reviewed and verified under Accepted ADR-0018; complete on remote-verified canonical main. See DONE and parent/A/B/C handoffs. Hosted moderation/retention/deployment remain separate.
- TASK-023 student web frontend design alignment — start after TASK-016C is reviewed/integrated and before TASK-017. Apply the usepals.com-informed visual system to existing student routes now; later student-facing UI tasks should use its shared tokens/components. Backend/schema/RLS/API/authorization changes are out of scope. Contract: `active/TASK-023-frontend-design-alignment.md`.
- TASK-017 admin moderation console
- TASK-018 attendance confirmation
- TASK-019 PostHog instrumentation
- TASK-020 large-hangout basic safeguards
- TASK-021 staging launch rehearsal
- TASK-022 domain migration/cutover

Execution order note: TASK-023 is deliberately numbered after the existing launch tasks to avoid renumbering established contracts. Its dependency places it immediately after TASK-016C and before TASK-017; tasks 018–020 should use its shared design system for any student-facing UI they add. Staging still checks consistency across the complete product.

## Later
Expo mobile; native release pipeline; organization accounts; polls; optional capacity/waitlists; multi-campus.

Unrelated technical debt discovered during work becomes a separate task here.

## Hangout access dependencies
Friends-only, invite-only and eligibility-restricted Hangouts remain disabled until accepted, tested access rules use authoritative friendship, invitation and deliberately supplied profile attributes. TASK-012 supplies friendship; invitation/eligibility enforcement still needs separately bounded contracts. TASK-016 block precedence/private-access rules and TASK-017 audited moderation remain safety dependencies before launch. Accepted ADR-0010 permits only disposable local Hangout work until those hosted-use gates are resolved; do not infer access policy from absent data.

TASK-003 deployed HTTPS callback and real UNC email delivery acceptance remains independently open in NOW.

## Engineering follow-ups
- CI maintenance: review Node 20 runtime deprecation annotations for checkout/setup-node/pnpm actions and the announced ubuntu-latest runner migration. TASK-006 CI passes; update action/runtime pins in a separate bounded maintenance task, not profile scope.
- Local web test helper: investigate Next 16 dev `/signin` HTTP 500 (`Invariant: Expected workUnitAsyncStorage to have a store`) seen during TASK-008 `pnpm test:auth:web`. The equivalent real Auth/HTTP/action/concurrency suites passed against the built loopback server; restore the dev-helper path in a separate bounded maintenance task.

- Confirmed pre-existing CI action-manifest failure: pre-Calendar main `e2e3b2d` [run 35806871829](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35806871829) and Calendar implementation `06101ee` [run 35810561283](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35810561283) both fail the same `ids.createHangout && ids.editHangout && ids.searchSaved && ids.changeSavedMembership` assertion in the dev-server action harness before Calendar checks. Validate and SQL checks pass; equivalent built-server suites pass locally. Include this distinct dev-manifest symptom in the bounded test-helper maintenance task; TASK-009 does not repair it or claim green CI.

- Notification SQL fixture investigation: during TASK-016B verification, unchanged `local_notifications_hangouts.test.sql` assertions 43/45 returned NULL once in a full stream; 61 later standalone/instrumented runs passed. Cause unresolved; timestamp ties were not substantiated. Investigate deterministic fixture/source ordering and retain failure diagnostics in a bounded maintenance task. No B notification code changed, and independent B review assessed this as nonblocking for B. See `agents/handoffs/TASK-016B.md`.
