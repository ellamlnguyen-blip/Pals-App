# TASK-027 — Open verified UNC MVP

Status: In progress — revised immediate confirmed-UNC-email access policy; implementation and hosted preview checks pending
Date: 2026-10-04
Branch: `agent/TASK-027-open-unc-mvp`

## Goal

Implement ADR-0028 as amended by ADR-0030 so every active account with a confirmed email on the exact UNC allowlist can enter and use the MVP immediately, without pilot-roster, separate current-enrollment, profile-completion, or primary-photo requirements. Preserve identity/email evidence, privacy, consent, RLS, block/report, moderation, and account-enforcement boundaries.

## In scope

- Replace pilot-pending behavior and copy with normal UNC verification/onboarding flow.
- Remove the private pilot admission roster as an application eligibility requirement in a committed migration, including owner, ready-subject, Storage, Hangout, People, and other source guards.
- Remove profile-completion and primary-photo requirements from app/source eligibility consistently in a committed migration, while retaining exact allowlist, confirmed-email, active-campus, active-account and current Auth-to-membership checks. Ensure required profile/photo editing remains reachable after app entry and incomplete profiles are not exposed to other users without consent.
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

1. An active account with a confirmed email on the exact active UNC allowlist is `ready` without a roster row, complete profile, or owned primary photo.
2. Unconfirmed, non-allowlisted, stale/changed-email, inactive-campus, suspended, and banned accounts remain denied at database/RLS and app layers. A confirmed allowlisted account with no profile/photo is a positive access case.
3. All included MVP routes and APIs work in the deployed nonproduction environment; feature authorization is source-side and revocation/block behavior still applies.
4. All required gates are aligned, and no route says “coming later” for a capability included in the MVP.
5. Analytics consent and data minimization remain enforced; external capture remains off unless independently verified.
6. Migration reset, SQL policy tests, relevant concurrency/HTTP suites, lint, typecheck and production build pass; a browser smoke test verifies sign-in, app entry before profile completion, profile editing, Hangout, People, DM, notifications, attendance and safety paths.
7. `CURRENT_STATE.md`, `NOW.md`, `CHANGELOG.md`, and a final handoff document actual results and remaining release blockers.

## Release boundary

The task may prepare and verify a staging release. The action that changes hosted access to all eligible UNC accounts must be separately confirmed at action time after the exact target, checks, moderator coverage and rollback are presented. No production or domain change is implied.
