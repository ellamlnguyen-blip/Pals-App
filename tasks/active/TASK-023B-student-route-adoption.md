# TASK-023B — Calendar, People and profile visual adoption

Status: Reviewed and integrated on canonical main; authenticated parent QA open
Parent: `TASK-023-frontend-design-alignment.md`

## Goal

Apply TASK-023A's shared student tokens, shell and components to Calendar, People/friends/privacy, and owner and peer profiles. This is a bounded second stage; Chats, Notifications and Safety wait for TASK-023C.

## Dependency

Coordinator reviews TASK-023A's handoff, exact task tip and independent security/design review, integrates its accepted code into canonical main, and publishes this B contract on main before fresh B agent dispatch. Start B from that exact verified main baseline. Read `AGENTS.md`, the parent task/plan, A handoff and review limitations, relevant accepted product/UX/backend contracts, and the installed Leon Taste skill; inspect live usepals.com afresh before substantial UI work and record if unavailable.

## Scope

- Adopt the A shell/navigation and shared typography, surfaces, actions, fields, loading/empty/error/denied treatment throughout Calendar, People/friends/privacy, and owner and peer profiles. Remove redundant route-level primary navigation where the shared shell supplies it, while preserving the five destinations and feature-gate handling.
- Keep Calendar day/week, filters and public-only entries; People opt-in/friendship, profile photos and visibility exactly as supported.
- Make route-specific CSS consistent with the shared tokens/components and responsive layout at desktop/tablet/phone. Avoid isolated color/radius patches. Preserve focus return, live regions, native dialog Escape and meaningful loading/empty/error/denied differences.
- Do not edit admin. Record any newly discovered shared-token compatibility defect for a separate bounded correction.

## Forbidden changes

No database/schema/RLS, Supabase, `apps/web/lib/` access, server action, API contract, authorization, feature gate, provider, hosted or production work. Do not change user eligibility, location visibility, chat membership, block/report semantics or other product behavior.

## Acceptance and handoff

- Render these routes at desktop 1280px, tablet about 820px, phone 390px and 320px stress; inspect light/dark, loading, empty, error, denied and gate-off states using only disposable local fixtures. Verify keyboard/focus and no horizontal overflow.
- Run relevant workspace and existing UI/action regression checks. Final diff against A-integrated main contains only approved presentation and frontend interaction changes.
- Produce handoff with route/state/viewport evidence, preservation limits, tests and task SHA. Coordinator obtains fresh independent exact-tip design/security review before integrating B and dispatching C.
- The inherited TASK-023A authenticated-rendering gap remains a parent completion gate. B may use disposable synthetic presentation checks where port 3000 is unavailable, but neither A nor B may claim real authenticated flow verification until that checkout is available and the relevant routes/states are actually rendered.
