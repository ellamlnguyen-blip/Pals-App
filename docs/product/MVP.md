# MVP Scope
Status: Accepted

## Goal
Ship a public UNC web product that proves students will create casual hangouts, discover/join them, coordinate, attend offline, and form repeat social connections.

## Included
### Identity/Profile
UNC email verification; real name; verified badge; school/year/major/bio; primary photo; up to four extra photos; optional interests, down-to-do, favorite music/foods, weird facts/prompts, Instagram; extensible profile sections.

### Hangouts Discovery
Hangouts tab opens to map; pan/zoom; pins; clustering; filters; preview/detail; friend-attendance context; create action; device location may orient discovery but is never broadcast.

### Calendar
Day/week temporal discovery, joined/hosted hangouts, friend context.

### Hangouts
Fast creation; loose details; approximate public place + optional private exact details; campus/friends/invite-only; optional eligibility filters; join/leave; open/close joining; host + host-promoted co-hosts; edit/cancel; attendee list; attendee removal; no default capacity requirement.

### People/Friends
Separate People tab; browse/search/filter; DM request; friend requests; friendships; friend-aware hangout ranking; public attendance visible for public hangouts; restricted hangouts inherit their visibility.

### Messaging
Hangout group chat; DM request; 1:1 messaging after reply/acceptance; blocking enforcement.

### Notifications
Dedicated Notifications tab; functional notifications; category preferences. Friend-activity push notifications may come after first launch.

### Trust/Safety
Report user/hangout; block; leave; attendee removal; basic admin console; moderation history; suspension/ban; attendance/safety feedback.

### Measurement
Created/viewed/joined/left/cancelled/attendance-confirmed/friend-request/accepted/repeat attendance/repeat host.

## Not MVP
Posts, likes, comments, followers, public friend counts, public ratings, polls, waitlists, paid promotion, commercial hangouts, organization accounts, cross-campus discovery, sophisticated large-event automation, live user-location broadcasting.

## Accepted initial-release deferral — 2026-09-26
Under the accepted ADR-0024 amendment, the hosted large-Hangout safeguard bundle is post-launch: size/threshold awareness and host warning, size-based map dampening, and private size-signal creation/review. Its gate stays off for initial MVP; saved-map discovery retains its original authorized start-time/ID order. The absent signal consumer is not a launch blocker for this narrower scope. Basic voluntary open/close joining remains included independently, as do all other Trust/Safety and release requirements. Disposable-local TASK-020 work is preserved; no hosted migration or enablement is authorized by this scope decision.

## Launch Model
Public UNC release, but do not launch an empty map. Seed genuine initial hangouts created by real students before broad promotion.
