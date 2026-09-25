# TASK-020 handoff — large-Hangout basic safeguards

Status: complete for bounded disposable-local scope under Accepted ADR-0024. No hosted use, live-user traffic, persistent gate enablement or operator review consumer.

## Result

Stage A adds the default-off safeguard gate, host-only coarse 25-joined-member state, private append-once unconsumed observation signal and caller-bound saved-discovery projection. Stage B shows the current host the accepted warning and existing-authority close/reopen control, with revision/read-back proof, stale/uncertain reload recovery and immediate private-detail masking on access loss. Saved map/list discovery compares two complete ordered public projections around a fresh access check, then releases at most 100 pins with truthful ranking copy. No exact count, peer size class, private location, popularity score or Calendar ranking is exposed.

## Review and verification

- Reviewed A task tip `06cae8d1472170eec99641d46181e3fa9b4d882c` was integrated on independently verified canonical main `8d3c895d9093918d209c4e9aed3535ab108f19ae`. A's exact-tip review has no remaining P0/P1/P2. Its handoff records 64 focused SQL assertions, all 17 SQL fixtures, real Auth/PostgREST/notification HTTP, observed-lock races, prior-schema upgrade, lint/workspace checks and the Lima test-wrapper limitation with equivalent direct fixture streaming.
- Reviewed B task tip `65f0356c8cce888d769adcadcb41d050d78f40da` was independently remote-verified and passed fresh exact-tip design/security review with no remaining P0/P1/P2. Its handoff records typecheck, lint, 46 passing Node tests, production web build, authenticated built-web host/viewer 24/25, close/reopen/stale/denied, >100 discovery/gate-off, phone/keyboard and map fallback checks.
- B did not deterministically inject a lost network response or a gate flip between its two live projection calls. Its conservative source behavior was reviewed, and A separately verified the gate-epoch HTTP path. These are evidence limits, not claims of exercised B browser scenarios.
- A coordinator `pnpm check` after the merge could not reinstall this checkout's dependencies because the package registry did not resolve; the install was stopped without source changes. The exact B tip had already passed its full workspace typecheck, lint, Node tests and production build, and its integration merge changed no runtime files afterward.

## Cleanup and remaining decisions

Disposable local reset left zero Auth users, Hangouts and Storage objects, all ten product gates false, and owned Next/Supabase/Lima services stopped. Temporary QA credentials and scripts were removed. The earlier TASK-019 server occupying port 3000 was gracefully stopped for this QA and not restarted because its previous environment was unknown.

The private size signal has no consumer. Before hosted use, define and accept its operational consumer, audited access, retention and response policy; staging and deployment remain separately bounded in TASK-021. TASK-010 co-host UI/authority work remains separate, and this implementation does not change Accepted ADR-0012.

Publication receipt: the reviewed Stage B task branch is remote-verified at `65f0356c8cce888d769adcadcb41d050d78f40da`. The TASK-020 integration branch and canonical `main` were independently remote-verified at `2a4f104a11a163b50e32952cb6636d9525cfdc79` after the reviewed merge and completion record. This receipt is documentation only; its follow-up commit advances main beyond that integration SHA.
