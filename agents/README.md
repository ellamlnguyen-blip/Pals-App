# Agent Coordination
Before work: read `AGENTS.md`, assigned task, required specs/ADRs.
During work: stay in scope; follow existing architecture; log unrelated issues as tasks; test critical behavior.
After work: sync docs/status as needed and write one handoff.
Handoffs: use the path specified in the task contract (foundation tasks use `agents/handoffs/TASK-###.md`).

## Orchestrator protocol
Read the project control, product, UX, engineering and Accepted ADR documents before first dispatch. Check dependencies and strengthen underspecified task contracts before implementation. Assign one fresh agent/chat per major task with bounded context; review its code, tests and handoff before closing it. The implementation agent stops at its task boundary. Dispatch dependents to new agents, not the previous implementation context.

Security-sensitive changes and major UI surfaces should receive a fresh independent review when practical. Reviewers verify implementation against specifications and actual test/rendering evidence. Unresolved decisions remain Proposed; failed or unavailable checks remain explicit blockers.

Do not start unrelated work or DNS cutover as a side effect. Repository specifications, task state, ADRs and handoffs carry continuity; conversation history does not substitute for them.
