# Changelog

## 2026-09-25 — TASK-020A backend contract

- Reviewed the narrow local backend contract for host size awareness, a private signal and viewer-safe saved discovery. The contract specifies join/gate lock order and preserves the existing two-read discovery revalidation. Runtime implementation remains pending.

## 2026-09-25 — ADR-0024 accepted for local TASK-020

- User explicitly accepted the reviewed 25-member safeguard policy, host warning, private unconsumed signal and saved-map dampening for disposable-local implementation. Narrower stage contracts, review and publication remain before code work; no hosted or runtime change occurred.

## 2026-09-25 — TASK-020 safeguards proposal

- Defined a bounded disposable-local contract and Proposed ADR-0024 for a provisional 25-member host warning, voluntary joining control, a private unconsumed review hook and saved-map dampening. Explicit acceptance and reviewed stage contracts are required before implementation. No runtime or hosted state changed.

## 2026-09-25 — TASK-019 local browser acceptance

- With explicit authorization, temporarily enabled only necessary gates in disposable local Supabase and used three synthetic UNC accounts. Authenticated desktop flows sent all nine wired event names to an in-memory loopback sink with the approved minimal envelope; 390 px saved-Hangout and Notifications routes rendered and remained usable. Consent-off, denied Notifications, private attendance answer/correction and a safety report sent nothing. Reset verified zero fixtures and all nine gates false; local services stopped. TASK-019 is complete for local scope, with five conservative undercounts and a separate hosted-release hold.

## 2026-09-25 — TASK-019B reviewed local event wiring

- Wired nine approved student-web events through the memory-only adapter. Five approved names remain unwired where existing results do not prove a new commit or no student cancel action exists. Exact-tip review and 46 workspace tests passed; a loopback sink confirmed the minimal personless envelope. Authenticated event-flow browser verification remains open with all nine local gates required to stay off. No hosted capture or deployment occurred.

## 2026-09-25 — TASK-019A local analytics foundation

- Added a default-off, memory-only student analytics choice and 14-name PostHog-compatible adapter for an explicit loopback sink under Accepted ADR-0023. No product event is wired yet. Exact-tip review and workspace/authenticated local checks passed; fixtures were removed, nine gates remain false and services stopped. TASK-019B and canonical main publication are next; hosted capture remains out of scope.

## 2026-09-25 — TASK-019 analytics policy accepted

- The user accepted ADR-0023 as written for disposable-local implementation after independent planning review and publication. A narrower contract and fresh implementation review remain required. No hosted PostHog ingest, live user, gate enablement or deployment is authorized.
- Independently reviewed separate A adapter/consent and dependent B event-wiring contracts; clarified account revalidation, personless payload, runtime allowlist, replay suppression and unavailable cancellation UI before implementation.

## 2026-09-25 — TASK-019 analytics policy proposed

- Defined a bounded PostHog event allowlist and Proposed ADR-0023 for affirmative consent, anonymous visit identity, minimal payloads, private attendance exclusion and a hosted retention gate. Postgres stays authoritative. This is planning only; no analytics SDK, hosted ingest, live-user capture or deployment is authorized.

## 2026-09-25 — TASK-018 private attendance confirmation complete locally

- Reviewed A backend and B student UI are integrated for disposable-local use under Accepted ADR-0022. The UI and parent handoff are on independently verified main `b6d0d054dab901574a6cd06b07372fae3f5013ad`; task tips, tests, limits and cleanup are recorded in their handoffs. All nine gates remain false. Hosted release and TASK-019 analytics are separate.

## 2026-09-25 — TASK-018B private attendance UI

- Added a local-only owner attendance page, actor-bound no-store server route and small Calendar/account entries. The ID-only UI shows the caller's self-reported answer, actionable/closed states and separate safety link; stale, denied and uncertain saves recheck current owner authority. Fresh exact-tip review cleared the privacy fixes, and local authenticated responsive/light/dark/keyboard and failure checks passed within handoff limits. Main publication receipts remain; no hosted operation or gate enablement occurred.

## 2026-09-24 — TASK-018A private attendance backend

