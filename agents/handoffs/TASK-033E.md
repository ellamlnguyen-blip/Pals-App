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
