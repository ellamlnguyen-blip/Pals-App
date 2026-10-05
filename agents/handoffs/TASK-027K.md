# TASK-027K — Legacy moderation HTTP MFA fixtures

Date: 2026-10-05
Branch: `agent/TASK-027K-legacy-mfa-fixtures`
Status: HTTP fixture implementation verified locally; fresh review and parent integration pending. A separate legacy concurrency test remains a release blocker.

## Outcome

The existing moderation and disabled Hangout HTTP suites now enroll a local Auth TOTP factor, issue a challenge, verify its code, and use Auth's resulting AAL2 access token for operator positive paths. Each suite also asserts that its operator's original AAL1 token is denied after the moderation gate opens. All existing conflict, audit, sanction, disabled Hangout, source masking, stale-revision and no-role assertions remain. The caller HTTP helper uses the local publishable/anon key and each caller's own bearer token; it does not use a service-role key or forge a positive JWT.

## Evidence

- `moderation-http.integration.mjs`: 1 test passed, 0 failed, using genuine Auth TOTP for both operator accounts.
- `hangout-disable-http.integration.mjs`: 1 test passed, 0 failed, using genuine Auth TOTP for the operator account. `WEB_TEST_ORIGIN` was unset, so optional rendered web-page checks were not exercised; the full HTTP source/RPC suite ran.
- `moderation-concurrency.integration.mjs`: 0 passed, 1 failed at the first `gate_first` race. Its old SQL-only simulated moderator claims omit AAL2 and a live Auth session/factor, so the new shared guard denies before the expected gate lock wait. This assertion is preserved unchanged and is a release blocker; it is not counted as passing verification.
- Node syntax checks and `git diff --check` passed. The disposable local stack was reset after testing; moderation and availability gates are false, with zero Auth users, platform roles and moderation audit rows.

## Bounded follow-up contract: genuine Auth-backed moderation concurrency

Replace only the positive moderator setup in `moderation-concurrency.integration.mjs` with real local Auth TOTP enrollment, challenge and verification for its two operators. Carry the signed AAL2 session claims from those real Auth tokens into the race transactions while retaining the current lock-order, denial, audit, conflict and cleanup assertions. Do not forge positive JWTs, insert positive Auth factors or sessions by SQL, weaken `private.moderation_actor`, or use a service-role key for caller requests. Reset the disposable database, run this focused race suite, prove both successful and denied wait orders, verify closed gates/fixture cleanup, and get independent security review before parent integration. Keep this as a separate task because its dynamic Auth identities and parallel SQL race harness are outside TASK-027K's two HTTP fixture edits.

## Limits

No hosted operation, branch push or main integration was performed. TASK-027 parent must review the implementation and track the concurrency follow-up before making any release claim.
