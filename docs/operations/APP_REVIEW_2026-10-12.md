# Pals App — build history, current status and code review guide

Prepared October 12, 2026, America/New_York, at the user's request. This is a review snapshot, not a new release acceptance or a substitute for the product specifications.

The student web app, backend permissions and substantial social/safety functionality have been built. A protected hosted test is available and its UNC map works. The reviewed rich-profile implementation runs on a task branch; it has **not** been integrated into canonical `main`. Full staged student, multiuser, moderation and recovery acceptance remains incomplete. The mobile app is reserved scaffolding. There has been no public launch at usepals.com.

## 1. What to open first

The local review package is in `/Users/ellanguyen/Documents/ChatGPT/Pals App/tmp/review-2026-10-12/`:

| File | Purpose |
| --- | --- |
| `PALS_APP_OVERVIEW.md` | This readable overview and code review guide. |
| `FULL_BUILD_RECORD.md` | Consolidated tracked Markdown specifications, decisions, task contracts, handoffs, reviews and historical records, with source/commit labels. Canonical records come first; differing hosted-source documents follow as historical branch variants. |
| `CODE_INVENTORY.md` | Complete tracked file inventory for both snapshots, routes, migration lists, and source files that differ. |
| `pals-hosted-source.zip` | Exact tracked source matching the hosted rich-profile test, including tests and documentation. |
| `pals-canonical-main.zip` | Exact tracked canonical main baseline used for this review. |
| `hosted-source/` and `canonical-source/` | Extracted copies you can open directly in an editor; no Git metadata or installed dependencies. |
| `SHA256SUMS.txt` | Checksums of the delivered review files. |
| `MANIFEST.json` | Source commits, file counts, archive validation and consolidation provenance. |

These are source exports, not installed applications: runtime environment files, credentials, dependency folders, build output, and Git internals are absent. Tracked `.env.example` templates are included. Existing unrelated staged/untracked work in the shared checkout is not included or altered.

