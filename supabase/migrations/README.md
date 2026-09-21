# Migrations

Ordered immutable SQL migrations are the schema source of truth. TASK-002's identity foundation implements the accepted conceptual model without an automatic eligibility policy. New migrations must use explicit grants, RLS, constraints and safe function search paths. After changing an unapplied local migration, run `pnpm db:verify`; do not rewrite a migration already applied to shared staging/production.
