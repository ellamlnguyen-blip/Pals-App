# MVP Scope

## Current phase — invite-only UNC pilot before public MVP

[Accepted ADR-0026](../../decisions/ADR-0026-invite-only-pilot-scope.md) introduces a small nominated verified-UNC cohort before public campus launch. “Invite-only” means pilot admission; retained Hangouts are campus-visible within admitted students, not invite-only Hangout visibility. Tester list and enforceable admission mechanism remain separately reviewed/unselected; a hidden link is not enforcement.

Keep existing required UNC identity/onboarding fields and primary owner photo; create Hangout with time/approximate public location and separate participant-authorized private instructions; map/list discovery, join/leave, manual-refresh Hangout chat, host edit/cancel/close/reopen/remove; block/report and named human report handling with report-only moderation, auditable enforcement and all privacy/RLS protections. “Minimal profile” does not reduce existing required fields/photo.

Defer Calendar, dedicated People discovery, friendships, DMs, notifications, co-host UI, attendance confirmation/surveys, optional rich profile/extra photos and analytics. Existing local code/backend safety and role rules are preserved. Deferred routes/actions/APIs must fail closed while retained safety flows remain available; exact gates/manifest need review. Named operators, admission policy/testers, retention/photo policy and exact hosted release authorization remain unresolved. [Pilot preparation](../operations/TASK-021-PILOT-PREPARATION.md) tests are planned/unrun. TASK-021 remains incomplete; no hosted action or public/DNS launch follows.

The sections below preserve the accepted later public MVP and ADR-0025 history; requirements deferred from the pilot return only through separately reviewed release work.

Status: Accepted; current pilot phase under ADR-0026 (2026-09-27), later public MVP under ADR-0025 (2026-09-26)

## Goal
Ship a public UNC web product that proves students will create casual hangouts, discover/join them, coordinate, attend offline, and form repeat social connections.

## Included for later public UNC MVP (ADR-0025)

### Identity/Profile
Actual UNC email verification and deployed HTTPS callback; real name; verified badge; school/year/major/bio; required owner primary photo. Preserve rich owner editing with up to four private extra photos and existing optional fields. People peers receive only the current opt-in same-campus text allowlist; no peer photos or owner-only optional sections are shared.

### Hangouts Discovery and Calendar
Hangouts opens to a map with pan/zoom, pins/clustering, filters, preview/detail and create action. Calendar provides chronological day/week temporal discovery and joined/hosted Hangouts. Device location may orient discovery but is never broadcast. Preserve source-authorized saved-map start-time/ID order with live revalidation.

### Hangouts
Fast creation; loose details; approximate public place plus participant-authorized private exact instructions; campus-visible only; join/leave; voluntary open/close joining; host and host-promoted co-hosts; edit/cancel; source-authorized attendee list and removal; no default capacity requirement. Restricted visibility, invitations and eligibility modes stay disabled and fail-closed.

### People/Friends
Dedicated People tab with opt-in same-campus text browse/search/filter; friend requests and accepted friendships; consent-based DM requests. Existing authorized current roster access remains. No friend-attendance badges/context, friend-aware ranking or new public attendance-history projection.

### Messaging and Notifications
Hangout chat; DM request; 1:1 messaging after reply/acceptance; dedicated Notifications tab with current inbox and category preferences; blocking and fresh source authorization. Existing manual-refresh/polling delivery is accepted with accurate update expectations, without instant delivery or backfill promises. Optional notification email, push and Realtime are deferred; required Auth verification email is not deferred.

### Trust/Safety
Report user/Hangout; block; leave; attendee removal; moderation console/history; suspension/ban; auditable enforcement; private owner-only attendance self-report/correction; location privacy and RLS/permission verification. Hosted moderation staffing/access/MFA/retention/recovery and owner photo bearer/cache policy still require acceptance and evidence. Attendance is not verified physical presence; reports are allegations. No public ratings.

### Measurement
Authoritative Postgres state only where current records support an outcome. Keep private attendance answers owner-only. Hosted external analytics capture stays off; complete behavior funnel, repeat-attendance/repeat-host reports and new aggregate/export endpoints are deferred. Current records do not prove complete views, join/leave history, repeated joins or verified offline attendance. Preserve local analytics implementation under ADR-0023.

## Accepted post-launch deferrals — 2026-09-26

[ADR-0025](../../decisions/ADR-0025-initial-mvp-scope.md) accepts only the named narrower initial-scope bundle: friends-only/invite-only/direct invitations/eligibility; friend context/ranking; peer photos and broader peer presentation; Realtime/push/optional notification email; hosted behavior analytics/complete funnel/repeat-outcome reports; extra “happened as described?” and “comfortable attending again?” questions and aggregation. Rich owner onboarding/editing/photos, real UNC Auth email delivery, existing friendship/DM/attendance/safety/privacy remain required. See durable follow-ups in [BACKLOG](../../tasks/BACKLOG.md). These are deferred capability, not completed features or waived hosted policy.

The independent accepted ADR-0024 amendment defers size/threshold awareness and warning, size-based map dampening and private size-signal creation/review. Keep the safeguard gate off; verify no warning/new signals and original authorized order before the 101-row probe/100-result display limit. Voluntary open/close joining remains required independently. Preserve local TASK-020 work; migration inclusion/dependencies and retained-row handling still need separate hosted review.

## Not MVP
Posts, likes, comments, followers, public friend counts, public ratings, polls, waitlists, paid promotion, commercial Hangouts, organization accounts, cross-campus discovery, sophisticated large-event automation, live user-location broadcasting.

## Launch Model and authorization boundary
The current phase is the admitted pilot above, followed by the later public UNC release, with genuine initial Hangouts created by real students before broad promotion. Scope acceptance does not authorize hosted operations, live seeding/promotion or launch. TASK-021 remains incomplete until its policies, exact release/target authorization, deployed UNC identity, privacy/safety/recovery and actual rehearsal evidence are accepted. No DNS/cutover follows automatically.
