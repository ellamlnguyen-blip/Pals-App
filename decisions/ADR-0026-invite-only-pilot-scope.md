# ADR-0026 — Invite-only UNC pilot before public MVP

Status: Accepted — product scope only, 2026-09-27
Date: 2026-09-27
Task: TASK-021 (still incomplete)
Repository baseline: canonical main `7f2bea3dc52475748b482490a161f55b9e7789f9`.

## Acceptance evidence

On 2026-09-27, after the coordinator recommended a small nominated verified-UNC pilot before public campus launch, the user replied **“then let's do the pilot scope.”** The accepted scope is the retained/deferred bundle below. This records product timing only; it does not accept a new authentication/admission mechanism or any hosted owner policy or operation.

## Decision

Introduce a bounded invite-only pilot phase before the later public UNC MVP in [MVP](../docs/product/MVP.md). Admission is limited to a small nominated cohort of verified UNC students. Cohort size, tester identities and the enforceable admission mechanism must be named and separately reviewed before release. A hidden link is not access enforcement. “Invite-only pilot” does not mean invite-only Hangout visibility: retained Hangouts are campus-visible within the admitted cohort. Restricted Hangout modes remain disabled under ADR-0025.

| Keep in pilot | Defer from pilot |
| --- | --- |
| Existing real UNC email verification/HTTPS callback and existing required profile/onboarding fields and primary owner photo. Minimal profile means retaining these requirements; no field/photo reduction is accepted. | Optional rich profile sections/editor expansion and extra photos; peer photos remain deferred. |
| Create campus-visible Hangouts with time and approximate public location; separate participant-authorized private instructions; saved map/list discovery and join/leave. | Calendar and dedicated People browse/search/discovery; friend context/ranking and restricted visibility/eligibility/invitations remain deferred. |
| Authorized Hangout chat with accurate manual-refresh expectations and fresh source access. | Friend requests/friendships, DM requests/direct messages, notification inbox/preferences/delivery and Realtime/push/optional notification email. Required Auth verification email is retained. |
| Host edit/cancel, voluntary close/reopen joining and attendee removal. | Co-host UI including promotion/demotion and co-host management entry points; existing backend role and safety logic are preserved. |
| Block/report, named human report handling, report-only moderation console/history, suspension/ban and audited enforcement; private location, identity and RLS protections. | Attendance confirmation/surveys, extra expectation/comfort questions and analytics capture/reports. No measurement or offline attendance proof is promised. |

Existing local code, migrations, tests and accepted backend permissions are preserved. Deferral requires fail-closed feature exposure through routes, server actions and APIs/direct RPCs, not navigation hiding alone, except the explicitly UI-only co-host deferral. Co-host management pages, promotion/demotion controls and application server-action entry points are hidden or denied; existing backend co-host roles, authorized RPC behavior and safety checks remain intact. Changing backend co-host permissions requires a separately accepted authorization contract. Exact gates and migration dependencies must be audited and reviewed in a separate bounded preparation contract. Do not disable a shared gate or remove backend behavior if doing so breaks retained block/report, chat authorization, host removal, moderation audit/enforcement or privacy flows. No new permission or blanket RLS exemption follows from this scope.

## Safety and authority

All essential safety gates remain: verified identity, source-authorized participant/private-location reads, block/report and attendee removal, named accountable human report handling, report-only operator access/conflicts and audit, suspension/ban, retention/deletion/export/legal hold, access bootstrap/revocation/MFA/recovery and photo delivery policy. Named staff, coverage/response, escalation/appeals, retention values and bearer URL/cache lifetime/incident acceptance remain unresolved; none is invented here. Required primary photos retain ADR-0021's unresolved hosted bearer boundary.

ADR-0019's narrow report-only authority remains intact; no broad message/photo/private-location reader is accepted. Accepted ADR-0024's whole safeguard bundle stays deferred with its gate off. Retained rows and migration dependencies still require manifest review. Pilot admission must deny unadmitted verified accounts at applicable application and data/API entry points; its exact mechanism and tests need separate review and any required authorization ADR. Merely being verified UNC is not pilot admission.

ADR-0025 remains the accepted public-MVP scope/history. This ADR changes the earlier phase's timing only for the listed capabilities and does not repeal later public-MVP requirements. Deferred pilot capabilities remain durable backlog work requiring a separately reviewed re-enable/public-release contract.

## Remaining gates and consequences

See [pilot preparation plan](../docs/operations/TASK-021-PILOT-PREPARATION.md). All admission, deferred-route/API, permission/privacy, gate, hosted delivery and end-to-end checks are planned/unrun. Admission policy/tester list, hosted safety owners/policies, exact nonproduction target/origin, migration/gate/app-guard manifest, providers and backup/cleanup require review and explicit hosted authorization before execution.

No code/schema/runtime, migration application, hosted inspection/configuration/deployment, persistent gate write, SMTP send, DNS action, production/live-user operation or successor task occurs in this documentation increment. TASK-021 stays incomplete. The pilot tests a narrower coordination loop; it makes no repeat-social-connection, attendance, analytics or staffed emergency-service guarantee.
