# TASK-033D2 handoff — friendship or request-consented DM backend

Status: reviewed migration applied to named disposable DB by coordinator; scoped SQL 26/26 passed with rollback. The D2 concurrency harness then passed after correcting its unfriend call to the granted public wrapper. No hosted or gate operation.

## Scope and outcome

- Added `supabase/migrations/20261015000100_friendship_dm_consent.sql`. Existing accepted DM generations are backfilled as recipient request-consented; pending and terminal generations retain their state. `consent_origin` distinguishes request and friend formation, while `recipient_consented` records independent recipient action.
- Added caller-bound `public.send_friend_dm_message(peer_id, request_id, body)`, returning generation and message IDs. It creates an accepted generation only with an actual first send, or converts the active pending generation in place, serializing on the existing shared social and unordered-pair locks. Directional request suppression remains for nonfriends; a current accepted friendship can form a new generation without reviving a terminal one.
- Added `public.accept_friend_dm_consent(peer_id, generation_id)`, available only to the original recipient of the active friend-origin generation after fresh bilateral eligibility and source checks. This is the explicit independent consent action that can keep the active generation readable after unfriend.
- Replaced the existing request creator exact retry, generation-bound send, request transition, and bounded message reader so accepted message bodies, sends and exact retries require `private.dm_current_consent(generation_id, actor, peer)` in addition to existing DM/People gates and bilateral eligibility. Active pair metadata stays available for cleanup while consent is paused. Request acceptance and reply now store recipient consent atomically with accepted state.
- Narrowed DM notification source triggers: friend formation does not emit a request or request-acceptance event; a first friend message emits the ordinary `dm_message` event. The later notification stage must authorize it at read time.
- Added `supabase/tests/database/friendship_dm_consent.test.sql`, fully transactional with synthetic account IDs. It covers no empty pair at friendship acceptance, first send, retry/conflict, unfriend pause, recipient-only independent consent, resumed access, terminal suppression, new generation under fresh friendship, pending conversion, old create-key denial after conversion/unfriend, changed-payload conflict and raw table denial. Added `supabase/tests/friendship-dm-consent-concurrency.integration.mjs`, a separate synthetic two-session harness with controlled lock barriers for opposing first sends, unfriend-before-send, consent-before-unfriend and block-before-exact-retry. The harness requires already enabled disposable gates and does not change gate state.

## Helper contract for dependent stages

`private.dm_current_consent(p_generation_id uuid,p_actor uuid,p_peer uuid) -> boolean` returns true only for the current **accepted** active generation with either recorded independent recipient consent or an accepted current friendship. This helper intentionally does not replace `private.dm_eligible(peer)` or source gate checks. It has no authenticated direct execute grant. Poll authorization and notification DM branches should combine these predicates. `private.dm_friendship_current(actor,peer)` is similarly private.

`list_notifications` is owned by the notification stage and was not edited here. Its accepted DM event readability must call the consent helper and bilateral eligibility. For a friend-origin `dm_message`, sequence 1 is valid; for request-origin DM events the established sequence rules remain.

## Review and verification still required

1. Fresh security review identified an old `create_dm_request` exact retry gap; it was fixed and added to the reviewed D2 migration before application. The coordinator applied that migration to `supabase_db_pals-task029-disposable` (API 55521 / DB 55522) and reported the scoped transactional SQL test passed 26/26 with rollback.
2. The first concurrency harness run timed out because it called the deliberately ungranted internal `transition_friendship` function under `authenticated`. The harness now calls the granted `public.unfriend` wrapper. `PALS_D2_DB=supabase_db_pals-task029-disposable node supabase/tests/friendship-dm-consent-concurrency.integration.mjs` passed after this test-only fix, covering opposing first sends, exact retry, unfriend-before-send/retry, consent-before-unfriend, and block-before-retry. Unique synthetic users were cleaned up; no gate setting was changed.
3. The notification stage must update its reader as above before complete end-to-end sign-off. Coordinator owns integration, remote SHAs and shared task records.

The coordinator committed reviewed D2 source as `6aba7fc`; this worker did not stage, commit or push the subsequent harness-only correction.
