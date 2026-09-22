# NOW

## Current Milestone — Foundation

Do these in order unless dependencies allow safe parallel work.

Completed: TASK-001 and TASK-002. See `DONE.md` and their handoffs.

1. `active/TASK-003-auth-onboarding.md` — implemented and locally verified; independent security review clear, anonymous design review plus authenticated implementer visual check passed. Accepted ADR-0009 is implemented. Deployed HTTPS callback and hosted email delivery remain pending deployment/SMTP. Handoff: `agents/handoffs/TASK-003.md`.
2. `active/TASK-004-map-shell.md` — implemented on isolated `agent/TASK-004-map` under explicit dispatch despite the preserved TASK-003 hosted gaps. Repository checks, actual local auth gates and offline Mapbox renderer interactions pass. Coordinator review and project-token/live basemap verification remain. Handoff: `agents/handoffs/TASK-004.md`. Do not auto-dispatch TASK-005.

Parallelization after TASK-001:
- Supabase foundation
- initial web shell/map shell
- admin shell

Start from the accepted product and architecture documents in this repository. Do not introduce behavior or architecture from sources outside the current project specifications.
