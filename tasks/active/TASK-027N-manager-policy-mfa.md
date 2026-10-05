# TASK-027N — Protect caller policy management with live MFA

Status: Reviewed guard integrated locally; TASK-027Q/R fixture follow-ups block full-suite completion and hosted rollout
Parent: TASK-027
Date: 2026-10-05

Start from reviewed TASK-027G/H/I/J source. Implement accepted ADR-0034 in a committed migration after TASK-027J. Tighten the existing manager authorization guard for `set_pilot_policy` and `set_pilot_account_admission`; preserve the RPC ABI, audit and role semantics. Do not add a SQL policy substitute, broaden source gates or affect normal students.

## Acceptance criteria

1. A genuine active manager's AAL1 token cannot call either management RPC; a live owned verified TOTP AAL2 session can use valid CAS inputs and produces the existing immutable audit. Do not add per-action UNC eligibility rechecks rejected in ADR-0033.
2. Cached tokens after factor removal, session downgrade/deletion/expiry, manager revocation or account suspension are denied, including after lock waits. Stale requests do not partially mutate.
3. Clean migration replay, actual-role SQL, genuine local Auth HTTP, concurrency, schema lint and relevant existing policy tests pass. No forged positive HTTP JWTs.
4. Fresh security review and handoff identify exact evidence and retained emergency-shutdown limitation. Parent owns hosted application, caller-session UI, release and rollback.
