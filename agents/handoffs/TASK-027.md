# TASK-027 progress handoff — 2026-09-30

Status: **In progress / blocked at hosted access-policy implementation**

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

- Migration `20260930000100_open_verified_unc_mvp.sql` removes the roster as an application eligibility predicate from both readiness helpers and the three live lock chains. Existing Auth, account, membership, campus, profile, Storage, source and safety checks remain. `TASK-027-SECURITY-REVIEW.md` records the source and lock review. An independent reviewer found no clear bypass and required the expanded tests below.
- New SQL coverage exercises roster-free onboarding, owned photo, ready state, Hangout creation and valid chat after a roster row is revoked or deleted, plus unconfirmed, non-UNC, suspended, banned, and changed-email denials. Historical pilot tests now assert roster independence while preserving live revocation checks.
- `pnpm db:verify` passed twice from clean resets, including 1,735 pgTAP assertions per run and schema lint. `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` passed; the unit suite had 48 passes and one sandbox-only skip.
- Local real Auth/Storage HTTP passed; five Hangout/cohost/chat/block/report/disable HTTP suites passed; four concurrent source/safety suites passed; the chat race passed on its own clean reset. Attendance HTTP and its two-session race suite passed. The combined concurrency run's one chat-count failure was test fixture contamination; isolated clean execution passed. All integration fixtures were removed by a final reset, verified as zero Auth users, master/capability/large gates off, and all nine legacy source/safety gates off.
- Analytics external capture remains off; the large-Hangout gate remains off. No hosted credentials were present in this worktree, so deployed preview and target activation were not attempted. Distinct backup moderator coverage is still absent. TASK-027 remains incomplete pending hosted preview, action-time access confirmation, review/integration/publication and remote SHA verification.
