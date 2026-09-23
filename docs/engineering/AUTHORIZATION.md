# Authorization
Enforce authorization server/database-side wherever possible.

## Roles
User = platform account. Host = creator of one hangout. Co-host = hangout-scoped helper. Moderator/Admin = platform operator. Future Organization Admin = organization-scoped.

## Host
Edit/cancel, open/close joining, promote/demote co-hosts, invite, manage eligibility, remove attendee, manage private meeting details.

## Co-host
Help edit permitted details, invite, manage attendees/chat as policy allows. Cannot promote/demote co-hosts by default.

## Moderator/Admin
Review reports, inspect moderation-relevant records, suspend/ban, disable hangouts, record actions. Access must be auditable.

## Visibility
Campus: eligible verified students at university. Friends: permitted friend graph. Invite-only: invited/permitted users only.

## Blocking
Stop DMs, new friend requests, direct invitations; suppress discovery where reasonable; enforce restricted/private access server-side.

## Location
Exact private details must never be readable by unauthorized users.

## TASK-002 implementation boundary

All five foundation tables have RLS with explicit client grants. Accounts expose only the caller's status. Active accounts can read/update their own profile draft; read their own membership/role; and read active university reference metadata. Suspended/banned accounts retain only their own status read. There is no peer-profile read yet and no platform-role bypass. Future discovery must introduce blocking/privacy checks; future moderation must use an audited privileged workflow before access expands.

Server-owned state (verification, campus assignment, suspension, platform roles) has no authenticated client DML grants. Trigger provisioning ignores signup metadata. Caller-bound helpers use fixed empty search paths and live database state rather than JWT profile claims. `private.has_verified_membership()` requires confirmed current email matching membership evidence, the current exact domain allowlist, active campus and active account under Accepted ADR-0009. No private schema is exposed in the API. Re-run pgTAP RLS checks whenever these rules change.

## TASK-003 onboarding and photos

`get_access_state()` is executable only by authenticated callers and returns their live gate: signed_out, restricted, unverified, onboarding or ready. Ready additionally requires structural profile completion and an existing owned photo. Future feature RLS must enforce this boundary independently; a web page gate is not a substitute for feature policies.

The private `profile-photos` bucket permits reads/inserts/deletes only to its active verified owner. Insert paths must be under that caller's UUID. Updates/overwrite have no policy; upload a new object for replacement. A referenced primary photo cannot be deleted through the client Storage API until detached. Profile assignment checks actual object existence/ownership using a fixed-search-path trigger. No peer visibility or blanket platform-role access is granted. App photo delivery rechecks access on every uncached request; normal Storage bearer URL behavior remains relevant if an owner deliberately creates a signed URL directly.

## TASK-006 owner editor and photo concurrency

Optional fields retain active-owner draft RLS. `/profile`, its actions and every streamed photo slot require live ready access; raw Storage retains the stricter verified-owner policy. Opaque slots `primary` and `0`–`3` resolve only the caller's current references; arbitrary paths/user IDs are not accepted. Every photo response, including denied/missing/failed responses, is no-store.

Photo assignment locks every resulting Storage object `FOR KEY SHARE` through commit. A Storage delete trigger locks the owner profile `FOR UPDATE` and checks the returned current primary/extra set. The existing RLS deletion predicate is defense in depth, not the concurrency guarantee. Conflicting lock orders may deadlock and abort safely; repeatable-read stale tuples cause serialization failure. The app rejects stale `revision` writes and retains entered text. Photo upload, reference assignment and object cleanup remain separate operations: uncertain results ask the owner to reload; failed cleanup leaves private detached uploads and offers retry. Cleanup selects the caller's unreferenced objects server-side (bounded batches of 100); the deletion trigger independently protects concurrent assignments. No broader readers or signed/public URLs are introduced.

## TASK-005 local Hangout boundary

`private.hangout_feature_gate` starts disabled after migration and has no client grants. Every Hangout table read and caller-bound RPC requires that gate plus live ready membership in the row's campus. Hangout access fails closed for repeatable-read and serializable transactions; the API uses read committed so revocations observed after lock waits cannot act on an old readiness snapshot. Enabling the gate is an explicit disposable-local test step, never a seed or hosted default.

Ready campus callers can read published public Hangout rows. The public roster exposes joined account IDs only while each subject is currently ready in that campus; no state or transition timestamps are granted. A host may inspect member state through `get_hangout_participant_state`, and a participant may inspect their own existing state while the public Hangout remains visible. Cancelled public rows are readable only by their ready same-campus host and still-joined members. Private instructions are readable only by ready same-campus host/joined members while published, including when joining is closed; leaving, removal, cancellation or readiness loss revokes future reads. Client reads of peer profiles and photos remain owner-only. No operator or co-host claim adds privileges.

Only the host can edit details, open/close joining, cancel or remove a nonhost. A separate atomic create RPC derives host and campus from the live caller. All direct client DML on the three Hangout tables is denied. Public/private edit and lifecycle RPCs require a matching server revision; join/remove/cancel transitions share a parent-row lock. Restricted visibility/eligibility and exact public precision fail closed. No client route or hosted deployment is part of this boundary; block and reporting enforcement remains a prerequisite before hosted integration.

