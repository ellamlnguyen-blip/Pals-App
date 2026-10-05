# TASK-027K — Reconcile legacy moderation HTTP tests with live MFA

Status: Ready for isolated implementation
Parent: TASK-027
Date: 2026-10-05

Starting from the reviewed combined TASK-027G/H source, update only directly affected legacy local HTTP moderation fixtures to use genuine Supabase Auth TOTP enrollment/challenge/verification for operator positive paths. Preserve all conflict, audit, sanction, Hangout disable, restriction, and negative assertions. No forged positive JWTs, direct Auth factor/session SQL positive fixtures, source-policy relaxation, or hosted operations.

Run the focused `moderation-http.integration.mjs` and `hangout-disable-http.integration.mjs` suites against the exclusive disposable local stack, plus any directly affected moderation concurrency tests. Restore local gates and remove synthetic accounts/rows under the existing fixture cleanup. Verify no service-key use in caller HTTP tests. Write handoff with exact pass/fail counts and limits; request fresh review before parent integration.
