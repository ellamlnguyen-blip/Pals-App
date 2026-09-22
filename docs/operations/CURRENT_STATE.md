# Current State
Last updated: 2026-09-22

## Product
Decision tree resolved through product purpose, loop, profile/hangout/social model, safety, map/calendar navigation, MVP boundary, technical architecture, and agent operating model.

## Build State
TASK-001 complete: pnpm monorepo with Next.js 16.3.5/React 19.3 TypeScript web/admin, reserved mobile workspace and six shared packages. Apps use shared light/dark design tokens and self-hosted Nunito. Local-first configuration, formatting, lint, strict typechecks, tests and production builds pass. TASK-006 task-branch GitHub CI now passes workspace checks plus local database/auth/profile verification (see TASK-006 outcome); hosted callback/email acceptance remains separate.

TASK-002 complete: universities, accounts, separate campus verification, profile drafts, platform roles, owner-only RLS, synthetic tests, migration/seed scripts and target validation. Local Postgres and the authorized hosted development/staging project are verified. See `agents/handoffs/TASK-002.md` and `docs/operations/HOSTED_ENVIRONMENT.md`.

TASK-003 implements signup/signin/signout, same-browser PKCE email confirmation/resend, required-profile onboarding, server-side live gates and private owner-only photos. Accepted ADR-0009 exact domains are enforced by the database. “UNC email verified” confirms email ownership, not independent enrollment. Supabase clients reject hosted targets in local mode and reject privileged keys. Repeated clean SQL, HTTP Auth/Storage/callback/gates and full workspace checks pass. Independent security review has no actionable findings. Anonymous responsive design review and the implementer's authenticated desktop/mobile onboarding plus tablet readiness/signout check passed. The `/hangouts` route now contains the TASK-004 authenticated Mapbox shell; full Hangout CRUD, social, messaging and analytics remain unimplemented.

The committed TASK-003 migration is applied to the authorized hosted development/staging target; schema lint and policy/bucket/domain/gate catalog checks pass. No hosted Auth users were created. This does not establish hosted email delivery or deployed HTTPS callback success.

See `LOCAL_SETUP.md` and `agents/handoffs/TASK-001.md`.

## Architecture
Web first; Next.js/TypeScript; Expo later; Supabase; Mapbox; Vercel; PostHog; monorepo; local/staging/production; migration-only schema changes.

## Blocking Unknowns
1. Current domain DNS/Vercel configuration is not yet inventoried for eventual cutover.
2. Hosted SMTP for arbitrary UNC recipients and a deployed HTTPS frontend/callback still need configuration and verification. Local Mailpit delivery does not prove hosted delivery.
3. TASK-004 live basemap verification is complete using the palsapp account public token in the ignored local web environment. The existing default token is usage-limited and has no URL restrictions; it was not altered. Staging/production token setup remains part of deployment work.
4. Photos and profiles remain owner-only. Future peer discovery must define blocking/privacy access before expanding readers.
5. Supabase CLI is pinned and workspace CPU support includes x64/arm64. The host's Lima/Docker runtime is temporary; reset/start/test scripts must keep the same named Docker network.

## Next Milestone
TASK-005 backend implementation is reviewed and locally verified under the latest Accepted ADR-0010. Reviewed backend is integrated on main `aa9fb884397c4d2bc728a8532b1cb0d2737959f0`, remote verified; TASK-005 is complete. TASK-007 has an approved local create/edit contract and can use the verified backend/API handoff in its separately coordinated task. TASK-003 deployed HTTPS callback and public UNC email delivery remain open. No automatic later-task implementation.

## TASK-004 outcome
Responsive map shell on `agent/TASK-004-map`: UNC viewport, pan/zoom, keyboard-accessible clustered mock pins, preview/list, local example filters, no-publish Create shell, and optional one-shot coarse location. Existing live Supabase access gate is preserved. No schema, hosted environment, production or deployment changes. Full repository checks (11 Node tests and both builds) and real local Auth/Storage/web gate regression pass. Implementer inspected desktop/tablet/phone UI, offline Mapbox interactions and final real provider basemap on authenticated desktop/phone routes; independent static review findings were fixed and re-reviewed. No console errors/warnings during live checks. Rendered dark mode, Lighthouse and independent rendered review remain unverified; these are recorded limitations rather than live-basemap blockers. See `agents/handoffs/TASK-004.md`.

