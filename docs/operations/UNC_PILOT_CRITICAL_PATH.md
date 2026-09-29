# UNC pilot critical path

Updated: 2026-09-29

The shortest safe path to a usable UNC pilot is a hosted production build of the existing local MVP plus identity, moderation, and release operations. It does not require finishing exhaustive TASK-021 static modeling or TASK-024 visual correction first.

## Already present on `main`

- Verified UNC onboarding and account suspension boundaries.
- Privacy-aware Hangout creation, approximate public discovery, joining and leaving.
- Hangout chat and direct-message safety boundaries.
- Blocking and private reporting flows.
- Audited local moderator queue, case review, suspension/ban/reinstatement, and one-way Hangout disable.
- Student web UI that passed the existing local production-build checks.

These are local or disposable-environment results; they are not a hosted pilot claim.

## Release blockers

1. **HTTPS staging frontend:** deploy `apps/web` as a production build and record its immutable build SHA.
2. **Supabase target configuration:** apply and verify the reviewed migration chain on the authorized nonproduction project; add the exact HTTPS site URL and `/auth/callback`.
3. **Student email:** configure custom SMTP and verify one controlled UNC mailbox. Do not disable email confirmation.
4. **Moderator operations:** name at least one moderator and one backup, grant least privilege, verify audit visibility, and document response/retention handling.
5. **Pilot supply and recovery:** approve a small participant list, create genuine initial Hangouts, and document rollback/cleanup and an incident contact.

The app is tryable locally today with the reviewed production build. A real student pilot becomes tryable after blockers 1–3 are closed; moderator and supply checks must be closed before inviting students.

## Release smoke sequence

1. Open `/api/health`; confirm `status: "ok"`, HTTPS origin, Supabase and Mapbox configuration.
2. Confirm a controlled UNC mailbox, complete onboarding, and sign in again after confirmation.
3. Create a Hangout with an approximate public area, join it from a second approved account, and send a chat message.
4. Block the second account; verify discovery, joining and messaging are denied after refresh.
5. Submit a report; verify the moderator can review it, record an audited action, and suspend or disable only within approved scope.
6. Sign out, sign in again, verify the prior safety state, then remove tagged test data under the approved retention plan.

## Stop conditions

Stop for any target mismatch, non-UNC account acceptance, private-location leak, blocked-user visibility, unauthorized moderator action, missing audit row, callback/email failure, or unexplained data outside the tagged pilot set. Never fix a failed check by disabling confirmation or weakening RLS.
