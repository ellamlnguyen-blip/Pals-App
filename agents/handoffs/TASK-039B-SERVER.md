# TASK-039B server handoff — friendship-only DMs

Status: bounded server candidate ready for fresh security review; TASK-039B and TASK-039 remain incomplete pending review, TASK-039C, accepted-environment persistence, predecessor sign-off, and application-main integration.

## Source and decision

- Branch: `agent/TASK-039B-friendship-dm-server` in `/private/tmp/pals-task039b-server`.
- Baseline: `a4567e8652de022cfd72d7dcf0298a8d3a6b9f02`, including reviewed TASK-039A source `98327d14d6b35f333ed4afe64ac663427ca0bd5c`.
- Authority: Accepted ADR-0045, explicitly accepted by Ella 2026-10-16 for disposable-local implementation and private retirement of request-only/nonfriend generations. Earlier ADR-0042 request consent no longer grants DM access.
- Migration: `supabase/migrations/20261016000200_friendship_only_dm.sql`; SHA-256 before commit `babae80f981c6cceeea0ab156f3764ee03b56e8b03c6d322d65c8e5d22fdde2c`.

## Implementation

The additive migration adds neutral `retired` pair state. Its single transaction takes the shared social lock, retires pending and accepted nonfriend generations, and preserves messages, retries, notifications, and suppression rows. Current accepted-friend generations remain active. It changes consent to require current accepted friendship for every generation-bound read/send/retry. Friend first-send creates a new accepted generation and never converts a pending request. It replaces the old create/independent-consent RPCs with denied stubs and revokes their authenticated grants; `transition_dm` permits only current-friend `close`, without new suppression. Unfriend terminalizes the active generation under the existing shared lock; block retains its stronger terminal behavior.

Status, inbox, thread, consent-state, combined chat attention, notification list, and unread notification attention now require current friendship and the existing eligibility/gates. Pending requests never project. Old request/accept notifications remain retained but project neutral `Unavailable`; old request notifications cannot produce an unread attention dot. Normal current-friend message notifications remain. No web/API/UI, Hangout, hosted gate, or `main` application code changed.

## Disposable local evidence

- Target database: `pals_task039b` inside `supabase_db_pals-task029-disposable` (Postgres 17.6.1.167). This is a separately named, task-only database. The running 3035 preview, `supabase_db_pals-local`, and source database `postgres` in the TASK-029 container were not mutated. Initial schema was cloned schema-only from the named TASK-029 disposable source; `pg_cron` extension/scheduler tables were omitted because the worker is configured for its source database. The exact TASK-039B migration was applied by `psql` to `pals_task039b`, not through Supabase's migration ledger. Its `supabase_migrations.schema_migrations` table is empty from the schema-only clone, so this evidence is **SQL application**, not migration-tool ledger verification.
- Exact migration applied successfully, including `CREATE FUNCTION`, `ALTER TABLE`, and `COMMIT`. The migration was re-applied during source tightening and after synthetic legacy seeding; every application succeeded. Legacy fixture verified two nonfriend/pending generations retired, one then-current friend generation preserved, three messages and three retries retained, two old notification items retained, and zero new suppression rows. After the subsequent race test, the database contains four `retired` synthetic pairs, five messages, five retries, and two DM notifications; no active DM pair remains. This state is intentional disposable evidence, not hosted data.
- `supabase/tests/database/friendship_only_dm.test.sql`: passed with `ON_ERROR_STOP=1`, full rollback. Authenticated friend first-send/read; declined/nonfriend denial; old request/accept/action denial; inbox/status/attention; friend message notification; neutral closed notification and unread attention; close/restart; unfriend/refriend fresh generation and old retry denial; retained directional suppression; People opt-out, friendship gate, live Auth readiness and DM gate denial; safety block; private table and retired RPC grants.
- `supabase/tests/database/friendship_only_dm_retirement.setup.sql` → exact migration → `friendship_only_dm_retirement.verify.sql`: passed on the isolated DB. `supabase/tests/database/friendship_only_dm_legacy_notifications.test.sql`: passed for neutral retired request and no unread attention dot.
- `supabase/tests/friendship-only-dm-concurrency.integration.mjs`: passed both two-session serializations: teardown commits before send (send denied, pair retired, post-commit read empty) and send commits before teardown (message persisted privately, pair retired, exact retry denied).
- `git diff --check`: passed. No service-role client path or private raw-table grant was added.

## Review and remaining gates

A fresh security reviewer should inspect the exact committed/pushed tip, especially the retired-state migration under locks, direct RPC grants, list/attention and notification projections, and race tests. The test database is schema-only cloned with local scheduler omitted; a full clean Supabase migration-stack test is still required before accepted-environment persistence. TASK-039C must remove old web/API request and allow controls and verify actual two-account browser flows. The predecessor TASK-032/033/034/035/036/037/038 application-main and release gates remain open. Hosted migration/gate enablement and `main` integration are not authorized by this handoff.

Task branch commit SHA and independently verified remote SHA: pending publication below.
