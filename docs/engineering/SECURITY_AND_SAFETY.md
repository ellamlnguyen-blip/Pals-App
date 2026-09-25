# Security and Safety
Because Pals helps strangers meet offline, safety is core architecture.

Launch requirements: verified identity, report/block, attendee removal, moderation console, suspension/ban, moderation audit trail, location privacy, RLS tests.

Never expose private exact location to unauthorized users.

## Large Hangouts
MVP: threshold awareness, host warning, close-joining control, moderation review hooks, and ranking dampening. Do not build complex mass-event tooling before usage proves it.

Accepted ADR-0024 and TASK-020A implement the disposable-local backend primitives: a provisional 25-current-joined threshold (including host), a host-only coarse size flag, one private unconsumed observation signal and saved-map ordering by viewer-visible roster size before the 100-result display limit. Close joining remains voluntary under existing authority. The signal is not a safety allegation, sanction, operator queue or staffed review. TASK-020B will add the student warning/control; hosted use still requires an accepted operational review consumer, retention and response policy.

Commercial promotion is not allowed in MVP.

Eligibility restrictions must use deliberately provided profile attributes and be transparent.

Post-hangout feedback: attended? happened as described? comfortable attending again? report issue. No public ratings.

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
