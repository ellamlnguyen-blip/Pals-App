# TASK-028P2 DATA handoff — 2026-10-06

Branch `agent/TASK-028P2-rich-profiles`, baseline `9913df3`. Scope is migration `20261006000200`, shared rich RPC types and focused tests only. No gateway, resolver, UI, shared queue or hosted work was changed. Root independently reviewed the migration and applied only reviewed `002` to the named disposable DB with migration history. The DATA verification follow-up below is complete; parent integration remains gated.

## Outcome

- Added a default-off private rich feature gate and sparse consent row with independent CAS revision. Neither private table has anon/authenticated grants; existing People opt-ins are not backfilled.
- Added caller-bound rich get/set RPCs. Active owners can opt out with gates or eligibility lost; opt-in requires current People consent, text publishability, live exact-UNC eligibility, People capability and both gates. Identical desired state is a revision-preserving no-op; stale revisions fail.
- Replaced the People writer lock path with social → shared pilot evidence → policy/capability → People/rich gates → account → live Auth/membership/campus → People/rich preferences. People-off clears rich consent in the same transaction and advances its revision only when rich was on. People re-opt-in does not restore rich.
- Added separate rich detail RPC whose one `RETURN QUERY` statement checks current viewer/subject Auth, account, membership, campus, both People consents, subject rich consent, text publishability, pilot/capability/gates and bilateral blocks. Its allowlist contains existing People text, hometown, prompts, live verified boolean, profile revision and opaque selected photo slots. It returns no object path or raw profile grant.

## Evidence

- Exact test target observed: `supabase_db_pals-task028-disposable` mapped to host DB port `55422`; API stack mapped to `55421`.
- Migration and `rich_peer_profiles.test.sql` were loaded together inside one outer transaction on that database, with their own `begin`/`commit` wrappers stripped for the test run; **outer transaction rolled back**. All 55 pgtap assertions passed, including raw grants/RLS, default-off, CAS, both gate/policy closures, People clearing, no-op, Auth changes, blocks, sanctions, cross-campus, missing photo and incomplete text.
- `pnpm --filter @pals/types typecheck`, `node --check` for the HTTP test, Prettier on changed TS/JS, and `git diff --check` passed.
- After reviewed local application, the original read-only Auth HTTP default-off probe passed with genuine Maya/Jordan sessions. The 55 rollback-only SQL assertions passed again against applied `002`.
- A separate genuine Auth HTTP run created two synthetic UNC users, proved default-off, positive rich detail, anon/forged/self/raw denial, stale/no-op CAS, rich gate revocation, gate-off opt-out, Auth unconfirmation revocation and unconfirmed opt-out. It deleted both users and restored the captured gate values.
- A dedicated synthetic-owner concurrency run observed actual advisory waits in **both** People-off/rich-on orders and **both** pilot-close/rich-on orders. It also observed both People-off/pilot-management lock orders and a `transactionid` wait in the direct profile-row-first/rich-on order; all seven committed outcomes matched the contract, with no deadlock. The pilot test invokes the actual `private.pilot_lock_management` lock graph and changes policy in the same transaction, without creating an operator audit fixture.
- A final exact-DB query found rich gate `false`, rich preference row count `0`, and synthetic Auth user count `0`. Existing Maya/Jordan/Reese fixtures were never modified by these tests.

## Remaining gates and limits

- The migration was not changed by this follow-up. Root's independent review and exact local application are recorded in its coordinator handoff; no hosted migration occurred.
- The live Auth test uses test-owned committed users because separate API connections cannot see uncommitted fixtures; it deletes those users. The race test likewise commits only test-owned state and restores policy/gates. Its management race exercises the production lock helper rather than creating a privileged manager account or audit event.
- Photo gateway/resolver, hostile image and browser checks belong to the separate lanes. No hosted gate or credential was enabled.
