# ADR-0028 — Open verified UNC MVP

- Status: Accepted for MVP scope; its profile-readiness access condition is superseded by ADR-0030
- Date: 2026-09-30
- Supersedes: ADR-0026 for the current release audience and capability scope; ADR-0025 deferrals that conflict with the user's current MVP scope

## Context

The current production experience says student features are unavailable while the UNC pilot is being set up. The user has directed that People, discovery, DMs, notifications, and analytics ship in the MVP and that pilot admission blockers be removed so the product is open to everyone.

## Decision

“Open to everyone” means every active, confirmed account with current verified UNC Chapel Hill identity. Accounts from other campuses, unconfirmed or unverified accounts, incomplete required onboarding, suspended accounts, and banned accounts remain denied. There is no separate nominated pilot roster or admission requirement.

The MVP includes Calendar, People discovery, friendship, DMs, in-app notifications, attendance confirmation, and analytics alongside the existing Hangout, identity, and safety flows. Analytics remains opt-in and respects ADR-0023's privacy conditions. Large-Hangout safeguards retain ADR-0024's independent deferral.

This decision does not authorize weakening RLS, campus verification, block enforcement, consent, privacy, moderation audit, or account enforcement. Each capability must work through its normal server/database authorization path. UI switches alone do not authorize a feature. The pilot admission system may remain as an administrative artifact, but no application read/write path may require an account-roster entry for current verified-UNC eligibility.

**Access-readiness amendment:** [ADR-0030](ADR-0030-confirmed-unc-email-immediate-access.md), accepted by the user's explicit direction on 2026-10-04, supersedes the complete-profile/owned-photo requirement for entering the app and source eligibility. Confirmed email on the exact approved UNC allowlist is the accepted signal; no independent enrollment check is required. All suspension/ban and safety boundaries remain.

## Consequences

- Replace pilot-pending onboarding copy and remove the pilot-roster check from caller access while preserving verified-UNC and ready-profile checks.
- Review every direct roster join, feature capability gate, legacy feature gate, and app environment guard before enabling routes.
- Ship only after migration-chain, direct-RLS, source authorization, moderation, and end-to-end checks pass on nonproduction.
- Opening hosted access to all eligible UNC accounts is a distinct release action and requires its own action-time confirmation after a concrete staging result is reviewed.
- A primary moderator and a backup must be distinct people for independent coverage. Naming one person for both roles does not establish backup coverage.

## Rollout

Use a preview/staging deployment and nonproduction Supabase target first. Do not modify production or the usepals.com domain as part of this task. Verify the exact deployment, migration history, sign-in/onboarding, feature flows, denial boundaries, and safety/moderation before presenting the hosted open-access action for confirmation.
