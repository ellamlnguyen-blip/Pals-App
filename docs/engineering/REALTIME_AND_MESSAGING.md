# Realtime and Messaging
Use Supabase database + Realtime for MVP; no custom WebSocket service without ADR.

Every hangout has a dedicated group conversation so loose plans can be fleshed out naturally.

Direct messages use a request model: first message → recipient request inbox → reply/accept → normal thread. Ignore/block supported.

Conversation membership, removal, leaving, and blocking must be server-enforced.
