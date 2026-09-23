# Handoff — TASK-013 local Hangout chat

Date: 2026-09-23
Coordinator branch: `agent/TASK-013-planning`
Reviewed backend task branch: `agent/TASK-013A-hangout-chat-backend` at remote-verified `94219cd682449cf46a90035d001804ac92f1a2d1`
Reviewed UI task branch: `agent/TASK-013B-hangout-chat-ui` at remote-verified `620cb11424b5238343b00069a157a03ef849a974`
Canonical main integration: reviewed backend/UI and handoffs pushed and independently remote-verified at `f2404941aaf5cea5a830e9813950b33871b5e796`
Main status records: `tasks/NOW.md`, `tasks/BACKLOG.md`, `tasks/DONE.md`, `docs/operations/CURRENT_STATE.md`, `CHANGELOG.md`

## Outcome

Accepted ADR-0015 is implemented only for disposable local development. Current live-ready same-campus joined members of a published saved Hangout can read retained full text history and send immutable 1–2000-character messages with a stable request key. A default-disabled chat gate and the existing default-disabled Hangout gate both apply. Departed/unready authors are projected as Former participant; no peer profile or photo is read. The web app adds a saved-detail entry, a Chats Hangout list and a bounded text thread with one 50-message visible page, explicit Previous/Load newer navigation and local polling. The composer discloses full-history access for future eligible joiners and the People-block boundary.

## Review and verification

- Backend: two clean database resets, direct actual-role pgTAP suites, schema lint, real Auth/PostgREST checks and deterministic membership/readiness/gate races passed. Full workspace check passed. Fresh exact-tip security review cleared the backend; see `TASK-013A.md` and `TASK-013A-REVIEW.md`. The `pnpm db:verify` wrapper could not bind-mount the isolated worktree into the preserved Lima VM, so no wrapper-green or CI-green claim is made.
- UI: full `pnpm check` (23 Node tests, lint/types/build), focused real Auth/PostgREST/web route test, `git diff --check`, and fresh exact-tip security/design review passed after two documented blockers were corrected. See `TASK-013B.md` and `TASK-013B-REVIEW.md`.
- Coordinator CUA checks covered desktop/tablet/390px/320px navigation and layout, multiline send/focus, both cross-tab signout paths, account switch denial, Back reauthorization and a 70-message thread with one-page polling/forward/back controls. The final auth-probe spoofed-marker path, hidden in-flight read and lost-response browser retry were code/unit/HTTP reviewed but not exercised end-to-end in a browser.
- Both local feature gates are false, disposable Auth/Hangout/chat data was removed, and web/Supabase/Lima services are stopped. No hosted migration, deployment, Realtime or live student use occurred.

## Boundaries and remaining work

People blocks remain People-only. Global blocking/reporting/moderation, DMs, notifications, Realtime transport, hosted retention/deletion policy and launch safety are separate tasks. TASK-010 co-host authority remains blocked on Proposed ADR-0012. TASK-014 DM requests/direct chat is the next ready backlog item for a fresh bounded contract and policy review; this handoff does not accept a DM policy.

## Publication receipt

Task branch SHAs above were independently verified against `origin`. Reviewed backend was first integrated on remote-verified main `543d064bd9962c963cbebb0ba8df0f8c0e05e60c`; final reviewed UI, stage/parent handoffs and review record were integrated and `origin/main` independently verified at `f2404941aaf5cea5a830e9813950b33871b5e796`. The final queue/completion receipt is published afterward; this integration SHA remains the exact reviewed-code baseline. TASK-013 is complete only for the accepted disposable-local scope and the test limits stated above.