- Added a default-off local attendance gate, private self-answer relation, caller-bound own read/list/write RPCs and a post-opening database schedule freeze under Accepted ADR-0022. The corrected task tip passed exact-tip security review and disposable-local authorization, race, boundary, API, lint and workspace checks. Stage B UI and canonical main publication receipts remain; no hosted operation or gate enablement occurred.

## 2026-09-24 — TASK-018A first backend review

- The first private attendance backend tip passed local implementation checks and reached its remote task branch. Exact-tip security review found no migration defect but required four targeted evidence additions before main integration; Stage B remains dependent. No hosted operation or attendance gate enablement occurred.

Record meaningful product, architecture, schema, safety, and release changes—not every commit.

## 2026-09-24 — TASK-018 attendance policy accepted

- The user explicitly accepted ADR-0022's private self-reported attendance, opening/correction time rule, post-opening schedule freeze and ID-only privacy path for disposable-local implementation. Stage A/B reviews and main integration remain required; no hosted operation or gate enablement follows from acceptance.

## 2026-09-24 — TASK-018 attendance policy proposed

- Defined the bounded attendance-confirmation task and Proposed ADR-0022 for private self-reporting, time/correction limits and retained-ID privacy. Explicit acceptance is still required before any schema or permission change. No hosted operation or gate enablement occurred.
- Reviewed the narrower TASK-018A database contract, including a separate owner-only lock path and after-commit revocation tests. Implementation remains blocked on the proposed policy's explicit acceptance.
- Reviewed the dependent TASK-018B interaction plan for a private attendance page. It has no runtime change and awaits the accepted policy and Stage A backend.

## 2026-09-24 — TASK-017 disposable-local moderation console complete

- Replaced the admin placeholder with a private, local-only operator queue, audited report detail and confirmed case/account/Hangout actions over the accepted caller-bound RPCs. The console clears sensitive state on denial or revocation, guards late report/mutation responses and supports same-key retry after an uncertain result.
- Independent exact-tip source/security review and coordinator local Auth/browser checks passed, including two-operator stale decisions, unavailable targets, suspended/banned operators, responsive light/dark rendering and response loss. Final reset cleared fixtures and disabled all eight gates; no hosted or default-on operation occurred.

## 2026-09-24 — TASK-017B2 local Hangout disabling

- Added an audited, one-way operator action that disables the exact reported Hangout and atomically closes its case, with immutable private action and retry evidence. Disabled Hangouts lose student discovery, detail, roster, private-instruction, chat, notification-destination and mutation access, including direct database/API routes. Retained own ID/state and private safety reporting remain available under their existing gates.
- Accepted exact-tip security review and local permission, concurrency, cancelled-Hangout, block-reconciliation, browser-route and full workspace checks. Test fixtures were cleared, all eight gates returned false and local services stopped. This stage makes no hosted or default-on change; the admin UI remains pending.

## 2026-09-24 — TASK-017B2 Hangout-disable stage planned

- Defined a separate local backend stage for one-way audited Hangout disabling, with source-wide access denial and a narrow retained safety exception. No migration, gate enablement or hosted change is included in this planning record.

## 2026-09-24 — TASK-017B1 local account enforcement

- Added exact-report, case-linked account suspension, ban and reinstatement with role-specific authority, expected revision, idempotent retry, append-only sanction/audit records and atomic `action_taken` closure.
- Added account-status locks on direct profile/photo writes and selected social/notification cleanup writes so a committed sanction denies stale in-flight student mutations. Local SQL/Auth/Storage/concurrency/regression checks and clean-archive app builds passed; final remote integration remains. Moderation stays default-off, with no Hangout disable, admin UI or hosted action.

## 2026-09-24 — TASK-017B1 photo-link policy accepted

- The user accepted ADR-0021 for disposable-local account enforcement: a sanction blocks new authenticated photo access, while a previously issued signed URL may remain usable through its expiry and hosted caching may extend exposure. No enforcement code or hosted behavior changed in this decision record.

## 2026-09-24 — TASK-017B1 account enforcement planned

