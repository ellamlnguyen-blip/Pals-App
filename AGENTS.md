# Pals App — Agent Control Plane

Read this file before changing code, product specs, database schema, infrastructure, or task state.

## Mission
Pals is the easiest way for college students to make plans, find things to do, and meet people through casual hangouts.

Success is not time spent in the app. Success is time spent with people because of the app.

## Core Loop
User creates a hangout → friends/campus discover it → students join → attendees coordinate in the hangout chat → people meet offline → some become friends → those relationships make future hangouts easier → more hangouts are created and joined.

Coordination creates the inventory that powers discovery. Discovery creates the relationships that power future coordination.

## Non-Negotiable Product Principles
1. Hangouts, not content.
2. Offline over engagement.
3. Event-first, not profile-first.
4. Pals is not social media: no posts, likes, comments, followers, public friend counts, or popularity scores.
5. Casual by default: creating a hangout should feel like saying “anyone want tacos?”
6. Verified campus trust: initial access is for verified UNC students using real identity.
7. Friends improve trust, ranking, invitations, and repeat coordination.
8. Map-first discovery; never turn the map into live people tracking.
9. Privacy by design: approximate public location is preferred when exact location is unnecessary.
10. Safety is core infrastructure.
11. Small/medium social experiences should not be crowded out by mass events.
12. One campus first, multi-campus architecture.

## MVP Boundary
Authoritative scope: `docs/product/MVP.md`.

Included: verified UNC identity, rich profiles, map + calendar discovery, quick hangout creation, visibility/eligibility controls, joining, host/co-host roles, people discovery, friendship, friend-aware ranking, hangout chat, DM requests, notifications, reporting/blocking/moderation, attendance confirmation, analytics.

Not MVP: posts, likes, comments, followers, public friend counts, waitlists, polls, paid promotion, organization accounts, cross-campus discovery, complex reputation, complex large-event automation.

## Technical Direction
Authoritative architecture: `docs/engineering/ARCHITECTURE.md`.

- Web first: Next.js + TypeScript
- Mobile second: React Native + Expo + TypeScript
- Backend: Supabase
- Maps: Mapbox
- Analytics: PostHog + authoritative Postgres records
- Hosting: Vercel
- Repository: monorepo
- Environments: local, staging, production
- Schema changes: committed migrations only
- Testing: automated critical logic/permissions + E2E core flows

Do not introduce Render, Firebase, a custom WebSocket service, or another major platform without an accepted ADR.

## Repository Map
```text
apps/          web, admin, mobile
packages/      domain, types, validation, data-access, config, design-tokens
supabase/      migrations, seed, functions, tests
docs/          product, ux, engineering, research, operations
decisions/     ADRs
tasks/         NOW, BACKLOG, DONE, bounded task files
agents/        handoffs and coordination templates
experiments/   product/technical experiments
```

## Source-of-Truth Hierarchy
When sources conflict:
1. current explicit user instruction
2. accepted ADR
3. product specification
4. architecture specification
5. active task specification
6. existing implementation
7. non-authoritative research or historical notes


## Mandatory Reading
Before any task: `AGENTS.md` + the assigned task file.

Then read relevant docs:
- product behavior → `docs/product/MVP.md`, `PRINCIPLES.md`, relevant UX docs
- database/auth/permissions → `DATA_MODEL.md`, `AUTHORIZATION.md`, `SECURITY_AND_SAFETY.md`, relevant ADRs
- map/location → `LOCATION_AND_MAPS.md`, `USER_FLOWS.md`
- messaging → `REALTIME_AND_MESSAGING.md`
- deployment/domain → `DEPLOYMENT.md`

## Agent Operating Rules
0. The coordinating session orchestrates; each meaningful implementation task gets a fresh task-specific agent/chat with only its task contract and relevant context. Review its handoff before dispatching dependents. Task agents stop after their assigned task; split oversized tasks rather than extending scope. Use a fresh reviewer for high-risk security/design work when practical.
1. Work only from a bounded task.
2. Do not silently broaden scope.
3. Do not redesign architecture while implementing a feature.
4. Cross-cutting changes require a proposed ADR; major ADRs need explicit acceptance.
5. Schema changes are migrations; no dashboard-only schema edits.
6. Never use production as the default development environment.
7. Never expose service-role keys or secrets to clients.
8. Never weaken RLS/privacy rules to “make it work.”
9. Unrelated technical debt becomes a follow-up task.
10. Prefer existing patterns to new abstractions.
11. Update docs when behavior/architecture materially changes.
12. Every completed task produces a handoff.
13. Record outcomes, not command-by-command logs.
14. Surface spec conflicts instead of guessing.

