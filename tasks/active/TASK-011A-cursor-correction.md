# TASK-011A cursor correction — People pagination

Status: Contract to publish before fresh corrective backend dispatch
Date: 2026-09-22
Parent: TASK-011; decision: Accepted ADR-0013
Starting verified main: `02853e8be789f62056dd8a58fe0fcc4fa3cf4383`
Planned branch: `agent/TASK-011A-cursor-correction`

## Trigger and goal
TASK-011B review found a concrete pagination defect in the reviewed TASK-011A API. The database sorts and compares `lower(btrim(real_name)) COLLATE "C"` but the UI derives `p_after_name` with JavaScript `trim().toLowerCase()`. For an accepted name surrounded by U+00A0 nonbreaking spaces, JS produces `ada` (UTF-8 hex `616461`), while the disposable local database preserves those spaces (`c2a0616461c2a0`). The supplied cursor can skip or repeat rows. Fix the backend cursor contract so the database derives the sort key from the last returned card's raw real name, and the UI can pass that original value without guessing PostgreSQL normalization. This implements ADR-0013's already accepted bounded deterministic pagination; it introduces no new visibility policy.

## Allowed work
A new additive committed **local-only** migration may replace only `public.browse_people` with the same signature/grants/projections/gate/readiness/campus/block/filter/limit semantics. `p_after_name` should now accept the exact raw `real_name` from the last card (1–100 characters) and compute `lower(btrim(p_after_name)) COLLATE "C"` inside the RPC for comparison. Do not alter the original applied migration or broaden peer fields, grants or tables. Existing normalized caller strings may continue to work, but the documented consumer contract is raw last-row name plus ID. Review UUID tie-breaking. Reject malformed/overlong cursor and preserve literal name search. If an alternate equally narrow database-derived cursor is needed, surface it to the coordinator before changing output fields.

Add a meaningful actual-role SQL test with at least 25 opted-in ready same-campus peers, including nonbreaking-space and same-name boundary cases, proving two pages enumerate each authorized ID exactly once in database order and cannot leak hidden/blocked/opted-out subjects through the cursor. Include direct PostgREST RPC pagination with raw last-row name. Maintain stronger-isolation denial and existing profile/photo/Hangout access. Update only relevant API docs/tests plus `agents/handoffs/TASK-011A-CURSOR.md`; no UI, shared queue, ADR, hosted work or unrelated fixes.

## Verification and sequencing
Fresh GPT-6 Sol medium task agent on a branch from latest origin/main; Standard speed is the app preference and cannot be set or verified through agent dispatch. Run two clean local migration/test resets and lint, real HTTP cursor test, all relevant existing regressions and direct workspace checks; disclose offline tooling limits. Clean fixtures, leave both gates false and stop local services. Commit/push and verify task remote SHA, then stop. Fresh read-only security review of the replacement definer function and authorization is required. Coordinator integrates reviewed fix into main before TASK-011B finalizes its consumer and is integrated.
