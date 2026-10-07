# TASK-028P1 DATA handoff — optional owner hometown

Status: source ready for independent review; parent task remains active. Branch `agent/TASK-028P1-profile-corrections`.

## Outcome

- Added nullable `public.profiles.hometown` under Accepted ADR-0037. Its database check requires trimmed, nonempty text of at most 100 Unicode characters; only `authenticated` receives the new column UPDATE grant. Existing owner-only RLS, active-account checks and revision trigger are unchanged. No peer projection, grant, readiness requirement or inferred value was added.
- Added `OwnerProfile.hometown` and form normalization. A submitted blank clears to null; a 101-character value fails before write. A form opened before the field exists omits it from the update, avoiding accidental clearing. The existing owner profile `select("*")` and `saveProfile` spread/revision compare-and-swap already carry the field, so those server files needed no edit.
- Added unit, actual-role pgTAP, and server-action checks for Unicode boundaries, clearing, owner/peer/anonymous/banned access, readiness and stale revision preservation.

## Evidence

- `node --test tests/profile.test.mjs`: 3 passed.
- `pnpm --filter @pals/validation typecheck`, `pnpm --filter @pals/types typecheck`, and `pnpm --filter @pals/web typecheck`: passed.
- Targeted ESLint, Prettier and `git diff --check`: passed.
- Verified the exact local `supabase_db_pals-task028-disposable` container maps host port 55422. Ran the migration body and `owner_hometown.test.sql` together in one outer transaction ending in ROLLBACK: 23/23 pgTAP assertions passed. Follow-up read confirmed neither the column nor synthetic users persisted. The original `pals-local` stack was untouched.

## Remaining gates

- Independent source/security review before UI wiring. After acceptance, coordinator applies this same committed migration to the named disposable stack for final server-action/browser checks. `profile-action-checks.mjs` was extended but not run against an app because the migration intentionally remains unpersisted.
- Coordinator owns shared docs, queue records, publication and parent integration; this lane did not push or perform hosted operations.
