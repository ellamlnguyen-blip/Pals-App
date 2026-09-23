# Handoff — TASK-011A

Date: 2026-09-22
Agent: bounded backend implementation agent
Branch/worktree: `agent/TASK-011A-people-backend` / `/private/tmp/pals-task011a-people-backend`
Implementation commit, pushed and verified on origin: `063fbe4c44f010cec5a0a79cb8455aa629d54fd5`
Canonical main verified on origin before this handoff: `9b8e95f6a2b2d5d5ebeeeefa319b9d591bc2e8c4`
Integrated main commit: pending coordinator review/integration
Main status record: TASK-011A contract and accepted ADR-0013 were present on verified starting main `a9c10a81ce24af4d84330c027d2d0b8a53c3bacc`; coordinator owns subsequent NOW/CURRENT_STATE/CHANGELOG updates.
Outstanding review/integration blockers: none known in implementation; independent security review and main integration remain coordinator gates.

## Outcome

Added a default-disabled, disposable-local People gate; default-private owner preference; directional caller-owned blocks; and bounded, caller-session text browse/detail RPCs. No UI, photo release, raw peer profile grant, Hangout authorization change, or hosted operation was made. Independent security review requested raw pre-trim input caps and independent reverse-block proof; both were added and verified. Reviewer reported no remaining concrete security finding before this handoff.

## Files Changed

Migration `supabase/migrations/20260922000400_people_text_directory.sql`; pgTAP, real HTTP and overlapping-session tests under `supabase/tests/`; test-runner registration; scoped AUTHORIZATION, DATA_MODEL and Supabase/test README updates. No shared queue, CURRENT_STATE, CHANGELOG, ADR or parent contract edit.

## Behavior / Architecture Impact

Browse returns at most 24 cards with account ID, real name, campus name, graduation year and major; known-ID detail adds bio, interests and down-to-do. Both require live ready same-campus authority, gate enabled, subject opt-in and no block in either direction. Missing, blocked, opted-out, other-campus and unready detail all return zero rows. No peer email, photo path, Storage object or excluded profile field is returned. Raw profile/Storage grants remain owner-only. Search uses literal case-insensitive name substring, exact graduation year and case-insensitive exact major; normalized-name/account-ID cursor is bounded and checked. Raw search and major inputs are length-capped before trimming.

Active owners can inspect their preference and opt out despite gate/readiness loss. Opt-in requires gate plus readiness. A ready caller can block a visible same-campus peer; both block directions suppress People. Pair advisory locks and post-wait checks prevent two raced mutual blocks from both committing. While the gate is on, an active owner can list only outbound IDs and unblock that direction after readiness loss. No client grants exist on the private gate/preference/block tables; RLS is enabled with no client policies. People RPCs reject stronger isolation. Existing Hangout policy is untouched.

## Tests / Verification

- Two clean local Supabase resets on the final migration, followed by streamed pgTAP runs for all five files because Lima's existing read-only mount could not mount this isolated worktree. Initial final-migration passes: 61 People assertions and 226 existing assertions each, with no `not ok`; after review additions, the People file reran with 63 passing assertions. Warning-level lint of `public,private` reported no schema errors.
- Real local Auth/Storage/PostgREST suite passed, including People gate/opt-in, fixed projections, table/embedding/DML denial, anon denial, either-direction block suppression, opt-out, changed-email revocation and gate loss. Existing profile/photo/Hangout HTTP coverage in the same suite passed. Profile, Hangout and People overlapping-session suites all passed; People proves mutual-block serialization, gate loss after lock wait and stronger-isolation denial. Calendar and other workspace unit tests: 17 passed.
- Direct Prettier check, ESLint (`--max-warnings=0`), TypeScript checks for all packages and both apps, and both web/admin Next production builds with `--webpack` passed. The default `pnpm check` entrypoint could not run: its dependency bootstrap tried to purge temporary symlinked dependency directories and aborted without TTY while npm registry was unavailable. Turbopack's default build also rejected dependencies symlinked outside the isolated filesystem root; the webpack builds passed. These environment artifacts were removed before commit.
- The final database query showed `people_gate=false`, `hangout_gate=false`, zero People preference/block rows and zero synthetic Auth fixture users. Local Supabase and Lima services were stopped. No hosted target was used.

## Decisions

Implemented only Accepted ADR-0013 and the narrower TASK-011A contract. The own-preference read is available to active owners with the gate off so they can inspect their privacy state; opt-in and all peer/block operations remain gate-bound. This keeps gate-off opt-out usable.

## Known Limitations

This is a local text-only backend. No client routes, peer photos, friendship, DM, global block separation or hosted enablement exist. The CLI's `supabase test db` mount cannot access this isolated worktree under the reused Lima VM; streaming identical SQL files to local Postgres provided the pgTAP evidence above. The pre-existing Next dev-helper `/signin` and CI action-manifest issues were outside scope; web action E2E was not claimed. The app-stage no-store behavior belongs to TASK-011B.

## Follow-up Tasks

Coordinator reviews/integrates TASK-011A and updates shared status records, then dispatches TASK-011B under the accepted parent sequence. Deferred photo/global block/messaging work remains separate.

## Documentation Updated

`docs/engineering/AUTHORIZATION.md`, `docs/engineering/DATA_MODEL.md`, `supabase/README.md`, `supabase/tests/README.md` and this handoff.

## Ready for Next Task?

No. The backend implementation is ready for coordinator review, but TASK-011A is not complete until reviewed main integration and remote main verification. After integration, TASK-011B may start under the parent contract.

Remote receipt at handoff creation: `git ls-remote origin refs/heads/agent/TASK-011A-people-backend refs/heads/main` returned task branch `063fbe4c44f010cec5a0a79cb8455aa629d54fd5` and main `9b8e95f6a2b2d5d5ebeeeefa319b9d591bc2e8c4`. The final handoff-only branch tip will be verified after publication and sent to the coordinator; its SHA cannot be embedded in its own commit.
