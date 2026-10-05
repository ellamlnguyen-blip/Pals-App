# TASK-027F — Current-policy attendance lifecycle test fixture

Status: Ready for bounded implementation
Date: 2026-10-05
Parent: TASK-027

The existing local attendance HTTP test passes. The attendance concurrency test passes gate/sanction races but fails at the first genuine leave RPC because its old fixture never enables the current availability/capability policy required by Accepted ADR-0030. Diagnose and reconcile only this local test fixture with the current accepted source policy. Read AGENTS, TASK-027, ADR-0030, authorization/attendance docs and the relevant current lifecycle source guards. Preserve real two-session lock observations, both race orders, retained evidence, owner/source privacy, and all denial assertions; do not change app/schema/authorization or skip failing checks. Confirm the exact cause before modifying tests and report any different source defect rather than weakening assertions.

Use an isolated task branch/worktree from latest published main; merge the reviewed parent baseline `5021f65d03b992171b2f6dd2a6fd8ca4d95127cc` for the actual 29-migration source lane. Modify only `supabase/tests/attendance-concurrency.integration.py`, its handoff and this contract status where appropriate. Preserve cleanup of local policy gates and disclose immutable fixtures requiring a reset. No hosted operations, provider DDL, secrets or forged positive Auth claims. The existing attendance HTTP script uses local fixture-signed JWTs, so do not claim genuine Auth/session coverage from it.

The shared disposable local stack is released to this task. Align its ignored nonsecret Storage-version metadata to v1.77.5 from the recovered parent before any official local reset/start; verify actual runtime metadata. Run a clean local reset because earlier attendance/account-enforcement runs retain immutable fixtures. Run the entire attendance concurrency script, attendance HTTP script sequentially, plus any directly affected test checks. Record exact outcomes/limits; write handoff, commit/push and verify remote SHA. Stop for independent review and coordinator integration. TASK-027 remains incomplete pending accepted hosted operator controls and staging smoke.
