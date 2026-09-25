# TASK-018 — Private attendance confirmation

Status: Active; ADR-0022 Accepted, Stages A/B reviewed, final canonical publication receipt pending
Date: 2026-09-24
Planning branch: `agent/TASK-018-planning` from independently remote-verified `origin/main` `be0344ed8b1f9dbef49a6246575ca8d8dd3bccc6`

## Goal

Let a student privately answer whether they attended a Hangout they joined, without treating a join or scheduled time as proof of offline attendance. Support the accepted MVP's self-reported attendance outcome measure while preserving block, moderation and retained-safety boundaries.

## Dependencies and policy gate

TASK-017 is complete for disposable-local scope on canonical main. Read AGENTS, MVP, principles, architecture, data model, authorization, security/safety, Notifications, Hangout and safety contracts, and ADR-0010/0017/0018/0019. ADR-0022 supplies the accepted time, correction, visibility and own-retained-ID policy. The reviewed proposal, parent and A/B contracts are on canonical main; the user explicitly accepted ADR-0022 on 2026-09-24. Publish and independently verify the acceptance receipt on main before Stage A implementation. Hosted work remains excluded.

## Bounded stages after acceptance

1. **A — private backend:** a committed migration with a separate default-off gate and private self-response table, caller-bound exact-ID read/write and a bounded ID-only owner list. Enforce the accepted time, post-opening schedule freeze, active-account, retained-participant, disable and privacy rules in the database. Reuse the repository's lock hierarchy and direct source authorization; add actual-role SQL, real API and observed concurrency tests. Produce a handoff and independent exact-tip security review before integration.
2. **B — student UI:** a local-only attendance surface for past own Hangouts, including an ID-only presentation when the source is hidden, a simple yes/no choice, the saved answer, correction/closed states, neutral denial and response-loss recovery. Link to the existing private safety report without conflating reporting and attendance. Follow the shared Carolina blue/white design system; inspect usepals.com, read the design skill and UX direction, make an interaction plan, then verify authenticated production-build desktop/mobile and keyboard/loading/empty/error states. Produce a handoff and independent exact-tip review before integration.

Each stage receives a narrower reviewed contract on canonical main and a fresh task-specific agent/worktree before implementation. The coordinator owns NOW/BACKLOG/CURRENT_STATE/CHANGELOG and integration. A stage cannot silently add attendance notifications, peer projections, analytics or retention rules.

## Exclusions

No hosted migration, live student test, production data, deployment or gate enablement. No geolocation check-in, QR code, host marking of others, peer attendance disclosure, public ratings, badges, feed, ranking change, friendship automation, report automation, safety-question collection, scheduled worker, push/email/Realtime, PostHog instrumentation, or correction after the accepted window. Do not alter TASK-017's completed moderation flow or the existing report intake semantics.

## Acceptance criteria

- Explicit acceptance of ADR-0022 precedes schema, permission and UI implementation.
- Only the authenticated caller can create, read or correct their own response; direct table/REST, forged actor, platform-role and cross-account attempts disclose nothing. Hidden-source ID-only access never includes source or peer detail.
- Early, late, pre-start-cancelled, disabled, suspended and banned attempts fail; eligible host, joined, left and removed rows follow the accepted policy. Answer correction uses revision concurrency and lost-response recovery without duplicate records. Schedule edits after opening fail at the database boundary; edits before opening move the window atomically.
- Block, leave/remove, cancellation, disable, sanction, source-gate and attendance-gate transitions are verified at their transaction boundary. Attendance does not weaken current Hangout, chat, notification or safety authorization.
- User-facing wording says self-reported, explains the general 30-day correction rule and shows whether correction is open; exact deadline is shown only with independently authorized source schedule. No UI claims that a join proves attendance. The safety link remains separate and private.
- Local database reset/tests, schema lint, relevant source regressions, workspace checks and rendered desktop/mobile production-build flows pass within recorded limits. End with zero disposable fixtures, gates false and owned services stopped.
- Each stage has a handoff and fresh exact-tip review. Accepted work is integrated into `main`, with task and main SHA independently verified remotely and shared records updated. Leave TASK-018 incomplete until all of these gates are met.

## Planning findings

`public.hangout_participants` currently stores join/left/removed state and transition times, but has no attendance field. Rejoining overwrites its latest `joined_at`, so the contract must not infer physical presence or require an unrecorded historic join interval. The existing retained-ID safety lookup proves an ID-only pattern but depends on the separate safety gate; attendance needs its own bounded owner list. ADR-0017 deliberately deferred attendance notifications. The existing product specs give no answer timing, correction or peer-visibility rule; ADR-0022 is required rather than guessing in a migration.
