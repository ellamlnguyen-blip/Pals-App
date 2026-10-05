# Security and Safety

## 2026-10-05 launch staffing amendment

The current explicit user decision makes Ella Nguyen (`ella_nguyen@unc.edu`) the sole launch moderation owner. No backup moderator role or independent backup coverage is required for the initial launch. Least privilege, MFA/recovery, report response/retention handling, incident contact, immutable audit, conflict checks, RLS, blocks, suspensions and bans remain required. This staffing decision grants no hosted role or gate by itself.

## Current pilot phase — 2026-09-27

[Accepted ADR-0026](../../decisions/ADR-0026-invite-only-pilot-scope.md) introduces a nominated verified-UNC pilot before the later public MVP. Product timing changes only: existing required identity/profile/primary photo, Hangout map/list/create/join/leave/chat/host management and all block/report/removal/report-only moderation/audit/enforcement/private-location/RLS protections remain. Calendar/People discovery/friendship/DM/notifications/co-host UI/attendance surveys/optional rich profile/extra photos/analytics are deferred from pilot exposure. Existing backend role, teardown and evidence-retention rules below remain preserved.

Admission mechanism/tester list and hosted operator/staffing/MFA/retention/recovery/photo bearer policy remain separately reviewed/unresolved. Scope acceptance creates no grant, RLS bypass or hosted authority. Deferred routes/actions/APIs must fail closed without breaking retained safety; exact shared gate dependencies and tests need a narrower reviewed contract. Named human report handling is required but not yet assigned; no response commitment is invented. Earlier initial-release amendments below describe the later ADR-0025 public phase.

Because Pals helps strangers meet offline, safety is core architecture.

Launch requirements: verified identity, report/block, attendee removal, moderation console, suspension/ban, moderation audit trail, location privacy, RLS tests. Under the user's 2026-10-05 decision, Ella Nguyen (`ella_nguyen@unc.edu`) is the sole launch moderation owner; a backup moderator is not required. Before student invitations, verify her least-privilege role, MFA/recovery, audit visibility, report response/retention handling and incident contact. Existing moderator conflict checks, immutable audit and source authorization are unchanged.

Never expose private exact location to unauthorized users.

## Large Hangouts
Initial MVP scope amended by explicit user acceptance on 2026-09-26: defer the gate-coupled hosted threshold/size warning, size-based map dampening, and private signal creation/review bundle to post-launch; keep its safeguard gate off. The absent operator consumer is not a launch blocker for this narrower scope. Basic voluntary open/close joining remains MVP under existing host/co-host authority independently of the safeguard gate. This is an explicit exception to the original large-Hangout MVP requirement, not a claim of staffed review. All other launch safety requirements above remain required. See the accepted amendment in ADR-0024. Do not build complex mass-event tooling before usage proves it.

Accepted ADR-0024 and TASK-020A implement the disposable-local backend primitives: a provisional 25-current-joined threshold (including host), a host-only coarse size flag, one private unconsumed observation signal and saved-map ordering by viewer-visible roster size before the 100-result display limit. Close joining remains voluntary under existing authority. The signal is not a safety allegation, sanction, operator queue or staffed review. TASK-020B subsequently completed the disposable-local student warning/control. This local implementation is preserved. Future hosted safeguard enablement still requires an accepted operational review consumer, access/retention/response policy, reviewed implementation and target-specific authorization; migration inclusion itself remains separately reviewed even with the gate off.

Commercial promotion is not allowed in MVP.

Eligibility restrictions must use deliberately provided profile attributes and be transparent.

Post-Hangout initial release: private owner attendance self-report/correction and independent report/block. Accepted ADR-0025 (2026-09-26) explicitly defers “happened as described?” and “comfortable attending again?” questions and aggregation to separately bounded post-launch privacy/moderation work. Neither attendance nor reports supplies those answers or a safety finding. No public ratings. All other launch safety requirements remain required; no hosted staffing/access/MFA/retention/recovery or photo-bearer policy is accepted by the scope decision.

## TASK-014A local DM retention and consent

