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