- Defined a bounded local account-sanction backend stage after completed audited review. Proposed ADR-0021 surfaces the preissued signed-photo-URL revocation limit for explicit decision; no enforcement code, gate enablement or hosted action is included.

## 2026-09-24 — TASK-017A local audited report review

- Added a default-disabled, caller-bound operator report queue, exact detail reader, review/annotation/closure case transitions, private retry ledger and append-only audit. The case-action audit retains the exact subject and current campus when available; reporter deletion cannot silently erase the allegation.
- Fresh security review, local authorization/concurrency/regression checks and direct workspace checks passed. The `pnpm check` wrapper itself stopped at a dependency-directory guard before running. All test fixtures were cleared, all eight gates are false, and local services stopped. Sanctions, admin UI and hosted operation remain separate stages.

## 2026-09-24 — TASK-024 Pals brand correction planned

- Added a follow-up prompt after TASK-023 because the delivered visual direction did not make the requested brand clear enough.
- Required the supplied Pals logo, UNC Carolina blue `#7BAFD4`, white canvas/surfaces, accessible supporting colors, and a shared-token route-wide correction.
- Frozen backend boundary: no schema, RLS, API, server-action, feature-gate, privacy, safety, or authorization changes.

## 2026-09-24 — TASK-017A case revision policy acceptance

- The user accepted ADR-0020's narrow `case_revision` field for an already authorized and audited operator report-detail response. It resolves the versioning policy gap for multi-operator case transitions; implementation and verification are still pending. No runtime or hosted behavior changed in this decision record.

## 2026-09-24 — TASK-017 local moderation policy acceptance

- The user accepted ADR-0019 after its independent planning review and publication. It bounds audited operator report review, exact case-to-target enforcement and default-disabled local moderation. Stage A still requires its reviewed contract and implementation; this entry changes no runtime or hosted behavior.

## 2026-09-23 — TASK-023 student web design alignment

- Added a cohesive shared visual system across the implemented student-facing web routes, informed by the live usepals.com reference while preserving Hangout-first navigation, access states, privacy and safety behavior.
- Fresh stage reviews, existing workspace checks and production-build authenticated local QA covered core create/discovery, Calendar, People, chat, Notifications and Safety flows. No backend, migration, permission or hosted change. A development-server-only request-scope issue is tracked separately.

## 2026-09-23 — TASK-016 local safety UI and completion

- Added active-owner Safety access, exact outbound block management, retained ID-only Hangout/host reporting, global consequence confirmations and explicit uncertain-response recovery. All legacy block writers remain denied; confirmed Direct chat blocking immediately clears its messages and composer.
- Fresh exact-tip review accepted final UI after state-refresh, pagination, navigation, source-authority and lifecycle fixes. Workspace, real API, deterministic ordering and independent responsive/light/dark-rule/keyboard/privacy checks passed within recorded limits. Fixtures cleared, seven gates disabled and task-owned services stopped. Hosted moderation and launch readiness remain separate; the unresolved notification fixture observation stays in the backlog.

## 2026-09-23 — TASK-016B private local reporting

- Added caller-bound user, Hangout and retained-host reports with private minimal provenance, opaque receipts, exact retry deduplication and an atomic five-new-reports-per-hour limit. No report reader or automatic moderation action.
- Independent exact-tip security review accepted the stage. Focused reporting/local API/concurrency/workspace checks passed; an unresolved one-off failure in an unchanged notification fixture is recorded separately. Safety UI and hosted readiness remain open.

## 2026-09-23 — TASK-016A local global blocking

- Extended the existing directional block across Hangout discovery, attendance, private details, chat and notification projections; added private retained evidence, deterministic reconciliation and safety-gated owner ID recovery.
- Independent exact-tip security review accepted the backend after local upgrade/reset, authorization, race and workspace checks. Legacy block-write controls are temporarily unavailable until the final confirmation UI. Reporting and hosted operation remain separate.

## 2026-09-23 — TASK-016 policy acceptance

