# TASK-023A — shared student shell and design foundation

Status: Ready for fresh implementation after reviewed contract publication
Parent: `TASK-023-frontend-design-alignment.md`
Baseline: canonical main at or after reviewed plan `883ed47083f797ff31c28bc188713b7b36cb9d6b`

## Goal

Establish the shared visual system and student shell that the remaining TASK-023 routes will consume. This is a bounded first implementation stage, not parent completion.

## Required context

Read `AGENTS.md`, parent contract, `docs/ux/TASK-023-DESIGN-PLAN.md`, accepted product/UX docs, Leon's Taste, existing tokens/components, TASK-016C safety handoffs and accepted backend contracts. The coordinator inspected live usepals.com on 2026-09-23 EDT; implementation agent should inspect it afresh if available. Work from a fresh task-specific branch/worktree based on latest main.

## Scope

- Refine `packages/design-tokens/tokens.css` with semantic light/dark student values while preserving current names/meaning needed by admin. No new UI framework or font.
- Consolidate shared student header, five-destination navigation, avatar/account access and basic page, panel, field, action and status styles. Preserve route URLs, gates, identity handling, focus and signed-out behavior.
- Apply that foundation to `/`, sign-in/signup/verify/onboarding/restricted and Hangouts mock/saved map, list, detail, create/edit/owned routes. Make public entry copy truthful to current availability without promising hosted access.
- Fix nested duplicate main landmarks/skip targets on saved Hangout routes.
- Leave remaining Calendar, People, Chats, Notifications, profile and Safety route-specific adoption to TASK-023B, except shared primitives that automatically affect them.

## Forbidden changes

No `supabase/`, server action, API route, `apps/web/lib/` access logic, backend schema/RLS/permissions, provider, gate, hosted or production changes. No TASK-010 host/co-host ownership. Do not change Hangout visibility, eligibility, private/public location, join/leave or safety behavior.

## Acceptance and handoff

- Desktop/tablet/phone and 320px stress rendering of changed routes, light/dark style and one-main/skip-link checks; inspect loading/empty/error/denied where changed.
- Admin compatibility smoke check after shared token edits.
- Relevant workspace checks, no backend contract diff, and a handoff with changed routes, rendered evidence, limitations and task SHA.
- Independent exact-tip design/security review before coordinator integrates this stage into main. TASK-023B waits for reviewed A integration and its own published contract.
