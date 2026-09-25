# TASK-020A exact-tip security review

Reviewed remote task tip: `06cae8d1472170eec99641d46181e3fa9b4d882c`
Reviewer: fresh GPT-6 Sol medium agent; read-only, separate from implementer
Result: clear, no remaining P0/P1/P2

The first review found no source defect but held integration for two P2 verification gaps: no moderation disable versus join race and no host-size checks after leave/removal. The corrected exact tip added host `true → false → true → false` assertions across leave/rejoin/removal and observed-lock moderation races in both commit orders, including post-commit participant/signal/disable checks. The migration and its security-definer code did not change between reviewed tips. Fresh exact-tip review cleared the corrected tests and handoff.

The handoff records 64 focused SQL assertions, all 17 SQL fixtures, real Auth/PostgREST, notification HTTP, observed-lock checks, prior-schema upgrade, lint/workspace checks and cleanup with zero fixtures and ten gates false. The local Supabase SQL wrapper could not mount the temporary worktree in Lima; the same fixtures were streamed directly into disposable Postgres with error and TAP checks. No hosted operation or operator consumer was reviewed.