## Frontend Quality
Before substantial UI work, read the installed `design-taste-frontend` (Leon's Taste) skill, relevant product/UX specifications, and existing design tokens/components; inspect `https://usepals.com/`; then make an interaction/visual plan. See `docs/ux/DESIGN_DIRECTION.md`. Product requirements, accessibility and safety remain authoritative. Maintain shared tokens in `packages/design-tokens/`; verify rendered desktop/mobile interfaces and interaction/loading/empty/error states before handoff. Bootstrap tokens are provisional, not the final design system.

## Branch / Worktree Convention
One bounded branch/worktree per task: `agent/TASK-###-short-name`.
Start each task branch from the latest `origin/main`, after checking task dependencies. `main` is the canonical integration branch and shared reference point; it contains completed, reviewed task work. Avoid concurrent agents editing the same files whenever possible.

## GitHub Publishing
`origin` is the canonical GitHub repository. Each implementation task commits its completed, in-scope work and handoff to its task branch, then pushes that branch to `origin` and verifies the remote SHA. The orchestrator reviews the handoff and implementation, then integrates accepted work into `main` and pushes it. Verify and record both task and `main` remote SHAs in the handoff before marking the task complete. Do not push task work directly to `main`, force-push, or rewrite shared history. If GitHub authentication, review, or repository permission prevents a push or integration, report the exact blocker and leave the task explicitly incomplete. Never request or place a personal access token in chat, source files, or shell arguments; use the user's local Git credential manager.

## Main as the Whole-App Reference
`main` must contain the durable record of every task, including work that is active, blocked or not yet accepted. The coordinator publishes each bounded contract and its NOW/BACKLOG entry to `main` before implementation dispatch. At meaningful milestones, blockers, scope changes and handoff, publish a reviewed documentation update with task status, branch, latest verified pushed SHA, outcome, evidence and remaining work. Keep unfinished code on its task branch; its status must still be visible from `main`. Record outcomes, not every command or keystroke.

After review, integrate accepted code together with its handoff and relevant CURRENT_STATE/CHANGELOG/queue updates into `main`, push and verify the remote SHA. A task-branch push alone does not finish the workflow. If review or integration is blocked, record the reason on `main` where possible and leave the task incomplete. Declined or abandoned work also gets a short outcome and branch reference. Publishing an ADR as Proposed does not accept it.

The coordinator owns these shared records to avoid concurrent queue edits. Use a bounded documentation branch for status-only updates when the implementation branch contains unreviewed code. Do not require the user to request routine authorized publication/integration separately for every task. At each new task, read the latest `origin/main` records before proceeding.

## Automatic Next-Task Handoff

Standing user instruction: after a task is finished, automatically create a new Codex chat/task in the Pals App project and start the next task without asking for routine permission. This supersedes older task/handoff language saying not to auto-dispatch the next task.

Standing model instruction: use only GPT-6 Sol with medium reasoning at Standard speed (not Fast). Explicitly set `model: gpt-6-sol` and medium reasoning when creating or continuing task chats and when dispatching implementation/review sub-agents. Do not substitute another model, effort or speed. Where a dispatch tool does not expose a speed setting, do not claim it has configured or verified Standard speed; use the app's Standard setting and disclose any inability to verify it. For sub-agents, pass only the bounded contract/relevant context using a fresh or limited-history context so the explicit model/effort settings can be applied.

Finish means the applicable acceptance criteria, review, handoff, shared records, publication and remote-verified main integration are complete. A proposed contract, blocked decision or task-branch push alone is not completion. Select the next ready task from current NOW/BACKLOG and dependency order; do not duplicate an existing active task. Use a fresh project worktree from current canonical main and pass a concise task contract/context, verified baseline, dependencies, remaining gates and this standing instruction. Announce the new task to the user with the created-task link.

Starting the next task authorizes its bounded planning and already accepted implementation scope; it does not accept Proposed ADRs, waive safety gates or authorize otherwise excluded hosted operations. Surface genuine decisions in the new task while completing independent authorized work. Preserve blocked tasks as incomplete. Documentation receipts and implementation sub-stages do not each trigger duplicate product-task chats; the coordinator creates one successor when the bounded parent task is complete. If no next task can proceed, report the specific dependency or decision instead of inventing scope.

## ADR Policy
Use ADRs for major dependencies/services, schema/domain changes, auth/authorization strategy, deployment topology, permissions/privacy changes, replacing core providers, or major product behavior.

States: Proposed, Accepted, Superseded, Rejected.

## Definition of Done
A task is done only when:
- acceptance criteria are met
- relevant tests pass
- no unrelated changes are included
- critical privacy/permissions are verified
- docs/ADRs are synchronized when needed
- `CURRENT_STATE.md` is updated when state materially changes
- task status is updated
- a handoff is written

## Project Memory Model
There is intentionally no giant memory dump.
- Why we chose something → `decisions/`
- What exists now → `docs/operations/CURRENT_STATE.md`
- What is active → `tasks/NOW.md`
- What remains → `tasks/BACKLOG.md`
- What changed → `CHANGELOG.md`
- What an agent did → `agents/handoffs/`
- What we learned → `docs/research/` and `experiments/`

## Current Milestone
Foundation / clean rebuild planning.

Next: bootstrap monorepo → establish Supabase schema/auth/RLS → build verified-student onboarding → build map-first hangout flow → social/messaging/safety → staging → public UNC launch.

## Naming
User-facing term: **Hangout**.
Primary navigation: **Hangouts · Calendar · People · Chats · Notifications**.
Profile/settings open from the user's avatar/header.

## Fresh-Start Rule

This repository starts from the specifications in this project.

Current accepted product specs, ADRs, architecture docs, and task contracts define the project. Do not introduce behavior or architecture from sources that are not explicitly part of the current task.
