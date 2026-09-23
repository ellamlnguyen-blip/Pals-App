# TASK-013A exact-tip security review

Date: 2026-09-23
Reviewed task branch: `agent/TASK-013A-hangout-chat-backend`
Reviewed and independently remote-verified tip: `94219cd682449cf46a90035d001804ac92f1a2d1`
Implementation baseline: `cb81a094d86d2e67d5d80043942c855cd8141780`
Coordinator merge: `091dbfa` on `agent/TASK-013-planning`; canonical main integration pending publication receipt.

## Verdict
A fresh independent GPT-6 Sol medium read-only security review found no blocking authorization/privacy issue at the exact pushed tip. It inspected private table RLS/grants, fixed-search-path caller-bound functions, Hangout-row and readiness/gate locks, post-lock recheck, empty-page read guard, author projection, idempotency, pagination and stronger-isolation denial. The reviewer did not restart the stopped stack or independently rerun runtime tests. The implementer's local test and cleanup evidence is in `agents/handoffs/TASK-013A.md`.

## Evidence and limits
The implementer ran `pnpm check`, two clean local resets, every existing pgTAP SQL file plus chat assertions, schema lint, real Auth/PostgREST and deterministic concurrency checks. Chat assertions passed 69 on each reset and the expanded final 72 after the second. `pnpm db:verify` itself could not bind-mount the isolated `/private/tmp` test directory into the Lima VM; its component SQL/reset/lint checks ran directly. No wrapper-green, hosted CI, Realtime or UI claim. Both database gates were restored false, fixtures cleared and local services stopped. The handoff first recorded implementation push `576b106`; final handoff-only tip `94219cd682449cf46a90035d001804ac92f1a2d1` was verified by the coordinator and reviewed exactly.

## Decision
The reviewed backend is eligible for canonical main integration. TASK-013B waits for remote-verified main, its own bounded contract and fresh agent/review. Global messaging block, reporting/moderation, Realtime and hosted gates remain open.
