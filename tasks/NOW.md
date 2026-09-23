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

Planning publication verified: `agent/TASK-010-planning` and `origin/main` both at `304fc81bc11b38f351341c6bdd285d55eb37bad2`. Independent planning review clear; awaiting user policy decision, no implementation dispatched.

## TASK-011 People planning
User requested moving to the next task in a new chat. `active/TASK-011-people-discovery.md` and Proposed `decisions/ADR-0013-local-people-discovery.md` define an opt-in, disposable-local, text-first directory with a bounded People-only block prerequisite. Planning branch `agent/TASK-011-planning` starts from clean canonical main/freshly fetched origin/main `b3011bc74adb46d01fd4b709520ecf5c3f8fa8a2`. Independent planning/security review found no blocking conflict; opt-out gate semantics and ID-only unblock limitations were clarified. Publication precedes explicit policy acceptance; no implementation or migration dispatched. TASK-010/ADR-0012 remain pending and independent. Photos, friendship/DM, attendance context and global block/private-location precedence remain deferred. See `agents/handoffs/TASK-011-CONTRACT.md`.

User preference for subsequent agent dispatch: GPT-6 Sol, medium reasoning, Standard speed (not Fast) (explicit instruction in TASK-011 planning).

TASK-011 planning publication verified: task branch and canonical main both at `9f52a39ac8b92ea082ad199b55ab766f671fd2f4`. Planning reviewed/published; ADR-0013 remains Proposed and implementation undispatched.

ADR-0013 acceptance: on 2026-09-22 the user explicitly answered “yes” to accepting the complete local People privacy proposal. TASK-011A privacy backend may start after its narrower published contract; TASK-011B waits for reviewed A integration. TASK-010/ADR-0012 remain Proposed and independent.

TASK-011A dispatch: accepted ADR-0013 and narrower backend contract were published and both `origin/main` / planning branch verified at `a9c10a81ce24af4d84330c027d2d0b8a53c3bacc`. Fresh GPT-6 Sol medium backend agent works on isolated `agent/TASK-011A-people-backend` from that SHA. Tooling has no speed selector; Standard speed is the standing app preference, with no speed verification claim. Independent security review and main integration must precede TASK-011B dispatch.

TASK-011A outcome: reviewed backend task `ca1d6d234ea1af3f08af8c21d76f7db8ffc88f0d` integrated and remote-verified on main `ef4da666dbd89996190aa7fb0fd1f31aba7b7d40`. Independent security review clear after raw-input cap and reverse-block proof fixes. Two clean local resets passed 61 People + 226 existing assertions each, final 63 People assertions on rerun, real Auth/PostgREST/profile/Hangout/concurrency tests, direct formatting/lint/types/17 units and two webpack builds passed. Default `pnpm check`/Turbopack were blocked by isolated symlinked dependencies offline; no green CI claim. Gates false, fixtures clear, services stopped. TASK-011B contract is ready for publication before fresh UI dispatch; see `agents/handoffs/TASK-011A.md` and `TASK-011A-REVIEW.md`.

TASK-011B dispatch: narrower UI contract and TASK-011A review were published and remote-verified on main `6cf286ed72269ac603cb298b30a52d5fba74ecf1`. Fresh GPT-6 Sol medium agent works in isolated `agent/TASK-011B-people-ui`. Standard speed remains the app preference; dispatch API exposes no speed selector. UI implementation and rendered/security review remain in progress.

TASK-011 pagination correction: UI review reproduced a PostgreSQL/JS Unicode whitespace cursor mismatch for an accepted name with U+00A0 (JS `ada`, SQL retains NBSP). `active/TASK-011A-cursor-correction.md` scopes an additive local backend RPC correction, fresh agent and review. TASK-011B remains active but must consume the corrected raw-name cursor before integration. This is necessary to fulfill Accepted ADR-0013, not a new privacy decision.