- User explicitly accepted ADR-0018 after reviewed canonical publication. Narrower global-block backend, reporting backend and safety UI contracts still require independent review/publication; no implementation or hosted change follows from acceptance alone.

## 2026-09-23 — TASK-010 co-host policy accepted

- Recorded explicit acceptance of ADR-0012's local host/co-host authority, assignment, revocation and privacy rules after reviewed planning publication. Backend/UI implementation still requires separately reviewed contracts; no schema, app, hosted or gate change was made.

## 2026-09-23 — TASK-016 planning

- Prepared a bounded disposable-local blocking/reporting contract and Proposed ADR-0018 for independent review and canonical publication. Shared-Hangout departures, private/chat/notification separation and post-removal report eligibility require explicit policy acceptance; no implementation or hosted change.

## 2026-09-23 — TASK-015 local Notifications inbox and preferences

- Added a local-only private Notifications tab with bounded pages, read state, four optional-category preferences, neutral revoked-source rows and explicit destination reauthorization. The earlier A/B stages supply authoritative social, Hangout and chat items.
- Verified responsive and keyboard states, owner-bound/no-store HTTP, account-switch masking, source revocation, gate denial, refresh failure and uncertain writes. Independent final review cleared the exact UI tip. Gates and fixtures were cleared; hosted delivery, Realtime, push/email and global safety remain separate.

## 2026-09-23 — TASK-015B local Hangout notification events

- Added source-owned inbox items for material Hangout edits, essential cancellations, actual host-relevant joins/leaves and Hangout-chat messages. A fresh review found and drove a source-gate race correction before integration. Local reset, authorization, concurrency and workspace checks passed. UI and hosted delivery remain separate.

## 2026-09-23 — TASK-015A local notification ledger and social events

- Added a private default-disabled notification gate, owner preferences and bounded caller-bound inbox/mark-read operations. Authoritative friendship/DM transitions now create minimal local inbox items when gates and preferences allow. Independent security review and local database/Auth/race checks cleared the bounded backend stage; Hangout/chat events, UI and hosted delivery remain separate.

## 2026-09-23 — TASK-015 local notification policy accepted

- Recorded explicit acceptance of reviewed ADR-0017 after canonical publication. Split backend work into a private ledger/social events stage and a later Hangout/chat source stage before UI. This acceptance adds no schema, route or hosted delivery by itself.

## 2026-09-23 — TASK-015 notification policy proposed

- Planned a private disposable-local notification inbox and category preferences. Proposed ADR-0017 defines source events, minimal payloads, essential cancellation, muting and revocation. It awaits independent review, canonical publication and explicit acceptance; no implementation or hosted delivery is included.

## 2026-09-23 — TASK-014B local DM UI

- Added a consent-based first-message entry on People detail, Requests and Direct chats in Chats, and a direct text thread using the reviewed caller-bound DM backend. Pending senders see only a waiting state; current authorized recipients can accept, reply or ignore.
- Added bounded message pages, stable-key retry, no-store responses and private-text masking across visibility and account changes. Fresh reviews corrected overlapping auth-transition privacy and liveness races; signed-in local HTTP and rendered phone/tablet/desktop checks passed. Local gates and fixtures were cleared. No hosted, Realtime or global block release.

## 2026-09-23 — TASK-023 frontend design alignment planned

- Added a dedicated student-web visual alignment task informed by current usepals.com, scheduled after TASK-020 and before staging rehearsal.
- Required a shared-token/component and route-wide responsive pass while preserving existing backend schemas, RLS, API/action contracts, gates, and authorization behavior. No product or backend implementation is included in this planning change.

## 2026-09-23 — TASK-023 moved earlier

- Moved the student-web design alignment to immediately after TASK-016C and before TASK-017, instead of waiting until all remaining MVP tasks are complete.
- Later student-facing screens should use the established shared design tokens/components; staging will check consistency across the full product. The task still changes no backend contract or permission, and it does not replace the remaining functionality or launch tasks.

## 2026-09-23 — TASK-014A local DM backend

