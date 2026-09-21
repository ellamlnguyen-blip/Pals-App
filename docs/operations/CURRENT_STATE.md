# Current State
Last updated: 2026-09-21

## Product
Decision tree resolved through product purpose, loop, profile/hangout/social model, safety, map/calendar navigation, MVP boundary, technical architecture, and agent operating model.

## Build State
TASK-001 complete: pnpm monorepo with runnable Next.js 16.3.5/React 19.3 TypeScript web/admin placeholders, reserved mobile workspace and six shared packages. Both apps use provisional design tokens and self-hosted Nunito. Local-first environment parsing, formatting, lint, strict typechecks, baseline tests and production builds pass. GitHub Actions uses the same checks; hosted CI has not run. No backend, authentication, map, analytics or external deployment is connected.

See `LOCAL_SETUP.md` and `agents/handoffs/TASK-001.md`.

## Architecture
Web first; Next.js/TypeScript; Expo later; Supabase; Mapbox; Vercel; PostHog; monorepo; local/staging/production; migration-only schema changes.

## Blocking Unknowns
1. Current domain DNS/Vercel configuration is not yet inventoried for eventual cutover.
2. Concrete SQL/RLS is not implemented.
3. Final visual design system is not specified.
4. Exact UNC verification-domain policy must be confirmed during auth work.
5. TASK-002 needs Supabase CLI and a working Docker-compatible runtime; neither executable was on PATH at bootstrap.

## Next Milestone
Environment/Supabase foundation (TASK-002) → auth/onboarding → map shell.
