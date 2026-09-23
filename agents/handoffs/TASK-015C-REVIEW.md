# TASK-015C independent security/design review

Date: 2026-09-23
Reviewed branch: `agent/TASK-015C-notifications-ui`
Final exact tip, coordinator live remote verified: `29abd1bb4174fb4f42bf06b3f47929f01c48f462`
Published contract baseline: `3ce5f8c88144fe8ca0f7867b55ab22361f468ca5`

## Review sequence and conclusion

The first pushed tip `09c402ae1bc3c45419e21cf904cb9bd052162f1b` had no blocking code finding, but its handoff lacked two explicitly required rendered checks: preference-save failure and uncertain mark-read. Integration waited. The implementation agent ran disposable local POST fault scenarios and amended only the handoff. In the coordinator's in-app browser, a pre-write preference 503 masked inbox and controls, asked for reload, and left the Messages preference on after reload. A real mark-read RPC followed by a 503 masked content and asked for reload without claiming success; reload showed the item Read. The test-only route was restored byte-for-byte before commit.

A fresh GPT-6 Sol medium reviewer inspected the final exact tip, confirmed that only the handoff changed since the first review, the committed route matches its original hash, and no test fault remains. It found no security or design blocker: local/loopback and current-owner API checks, private no-store responses, bounded inputs, source-neutral and allowlisted destinations, transition revision masking, and limited navigation scope remain intact. It checked `git diff --check` and the clean task worktree. The reviewer did not rerun runtime or browser tests; the implementation handoff and coordinator observations record those checks. The reviewer's direct remote lookup failed due DNS in its worktree; the coordinator independently verified the live task ref.

## Boundary

The accepted outcome is disposable-local inbox/preferences UI on the reviewed A/B backend only. All local gates are default off after testing, fixtures are removed and services stopped. No hosted, Realtime, push/email, global block/reporting, or co-host policy is authorized. An instrumented real-browser response crossing an account switch was not observed; revision/actor checks and overlapping-token tests cover that path.