## Shared task reference
`main` contains reviewed app work and durable records for active/blocked tasks. The coordinator publishes contracts/status before dispatch, updates material milestones/blockers, and integrates accepted task work with its handoff before completion. Shared GitHub authentication is configured through GitHub CLI and macOS Keychain; no credentials are stored in the repository.

## TASK-006 outcome
Owner-only `/profile` view/edit is implemented under Accepted ADR-0011: required details, optional interests/down-to-do/music/foods/fact/prompts/Instagram, primary replacement and up to four extra private photos. Database constraints protect shapes/limits and full photo ownership; locking coordinates assignment/deletion, and server-owned revisions reject stale editor saves. Failure messages and retryable cleanup cover lost upload/assignment responses without deleting referenced photos. Existing live readiness and owner access distinctions are preserved.

Final local verification passed: workspace check with 13 unit tests and both builds; two clean database resets with 112 permission assertions each and warning-free lint; real Auth/Storage/web actions with upload/assignment/cleanup failures and concurrent SQL mutations. Independent security findings were fixed and re-reviewed. Implementer desktop/phone interactions and coordinator desktop/390px/320px checks passed with no horizontal overflow; focus/cancel and zero-to-four photo management verified. Dark-mode rendering, Lighthouse and physical mobile-device measurements remain unverified. See `agents/handoffs/TASK-006.md` and `TASK-006-REVIEW.md`.

Reviewed task tip: `2ac7ea9a52057ac14eb730544f219db37e444760`. Reviewed implementation integrated on main `870cf449032787dc4ec9dfe22a71aa947fe669af`; task/main remote SHAs verified before completion. Task-branch [GitHub CI](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35794111143) passed both validate and database jobs. Canonical local main is synchronized with the published implementation. Disposable visual account/photos were cleaned and local Supabase/Lima stopped. No hosted migration/deployment occurred. TASK-003 hosted HTTPS callback/real UNC delivery, TASK-005 implementation, peer privacy/blocking and launch safety remain independent. No next task is automatically dispatched.

## TASK-007 planning / prerequisite

The create/edit contract is prepared in `tasks/active/TASK-007-create-edit-hangouts.md`. The Create entry still opens a no-publish mock shell. TASK-005 backend is now reviewed and locally verified, and integrated; its remote SHA and task-tip CI are verified. The user explicitly accepted the revised ADR-0010 in TASK-007. Its current-ready roster, field/time limits, default-disabled local database gate and atomic retry/revision rules supersede the concurrently published earlier TASK-005 choices. TASK-005 implementation uses that reconciled contract and has passed fresh security review. No duplicate backend dispatch. TASK-007 depends on a separately reviewed, tested and integrated TASK-005. Hosted/live use remains gated on separately resolved blocking/privacy and launch safety. Planning handoff: `agents/handoffs/TASK-007-CONTRACT.md`.

## TASK-005 backend outcome
Local Hangout migration implements public campus records, current-ready participant IDs, separate private instructions, host ownership and membership transitions. A database feature gate defaults disabled and cannot be set by clients. Every exposed Hangout operation requires the gate, live ready same-campus access and READ COMMITTED isolation. Direct table DML is denied. No profile/photo reader or operator/co-host bypass is introduced.

Creation/public-private editing are atomic; owner-scoped UUID retry identity with normalized payload digest prevents duplicate creation, and expected revisions reject stale detail/lifecycle writes. Leaving/removal/cancellation/readiness loss revokes private reads. Deterministic transaction tests cover conflicting operations and revocation while waiting for locks. Accepted field/time limits and unsupported-mode rejection are database enforced.

Local checks passed: full workspace with 13 unit tests and both builds; two clean database resets with 226 permission assertions each and clean schema lint; actual Auth/Storage/PostgREST/private embeds plus both Hangout and profile concurrency suites. Fresh GPT-6 Sol medium security review is clear; see `agents/handoffs/TASK-005.md` and `TASK-005-REVIEW.md`. Task tip `a59b4a6900e5bc50f47a0beb0ff7fdd6e79741cd` was pushed and independently verified. Reviewed implementation integrated on main `aa9fb884397c4d2bc728a8532b1cb0d2737959f0`, verified remotely. [Task-tip GitHub CI](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35797256841) passed validate/database jobs for the exact task SHA. Local verification ended with zero Auth users/Hangouts and feature gate false; Supabase/Lima are stopped. No hosted migration, live Hangout UI, blocking/reporting/moderation, automatic expiry or launch claim.
