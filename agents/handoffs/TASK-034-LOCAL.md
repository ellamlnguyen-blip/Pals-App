# TASK-034 local candidate handoff

Status: reviewed disposable-local application candidate. TASK-034 remains incomplete; no hosted migration or application-main integration occurred. Parent TASK-032/033 release gates remain open.

Branch: `agent/TASK-034-pals-chat-discovery`. This branch starts from canonical main and contains the exact reviewed TASK-033 local dependency plus TASK-034A/C/D/E/F stage work. ADR-0043 was explicitly accepted for local implementation.

## Delivered behavior

- Chats is one current-source inbox. The private caller-bound attention RPC orders eligible DM generations and joined Hangouts by the latest owner-visible message or owner use. Rows show an owner-only unread dot for incoming visible messages. Entering a readable foreground thread touches it; a successfully rendered forward page acknowledges only visible sequences. List and notification visits never clear unread. Revocation is checked again during web enrichment; a peer who hides People detail becomes a generic management row without private photo, body or unread indicator.
- Student-facing discovery says Pals and “Discover your next Pal!” The separate friendships entry is removed; current friends show a heart and outgoing pending requests a clock next to the name. Filters are only graduation year and major. The authenticated browse ranks currently visible same-campus profiles using saved interests, major, year and hometown only when both rich sharing choices permit it. No score or match detail is returned. Opaque short-lived pages recheck live visibility and consent.
- Additive migrations `20261015000800_chat_attention.sql`, `20261015000900_pals_similarity.sql` and `20261015001000_chat_attention_refresh_rate.sql` are committed in source. The last bounds new inbox snapshots to 12 per owner per minute after 100 ms duplicate reuse, before expensive aggregation. Existing applied migrations were not rewritten.

## Review and local evidence

- Fresh source reviewer found two P2 issues: unbounded inbox first-page refresh work and whole-inbox failure when a DM peer hid People detail. Both were corrected and the reviewer confirmed no remaining P1/P2 in focused re-review. Residual HTTP in-flight opt-out timing and the possible terminal client response after 12 legitimate fresh snapshots per minute are documented limits.
- Named disposable Supabase `supabase_db_pals-task029-disposable`: all three migrations applied and replayed. Transactional focused pgTAP: chat attention 28/28, refresh rate 11/11, similarity 21/21. No hosted database was touched.
- Final local web `next build --webpack` passed compilation and TypeScript. Focused UI checks: chat 6/6, Pals 4/4. Browser desktop and narrow renders are in `docs/ux/evidence/task034-local/`.
- Actual authenticated browser check: a new incoming Hangout message moved that chat to the top and displayed its unread dot; opening the rendered thread advanced only the owner's watermark, and returning to the inbox cleared the dot. The temporary message/request/notification/conversation/attention records were precisely removed and fixture visibility restored. Hiding a DM peer's People detail left the rest of the inbox available as a generic management row. Forged Pals cursor showed a safe refresh state.
- Two-session disposable consent race: an Alex opt-out waited for Maya's active Pals browse transaction; a subsequent browse excluded Alex. Alex's opt-in was restored. This verifies the shared lock boundary for this path, not every simultaneous chat/consent transition.
- Two-session disposable chat membership race: Maya's leave of an upcoming joined Hangout waited for an active combined inbox transaction to finish. The writer rolled back; Maya remained joined. This verifies the lock order for this path, not every revocation/ack timing combination.
- Rollback-only representative Pals query check: 1,000 additional same-campus visible profiles with the same major/year were created in one transaction. `EXPLAIN (ANALYZE, BUFFERS)` for the first filtered page completed in 220.189 ms on the named disposable database, with 43,775 shared buffer hits and one read. The transaction rolled back. This is one local query sample, not a p95 or hosted performance claim.

## Remaining gates

Broader two-session chat revocation/ack races, larger-scale or repeated-query performance, and physical mobile interaction remain unverified. The source candidate still needs final user sign-off and the repository's accepted dependency/application-main and hosted gates. Preserve unfinished application code on this task branch. Update canonical main with this outcome and independently verified pushed SHA, then integrate source only after those gates. Do not start a successor merely for this local milestone.
