# TASK-027O — Genuine Auth-backed moderation concurrency

Status: Ready after TASK-027K review/integration
Parent: TASK-027
Date: 2026-10-05

Replace only the positive moderator setup in `supabase/tests/moderation-concurrency.integration.mjs` with genuine disposable local Auth TOTP enrollment, challenge and verification for its two operators. Carry signed AAL2 session claims from real Auth tokens into the parallel SQL race transactions while retaining existing lock-order, denial, audit, conflict and cleanup assertions. Do not forge positive JWTs, insert positive Auth factors/sessions by SQL, weaken `private.moderation_actor()`, or use a service-role key for caller requests.

Reset the disposable local stack, run the focused race suite, prove both successful and denied wait orders, verify closed gates and fixture cleanup, and request independent security review before parent integration. TASK-027K's 0/1 legacy race remains a release blocker until this task passes.
