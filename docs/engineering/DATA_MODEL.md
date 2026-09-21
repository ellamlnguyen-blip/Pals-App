# Conceptual Data Model

## University
id, name, slug, allowed email domains, active state, geographic center/bounds. Initial active campus: UNC Chapel Hill.

## User / Profile
Account identity + verified university membership + account status. Profile required: name, university, graduation year, major, bio, primary photo. Optional: four extra photos, interests, down-to-do, music, foods, weird facts/prompts, Instagram, extensible fields.

## Friendship
Pending/accepted relationship. Private coordination infrastructure; no public counts.

## Block
Directional block relation with server-side enforcement.

## Hangout
Core object: university, host, title, optional description, start/end, status, visibility, join state, location, timestamps, large-hangout flags where needed.

Visibility: campus / friends / invite_only. Join state: open / closed. No default capacity.

## Co-host
Hangout-scoped role. Only host may promote/demote co-hosts.

## Platform Admin/Moderator
Platform-scoped role; never conflate with host/co-host.

## Participant
Hangout membership, join/leave/removal state, attendance confirmation.

## Eligibility Rule
General rule model: attribute + operator + values. Example: major IN [Business], gender IN [Woman]. Only deliberately provided profile attributes may be used.

## Hangout Location
Public display name, public coordinates, campus zone, precision, optional private exact details. Public coordinates may be approximate.

## Conversations/Messages
Hangout conversation; direct conversation with request state; messages belong to one conversation.

## Notification
Persisted inbox item with type, target, read state.

## Report / Moderation Action
Report targets user/hangout (and later messages if needed). Moderation actions are auditable.

## Organization
Future entity only; not MVP.
