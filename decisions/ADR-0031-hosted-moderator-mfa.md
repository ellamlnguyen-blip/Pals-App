# ADR-0031 — Hosted moderator MFA and sole-operator launch

Status: Accepted
Date: 2026-10-05
Scope: TASK-027, Pals Staging first; no hosted mutation authorized by this document

## Explicit user acceptance

The user approved this design after choosing both admin and moderator authority for Ella. They clarified that ordinary users require no individual approval or MFA, and Ella does not manually moderate routine app operations. MFA applies to the operator's privileged session/actions only; Hangouts, discovery, joining and messaging follow accepted automated source authorization for active confirmed UNC accounts. The design does not add a manual approval queue or require a new authenticator challenge for each normal user or each routine action. Hosted privilege/session checks and operator enrollment/recovery remain necessary.

## Concrete decision proposed

Extend the existing Supabase/Vercel moderation app to an exact validated HTTPS staging origin. Preserve caller-bound publishable-key RPCs, database role/account/gate/conflict checks, reasons, revisions and immutable audit. Require a genuinely signed Auth AAL2 session for every privileged moderation RPC through the existing shared private.moderation_actor guard. The JWT check must use `(auth.jwt()->>'aal') IS DISTINCT FROM 'aal2'` to deny missing claims. Also require the signed JWT session_id to match a live auth.sessions row owned by auth.uid(), with current AAL2, unexpired not_after and factor_id bound to a current verified owned TOTP factor in auth.mfa_factors. Missing, deleted, expired or downgraded sessions/factors deny even if the cached JWT still says AAL2. Ordinary AAL1 and AAL2 without a live role remain denied. Test session/factor removal and concurrent revocation; do not infer revocation from browser sign-out alone. Implement Supabase TOTP enrollment and challenge/verification in apps/admin with secure cookies, exact Origin checks, private/no-store responses and no report data before MFA. Do not add a service-role proxy or a recovery bypass. Ordinary student access requires only the accepted confirmed UNC mailbox rule; student MFA is not introduced.

Ella Nguyen (ella_nguyen@unc.edu) is the sole launch moderation owner under the explicit current user instruction. A backup role is not required. Existing moderator authority permits report review, suspension and Hangout disable; existing admin authority additionally permits ban/reinstatement. Decide her exact role explicitly before provisioning; sole staffing does not itself silently grant admin powers. Preserve conflict checks for reports filed by/about Ella or involving her hosted Hangouts. Such cases require separately arranged independent case review if they occur; this does not provision or require a standing backup moderator and does not authorize self-review.

The user explicitly selected both admin and moderator authority. Existing single-row admin authority includes moderator powers, so provision the fixed Ella staging identity as admin through the reviewed moderator-to-admin upgrade; do not create duplicate roles. The prepared TASK-027B script currently grants moderator only; its admin provisioning/revocation must be bounded, tested and independently reviewed before use. The user has now accepted this MFA design; no hosted grant is yet proven.

Personal authenticator enrollment/custody and recovery verification require Ella's participation. Report response expectations, incident contact, retention/deletion/legal-hold and appeal handling must be recorded honestly; no response SLA or legal policy is invented. Enrolled-factor state alone is not successful challenge evidence. Recovery must revoke/refresh affected sessions and recheck live account/role, including existing AAL2 token behavior after factor removal.

## Bounded implementation and evidence

One committed MFA guard migration with actual-role SQL tests and genuine local Auth TOTP HTTP tests; no forged positive HTTP JWTs. One bounded admin HTTPS/MFA UI implementation with config/cookie/Origin tests and rendered flow checks. One reviewed staging role bootstrap under TASK-027B, retaining truthful administrative provenance. Tests must prove AAL1 denial on all five moderation RPCs, AAL2 success with audit, no-role and revoked/suspended denials, conflicts, Origin/HTTPS/cookie behavior and factor recovery. Verify actual staged report intake, operator queue/detail/action/audit from separate test accounts. No main integration/deployment-ready claim until those pass.

## Acceptance needed

Repository AGENTS.md requires explicit acceptance for a major authorization/hosted-scope ADR. This proposal is reviewable scope only. It does not waive existing privacy/RLS rules, grant a role, open a gate or change production/domain configuration.

## Independent design review

A fresh read-only security review found the overall design suitable for acceptance after making missing-AAL denial and cached-token revocation explicit. Those clarifications are recorded above. Current local Auth schema metadata confirms sessions.factor_id, sessions.aal, sessions.not_after and factor status/owner fields exist; implementation still requires real Auth TOTP and direct-RPC revocation tests. This is design review, not implementation verification.
