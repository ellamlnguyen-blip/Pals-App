# ADR-0012 — Local Hangout host/co-host management

Status: Proposed — explicit user acceptance required before implementation
Date: 2026-09-22
Task: TASK-010

## Context
Accepted ADR-0010 grants immutable hosts edit, joining-control, cancellation and removal authority, but deliberately rejects co-host assignment and authority. MVP requires host-promoted co-hosts; AUTHORIZATION and USER_FLOWS describe helper editing/removal without specifying the exact permissions. This proposal resolves that gap for disposable local development only. Publication does not accept it or authorize migrations.

## Proposed decision

### Authority
All powers require the existing default-disabled database gate, live ready same-campus access, caller-session authorization and (except the preserved leave/host-removal cases below) a published Hangout. A co-host must also currently be a joined participant. Platform roles convey no bypass.

| Operation | Host | Current co-host | Ordinary participant |
| --- | --- | --- | --- |
| Edit public details and private instructions | Yes | Yes, same accepted field/time bounds | No |
| Open/close joining | Yes | Yes | No |
| Cancel Hangout | Yes | No | No |
| Promote/demote a co-host | Yes | No | No |
| Remove ordinary nonhost participant | Yes | Yes | No |
| Remove another co-host | Yes, atomically clears role | No | No |
| Remove host / transfer ownership | No | No | No |
| Step down from co-host role | Not applicable | Yes, remains joined | Not applicable |
| Leave Hangout | No; cancel instead | Yes, atomically clears role | Existing leave rules |

Host cancellation remains terminal and closes joining. Co-hosts cannot cancel, assign roles, change immutable host/campus, implement restricted visibility/eligibility, invite or moderate chat in this increment. Those systems remain deferred. Existing private-location read rules are unchanged: co-host status alone never grants a read. Demotion or stepping down removes management powers but preserves private access while the person remains a live-ready joined participant; leaving/removal/cancellation/readiness loss revokes future reads.

### Assignment and revocation
Only the host can promote an existing live-ready same-campus joined nonhost. Proposed UX uses immediate host promotion, with no invitation/acceptance inbox in this increment; the promoted participant can step down or leave. No arbitrary account search, automatic join, self-promotion, role inheritance or co-host count requirement. Show confirmation before promotion explaining the powers granted.

Host demotion remains possible even if the target has lost readiness. Leaving or removal clears the stored co-host assignment atomically; a later rejoin is ordinary membership until the host explicitly promotes again. Readiness loss suspends all effective access immediately but does not itself delete the assignment: if readiness returns while the person is still joined and assigned, powers return. Host demotion can permanently revoke that assignment. Cancellation makes every assignment ineffective and prohibits promotion, demotion and step-down. Preserve existing nonhost leave and host removal after cancellation: either clears any retained assignment atomically. Retained records never confer access. Host ownership never changes. Preserve existing host removal of joined or left nonhosts, including nonready targets and cancelled Hangouts; co-host removal is narrower: only a current-ready joined ordinary participant on a published Hangout. Removal of an already removed or absent target fails without change. No historical roster UI is added.

### Roster and privacy
Continue exposing only current-ready joined account IDs to authorized campus readers. Add only a Hangout-scoped host/co-host/participant label for those already-visible IDs, never peer names/photos/profile fields or historical roles. Local management uses those IDs with clear role labels; peer identity display requires a separately accepted scope. Host retains its existing nonpublic membership-state lookup and gains a bounded, host-only current-assignment read on a published Hangout, including assigned IDs that are currently nonready. This exposes only account ID and retained co-host assignment, no profile fields or historical assignments; it exists so the host can discover and demote a suspended/nonready co-host before readiness returns. Other campus readers and co-hosts cannot use this read. Co-hosts may inspect/manage current-ready joined ordinary participants only; no historical or nonready member-state reader is added. Database checks must still reject attempts against a host or co-host supplied by forged ID.

### Atomicity and stale clients
Use a committed additive local migration, never edits to applied migrations. Preserve denied direct client DML, fixed-search-path helpers, caller-derived identity, existing isolation restriction and authoritative RLS.

Role, membership and management mutations serialize on the same Hangout row and recheck live gate/readiness/campus, current actor authority and current target state after waiting for locks. Role changes and removals advance the server-owned Hangout revision; management commands require an expected revision. In particular, replace the existing two-argument removal RPC with a revision-required operation, revoke/drop the old executable signature and update all repository test consumers; no compatibility overload may bypass revision checks. Ordinary leave remains revision-free so a member can leave despite stale management state. Preserve existing public/private atomic editing and create retry behavior. A prior co-host must not commit a queued privileged command after demotion/removal/leave/cancellation wins the lock. Ordinary joins/leaves retain existing behavior; co-host leave also advances the management revision when clearing its role. Revocation reads stay independent of UI claims.

After a lost response, refresh authoritative state before claiming success; never toggle again or replay a destructive action blindly. Stale/conflicting actions require reload/review. Hide private instructions immediately during cancellation or a caller's leave, and drop management controls on denied/uncertain authority until reauthorization. Previously delivered information cannot be recalled; future requests are independently authorized.

### Safety and sequencing
Only after explicit acceptance may separately bounded TASK-010 backend and UI stages proceed. Local committed migrations and disposable local tests would be authorized by acceptance of this proposal and the TASK-010 contract; hosted migrations, hosted enablement, deployment and live student use remain excluded. Preserve APP_ENV=local/validated loopback guards, default-disabled gate, public/private separation and separate mock/saved Hangouts. No friend/restricted-mode, peer-profile, reporting/blocking/moderation or CI-helper scope expansion.

## Alternatives and tradeoffs
- Host-only lifecycle UI now, defer co-hosts: can consume existing accepted authority without a new role policy, but does not complete TASK-010's co-host goal. Requires a separately bounded partial task if selected.
- Co-hosts edit only, with no joining control/removal: narrower delegation but less useful for coordinating attendees. The proposed matrix permits routine coordination while retaining cancellation and role delegation with the host.
- Require co-host acceptance before promotion: protects against unwanted assignment but needs a pending-role workflow. Proposed immediate promotion matches the current host-promoted MVP and supplies step-down; user may choose acceptance instead before implementation.
- Auto-delete roles on any readiness loss: stronger persistence revocation but couples identity/profile transitions to Hangout roles. Proposed live checks suspend authority and allow host demotion without new identity lifecycle machinery.

## Acceptance evidence
None. Proposed only. Record the user's explicit acceptance or requested revisions here before changing authority, schema or application behavior.
