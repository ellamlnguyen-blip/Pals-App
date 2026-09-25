# Handoff — TASK-010 local host/co-host management

Date: 2026-09-25
Policy: Accepted ADR-0012; disposable-local scope only.
Backend branch: `origin/agent/TASK-010A-cohost-backend` independently verified at `e1426bd7f368dbee44c6cabd135969ceced78172`.
UI branch: `origin/agent/TASK-010B-host-management` independently verified at `903827995917e8bdbd2d98640ef24c4e861d1bfc`; exact reviewed implementation `b262f43b3573689f71b3d0ace2a12b54b5c6c862`.
Canonical main integration: independently remote-verified at `09f468f2185b5da0b3ad5390153f3fcfef91fc1c`; this completion receipt follows.

The backend enforces the accepted host/co-host matrix through a default-off local migration, caller-bound role readers and revision-aware management RPCs. The saved-Hangout UI presents current-ready ID/role roster pages and a separate host-only retained co-host assignment list. Hosts can manage joining, roles, participants and cancellation; co-hosts can edit, manage joining and ordinary members, and step down. Actions reauthorize persisted state and pause controls after uncertain results. Private detail and paginated IDs are rechecked after slow reads and visibility changes.

Independent Stage A security review and Stage B security/design review cleared their exact implementation tips. Backend verification covered a true prior-schema upgrade, 19-file/1,010-assertion SQL run, real Auth/PostgREST, 12 observed lock waits and full workspace checks. Stage B passed `pnpm check`, 68/68 actual-role SQL assertions, focused built-loopback Auth/action checks including a delayed-chat revocation barrier and cancelled-member leave, and earlier desktop/390 px/320 px/keyboard inspection. The final-tip browser surface was unavailable, so a Step down click and screenshots were not verified; SQL/HTTP cover Step down. The broader unmodified action harness has unrelated People/friendship fixture failures; the handoff documents its temporary isolation for a 4/4 run.

Disposable cleanup found zero Auth users, Hangouts and storage objects; the Hangout gate is off and local services are stopped. No hosted migration, deployment, gate enablement or live-user action occurred. TASK-021's hosted HTTPS/email, moderation/retention/photo URL and size-signal operator policy gates remain open. See `TASK-010A-BACKEND.md` and `TASK-010B-UI.md` for exact scope, tests and limits.
