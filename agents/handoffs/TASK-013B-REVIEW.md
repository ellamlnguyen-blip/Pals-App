# Review — TASK-013B local Hangout chat UI

Date: 2026-09-23
Reviewed task branch: `agent/TASK-013B-hangout-chat-ui` at `620cb11424b5238343b00069a157a03ef849a974` (local HEAD and `git ls-remote` matched)
Reviewer: fresh GPT-6 Sol medium security/design agent; dispatch tooling did not expose or verify Standard speed
Disposition: **Clear for local integration**

## Findings and resolution

- First exact-tip review blocked `9da44c96f8ec91bf61953a0a73d7136b68d923ee`: signout could reveal old text before completion; one signout path and sign-in emitted no cross-tab signal. The UI agent added paired transition signaling to all in-app auth paths. The coordinator verified both signout paths mask the other tab immediately, account switching stays denied, and Back reauthorizes before showing text.
- Second exact-tip review blocked `5db260be3284af6fe18c1729d270d862c63d750f`: a user-editable URL marker could release the mask early, and polling walked beyond the explicit first 50-message page. The final tip treats a marker only as a guarded API probe. An old account's 200 response leaves text masked; 403 terminally denies, clears pending work and stops polling. Failed sign-in cancellation reauthorizes only after an authorized old-account probe. Polling reprojects one current page of at most 50 messages; Previous/Load newer are explicit.
- A fresh read-only exact-tip review at `620cb11424b5238343b00069a157a03ef849a974` found no blocking security/design issue. The reviewer checked caller-bound/no-store API, message rendering, transition races, stale-response generation, denial stop and page navigation. It independently ran three focused Node tests and `git diff --check`; it did not rerun the HTTP suite or browser checks.

## Coordinator verification

The UI agent's `pnpm check` and focused real local Auth/PostgREST/web suite passed. The coordinator's CUA checks covered desktop/tablet/390px/320px layout, 320px multiline keyboard send, both signout paths, different-account denial, Back reauthorization, successful-send textarea focus, and a 70-message thread: first 50 remain after an 8.5-second poll, Load newer shows only 51–70, Previous returns to 1–50. Both local gates are false, disposable data is gone and web/Supabase/Lima are stopped. See `agents/handoffs/TASK-013B.md` for exact limits.

## Limits

Hidden in-flight requests, a lost browser POST response with a changed draft, and a spoofed completion marker were not exercised end-to-end in a browser after the final change. Generation invalidation, same-key server idempotency, transition decisions and page fetches have code/unit/HTTP evidence, but this is not a browser claim. No hosted environment, Realtime, global block rule or DM permission was reviewed or enabled.

Coordinator integration and verified main SHA are recorded in `agents/handoffs/TASK-013.md` and the final task status.
