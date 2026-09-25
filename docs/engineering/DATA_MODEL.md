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

For disposable-local TASK-018A, `private.attendance_answers` stores one self-reported boolean, server revision and answer time per retained `(hangout_id, account_id)` participant row. The separate `private.attendance_feature_gate` defaults false. Neither table has a client grant; no attendance column or peer response is added to public Hangout or participant rows. The latest answer remains after leaving or removal and becomes read-only after the 30-day response window, subject to the owner read gate and moderation disable.

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

## TASK-016B disposable-local reports

`private.safety_reports` holds one allegation per accepted submission: opaque receipt UUID, server submission time, reporter UUID, resolved user or Hangout UUID, normalized category, optional trimmed narrative, and minimal provenance kind/reference UUID. A retained-host route records the caller-owned Hangout ID as provenance and the immutable host as a user target. The separate `private.safety_report_requests` ledger binds `(reporter_id, request_id)` to an original-input fingerprint and receipt. Both private tables have RLS and no client or platform-role table grants. Neither target nor source details are copied into a receipt. Production retention, deletion, review, appeals and moderation actions remain outside this local schema.

## Organization
Future entity only; not MVP.

## TASK-002 implementation

Migration `20260921000100_identity_foundation.sql` implements universities, accounts referencing `auth.users`, current university memberships, editable profile drafts and platform roles. Membership is separate from the account and profile, with one current campus per account. `verified_at` and `verification_email` are assigned together only by trusted database operations. The latter binds verification to the current Auth email; email changes invalidate the helper check. Campus transfer/verification endpoints remain unimplemented.

Profile `is_complete` derives presence of required draft fields; it is not evidence of real identity. TASK-003 adds actual private Storage object ownership validation and a live gate that requires the object still exist. Rich optional sections and map geography remain for their bounded tasks. Platform role is moderator/admin only, separate from all future Hangout roles. See `supabase/README.md` for grants and Accepted `ADR-0009` for the confirmed-email evidence policy.

Migration `20260922000100_verified_onboarding.sql` installs the approved UNC allowlist, a trusted Auth-confirmation membership trigger, private photo bucket/policies, profile-photo ownership trigger, and caller-bound access state RPC. It reconciles existing confirmed accounts against current email evidence. Server-owned state remains non-writable by clients.

## TASK-006 owner enrichment (ADR-0011)

Migration `20260922000200_owner_profile_enrichment.sql` adds typed owner-only optional fields: interests/down-to-do (ordered unique arrays, up to ten trimmed 1–80 character entries), nullable favorite music/foods/weird fact (1–500 characters), Instagram handle (1–30 ASCII letters/digits/periods/underscores) and up to three exact question/answer prompt objects (120/500 characters). Blank inputs normalize in the app to null/empty arrays; direct writes must meet the same database shape/bounds/whitespace constraints. No arbitrary extensible JSON or new identity attributes.

`additional_photo_paths` holds zero to four ordered distinct owned private objects, distinct from primary. A server-owned monotonically increasing `revision` supports compare-and-swap editor saves. Optional fields and extras do not participate in `is_complete`. Direct owner draft writes can still revoke readiness by clearing required data; the ready editor does not permit this.

## TASK-005 local Hangout foundation (ADR-0010)

The local migration adds `hangouts`, `hangout_participants` and separate `hangout_private_locations`. Only campus-visible unrestricted Hangouts are representable. Public place coordinates are host-supplied approximate areas; private instructions never appear in the public Hangout row. A creator is atomically the joined host. A participant can leave and rejoin while open, but removal is terminal for that participant. Cancellation is terminal, closes joining and makes private details unreadable to client roles.

`hangouts.revision` advances on detail and lifecycle writes. The database operations require an expected revision for edit, joining control and cancellation. Creation uses an owner-scoped request UUID; the private request ledger stores only a canonical payload digest and Hangout identifier, with no client grants. A retry of the same normalized request returns the original ID after current authorization checks, even after the original start passes. Public/private create and edit are atomic. These records have no automatic end-time expiry or attendance inference.

## TASK-011A local People privacy records (ADR-0013)

