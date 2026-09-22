# ADR-0010 — Hangout foundation and private-location authorization

Status: Proposed — explicit acceptance required before migrations
Date: 2026-09-22

## Context
Accepted ADR-0004 establishes casual, open-by-default Hangouts without required capacity. Product/data/authorization/location specifications require campus/friends/invite visibility, host/co-host roles, membership and protected exact meeting details but do not define concrete lifecycle transitions, removal/re-entry, co-host powers or exact-location revocation. Existing identity and photo records are owner-only; friendship, invitations, blocks and eligibility data are not implemented. TASK-005 must not infer their permissions or expand peer-profile access.

## Proposed Decision (not yet accepted)
1. Limit this increment to campus-visible, unrestricted Hangouts. Database constraints/operations reject all restricted modes and eligibility payloads; do not merely hide controls. Future modes require accepted policies plus authoritative friendship/invitation/profile data and automated denial tests.
2. Use a Hangout row with UUID ID/university/host references, required nonblank title and start timestamp, optional description/end timestamp, published/cancelled lifecycle, open/closed joining (default open), campus visibility and server-owned created/updated timestamps. End, if present, must follow start. Immutable host and campus are derived from the live caller, not trusted client inputs. No stored draft, attendance/completed inference, host transfer or physical client deletion. Cancellation closes joining and is terminal for this increment. Exact text limits and permitted time ranges must be resolved before acceptance.
3. Store public place label, public latitude/longitude, optional campus zone and explicit precision separately from optional private exact details. Validate coordinate ranges. Public coordinates must be deliberately provided as a safe approximate meeting area; do not copy exact coordinates into public fields or derive a predictable offset that promises privacy. Store private meeting instructions separately, not hidden columns in an otherwise publicly selectable row. No user/device location storage.
4. Use one participant row per Hangout/account, with joined/left/removed state and server-owned transition timestamps. Proposed host invariant: creator is atomically a joined participant and cannot leave or be removed while host; cancel instead. A participant may leave; a left participant may rejoin a published/open Hangout after all live access checks. Removed participants cannot self-rejoin. Removal history must not be erased by an upsert. Attendance confirmation is deferred.
5. Proposed minimal role boundary: immutable host ownership authorizes edit/cancel/open-close/private-detail management and nonhost removal. Reserve co-host design for TASK-010; reject client co-host assignment and grant no co-host privileges now. Platform admin/moderator membership gives no automatic Hangout/private-location bypass. Audited moderation is a later task.
6. Require live ready access and matching campus for every client operation. Published campus Hangouts and current joined participant account IDs may be read by those campus readers, consistent with accepted public attendance; no peer profile/photo or historical membership disclosure. Proposed cancelled-record access: host and still-joined participants only. Host and still-joined participants may read private details only while published and live-ready; leaving/removal/cancellation/readiness loss revokes future reads immediately. Previously received information cannot be recalled. No time-based expiry is inferred while the Hangout remains published.
7. Use least-privilege grants/RLS and transactional database operations for identity-bound state transitions. Prevent generic row updates from bypassing invariants; test public API paths and stale callers. Closed joining blocks new joins but does not evict current participants. Serialize conflicting join/remove/cancel transitions so a losing operation cannot restore revoked access.

## Required Resolution Before Acceptance
These proposals are reviewable options, not accepted policy. Record explicit approval or amend them before implementation:
- Lifecycle: published/cancelled only, no drafts/restore/automatic completion; timestamp/text bounds, treatment of past start times and indefinite private-detail access without an end time.
- Host membership invariant and participant history retention; whether cancellation keeps membership and which past records remain readable. Confirm the proposed rejoin/removal rule and who may reverse removal in a later task.
- Co-host deferral versus a concrete permission matrix. Existing wording “as policy allows” is insufficient to grant edit/invite/removal powers.
- Exact location: confirm participant-only (plus host) access, cancellation revocation and whether an event-end expiry is required. Confirm acceptable public precision and whether free-text residences require additional safeguards; coordinate bounds cannot prove a location is safe to publish.
- Blocking: accepted specs require server-side separation/private access, but block data and precedence between host/participant blocks do not exist. This proposal grants no claim of block-aware launch readiness. Decide whether local foundation may precede TASK-016 with integration/launch gated, or whether a separately bounded block prerequisite must land first. Do not expose live Hangout flows under an invented block policy.
- Confirm public current participant IDs versus roster restrictions, including suspended participants and cancelled Hangouts, without expanding owner-only profiles/photos.

Acceptance must settle these questions or explicitly remove the affected capability with a tested deny rule. If answering them broadens TASK-005, split the work and revise its contract first. Approval of the planning task does not accept this ADR.

## Consequences
Separating private details reduces accidental disclosure through public reads/embeds. A narrow campus-only implementation can be tested without speculative social rules. Requiring readiness in database policies preserves immediate revocation independently of page guards. Deferred restricted modes/co-host/block/moderation behavior require later reviewed contracts; this backend foundation is not launch-ready by itself. No migrations or hosted changes are authorized by this proposed record.

## Alternatives
- Implement all visibility/eligibility modes now: rejected for this proposed increment because authoritative supporting data/policies are absent and the scope would grow materially.
- Store exact details on the public row and omit them in the UI: rejected; client query shape cannot provide database confidentiality.
- Implement block/co-host/moderation subsystems inside TASK-005: defer to explicit bounded prerequisite tasks if acceptance requires them.
- Delay the entire Hangout foundation until all social/safety features exist: viable if the user requires block-aware behavior before any local foundation; choose explicitly at acceptance.
