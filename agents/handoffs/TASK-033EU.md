# TASK-033EU co-host invitation web candidate

Status: scoped source candidate for coordinator review. No stage, commit, push, migration apply, hosted action or gate change performed.

## Source changes

- `apps/web/app/hangouts/saved/management-actions.ts` removes the old direct-promotion action. Demotion, step-down, removal, cancellation and the existing roster/assignment paths remain.
- `apps/web/app/hangouts/saved/[id]/management-controls.tsx` uses host invite/withdraw over the new API and shows pending, accepted, declined or unavailable invitation status. It freezes a request UUID and viewed revision for the invite, locks further actions after a stale or uncertain result, and requires reload before a new intent. Host status has explicit Start over, Previous and Next controls to locate/withdraw invitations beyond the first 24 records.
- `apps/web/app/api/cohost/route.ts` is caller cookie/actor bound via `notificationAccess`, accepts no actor/recipient override beyond the target account for host invite, rejects malformed action payloads, and sets private no-store headers. GET `?hangout=<uuid>` (optionally `&time=<created_at>&id=<uuid>`) exposes host-only 24-row cursor pages from `list_hangout_cohost_invitations` plus current revision and next-page indicator; GET `?invitation=<uuid>` exposes only `get_own_cohost_invitation`. POST maps exact payloads to `invite_hangout_cohost`, `withdraw_hangout_cohost_invitation`, and `respond_hangout_cohost_invitation`.
- `apps/web/app/notifications/cohost-invitation.tsx` exports `CohostInvitation({actor, invitationId, hangoutId})`. The later inbox owner must mount it only for `source_kind=hangout_invitation`, `event_code=cohost_invitation`, `source_id=invitationId`, `target_id=hangoutId`. It checks exact own state on load and after a response, masks on auth/page visibility transitions, and never automatically accepts. The inbox and destination files were untouched.
- `supabase/migrations/20261015000600_cohost_ui_state.sql` adds `public.get_own_cohost_invitation(p_invitation_id uuid)` returning only `(invitation_id, hangout_id, state, revision)` for the authenticated recipient after published source, joined, ready, gate, block and current read checks. It grants no raw/private table access.

## Validation and remaining gates

Scoped ESLint passed. `git diff --check` passed. Web TypeScript check exited 2 only on existing missing workspace dependency/type exports and unrelated profile/people errors; no errors were reported in this task's files. Dependencies in the shared checkout are incomplete (phosphor/react-easy-crop/sharp and local types). `supabase/tests/database/cohost_ui_state_033eu.test.sql` is a rollback pgtap test for anonymous, forged and host recipient reads, exact own ID/source/revision, pending and terminal decline, gate loss/restoration and cancelled-source denial. No SQL migration was applied or SQL tests run in this agent. Coordinator should fresh review the migration's lock order and exact-state privacy, add a focused SQL authorization test, apply 00600 to the named disposable database, then run the end-to-end host invite → recipient notification → accept/decline flow with the inbox integration. The host UI pages through all invitation records with the existing keyset RPC. The backend still enforces one pending invitation per recipient even when its status is on an older page.

## Fresh review corrections

- A confirmed invite clears its frozen request only while pausing management and refreshing to a new source view; an uncertain request remains frozen.
- The recipient leaf always performs an exact own-state GET after attempting a response, including network or JSON failures; it never automatically replays a response write.
- The host status API repeats the caller-bound RPC page after live access and revision checks, compares the two pages, and masks a changed projection.
- Auth and page transitions clear invitation rows and next-page state immediately, invalidate pending responses, and suppress invitation rendering when identity is hidden.
- Scoped ESLint, Prettier, and `git diff --check` pass after these corrections. No database application or publication occurred.
- Final leaf privacy race correction: a shared masked flag and generation ticket invalidate both initial GET and in-flight response POST/GET continuations on auth transition, pagehide or visibility loss. Every async result and catch checks the same ticket before updating invitation state. A masked component never reloads invitation data without a fresh mount.
