# TASK-014 — Local DM requests and direct chat

Status: Planning; policy decision pending
Date: 2026-09-23
Planning branch: `agent/TASK-014-planning`
Starting canonical `origin/main`: `4989195dbb6fc54641ea6f1417aaf6e19f19e989` (fetched and verified before branching)

## Goal and boundary
Prove a private, consent-based first-message request and subsequent one-to-one text conversation in disposable local development. This does not authorize hosted messaging or complete global blocking/reporting.

## Required context and dependencies
- Read `AGENTS.md`, NOW/BACKLOG/CURRENT_STATE, MVP/PRINCIPLES, ARCHITECTURE/DATA_MODEL/AUTHORIZATION/SECURITY_AND_SAFETY/REALTIME_AND_MESSAGING/TESTING, relevant UX docs, Accepted ADR-0013/0014/0015 and their implementation/handoffs. Review current People, friendship and chat grants, RPCs, routes and tests before implementation.
- Proposed ADR-0016 defines request consent, pair state, narrow DM block effect, readers, revocation and delivery. It needs explicit acceptance after independent review and publication on `main`. This planning record creates no migration, reader, route or enablement authority.
- TASK-010 remains blocked on Proposed ADR-0012 and is independent. TASK-016 must still settle global Hangout/private-location blocking and reporting/moderation before hosted use.

## Planned stages after explicit ADR acceptance
1. **TASK-014A private backend:** Publish a narrower contract on canonical main, then dispatch a fresh task agent. Add an additive migration with a separate default-disabled DM gate, private canonical pair/request/thread/message and retry records, and caller-bound bounded operations. Enforce the accepted eligibility, participant-only reads, request transitions, bilateral DM block, readiness and concurrency rules at the database. Test actual client roles, live Auth/PostgREST and deterministic block/opt-out/gate/race cases. Independently review security and integrate the exact reviewed tip on verified main before B.
2. **TASK-014B People and Chats UI:** Publish a narrower contract, then dispatch a fresh task agent. Provide one first-message request entry from currently visible People detail, a Requests inbox and direct threads in Chats using only A projections. Cover accept/reply, ignore, uncertain submit, neutral unavailable peer, revocation and cross-tab auth transitions. No peer profile/photo or raw message table read. Read `design-taste-frontend`, UX/tokens/components and inspect `https://usepals.com/` before an interaction plan; verify rendered desktop/phone/keyboard and loading/empty/error states. Independently review security/design and integrate on verified main.

## Out of scope
Realtime/push/notifications; attachments, edits/deletes, typing/presence, read receipts, unread counts, search or group DMs; friend-based bypass or friend-aware ranking; invitations, restricted Hangouts, global People-block precedence, Hangout chat separation, reporting/moderation access and production retention; hosted migration/deployment/live users; unrelated CI repairs. TASK-015/016/017 retain their own scope.

## Acceptance criteria for a future bounded local increment
- [ ] ADR-0016 explicitly accepted and published; each stage contract reviewed/published before fresh dispatch; A independently reviewed and integrated before B.
- [ ] A visible, ready same-campus sender can create only one pending first-message request to a currently eligible recipient; the recipient can explicitly accept/reply or ignore. No ordinary back-and-forth thread is available before acceptance. Retries and concurrent opposite-direction actions cannot duplicate a pair or reopen ignored contact.
- [ ] Only current authorized participants can read their own bounded request/thread state and text. New sends obey current readiness, campus, People visibility and either-direction block checks defined by ADR-0016. An opt-out or block removes future peer text access as specified; no client role, admin role or friendship grants hidden profile/photo access.
- [ ] Direct table reads/writes are denied; caller identity is derived server-side; immutable message/retry records and bounded keyset reads survive lost responses without duplicate sends. Concurrent gate, readiness, opt-out and block changes have deterministic tests and fail closed after committed revocation.
- [ ] No-store web responses and sensitive-client-state clearing cover denied reads, signout/account switch, history navigation and uncertain actions. Rendered desktop/phone/keyboard checks and real local Auth/HTTP checks pass within recorded limits.
- [ ] Local gates restored false, fixtures removed, services stopped; handoffs/status and task/main remote refs verified. No hosted, Realtime or global safety completion claim.

## Ownership and handoff
The coordinator owns policy acceptance, shared queue/status, stage dispatch, independent review and main publication. Stage agents own only their bounded contract and handoff, then stop. Planning requires document consistency and security review, not runtime checks. Use fresh GPT-6 Sol medium task/review agents and the app's Standard speed preference; dispatch tooling may not expose speed.
