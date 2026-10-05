# TASK-027D — Hangout stale-conflict retry correction

Date: 2026-10-05

Branch: `agent/TASK-027D-hangout-conflict`

Status: Reviewed source and final local verification pass; parent main integration and hosted verification remain incomplete. Original preparation receipts below retain their historical outcomes.

## Coordinator final verification receipt

Read-only source review clears exact commit c3b86bab604fc1ff34a179a2db34ff244ace8850. After consistent official Storage version metadata/reset/start, final db:verify passed two clean 1,678-assertion runs and lint; actual Auth/Storage1/1 and full Auth/web4/4 passed, including the strict stale-action and in-flight revocation assertions. Full formatting/lint/typecheck, 49 unit tests without skips and both builds passed. Only coordinator-owned changelog formatting changed after the reviewed source commit. See TASK-027E for runtime repeatability. No hosted gate or role changed; parent remains incomplete.

## Outcome

- Merged the published unfinished TASK-027 baseline (`ccc336a842ff7c229c0838e461bce97c1c705e68`) and reviewed TASK-027C lifecycle test correction (`9c782ed417c7fffc86c6b3f17699cb61dbd4a450`) as preparation. Main's coordinator-owned documentation won merge conflicts; no unfinished application code was integrated into main.
- The shared `private.check_hangout_revision` raised SQLSTATE `40001` for an expected-revision mismatch. This code denotes a serialization failure and PostgREST's transaction runner retries it internally. The permanent stale edit therefore re-entered the database until the web action returned an uncertain interrupted result. [PostgREST issue #3673](https://github.com/PostgREST/postgrest/issues/3673) identifies the `hasql-transaction` retry owner; [PostgREST error documentation](https://docs.postgrest.org/en/v14/references/errors.html) defines `PTxyz` status mapping.
- New migration `20261005000200_hangout_revision_conflict.sql` preserves the same helper signature, authority checks, stale message and ACL while raising `PT409` for this business conflict. `edit_hangout`, joining, cancellation, removal and co-host operations share the helper. Web edit and saved-management mappings now recognize only `PT409` as stale; genuine PostgreSQL `40001` still follows uncertain/transport handling. No historical migration, RLS, revocation or safety guard changed. The `00200` version avoids the separately proposed bootstrap audit `00100` collision.
- Existing SQL and HTTP expectations now require `PT409`; the real HTTP regression asserts prompt status 409 and unchanged revision/title. The web action regression asserts prompt conflict and unchanged revision/title without skipping the original stale assertion.

## Verification

- Two fresh disposable-local database resets successfully applied all migrations including `20261005000200`; both pgTAP runs passed 26 files and 1,678 assertions. `supabase db lint --local --schema public,private --level warning --fail-on warning` found no errors.
- Focused real Auth/PostgREST Hangout notices regression passed 1/1 with HTTP 409, prompt response, unchanged row and subsequent authorized operations. Focused Hangout concurrency test passed in the full Auth/web invocation. No active revision retry query or focused HTTP test account remained afterward.
- Focused ESLint, web TypeScript, web production build, Prettier and `git diff --check` passed. Local Node unit/preload tests passed 49, skipped 1 existing sandbox-only test.
- **Full Auth/web: 3/4, blocked before web stale edit.** The first real profile-photo Storage upload failed with `42P10` after clean database reset. Focused Auth/Storage likewise failed. Active local image is Storage `v1.77.5`; migration table max ID 72 (73 rows), with `idx_objects_current_version` unique on `(bucket_id,name) WHERE archived_at IS NULL`, while runtime upload asks `ON CONFLICT (bucket_id, name COLLATE "C") WHERE archived_at IS NULL`. Supported preserved CLI stop/start retained the mismatch and failure. No provider-managed schema workaround was made. The prior TASK-027C diagnostic 4/4 occurred before these clean resets and does not prove this source revision.

## Remaining gates

1. Resolve the separate local Storage runtime/schema compatibility through supported provider behavior, then rerun focused Auth/Storage and the full Auth/web suite with the stale assertion and completed-response hold intact. Do not claim full lifecycle acceptance from the focused HTTP pass.
2. Independent source/security review and coordinator-owned main integration/status records remain pending. No hosted operation was performed.

This task branch is a reviewable source candidate, not a completed TASK-027D acceptance or parent TASK-027 release.
