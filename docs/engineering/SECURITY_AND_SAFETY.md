# Security and Safety
Because Pals helps strangers meet offline, safety is core architecture.

Launch requirements: verified identity, report/block, attendee removal, moderation console, suspension/ban, moderation audit trail, location privacy, RLS tests.

Never expose private exact location to unauthorized users.

## Large Hangouts
MVP: threshold awareness, host warning, close-joining control, moderation review hooks, and ranking dampening. Do not build complex mass-event tooling before usage proves it.

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
