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

Server-owned state (verification, campus assignment, suspension, platform roles) has no authenticated client DML grants. Trigger provisioning ignores signup metadata. Caller-bound helpers use fixed empty search paths and live database state rather than JWT profile claims. `private.has_verified_membership()` requires confirmed current email matching membership evidence, explicit verification, active campus and active account; it does not assert an accepted enrollment policy. No private schema is exposed in the API. Re-run pgTAP RLS checks whenever these rules change.
