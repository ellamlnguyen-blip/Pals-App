# Changelog

Record meaningful product, architecture, schema, safety, and release changes—not every commit.

## 2026-09-22 — TASK-011 privacy decision

- User explicitly accepted ADR-0013 for local opt-in People text and a minimal People-only block prerequisite; stage A and B contracts remain bounded. No implementation, peer photo release or hosted authorization follows directly from publication.

## 2026-09-22 — TASK-011 People planning

- Added bounded staged local People contract and Proposed ADR-0013 for explicit opt-in peer text, bilateral People suppression and minimal local block prerequisite.
- Preserved owner-only photos, pending TASK-010 policy, existing Hangout permissions and all hosted gates. No policy acceptance, migration, implementation or CI-green claim.
- User requested GPT-6 Sol / medium at Standard speed (not Fast) for subsequent agents.

## 2026-09-22 — TASK-010 planning

- Established bounded local host/co-host contract and Proposed ADR-0012 permission/role lifecycle matrix, pending explicit user acceptance.
- Require fresh backend implementation and independent security review before a separate management UI stage; no code, migration, access or hosted change at planning.

## 2026-09-22 — TASK-009 local Calendar

- Added saved-only Today/Day and Monday–Sunday Week views, campus-time/DST boundaries, authoritative Joined/Hosting filters and clear cancelled/truncated states.
- Calendar exposes public schedule/place and caller relationship only; existing detail handles joining and private instructions. No safety gate, access policy or hosted permission changed.
- Local workspace, SQL, real built-server HTTP/action and rendered desktop/phone checks passed; fresh review clear. Existing CI action-manifest failure confirmed on pre-Calendar main and tracked separately.

## 2026-09-22 — TASK-008 local saved Hangout discovery and joining

- Added a separate saved campus map/list/detail, with bounded viewport reads, time/open filters, approximate public pins and accessible no-map fallback. Mock examples remain clearly labeled and separate.
- Added caller-bound join/leave, current-ready roster IDs and participant-only private instructions, with server rechecks and conservative recovery for uncertain results. No peer profiles/photos, chat or restricted modes.
- Verified local database and real built-server action/privacy flows, rendered desktop/phone fallback and live Mapbox saved pins. No hosted migration, deployment or gate enablement; launch safety dependencies remain open.

## 2026-09-22 — TASK-007 local Hangout create/edit

- Replaced the unsaved Create entry with a ready-only local form that saves through the TASK-005 backend, then confirms and reopens the owner's Hangout for editing.
- Added explicit approximate public area selection with a Mapbox picker and manual fallback; private instructions remain separate and can be cleared.
- Added same-request recovery after uncertain creation, stale-revision feedback, recent owner access, and real action/privacy regressions. Verified rendered desktop/phone flows. No hosted migration or deployment; map discovery, chat and launch safety remain separate.

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
