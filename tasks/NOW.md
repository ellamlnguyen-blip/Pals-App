# NOW

## Shared Code Baseline
`main` is the canonical integration branch. Start each new task branch from the latest `origin/main`. After task review, integrate accepted changes into `main` and verify both remote refs; see `AGENTS.md`.

## Current Milestone — Foundation

Do these in order unless dependencies allow safe parallel work.

Completed: TASK-001, TASK-002 and TASK-004. See `DONE.md` and their handoffs.

1. `active/TASK-003-auth-onboarding.md` — implemented and locally verified; independent security review clear, anonymous design review plus authenticated implementer visual check passed. Accepted ADR-0009 is implemented. Deployed HTTPS callback and hosted email delivery remain pending deployment/SMTP. Handoff: `agents/handoffs/TASK-003.md`.
2. `active/TASK-004-map-shell.md` — complete on `agent/TASK-004-map`, including final real Mapbox basemap and authenticated desktop/phone interaction checks. Token is configured only in ignored local environment; no production deployment. Handoff: `agents/handoffs/TASK-004.md`. No live Hangout backend is connected.

3. `active/TASK-005-hangout-foundation.md` — backend-only contract prepared. Implementation is blocked on explicit acceptance of Proposed `decisions/ADR-0010-hangout-foundation.md` and resolution of its material authorization/schema questions. No migrations, UI or hosted changes authorized by this planning step. Restricted visibility/eligibility modes must fail closed until their data and access rules exist and are tested. Planning handoff: `agents/handoffs/TASK-005-CONTRACT.md`. Do not auto-dispatch implementation.

Parallelization after TASK-001:
- Supabase foundation
- initial web shell/map shell
- admin shell

Start from the accepted product and architecture documents in this repository. Do not introduce behavior or architecture from sources outside the current project specifications.
