# TASK-020 — Large-Hangout basic safeguards

Status: Planning; ADR-0024 accepted, awaiting reviewed/published stage A contract
Date: 2026-09-25
Planning baseline: independently remote-verified canonical main `8c087fa396475f966a3a783307719e4d625f60e2`
Planning branch: `agent/TASK-020-large-hangout-plan`

## Goal and authority

Deliver the accepted basic large-Hangout safety primitives in a bounded disposable-local increment: host awareness, voluntary joining control, a private future-review hook and saved-map dampening. Read `AGENTS.md`, this contract, MVP/PRINCIPLES, SECURITY_AND_SAFETY, AUTHORIZATION, DATA_MODEL, LOCATION_AND_MAPS, USER_FLOWS, relevant design docs and ADR-0004/0010/0012/0018/0019/0022/0023/0024.

TASK-019 is complete locally; it authorizes no hosted rollout or persistent gates. ADR-0024 was explicitly accepted on 2026-09-25 for this disposable-local scope: its 25-member threshold, host coarse disclosure, signal schema/retention and discovery order are authoritative for the narrower stage contracts. No threshold is an attendance estimate or safety guarantee. Existing Accepted ADR-0019 remains report-only; the hook has no operator consumer and hosted review remains open. TASK-010 co-host work is separate and must not be duplicated. Host-only UI scope reflects the current implementation and does not narrow Accepted ADR-0012's co-host authority; reconcile with any newly integrated TASK-010 work before stage dispatch.

## Bounded implementation stages after acceptance

1. **A — backend:** separately reviewed/published contract for the additive default-off safeguard gate, host-only coarse size RPC, private deduplicated observation signal and source-authorized saved-discovery projection. Define exact lock order against current join/block/moderation/notification paths and projection behavior with the safeguard gate off. Include actual-role SQL, real Auth/HTTP, upgrade/reset and contention verification. No UI or operator authority expansion. Fresh exact-tip security review and canonical integration precede B.
2. **B — student UI:** separately reviewed/published contract and interaction plan consuming A. Saved detail host warning, current joining status and existing host desired-state close/reopen with stale/uncertain recovery; saved discovery uses A's server ordering and accurate truncation copy. Preserve map/list fallback, privacy masking, existing navigation, analytics allowlist and responsive/keyboard states. No co-host/cancel/removal UI. Read the installed Leon design skill, accepted UX direction/tokens and inspect usepals.com before substantial UI work. Fresh exact-tip security/design and rendered review precede parent completion.

Use fresh GPT-6 Sol agents with medium reasoning and only bounded context. Use Standard app speed; if tools expose no speed selector, do not claim to configure or verify it. Each stage uses its own named task branch/worktree from the latest remote-verified main. Coordinator owns shared queue/status documents and reviews handoffs before dependents. A/B contracts are not yet written or authorized for dispatch.

## Acceptance matrix

- At 24 versus 25 joined rows, including the host, host current awareness is correct; left/removed rows and attendance answers never count. The accepted coarse flag may include nonready joined rows, but it reveals no exact count or peer identity.
- Genuine join crossing/above-threshold observation creates one signal per Hangout/policy version. Exact membership replay, concurrent joins, leave/rejoin, gate-off and cancelled/disabled/denied joins preserve the specified signal rules. No backfill or fabricated prior crossing time. Private signal tables deny anon/authenticated/operator direct access and REST/embeds.
- Host warning and authorized joining control work in open/closed states; a nonhost, unready/cross-campus host or moderation-disabled source cannot gain host access. Closure stops future joins without evicting current members; a close/join race matches existing serialized authority. Stale revision, lost response and access revocation never produce a false success or blind reversal.
- Saved discovery filters/authorizes before ordering and truncation. With over 100 fixtures, smaller visible groups precede larger visible groups, then stable time/ID ordering. Hidden/blocked/unready member changes cannot influence another viewer's class. Gate-off retains original chronological discovery. Calendar, privacy, source counts and mock examples remain outside the new ranking behavior.
- No report, sanction, notification, analytics event, attendance inference, peer reader or location disclosure is introduced. Preserve Accepted ADR-0023 allowlist and existing notification idempotence.
- Two clean local migration resets plus a true prior-schema upgrade, relevant SQL/RLS/real HTTP and deterministic observed-lock tests, workspace checks and authenticated built-web desktop/phone/keyboard/loading/empty/error/denied/stale/uncertain checks pass, with limitations stated precisely. Synthetic visual previews alone cannot replace authenticated acceptance.
- Cleanup verifies zero disposable fixtures, all product gates false (including the new gate), temporary credentials/scripts removed and owned services stopped. Publish handoffs and fresh exact-tip reviews with no unresolved P0/P1/P2. Integrate reviewed work/status and independently verify task/main remote SHAs before marking complete.

## Exclusions and decisions still open

No automatic capacity or closure, waitlist, popularity badge, scale-based sanctions, fake safety reports, new operator queue, complex event tooling, hosted operation, external ingest or real-user traffic. No TASK-010 implementation, personalized/friend ranking or general app redesign. Operational review of the private size signal remains a separately accepted hosted prerequisite, not a claim satisfied by this task. Threshold efficacy is unvalidated; future changes require an explicit versioned policy decision and bounded follow-up.

## Planning review and handoff

Read-only independent scope audit confirmed the accepted primitives and policy choices against baseline `8c087fa`. Fresh independent planning/security review cleared the corrected proposal with no remaining P0/P1/P2 after explicit preservation of ADR-0012 co-host authority and discovery live revalidation. The user accepted ADR-0024 on 2026-09-25. See `agents/handoffs/TASK-020-CONTRACT.md` for review/publication receipts and remaining work. Implementation still requires narrower reviewed/published stage contracts.
