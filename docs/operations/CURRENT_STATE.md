# Current State
Last updated: 2026-09-21

## Product
Decision tree resolved through product purpose, loop, profile/hangout/social model, safety, map/calendar navigation, MVP boundary, technical architecture, and agent operating model.

## Build State
TASK-001 complete: pnpm monorepo with runnable Next.js 16.3.5/React 19.3 TypeScript web/admin placeholders, reserved mobile workspace and six shared packages. Both apps use provisional design tokens and self-hosted Nunito. Local-first environment parsing, formatting, lint, strict typechecks, baseline tests and production builds pass. GitHub Actions uses the same checks; hosted CI has not run. No app-level authentication, map, analytics or external deployment is connected.

TASK-002 implements a locally verified Supabase foundation: universities, accounts, separate campus verification, profile drafts, platform roles, owner-only RLS, synthetic tests, migration/seed scripts and target validation. A temporary local Lima/Docker runtime enabled actual Postgres verification. See `agents/handoffs/TASK-002.md`. Staging has not been configured or applied; the task remains awaiting that verification and orchestration review.

See `LOCAL_SETUP.md` and `agents/handoffs/TASK-001.md`.

## Architecture
Web first; Next.js/TypeScript; Expo later; Supabase; Mapbox; Vercel; PostHog; monorepo; local/staging/production; migration-only schema changes.

## Blocking Unknowns
1. Current domain DNS/Vercel configuration is not yet inventoried for eventual cutover.
2. Hosted staging verification is pending an explicitly authorized separate project; local SQL/RLS is implemented and tested.
3. Final visual design system is not specified.
4. Exact UNC verification-domain policy and email/profile versus separate enrollment evidence remain unaccepted (Proposed ADR-0009). No automatic verification exists.
5. Supabase CLI is pinned; the host verification runtime is temporary and stopped after use. Subsequent work must restart it or use another local Docker runtime.

## Next Milestone
Review TASK-002 and configure/authorize staging verification → resolve student verification policy → fresh auth/onboarding task → map shell.
