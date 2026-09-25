# TASK-019 handoff — disposable-local analytics complete

Status: complete for the bounded local scope on 2026-09-25. Reviewed A and B code is integrated on canonical main through `563c715c4dc28ef052fa563b633813695664c2ef`; the final browser acceptance run changed documentation only. ADR-0023 is Accepted. No hosted PostHog target, live student traffic, schema change, deployment or persistent gate enablement was used.

## Result

- The student web offers affirmative, memory-only analytics consent. It starts off in each tab and after reload, rechecks current account access, and stops on revocation, sign-out or uncertain identity. The local capture transport accepts only the fixed 14-name allowlist and a validated loopback sink.
- Nine names have conservative runtime call sites: `hangout_map_viewed`, `hangout_detail_viewed`, `hangout_left`, `calendar_viewed`, `people_profile_viewed`, `friend_request_accepted`, `dm_request_sent`, `hangout_chat_message_sent`, `notifications_viewed`. Five approved names remain intentionally unwired: `onboarding_completed`, `hangout_created`, `hangout_joined`, `friend_request_sent`, `hangout_cancelled`. The first four lack proof of a newly committed transition in current action results; the student cancel action does not exist. These are documented undercounts, not counted by inference.
- A and B passed fresh exact-tip privacy/security/design or product reviews with no remaining P0/P1/P2. The integrated `pnpm check` passed formatting, lint, typechecks, 46 tests and web/admin production builds. See `TASK-019A.md` and `TASK-019B-event-wiring.md`.

## Authenticated browser acceptance

The user explicitly authorized temporary enablement of only the needed gates in disposable local Supabase, with synthetic UNC accounts and a loopback sink, followed by full cleanup. On a built local web app, three synthetic verified/ready UNC accounts exercised the authorized desktop Hangout map/list/detail, leave and rejoin, Calendar, People profiles, friend acceptance, first DM request, Hangout chat send and Notifications inbox. The sink received 11 requests covering all nine wired event names. Refreshing the saved list and inbox did not duplicate view events. The mock Hangouts shell emitted nothing. Rejoining emitted no `hangout_joined` because that name is deliberately unwired.

With consent on, a private attendance answer and correction and a synthetic Hangout safety report emitted nothing. With consent off, an authorized Notifications revisit emitted nothing. With consent on but Notifications access denied, the page showed the denial and emitted nothing; the gate was restored before cleanup. At 390 × 844, the authenticated Notifications and saved-Hangout routes rendered, the saved list loaded, controls remained usable and document width equaled viewport width (390 px). The fallback list worked without a Mapbox token.

Every observed request used `/capture/`, body keys exactly `api_key`, `event`, `distinct_id`, `properties`, and properties exactly `schema_version: 1`, `$process_person_profile: false`. There were no Authorization, Referer or Cookie request headers, no source IDs, account IDs, message text, Hangout title or other fixture strings in bodies. Three random distinct IDs were observed across opt-in/reload transitions. The sink was loopback only and kept requests in memory.

The representative Hangout was created as a synthetic fixture through the local backend before the browser run; the UI then opened, left, rejoined and chatted in it. The current create action's ambiguous new-versus-replay result remains the reason `hangout_created` is unwired. Onboarding completion, creation, friend-request send and cancellation were not separately asserted end to end in this run. The adapter and focused action tests cover their conservative suppression; no claim of complete funnel counts is made.

## Cleanup and release boundary

The disposable database was reset after QA. Direct database inspection found zero Auth users, Hangouts, friendships, DM pairs, Hangout chat messages, attendance answers and safety reports; all nine product gates were false. Supabase and the Lima VM were stopped, the browser tab closed, the viewport override reset and temporary scripts/fixture credentials removed.

Hosted release remains a separate decision. Verify provider project region, raw retention (at most 90 days), deletion/access, browser transport metadata, consent copy and outbound payload before any real ingest. Keep hosted capture disabled until that review is accepted. A future bounded contract may add authoritative new-commit signals for the four deferred non-cancel events and a separate cancel UI if product scope calls for them.
