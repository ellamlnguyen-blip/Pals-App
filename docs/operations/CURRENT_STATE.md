# Current State
Last updated: 2026-09-22

## Product
Decision tree resolved through product purpose, loop, profile/hangout/social model, safety, map/calendar navigation, MVP boundary, technical architecture, and agent operating model.

## Build State
TASK-001 complete: pnpm monorepo with Next.js 16.3.5/React 19.3 TypeScript web/admin, reserved mobile workspace and six shared packages. Apps use shared light/dark design tokens and self-hosted Nunito. Local-first configuration, formatting, lint, strict typechecks, tests and production builds pass. TASK-002 baseline GitHub Actions passed; new TASK-003 CI execution is not yet verified.

TASK-002 complete: universities, accounts, separate campus verification, profile drafts, platform roles, owner-only RLS, synthetic tests, migration/seed scripts and target validation. Local Postgres and the authorized hosted development/staging project are verified. See `agents/handoffs/TASK-002.md` and `docs/operations/HOSTED_ENVIRONMENT.md`.

TASK-003 implements signup/signin/signout, same-browser PKCE email confirmation/resend, required-profile onboarding, server-side live gates and private owner-only photos. Accepted ADR-0009 exact domains are enforced by the database. “UNC email verified” confirms email ownership, not independent enrollment. Supabase clients reject hosted targets in local mode and reject privileged keys. Repeated clean SQL, HTTP Auth/Storage/callback/gates and full workspace checks pass. Independent security review has no actionable findings. Anonymous responsive design review and the implementer's authenticated desktop/mobile onboarding plus tablet readiness/signout check passed. The `/hangouts` route is a readiness screen only; map, Hangout, social, messaging and analytics features remain unimplemented.

The committed TASK-003 migration is applied to the authorized hosted development/staging target; schema lint and policy/bucket/domain/gate catalog checks pass. No hosted Auth users were created. This does not establish hosted email delivery or deployed HTTPS callback success.

See `LOCAL_SETUP.md` and `agents/handoffs/TASK-001.md`.

## Architecture
Web first; Next.js/TypeScript; Expo later; Supabase; Mapbox; Vercel; PostHog; monorepo; local/staging/production; migration-only schema changes.

## Blocking Unknowns
1. Current domain DNS/Vercel configuration is not yet inventoried for eventual cutover.
2. Hosted SMTP for arbitrary UNC recipients and a deployed HTTPS frontend/callback still need configuration and verification. Local Mailpit delivery does not prove hosted delivery.
3. Shared visual tokens are refined for onboarding; the broader map-first design system awaits TASK-004.
4. Photos and profiles remain owner-only. Future peer discovery must define blocking/privacy access before expanding readers.
5. Supabase CLI is pinned and workspace CPU support includes x64/arm64. The host's Lima/Docker runtime is temporary; reset/start/test scripts must keep the same named Docker network.

## Next Milestone
Complete TASK-003 rendered/hosted callback verification and orchestration review → fresh bounded map shell task. Do not silently treat unverified staging callbacks or public email delivery as complete.
