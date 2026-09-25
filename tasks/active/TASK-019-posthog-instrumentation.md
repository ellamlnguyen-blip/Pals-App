# TASK-019 — Minimal PostHog instrumentation

Status: Local implementation integrated; authenticated event-flow acceptance pending under nine-gates-off constraint
Date: 2026-09-25
Planning baseline: independently queried remote `main` at `937672d184098d6f5cb8e5226d0bb84104fcf71e` (TASK-018 complete; nine local feature gates off)

## Goal

Explain where consenting students encounter friction in the accepted hangout loop while keeping Postgres authoritative for identity, social state, safety and self-reported attendance. This is a disposable-local web increment. It does not make the already-local product ready for hosted analytics.

## Dependencies and decision gate

- Read `AGENTS.md`, `docs/product/MVP.md`, `docs/engineering/ANALYTICS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `AUTHORIZATION.md`, `SECURITY_AND_SAFETY.md`, the relevant flow contracts, and ADR-0010/0014/0015/0016/0017/0018/0019/0022.
- TASK-018 is complete only for its bounded local scope. Its private answers and hidden-source ID path remain private.
- Accepted ADR-0023 settles the new consent, identity, payload and provider-retention policy for disposable-local scope. The acceptance receipt on independently verified `main`, a narrow implementation contract and fresh task-specific implementation agent precede runtime code.
- The coordinator reviews the implementation handoff and obtains fresh exact-tip privacy/security review before integrating. Keep unreviewed code off `main`.

## Event contract

PostHog receives only these exact event names, after an affirmative analytics opt-in. Every event has one application property, `schema_version: 1`, plus the provider control property `$process_person_profile: false`. The necessary provider envelope includes the event name, a random visit `distinct_id` and transport fields; it is not an application-property exception. No dynamic application property, source UUID, free text or URL is allowed. View events fire at most once per successful surface opening in a browser visit; mutation events fire only after a confirmed **new** commit, never on a click, optimistic state, replay, retry, error or uncertain response. The implementation must prevent duplicate events for rerenders and navigation races; PostHog counts are directional, not authoritative transaction counts.

| Event | Trigger | Authoritative record or limit |
| --- | --- | --- |
| `onboarding_completed` | Ready profile is confirmed after onboarding | `public.accounts`, `public.university_memberships`, `public.profiles`; verification and readiness come from Postgres |
| `hangout_map_viewed` | Authorized saved-Hangout map discovery result is usable | No view ledger; mock examples do not count; no map center, bounds, device location, filters or pin IDs |
| `hangout_detail_viewed` | An authorized saved Hangout detail is rendered | No view ledger; never send Hangout ID, title, visibility, place, roster or host |
| `hangout_created` | Create RPC is confirmed committed | `public.hangouts`; no creation-request ID |
| `hangout_joined` | Join RPC is confirmed committed | `public.hangout_participants`; no participant/Hangout ID |
| `hangout_left` | Leave RPC is confirmed committed | `public.hangout_participants`; no reason or ID |
| `hangout_cancelled` | Cancel RPC is confirmed newly committed; wiring deferred until an authorized student cancel call site exists | `public.hangouts`; no schedule or ID |
| `calendar_viewed` | Authorized Calendar result is usable | No view ledger; no date range or attendance context |
| `people_profile_viewed` | Authorized People profile is rendered | No view ledger; no peer ID or profile content |
| `friend_request_sent` | Request RPC is confirmed committed | `private.friendships` and request ledger; no peer or generation ID |
| `friend_request_accepted` | Acceptance RPC is confirmed committed | `private.friendships`; no peer or generation ID |
| `dm_request_sent` | First-message request is confirmed committed | `private.dm_pairs` and request ledger; no peer, body or generation ID |
| `hangout_chat_message_sent` | Message send is confirmed committed | `private.hangout_messages`; no body, author, room or message ID |
| `notifications_viewed` | Authorized Notifications inbox renders | `private.notification_items` remains authoritative for delivered/read state; no item, source, category or target ID |

This is an explicit allowlist. No generic pageviews, autocapture, session replay, heatmaps, surveys, exception capture, form capture, group analytics or person profiles. In particular **no PostHog event** for an attendance prompt, answer, correction, answer value, retained Hangout ID, report, block, moderation action or safety feedback. There is no client-side export of private database records.

The adapter allowlist contains all 14 names. Current Stage B wiring may leave `hangout_cancelled` unused because the student web has no cancel UI/call site. It must record that deferral rather than invent a new cancel action in analytics scope. `onboarding_completed` is also conditional on proving a one-shot newly completed save; do not substitute a ready-page view.

## Authoritative measurement

- Verified students: accepted verification/readiness records. Hangouts created/cancelled and repeat hosting across distinct Hangouts: `public.hangouts`. Current/latest joins and participation across distinct Hangouts: `public.hangout_participants`. Its row overwrites join time on rejoin, so complete join/leave counts, repeated joins to the same Hangout and historical join-to-attendance conversion are **not computable** from that row. No new history ledger is in scope.
- Friendship and DM outcomes: their private state and request ledgers under existing authorization. Notifications: private ledger. Reports and moderation: private safety/case/audit records, available only through their accepted operator boundaries.
- Attendance confirmation: latest `private.attendance_answers` value under ADR-0022, labeled **self-reported**. Its `attended` value is never sent to PostHog or inferred from a join, message, location or elapsed time. A future aggregate read/export needs its own authorization and small-cell disclosure review; this task does not add one.
- PostHog's anonymous browser-visit sequence can describe discovery → detail → join → chat within that visit. Cross-visit repeat hosting and participation in distinct Hangouts can be calculated only from authorized Postgres aggregates; repeated same-Hangout joins and full historical conversion are unavailable. Do not join PostHog events to account, Hangout, peer, message or attendance rows. Notification item-to-destination opens are deferred: the current plain link does not prove destination authorization after a possible revocation.

## Implementation boundary after policy acceptance

1. Add one student-web-only analytics adapter with a typed event allowlist, a local test sink, and an explicit disabled default. Lazy-load the provider only after affirmative consent and local environment configuration. The admin app and Supabase functions never initialize it.
2. Add an accessible student analytics choice and revocation path. Consent is memory-only in the current tab and resets to off on reload; no account identifier or consent choice is persisted in browser storage. A missing/invalid choice means off. Revocation stops capture immediately, clears local provider state and rotates the anonymous visit identity; sign-out/account switch does the same. Revocation and sign-out broadcast to other open Pals tabs to stop their capture; a tab that cannot confirm its current authenticated account remains off. Do not queue or backfill pre-consent events.
3. Use anonymous visit identity only, with in-memory persistence and no `identify`, `alias`, group or account ID. Configure and verify that optional provider features and automatic event/property collection are off. Inspect the full request envelope, headers, query string and SDK-added properties in the local sink; reject source identifiers, URLs, location or unreviewed metadata. Only the event name, random visit ID, `schema_version: 1` and strictly necessary provider protocol fields may remain. Technical transport metadata such as IP still reaches the provider on a direct browser request and needs a separately reviewed hosted release decision.
4. Analytics is best effort: missing configuration, denied consent, blocked network, timeout or provider error cannot delay a route, mutation, authorization or safety action. No database trigger or schema change. No retry queue, local event log or server forwarding in this task.

## Local-only verification and acceptance gates

- Deterministic adapter checks cover every allowed name, application properties and necessary protocol envelope, default-off/reload state, opt-in, same-tab and cross-tab revocation, sign-out/account switch, denial, retry and uncertain-result handling. Inspect actual outbound local sink requests, including URL and headers, for unwanted SDK defaults and dynamic fields.
- Verify representative authenticated create → detail → join → chat, Calendar/People/notification navigation and onboarding readiness with the local sink; verify one private attendance answer and one safety/report flow emit **nothing**. Check hidden-source and rejected actions emit nothing.
- Verify consent UI and responsive/keyboard/loading/error behavior on desktop and phone if the implementation adds UI. Local `pnpm check` and focused regressions pass within recorded limits. No external PostHog ingest is used for verification.
- End with zero disposable fixtures, nine product gates false and owned services stopped. A handoff records evidence and limits. Fresh exact-tip privacy/security review finds no unresolved P0/P1/P2 issue. Task branch and integrated `main` tips are independently checked against remote refs; docs/status are updated.

## Exclusions and hosted release hold

No hosted PostHog project creation/change, live student traffic, production data, hosted migration, gate enablement, deployment, export, warehouse sync, reverse ETL, dashboard launch or cohort/person import. No attendance/safety/moderation analytics events. No new DB schema, consent ledger or SDK in admin/mobile. A separate hosted-release task must verify vendor project region, retention, deletion, access, IP/geolocation handling, consent copy and outbound payloads before any real ingest. If the required provider controls cannot be verified, keep capture disabled.
