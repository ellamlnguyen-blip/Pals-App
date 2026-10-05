# TASK-027G — Sole admin provisioning preparation

Status: Ready
Parent: TASK-027
Date: 2026-10-05

Implement Accepted ADR-0029's fixed Ella admin-authority amendment in existing reviewed staging-control preparation. Read AGENTS, ADR29/31 and TASK-027B; begin a fresh task branch from current canonical main and merge reviewed B8c20 plus parent360d8e8 source where necessary. Keep operational SQL outside migration replay. Add distinct fixed-subject grant_admin/revoke_admin operations with existing locks, current Auth/account/domain checks, revoked-status rollback, expected state, request UUID, audit and idempotent reconciliation. Both admin and moderator authority are explicitly authorized for Ella only. No arbitrary role/subject, privileged client proxy, fixture bootstrap on hosted, analytics/large gate changes, hosted writes or policy SQL substitute.

If audit action constraints require an inert migration, use 20261005000400 and test ordinary replay grants nothing. Coordinate with H's 20261005000300 MFA migration and use the actual combined reviewed migration preflight before eventual hosted execution. Do not pin a migration that does not yet exist as if verified. B previously reviewed grant/moderator/source gate semantics remain intact. Prepare static work independently; H exclusively owns shared local DB until release. Then run local rolled-back operation/actual-role audit tests and runner units against the combined lane. Write handoff, commit/push and verify remote SHA; stop for independent security review. Shared queue/current-state edits remain coordinator-owned. No hosted operation by task agent.
