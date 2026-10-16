# TASK-033C handoff — private chat polls backend

Status: source candidate prepared for fresh security review; not applied to a database, staged, committed, or pushed by this worker. Coordinator owns those gates and shared records.

## Scope and implementation

- `supabase/migrations/20261015000300_chat_polls.sql` adds private poll, option, current-vote and retry tables with RLS and no client table grants. Authenticated users receive only caller-bound `create_chat_poll`, `list_chat_polls`, `vote_chat_poll`, and `close_chat_poll` RPCs. No notification, API, UI, existing migration, or source gate was changed.
- Hangout writes reuse the existing `pilot_lock_cohost_chat('send_hangout_message', ...)` lock and fresh requirement, plus `chat_require`. DM writes reuse the shared social lock, bilateral pair/evidence locks, `dm_eligible`, and `dm_current_consent` on the accepted current generation. Reads check the source in the same projection statement. All writes require READ COMMITTED and current ability to send. A first Hangout poll creates only the empty existing conversation row if needed, never a chat message.
- Poll text is trimmed, bounded, and rejects control characters. Options are distinct and ordered. Five new polls per actor/conversation per rolling hour are allowed; exact create retries are excluded. Pages use descending `(created_at,id)` keysets and at most 24 polls. Counts include only current Hangout joined/readied/unblocked voters; DM counts require current pair eligibility and consent. The projection gives only own current option and aggregate counts, with no voter IDs.
- Vote and close serialize after source authority on the poll row. Changed request payloads conflict. Old exact vote retries never restore a superseded choice, and vote retries after close fail. Close is creator-only, one-way, and idempotent while source rights remain current.

## Public RPC contract for UI

- `create_chat_poll(p_kind text, p_source_id uuid, p_peer_id uuid, p_request_id uuid, p_question text, p_options text[]) returns uuid`.
- `list_chat_polls(p_kind text, p_source_id uuid, p_peer_id uuid, p_before_created_at timestamptz default null, p_before_poll_id uuid default null, p_limit integer default 24) returns jsonb` array. Each item has `poll_id`, `question`, `created_at`, `closed_at`, `creator_id` (nullable when Hangout author is no longer current), `my_option_id`, and ordered `options` entries `{id,label,ordinal,votes}`.
- `vote_chat_poll(p_kind text, p_source_id uuid, p_peer_id uuid, p_poll_id uuid, p_option_id uuid, p_request_id uuid) returns jsonb` with `poll_id`, current `option_id`, and `applied`.
- `close_chat_poll(p_kind text, p_source_id uuid, p_peer_id uuid, p_poll_id uuid, p_request_id uuid) returns jsonb` with `poll_id`, `closed_at`.
- `p_kind='hangout'` uses the Hangout ID as source and NULL peer. `p_kind='dm'` uses the exact current accepted DM generation ID as source and the other participant's UUID as peer.

## Verification prepared and remaining

- `supabase/tests/database/chat_polls_033c.test.sql` is an isolated rollback pgtap fixture for grants, source access, friend-origin and accepted request-origin DM generations, pending/terminal denial, payload validation/retry, vote change/stale retry, own choice/counts, leave/unfriend/block/opt-out/gate revocation, creator-close revocation, rate and page bounds. It adds 25 synthetic private fixture polls after the rate check and verifies both 24-item keyset pages cover all 30 polls exactly once.
- `supabase/tests/chat-polls-concurrency.integration.mjs` uses two real Postgres sessions with lock barriers for competing votes, close-before-vote, and unfriend-before-exact-create-retry. It requires the named disposable container `supabase_db_pals-task029-disposable` and already enabled source gates; it does not reset or flip gates and cleans its synthetic users/evidence.
- `node --check` passed on the concurrency harness; `git diff --check` found no whitespace defects. SQL has **not** been executed or applied because the task contract requires a fresh security review first. After that review, coordinator should apply only to the named disposable DB, run the rollback SQL test and the real concurrency harness, and review any failures/fixes before commit/integration.

No hosted deployment, gate activation, task queue changes, or claim of hosted persistence is included.
