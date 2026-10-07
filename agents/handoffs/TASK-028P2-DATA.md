# TASK-028P2 DATA handoff — 2026-10-06

Branch `agent/TASK-028P2-rich-profiles`, baseline `9913df3`. Scope is migration `20261006000200`, shared rich RPC types and focused tests only. No gateway, resolver, UI, shared queue or hosted work was changed. This lane remains incomplete pending independent review, local migration application and live Auth/race tests.

## Outcome

- Added a default-off private rich feature gate and sparse consent row with independent CAS revision. Neither private table has anon/authenticated grants; existing People opt-ins are not backfilled.
- Added caller-bound rich get/set RPCs. Active owners can opt out with gates or eligibility lost; opt-in requires current People consent, text publishability, live exact-UNC eligibility, People capability and both gates. Identical desired state is a revision-preserving no-op; stale revisions fail.
- Replaced the People writer lock path with social → shared pilot evidence → policy/capability → People/rich gates → account → live Auth/membership/campus → People/rich preferences. People-off clears rich consent in the same transaction and advances its revision only when rich was on. People re-opt-in does not restore rich.
- Added separate rich detail RPC whose one `RETURN QUERY` statement checks current viewer/subject Auth, account, membership, campus, both People consents, subject rich consent, text publishability, pilot/capability/gates and bilateral blocks. Its allowlist contains existing People text, hometown, prompts, live verified boolean, profile revision and opaque selected photo slots. It returns no object path or raw profile grant.

## Evidence

- Exact test target observed: `supabase_db_pals-task028-disposable` mapped to host DB port `55422`; API stack mapped to `55421`.
- Migration and `rich_peer_profiles.test.sql` were loaded together inside one outer transaction on that database, with their own `begin`/`commit` wrappers stripped for the test run; **outer transaction rolled back**. All 55 pgtap assertions passed, including raw grants/RLS, default-off, CAS, both gate/policy closures, People clearing, no-op, Auth changes, blocks, sanctions, cross-campus, missing photo and incomplete text.
- `pnpm --filter @pals/types typecheck`, `node --check` for the HTTP test, Prettier on changed TS/JS, and `git diff --check` passed.
- The read-only Auth HTTP test is written against the named disposable API and fictional fixture sessions. It must run after independent migration review and application. It does not mutate those fixtures.

## Remaining gates and limits

- The migration was **not persisted**. Independent review must clear it before applying to the named disposable stack; check migration history and exact DB identity first.
- Real HTTP invocation and committed-order People-off/rich-on and pilot-close/rich-on races cannot run against transactional, uncommitted DDL from separate connections. Run them after reviewed local application using dedicated fictional test users, restore policy/gates and remove fixtures. Cover waits and both committed orders, including account/social/evidence lock ordering.
- Photo gateway/resolver, hostile image and browser checks belong to the separate lanes. No hosted gate or credential was enabled.
