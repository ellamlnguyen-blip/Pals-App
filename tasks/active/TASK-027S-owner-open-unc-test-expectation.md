# TASK-027S — Align legacy owner HTTP flow with accepted access and MFA

Status: Complete locally; independently reviewed and integrated into TASK-027 parent, unpublished
Parent: TASK-027
Date: 2026-10-05

In `pilot-admission-owner-http.integration.mjs`, reconcile the pre-profile/photo `onboarding` versus `ready` expectation with accepted ADR-0030 immediate access for an active account with confirmed current allowlisted UNC email. For the same fixture's manager-positive calls, obtain genuine local Auth TOTP AAL2 per accepted ADR-0034. Reconcile any roster-revocation expectation superseded by accepted ADR-0028 removal of roster admission from ordinary student eligibility. Inspect the full flow and preserve negative identity, account, campus, privacy, source-gate and audited manager policy checks. Do not change app authorization, RLS, manager MFA or admission behavior to satisfy the test; do not fabricate positive Auth factors/sessions or JWTs.

Run the focused genuine Auth HTTP suite on an exclusive disposable local stack, confirm cleanup and gates off, get fresh review and write handoff. No hosted writes.