[Hosted Pals test](https://pals-app-git-agent-task-028p2-rich-profiles-pals8.vercel.app). Use the signed-in Safari session. Vercel protection and Pals account authentication are separate access checks.

## 2. The exact versions being reviewed

| Reference | Commit | Meaning |
| --- | --- | --- |
| Canonical review baseline | `029c405b813fcaa62baca2af62b4e4678c3ef3c2` | Remote-verified main after hosted-test handoff publication and the review-package contract. Contains integrated application history and current operational records. |
| Hosted source | `20cdd69cc45398334dbd37aeaee29bd980d1a514` | Remote-verified `agent/TASK-028P2-rich-profiles`; matches the hosted test artifact. |
| Reviewed rich-profile application milestone | `e27db7a3808a266d452878581e9d0c5a73f9b4cf` | Production application source milestone identified in the P2 review; later branch records document its delivery. |
| Reviewed staging control correction | `afea7f47b546ffda36a9fbcf6dceb5868f35d96c` | TASK-028R1 controls, integrated on main through `70a75c72100ae430dad8f2a72795c090b251813b`. These later control fixes are not part of the older hosted-source snapshot. |

Repository: [Pals-App on GitHub](https://github.com/ellamlnguyen-blip/Pals-App).

Inspect [canonical baseline](https://github.com/ellamlnguyen-blip/Pals-App/tree/029c405b813fcaa62baca2af62b4e4678c3ef3c2) and [hosted source](https://github.com/ellamlnguyen-blip/Pals-App/tree/20cdd69cc45398334dbd37aeaee29bd980d1a514). The guide's later documentation publication changes records only; these frozen source exports remain reproducible at the listed commits.

This difference matters: a checkout of main alone does not reproduce the hosted profile experience. The hosted snapshot contains 38 migration SQL files; this canonical baseline contains 26. Staging history was verified at 38 applied versions. Do not reset staging to reproduce a local environment. Use the hosted-source export for the complete current test application and main for the latest integrated controls/records.

## 3. Product scope and boundaries

Pals helps verified college students create casual Hangouts, discover plans, join them, coordinate, and meet offline. The initial campus is UNC Chapel Hill. The primary navigation is Hangouts, Calendar, People, Chats and Notifications; profile/settings open from the user's avatar/header.

The intended loop is create → discover → join → coordinate in chat → meet offline → form friendships → make future plans easier. The app does not introduce posts, likes, comments, followers, public friend counts or popularity scores. Map pins represent Hangouts, not live people. Public location is approximate where possible. Rich profile data is each user's own content; the supplied Maya screenshot was a layout/reference example, not a template of personal details for everyone.

Read `docs/product/MVP.md`, `docs/product/PRINCIPLES.md` and `docs/ux/USER_FLOWS.md` for requirements. Current explicit user instructions and accepted ADRs take precedence over older planning notes.

## 4. Build history by milestone

Dates below describe recorded work, not blanket evidence that the current hosted app has passed every test. The consolidated build record preserves the original detailed handoffs and their limitations.

| Period / tasks | What was built or changed | Recorded boundary |
| --- | --- | --- |
| September 21–22 — TASK-001/002 | pnpm monorepo, web/admin foundations, shared packages, environment validation, CI baseline, identity schema, Auth and row-level security. | Foundation verified locally; a separately authorized hosted development baseline was also recorded. |
| September 22 — TASK-003 | UNC signup/confirmation, web PKCE callback/cookies, account access states, profile/Storage ownership and onboarding. | Original onboarding rules were later changed by ADR-0030; do not treat old readiness requirements as current entry policy. |
| September 22 — TASK-004 | Authenticated Mapbox shell, clustered example pins, filters and local optional location. | Example/mock discovery is distinct from saved database Hangouts. |
| September 22 — TASK-005/006 | Hangout backend with private/exact location boundaries, RLS and retry/revision handling; owner profiles, primary photo replacement and four additional private photos. | Local gated implementation and permission/race testing. |
| September 22 — TASK-007/008 | Create/edit, approximate area selection, saved map discovery, detail, join/leave and owner flows. | Local database/HTTP/browser evidence; no public rollout at that milestone. |
| September 22–23 — TASK-009/010 | Campus calendar with time-zone/DST handling and Joined/Hosting filters; host/co-host management. | Exact task handoffs distinguish SQL/HTTP coverage from browser interactions that were unavailable. |
| September 23 — TASK-011/012 | Opt-in same-campus text People discovery, cursor paging, block/unblock and mutual friendship transitions. | Private projections and explicit discovery choices; no public friend counts. |
| September 23 — TASK-013/014 | Joined Hangout text chat, direct-message requests and accepted direct text chat. | Caller-bound reads, retry-safe sends and revocation/race checks. This is not proof of a complete hosted Realtime/push rollout. |
| September 23 — TASK-015/016 | Notification ledger/inbox/preferences, social/Hangout events, global blocking, private reports and Safety UI. | Local permissions, lifecycle, failure and race evidence. |
| September 23–25 — TASK-017/018 | Moderation queue/console, case/account enforcement, Hangout disable; private self-reported attendance. | Local audited role boundaries; live operator and recovery acceptance still required. |
| September 23–26 — TASK-019/020/023/024 | Consent-based local analytics, bounded large-Hangout safeguards, student route design alignment, supplied logo and Carolina blue/white branding. | Hosted analytics ingest was not released; analytics and large safeguards remain off in the current staging receipt. |
| September 27 onward — TASK-021 and sub-stages | Admission, lifecycle serialization, source/retained safety, concurrency repairs, provider qualification and extensive fixture/model documentation. | Many narrowly completed sub-stages are not parent completion. The records contain explicit unresolved provider/runtime/release limits; some exhaustive modeling was later deferred from the critical path. |
| September 29 — TASK-025 | Secret-free health probe and UNC pilot critical-path documents; health response corrected to fail when required configuration is missing. | Health is a configuration check, not end-to-end feature acceptance. |
| Early October — TASK-027 and ADR-0028/0030–0035 | Open verified UNC entry policy, immediate access after confirmed allowlisted email without requiring profile/photo creation, staging controls/auditing, revision recovery, operator/MFA and emergency-off preparation. | Staged lifecycle, live moderation and recovery remain incomplete; task app source remains outside main pending acceptance. |
| October 6 — TASK-028P/P1/P2 | Screenshot-informed owner/peer profile layout, hometown and pin, clickable owner View/Edit photos, peer View-only photos, per-user empty states, separate rich sharing consent, protected sanitized photo gateway. | Reviewed and tested locally. User accepted the delivered local profile experience; parent application integration stayed gated. |
| October 11 — acceptance recovery | Recovered and published acceptance/current-state records through an isolated clean checkout. | Earlier local server was unavailable; this was documentation recovery, not fresh runtime verification. |
| October 12 — TASK-028R/R1 | Applied three reviewed profile migrations to staging, configured the exact protected profile Preview, callback and server photo credential, observed genuine owner sign-in, corrected controls and activated audited rich source gate. Fixed Mapbox URL restrictions and visually verified UNC tiles. | Hosted owner test available; per-user sharing is still opt-in, with zero preference rows at readback. Full multiuser/moderation/public launch remains incomplete. |

For the original details, start with `CHANGELOG.md`, `tasks/DONE.md`, `agents/handoffs/TASK-028P2.md`, `TASK-028P2-USER-ACCEPTANCE.md`, `TASK-028R.md` and `TASK-028R1.md`. The complete record also includes proposed contracts, review findings, stopped work and superseded plans; inclusion does not mean each item was accepted or shipped.

## 5. Feature status you can assess

| Area | Source behavior | Evidence and current limit |
| --- | --- | --- |
| Identity/access | Confirmed exact allowlisted UNC email, server access checks, account restrictions and environment validation. | Genuine hosted owner sign-in observed. Full new-account/student lifecycle matrix still open. |
| Owner profile | Academic/bio fields, optional hometown with pin, main photo plus four extra photos, prompts and editing controls. | Local profile QA recorded. Hosted existing profile rendered; hosted save/upload/consent round trips were not newly exercised. |
| Peer profile | Authorized same-campus rich projection; owner images offer View/Edit, peer images offer View only; missing content stays empty. | Local two-user/photo/privacy QA recorded. Only one genuine verified account exists in staging, so hosted positive peer cases remain unverified. |
| Rich privacy | Separate versioned opt-in; People opt-out atomically clears rich sharing; gates do not automatically opt anyone in. | Source gate enabled by reviewed audited operation; preferences count zero at hosted readback. |
| Hangouts/map | Saved approximate locations, map/list discovery, create/edit, joining and host/co-host flows. | Local core-flow evidence. Hosted UNC basemap visually verified; actual saved Hangout list empty at observation. No fabricated event was inserted. |
| Calendar | Campus time ranges and Joined/Hosting filtering of saved Hangouts. | Local tests and browser evidence; complete hosted multiuser flow pending. |
| Friendship/DM/chat | Mutual requests, direct-message requests, accepted direct text conversations, joined Hangout chat and current-source permission checks. | Local SQL/Auth/HTTP/concurrency/UI evidence; hosted second-user lifecycle pending. |
| Notifications/safety | Private inbox/preferences, blocking/reporting and current permission projection. | Local evidence; hosted anonymous notifications request denied with HTTP 403. Full positive hosted lifecycle pending. |
| Moderation/admin | Operator console, case/account enforcement, role/MFA checks, policy controls and audited emergency-off. | Source/local evidence; no claim that live moderator operations/recovery have passed. |
| Attendance | Private self-report with revision/timing rules. | Local verification recorded; full staged acceptance pending. |
| Analytics / large safeguards | Consent-based local analytics instrumentation and bounded crowd-size safeguards exist in source. | Both remain off in staging. Production PostHog ingest is not established by this release. |
| Mobile | Workspace reserved for React Native/Expo reuse after web stabilizes. | No mobile app runtime/build/dev command yet. |

## 6. Architecture and request flow

The implemented monorepo uses Next.js 16.3.5, React 19.3.0, TypeScript 5.9.3, Node 24 and pnpm 11.19.0 in the hosted snapshot's manifests. Supabase provides Auth, Postgres and private Storage; Mapbox GL provides the map; Vercel hosts the test. Sharp handles server-side peer photo sanitization. These are source-pinned versions, not a claim about current upstream releases.

Typical flow:

1. A Next route/server action obtains a user session through `apps/web/lib/supabase.ts` and checks `apps/web/lib/access.ts`.
2. Feature helpers call narrowly defined database RPCs with that user's session. TypeScript validation improves UX; database constraints, grants/RLS and current state remain authoritative.
3. Postgres evaluates account/campus/verification, source visibility, role, membership, consent, block and feature/policy conditions appropriate to the operation.
4. The response contains an authorized projection. UI handles empty/denied/stale/error states and revision conflicts.
5. For peer images, the cookie-authenticated Next gateway validates the caller and selector, resolves a current allowed object using a server-only credential, bounds and sanitizes the image, rechecks authorization/object identity and returns private noncached bytes. Raw rich rows and Storage paths are not peer payloads.

Concurrency-sensitive writes use transactional locking, retry identities and/or compare-and-swap revisions. Exact retry and stale revision behavior are tested where recorded; a prior successful response must not be reused as proof that a later reversed gate is still on.

`packages/config` has active environment/target validation; `packages/types` includes owner/rich profile contracts; `packages/validation` contains form/email/photo validation; `packages/design-tokens` contains shared styling. `packages/domain` and `packages/data-access` remain reserved API scaffolds in this snapshot. Most working feature access is still in `apps/web/lib` and SQL, rather than a fully extracted shared domain layer.

## 7. Code reading map

Paths here are relative to an extracted source archive. `CODE_INVENTORY.md` lists every tracked file, including all tests and migrations.

| What you want to inspect | Start with |
| --- | --- |
| Workspace/tooling | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, app manifests, TypeScript/ESLint configuration and `.github/workflows/` |
| Student shell and branding | `apps/web/app/layout.tsx`, `student-shell.tsx`, `components.tsx`, `globals.css`; `packages/design-tokens/` |
| Signup/sign-in/session/access | `apps/web/app/actions.ts`, `auth/callback/route.ts`, signin/signup/verify/onboarding routes; `apps/web/proxy.ts`; `apps/web/lib/access.ts`, `supabase.ts`, `config.ts` |
| Owner profile and photo interactions | `apps/web/app/profile/page.tsx`, `editor.tsx`, `actions.ts`, `profile-summary.tsx`, `profile.css`, `photo/route.ts`; `apps/web/lib/owner-profile.ts`; `packages/types/src/index.ts` |
| Peer profile and consent | `apps/web/app/people/[id]/person-view.tsx`, `peer-photo.tsx`, `peer-profile.css`, `photo/route.ts`; `people/privacy/rich-privacy-controls.tsx`; `apps/web/lib/people.ts` |
| Peer photo security | `apps/web/lib/rich-peer-photo-{core,service,image,path,headers,admission}.ts`; migrations `20261006000200` and `20261006000300`; `tests/rich-peer-photo-gateway.test.mjs` |
| Map and saved Hangouts | `apps/web/app/hangouts/saved/map.tsx`, `saved-discovery.tsx`, `browse-context.ts`; `apps/web/lib/saved-hangouts.ts`, `hangouts.ts`; create/editor/management/member controls and actions |
| Calendar/time logic | `apps/web/app/calendar/`; `apps/web/lib/calendar.ts`, `calendar-time.ts`, `hangout-time.ts`; corresponding root tests |
| Friendship and requests | `apps/web/app/people/friend-control.tsx`, `friend-actions.ts`, friends routes, peer request control; `friendship-create-outcome.ts`, `relationship-block-outcome.ts` |
| Group and direct chat | `apps/web/app/chats/`, `api/chat/[id]/route.ts`, `api/dm/`; `apps/web/lib/chat.ts`, `dm.ts` |
| Notifications | `apps/web/app/notifications/`, `api/notifications/route.ts`; `apps/web/lib/notifications.ts`, `notification-destination.ts` |
| Safety/reporting | `apps/web/app/safety/`, `api/safety/route.ts`; `apps/web/lib/safety.ts`, `safety-public.ts`; block/report SQL migrations |
| Admin/MFA/policy | `apps/admin/app/console.tsx`, `policy-panel.tsx`, `api/{moderation,policy,mfa,session}/route.ts`; `apps/admin/lib/{server,policy,security,flow}.ts` |
| Attendance / analytics | `apps/web/app/attendance/`, `api/attendance/route.ts`, account analytics route; `apps/web/lib/attendance.ts`, `analytics*.ts` |
| Database authority | `supabase/migrations/*.sql`, `supabase/tests/database/*.test.sql`, HTTP/concurrency suites and `supabase/tests/README.md` |
| Current staging controls | Canonical-main `scripts/staging-control/README.md`, `run.mjs`, `gate.sql`, `run.test.mjs`, emergency shutdown SQL; ADR-0029/0035 and TASK-028R1 handoff |
| Intended behavior / history | `docs/product/`, `docs/ux/`, `docs/engineering/`, `decisions/`, `tasks/`, `agents/handoffs/`, `CHANGELOG.md` |

The hosted source contains both the earlier example map shell and saved-data discovery. Inspect `hangouts/saved/` for the actual saved Hangout flow; do not confuse mock fixtures with current campus data. Source presence alone does not establish a feature is enabled or accepted in staging.

## 8. Database, privacy and operational controls

Schema changes are committed migrations. Owner profiles/photos are private by default. Peer access uses permission-checked projections rather than raw owner table access. Verified-campus trust, bilateral blocks, membership and current account/policy state must remain enforced by the database and gateway, not merely by hidden buttons.

The October 12 staging operation applied only `20261006000100_owner_hometown.sql`, `20261006000200_rich_peer_profiles.sql` and `20261006000300_rich_peer_photo_gateway.sql`. Pre/post checks preserved existing account/profile counts and existing capability states/revisions. Readback verified owner RLS, denied raw rich client SELECT, authenticated rich-detail access and service-only photo resolution. Migration hashes and exact grant observations are in TASK-028R.

The peer gateway's server credential is intentionally privileged and must remain server-only. Normal Auth clients accept only publishable/anon keys. The new credential was configured as a Secret on the exact Preview branch, with no `NEXT_PUBLIC_` prefix or committed value. Photo safety limits include bounded concurrency/queueing, 5 MiB streamed input/output, 20 MP decode and 2048 px sanitized WebP output as recorded in the reviewed P2 handoff. Delivered image bytes cannot be recalled after authorization is revoked; future requests must deny access.

R1 updated the controls' recognized migration lane and the narrow `rich_profiles` gate allowlist. A reviewer caught a stale retry receipt after gate reversal; the corrected SQL verifies current locked state before returning a prior receipt. Rolled-back real-schema on/off/retry tests left no test audit rows or opted-in users. The later persistent enable operation is audited separately; source-gate activation is not user consent. Ordinary policy operations, emergency-off and rich source-gate operations have different authority paths; use the current canonical runbook.

## 9. What was actually checked

**Prior local P2 evidence:** 63/63 unit tests; workspace lint/typecheck; final production webpack build; 55 rich-profile and 11 photo SQL assertions in rolled-back transactions; real Auth consent/detail positive and negative cases; seven observed committed lock races; cookie-photo/Storage harness including five parallel images; a bounded 89-client-file scan; and responsive profile/browser checks at 320, 390, 793 and 1280 px. These are recorded October 6 results, not tests rerun for this review export. The handoffs retain their exact omissions and corrections.

**October 12 hosted observations:** configuration health HTTP 200 with six checks true; genuine owner sign-in and owner profile display; live UNC map after URL-allowlist repair; old and new approved origins returning Mapbox tiles HTTP 200 and an unrelated origin HTTP 403; anonymous notification HTTP 403 and anonymous peer-photo HTTP 404 with private/no-store safety headers; ten public JavaScript assets scanned with zero exact credential matches/server-helper identifiers. That client scan covers the anonymous sign-in assets, not every authenticated chunk.

**R1 controls:** 10/10 fake-CLI unit tests, independent source/security review, syntax/whitespace checks and a focused real-schema rollback-only retry/reversal matrix. Separate readbacks confirmed rollback cleanup and the later audited gate activation with preferences still zero.

**This review package:** archive file names/counts and every exported blob are verified against the pinned Git trees; inventories and documentation provenance are generated from those trees; SHA-256 hashes are recorded. No feature tests are rerun and no provider setting or app code is changed by this packaging task.

## 10. Review and run the code locally

For code inspection, open the included `hosted-source/` folder in your editor, or unzip the hosted source archive. You do not need to run services to review TypeScript, SQL, tests or history.

For a separate local runtime, use the source-pinned Node 24/pnpm 11.19.0 toolchain and follow `LOCAL_SETUP.md` together with current Auth/profile ADRs and task handoffs. Standard source commands are:

```sh
pnpm install --frozen-lockfile
pnpm dev:web
pnpm dev:admin
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm dev:web` and `pnpm dev:admin` in separate terminals, or use `pnpm dev` to start both. Run the validation commands separately from those long-running servers. The root `pnpm check` script also runs formatting validation. `pnpm db:verify` resets and tests the local database twice; use it only in a disposable local environment. Many integration/race helpers require a running Docker-compatible local Supabase and reject hosted targets. The old localhost:3032 review process is not running; ordinary source dev ports are 3000 (web) and 3001 (admin). This review package does not recreate the earlier temporary test runtime.

Configure local values through the tracked `.env.example` templates, not through hosted secrets. A public Mapbox token must allow the exact local origin. Full peer image tests additionally need the reviewed local server-only gateway configuration; use the P2 photo contract/harness rather than assuming the older setup paragraph covers that later feature.

Do not run the older staging control implementation from the hosted-source zip for operational changes. The corrected controls are in the canonical-main snapshot. No credential value is part of either export, and no staging mutation is necessary to inspect the app.

## 11. What remains before public launch

1. Complete hosted owner detail/photo save and consent round trips with real user content, including stale/uncertain failure recovery.
2. Use authorized genuine staging accounts to verify peer sharing/photos and revocation, friendship, joins, group chat, DM requests, notifications, blocks and reports end to end. One verified account cannot establish two-user behavior.
3. Complete staged student/signup/email lifecycle and denial coverage under the current immediate-access policy.
4. Verify live moderator role/MFA, moderation action/audit, recovery and operational incident procedures.
5. Review and integrate the accepted staged application work into main only after TASK-027 gates pass; then assess the production rollout/domain cutover separately.
6. Resolve source/setup/status documentation that still describes earlier placeholders, where it materially affects developer setup. Do not infer present behavior from stale README paragraphs.

No public launch, production migration, usepals.com DNS change, fake second UNC identity or real-user invitation/message was performed by the hosted test availability work.

## 12. How to interpret the full Markdown record

There was no single continuously maintained master build document. The durable history lives across `CHANGELOG.md`, task contracts, decisions and handoffs. `FULL_BUILD_RECORD.md` gathers the tracked Markdown from the two pinned trees into one inspection file, without editing the original statements. This is a derived review artifact, not a new source of authority.

Read the current overview and October 12 TASK-028R/R1 records first. Older statements such as “not connected,” “local only,” “ADR Proposed,” “gate off” or “publication pending” describe their own checkpoints and may have been superseded. The canonical README, architecture status line and parts of LOCAL_SETUP still contain early scaffolding descriptions despite later implementation. Branch variants are explicitly identified because the older hosted branch lacks subsequent operational records and may retain earlier proposal language.

Every included document has its original path and commit provenance. Non-Markdown JSON evidence, screenshots, implementation source and lockfiles remain in the source archives and file inventory. Untracked conversation attachments, temporary credentials and vanished temporary runtime logs are not reconstructed; neither this consolidation nor an old “passed” note can prove tests that were never run.