## TASK-011A local People text boundary

`private.people_feature_gate` defaults false and has no client grants. Caller-bound RPCs alone expose opted-in text to live-ready peers at the same active campus. Browse returns account ID, real name, campus name, graduation year and major; known-ID detail additionally returns bio, interests and down-to-do. The profile and Storage tables retain owner-only RLS. The People RPCs reject stronger transaction isolation, and blocked, opted-out, unready, cross-campus and missing subjects all return no detail row. Search and cursor are bounded; there is no count or hidden-subject filter enumeration.

An active owner can read their own preference and opt out with the People gate disabled or after losing readiness. Opt-in requires both the gate and live readiness. A ready caller may block a currently visible same-campus peer; either direction suppresses People results. The block operation serializes by unordered pair and rechecks authorization after waiting. The active blocker can list only outbound IDs or remove their own direction while the gate is enabled, including after readiness loss. There is no client DML grant on preferences or blocks, no incoming list, and no operator bypass. This local People relation does not alter Hangout access, rosters or private instructions.

## TASK-012A disposable-local friendship boundary

The separate private friendship gate defaults off. Direct caller-bound friendship RPCs and participant readers require that gate and READ COMMITTED; stronger isolation fails closed. Creation and acceptance require both accounts currently ready in the same active campus, opted into People, and free of either-direction People blocks. The actor is always `auth.uid()`; account role claims do not expand access. Tables, gate, ledger and suppression have no authenticated client grants. Participant list/status returns only peer ID, immutable generation, direction and state in pages of at most 24. People text still requires a fresh ADR-0013 projection, and no friendship grants profile/photo or Hangout access.

An active participant may cancel, decline or unfriend an existing generation after readiness or People visibility loss. Suspended/banned accounts cannot manage it. A ready active current participant may block the peer by ID even if that peer is now hidden; the People gate remains required. Block and relationship mutations use the same unordered-pair transaction lock. Creation and acceptance additionally hold shared row locks through commit on both accounts, Auth users, memberships, campuses, profiles, referenced photo objects, People preferences and both feature gates, then recheck eligibility in a fresh READ COMMITTED statement. Revocation begun after that check waits until the relationship mutation commits; revocation committed first is observed and denied. A committed People block deletes that pair even while the friendship gate is off. Unblocking and gate re-enablement do not restore it.

## TASK-013A disposable-local Hangout chat boundary

Both the Hangout and separate chat gates default off. A current ready joined member of a published campus Hangout can read and send through caller-bound RPCs only. The private conversation, messages and creation ledger have RLS, no client grants and no operator bypass. Sending serializes on the existing Hangout parent row and locks both gates and all caller readiness evidence through commit before a fresh authorization recheck. Reading evaluates authorization in the same statement as the page. A later committed revocation denies new reads; a read already in flight may complete. Leaving, removal, cancellation and readiness loss revoke future access without deleting retained messages. Author IDs are projected only for currently ready joined authors; People blocks and friendship do not change this accepted local policy.

## TASK-014A disposable-local DM boundary

The private DM gate defaults off. Every client operation derives the actor from `auth.uid()` and requires an active account. Creation, incoming acceptance and accepted sends require both current ready same-campus People opt-in, bilateral visibility and both gates. The stored formation campus records history, not a permanent access gate: if both participants later share a new active campus and remain eligible, they can accept, read and send; a split-campus pair cannot. Mutations share the friendship unordered-pair lock; eligibility mutations additionally hold both gate rows and live readiness evidence through commit, then recheck in a fresh READ COMMITTED statement. Current active participants can read minimal ID/state and clean up a pair when People eligibility is lost, but message bodies require current bilateral eligibility. A People block terminates an active DM pair even with the DM gate off; its hidden-peer exception requires current active participation and a ready blocker. Terminal records have no client reader. No DM private table, admin role or Realtime channel grants a bypass.

## TASK-015A disposable-local notification boundary

The private notification gate starts off. The private gate, preferences and ledger use RLS and have no client table grants. Authenticated callers can use only owner-bound preference read/write, a 24-item keyset inbox page and idempotent mark-read RPC. All require READ COMMITTED, the notification gate and an active account; preference access remains possible after readiness loss. Suspended or banned accounts have no inbox access, and platform roles add no bypass. Each item is reauthorized against its live friendship or active DM generation and current People/DM eligibility. Revoked items project only ID, generic unavailable label, server time and read state. Destination access must be checked again by its source route. The web UI and Hangout/chat hooks are later stages.

Source hooks take their existing retry/pair/eligibility locks, then the notification gate row `FOR SHARE`, then a per-recipient advisory transaction lock. Preference writes take the gate row before the same recipient lock and recheck the gate and active owner afterward. A committed mute or gate disable first suppresses an optional row; an event holding those locks first may commit its row before the change. Disabled notification delivery never vetoes a source mutation or replays missed events.
