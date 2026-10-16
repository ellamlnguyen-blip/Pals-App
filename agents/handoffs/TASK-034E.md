# TASK-034E handoff — combined Chats attention UI

Status: bounded source candidate ready for coordinator review. No git stage, commit, push, database apply, hosted action or runtime server in this stage.

## Outcome

- `/api/chats` now uses one `list_my_chat_attention` RPC with a 24-item opaque cursor page. The web preserves server order and does not regroup or sort DM and Hangout rows. It validates the RPC shape and enriches DM display from fresh People detail. If People detail is denied with `42501` or returns no row, an otherwise source-authorized DM management row stays as `Person unavailable`, with no photo, body or unread dot. Mismatched peer detail or a transient detail failure fails the response. Optional rich photo failure leaves the avatar as initials. Hangout title comes from the authorized RPC label; its title-based emoji remains. The old dual-source cursor and creation-time sorting were removed.
- A second live source check follows enrichment for every page item: `get_dm_consent_ui_state` must still identify the same DM generation/state/direction, and `read_hangout_messages` must still authorize a Hangout. A revoked source returns a generic stale page and the client refreshes the first page once, preserving other available chats. The final owner check remains. As with any HTTP response, revocation committed after the last gate check can race delivery; client thread entry reauthorizes independently.
- Inbox rows show an accessible unread dot from `has_unread`. A stale cursor discards paging history and refreshes the first page. Inbox loading does not touch or acknowledge a chat.
- A caller-bound `/api/chats/attention` endpoint invokes `touch_my_chat` and `acknowledge_chat_page` with the authenticated actor, source kind/ID and, for acknowledgment, a safe-integer sequence. DM and Hangout thread clients invoke it only after an authorized foreground page has committed. Accepted readable DM and joined Hangout entries touch once per foreground entry. Pending DM recipient pages may acknowledge visible text but do not touch. Send preflight and immediate send refresh explicitly suppress attention calls. No peer receipt is displayed.
- Existing auth-transition masking and thread pagination remain in place. A denied or unavailable thread does not send attention calls. The backend RPC remains authoritative for source access and sequence validity.

## Checks

- `node --test apps/web/app/chats/combined-projection.test.mjs apps/web/app/chats/thread-attention.test.mjs`: 6 passed. Covers mixed source order, unread shape, generic DM fallback without photo/unread/body, mismatched peer detail, touch-before-ack, empty thread touch, pending acknowledgment, and denied touch stopping acknowledgment.
- `git diff --check`: passed.
- `tsc --noEmit -p apps/web/tsconfig.json`: did not pass. The isolated checkout could not install dependencies because npm registry DNS was unavailable. A temporary read-only link to the older original checkout's `node_modules` produced 41 errors in unrelated People/profile/Hangout files (missing Phosphor, rich types, sharp/react-easy-crop); no changed Chats file was reported. Temporary links were removed.
- `https://usepals.com/` could not be opened through the available web tool. No runtime server or named disposable browser was run by this stage per coordinator ownership; no screenshot was produced.

## Coordinator review and remaining gates

Run full web build/typecheck with this worktree's exact dependencies and named disposable preview, then verify desktop and 375px layout and loading/empty/error/denied states. Exercise authenticated mixed DM/Hangout recency across >24 rows; incoming unread, foreground ack, later arrival, self and hidden-author messages; pending management, source revocation and stale cursor; send/touch order and account/feature-gate denials. Check client/server races around enrichment and attention writes against the named disposable backend. This stage does not claim hosted persistence or parent completion. Accepted application-main integration and remote SHA verification remain with the coordinator.
