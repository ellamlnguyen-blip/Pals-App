# NOW

## Shared Code Baseline
`main` is the canonical integration branch. Start each new task branch from the latest `origin/main`. After task review, integrate accepted changes into `main` and verify both remote refs; see `AGENTS.md`.

Every active task must have its contract/status recorded on `main` before dispatch and updated there at meaningful milestones or blockers. Task branches hold work in progress; reviewed code, handoffs and state changes are integrated into `main` before completion. The coordinator owns shared queue updates.

## Current Milestone — Foundation

Do these in order unless dependencies allow safe parallel work.

Completed: TASK-001, TASK-002, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008 and TASK-009. See `DONE.md` and their handoffs.

TASK-008 local-only saved map discovery/detail/joining is reviewed and integrated from `agent/TASK-008-map-discovery` tip `0ef4bbb67f5fab908092eba47243ebea3b394931` on remote-verified main `279c325384f5584e76e611ac78d722836ce47cff`. See its contract, `agents/handoffs/TASK-008.md` and `TASK-008-REVIEW.md`. The default-disabled gate, no-hosted-use boundary and launch safety prerequisites remain in force. TASK-009 is now explicitly requested; its bounded contract and safety gates are recorded below.

1. `active/TASK-003-auth-onboarding.md` — implemented and locally verified; independent security review clear, anonymous design review plus authenticated implementer visual check passed. Accepted ADR-0009 is implemented. Deployed HTTPS callback and hosted email delivery remain pending deployment/SMTP. Handoff: `agents/handoffs/TASK-003.md`.
2. `active/TASK-004-map-shell.md` — complete on `agent/TASK-004-map`, including final real Mapbox basemap and authenticated desktop/phone interaction checks. Token is configured only in ignored local environment; no production deployment. Handoff: `agents/handoffs/TASK-004.md`. Its mock examples remain separate from TASK-008 saved discovery.


3. `active/TASK-007-create-edit-hangouts.md` — complete local-only create/edit flow under explicitly accepted ADR-0010 and reviewed TASK-005 backend. Reviewed task tip `b6f338e314f1eca489cea0592acd5abc069a8884` is integrated; see `agents/handoffs/TASK-007.md` and `TASK-007-REVIEW.md`. No hosted changes. TASK-010 lifecycle and TASK-013 chat remain separately bounded work; do not auto-dispatch them.

Parallelization after TASK-001:
- Supabase foundation
- initial web shell/map shell
- admin shell

Start from the accepted product and architecture documents in this repository. Do not introduce behavior or architecture from sources outside the current project specifications.

## TASK-009 Calendar outcome
`active/TASK-009-calendar.md` — complete local-only Calendar integrated from remote-verified task `777d4b875bedd26ea925a4982433809d3b048cc2`. Today/Day and Monday–Sunday Week, authoritative Joined/Hosting filters, public-only payloads and existing detail navigation passed local workspace/SQL/real HTTP and desktop/phone checks; fresh review clear. CI action-manifest failure is proven pre-existing on starting main and remains a separate maintenance follow-up. Main integration `0c2af8e3401dd6acce6d87249886f7e31b2e7175` was remote-verified. Gate disabled, disposable data cleared and local services stopped. No hosted changes or automatic TASK-010 dispatch.

TASK-009 final receipt: reviewed task `777d4b875bedd26ea925a4982433809d3b048cc2` integrated into canonical main `0c2af8e3401dd6acce6d87249886f7e31b2e7175`; both remote refs independently verified after push. TASK-009 is complete locally; the existing CI helper failure and hosted safety/deployment gates remain explicitly open.


## TASK-010 host/co-host planning
User explicitly requested the next task. `active/TASK-010-host-cohost-management.md` defines staged local backend and management UI work; `decisions/ADR-0012-hangout-cohost-authority.md` is **Proposed**, awaiting explicit policy acceptance. Planning branch: `agent/TASK-010-planning`, from clean remote-verified main `49d6e780aebf5f23f384efe24d0a8bd55232888a`. No implementation agent, code change or migration is authorized/dispatched yet. Publish reviewed planning records to main, then record the user's decision before stage contracts/implementation. Existing host authority remains Accepted ADR-0010; co-hosts still have no implemented authority. See `agents/handoffs/TASK-010-CONTRACT.md` for review/publication evidence.
