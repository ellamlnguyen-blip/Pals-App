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
