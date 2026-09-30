# MVP Scope

## Current phase — open verified UNC MVP

The user has directed that the product ship as an open UNC MVP, not an invite-only pilot. Every active account with confirmed UNC email, current UNC verification, completed required onboarding, and a primary photo may use the MVP. There is no separate pilot roster/admission requirement. Accounts from other campuses, unconfirmed accounts, incomplete profiles, suspended accounts, and banned accounts remain denied. See [ADR-0028](../../decisions/ADR-0028-open-verified-unc-mvp.md).

The launch scope includes verified identity, profiles, map and calendar Hangout discovery, Hangout creation/joining and management, People discovery and friendship, Hangout chat, consent-based DM requests and messaging, in-app notifications, safety/reporting/moderation, attendance confirmation, and privacy-scoped analytics. These are MVP capabilities, not later-product scope. Existing authorization and feature gates must be brought into alignment by reviewed migrations and end-to-end tests; changing a page-level gate or hosted toggle alone is insufficient.

Preserve campus-scoped RLS, current readiness checks, user blocks, source authorization, approximate public location, private exact instructions, consent for People visibility and DM formation, auditable moderation, and all suspension/ban rules. Analytics remains opt-in and limited to its accepted privacy-safe schema; external hosted capture stays disabled until its existing region/access/deletion/IP-retention requirements are verified. One person named in both primary and backup moderator fields is not independent backup coverage.

Status: Product scope accepted by the user's explicit instruction (2026-09-30); technical access changes and hosted release remain in progress. See TASK-027 and the current release status in [CURRENT_STATE](../operations/CURRENT_STATE.md).

## Goal
Ship a public UNC web product that proves students will create casual hangouts, discover/join them, coordinate, attend offline, and form repeat social connections.

## MVP capabilities

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

## Remaining post-MVP deferrals — reconciled 2026-09-30

[ADR-0025](../../decisions/ADR-0025-initial-mvp-scope.md) remains relevant only for restrictions the user did not move into this MVP: friends-only/invite-only/direct invitations/eligibility modes; friend context/ranking; peer photos and broader peer presentation; Realtime/push/optional notification email; complete behavioral funnels and repeat-outcome reports; and extra post-attendance survey questions/aggregation. Existing People, friendship, DM, in-app notifications, attendance, and privacy-scoped analytics are MVP capabilities under ADR-0028. See durable follow-ups in [BACKLOG](../../tasks/BACKLOG.md). These remaining deferrals do not waive authorization or privacy requirements.

The independent accepted ADR-0024 amendment defers size/threshold awareness and warning, size-based map dampening and private size-signal creation/review. Keep the safeguard gate off; verify no warning/new signals and original authorized order before the 101-row probe/100-result display limit. Voluntary open/close joining remains required independently. Preserve local TASK-020 work; migration inclusion/dependencies and retained-row handling still need separate hosted review.

## Not MVP
Posts, likes, comments, followers, public friend counts, public ratings, polls, waitlists, paid promotion, commercial Hangouts, organization accounts, cross-campus discovery, sophisticated large-event automation, live user-location broadcasting.

## Launch Model and authorization boundary
The current target is open access for ready, verified UNC accounts, with product discovery and interactions operating on real saved Hangouts rather than mock examples. Scope acceptance does not waive deploy, database, safety, moderation or rollback checks. The TASK-027 preview/staging checks and exact nonproduction target review must pass before applying the hosted all-UNC access change. No DNS/cutover follows automatically.
