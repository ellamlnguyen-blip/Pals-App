# Realtime and Messaging
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
