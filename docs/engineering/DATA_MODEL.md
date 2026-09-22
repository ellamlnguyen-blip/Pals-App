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

## TASK-002 implementation

Migration `20260921000100_identity_foundation.sql` implements universities, accounts referencing `auth.users`, current university memberships, editable profile drafts and platform roles. Membership is separate from the account and profile, with one current campus per account. `verified_at` and `verification_email` are assigned together only by trusted database operations. The latter binds verification to the current Auth email; email changes invalidate the helper check. Campus transfer/verification endpoints remain unimplemented.

Profile `is_complete` derives presence of required draft fields; it is not evidence of real identity. TASK-003 adds actual private Storage object ownership validation and a live gate that requires the object still exist. Rich optional sections and map geography remain for their bounded tasks. Platform role is moderator/admin only, separate from all future Hangout roles. See `supabase/README.md` for grants and Accepted `ADR-0009` for the confirmed-email evidence policy.

Migration `20260922000100_verified_onboarding.sql` installs the approved UNC allowlist, a trusted Auth-confirmation membership trigger, private photo bucket/policies, profile-photo ownership trigger, and caller-bound access state RPC. It reconciles existing confirmed accounts against current email evidence. Server-owned state remains non-writable by clients.
