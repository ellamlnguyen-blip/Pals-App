# TASK-XXX — Title
Status: Planned

## Goal
Outcome, not just an implementation action.
## Why
Product/architecture reason.
## Dependencies
## Required Context
- `AGENTS.md`
- relevant specs/ADRs
## Allowed Scope
## Out of Scope
## Acceptance Criteria
- [ ] ...
## Tests / Verification
- [ ] ...
## Documentation Updates
Before implementation dispatch, coordinator publishes this contract and its queue entry to main. At material milestones/blockers and handoff, publish a reviewed status record to main with branch, verified pushed SHA, evidence and remaining work; unreviewed implementation stays on its task branch.
## Handoff Requirements
Use `agents/HANDOFF_TEMPLATE.md`.
Start from the latest `origin/main`. After committing verified implementation and handoff, push the task branch and verify its remote SHA. The orchestrator reviews and integrates accepted work into `main`, then verifies that remote SHA too. Record both refs and SHAs in the handoff. A failed push or integration leaves the task incomplete and must be recorded as a blocker; never force-push.
## Follow-ups
Record unrelated work; do not expand scope.
