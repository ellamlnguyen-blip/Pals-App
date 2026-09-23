# TASK-008 planning handoff

Date: 2026-09-22
Branch: `agent/TASK-008-planning`
Starting canonical main: `a4d04b41fe0d7394617ba6606a12a018647a4c9c`

## Outcome
Established a bounded local-only contract in `tasks/active/TASK-008-map-discovery-detail-joining.md` and placed TASK-008 in NOW/BACKLOG. Implementation has not started in this planning record.

## Prerequisites checked
Main includes reviewed TASK-005 backend, TASK-007 create/edit and Accepted ADR-0010. The actual database API has caller-bound `join_hangout`, `leave_hangout`, `get_hangout_participant_state`, RLS-selected public Hangouts/current-ready roster and separately protected private instructions. The database gate defaults disabled. TASK-003 deployed HTTPS callback/real UNC email and hosted block/report/moderation dependencies remain open.

## Scope and safety
Saved campus Hangouts use a separate authorized map/list/detail path. Mock examples remain unmistakable; no fixture becomes a saved pin. The task consumes existing backend policy, with no migration, peer profile expansion or restricted visibility. Nonlocal app access and hosted gate enablement remain prohibited. Private instructions are never part of public map results or optimistic join UI.

## Dispatch
After this reviewed contract and queue update are published on canonical main, dispatch a fresh implementation agent on `agent/TASK-008-map-discovery` from that exact `origin/main`. Require the interaction plan, design skill/live reference inspection, actual permission tests, desktop/phone checks and scoped handoff. Coordinator reviews before main integration. No later task is auto-dispatched.
