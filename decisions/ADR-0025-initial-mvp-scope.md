# ADR-0025 — Narrower initial UNC MVP scope

Status: Accepted — product scope only, 2026-09-26
Date: 2026-09-26
Task: TASK-021 (still incomplete)
Reviewed proposal baseline: canonical main `d05fff2b5532632463713eb75c193d2d3a3d6c95`.

## Acceptance evidence

After publishing and independently reviewing [the initial-launch decision package](../docs/operations/TASK-021-INITIAL-LAUNCH-DECISIONS.md), the coordinator asked:

> Do you accept the proposed faster initial-MVP scope: campus-only Hangouts, existing text-based People profiles and refresh-based chats/notifications; defer restricted Hangouts/eligibility, friend context/ranking, peer photos, external analytics/repeat-outcome reports, and the extra ‘happened as described?’/comfort questions? Existing friendship, DMs, private attendance, identity, reporting/blocking, moderation and privacy stay required. This accepts product scope only, not hosted deployment.

The offered choices were “Accept narrower initial-MVP scope,” “Request specific changes,” and “Keep full MVP scope.” The user replied **“yes”** on 2026-09-26 directly to that question. This accepts the named product-scope bundle only. It does not accept the owner/hosted-policy proposals in the same package.

## Decision

For the initial UNC web release:

- Keep campus-visible Hangouts for live-ready verified UNC accounts: approximate public place, participant-authorized private instructions, join/leave, edit/cancel/removal, host/co-host management and voluntary open/close joining. Defer friends-only, invite-only, direct invitations and optional eligibility restrictions; unsupported modes stay fail-closed. Friendship grants no new Hangout permission.
- Keep existing opt-in same-campus People text field allowlists, friend requests/accepted friendships, consent-based DMs and source-authorized current roster access. Defer friend-attendance context in Hangouts/Calendar/People and friend-aware ranking. Preserve chronological Calendar and original authorized saved-map start-time/ID ordering; no new public attendance-history projection or friend-derived badge/order.
- Keep required real identity/profile completion, owner primary photo and the rich owner editor with up to four additional private photos. Defer peer photos and richer peer fields outside the existing People allowlist. This does not relax owner onboarding/photo requirements or grant a peer/operator Storage reader. Hosted owner-photo delivery and preissued bearer/cache policy remain release gates under ADR-0021.
- Keep existing Hangout chat, DM and notification inbox/preferences with their current manual-refresh/polling behavior and fresh source authorization. Defer Realtime, push and optional notification email delivery and instant-update guarantees. Describe update expectations accurately; do not promise backfill. **Actual UNC Auth verification email delivery and deployed HTTPS callback verification remain required**; they are not optional notification delivery.
- Keep private owner-only attendance confirmation/correction and independent report/block flows. Explicitly defer the extra “happened as described?” and “comfortable attending again?” questions and their aggregation. Attendance is a self-report; reports are allegations. Neither is proof of attendance, comfort, safety or a substitute answer to the deferred questions.
- Keep authoritative Postgres records and current private attendance boundaries. Defer hosted external behavior capture, complete behavior-funnel coverage and repeat-attendance/repeat-host reports or aggregate endpoints. Keep hosted analytics capture off. Retained state supports only the outcomes actually recorded; it cannot establish complete views, join/leave history, repeated joins or verified offline attendance. No new query/export permission or private-answer export follows. Preserve the reviewed disposable-local ADR-0023 adapter and event wiring.

The independent accepted ADR-0024 amendment already defers the full gate-coupled hosted large-Hangout warning, map-dampening and private signal creation/review bundle. It remains unchanged: safeguard gate off, no warning/new signals, original authorized saved-map order before the 101-row probe/100-result limit and live revalidation. Voluntary host/co-host open/close joining remains required independently.

## Authority and remaining gates

This ADR amends the broader MVP initial-release requirements only for the named rows. It qualifies ADR-0007's friend ranking/attendance-context delivery timing and the launch requirements in product/UX/engineering specs; it does not replace their accepted social/privacy principles or rewrite local ADR acceptance scopes. Existing local code, migrations and verification remain preserved. Deferred work has durable entries in [BACKLOG](../tasks/BACKLOG.md).

Verified identity, real UNC email delivery/HTTPS callback, owner onboarding/photo editing, friendship, DMs, private attendance, report/block, attendee removal, moderation console/history, suspension/ban, auditable enforcement, location privacy and RLS/permission verification remain required. No blanket MVP waiver or claim of launch readiness is made.

Hosted staffing/response/escalation/appeals, role bootstrap/assignment/revocation/MFA/recovery, per-data retention/deletion/export/legal hold and photo bearer/cache/incident acceptance remain **Proposed/unresolved**. No named person, numeric retention period or URL lifetime is selected. ADR-0019 remains report-only, with exact report-to-sanction binding, conflicts and no broad message/photo/private-location reader. ADR-0021's disposable-local bearer boundary is not accepted for hosted release by this decision. Size-signal operator policy remains separately Proposed.

No runtime, schema, migration application, hosted inventory/configuration/deployment, gate write, SMTP send, analytics transport, DNS action or production/live-user operation is authorized. The exact target/release package still needs review and explicit hosted authorization. [TASK-021 readiness checks](../docs/operations/TASK-021-STAGING-READINESS.md) remain planned/unrun. TASK-021 stays incomplete; no completion-triggered successor follows.

## Consequences

Initial release trades richer targeting, friend-derived discovery, peer presentation, automatic delivery, structured comfort feedback and complete repeat-outcome measurement for a narrower campus coordination loop. These features remain post-launch work, not completed capability. Safety/privacy and owner policies remain genuine release blockers. Documentation acceptance supplies no evidence that deployed behavior matches this scope.
