# TASK-012A independent security and integration review

Date: 2026-09-23
Starting published main: `7499c1056c866a085389ff373509ee419dca3b8f`
First backend tip: `83d0557afd9e89b354784463bb691f4677495945`
Reviewed corrected backend tip: `2a1f6b13b332196ba599fb739513fd424024f2a7`
Coordinator integration merge on `agent/TASK-012-planning`: `bb6818b98c2357ea3d60d75ff8ed575e9574945b`
Reviewer: fresh GPT-6 Sol medium read-only security agent; Standard speed is the app preference but not verifiable in dispatch tooling.

The first exact-commit review found one P2 authorization race: an opt-out, readiness loss or feature-gate disable could commit after `friendship_eligible()` but before a request/accept write committed. The implementation agent corrected the migration so create/accept hold shared locks through commit on both gates and the current account, Auth, membership, campus, profile, referenced photo and People-preference evidence, then recheck eligibility in a fresh READ COMMITTED statement. New overlapping-session tests prove opt-out, gate disable and photo-readiness revocation begun after creation checks wait; opt-out committed first causes creation to fail. The existing pair-lock race still proves block versus accept and post-wait gate denial.

Fresh review of exact corrected tip `2a1f6b1` found no remaining blocking security issue. The pair lock serializes friendship transitions with the existing People block RPC; a committed authorized block tears down the pair even while friendship is disabled. The gate defaults false, private rows/grants stay closed, callers can read only their own ID/status/generation, and creation keys plus immutable generations prevent stale retries and transitions. A profile/Storage lock-order deadlock could abort a transaction; it fails closed.

The implementer recorded two clean local resets, six pgTAP suites, schema lint, real Auth/PostgREST, deterministic race tests, formatting/ESLint and 17 Node tests passing. The reviewer inspected the code and receipts but did not rerun stopped services. Full `pnpm check` was unavailable: registry DNS failed and the offline store lacked `@types/node@24.13.6`; no green full-check or CI claim. The final local gates are false, fixtures zero, and services stopped. The coordinator inspected the handoff/diff, independently verified the corrected remote task tip, and merged only this reviewed stage into the coordinator integration branch. Canonical main push/verification remains the final receipt step.

TASK-012B may begin only after the reviewed backend and this record are published and verified on canonical main under its own narrower contract. Friend-aware ranking, restricted Hangouts, peer photos, global blocking/reporting and hosted use remain open.
