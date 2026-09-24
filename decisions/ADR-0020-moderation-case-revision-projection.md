# ADR-0020 — Moderation case revision in audited detail
Status: Accepted — disposable-local TASK-017A only
Date: 2026-09-24

## Context

Accepted ADR-0019 gives moderator/admin report detail an exact field allowlist: allegation and provenance, case note/disposition, and limited current target state. TASK-017A requires an expected case revision for each transition so concurrent operators cannot overwrite one another. The first actor can use a transition result, but a second operator opening an existing case has no authorized way to obtain its revision. The independent Stage A contract reviewer confirmed this contradiction. A state-only check does not protect annotations and reopen cycles.

## Proposed decision

Add one server-owned nonnegative integer `case_revision` to the **audited report-detail** response for an operator who already passes ADR-0019's live gate, active role and conflict checks. A report without a case row returns revision zero. A successful new case transition increments the revision once; an exact authorized retry returns the original transition result without another increment. The report queue does not gain the revision. No student, reporter, target, raw table or unaudited reader gains it.

This amends only ADR-0019's detail field allowlist. Its narrative, provenance, target-context, audit, conflict, retention and local-only rules remain in force. The Stage A implementation must not project `case_revision` until this amendment is explicitly accepted.

## Consequences

An authorized operator can supply the current detail revision to the case transition RPC. Stale actions can fail without silently replacing another operator's note or disposition. The added value reveals only the internal case change count to someone already authorized to read that case detail.

## Alternatives

- Rely on case state alone: two annotations can share `in_review` and overwrite each other.
- Return an opaque ETag or add another version reader: still expands the accepted output surface and adds more machinery for the same concurrency fact.
- Drop expected revisions: weakens the reviewed Stage A transition contract.

## Acceptance

The reviewed proposal was published on remote-verified canonical main `02124d635767c262ab969f120ff1dd4b24e85da7`. The coordinator explicitly asked whether to accept this exact amendment, explaining that it adds only a server-owned case revision to already authorized, audited moderator detail and does not affect queue, student APIs or hosted use. The user replied “ok” on 2026-09-24. In direct response to that question, this accepts the amendment for disposable-local TASK-017A. All other ADR-0019 limits remain in force. No hosted authorization is implied.
