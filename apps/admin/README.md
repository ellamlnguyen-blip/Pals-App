# Pals local moderation console

This private operator workspace runs only at `http://127.0.0.1:3001`. Copy `.env.example` to `.env.local`, supply the **local publishable/anon key**, start the disposable local Supabase stack, then run `pnpm dev:admin`. Hosted origins and service keys are rejected. The moderation gate remains disabled until a local test fixture explicitly enables it.

The console uses cookie-backed Supabase Auth. The server calls only the audited moderation RPCs for report reads and writes. The signed-in caller's own role/status is read under owner RLS for control visibility; each RPC rechecks current authority. Report IDs, allegation text and action payloads stay out of URLs and browser storage. No analytics are loaded.

Queue pages contain at most 24 reviewable reports. Opening a detail performs a separate audited read. Every action captures its report, case revision and request UUID before confirmation. If an action response is lost, use **Retry same request** in the same tab; a reload loses that pending request, so open a fresh detail and verify state before any new action. Case actions do not sanction a target. Account suspension/ban/reinstatement and Hangout disable do.

This is a disposable local review tool, not a staffed or hosted moderation service. Return the local gate to false and remove fixtures after tests. Use the repository's `pnpm --filter @pals/admin typecheck` and `build` checks when dependencies are installed.
