# Changelog

Record meaningful product, architecture, schema, safety, and release changes—not every commit.

## 2026-09-22 — TASK-005 local Hangout backend

- Added campus-only Hangout, participant and separate private-instruction records under Accepted ADR-0010, behind a default-disabled database gate.
- Added live-ready campus permissions, host transitions, current-ready rosters, atomic public/private saves, retry-safe creation and stale-revision rejection.
- Verified database permissions, revocation, transaction rollback, real HTTP/private embeds and concurrency alongside existing auth/profile safeguards.
- Backend only; no hosted migration/deployment or live user-facing flow. Blocking and remaining safety gates still precede hosted enablement.

## 2026-09-22 — TASK-006 owner profile enrichment and photos

- Added the owner profile editor from the avatar menu, with required-detail edits and optional interests, activities, favorites, fact, prompts and Instagram handle.
- Added primary replacement and up to four additional private photos, database-enforced ownership/limits, concurrent assignment/deletion protection and stale-editor rejection.
- Added honest failure recovery and protected cleanup for upload/save response loss, responsive forms, keyboard focus and visible per-photo feedback.
- Verified local workspace, database permissions, real HTTP/actions/failures/concurrency and rendered desktop/mobile flows. No peer access, hosted migration or deployment.

## 2026-09-22 — TASK-004 Hangouts map shell

- Replaced the authenticated readiness screen with a responsive Mapbox shell while retaining the live verified/profile-complete access gate.
- Added clearly labeled approximate public-campus mock Hangouts, accessible pins/clusters and previews, example filters, and a no-publish Create shell.
- Added optional one-shot local-only coarse location, map loading/token-missing/error/retry states, and shared map design tokens.
- Verified repository checks, local Auth/Storage/web gates and actual offline Mapbox renderer interactions. Final live Mapbox basemap and authenticated desktop/phone interactions pass using the existing user-authorized palsapp public token, stored only in ignored local environment. No hosted auth, SMTP, database or production changes.

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
