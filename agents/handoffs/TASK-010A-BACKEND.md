# Handoff — TASK-010A local co-host backend

Date: 2026-09-25
Agent: bounded TASK-010A backend agent (GPT-6 Sol, medium requested; dispatch has no Standard-speed setting or verification)
Branch/worktree: `agent/TASK-010A-cohost-backend` at `/private/tmp/pals-task010a-cohost-backend`
Starting remote `main`: `559db5bf8d3be55f2d0223f47cdf08a730d2354c`
Rebased remote `main`: `26e1a3edbaa736f9b57794415b92c3201206339e` (eight docs-only commits, no implementation overlap)
Tested code commit: `36c05ae00913c68857ae047c653ed9e25799a125`
Task branch remote SHA: **unpublished** — automatic approval review rejected `git push` twice
Integrated `main` SHA: **pending** — security review and publication remain blocked
Main status record: coordinator-owned `tasks/NOW.md`, `docs/operations/CURRENT_STATE.md`
Outstanding: independent exact-tip security review, expanded observed-lock matrix, workspace lint/typecheck/build, task-branch publication and verified main integration.

## Outcome

Added the Accepted ADR-0012 co-host assignment and management boundary in `20260925000200_local_cohost_authority.sql`, with no UI, hosted migration, persistent gate enablement or new product event. The implementation remains local and incomplete until review and publication.

`private.hangout_cohosts` uses the existing `(hangout_id,account_id)` participant key and no client grants. A central participant-state trigger clears assignments on leave, removal, block teardown and future reconciliation. Effective authority requires a currently joined, live-ready, same-campus nonhost on a published, undisabled Hangout. Readiness loss suspends authority; restoration while the assignment and joined state remain restores it. Cancellation makes assignments ineffective. The host is immutable and never an assignment target.

The authorization matrix is: host can promote/demote, edit, control joining, cancel, and remove joined/left nonhosts even if nonready or cancelled; effective co-host can edit, control joining, step down, leave, and remove only a current-ready joined ordinary participant on a published Hangout; ordinary participants can leave. No co-host can cancel, assign roles, remove host/another co-host, or inspect retained/nonready assignments. Host-only `get_hangout_large_state` remains unchanged.

## API and data boundary

- New `promote_hangout_cohost(uuid,uuid,bigint)`, `demote_hangout_cohost(uuid,uuid,bigint)` and `step_down_hangout_cohost(uuid,bigint)` return the advanced revision. Caller identity comes from `auth.uid()`.
- New `list_hangout_cohosts(uuid,uuid,integer)` returns only assigned account IDs, including nonready IDs, to the current host. New `list_hangout_roster_roles(uuid,uuid,integer)` returns current-ready account IDs and `host`/`cohost`/`participant` labels only where existing roster RLS already permits the ID. Both are keyset paginated, default/max 24, and gate/readiness/host-block/disable checked.
- Existing `edit_hangout` and `set_hangout_joining` accept an effective co-host with the existing field, schedule, private-location and notification behavior. `cancel_hangout` remains host-only.
- Dropped the executable two-argument `remove_hangout_participant(uuid,uuid)`; `remove_hangout_participant(uuid,uuid,bigint)` requires expected revision and returns the next revision. All repository SQL/HTTP/concurrency callers were migrated, and actual-role SQL plus real PostgREST tests deny the old signature.
- Nonhost leave remains revision-free; when it clears an assignment, the revision advances. Host removal advances the revision. For post-cancellation removal/assigned leave, only `revision` changes on the Hangout; the original cancellation `updated_at` remains intact. The ownership trigger still freezes schedule edits after attendance opens.

Before: social mutation lock → parent Hangout lock → actor/source evidence → participant/provenance writes → notification gates/recipients.
After: same order, with target live evidence and assignment checks after the parent wait; assignment deletion happens inside participant transition, and revision updates happen under the parent lock. The current `private.lock_hangout` remains mandatory for management mutations, including moderation-disable denial. `private.safety_record_joined_overlap` still precedes leave/removal writes. Safety-forced teardown emits no ordinary departure event. Material co-host edits emit only existing `hangout_edited`; cancellation only existing `hangout_cancelled`.