- Added reviewed private DM request, generation, message and retry storage behind a default-disabled local gate. Caller-bound operations enforce first-message consent, current People eligibility, narrow block teardown and terminal privacy. Local SQL/Auth/concurrency, workspace and schema checks passed within the documented test-wrapper limit; no hosted, Realtime or UI change.

## 2026-09-23 — TASK-014 DM policy acceptance

- User explicitly accepted ADR-0016's disposable-local DM request, consent, privacy and narrow People-block policy. Prepared the separate backend contract; no implementation or hosted change follows from acceptance alone.

## 2026-09-23 — TASK-014 DM planning

- Drafted a bounded disposable-local DM request/direct chat contract and Proposed ADR-0016. It specifies first-message consent, opt-in People eligibility, narrow DM-specific block behavior and privacy/revocation policy for review; no implementation or hosted change follows from the proposal.

## 2026-09-23 — TASK-013B local Hangout chat UI

- Added a Chats list and saved-Hangout text thread for current authorized participants, using the reviewed caller-bound chat RPC and no-store local API. The thread shows one 50-message page at a time, with explicit forward/back controls and author reprojection during visible polling.
- Added stable-key send recovery, plain-text rendering and account-change masking. Independent reviews drove corrections to early cross-tab unmasking and unbounded polling; local workspace/HTTP and rendered desktop/phone/auth/page-flow checks passed within the handoff limits. No hosted or Realtime change.

## 2026-09-23 — TASK-013A local Hangout chat backend

- Added reviewed private text-message storage, a default-disabled chat gate and caller-bound paged read/idempotent send for current ready joined members of published campus Hangouts.
- Live authorization, author redaction and transaction locks passed local SQL/Auth/concurrency checks and independent exact-tip security review. The database wrapper's Lima mount failed, so equivalent direct SQL/reset/lint steps were used; no hosted change.

## 2026-09-23 — TASK-013 chat policy acceptance

- User explicitly accepted ADR-0015 for disposable-local Hangout chat and a narrower backend stage contract was prepared. No implementation, Realtime transport or hosted permission follows from the acceptance record alone.

## 2026-09-23 — TASK-013 Hangout chat planning

- Drafted a bounded local chat contract and Proposed ADR-0015 for current-participant text messages, revocation, minimal author display, idempotent sends and polling delivery.
- No policy acceptance, migration, messaging permission or hosted authorization follows from planning. Global block precedence, Realtime delivery and moderation remain separate.

## 2026-09-23 — TASK-012 local friendship completion

- Integrated independently reviewed backend and UI on remote-verified main. Participant-only relationship management and fresh People text authorization are available for disposable local development behind default-disabled gates. Gates and fixtures were cleaned; hosted and restricted-Hangout work remain open.

## 2026-09-23 — TASK-012 friendship planning

- Drafted a bounded local friendship contract and Proposed ADR-0014 for mutual requests, private relationship reads, repeat-request suppression and People-block interaction.
- Preserved current People field/privacy rules, owner-only photos, campus-only Hangouts and hosted safety gates. No policy acceptance, migration or friendship implementation follows from this proposal.

## 2026-09-23 — TASK-012 friendship policy acceptance

- User explicitly accepted ADR-0014 for bounded disposable-local friendship stages; published a narrower TASK-012A backend contract. No migration or hosted change follows from the acceptance record alone.

## 2026-09-23 — TASK-012A local friendship backend

- Added a default-disabled private friendship gate, mutual pending/accepted pair, retained request-key and generation checks, participant-only ID/status readers and caller-bound transitions.
- Extended People blocking only to tear down an active friendship atomically and allow a ready participant to block a now-hidden friend by ID. Current Hangout access, profile/photo readers and hosted environments remain unchanged.
- Independent security review found and then cleared a create/accept revocation race. Local SQL/Auth/HTTP/concurrency checks passed; full `pnpm check` remained unavailable in the isolated offline worktree.

## 2026-09-23 — TASK-012B local friendship UI

