# System Architecture
Status: accepted direction; clean implementation has not begun.

## Delivery
Phase 1: student-facing web app works first. Phase 2: Expo iOS/Android reuse backend/domain contracts.

## Monorepo
`apps/web`, `apps/admin`, `apps/mobile`; shared `packages/domain`, `types`, `validation`, `data-access`, `config`, `design-tokens`; `supabase/migrations`, `seed`, `functions`, `tests`.

## Web
Next.js + TypeScript. Owns authenticated student experience: map/calendar/people/chats/notifications, onboarding/profile, hangout creation/management.

## Admin
Small internal web app for reports, users/hangouts, verification issues, suspensions/bans, moderation history.

## Mobile
React Native + Expo + TypeScript. Not first milestone. Do not compromise web architecture to prematurely share UI.

## Backend
Supabase: Postgres, Auth, Realtime, Storage, RLS, functions where privileged logic is needed. Prefer database constraints/server authorization over trusting clients.

## Maps
Mapbox. The map visualizes hangouts, not live people.

## Analytics
PostHog for behavior; Postgres authoritative for domain state.

## Hosting
Web/admin: Vercel. Backend: Supabase. Render is not initial architecture.

## Environments
local, staging, production. Production is never the default dev environment.

## Shared Boundary
Share domain rules, types, validation, data access where compatible, design tokens, config. Do not force web/native to share all components.

Cross-cutting provider/service/auth/database changes require an ADR.
