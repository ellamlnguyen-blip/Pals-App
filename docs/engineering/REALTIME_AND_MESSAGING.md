# Realtime and Messaging
Use Supabase database + Realtime for MVP; no custom WebSocket service without ADR.

Every hangout has a dedicated group conversation so loose plans can be fleshed out naturally.

Direct messages use a request model: first message → recipient request inbox → reply/accept → normal thread. Ignore/block supported.

Conversation membership, removal, leaving, and blocking must be server-enforced.

## TASK-013A local Hangout text boundary

Accepted ADR-0015 stages disposable-local Hangout chat without a Realtime channel. The private persisted thread is created on first authorized send. Caller-bound RPCs enforce current ready joined membership and use keyset reads; the later local UI may poll this reader. Raw message tables are not published to Realtime. Hosted delivery, subscription revocation and global block precedence remain separate reviewed work.
