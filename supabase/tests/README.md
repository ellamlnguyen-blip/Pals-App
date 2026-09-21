# Database tests

`pnpm db:test` runs real pgTAP tests against local Supabase Postgres via `supabase test db --local`. Run after `pnpm db:reset`; the suite expects the clean reference seed and no existing accounts. All synthetic users and auxiliary campuses are inside a transaction rolled back at the end.

Tests switch to `anon` and `authenticated` roles with simulated JWT subjects. This exercises actual SQL grants, policies, constraints and database identity helpers, not mocked application authorization. Fixtures cover verified, email-unconfirmed, campus-unverified, missing membership, inactive campus, suspended, banned, admin, moderator, cross-user/campus, forged metadata, email changes, column/role escalation and null subject behavior. A service-role/superuser query is never mistaken for an RLS client check.

`pnpm db:verify` performs two clean resets with tests after each, then schema linting. Hosted CI has its own database job. SQL checks do not verify email delivery, Auth API sessions, Storage ownership, or frontend flows; those are later integration work.
