# Current State
Last updated: 2026-09-22

## Product
Decision tree resolved through product purpose, loop, profile/hangout/social model, safety, map/calendar navigation, MVP boundary, technical architecture, and agent operating model.

## Build State
TASK-001 complete: pnpm monorepo with Next.js 16.3.5/React 19.3 TypeScript web/admin, reserved mobile workspace and six shared packages. Apps use shared light/dark design tokens and self-hosted Nunito. Local-first configuration, formatting, lint, strict typechecks, tests and production builds pass. TASK-002 baseline GitHub Actions passed; new TASK-003 CI execution is not yet verified.

TASK-002 complete: universities, accounts, separate campus verification, profile drafts, platform roles, owner-only RLS, synthetic tests, migration/seed scripts and target validation. Local Postgres and the authorized hosted development/staging project are verified. See `agents/handoffs/TASK-002.md` and `docs/operations/HOSTED_ENVIRONMENT.md`.

TASK-003 implements signup/signin/signout, same-browser PKCE email confirmation/resend, required-profile onboarding, server-side live gates and private owner-only photos. Accepted ADR-0009 exact domains are enforced by the database. “UNC email verified” confirms email ownership, not independent enrollment. Supabase clients reject hosted targets in local mode and reject privileged keys. Repeated clean SQL, HTTP Auth/Storage/callback/gates and full workspace checks pass. Independent security review has no actionable findings. Anonymous responsive design review and the implementer's authenticated desktop/mobile onboarding plus tablet readiness/signout check passed. The `/hangouts` route now contains the TASK-004 authenticated Mapbox shell; full Hangout CRUD, social, messaging and analytics remain unimplemented.

The committed TASK-003 migration is applied to the authorized hosted development/staging target; schema lint and policy/bucket/domain/gate catalog checks pass. No hosted Auth users were created. This does not establish hosted email delivery or deployed HTTPS callback success.

See `LOCAL_SETUP.md` and `agents/handoffs/TASK-001.md`.

## Architecture
Web first; Next.js/TypeScript; Expo later; Supabase; Mapbox; Vercel; PostHog; monorepo; local/staging/production; migration-only schema changes.

## Blocking Unknowns
1. Current domain DNS/Vercel configuration is not yet inventoried for eventual cutover.
2. Hosted SMTP for arbitrary UNC recipients and a deployed HTTPS frontend/callback still need configuration and verification. Local Mailpit delivery does not prove hosted delivery.
3. TASK-004 map interactions are implemented and tested with the real Mapbox renderer in an isolated offline-style harness. A project-owned public Mapbox token is still needed to verify live basemap/style delivery; no live tile success is claimed.
4. Photos and profiles remain owner-only. Future peer discovery must define blocking/privacy access before expanding readers.
5. Supabase CLI is pinned and workspace CPU support includes x64/arm64. The host's Lima/Docker runtime is temporary; reset/start/test scripts must keep the same named Docker network.

## Next Milestone
Coordinator review of TASK-004 plus live Mapbox token/basemap verification. TASK-003 deployed HTTPS callback and public UNC email delivery remain open. Do not auto-dispatch the next implementation task.

## TASK-004 outcome
Responsive map shell on `agent/TASK-004-map`: UNC viewport, pan/zoom, keyboard-accessible clustered mock pins, preview/list, local example filters, no-publish Create shell, and optional one-shot coarse location. Existing live Supabase access gate is preserved. No schema, hosted environment, production or deployment changes. Full repository checks (11 Node tests and both builds) and real local Auth/Storage/web gate regression pass. Implementer inspected desktop/tablet/phone UI and offline Mapbox interactions; independent static review findings were fixed and re-reviewed. Live basemap, rendered dark mode, Lighthouse and independent rendered review remain unverified. See `agents/handoffs/TASK-004.md`.