`private.people_feature_gate` is a singleton defaulting disabled. `private.people_preferences` stores a sparse per-account boolean: no row means opted out. `private.people_blocks` stores a directional `(blocker_id, blocked_id)` pair without client table access. Caller-bound functions provide owner preference, bounded outbound blocked IDs, desired-state block changes and allowlisted text browse/detail. The profile table remains the sole source of shared text; no peer-readable profile copy or photo reference is introduced. These blocks affect only the local People directory, not Hangouts or future messaging.

## TASK-012A disposable-local friendship records (ADR-0014)

`private.friendship_feature_gate` defaults disabled. `private.friendships` stores one canonical unordered account pair, requester, campus at formation, server-generated generation UUID and pending/accepted state. `private.friendship_create_requests` retains each caller-scoped creation UUID and original generation after teardown, preventing an old retry from opening another request. `private.friendship_suppression` stores directional decline/cancel suppression. All three tables have RLS and no client access.

Caller-bound RPCs create, list/status, accept, decline, cancel and unfriend. New creation and acceptance require current ready same-campus People opt-in and bilateral visibility. Existing active participants retain ID/status and may clean up after readiness or opt-in loss. `set_people_block` atomically deletes the pair under the shared unordered-pair lock, including while the friendship gate is off. A ready current participant may block a now-hidden peer by ID. Unblock never restores a pair. No friend relation changes Hangout authorization or grants peer profile/photo access.

## TASK-013A disposable-local Hangout chat records (ADR-0015)

One private conversation belongs to a saved Hangout and is inserted atomically on first authorized send. Private messages retain a server ID, immutable trimmed text, author, timestamp and per-Hangout monotonic sequence. A private `(Hangout, author, creation UUID)` ledger maps exact retries to one message and payload digest. The separate chat gate defaults disabled. None of these four private tables has a client grant or direct REST representation. Current joined ready members use caller-bound send/read RPCs; cancellation and membership/readiness revocation retain records privately while denying new client access.

## TASK-014A disposable-local DM records (ADR-0016)

`private.dm_pairs` retains a server-generated generation per unordered pair; a partial unique index permits only one pending or accepted generation. Terminal states are ignored, withdrawn, closed and blocked. `private.dm_messages` stores immutable trimmed plain text, author, server time and per-generation sequence. `private.dm_retries` retains caller-scoped UUID keys and payload fingerprints for create, atomic reply and send. `private.dm_suppression` retains the initiator-to-recipient direction after ignore, withdrawal or close. The separate `private.dm_feature_gate` defaults false. All five tables have RLS and explicit client revokes. Only caller-bound projections expose current active state and currently authorized text; terminal evidence stays private.

## TASK-015A disposable-local notification records (ADR-0017)

`20260923000400_local_notifications_social.sql` adds a separate default-disabled private notification gate, sparse per-owner category preferences (absence means enabled), and a private item ledger. The ledger retains a server source kind, immutable generation or message ID, transition code, recipient, actor, target generation, server time and optional read time. It stores no body, profile copy, location or link. A unique `(recipient, source kind, source ID, event code)` identity survives friendship deletion and distinguishes a later generation. TASK-015A hooks friendship and DM mutations.

## TASK-015B disposable-local Hangout notification sources (ADR-0017)

`20260923000500_local_notifications_hangouts.sql` extends the constrained ledger with Hangout edit, cancellation, join/leave, and Hangout-chat message codes. One server UUID identifies each committed edit, cancellation, join or leave transition across its recipients; an immutable saved message ID identifies a chat event. The target is the Hangout ID. The ledger retains no changed fields, private instructions, message body, location, roster snapshot, profile copy or URL. Cancellation is essential and ignores the optional `hangout_updates` mute. The migration is additive and keeps TASK-015A social identities and retention.

## TASK-016A local block provenance

`private.people_blocks` remains the only block relation. `private.hangout_peer_provenance` stores one immutable unordered peer/Hangout overlap row, without names, messages, location or timestamps. New authorized joins and every departure/removal record current joined overlap before an interval can be overwritten. Existing retained participant intervals prove pre-migration overlap only when their times actually intersect; an arbitrary shared Hangout ID does not. Immutable host ownership of a Hangout the caller joined and terminal DM generations are independent evidence. `private.safety_reconciliation_effects` is an empty, private scratch relation used only inside the atomic local migration reconciliation and its deterministic rerun. No client or moderator receives SELECT on either relation. `public.list_my_retained_hangout_ids` reads the caller's existing retained membership directly and projects only Hangout ID and own state.
