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

- Three clean disposable local database resets applied all migrations in the initial implementation, including the new one. On the first two resets, all eight database SQL suites passed; the expanded DM suite passed with 39 assertions, and all eight SQL suites passed afterward. Supabase's `db:test` wrapper could not bind-mount `/private/tmp` into Lima; the same SQL files ran directly through `docker exec -i ... psql -v ON_ERROR_STOP=1`, with TAP output checked for `not ok` and failure summaries. The review follow-up extends the DM suite to 46 assertions and reruns the reset and suites; see its final task report.
- Real local Auth/PostgREST DM test passed. Existing friendship and Hangout-chat HTTP tests passed. New observed-lock race test passed opposite-direction creates, block versus reply, opt-out versus accept, and block versus send. Existing People, friendship and Hangout-chat concurrency suites passed. Stronger-isolation DM reader denial was exercised in the new race suite.
- `pnpm check` passed twice (format, lint, typecheck, unit tests and web/admin builds). `pnpm db:lint` passed with no schema warnings after correcting reader function volatility.
- Final local inspection: all People, friendship, Hangout, Hangout-chat and DM gates false; DM pairs/messages/retries and DM Auth fixtures zero; DM private tables had zero anon/authenticated grants and zero Realtime publication entries. Supabase and the disposable Lima VM were stopped.

## Review focus and limits

- Independently review the fixed-search-path definer RPCs, same-statement reader guards, People-block extension, retained evidence and shared pair lock before main integration. The tested local boundary does not supply hosted retention/moderator access, notifications, Realtime or UI.
- The original test matrix demonstrated key revocation orders and client boundaries. The final follow-up adds direct DM checks for both gates, account status, primary photo, campus membership, opt-in and an in-flight body read. Other Auth evidence, such as a confirmed-email change or photo-object deletion, follows the same locked evidence path but is not individually instrumented here.
- The canonical main SHA above is the verified implementation baseline. The task branch's final pushed tip is independently verified in the accompanying task report; the coordinator owns review, status publication and main integration.

## Independent review follow-up

The first exact-tip security review cleared the authorization and privacy boundary but found a campus behavior mismatch and missing race evidence. The formation-campus equality checks in accept/send were removed: live bilateral same-campus eligibility now controls all bodies and mutations, matching the reader and ADR-0016. The expanded SQL suite proves acceptance, reading and sending after both users transfer together to a new eligible campus, plus body/send denial while campuses differ. The overlapping-session suite now proves ignore beats reply, reply beats ignore, and a committed block defeats the losing opposite create. These changes require a fresh exact-tip review before integration.

After this follow-up, a clean disposable-local reset applied every migration. All eight SQL suites passed, including 46 DM assertions. Seven serial real Auth/HTTP and observed-lock concurrency suites passed across DM, People, friendship and Hangout chat. `pnpm db:lint` found no warning and `pnpm check` passed. Final inspection again found all five local feature gates false, no DM pair/message/retry/Auth fixtures, no DM client grants and no Realtime publication. The Supabase stack and Lima VM were stopped. The new pushed SHA is independently verified in the accompanying task report.

## Final security evidence follow-up

The next exact-tip review found no code defect and requested direct DM evidence for gate/account/photo/campus/preference races and in-flight body reads. `dm-revocation.integration.mjs` now waits for observed PostgreSQL row-lock contention in both commit orders for each of the DM gate, People gate, peer account status, primary photo, campus membership and People opt-in. Revocation committed first denies the waiting send; a send holding eligibility locks first commits one message while revocation waits, after which a subsequent body read is denied or empty. A materialized authorized DM page is paused inside the read statement, revocation commits during that pause, the in-flight page completes with its previously authorized body, and a subsequent reader gets no body. This is disposable-local evidence and does not imply recall of previously delivered text.

The final clean local reset applied every migration. All eight SQL suites passed, including 46 DM assertions. Eight serial real Auth/HTTP and observed-lock concurrency suites passed across DM, People, friendship and Hangout chat. `pnpm db:lint` reported no warnings and `pnpm check` passed. Final inspection found all five feature gates false, zero DM pairs/messages/retries/Auth and fixture-campus rows. Supabase and Lima were stopped. The new remote tip is independently verified in the accompanying task report.
