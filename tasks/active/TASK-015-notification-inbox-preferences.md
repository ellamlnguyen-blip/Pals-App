# TASK-015 — Local notification inbox and preferences

Status: Planned under Accepted ADR-0017; narrower stage contracts required
Date: 2026-09-23
Planning branch: `agent/TASK-015-planning`
Starting canonical `origin/main`: `8eab983eadec0ed3569a8e27abe961f10d36ec48` (freshly fetched before branching)

## Goal and boundary
Give a verified student a private, useful in-app inbox for changes to their plans and conversations, with category preferences. This is a disposable-local increment. It does not authorize push, email, Realtime, hosted notification delivery, or completion of global safety work.

## Dependencies and policy gate
- Read `AGENTS.md`, NOW/BACKLOG/CURRENT_STATE, MVP/PRINCIPLES, NOTIFICATIONS, ARCHITECTURE/DATA_MODEL/AUTHORIZATION/SECURITY_AND_SAFETY/REALTIME_AND_MESSAGING/TESTING, relevant UX docs, and Accepted ADR-0010/0013/0014/0015/0016 with their handoffs. Inspect current RPCs and web navigation before an implementation contract.
- Accepted ADR-0017 decides private notification storage, event sources, per-category opt-out, payload minimization, revocation, and local delivery. The user explicitly accepted the reviewed, main-published policy on 2026-09-23. Acceptance alone changes no schema or access; each narrower stage contract requires independent review and canonical publication.
- TASK-010/Proposed ADR-0012 remains blocked; do not infer co-host notification authority. TASK-016 owns global blocking/reporting and Hangout/private-location separation. TASK-017/018 own moderation and attendance events. All existing local feature gates remain default off.

## Planned stages
1. **TASK-015A private ledger and social events:** Complete for the disposable-local backend boundary. Its separately published contract, implemented branch, test handoff and exact-tip independent security review are recorded in `TASK-015A-notification-ledger-social.md` and `agents/handoffs/TASK-015A*.md`. Reviewed integration precedes the next stage.
2. **TASK-015B Hangout and chat event hooks:** Complete for the disposable-local backend boundary. Its separately published contract, source-event implementation, corrected gate race, test handoff and fresh exact-tip independent security review are recorded in `TASK-015B-hangout-notification-events.md` and `agents/handoffs/TASK-015B*.md`. Reviewed integration precedes UI.
3. **TASK-015C Notifications UI:** Publish a narrower contract, then dispatch a fresh agent. Add the Notifications tab inbox and preference controls using only reviewed caller-bound projections. Render neutral, actionable labels; reauthorize the destination on open. Include idempotent mark-read without a public count, bounded paging and refresh, no-store responses, and fail-closed sensitive-state clearing on signout/account transition. Read `design-taste-frontend`, UX/tokens/components, and inspect `https://usepals.com/` before an interaction plan; verify rendered desktop/phone/keyboard and loading/empty/error states. Independently review security/design and integrate.

## Out of scope
Push, email, OS permission prompts, Realtime subscriptions, background jobs and scheduled reminders; safety/moderation notices until TASK-017 establishes audited actions; attendance prompts until TASK-018; co-host events until ADR-0012; restricted Hangout invitations/eligibility, friend-activity push, marketing, engagement bait, analytics, badge counts, message excerpts, peer photos or profile copies; generic notification creation by clients or admins; hosted migrations/deployment/live users; global blocking changes or unrelated CI repair.

## Acceptance criteria for this bounded increment
- [ ] ADR-0017 accepted and recorded after reviewed planning publication; each stage contract reviewed/published before fresh dispatch, and A independently reviewed/integrated before B.
- [ ] Only the owner can read and mark their bounded inbox; direct table grants, forged actor/recipient/source and cross-account reads are denied. Revoked source access yields no private text or target details.
- [ ] The supported events and preference rules in ADR-0017 are generated once at authoritative local mutations, including exact retries, without client-supplied notification inserts. Muting suppresses optional new items while essential cancellation remains available; account/safety notices await their owning tasks.
- [ ] The inbox has bounded deterministic pagination, read state, owner preferences, neutral unavailable-source rendering, destination reauthorization, no-store responses and transition-safe clearing.
- [ ] Local gate is restored false, fixtures removed and services stopped; tests and rendered checks are recorded in handoffs. Reviewed task/main remote refs are verified. No hosted, Realtime or TASK-016 completion claim.

## Ownership and handoff
The coordinator owns policy acceptance, queue/status, stage dispatch, independent review and main publication. Stage agents stop after their contract and handoff. Planning needs document consistency/security review, not runtime tests. Use GPT-6 Sol medium and the app's Standard speed preference where selectable.
