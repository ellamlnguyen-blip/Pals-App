# Handoff — TASK-012 bounded local friendship

Date: 2026-09-23
Coordinator branch/worktree: `agent/TASK-012-planning` / `/Users/ellanguyen/.codex/worktrees/0598/Pals App`
Accepted decision: ADR-0014; user explicitly accepted the published local relationship/privacy policy on 2026-09-23
Reviewed stage tips: TASK-012A `2a1f6b13b332196ba599fb739513fd424024f2a7`; TASK-012B `b21f4e247ae24ec3ac5ae70bea24efb50aee09ad`
Coordinator UI merge: `39bfe3223bb7dbb6a5eb60cafe451b47a712f604`
Final canonical main receipt: pending publication of this closure record

## Outcome

The disposable local app now supports mutual friend requests and accepted friendships from opted-in same-campus People detail. Participants can privately see current incoming/outgoing/accepted ID/status/generation, accept/decline/cancel/unfriend, and manage relationships by ID after readiness or peer-text loss. A ready participant can block a now-hidden current relationship peer by ID; an authorized People block ends that friendship atomically without changing existing Hangout access. Default-off friendship gate, owner-only profile/photos, People text opt-in and current campus-only Hangout access remain intact.

## Verification and review

TASK-012A had two clean database resets with six pgTAP suites, schema lint, real Auth/PostgREST and deterministic pair/eligibility races. Its first security review found a create/accept versus opt-out/readiness/gate revocation gap; corrected shared locks and fresh eligibility checks passed exact-tip re-review. TASK-012B passed full `pnpm check` (20 Node tests and both builds), a production-build real Auth/action suite with no-store and relationship/block cases, and rendered desktop/390px/320px/keyboard checks. First UI review found stale peer text on a denied create and immediate repeat after an unknown ID-block result; corrected exact tip passed focused tests and security/design re-review. See `TASK-012A-REVIEW.md` and `TASK-012B-REVIEW.md` for precise evidence/limits.

The backend isolated worktree could not run full `pnpm check` due offline package tarball/registry DNS, though direct checks and database suites passed; the integrated UI worktree later ran it successfully. The Next development helper retained its known People cache-header assertion failure; the equivalent production server suite passed no-store. A focused browser retest of corrected unknown-block state was unavailable after Mac lock, so that state has code/unit/real action evidence; previous responsive/keyboard layouts were rendered. No green hosted CI or deployment claim.

## Local state and follow-ups

All three local feature gates are false, friendship and synthetic test fixtures are gone, Supabase/Lima are stopped. No hosted migration, live students, peer photo access, friend-aware ranking, friends-only Hangout access, DM/chat, notifications, global Hangout/private-location block precedence, reporting or moderation were delivered. TASK-010 remains blocked on Proposed ADR-0012. TASK-013 hangout chat is the next unstarted product task for bounded planning under the standing AGENTS.md next-task handoff; it cannot infer global block precedence or hosted authorization from this friendship increment.
