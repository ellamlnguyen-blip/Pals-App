# TASK-027G — Sole Ella admin provisioning preparation

Date: 2026-10-05  
Branch: `agent/TASK-027G-sole-admin`  
Status: Implementation and local verification complete; independent security review and canonical integration pending.  
Reviewed source inputs: TASK-027B `8c20de9b1240e2d8e7f87f51c53a645ecea556d4`, TASK-027 parent `360d8e8db0b32c9fb98fc03e087eddb47cd367a9`, TASK-027H `bc634bdca667c98a1fe171d3affbd5ad1567ee11`.  
Latest canonical `main` independently read from origin before handoff: `74e7fa0ffb3b6c54e617dca93330a75df8c274f8`.

## Outcome

Added distinct staging-only `grant_admin` and `revoke_admin` operations for the hardcoded Ella UUID and current confirmed UNC email. The existing role table allows one row per user; the grant requires her current `moderator` row and changes it to `admin`. Existing moderation RPCs accept `admin`, so this provides both requested authorities. Revoke requires her current `admin` row and restores `moderator`, including after account suspension or email loss. A separate audited `revoke_moderator` then removes operator authority. Its existing expected-role check denies removal while the row is `admin`. Other subjects and roles are untouched.

The operations retain the TASK-027B project/commit/CLI checks, social and moderation lock order, live Auth/account/UNC grant checks, request UUID, exact payload retry, expected current role, atomic immutable audit, and read-only reconciliation on an uncertain response. Operational SQL remains outside migration replay. Migration `20261005000400` only expands the audit operation constraint; it grants no role. The runner now requires the actual merged `001` through `004` migration lane with `004` latest. No hosted query, grant, gate change, or policy substitute was run.

## Verification

- Reset the named disposable local Supabase stack from the merged branch. Ordinary replay applied migrations `20261005000100`, `00200`, `00300`, and `00400` in order; the role table remained empty.
- Ran `scripts/staging-control/test-local.mjs` against the local Postgres container as one transaction ending in `ROLLBACK`. It passed admin grant denial for suspended Ella, moderator-to-admin grant, exact retry, changed-payload and stale-state denials, moderator revoke denial while admin, admin-to-moderator rollback after account suspension and email loss, separate moderator and manager revocations, audit counts, and direct audit-read denial under actual `anon`, `authenticated`, and `service_role` roles.
- A separate local read after rollback returned latest migration `20261005000400`, zero control audit rows, and zero platform-role rows.
- Clean-checkout runner unit tests passed 6/6, including fixed project/subject binding, SQL escaping, migration preflight, wrong-project/missing-migration stop, CLI flag shape, and malformed receipt denial. `git diff --check` passed.

## Remaining gates

Independent security review must examine this merged exact branch, including the admin update and rollback SQL, migration `004`, and full `001`–`004` preflight. The coordinator owns integration and main status records. Before any hosted operation, separately verify live staging migration history, exact Ella Auth/account/UNC evidence, current role and expected state, CLI project identity, reviewed checkout SHA, operator/reviewer record, and the TASK-027 release sequence. The shared Management API database login is `postgres`, not proof of the human operator. Future migrations require a reviewed preflight update. The parent TASK-027 remains incomplete.
