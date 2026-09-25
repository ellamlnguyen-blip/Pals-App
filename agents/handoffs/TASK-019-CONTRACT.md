# TASK-019 planning handoff

Date: 2026-09-25
Scope: documentation-only planning
Baseline: independently queried remote `main` `937672d184098d6f5cb8e5226d0bb84104fcf71e`

## Outcome

Defined `tasks/active/TASK-019-posthog-instrumentation.md` and Proposed `decisions/ADR-0023-minimal-consented-analytics.md`. The contract names the exact student-web event allowlist, application payload, authoritative Postgres records and their history limits. Attendance answers, safety and moderation never enter PostHog. The proposal makes opt-in, anonymous visit identity, memory-only consent, cross-tab revocation, hosted retention and provider metadata explicit.

The initial independent planning review found that current participant rows cannot reconstruct repeated joins to one Hangout, that a notification link click cannot prove authorized destination opening, that consent/account-switch behavior needed a precise tab rule, and that the PostHog protocol envelope is distinct from application properties. The contract now limits repeat metrics to distinct Hangouts, uses a Notifications inbox view, resets consent on reload, broadcasts revocation/sign-out and requires full request inspection in the local sink.

## Evidence and boundaries

- Read current AGENTS, MVP, analytics/architecture/data model/authorization/safety, accepted ADR-0022, current task state and existing analytics absence. Remote `main` was queried directly and matched the recorded TASK-018 completion SHA.
- Documentation and whitespace checks are the relevant planning checks. No runtime, schema or hosted project change was made; no external event was sent.
- Proposed ADR-0023 needs explicit user acceptance. Before implementation, publish and independently verify the accepted-policy receipt and a narrower implementation contract on canonical `main`; dispatch a fresh task-specific agent from that tip, then independently review its exact code tip before integration.
- Nine feature gates remain as reported by TASK-018; this planning task did not enable, query or modify them. No disposable service or fixture was started.

## Next decision

Ask the user to accept or revise ADR-0023's affirmative opt-in, anonymous visit-only analytics, excluded private attendance/safety events and 90-day maximum raw-event retention requirement. Acceptance covers local implementation only. Hosted PostHog configuration and live capture need a later reviewed release decision.
