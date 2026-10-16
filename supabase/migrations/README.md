# Migrations

Ordered immutable SQL migrations are the schema source of truth. TASK-002's identity foundation implements the accepted conceptual model without an automatic eligibility policy. New migrations must use explicit grants, RLS, constraints and safe function search paths. After changing an unapplied local migration, run `pnpm db:verify`; do not rewrite a migration already applied to shared staging/production.

TASK-037 retires client poll execution through an additive grant migration while retaining private poll records. The pre-retirement `chat_polls_033c.historical.sql` fixture documents behavior before retirement and is excluded from current `*.test.sql` runs; `chat_polls_retired_037.test.sql` verifies the current boundary. The pre-retirement concurrency script is likewise historical and should only be run against its original migration state.
