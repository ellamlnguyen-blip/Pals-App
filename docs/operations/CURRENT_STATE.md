# Current State
Last updated: 2026-09-21

## Product
Decision tree resolved through product purpose, loop, profile/hangout/social model, safety, map/calendar navigation, MVP boundary, technical architecture, and agent operating model.

## Build State
No implementation has been created yet.

## Architecture
Web first; Next.js/TypeScript; Expo later; Supabase; Mapbox; Vercel; PostHog; monorepo; local/staging/production; migration-only schema changes.

## Blocking Unknowns
1. Current domain DNS/Vercel configuration is not yet inventoried for eventual cutover.
2. Concrete SQL/RLS is not implemented.
3. Final visual design system is not specified.
4. Exact UNC verification-domain policy must be confirmed during auth work.

## Next Milestone
Repo bootstrap → environment/Supabase foundation → auth/onboarding → map shell.
