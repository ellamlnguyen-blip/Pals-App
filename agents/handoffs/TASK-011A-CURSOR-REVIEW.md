# Review — TASK-011A ID-only People cursor correction

Date: 2026-09-23
Exact reviewed branch commit: `8bf5432781e40b9f9fdfda04f45d6104ac94cee7`
Reviewer: fresh read-only security reviewer
Result: clear; no blocking findings

The replacement `public.browse_people` retains the same five-card-field signature, authenticated-only execution, `SECURITY DEFINER`, empty search path, volatile behavior and READ COMMITTED guard. An ID-only cursor is resolved after live gate and ready-campus checks; the lookup requires current same-campus subject readiness, opt-in, bilateral block clearance and all active search/year/major filters before deriving the SQL sort key. Missing, hidden, revoked and filter-mismatched cursor IDs share the same unavailable result. The page query reapplies visibility and filters, and the C-collated normalized-name/UUID tuple preserves deterministic order. No grants, tables, peer fields, photos, Hangout authorization or hosted configuration changed.

The reviewer inspected the exact committed migration and SQL/HTTP tests without rerunning destructive database resets. The implementation handoff reports two clean local resets with 308 assertions each, including 28 visible peers across two pages, long raw names with nonbreaking spaces, tied names, hidden/filter-mismatched IDs and post-block/opt-out cursor denial. Direct authenticated PostgREST ID-only pagination was checked with a 106-character raw name. See `TASK-011A-CURSOR.md` for the remaining verification and tooling limits.

Coordinator integration: reviewed branch merged and remote-verified on canonical main `c393a2e36985a44c7a86b42d83252a2e7320e401`. TASK-011B UI and parent TASK-011 remain open.
