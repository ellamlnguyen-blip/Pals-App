# TASK-027R — Genuine Auth manager concurrency fixtures

Status: Complete locally; independently reviewed and integrated into TASK-027 parent, unpublished
Parent: TASK-027
Date: 2026-10-05

Audit `pilot-admission-authority-concurrency.integration.mjs` and its helper affected by TASK-027N. Replace only manager-positive synthetic AAL1 setup with genuine local Auth TOTP AAL2 sessions and use their actual signed claims for PostgreSQL parallel race orchestration, following reviewed TASK-027O's pattern. Retain existing lock waits, both committed orders, CAS, denial, audit, request idempotency and cleanup assertions. No positive factor/session SQL fabrication, JWT invention, service-key caller or manager guard weakening.

Run each directly affected focused race suite, prove successful and denied orders, reset disposable local stack with gates off/fixtures removed, get fresh security review and write handoff. No hosted writes.
