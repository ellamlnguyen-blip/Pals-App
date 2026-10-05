# ADR-0030 — Confirmed UNC email grants immediate app access

- Status: Accepted by explicit user direction (2026-10-04); implementation and staging verification pending
- Supersedes: ADR-0009's complete-profile access gate and ADR-0028's ready-profile eligibility condition for app/source access
- Scope: First UNC launch only; retain the currently approved exact UNC email-domain allowlist

## Context

The user selected the fast first-launch rule that any account with a confirmed email on Pals' existing UNC Chapel Hill allowlist may enter and use the app immediately. Pals will treat control of a confirmed address on that list as its UNC verification signal. It does not separately establish current enrollment, a person's real-world identity, or their right to use other UNC systems. The approved allowlist remains exact-domain equality: `live.unc.edu`, `unc.edu`, `ad.unc.edu`, `business.unc.edu`, and `kenan-flagler.unc.edu`.

## Decision

An account receives immediate UNC app/source eligibility when all of the following hold: its Auth identity is present; the Auth email is confirmed; its normalized exact email domain is currently in the active UNC campus allowlist and matches the server-synchronized membership evidence; the campus is active; and the account is active. No pilot-roster row, separate current-enrollment check, completed profile, or owned primary photo is required to enter or use the app. Profile completion and photo upload remain available after entry and must not become a hidden route or source authorization barrier.

Unconfirmed, non-allowlisted, missing/changed-email evidence, inactive-campus, suspended, and banned accounts remain denied. Existing RLS, caller binding, source authorization, blocks, reporting, privacy, consent, moderation, and enforcement remain in force. No client-supplied metadata or confirmation claims replace live Auth and server-owned database state.

Feature switches remain separately controlled and must be explicitly aligned through reviewed staging and release changes. Their activation does not follow from this policy record alone. Consent-based analytics, external capture, and large-Hangout safeguards retain their existing independent controls.

## Consequences

- Update access state and every source authorization/transaction guard so confirmed allowlisted accounts without a profile/photo are eligible consistently.
- Keep profile fields optional for app entry and ensure empty-profile fallbacks do not expose email, break People/chat/Hangout views, or bypass opt-in/consent.
- Test direct SQL/RLS and HTTP source flows for a confirmed UNC account with no profile/photo, plus every retained denial and safety condition.
- User-facing copy must say that a confirmed address on an approved UNC domain is accepted as the access verification signal; do not claim Pals independently checked enrollment or real-world identity.
- Revisit this proxy if UNC-domain mailbox eligibility or confirmed-address availability changes.

## Rollout

Implement in a committed migration and UI adjustment; run clean reset, RLS, lifecycle/concurrency, HTTP, lint, typecheck, and production builds. Apply only to Pals Staging after separately reviewing and confirming the exact access-expanding action. Verify the complete positive/negative matrix before production review. This ADR does not authorize production access changes, moderator-role writes, domain cutover, or student invitations.
