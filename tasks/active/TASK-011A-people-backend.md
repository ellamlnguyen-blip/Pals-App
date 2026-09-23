# TASK-011A — Local People privacy and text backend

Status: Contract to publish; implementation not dispatched
Date: 2026-09-22
Parent: TASK-011
Decision: Accepted ADR-0013, user answered “yes” to its complete proposal on 2026-09-22
Branch after publication: `agent/TASK-011A-people-backend` from fresh remote-verified `origin/main`

## Goal
Build only the authoritative local database boundary for an opt-in same-campus text directory and minimal caller-owned People blocks. No UI. Preserve all existing owner profile/photo and Hangout boundaries.

## Inputs and sequence
Read AGENTS.md, this stage contract, TASK-011 parent, Accepted ADR-0013, NOW/BACKLOG/CURRENT_STATE, Accepted ADR-0010/0011, identity/onboarding/profile migrations and SQL tests, AUTHORIZATION/DATA_MODEL/SECURITY_AND_SAFETY/TESTING and existing local Auth/HTTP/concurrency harness. The coordinator publishes this contract and acceptance on main, verifies remote refs, then dispatches a fresh GPT-6 Sol medium task agent with Standard speed selected in the app. The agent starts from that verified main and stops with a handoff. Independent security review and coordinator main integration precede TASK-011B.

## Allowed files and work
- One additive committed migration after `20260922000300_hangout_foundation.sql` for a default-false private People gate, default-off owner preference and minimal directional block relation, with explicit grants/RLS and caller-derived RPCs.
- Database-backed browse (max 24), known-ID detail, current preference, set preference, set desired block state and bounded outbound block-ID reads. Exact fields, visibility, readiness, gates, block semantics, search/filter/cursor and stronger-isolation denial are in Accepted ADR-0013. Return one fixed shape per read class; avoid raw row reads or broad profile grants.
- Tests in `supabase/tests/database/` with real roles, local PostgREST/Auth fixture extensions and an overlapping-session race suite appropriate to parent TASK-011 acceptance matrix. Document only implemented authorization in AUTHORIZATION/DATA_MODEL/supabase README/test README. Shared types/validation only where useful to the backend API contract.
- Local fixtures may enable People gate only after validating the loopback Supabase target; cleanup restores false, removes synthetic users/blocks and stops services. Never enable Hangout gate except existing suite fixtures; preserve its false final state.

## Explicit invariants
- Default off for all accounts; owner opt-out works while People gate is disabled and when active owner loses readiness. Opt-in requires gate and live ready. Subject/viewer same active campus and live ready for peer reads, with either block direction suppressing direct/list results. Admin/moderator provides no bypass.
- Card: ID, real name, campus display name, graduation year, major. Detail adds bio/interests/down-to-do. No email, photo reference/object, other optional fields, membership evidence, raw profile rows or hidden reason/count. Existing profile and Storage table grants/RLS remain owner-only.
- Block is idempotent desired state; owner may see/unblock own outbound IDs when not ready but active. No incoming list, names or timestamps. Pair lock prevents raced mutual block visibility. Existing Hangout records, private instructions and role rules are unchanged.
- Gate is not client writable and defaults disabled after every reset. All API operations check live authority in database; privileged helpers have fixed empty search paths and explicit grants. No service-role app path. Reads are uncached at app stage B; backend must not issue signed or public photo URLs.

## Verification and handoff
Run `pnpm check`, two clean `pnpm db:verify` resets with warning-free lint, actual local Auth/PostgREST tests and deterministic concurrency where relevant. Cover anon, self, opted out, either/both block directions, other campus, unready/missing photo/changed email, inactive campus, suspended/banned, forged operator, gate on/off, direct table select/DML/embed, max/filter/cursor malformed inputs, repeatable-read denial, post-lock revocation and blocked/nonexistent indistinguishability. Re-run existing profile/photo/Hangout/Calendar regressions; disclose known pre-existing dev-helper/CI action-manifest failures without broadening scope. No hosted operations. Write `agents/handoffs/TASK-011A.md` with exact evidence, known limitations and commit SHA; push task branch and verify remote SHA, then stop. Coordinator reviews before integration.

## Exclusions
No UI, photo processing/peer photo read, friendship, DM, recommendations, attendance, global Hangout block precedence, reports/moderation, restricted modes, hosted migration/enablement/deployment, or TASK-010 co-host policy. Do not weaken existing controls or repair unrelated test harness issues. If a concrete contract contradiction appears, stop implementation of that portion and send the coordinator a precise finding; continue independent authorized work.