Direct-message requests and accepted text use the default-disabled disposable-local gate from ADR-0016. Client roles cannot read or write raw pairs, messages, retries or suppression. Current participants receive only active pair metadata, and bodies require fresh bilateral People eligibility. Ignored, withdrawn, closed and blocked generations remain private evidence without a client reader. A People block atomically ends an active DM pair, but this local rule does not change Hangout or Hangout-chat access. Hosted retention, moderator access and global separation remain separate decisions.

The TASK-014A People-only limitation above describes the earlier local boundary; TASK-016A supersedes it for confirmed blocks.

## TASK-016A local blocking

A confirmed block now affects shared Hangout attendance and private coordination. The blocker-host removes a joined target; a nonhost blocker leaves every Hangout still shared with the target. The target host remains joined and ownership never transfers. The same deterministic separation applies to cancelled retained rows. Unblock removes only the caller's direction and restores no friendship, DM generation or attendance. Safety transitions emit no ordinary source notification and never file an automatic report. Existing blocks remain enforced with management/source gates off. The local web disables old block-write controls and both old server write paths until TASK-016C provides confirmation of these effects. Exact outbound-ID read and unblock remain available when the safety gate is on. This stage adds no report, moderation reader, hosted operation or physical-separation guarantee.

## TASK-016B local reporting

An active student may submit a private allegation about an authorized user or Hangout, or rely on retained caller-specific evidence after removal, cancellation, blocking or readiness loss. A removed attendee can submit the retained Hangout ID to report its host without receiving a host lookup result. The confirmation contains only an opaque receipt and server time. Source text, profile/photo, exact place, roster and messages are never copied into the report or shown by the submission API. A report changes no relationship, attendance or notification and is not a moderation finding. This increment has no staffed review, emergency response, report reader or hosted retention policy.

## TASK-017B2 local Hangout disabling

The default-off local moderation backend can now commit a one-way disable for the exact reported Hangout, separately from ordinary cancellation. Source authorization removes future student discovery, detail, roster, private instructions, chat, notification destinations and mutations, including direct REST and old RPC access. Private reports, participation and chat evidence remain retained; an active caller's safety-gated own ID/state recovery and evidence-qualified private report are the narrow exception. A read already in flight before disable commit may finish, but later reads are masked. Local tests exercised cancelled targets, block reconciliation, concurrent writers and real API routes. This is not a staffed or hosted moderation service, and production retention, appeals and operator operations remain undecided.

## TASK-018A local attendance self-report

Attendance is a private owner self-report. A retained participant can answer through a caller-bound RPC even after a block, leave, removal or readiness loss, without gaining Hangout detail or peer access. A moderation-disabled Hangout and a suspended/banned account deny owner reads and writes. A negative answer never creates a report or safety finding. The default-off local gate and private relation have no client table grants; the backend adds no notification, analytics event or hosted surface.

## TASK-021A1a intermediate admission authority

Private admission managers are separate from report-only moderators/admins and cannot mint either authority through management RPCs. Management is caller-derived, live account/manager checked, expected-revision controlled, payload-bound and atomically audited. Audit and receipt updates/deletes are rejected, including ordinary privileged fixture deletion; full proven-disposable reset clears immutable synthetic evidence. Missing/disabled private configuration denies new internal pilot primitives, but existing student authorization is deliberately unchanged until A1b/c. No pilot-ready/deployment claim follows from this stage.

The global evidence transaction key serializes absent roster/manager/policy records and trusted fixture changes. Actual account/Auth/membership/campus row locks preserve live management checks against existing direct writers. Fresh checks follow waits; conflict aborts produce no success audit/partial mutation. Existing row-first profile/Storage writers do not currently acquire this key; A1b must add their shared-evidence live checks and test the exact safe-abort graph before claiming admission revocation enforcement. Safety/operator gates remain independent, untouched and default off; manager operations disclose no underlying profile/photo/message/private location. Existing delivered-byte/snapshot limitations remain unchanged. Hosted bootstrap provenance, retention/deletion policy and release operating gates are not selected here.
