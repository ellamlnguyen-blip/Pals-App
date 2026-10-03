# TASK-027 progress handoff — 2026-09-30

> **Local verification update — 2026-10-02:** Finished the pending current-fixture pass on top of `eab1789b2af88c17831cd2df4b6389eaf9d349efe`. The owner-only account-status RLS policy now allows a signed-in user to read their own status while continuing to deny product access to unconfirmed, unverified, non-UNC, incomplete, suspended, and banned users; the updated pgTAP assertions cover this. `pnpm db:verify` had already passed twice after this SQL change (1,735 assertions each run and clean schema lint). All 12 current feature concurrency tests pass together from a clean reset. Auth/web lifecycle passes 4/4 on a clean reset. Current HTTP features pass 8/8, and moderation HTTP passes 1/1 separately on an empty report queue; this separation is required because retained report fixtures make the moderation test's one-item queue assertion order-sensitive. `pnpm check` passes (48 unit tests, 1 sandbox-only skip, typecheck, lint, formatting and web/admin builds). One initial typecheck saw a corrupted generated `.next/dev` file; deleting that generated cache and rerunning `pnpm check` passed. Implementation and verification changes are pushed at `cd6fc142998b072099016224571c288c21e0c3bc` and the remote branch SHA was verified. Final hosted limitations are unchanged: there is no nonproduction Supabase target, Vercel Preview has no required environment configuration, email has not been exercised on a nonproduction target, and independent backup moderator coverage is unconfirmed. No hosted target or production access was changed.

> **Merged-main verification update — 2026-10-02:** The coordinator merged current `origin/main` into this task branch, then repaired the local integration fixtures and reran them. `pnpm test:auth:web` now passes all four suites: real Auth confirmation/SSR callback/RLS and photo ownership, Hangout lifecycle races, People block serialization/revocation, and profile-photo concurrency. The fixtures open only their required local availability/capability gates and restore them off. Next dev tests now select the dev server-action manifest and wait until route actions are compiled; the unused legacy People `blockPerson` action checks were removed after the current built `/api/safety` test passed with block/unblock, actor binding, denials, report retry and privacy assertions. `safety-ui-http.integration.mjs` passed against production-mode Next and disposable local Supabase. On the merged branch, `pnpm db:verify` passed both resets and both 1,735-assertion pgTAP runs with zero schema-lint diagnostics; `pnpm check` passed (48 unit tests pass, one sandbox-only skip, lint/typecheck/web+admin builds). Fresh read-only review found no blocking issue. Task branch SHA `be780dc0d6669becb6aee61667fa1d33501bf5bd` is pushed and remote-verified; current `origin/main` remains `c1bc45b5ed233b36f4501036808f2d3b65425124` pending integration. No hosted target was changed.

> **Current status update — 2026-10-01:** The initial findings and blockers below are a historical snapshot from before the migration. They are superseded by the implementation and verification entries later in this handoff and by this correction. The roster-free migration, route changes, and local checks are implemented; hosted preview and launch gates remain open. Final `pnpm db:verify` passed twice after the lifecycle function lint repair (two clean resets and 1,735 pgTAP assertions per run; schema lint returned no diagnostics). The exact final receipt is `/private/tmp/task027-dbverify-reviewed.log`. A fresh read-only review found no authorization bypass and confirmed the final typed-row/explicit-return fix preserves the lifecycle lock/output contract. The retired pilot HTTP matrices remain unported and unrun; their old migration-history guards and roster-revocation denial assertions must not be treated as TASK-027 evidence. No hosted target was changed. See `docs/operations/TASK-027-NEXT-STEPS-TO-LAUNCH.md` for sequenced preview and launch steps.

Status: **In progress — local implementation verified; hosted preview and activation pending**

## Direction

The user moved the release from an invite-only UNC pilot to an open verified-UNC MVP. People, Hangout discovery, DMs, notifications, and analytics are MVP scope. “Open” is interpreted as every active, email-confirmed, currently verified UNC account with completed required onboarding. Non-UNC, unconfirmed/unverified, incomplete, suspended, and banned accounts remain denied. The same email nominated for primary and backup moderation is one operator, so it is not independent coverage.

## Findings

- Safari is signed in to Vercel and shows the `pals-app` project under the `pals8` team. The public app at `pals-app-eta.vercel.app` loads the signup page. The user-provided screenshot is the existing `pilot_unavailable` access state rendered at `/pilot-pending`.
- Database access checks still require the global pilot availability flag and an active admission row. Capability switches are independently default-off. The same row is directly required by the owner and two lifecycle lock helpers.
- The hosted app has environment-only guards on implemented People, chat, notification, safety and saved Hangout paths; Hangouts currently starts on a mock map. These are real release blockers in addition to the database gate.
- `private.has_verified_membership()` requires an active account, confirmed Auth email, current verified membership, an active campus, matching email evidence and an allowed campus email domain. `ready_subject_campus` adds complete profile and owned primary photo requirements. These remain required.

## Local changes

- Added accepted product-scope ADR-0028 and updated the MVP, authorization, NOW, CURRENT_STATE and CHANGELOG records.
- Added bounded TASK-027 contract.
- Added a server-only feature-runtime check so hosted routes can run against a valid explicitly configured Supabase target; existing database/RLS checks remain the authorization authority.
- Hosted `/hangouts` now redirects to saved-data discovery rather than the mock map. Removed pilot/local-only UI copy where it would misrepresent the new target.
- No Supabase migration or hosted gate mutation landed. No production/Vercel deployment or DNS change occurred.

