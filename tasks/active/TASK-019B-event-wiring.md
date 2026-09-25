# TASK-019B — Wire reviewed local analytics events

Status: Implemented and exact-tip reviewed; authenticated event-to-sink acceptance pending under nine-gates-off constraint
Date: 2026-09-25
Parent: `TASK-019-posthog-instrumentation.md`

## Goal and dependency

Use the reviewed A adapter to emit the exact 14 parent events from existing student-web surfaces. Start only from an independently remote-verified main tip containing accepted ADR-0023 and reviewed A. The parent event table is authoritative; do not reinterpret it, add properties or add event names.

## Boundary

- Wire views only after the relevant authenticated/authorized result has rendered; at most once per actual surface opening in a browser visit. Hidden, denied, loading, error, stale and mock-only surfaces emit nothing. `hangout_map_viewed` applies only to the saved-Hangout discovery result, not the mock shell. `notifications_viewed` means the authorized inbox rendered, not an item click or destination link.
- Wire mutation events only after a confirmed **new** commit. A click, optimistic update, server rejection, idempotent replay/known result, retry of an already committed request, unknown outcome or stale response emits nothing. If an existing result shape does not distinguish new commit from replay, suppress the event and record undercount rather than add a new server marker without review. Apply this to Hangout creation, friend/DM requests and chat retry keys. Reconcile uncertain outcomes through existing owner-authorized reads for product UX, but never infer a new commit solely for analytics.
- `onboarding_completed` needs an explicit one-shot signal from the completed profile save/readiness transition while the current tab has consent. Rendering an already-ready page or returning from an old redirect is not enough. If the existing redirect cannot safely produce that signal without new server state, defer this event and document the missing evidence; do not count a page view as completion.
- The event is best effort and must never block a business action, change retry semantics, expose source IDs or weaken an existing authorization boundary. Do not capture report, block, moderation or attendance interactions. Do not add database triggers, tables, logs or a hosted analytics path.
- Keep account/session transitions and route races from emitting after consent revocation or current access uncertainty. Reuse A's gating; no per-route analytics state store.

## Verification and handoff

Focused local sink checks exercise every wired event across onboarding if its one-shot save evidence exists, Hangouts saved map/detail/create/join/leave, Calendar, People profile/friend request/accept, first DM request, Hangout chat send and Notifications inbox. `hangout_cancelled` remains a typed but unused allowlist name until a separately reviewed student cancel flow exists; do not add that flow here or claim a cancel event was exercised. Check exactly one event for a newly confirmed action or rendered opening and zero for denied, mock, duplicate rerender, idempotent replay, response loss, revoked access, no consent, private attendance answer and safety/report flows. Inspect real request envelopes. Run relevant local workspace and rendered desktop/phone flows within recorded limits; leave fixtures zero, nine product gates false and services stopped. Produce a handoff, task branch, fresh exact-tip privacy/security review, verified main integration and final TASK-019 status records. Hosted capture and deployment remain separate.
