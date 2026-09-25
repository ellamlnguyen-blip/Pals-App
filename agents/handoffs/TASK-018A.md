# TASK-018A — Private attendance backend handoff

Status: Implementation complete on task branch; awaiting independent exact-tip security review and coordinator integration.
Baseline: independently remote-verified canonical `origin/main` `f728b08b53dc05508ec19744c9dc799557f4365e`.
Branch: `agent/TASK-018A-attendance-backend`.
Policy: Accepted ADR-0022, including the user acceptance receipt on the baseline. Disposable local only.

## Outcome

- Added migration `20260924000400_local_attendance.sql`: separate false-by-default private gate, private answer relation with one caller-owned answer per retained participant, RLS and no client table grants.
- Added authenticated caller-bound exact own read, 24-row Hangout-ID keyset list, and expected-revision answer RPC. Reads use one READ COMMITTED statement snapshot and reveal only own ID/answer/revision/time plus list eligibility booleans. Unknown, foreign, disabled, gate-off and stronger-isolation reads return no row. Source gate, readiness, campus and host block do not control retained owner reads; a disabled Hangout and sanctioned account do.
- Writes take the shared social/Hangout advisory lock, Hangout parent UPDATE lock, source and attendance gate SHARE locks, account SHARE lock, retained participant SHARE lock, then answer UPDATE lock. They recheck the database clock and current authorities after waits. First answer expects revision zero; an identical open-window answer is a no-op before revision comparison. All denied writes use `42501` and the same neutral text.
- Extended the existing Hangout ownership trigger to freeze `starts_at` and `ends_at` at the old schedule's attendance opening instant, independent of the attendance gate. The check runs after the UPDATE row lock and applies to the existing edit RPC and privileged direct table path. Other permitted edits still work.
- No UI, analytics, notification, peer result, gate enablement, hosted migration, deployment or production data was added.

## Verification

- Multiple clean disposable-local database resets applied all migrations. The final reset followed the immutable moderation race fixtures and was followed by all SQL suites and lint.
- All 16 `supabase/tests/database/*.test.sql` files passed directly through `psql -v ON_ERROR_STOP=1` in the disposable Supabase Postgres container, including 65 attendance pgTAP assertions. The added assertions set the scheduled end and start-plus-two-hour fallback opening to the database clock, test before/after both openings, test either side of the 30-day close, and recover a saved answer by exact own-read after close while an identical write is denied. Existing Hangout, account, block, safety, moderation, chat and notification SQL regressions passed.
- `python3 supabase/tests/attendance-concurrency.integration.py` passed 21 observed two-session outcomes: both commit orders for attendance/source gate changes, actual moderator `apply_account_moderation_action` suspension, caller-bound leave and host remove, caller-bound cancellation, host title edit, moderator disable, host block, plus answer versus rejected post-opening host schedule edit. One additional host time edit started before opening, was observed waiting on the Hangout parent lock, then failed after the stored opening instant passed. Denied first-order answers left no partial row; after a committed attendance-gate, sanction or disable transition, exact own-read returned no row. The test uses actual authenticated roles and existing source/moderation RPCs for all four reviewer-requested paths. Block, leave, removal and after-start cancellation correctly retain self-answer eligibility.
- `python3 supabase/tests/attendance-http.integration.py` passed real local PostgREST calls for owner/foreign reads, write, ID-only response shape, gate revocation, direct raw-table and embed denial. It also verified stronger-isolation read/write fail-closed behavior. The HTTP test signs synthetic authenticated JWTs with the disposable local secret obtained in memory from local CLI status; it does not impersonate a hosted Auth session.
- `pnpm test:auth` passed the existing real local Auth confirmation, SSR callback, RLS and Storage regression: 1/1 test.
- `pnpm db:lint` passed for `public,private` with warning failure enabled. `pnpm check` passed format, lint, typecheck, 37 workspace tests and both production builds. Python files also passed AST syntax parsing; `git diff --check` passed.
- Final local inspection: zero Auth users, Hangouts, attendance answers and disable rows; all nine feature gates false. Supabase services and the owned Lima VM are stopped.

## Limits and review focus

- The pinned `supabase test db --local --network-id pals-local-network` wrapper could not mount this new checkout into the inherited read-only Lima VM (`permission denied` creating its test mount path). Every SQL test file ran directly inside the same disposable local Postgres container instead; TAP results were checked for `not ok` and SQL exit errors. The wrapper command itself did not pass.
- The two-session suite used direct privileged gate and block updates to model those revocations. Sanction, leave, removal, cancellation, host edits and disable used actual authenticated caller-bound RPCs. It does not constitute a real external moderator or student session. The opening-crossing test observes a PostgreSQL lock wait and uses the database clock, but its two-second timing margin still depends on normal local scheduler progress.
- The Auth regression and PostgREST test are separate; the attendance HTTP test uses locally signed synthetic JWTs, so a single end-to-end Auth-created user answering attendance was not observed.
- Fresh exact-tip security review must clear P0/P1/P2 before integration. Review the owner-read single-snapshot claim, parent/gate/account/participant lock order, cancellation timestamp convention, direct schedule freeze, and private table/API non-disclosure.
- No policy conflict or ADR amendment was needed. The accepted private self-report policy controls this stage where older MVP prose suggested public attendance context.

## Coordinator next steps

Independently verify the pushed task branch SHA, run fresh exact-tip security review, then integrate accepted work and this handoff into canonical main with shared records. Keep TASK-018 parent incomplete until Stage B and its remaining gates finish. This task branch did not update coordinator-owned queues or main.