- Added request/status controls to People detail and private owner relationship management with ID-only fallback when peer text is unavailable.
- Confirmations explain decline/cancel suppression, unfriend and People-block effects. The exact outbound blocked ID is required for a confirmed block result; denied creates clear revoked People text.
- Full workspace and production Auth/action checks plus desktop/phone/keyboard inspection passed. Independent review findings on denied/unknown state handling were corrected and cleared; a focused browser retest of the corrected unknown state was unavailable after Mac lock.

## 2026-09-23 — TASK-011 local People directory

- Added a ready-only, opt-in, same-campus text People list/detail with literal search, year/major filters, deterministic ID-only cursor pages and owner privacy preview. Added People-only bilateral blocks, outbound ID management and immediate detail clearing after block.
- Kept profile photos and excluded fields owner-only; Hangout permissions, friendship, messaging and hosted environments unchanged. Both local database gates remain disabled after verification.
- Independent security/design review and local SQL, HTTP/action, concurrency, desktop/phone and keyboard checks passed; isolated offline tooling prevented a default `pnpm check`/Turbopack green claim.

## 2026-09-22 — TASK-011A local People backend

- Added reviewed opt-in text discovery, minimal two-way People blocking and default-disabled local gate with caller-bound RPCs. Preserved owner-only raw profiles/photos and existing Hangout access.
- Local SQL/HTTP/concurrency and equivalent workspace checks passed; isolated offline dependency tooling prevented the default `pnpm check` wrapper and Turbopack build. No hosted operation.

## 2026-09-22 — TASK-011 privacy decision

- User explicitly accepted ADR-0013 for local opt-in People text and a minimal People-only block prerequisite; stage A and B contracts remain bounded. No implementation, peer photo release or hosted authorization follows directly from publication.

## 2026-09-22 — TASK-011 People planning

- Added bounded staged local People contract and Proposed ADR-0013 for explicit opt-in peer text, bilateral People suppression and minimal local block prerequisite.
- Preserved owner-only photos, pending TASK-010 policy, existing Hangout permissions and all hosted gates. No policy acceptance, migration, implementation or CI-green claim.
- User requested GPT-6 Sol / medium at Standard speed (not Fast) for subsequent agents.

## 2026-09-22 — TASK-010 planning

- Established bounded local host/co-host contract and Proposed ADR-0012 permission/role lifecycle matrix, pending explicit user acceptance.
- Require fresh backend implementation and independent security review before a separate management UI stage; no code, migration, access or hosted change at planning.

## 2026-09-22 — TASK-009 local Calendar

- Added saved-only Today/Day and Monday–Sunday Week views, campus-time/DST boundaries, authoritative Joined/Hosting filters and clear cancelled/truncated states.
- Calendar exposes public schedule/place and caller relationship only; existing detail handles joining and private instructions. No safety gate, access policy or hosted permission changed.
- Local workspace, SQL, real built-server HTTP/action and rendered desktop/phone checks passed; fresh review clear. Existing CI action-manifest failure confirmed on pre-Calendar main and tracked separately.

## 2026-09-22 — TASK-008 local saved Hangout discovery and joining

- Added a separate saved campus map/list/detail, with bounded viewport reads, time/open filters, approximate public pins and accessible no-map fallback. Mock examples remain clearly labeled and separate.
- Added caller-bound join/leave, current-ready roster IDs and participant-only private instructions, with server rechecks and conservative recovery for uncertain results. No peer profiles/photos, chat or restricted modes.
- Verified local database and real built-server action/privacy flows, rendered desktop/phone fallback and live Mapbox saved pins. No hosted migration, deployment or gate enablement; launch safety dependencies remain open.

## 2026-09-22 — TASK-007 local Hangout create/edit

- Replaced the unsaved Create entry with a ready-only local form that saves through the TASK-005 backend, then confirms and reopens the owner's Hangout for editing.
- Added explicit approximate public area selection with a Mapbox picker and manual fallback; private instructions remain separate and can be cleared.
- Added same-request recovery after uncertain creation, stale-revision feedback, recent owner access, and real action/privacy regressions. Verified rendered desktop/phone flows. No hosted migration or deployment; map discovery, chat and launch safety remain separate.

## 2026-09-22 — TASK-005 local Hangout backend

