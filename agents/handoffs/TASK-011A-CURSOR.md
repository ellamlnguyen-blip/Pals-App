# Handoff — TASK-011A cursor correction

Date: 2026-09-22
Agent: bounded backend correction agent
Branch/worktree: `agent/TASK-011A-cursor-correction` / `/private/tmp/pals-task011a-cursor-correction`
Starting main: `487b744db361559dee8b63c07297ca6bf2d57842`
Canonical main observed on origin before publication: `05ba70724539903add2fa8e3c20902f9fa5123ad`
Task branch remote tip: verify after final handoff commit; receipt sent to coordinator separately.
Integrated main commit: pending coordinator review and integration.

## Outcome

The additive local migration replaces only `public.browse_people`. A consumer now passes the last returned card's exact raw `real_name` and `account_id`; PostgreSQL validates the raw name before computing `lower(btrim(name)) COLLATE "C"` for the existing sort comparison. The signature, five card fields, 24-row limit, literal search, filters, live gate/readiness/campus/block checks, stronger-isolation denial and grants remain unchanged. This fixes U+00A0 padding, which JavaScript `trim()` treats differently from PostgreSQL `btrim()`.

The original applied migration was not changed. No UI, shared queue, ADR, hosted service, photo or Hangout authorization change was made.

## Files changed

- `supabase/migrations/20260922000500_people_raw_name_cursor.sql`
- `supabase/tests/database/people_text_directory.test.sql`
- `supabase/tests/people-http-checks.mjs`
- `supabase/README.md` and `supabase/tests/README.md`
- This handoff

## Verification

- Two clean disposable-local database resets applied the new migration. After each reset, all five actual-role pgTAP files passed: Hangout 114, identity 53, onboarding 22, People 72 and profile 37 assertions (298 per reset). Tests were streamed into local Postgres because the reused Lima VM cannot mount this isolated checkout for `supabase test db`.
- The People test enumerates 28 authorized same-campus IDs across a 24-row first page and four-row second page. U+00A0-padded same-name IDs cross the boundary at ID `...0028`; both pages match database order exactly with no duplicate. Opted-out, blocked, unready and cross-campus peers remain absent. Malformed, blank and overlong cursors are rejected. The existing direct-detail, owner-only raw profile and photo restrictions also pass.
- Real local Auth/Storage/PostgREST HTTP integration passed, including a direct authenticated RPC using the exact U+00A0-padded `real_name` returned by the card. Existing profile/photo/Hangout HTTP checks in that suite passed. Profile, Hangout and People overlapping-session suites passed, including People pair serialization, post-wait gate revocation and stronger-isolation denial.
- Warning-level `public,private` schema lint found no errors. Catalog inspection showed `browse_people` remains `SECURITY DEFINER`, volatile, with empty search path, exactly five output columns and EXECUTE only for `postgres` and `authenticated`.
- Prettier and zero-warning ESLint passed for the changed JavaScript file; `git diff --check` passed. Direct `tsc --noEmit` passed for all six packages and both apps. Web and admin Next production builds passed with webpack.
- The `pnpm typecheck` wrapper could not run because its dependency bootstrap tried to purge temporary symlinked dependency directories without a TTY. Direct TypeScript checks provided the stated type evidence. No green CI claim is made.

## Local state and remaining gates

After the second reset and rolled-back SQL suites, both People and Hangout gates were false; Auth users, People preferences and blocks were zero. The UI task then took over the shared disposable local stack for its runtime checks. Per coordinator direction, that task owns final gate/fixture cleanup and stopping Supabase/Lima; this handoff does not claim services are stopped.

Fresh independent security review, accepted main integration, main remote verification and TASK-011B consumer completion remain coordinator gates. TASK-011A cursor correction is not a finished parent task at this handoff.
