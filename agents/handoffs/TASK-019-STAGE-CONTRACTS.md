# TASK-019 stage-contract handoff

Date: 2026-09-25
Accepted-policy baseline: independently remote-verified canonical main `dad5a1a8c5a6607a4f440a5af8b120280ea24637`
Scope: documentation-only staging for implementation

## Outcome

TASK-019A now bounds the local analytics adapter, authoritative same-account consent checks, memory-only accessible choice, strictly loopback test transport and full outbound inspection. Its interaction plan places the choice in the existing account area and keeps five primary destinations. TASK-019B depends on reviewed/integrated A and bounds event wiring to existing authorized student-web flows.

Independent review identified and the contracts corrected: mock map versus saved discovery; browser transport metadata versus application properties; PostHog's fixed personless control; honest message-send consent copy; current-account revalidation; idempotent replay suppression; one-shot onboarding success; absent student cancellation UI; canonical raw-local target checks; and runtime event/property allowlisting. These are contract clarifications under Accepted ADR-0023. No code, schema, service, user data or hosted PostHog project was changed by this planning stage.

## Dispatch order

Publish and independently verify these reviewed contracts on canonical main. Create a fresh isolated `agent/TASK-019A-analytics-foundation` task branch/worktree from that exact tip, implement A only, perform local checks and produce a handoff. Obtain fresh exact-tip privacy/security/design review before main integration. Only then dispatch B from a newer independently verified main tip. Cancellation wiring remains deferred until a separate student cancel flow exists. Hosted capture and release remain excluded.
