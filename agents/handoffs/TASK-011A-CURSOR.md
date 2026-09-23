# Handoff — TASK-011A cursor correction

Date: 2026-09-23
Agent: bounded backend correction agent
Branch/worktree: `agent/TASK-011A-cursor-correction` / `/private/tmp/pals-task011a-cursor-correction`
Revised-contract main merged before this correction: `3210d3cc490433fe9659ab9f3452a509b2a0ef81`
Prior reviewed branch tip: `de4a0931702517a5195be004e24e7f30fbd7a248`
Final task branch remote tip: verify after the handoff commit; receipt sent to coordinator separately.
Integrated main commit: pending fresh security review and coordinator integration.

## Outcome

An exact-commit reviewer found that the first raw-name cursor correction still rejected a valid profile name such as `repeat(' ',100)||'A'`: the profile constraint measures `btrim(real_name)`, while the RPC capped the returned raw name at 100 characters. The new additive local migration `20260922000600_people_id_cursor.sql` replaces only `public.browse_people`. A consumer now sends only the last card's `account_id` as `p_after_id`; `p_after_name` must be null. The database looks up that row under the current viewer's same-campus readiness, opt-in, bilateral block and active search/year/major filters. If it is unavailable or filter-mismatched, the RPC raises the same `42501` unavailable error without returning subject data. A successful lookup supplies the real name for the existing `lower(btrim(name)) COLLATE "C", account_id` comparison.

The signature, five card fields, 24-row limit, literal search, filters, gate, stronger-isolation denial and grants remain unchanged. The previously applied migrations were preserved. No UI, shared queue, ADR, hosted service, photo or Hangout authorization change was made.

## Files changed in this correction

- `supabase/migrations/20260922000600_people_id_cursor.sql`
- `supabase/tests/database/people_text_directory.test.sql`
- `supabase/tests/people-http-checks.mjs`
- `supabase/README.md` and `supabase/tests/README.md`
- This handoff

## Verification

- Two clean disposable-local resets applied the additive migration. After each reset, all five actual-role pgTAP files passed: Hangout 114, identity 53, onboarding 22, People 82 and profile 37 assertions (308 per reset). The tests were streamed into local Postgres because the reused Lima VM cannot mount this isolated checkout for `supabase test db`.
- The People test enumerates 28 authorized same-campus IDs over a 24-row first page and four-row second page, exactly once in database order. The boundary card has a valid 105-character raw name with 100 leading ASCII spaces and U+00A0 padding; its trimmed name is five characters. Shared-name UUID tie-breaking works. Opted-out, blocked, unready, cross-campus, nonexistent and search/year/major-mismatched cursor IDs all return the same unavailable code and message. An opt-out invalidates an old cursor ID. Name-only, name-plus-ID and overlong name cursor inputs are rejected.
- Real local Auth/Storage/PostgREST integration passed, including a direct authenticated ID-only RPC after a card with a 106-character raw name. It also checked cursor denial after committed block and opt-out. Existing profile/photo/Hangout HTTP checks passed. Profile, Hangout and People overlapping-session suites passed, including People pair serialization, post-wait gate revocation and stronger-isolation denial.
- Warning-level `public,private` schema lint found no errors. Catalog inspection showed `browse_people` remains `SECURITY DEFINER`, volatile, with empty search path, exactly five output columns and EXECUTE only for `postgres` and `authenticated`.
- JavaScript syntax, Prettier and zero-warning ESLint passed for the changed file; `git diff --check` passed. Direct `tsc --noEmit` passed for all six packages and both apps. Web and admin Next production builds passed with webpack. The `pnpm typecheck` wrapper previously failed at its temporary-symlink dependency bootstrap without a TTY; the direct checks provide type evidence. No green CI claim is made.

## Local state and remaining gates

After the second reset and rolled-back SQL suites, both People and Hangout gates were false; Auth users, People preferences and blocks were zero. The UI task then took over the shared disposable stack for final ID-cursor runtime verification. Per coordinator direction, that task owns final gate/fixture cleanup and stopping Supabase/Lima; this handoff does not claim services are stopped.

Fresh read-only security review of the final function, accepted main integration, main remote verification and TASK-011B consumer completion remain coordinator gates. TASK-011A cursor correction is not a finished parent task at this handoff.
