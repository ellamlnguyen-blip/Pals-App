# TASK-027S — Align legacy owner HTTP access expectation

Status: Ready; independent of manager MFA fixture work
Parent: TASK-027
Date: 2026-10-05

In `pilot-admission-owner-http.integration.mjs`, reconcile only the observed `onboarding` versus `ready` expectation with accepted ADR-0030 immediate access for an active account with confirmed current allowlisted UNC email. Inspect the full flow first; preserve negative identity, account, campus, privacy and gate checks. Do not change app authorization, RLS, manager MFA or account admission semantics to satisfy the test.

Run the focused genuine Auth HTTP suite on an exclusive disposable local stack, confirm cleanup and gates off, get fresh review and write handoff. No hosted writes.
