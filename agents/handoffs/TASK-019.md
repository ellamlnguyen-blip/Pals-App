# TASK-019 handoff — local analytics implementation pending final flow acceptance

Status: active. Reviewed code is on independently remote-verified canonical main `51106b4195748076875b611dc7042c89675a360d`; authenticated event-to-sink verification remains open under the standing gates-off instruction.

## Decision and scope

- The user accepted ADR-0023 as written for disposable-local scope on 2026-09-25. It requires affirmative memory-only consent, an anonymous random visit ID, a fixed event allowlist, a minimal personless payload and no attendance or safety events. Hosted retention and transport controls require a separate release review.
- A's exact remote task tip `f08bd5fe4741bd807ee42c92acb4ac14a7f14a91` and B's exact remote task tip `3ff4737e9eaa495e58f7c41659c9f2ff91fc20a6` passed fresh privacy/security/design/product reviews with no remaining P0/P1/P2. See `TASK-019A.md` and `TASK-019B-event-wiring.md` for evidence and implementation limits.
- No SDK, database schema, hosted PostHog target, feature-gate change, admin/mobile instrumentation, live student data or deployment was added.

## Verified result

- The local adapter starts off, keeps consent only in the current tab, resets on reload, rechecks owner access and suppresses capture on revocation, identity uncertainty and sign-out. The account choice was inspected with a disposable authenticated local account for on/off/reload and keyboard behavior. The disposable user was deleted.
- B wires nine of the 14 approved names: saved Hangout map and detail views, Calendar, People profile and Notifications inbox views, Hangout leave, friend-request acceptance, first DM request and first Hangout chat message. It suppresses `onboarding_completed`, `hangout_created`, `hangout_joined`, `friend_request_sent` and `hangout_cancelled` because current results cannot prove new commits or the student cancel callsite does not exist. This undercounts; it avoids counting a replay or uncertain result as a new action.
- Final B `pnpm check` passed with 46 tests and web/admin builds. A real loopback HTTP sink received only the approved `api_key`, event, random visit `distinct_id`, `schema_version: 1` and `$process_person_profile: false` fields; no account ID, Referer or Authorization header was observed. No external PostHog ingest occurred. Local database inspection found all nine gates false and zero `task019b-%` users; local services were stopped.

## Open acceptance gate

- Authenticated desktop and phone event-to-sink runs across actual authorized map/detail, People, DM, chat and Notifications flows are not verified. Those flows require temporary local product gate enablement, while the standing instruction forbids gate enablement. Unit and loopback adapter checks do not substitute for this check. Keep TASK-019 active and do not hand off the next milestone as complete until the instruction is resolved and this evidence is obtained or the acceptance criteria are explicitly revised.
- Hosted PostHog project controls, region, 90-day maximum raw retention, access/deletion and browser transport metadata remain a separate future release gate. Do not turn on hosted capture from this handoff.
