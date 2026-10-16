# TASK-039D — Migrated friendship-only chat browser verification

Status: ready for a fresh bounded disposable-local verification agent after this contract is published on canonical main. Parent TASK-039 and source TASK-039B/C remain incomplete. Baseline is the latest verified canonical main plus exact reviewed web/server task source `8ceca20fdcc017e9aad4ede1bb000846744824f4`; verify the branch and migration hash before runtime work.

## Scope

Establish a separately named, task-owned disposable local Supabase Auth/PostgREST/Postgres preview and run the exact committed friendship-only migration through its normal ledger. Use only synthetic verified-campus accounts and fixtures. Run the reviewed web source against that target on a separate loopback port. Do not mutate, reset, stop or reconfigure the existing `pals-local`, TASK-028, TASK-029 or user-open 3035 preview resources. If an isolated stack cannot be established with cached trusted dependencies, stop before resource mutation and record the concrete blocker.

Verify two actual authenticated accounts and rendered 811px/375px states: accepted friends can start and read DMs; pending, declined and nonfriends cannot; unfriend retires the generation and masks a stale URL; refriend starts a new generation; block and People opt-out deny access; old request notifications and old direct URLs reveal no identity or message body. Check report/block affordances with exact target confirmation, responsive overflow, composer accessible name, loading/empty/error states and Hangout chat regression. Capture screenshots and failure evidence. Preserve test data only inside the named disposable target; cleanly stop its owned services after verification and record cleanup.

## Gates and handoff

Do not change application source, shared preview data, hosted services, or canonical main in this verification task. A found source defect becomes a bounded correction on TASK-039C or a separately published contract. Do not claim a browser pass from source tests or SQL-only fixtures. Record exact target ownership, migration ledger, fixtures, browser viewports, route outcomes, screenshots, commands at outcome level, cleanup, and a handoff on the task branch. Commit, push and independently verify its remote SHA. Parent TASK-039 completion and application-main integration remain behind predecessor release gates and unresolved TASK-039B edge-case tests.
