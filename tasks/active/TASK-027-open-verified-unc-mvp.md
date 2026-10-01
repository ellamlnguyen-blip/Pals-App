# TASK-027 — Open verified UNC MVP

Status: In progress — local migration/security review verified; hosted preview and release checks pending
Date: 2026-09-30
Branch: `agent/TASK-027-open-unc-mvp`

## Goal

Implement the accepted scope in ADR-0028 so all active, confirmed, currently verified UNC accounts with complete onboarding can test the full MVP without pilot roster admission. Preserve required identity, privacy, consent, RLS, block/report, moderation, and account-enforcement boundaries.

## In scope

- Replace pilot-pending behavior and copy with normal UNC verification/onboarding flow.
- Remove the private pilot admission roster as an application eligibility requirement in a committed migration, including owner, ready-subject, Storage, Hangout, People, and other source guards.
- Reconcile capability gates and legacy feature gates with included MVP features: Hangouts/discovery, Calendar, People/friendship, Hangout chat, DMs, in-app notifications, attendance, profile enrichment, and extra photos.
- Remove environment-only local guards that make implemented production routes/APIs return `notFound` or unavailable; keep actual authorization in Supabase/RLS/caller-session checks.
- Run clean-migration, actual-role RLS and HTTP tests against a disposable/nonproduction database; build and smoke-test the deployed preview across positive and negative cases.
- Keep analytics opt-in and privacy-compliant under ADR-0023; do not enable external hosted capture unless its data-location, access, deletion, IP-retention and consent requirements are verified.
- Keep large-Hangout safeguards off per ADR-0024.
- Record moderator coverage honestly; the same person cannot provide independent primary and backup coverage.

## Out of scope

- Changing production database state, replacing the `usepals.com` public site, DNS/domain transfer, cross-campus access, disabling UNC verification, or weakening any RLS/consent/safety boundary.
- Enabling externally hosted analytics without verified ADR-0023 conditions.

## Acceptance criteria

1. A confirmed, currently verified UNC account with complete required profile and owned primary photo is `ready` without a roster row.
2. Unconfirmed, non-UNC, stale/unverified, suspended, banned, and incomplete accounts remain denied at database/RLS and app layers.
3. All included MVP routes and APIs work in the deployed nonproduction environment; feature authorization is source-side and revocation/block behavior still applies.
4. All required gates are aligned, and no route says “coming later” for a capability included in the MVP.
5. Analytics consent and data minimization remain enforced; external capture remains off unless independently verified.
6. Migration reset, SQL policy tests, relevant concurrency/HTTP suites, lint, typecheck and production build pass; a browser smoke test verifies sign-in, onboarding, Hangout, People, DM, notifications, attendance and safety paths.
7. `CURRENT_STATE.md`, `NOW.md`, `CHANGELOG.md`, and a final handoff document actual results and remaining release blockers.

## Release boundary

The task may prepare and verify a staging release. The action that changes hosted access to all eligible UNC accounts must be separately confirmed at action time after the exact target, checks, moderator coverage and rollback are presented. No production or domain change is implied.
