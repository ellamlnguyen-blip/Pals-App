# UNC pilot critical path

Updated: 2026-10-05

Current release is the open confirmed-UNC MVP under Accepted ADR-0028/0030, with operator-only MFA under Accepted ADR-0031. Students and ordinary actions require no individual moderation approval or MFA. Ella has explicitly approved admin and moderator authority; provisioning and MFA verification are pending. Use TASK-027's current evidence and launch sequence for actual readiness.

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
4. **Moderator operations:** Ella Nguyen (`ella_nguyen@unc.edu`) is the sole launch moderation owner under the explicit 2026-10-05 user decision. A backup moderator is not required. Verify least-privilege role access, MFA/recovery, report and audit visibility, response/retention handling and an incident contact.
5. **Launch supply and recovery:** create genuine initial Hangouts and document rollback/cleanup and an incident contact. No participant roster or individual approval is required for confirmed eligible UNC accounts.

The app is tryable locally today with the reviewed production build. A real student pilot becomes tryable after blockers 1–3 are closed; moderator and supply checks must be closed before inviting students.

## Release smoke sequence

1. Open `/api/health` on the deployed build; require HTTP 200, `status: "ok"`, and every configuration check true. HTTP 503 or `status: "not_ready"` stops the smoke test. This secret-free probe validates hosted environment settings, the exact configured Supabase project target, public key configuration, HTTPS app origin, and Mapbox public token presence. It does not prove the hosted Auth callback allowlist, SMTP delivery, provider connectivity, the remaining smoke sequence, or launch authorization.
2. Confirm a controlled UNC mailbox and sign in again after confirmation. Verify app entry with no completed profile/photo; profile enrichment remains optional after entry.
3. Create a Hangout with an approximate public area, join it from a second active confirmed UNC account, and send a chat message.
4. Block the second account; verify discovery, joining and messaging are denied after refresh.
5. Submit a report; verify the moderator can review it, record an audited action, and suspend or disable only within approved scope.
6. Sign out, sign in again, verify the prior safety state, then remove tagged test data under the approved retention plan.

## Stop conditions

Stop for any target mismatch, non-UNC account acceptance, private-location leak, blocked-user visibility, unauthorized moderator action, missing audit row, callback/email failure, or unexplained data outside the tagged pilot set. Never fix a failed check by disabling confirmation or weakening RLS.