## Verification

- `pnpm install --frozen-lockfile` completed from the local package cache; no lockfile changes.
- `pnpm typecheck` passed.
- `pnpm --filter @pals/web build` passed.
- `pnpm test`: 48 passed, 1 skipped (sandbox blocks loopback listeners).
- Focused web ESLint reported an existing unused disable warning in `apps/web/app/people/[id]/person-view.tsx`; that file was not changed.
- `pnpm db:verify` could not start a clean local database: after allowing the CLI telemetry write, Supabase CLI returned `LegacyLocalDbRunningError: failed to inspect service`. No Docker services were listed; no database migration tests ran.
- `git fetch origin main` failed because this environment could not resolve `github.com`. Task branch is based on the local TASK-026 confirmation fix (`8187e1c`), whose `origin/main` reference is stale at `dac95a0`.

## Security review gate

Two attempts to add the migration that removes manual roster admission while retaining strict UNC verification were rejected by automatic approval review. The reviewer said the proposed persistent migration changes security-definer authorization and Auth-triggered admission state, with unverified legacy lock/revocation interactions and environment-wide impact. The reviewer directed that the rejected change not be retried or routed through another mechanism; continue with safer work, or supply exact security validation/review before a new attempt. The rejected migration is absent from the worktree. No gate was opened.

## Remaining

1. Reconcile the correct canonical main and accepted task baseline once GitHub connectivity is available.
2. Complete exact-source review of admission helper, Auth sync trigger, owner lock, ordinary lifecycle lock, co-host/chat lock and all feature gate call paths.
3. Add and run migration regression tests proving a verified UNC account needs no manual roster decision while unconfirmed, non-UNC, revoked-current-verification, incomplete, suspended and banned users remain denied. Verify retry/revocation and lock ordering; get security approval before retrying a migration.
4. Align the master availability and every per-feature/legacy gate in nonproduction. Establish moderated access/operations and a distinct backup moderator.
5. Verify real saved Hangout create/discover/join/chat, People/friendship/DM/notifications/attendance/safety, analytics consent behavior and negative authorization paths on deployed preview.
6. Review exact nonproduction target and access-change action at action time; no production or domain cutover is included.

## Implementation continuation — 2026-09-30

Task-branch implementation commit `5e2ae325c32adf47899139ccbba5a6dbf3ea37c4` was pushed to `origin/agent/TASK-027-open-unc-mvp` and independently verified against the remote ref.

- Migration `20260930000100_open_verified_unc_mvp.sql` removes the roster as an application eligibility predicate from both readiness helpers and the three live lock chains. Existing Auth, account, membership, campus, profile, Storage, source and safety checks remain. `TASK-027-SECURITY-REVIEW.md` records the source and lock review. An independent reviewer found no clear bypass and required the expanded tests below.
- New SQL coverage exercises roster-free onboarding, owned photo, ready state, Hangout creation and valid chat after a roster row is revoked or deleted, plus unconfirmed, non-UNC, suspended, banned, and changed-email denials. Historical pilot tests now assert roster independence while preserving live revocation checks.
- `pnpm db:verify` passed twice from clean resets, including 1,735 pgTAP assertions per run and schema lint. `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` passed; the unit suite had 48 passes and one sandbox-only skip.
- Local real Auth/Storage HTTP passed; five Hangout/cohost/chat/block/report/disable HTTP suites passed; four concurrent source/safety suites passed; the chat race passed on its own clean reset. Attendance HTTP and its two-session race suite passed. The combined concurrency run's one chat-count failure was test fixture contamination; isolated clean execution passed. All integration fixtures were removed by a final reset, verified as zero Auth users, master/capability/large gates off, and all nine legacy source/safety gates off.
- Analytics external capture remains off; the large-Hangout gate remains off. No hosted credentials were present in this worktree, so deployed preview and target activation were not attempted. Distinct backup moderator coverage is still absent. TASK-027 remains incomplete pending hosted preview, action-time access confirmation, review/integration/publication and remote SHA verification.

## Local verification repair — 2026-10-01

- `private.pilot_lock_ordinary_lifecycle` now loads each locked Hangout into a local typed row and returns its seven result columns explicitly. This preserves both `FOR UPDATE` reads and the existing result contract while removing the composite OUT-variable lint warning.
- The final migration passed `pnpm db:verify` twice. Each invocation completed two clean resets and two pgTAP runs of 1,735 assertions. Both schema lint runs exited 0 with `results: []`. `git diff --check` passed. These checks cover the final SQL edit; the earlier failed lint attempts are superseded.
- The retired pilot HTTP regression matrices were not rerun against this migration. Their helpers require earlier exact migration histories, including `25:20260927000500`, and several cases require a revoked or missing pilot roster row to deny operations. That is incompatible with TASK-027's roster-free eligibility. The currently passing SQL pgTAP tests and the previously recorded TASK-027 HTTP/concurrency checks do not establish that every retired HTTP/race scenario has a current equivalent. A follow-up should port those scenarios to the current disposable target, preserve source/safety/revocation assertions, and change roster-only assertions to verify continued access for otherwise eligible UNC accounts. Do not loosen target guards or count unrun suites as passing.
- This repair remains uncommitted on the TASK-027 branch pending coordinator review. No hosted target, availability gate, production database, or domain was changed.