## Files changed

Migration: `supabase/migrations/20260925000200_local_cohost_authority.sql`. New suites: `supabase/tests/database/local_cohost_authority.test.sql`, `supabase/tests/cohost-http.integration.mjs`, `supabase/tests/cohost-concurrency.integration.mjs`. Updated old removal callers in existing database, HTTP, action and concurrency suites; updated `supabase/README.md` RPC contract. No coordinator-owned shared status or UI file was edited.

## Verification

- Local Docker target verified `127.0.0.1:54321` API and `127.0.0.1:54322` DB, using the existing isolated Lima VM and `pals-local-network` loopback option. No hosted target was used.
- Two clean local resets applied the completed migration. Full direct-stream actual-role pgTAP suite passed after each: 18 files / 994 assertions before the final six safety-teardown assertions, then 18 files / **1,000 assertions**, no `not ok` or SQL errors. Direct streaming used the task worktree SQL because the VM's read-only pgTAP mount points to an older checkout.
- True upgrade passed: reset to the preceding schema through `20260925000100`, then `supabase migration up --local` applied `20260925000200`; migration history verified. The expanded co-host suite passed **63/63** against that upgraded schema. The 63 assertions cover role matrix, stale revision, direct DML/old RPC, bounded readers, readiness suspension/demotion, rejoin nonrestoration, block teardown/provenance/nonrestoration, and pre-start cancellation crossing attendance opening followed by host removal and assigned leave. Original `updated_at` stayed unchanged and attendance answers remained denied.
- Local `db lint --schema public,private --level warning --fail-on warning`: no schema errors. New real Auth/PostgREST co-host suite passed **1/1** via direct `node` execution; its `node --test` invocation did not complete because Supabase CLI `status` intermittently exceeds Node's 15-second pre-registration limit. New observed-lock suite passed **1/1** with three observed waits: leave→promote, demote→edit, cancellation→co-host removal. Existing Hangout race **1/1**, global-block race **1/1**, Hangout notification race **2/2** passed.
- Direct Prettier check: all matched files pass. Root unit tests: 46 pass, 0 fail, 1 sandbox loopback skip. Changed JavaScript syntax checks (10 files), Python AST parse and `git diff --check` pass.
- `pnpm check` did not complete: offline install lacks `@types/react@19.3.0`, and pnpm then aborted a modules purge without a TTY. Standalone ESLint hangs even for `--version` in both this worktree and the canonical checkout; no ESLint pass is claimed. Typecheck/build and existing built Next HTTP suite were not run. The independent reviewer should treat these as open verification gates. The observed-lock suite covers three core races; additional TASK-010A contract races (promote versus block/host removal, demote versus joining/removal, disable/source-gate/readiness waits) remain to be added or independently verified before integration.

## Cleanup

After final reset and rolled-back SQL fixtures, local SQL counted **0** Auth users, **0** Hangouts and **0** profile-photo objects; a dynamic check found no enabled `private.*feature_gate` row. Supabase stopped successfully; the task-owned Lima VM stopped successfully. No `.env`, credentials, gate state or dependency directory was committed.

## Publication blocker

Automatic approval review rejected the exact task-branch `git push -u origin agent/TASK-010A-cohost-backend` action twice. It said publishing private implementation contents to the GitHub remote lacks explicit user authorization for this destination/branch, even after the retry cited the published TASK-010A contract, `AGENTS.md` publishing rule and coordinator dispatch. The rejection forbids indirect workarounds. The branch is committed locally and has no verified remote SHA. Do not mark A complete, dispatch TASK-010B or integrate main until the user authorizes this specific publication, the exact tip receives independent security review and remaining gates are resolved.
