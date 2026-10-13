# TASK-027H — Moderator MFA database boundary

Date: 2026-10-05
Branch: `agent/TASK-027H-mfa-guard`
Status: Local implementation verified; fresh security review and main integration pending.

## Outcome

Merged reviewed TASK-027 parent `360d8e8db0b32c9fb98fc03e087eddb47cd367a9` into canonical-main baseline `c2db92d8c175e99e71ec99ec613e9dbfd3be4008`. The merge's two duplicate TASK-027F documentation conflicts retained the newer canonical-main statuses; no implementation conflict was present.

Migration `20261005000300_moderator_mfa_guard.sql` replaces only the shared `private.moderation_actor()` guard used by exactly five privileged RPCs. It requires a JWT `aal2` claim and session ID, current owned Auth session at AAL2, a live expiry check, and a current verified owned TOTP factor. Existing gate, active account and moderator/admin checks remain. Auth factor is locked before session; the final joined read follows both locks, so a wait observes committed factor/session revocation. The previous gate/account/role lock order and caller ABI remain. `clock_timestamp()` checks expiry after any wait. No student or per-action TOTP challenge was added.

Local `config.toml` enables TOTP enrollment and verification, which were disabled by default. This is only local Auth configuration; hosted settings and operations were not changed. The SQL tests directly affected by the new guard now create transactional Auth session/factor fixtures and set corresponding simulated claims. Genuine positive Auth proof comes separately from the HTTP test, never a forged positive HTTP JWT.

## Evidence

- Full disposable reset applied migration 003 cleanly with pinned ignored Storage `v1.77.5` and local Auth `v2.197.0`.
- `supabase test db --local --network-id pals-local-network`: 27 files, 1,691 assertions, PASS. Includes five reconciled moderation SQL fixtures and new actual-role MFA negative/positive checks.
- `supabase db lint --local --schema public,private --level warning --fail-on warning`: no schema errors.
- `moderator-mfa-http.integration.mjs`: PASS with real signup, Auth TOTP enrollment, challenge and verification; AAL1 denial and AAL2 success on all five privileged RPCs, six expected audit rows, ordinary confirmed UNC AAL1 `ready`, role/status/session/factor negative matrix, restored admin queue/detail authority, actual Auth factor unenrollment, and a request waiting on concurrent session downgrade before denial.
- `git diff --check` and Node syntax check: clean.

## Limits and review focus

- Existing `moderation-http.integration.mjs` still assumes AAL1 is a valid positive moderator session and fails at its first positive queue assertion. It needs a separate fixture migration to genuine TOTP while retaining its broader conflict/sanction coverage. Existing `hangout-disable-http.integration.mjs` could not load `@supabase/ssr` from this isolated worktree's borrowed root dependencies; it was not verified. The new focused HTTP suite and full SQL suite passed. Other older HTTP/concurrency suites with simulated moderator claims were not run and may need the same bounded fixture update.
- Review the exact Auth factor/session lock ordering against the deployed Auth version, session `not_after` null semantics, and concurrency test. The local Auth image is `v2.197.0`; [that version's `UnenrollFactor` source](https://github.com/supabase/auth/blob/v2.197.0/internal/api/mfa.go#L950-L983) deletes the factor and then calls `DowngradeSessionsToAAL1` in one transaction. The genuine local unenroll test confirms the resulting cached JWT is denied. Hosted Auth version compatibility remains a release check. No hosted write or rollout was done.
- Shared task queue, current state and main integration remain coordinator owned. Release of the disposable local stack to TASK-027G follows this handoff.

## Publication

Task branch push and remote SHA verification to be recorded in the coordinator receipt after commit. Main remains at the separately verified canonical baseline until review/integration.
