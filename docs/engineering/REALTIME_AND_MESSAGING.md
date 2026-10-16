# Realtime and Messaging

## TASK-037 local correction

Accepted ADR-0044 retires the web poll UI/API and authenticated execution of the four poll RPCs in an additive migration, retaining private evidence. Chats now separates Hangouts and Messages while walking the combined caller-bound attention cursor in bounded complete source pages. Empty category batches retain continuation. The TASK-033 poll description below records its earlier candidate behavior, not the current student-facing surface.

## TASK-033 reviewed local candidate

Current source implements single-choice polls (question1–200;2–6 distinct options;one editable vote;creator close;five new polls/actor/conversation/hour) only under current joined Hangout or accepted DM generation access. Aggregates include only currently eligible voters and never expose a voter list. Friendship-origin DM access pauses without current friendship until independently accepted by the recipient; prior request-origin consent remains valid. Exact retries recheck access. Combined Chats mixes source-keyset batches with current peer photo/name and title/emoji. Backend migrations00100/00300/00500 and web source are local verified, unintegrated pending finalization. See TASK-033-LOCAL handoff for evidence and exclusions.

## Accepted local extension — 2026-10-15

Accepted ADR0042 adds current-friend or independently request-consented DM authorization and single-choice polls under current conversation access. Polls and friend-origin consent require reviewed committed migrations and denial/retry/concurrency verification before UI integration. Existing blocks and source revocation remain authoritative. See [ADR0042](../../decisions/ADR-0042-chat-polls-notification-policy.md).


## Initial-release scope amendment — 2026-09-26

[Accepted ADR-0025](../../decisions/ADR-0025-initial-mvp-scope.md) narrows the initial UNC release only. Existing refresh/polling Hangout chat and DMs are accepted initially with fresh access checks and accurate update expectations. Supabase Realtime remains a future delivery path; no raw channel publication, instant guarantee or backfill is implied. All membership/removal/block/server enforcement remains required. Hosted migration/release still needs separate authorization.
Use Supabase database + Realtime for MVP; no custom WebSocket service without ADR.

Every hangout has a dedicated group conversation so loose plans can be fleshed out naturally.

Direct messages use a request model: first message → recipient request inbox → reply/accept → normal thread. Ignore/block supported.

Conversation membership, removal, leaving, and blocking must be server-enforced.

## TASK-013A local Hangout text boundary

Accepted ADR-0015 stages disposable-local Hangout chat without a Realtime channel. The private persisted thread is created on first authorized send. Caller-bound RPCs enforce current ready joined membership and use keyset reads; the later local UI may poll this reader. Raw message tables are not published to Realtime. Hosted delivery, subscription revocation and global block precedence remain separate reviewed work.

## TASK-014A local direct-message backend

Accepted ADR-0016 adds only a private, default-disabled local DM boundary. A ready, opted-in same-campus sender can leave one first-message request for a currently People-visible recipient. The recipient explicitly accepts, replies to accept, or ignores it; an accepted thread can be sent to while both users remain eligible. Ignore, withdrawal and close permanently suppress that initiator's direction. A People block terminates the active generation, including while the DM gate is off. Current participants may read minimal active state, while bodies require current bilateral People eligibility; terminal records have no client reader. The inbox and message pages are bounded, caller-bound RPC projections without raw Realtime publication. TASK-014B owns the UI and polling behavior.

## TASK-016A local block precedence

A host block revokes a peer's future Hangout chat reads/sends. For a third-party host, remaining joined members keep the thread, but each reader's page excludes entire messages from either-direction blocked authors before applying cursor/limit, including authors who already left. Send and exact retry take the shared social/Hangout mutation lock, then the parent and live evidence locks, and reauthorize before returning any body. An old retry after removal cannot replay text. DM formation, acceptance and send also take that shared lock before their request/pair locks; blocking terminates active generations regardless of DM gate state. No Realtime channel is added.
