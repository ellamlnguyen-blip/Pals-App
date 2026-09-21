# Changelog

Record meaningful product, architecture, schema, safety, and release changes—not every commit.

## 2026-09-21 — TASK-002 local Supabase foundation

- Added reproducible identity/profile/university/platform-role migration and local UNC seed without an invented enrollment/domain policy.
- Enforced owner-only profile RLS, client escalation prevention, independent email/campus/profile/status state and email-bound verification evidence.
- Added real local pgTAP permission checks, repeated reset verification, schema lint, database CI configuration and backend-target validation.
- Established a temporary local Lima/Docker runtime; no hosted staging, production, DNS or deployment was used. Staging verification and Proposed ADR-0009 remain pending.

## 2026-09-21 — TASK-001 monorepo bootstrap

- Added runnable Next.js web/admin development placeholders and the reserved mobile workspace.
- Established six shared package boundaries, provisional light/dark design tokens, and local-first environment parsing.
- Added pinned pnpm dependencies, lint/typecheck/format/test/build commands, and a GitHub Actions baseline.
- Verified frozen install, local CI commands and desktop/mobile rendering. No hosted CI or deployment was performed.

## 2026-09-21 — Project reset

- Reframed the product around casual user-created Hangouts.
- Locked UNC as the first launch campus with multi-campus architecture.
- Locked map-first discovery and Calendar, People, Chats, Notifications navigation.
- Chose web-first delivery followed by Expo iOS/Android.
- Chose Supabase, Mapbox, Vercel, PostHog, monorepo, migration-only schema changes.
- Introduced ADR, task-contract, handoff, and current-state systems for agent coordination.
