# TASK-027C — Immediate-access lifecycle test reconciliation

Status: In progress
Date: 2026-10-05
Parent: TASK-027

Reconcile existing Auth/Storage/HTTP lifecycle expectations with accepted ADR-0030: an active confirmed exact-UNC-domain account remains ready without roster, completed profile or primary photo. Local Storage runtime was repaired by preserved official CLI stop/start to v1.77.5; first upload now succeeds, then test:auth fails obsolete `incomplete peer cannot read` expectation in hangout-http-checks.mjs. Update only stale access expectations/comments and add meaningful positive/negative checks where needed. Preserve real Storage ownership, peer-folder denial, blocks, unconfirmed/non-UNC/suspended/banned/current-email and RLS denials. Do not mask actual authorization errors. No app/migration/provider-schema changes or hosted writes. Run test:auth and relevant Auth/web lifecycle sequentially after coordinating shared stack with TASK-027B; record exact outcomes. Write handoff, commit/push branch and verify SHA; parent remains incomplete pending staging E2E and main integration.
