# TASK-013 — Local Hangout chat

Status: Planning; policy proposed, implementation blocked pending explicit acceptance
Date: 2026-09-23
Planning branch: `agent/TASK-013-planning`
Starting canonical `origin/main`: `373ae47117b677308723f657f61ee0c732550c1d` (clean worktree; independently verified by `git ls-remote`)

## Goal and boundary
Let the host and current joined participants of a saved campus Hangout coordinate in one text conversation in disposable local development. This increment does not establish hosted messaging or a global blocking policy.

## Dependencies and required context
- Read `AGENTS.md`, NOW/BACKLOG/CURRENT_STATE, MVP/PRINCIPLES, ARCHITECTURE/DATA_MODEL/AUTHORIZATION/SECURITY_AND_SAFETY/REALTIME_AND_MESSAGING/TESTING, UX flows/navigation/screen/design guidance, Accepted ADR-0010, Proposed ADR-0012, Accepted ADR-0013/0014, and current Hangout/People schema, routes and tests.
- Existing saved Hangout create/join/leave/remove/cancel access is the only chat membership basis. TASK-010 co-host management remains blocked on Proposed ADR-0012. Neither friendship nor People blocks change Hangout authority under current accepted rules.
- Publish this reviewed contract, Proposed ADR-0015 and shared status on canonical main before implementation dispatch. Publication does not accept ADR-0015. Explicitly accept its message reader, retention, People-block interaction and delivery policy before any migration or new message route.

## Proposed stages after acceptance
1. **TASK-013A local data and authorization:** fresh bounded backend agent/branch. Add an additive migration for one conversation per saved Hangout, private text messages and creation-key ledger; separate default-disabled chat gate; caller-bound paged read/send with narrow grants, transaction and Hangout-row serialization. No direct client message-table access, UI or hosted changes. Test actual-role SQL, real caller-session HTTP and deterministic revocation races. Fresh independent security review and verified main integration precede B.
2. **TASK-013B saved Hangout chat UI:** fresh bounded UI agent/branch. Put a text-only thread/composer behind the saved Hangout detail and a Hangout-chat entry in Chats, using only stage A projections. Explain near the composer that future eligible joiners can read full history; render bodies as escaped text with no HTML/markup interpretation. No generic DM, peer profile/photo reader or new permission. Handle loading, empty, denied, changed-membership and uncertain-send states; clear sensitive thread content on revocation. Read `design-taste-frontend`, current UX/tokens/components, inspect `https://usepals.com/`, write an interaction/visual plan, and verify rendered desktop/phone/keyboard. Fresh security/design review and verified main integration.

## Out of scope
Realtime transport or push/notifications in this local stage; DMs/message requests; attachments, media, edits/deletes, reactions, typing/presence, read receipts, unread counts, search, peer names/photos, co-host moderation; restricted Hangouts; global blocking and reporting/moderation; message retention/deletion policy for production; hosted migration/deployment/enablement/live student use; unrelated CI fixes. TASK-014–017 and hosted safety work remain separate.

## Acceptance criteria for the bounded local increment
- [ ] ADR-0015 accepted explicitly and published; narrower A/B contracts published before fresh dispatch; independent A review/integration before B.
- [ ] One conversation is bound to each saved Hangout; a published Hangout's current live-ready same-campus joined host/participant can send/read bounded text and full retained history, including before a late join or during a permitted leave/rejoin gap. A discoverer, left/removed participant, cancelled Hangout participant, unready account, cross-campus caller or disabled gate cannot. Closed joining does not evict current participants.
- [ ] No request authorized after committed revocation returns a message body or historical sender ID; no shared cache or continued polling exposes old content. An in-flight read authorized before revocation may still arrive afterward, as stated in ADR-0015. A current authorized reader sees only the proposed minimal author projection. Cancellation/leave/removal/readiness/gate changes prevent future reads and sends; retained rows are not deleted by these transitions.
- [ ] Send idempotency, immutable message contents, bounded pagination and ordering prevent duplicate/lost-response posts and stale-authority replays. No client-supplied author/campus/conversation authority.
- [ ] SQL/RLS/grant, real Auth/PostgREST/action and concurrency checks cover forged actor, late join/full history, leave/rejoin, removal, cancellation/readiness/gate races, idempotency reuse, page bounds, current-author projection, direct DML denial and existing Hangout/People/friendship regressions. UI checks cover desktop/phone/keyboard and loading/empty/error/revoked/uncertain states.
- [ ] Local gate false, fixtures cleaned, services stopped; handoffs, shared state and task/remote refs verified. No hosted or Realtime completion claim.

## Ownership and handoff
The coordinator owns policy acceptance, queue/status, stage dispatch, independent reviews and canonical integration. Stage agents own only their bounded contracts and handoffs, then stop. Use `agents/HANDOFF_TEMPLATE.md`. Planning handoff: `agents/handoffs/TASK-013-CONTRACT.md`. Planning checks are document consistency and review, not runtime or policy acceptance. Use GPT-6 Sol medium and the app's Standard speed preference for task/review agents; current dispatch tooling has no speed selector, so do not claim speed verification.