- Added campus-only Hangout, participant and separate private-instruction records under Accepted ADR-0010, behind a default-disabled database gate.
- Added live-ready campus permissions, host transitions, current-ready rosters, atomic public/private saves, retry-safe creation and stale-revision rejection.
- Verified database permissions, revocation, transaction rollback, real HTTP/private embeds and concurrency alongside existing auth/profile safeguards.
- Backend only; no hosted migration/deployment or live user-facing flow. Blocking and remaining safety gates still precede hosted enablement.

## 2026-09-22 — TASK-006 owner profile enrichment and photos

- Added the owner profile editor from the avatar menu, with required-detail edits and optional interests, activities, favorites, fact, prompts and Instagram handle.
- Added primary replacement and up to four additional private photos, database-enforced ownership/limits, concurrent assignment/deletion protection and stale-editor rejection.
- Added honest failure recovery and protected cleanup for upload/save response loss, responsive forms, keyboard focus and visible per-photo feedback.
- Verified local workspace, database permissions, real HTTP/actions/failures/concurrency and rendered desktop/mobile flows. No peer access, hosted migration or deployment.

## 2026-09-22 — TASK-004 Hangouts map shell

- Replaced the authenticated readiness screen with a responsive Mapbox shell while retaining the live verified/profile-complete access gate.
- Added clearly labeled approximate public-campus mock Hangouts, accessible pins/clusters and previews, example filters, and a no-publish Create shell.
- Added optional one-shot local-only coarse location, map loading/token-missing/error/retry states, and shared map design tokens.
- Verified repository checks, local Auth/Storage/web gates and actual offline Mapbox renderer interactions. Final live Mapbox basemap and authenticated desktop/phone interactions pass using the existing user-authorized palsapp public token, stored only in ignored local environment. No hosted auth, SMTP, database or production changes.

## 2026-09-22 — TASK-003 auth and required onboarding

- Implemented signup/signin/signout, PKCE email confirmation/resend, secure SSR sessions and server-side live account gates.
- Applied Accepted ADR-0009's exact UNC email policy; verification copy means email ownership, not independent enrollment evidence.
- Added required-profile onboarding and private owner-only primary photos with actual Storage ownership checks, immutable objects, and referenced-photo deletion protection.
- Added local Auth/mail/Storage/web callback integration tests, expanded SQL checks, dual-architecture dependencies and consistent local network flags across resets.
- Foundation is now verified against the authorized hosted development target and baseline GitHub CI. Hosted SMTP and deployed HTTPS callback validation remain separate launch prerequisites; no domain cutover or map/social/messaging work included.

## 2026-09-21 — TASK-002 local Supabase foundation

- Added reproducible identity/profile/university/platform-role migration and local UNC seed without an invented enrollment/domain policy.
- Enforced owner-only profile RLS, client escalation prevention, independent email/campus/profile/status state and email-bound verification evidence.
- Added real local pgTAP permission checks, repeated reset verification, schema lint, database CI configuration and backend-target validation.
- Established a temporary local Lima/Docker runtime; no hosted staging, production, DNS or deployment was used. Staging verification and Proposed ADR-0009 remain pending.

## 2026-09-21 — TASK-001 monorepo bootstrap

- Added runnable Next.js web/admin development placeholders and the reserved mobile workspace.
- Established six shared package boundaries, provisional light/dark design tokens, and local-first environment parsing.
- Added pinned pnpm dependencies, lint/typecheck/format/test/build commands, and a GitHub Actions baseline.
- Verified frozen install, local CI commands and desktop/mobile rendering. No hosted CI or deployment was performed.

## 2026-09-21 — Project reset

- Reframed the product around casual user-created Hangouts.
- Locked UNC as the first launch campus with multi-campus architecture.
- Locked map-first discovery and Calendar, People, Chats, Notifications navigation.
- Chose web-first delivery followed by Expo iOS/Android.
- Chose Supabase, Mapbox, Vercel, PostHog, monorepo, migration-only schema changes.
- Introduced ADR, task-contract, handoff, and current-state systems for agent coordination.
