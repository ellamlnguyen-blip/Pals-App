# NOW

## Shared Code Baseline
`main` is the canonical integration branch. Start each new task branch from the latest `origin/main`. After task review, integrate accepted changes into `main` and verify both remote refs; see `AGENTS.md`.

Every active task must have its contract/status recorded on `main` before dispatch and updated there at meaningful milestones or blockers. Task branches hold work in progress; reviewed code, handoffs and state changes are integrated into `main` before completion. The coordinator owns shared queue updates.

## Current Milestone — Foundation

Do these in order unless dependencies allow safe parallel work.

Completed: TASK-001, TASK-002, TASK-004, TASK-005 and TASK-006. See `DONE.md` and their handoffs.

1. `active/TASK-003-auth-onboarding.md` — implemented and locally verified; independent security review clear, anonymous design review plus authenticated implementer visual check passed. Accepted ADR-0009 is implemented. Deployed HTTPS callback and hosted email delivery remain pending deployment/SMTP. Handoff: `agents/handoffs/TASK-003.md`.
2. `active/TASK-004-map-shell.md` — complete on `agent/TASK-004-map`, including final real Mapbox basemap and authenticated desktop/phone interaction checks. Token is configured only in ignored local environment; no production deployment. Handoff: `agents/handoffs/TASK-004.md`. No live Hangout backend is connected.


3. `active/TASK-007-create-edit-hangouts.md` — contract approved; revised ADR-0010 explicitly accepted by user. TASK-005 backend prerequisite is complete at verified main `aa9fb884397c4d2bc728a8532b1cb0d2737959f0`; current main receipt `bd70a18`. Its handoff/API/security review were read; fresh GPT-6 Sol / medium implementation agent dispatched from main `bebef70` on `agent/TASK-007-create-edit-hangouts`; no implementation SHA yet. Accepted decision covers local-only safety gating, field/time limits, host/roster/private access and atomic retry/conflict semantics. Planning branch `agent/TASK-007-planning`; handoff `agents/handoffs/TASK-007-CONTRACT.md`. Local-only implementation is in progress; no hosted changes. Reviewed planning/acceptance integrated on main `d5485f9`; planning tip `f1bc16c` and main remote SHAs verified.

Parallelization after TASK-001:
- Supabase foundation
- initial web shell/map shell
- admin shell

Start from the accepted product and architecture documents in this repository. Do not introduce behavior or architecture from sources outside the current project specifications.
