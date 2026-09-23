# TASK-016 — Local blocking and reporting

Status: ADR-0018 accepted; stage A independently reviewed and integrating; reporting contract B next, final UI C dependent
Date: 2026-09-23
Planning branch: `agent/TASK-016-planning`
Starting canonical `origin/main`: `de5d79946532f7bca127432b85ef6e21c56d2c45`, fetched and independently verified

## Goal and scope
Extend the existing local block relation across Hangout discovery, membership, private meeting details, chat and notifications, and let students privately report a user or Hangout even after removal. This is a bounded disposable-local safety increment, not hosted or launch readiness.

## Required context and decision gate
Read AGENTS, NOW/BACKLOG/CURRENT_STATE, MVP/PRINCIPLES, ARCHITECTURE, DATA_MODEL, AUTHORIZATION, SECURITY_AND_SAFETY, LOCATION_AND_MAPS, REALTIME_AND_MESSAGING, NOTIFICATIONS, TESTING, USER_FLOWS, accepted ADR-0006/0010/0013–0017 and relevant completed task handoffs. ADR-0018 decides cross-feature block precedence, safety departures, historical evidence, reports and retention. The user explicitly accepted reviewed, main-published ADR-0018 on 2026-09-23. Acceptance is recorded in the ADR; narrower stage contracts still require independent review and canonical publication before implementation dispatch. TASK-010 ADR-0012 was accepted separately on 2026-09-23; its implementation awaits its own reviewed stage contracts, and no co-host powers are included here.

## Staged delivery
Each stage gets a narrower independently reviewed contract, published and remote-verified on main before fresh GPT-6 Sol medium dispatch. Use the app's Standard speed preference; the subagent API cannot configure or verify speed. Review handoff and exact pushed tip, integrate on canonical main, verify remote refs before dependent dispatch. Split a stage further if its lock/access audit cannot remain reviewable.

1. **TASK-016A global block backend:** single authoritative block operations, minimal retained safety provenance (unprovable pre-migration peer overlap fails closed), a bounded owner-only retained-Hangout-ID recovery projection, deterministic existing-block reconciliation, Hangout public/roster/private access and membership precedence, historical group-chat filtering, notification reauthorization and suppressed safety-transition events. Includes every legacy RPC/direct RLS access path, affected-set concurrency and gate-off teardown. Its narrower contract must document the complete access-path and lock-order matrix, migration reconciliation and retry semantics before dispatch. Backend compatibility must fail closed for existing UI; it must never silently apply wider departures through old People confirmation wording. Until C is integrated, disable old block-write entry points in the web UI with accurate local-unavailable wording while preserving safe read/unblock access. Review A before B.
2. **TASK-016B reporting backend:** private report/retry ledger and historical-target authorization, atomic caller rate limit, opaque idempotent receipts, real-role/API/concurrency tests. Consume A's reviewed provenance without granting any client/moderator evidence reader. Review/integrate before C.
3. **TASK-016C safety UI:** separate interaction/visual plan and current Leon's Taste skill/usepals.com inspection. Add clear confirmations for block consequences, bounded exact-ID block management, user/Hangout report forms and a recovery route for retained IDs after removal. Update all existing People/friend/DM block affordances and limitations. Implement no-store responses, current authorization, denied/unknown/retry states, fail-closed clearing across auth transitions and bounded polling. Verify rendered desktop/tablet/phone/keyboard plus real production-mode action flows; independent exact-tip security/design review before parent completion.

## Exclusions
TASK-017 moderation console, sanctions/audited evidence access, appeals, attachments/message reports, production retention, peer photos/names in block history, co-host policy, invitations/restricted Hangout modes, Realtime/push/email, hosted migration/deployment, live students, DNS and unrelated CI repair. Do not imply physical safety or automatic report review. No automatic TASK-017 handoff until this parent is actually complete.

## Acceptance criteria
- [ ] Explicit ADR-0018 acceptance recorded after reviewed main publication; every narrower stage contract published before dispatch.
- [ ] Either-direction block separation covers all source/database/web paths, with no gate-off or old-RPC bypass. Existing stored blocks reconcile deterministically while gates remain off.
- [ ] Host/nonhost block effects match the policy; no host eviction/transfer or attendee power to remove another attendee. Unblock restores no membership/friendship/DM automatically. Roster/chat/notification projections do not reveal blocked peers or private details.
- [ ] Historical caller-specific evidence supports blocking/reporting after removal/revocation without target enumeration or restored content access; only caller receipts are returned. Reports have bounded input, atomic per-caller limits and conflict-safe retries.
- [ ] Two clean local database resets and schema lint, actual-role SQL, real Auth/PostgREST/REST embeds, deterministic observed-lock races and source regressions pass. Record exact commands/results and any tool/environment limitations honestly. Test both commit orders for blocks versus join/send/edit/cancel/readiness/gate changes, opposite blocks, multiple shared Hangouts, reconciliation cycles, report limit races and lost responses. `pnpm check` and relevant built-server action suites must be evidenced; no inferred green CI.
- [ ] Desktop/tablet/phone/keyboard and loading/empty/error/denied/uncertain/retry states pass; auth switching/back/focus does not restore stale private data. Future reads after committed revocation deny; documented in-flight boundary remains explicit.
- [ ] Gates restored false, task fixtures/provenance/reports cleared, local services stopped. Reviewed stage and parent handoffs, source docs, CURRENT_STATE/CHANGELOG/NOW/BACKLOG/DONE synchronized; both task and canonical-main remote SHAs verified. No hosted readiness claim.

## Planning verification and ownership
Coordinator owns queue/status/policy acceptance and canonical integration. Planning changes only documents and need consistency/security review plus `git diff --check`; runtime tests apply to implementation. Fresh stage agents stop after their bounded handoff. Planning handoff: `agents/handoffs/TASK-016-CONTRACT.md`; later parent handoff: `agents/handoffs/TASK-016.md`.
