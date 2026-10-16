# TASK-033E handoff — co-host invitation consent backend

Status: source candidate ready for coordinator review. No migration was applied, committed, pushed or integrated by this task agent.

## Bounded changes

- `supabase/migrations/20261015000200_cohost_invitations.sql`: private invitation ledger with host request-key identity and one pending invitation per Hangout/recipient; host invite and withdraw, recipient accept or decline, host-only status; acceptance inserts the existing assignment and advances the Hangout revision in one transaction. Pending records grant no co-host authority. Direct legacy `promote_hangout_cohost` overloads lose student execution privileges in the same migration. Demote and step-down remain.
- Source transitions make pending invitations terminal on participant departure/removal, cancellation, moderation disable, pair block, account/Auth/campus membership readiness loss, campus active/slug/domain eligibility loss and source gate disable. Status and notification reads independently recheck current source/recipient rights. No terminal record reopens.
- The existing private notification ledger gets one `cohost_invitation` target item on a real, unmuted creation. A final `list_notifications` override retains all existing projections and adds current-source invitation authorization. It also uses TASK-033D2's `private.dm_current_consent` for accepted DM events and permits its friend-origin first message notification. It changes no attention or mark-read RPC.
- `supabase/tests/database/local_cohost_invitations_033e.test.sql`: transactional synthetic checks for anonymous, forged actor, nonmember, no power before acceptance, key retry/conflict, pending uniqueness, acceptance/replay, decline, withdrawal, host removal, gate/capability disable and restore, campus domain loss and restore, host status source denial, neutral inbox projection and old-promotion denial; ends in rollback.
- `supabase/tests/cohost-invitations-033e-concurrency.integration.mjs`: named-disposable-only observed races for withdraw versus accept, accept versus withdraw, Hangout gate disable versus accept and leave versus accept; synthetic committed setup is explicitly deleted in cleanup. It requires `PALS_TASK033_DB_CONTAINER` containing `task029`.

## Ordering and validation

Apply `20261015000100_friendship_dm_consent.sql` before `20261015000200_cohost_invitations.sql`; the E inbox override invokes D2's current-consent helper and reads its consent origin column. Application and database tests were intentionally left to the coordinator on the named disposable database after source review. `node --check supabase/tests/cohost-invitations-033e-concurrency.integration.mjs` passed. No hosted environment, gate or existing fixture was changed.

Suggested disposable checks after review: apply D2 then E transactionally, run `supabase/tests/database/local_cohost_invitations_033e.test.sql` with `psql -v ON_ERROR_STOP=1`, then run `PALS_TASK033_DB_CONTAINER=<named task029 container> node --test supabase/tests/cohost-invitations-033e-concurrency.integration.mjs`. Re-run existing notification/DM and co-host suites after updating their historical direct-promotion success expectations to the accepted invitation flow.

## Review points

Recipient response and host withdrawal now hold the pilot evidence, availability and Hangout capability SHARE locks before the parent and recheck current capability after waits. The source-gate and readiness triggers write terminal status when eligibility is lost. Security review should verify their lock order against all operator and identity writers, and check `list_notifications` after D2. Existing co-host suites still expect authenticated direct promotion and will fail by design until adapted. No remote SHA or main receipt exists for this unreviewed candidate.

Coordinator: fresh security findings fixed/confirmed; committed source71900ab applied after D2. Transactional SQL33/33 passed with rollback; isolated concurrency harness exited0 covering accept/withdraw/gate/leave scenarios. Application source milestone4d524a03f92249e30bfd7991d3250e5293a2b15a pushed/remote verified. No hosted action or parent completion.

## Follow-up 00700 — real Auth confirmation repair

Root's named disposable real Auth QA found that the applied 00200 trigger function aborts `auth.users.email_confirmed_at` updates with `record new has no field user_id`. The generic PL/pgSQL CASE referenced columns absent from the active trigger row. The failed confirmation transaction rolled back; this follow-up does not touch those users or rewrite 00200.

- `supabase/migrations/20261015000700_cohost_subject_trigger_fix.sql` replaces only `private.cohost_invitation_subject_changed()`. It uses explicit trigger schema/table branches and extracts `auth.users.id`, `public.accounts.id`, or `public.university_memberships.user_id` through `to_jsonb(NEW)` to avoid resolving another relation's field. Unexpected source or missing subject fails closed. The existing pending-only terminalization predicate and function privilege boundary remain.
- `supabase/tests/database/cohost_subject_trigger_fix_033e.test.sql` uses isolated synthetic users and a Hangout in one rollback transaction. It verifies ordinary new-user account/profile provisioning and email confirmation; a still eligible Auth timestamp update keeps a pending invitation; Auth domain loss, membership verification loss, and target/host account suspension terminalize pending invitations, and restoring eligibility never revives them.

This additive source has not been applied, staged, committed or pushed by the task agent. Coordinator review and named disposable application are required. Run the focused SQL file with `psql -v ON_ERROR_STOP=1` after applying 00700, then repeat the real Auth confirmation path. No hosted gate or data change is implied.
