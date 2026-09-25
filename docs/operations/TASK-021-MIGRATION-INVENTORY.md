# TASK-021 — Staging migration inventory snapshot

Snapshot: reviewed canonical main `7e87a454c6985004ee05c5c084650eb04ddf52af`, 2026-09-25. Read-only repository inventory. This is **not** a migration plan or a fresh hosted database inspection. TASK-010A is implementing a later local migration; refresh this snapshot from the exact release tip before any staging package is proposed.

## Repository versus last documented hosted state

The repository contains 19 committed SQL migrations at this snapshot. `docs/operations/HOSTED_ENVIRONMENT.md` last recorded hosted application of `20260921000100_identity_foundation.sql` and `20260922000100_verified_onboarding.sql` on 2026-09-22. It also recorded a localhost Auth site URL and callback allowlist, no custom SMTP, and no deployed HTTPS frontend. That record is historical; no assertion is made about the target's current schema, users, gates or settings.

The following **17 repository migrations are not documented as applied to the hosted project**. They must not be described as a ready-to-run `db push` batch. Each was developed under local-only boundaries, and later migrations depend on predecessor schema and policies. The exact hosted pending set must come from a fresh target-specific migration-history/diff check, not subtraction from this historical record.

| Sequence | Migration | Local scope |
| --- | --- | --- |
| 3 | `20260922000200_owner_profile_enrichment.sql` | Owner profile and photos |
| 4 | `20260922000300_hangout_foundation.sql` | Hangout source and first gate |
| 5 | `20260922000400_people_text_directory.sql` | People opt-in text and gate |
| 6–7 | `20260922000500_people_raw_name_cursor.sql`, `20260922000600_people_id_cursor.sql` | People pagination corrections |
| 8 | `20260923000100_local_friendship.sql` | Friendship and gate |
| 9 | `20260923000200_local_hangout_chat.sql` | Hangout chat and gate |
| 10 | `20260923000300_local_direct_messages.sql` | DM and gate |
| 11–12 | `20260923000400_local_notifications_social.sql`, `20260923000500_local_notifications_hangouts.sql` | Notification ledger and gate |
| 13–14 | `20260923000600_local_global_blocks.sql`, `20260923000700_local_safety_reports.sql` | Global block/report safety and gate |
| 15–17 | `20260924000100_local_moderation_review.sql`, `20260924000200_local_account_enforcement.sql`, `20260924000300_local_hangout_disable.sql` | Operator review and enforcement, moderation gate |
| 18 | `20260924000400_local_attendance.sql` | Private attendance and gate |
| 19 | `20260925000100_local_large_hangout_safeguards.sql` | Host size/discovery and private unconsumed signal/gate |

Ten private feature gates are created in the repository migrations: Hangout, People, friendship, Hangout chat, DM, notifications, safety, moderation, attendance and large-Hangout safeguard. Local test cleanup found them disabled after TASK-020. That does not establish their value in any hosted project. TASK-010A may add role policy without a new gate; verify its actual migration after integration.

Student web modules `apps/web/lib/hangouts.ts`, `people.ts`, `notifications.ts` and `safety.ts` require `APP_ENV=local` and loopback target checks for current saved feature routes. The admin config rejects nonlocal environments. Analytics capture is default-off; local tests used an optional configured loopback in-memory sink. These guards are a separate hosted release design dependency; changing only environment variables will not enable the complete app. Any guard change requires its own reviewed authorization and privacy contract, not a blanket string replacement.

## Fresh preflight evidence required before a hosted proposal

1. Verify the selected project is the authorized nonproduction target and independently inspect live migration history and checksums, Auth settings, callback list, storage policies, RLS/grants, feature-gate values, role assignments and data counts without exposing secrets or personal data in the evidence record.
2. Compare every exact pending migration from the release tip with the live target. Review its default gate state, source authorization, client grants, dependency order, lock/runtime footprint, rollback/forward recovery and required retention/legal-hold policy. Resolve any drift before proposing an apply manifest.
3. Resolve TASK-010 implementation, hosted moderation/size-signal policy and MVP scope decisions before presenting an exact hosted manifest. A passing local reset or the 2026-09-22 hosted note is insufficient.
4. Review exact app build SHA, HTTPS origin/redirects, SMTP sender/test mailbox, Mapbox, analytics capture state, operator bootstrap/MFA, backups and cleanup. Obtain target-specific hosted authorization only after the package is concrete and reviewable.

A read-only attempt to invoke the pinned local Supabase CLI failed before producing command output in this task environment (Bun runtime error). No hosted inspection or migration was performed. The release preflight must use a working trusted CLI/session and retain sanitized evidence.
