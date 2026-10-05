# TASK-027D — Hangout stale-conflict retry correction

Status: In progress
Date: 2026-10-05
Parent: TASK-027

## Contract

Diagnose and correct the actual Auth/web stale Hangout edit failure: the existing revision conflict raises SQLSTATE 40001, repeatedly reaches the database and eventually returns an uncertain interrupted response instead of the expected conflict. Preserve the full failing assertion from TASK-027C. Determine the retry owner from installed code/primary documentation before changing behavior. Use a bounded existing-pattern correction; do not weaken revision checks, RLS, ready-subject guards, blocks, revocation, audit or transport-uncertainty handling. A committed migration is required if changing a function; never edit applied historical migrations. Cover related Hangout management paths using the same revision check and their error mapping. No new provider, broad dependency upgrade, or hosted change.

## Dependencies and evidence

Start from latest canonical main documentation and the published unfinished TASK-027 baseline (agent/TASK-027-open-unc-mvp at ccc336a842ff7c229c0838e461bce97c1c705e68), then apply the reviewed TASK-027C test corrections when available. These are preparation dependencies, not completed main integration. C's real Auth/Storage passes 1/1. Full Auth/web remains failing 3/4 on stale web edit; a diagnostic bypass of that one action passed 4/4 and was restored, proving no complete pass. C's response-hold privacy test remains mandatory. Coordinate exclusive local database testing with C; do not repeat uncontrolled retry floods.

## Acceptance

- Explain exact retry cause and choose a non-retrying business-conflict response while retaining real transaction error handling.
- A stale HTTP/action edit promptly returns conflict, leaves data/revision unchanged, and uses bounded attempts; current-revision edits and relevant management operations still work.
- Actual database permissions/revision-denial tests and the full Auth/web lifecycle pass without skipped stale assertions or weakened in-flight revocation coverage.
- Relevant local lint/type/unit/build checks pass. Record failures honestly.
- Write handoff, commit/push task branch, verify remote SHA and stop for independent review. Do not update coordinator-owned queues or mark parent complete. No hosted provisioning, gates, deployment or credentials.
