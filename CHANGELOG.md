# Changelog

Record meaningful product, architecture, schema, safety, and release changes—not every commit.

## 2026-09-22 — TASK-003 auth and required onboarding

- Implemented signup/signin/signout, PKCE email confirmation/resend, secure SSR sessions and server-side live account gates.
- Applied Accepted ADR-0009's exact UNC email policy; verification copy means email ownership, not independent enrollment evidence.
- Added required-profile onboarding and private owner-only primary photos with actual Storage ownership checks, immutable objects, and referenced-photo deletion protection.
- Added local Auth/mail/Storage/web callback integration tests, expanded SQL checks, dual-architecture dependencies and consistent local network flags across resets.
- Foundation is now verified against the authorized hosted development target and baseline GitHub CI. Hosted SMTP and deployed HTTPS callback validation remain separate launch prerequisites; no domain cutover or map/social/messaging work included.

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
