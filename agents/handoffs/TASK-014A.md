# TASK-014A handoff — local DM backend

Status: implementation on task branch for independent security review; not integrated or complete on main.

## Baseline and scope

- Branch: `agent/TASK-014A-dm-backend`; started from verified canonical `origin/main` `3681bdb8409a4f027e032f562d33d550aa42167b`.
- Accepted authority: ADR-0016 and published TASK-014A. No hosted operation, UI, Realtime, notification or global Hangout block change.
- The dispatch tool had no speed selector; GPT-6 Sol medium was requested by the coordinator. Standard speed was not independently configurable or verified here.

## Outcome

- Added additive `20260923000300_local_direct_messages.sql` with a default-disabled private DM gate, retained canonical generations, immutable messages/retries, directional suppression, RLS and explicit client revokes. No DM table is published to Realtime.
- Added caller-bound request, transition, send and bounded active inbox/status/body RPCs. Creation, acceptance and send recheck current bilateral People eligibility after shared locks on both gates and readiness evidence. All pair mutations, including People block, use the existing deterministic friendship pair lock. A People block terminates an active DM pair with the DM gate off and preserves friendship teardown. Terminal generations have no client reader.
- Added actual-role SQL, real Auth/PostgREST and observed overlapping-session race tests. Updated only backend/API, data, authorization, security, messaging and testing docs.

## Verification

- Three clean disposable local database resets applied all migrations, including the new one. On the first two resets, all eight database SQL suites passed; the final expanded DM suite also passed with 39 assertions, and all eight SQL suites passed afterward. Supabase's `db:test` wrapper could not bind-mount `/private/tmp` into Lima; the same SQL files ran directly through `docker exec -i ... psql -v ON_ERROR_STOP=1`, with TAP output checked for `not ok` and failure summaries.
- Real local Auth/PostgREST DM test passed. Existing friendship and Hangout-chat HTTP tests passed. New observed-lock race test passed opposite-direction creates, block versus reply, opt-out versus accept, and block versus send. Existing People, friendship and Hangout-chat concurrency suites passed. Stronger-isolation DM reader denial was exercised in the new race suite.
- `pnpm check` passed twice (format, lint, typecheck, unit tests and web/admin builds). `pnpm db:lint` passed with no schema warnings after correcting reader function volatility.
- Final local inspection: all People, friendship, Hangout, Hangout-chat and DM gates false; DM pairs/messages/retries and DM Auth fixtures zero; DM private tables had zero anon/authenticated grants and zero Realtime publication entries. Supabase and the disposable Lima VM were stopped.

## Review focus and limits

- Independently review the fixed-search-path definer RPCs, same-statement reader guards, People-block extension, retained evidence and shared pair lock before main integration. The tested local boundary does not supply hosted retention/moderator access, notifications, Realtime or UI.
- The test matrix demonstrates key revocation orders and client boundaries. It does not individually instrument every readiness component or an in-flight body read after a later revocation; the implementation uses the same shared-row-lock and projection patterns already exercised in friendship/chat suites. Reviewers may add targeted tests before acceptance.
- The canonical main SHA above is the verified implementation baseline. The task branch's final pushed tip is independently verified in the accompanying task report; the coordinator owns review, status publication and main integration.
