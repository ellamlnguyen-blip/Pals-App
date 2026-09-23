# NOW

## Shared Code Baseline
`main` is the canonical integration branch. Start each new task branch from the latest `origin/main`. After task review, integrate accepted changes into `main` and verify both remote refs; see `AGENTS.md`.

Every active task must have its contract/status recorded on `main` before dispatch and updated there at meaningful milestones or blockers. Task branches hold work in progress; reviewed code, handoffs and state changes are integrated into `main` before completion. The coordinator owns shared queue updates.

## Current Milestone — Foundation

Do these in order unless dependencies allow safe parallel work.

Completed: TASK-001, TASK-002, TASK-004, TASK-005, TASK-006, TASK-007 and TASK-008. See `DONE.md` and their handoffs.

TASK-008 local-only saved map discovery/detail/joining is reviewed and integrated from `agent/TASK-008-map-discovery` tip `0ef4bbb67f5fab908092eba47243ebea3b394931` on remote-verified main `279c325384f5584e76e611ac78d722836ce47cff`. See its contract, `agents/handoffs/TASK-008.md` and `TASK-008-REVIEW.md`. The default-disabled gate, no-hosted-use boundary and launch safety prerequisites remain in force. TASK-009 is now explicitly requested; its bounded contract and safety gates are recorded below.

1. `active/TASK-003-auth-onboarding.md` — implemented and locally verified; independent security review clear, anonymous design review plus authenticated implementer visual check passed. Accepted ADR-0009 is implemented. Deployed HTTPS callback and hosted email delivery remain pending deployment/SMTP. Handoff: `agents/handoffs/TASK-003.md`.
2. `active/TASK-004-map-shell.md` — complete on `agent/TASK-004-map`, including final real Mapbox basemap and authenticated desktop/phone interaction checks. Token is configured only in ignored local environment; no production deployment. Handoff: `agents/handoffs/TASK-004.md`. Its mock examples remain separate from TASK-008 saved discovery.


3. `active/TASK-007-create-edit-hangouts.md` — complete local-only create/edit flow under explicitly accepted ADR-0010 and reviewed TASK-005 backend. Reviewed task tip `b6f338e314f1eca489cea0592acd5abc069a8884` is integrated; see `agents/handoffs/TASK-007.md` and `TASK-007-REVIEW.md`. No hosted changes. TASK-010 lifecycle and TASK-013 chat remain separately bounded work; do not auto-dispatch them.

Parallelization after TASK-001:
- Supabase foundation
- initial web shell/map shell
- admin shell

Start from the accepted product and architecture documents in this repository. Do not introduce behavior or architecture from sources outside the current project specifications.

## Active — TASK-009 Calendar
`active/TASK-009-calendar.md` — bounded local-only Today/Week saved discovery and authoritative Joined/Hosting filters. Planning baseline `e2e3b2d0b59d32100dfca91c04801b96d551f5ab`; planned branch `agent/TASK-009-calendar`. Contract publication precedes fresh implementation dispatch. No private Calendar payloads, friend context, restricted modes, schema changes or hosted enablement. Review/test/integration remain pending.
