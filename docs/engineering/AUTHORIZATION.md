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
