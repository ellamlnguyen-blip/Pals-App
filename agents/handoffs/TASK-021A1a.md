# TASK-021A1a — Private admission authority handoff

Date: 2026-09-27. Executor: fresh GPT-6 Sol, medium; dispatch cannot set or verify Standard speed.
Status: **Local implementation and acceptance evidence prepared; final independent review, task publication and canonical main integration pending. Task remains incomplete until coordinator receipts are recorded.**

## Outcome and boundary

Added only private account-ID roster/manager authority, default-off availability/thirteen capability records, immutable management/manager audit, caller-scoped request ledger, internal evidence primitives and two narrow authenticated management RPCs. No old helper meaning, student RLS/grant/trigger, application, co-host authority, source gate or historical migration changed. No admission/manager backfill. Migration: `20260927000100_private_pilot_admission_authority.sql`.

**Existing student authorization is deliberately unchanged at this intermediate stage. A1a is not deployable, pilot-ready or admission enforcement.** A1b must implement ordinary/source/peer/onboarding/Storage admission checks; A1c must close deferred capability paths; later A2 must reconcile the app. No hosted migration/config/provider/callback/signup/SMTP/live user/deployment/DNS/analytics operation occurred. Hosted bootstrap/retention/deletion policies remain excluded.

## Baseline, branch and review

Worktree: `/private/tmp/pals-task021a1a-authority`, independent `--no-hardlinks` clone. Branch: `agent/TASK-021A1a-admission-authority`. Initial verified canonical baseline `f4ba5cd6affdd8eae7611a15cbed39d33e39b756`; reconciled cleanly onto coordinator canonical `8e815e17cec573082a454e2a94468ea8fd53c244` by replaying only unpublished source commits after the initial documentation chain. Reviewed lock/source documentation is already on main; no shared history rewritten.

Lock-design independent gate cleared `5d567f318fa8d708931f093a88681929362f6e7d`, with precise original-role/current-membership clarifications at `6439e68e74889368a4f431cdc80b0f06a7238583`. Resolved finding: blanket account RESTRICT would silently choose new deletion policy; live roster/manager references now cascade with existing account lifecycle, while immutable historical audit/receipt UUIDs have no live account FK. Account deletion is tested in both commit orders for new operations and retries.

Independent draft source review found no authorization/privacy defect. Its P2 evidence finding (account deletion versus exact retry, both commit orders) and requirement for exact leader/waiter lock proof were resolved and reviewed at pre-rebase `d6933157f92fc034af90f49d27f1f395d4ac211c`. Actual anon/service_role original-role guard probes and genuine upgrade module were reviewed at pre-rebase `dc9fb4c13b34dcf053b7ef452b02274269ab3bfc`. Final tested source commit: `30e3d40d7a2996c6452aeb1f3abe12a7ddba2b85`; subsequent source inventory/handoff/cleanup-helper changes require coordinator final-tip review.

Task remote SHA: **not pushed — coordinator explicitly withheld push until review**. Main integration SHA: **pending coordinator review/publication/integration**. No completion/successor claim.

## Management semantics and privacy

`set_pilot_account_admission(uuid,text,bigint,text,uuid)` returns state/revision; `set_pilot_policy(text,boolean,bigint,text,uuid)` returns enabled/revision. Authenticated EXECUTE only, actor from auth.uid(), current active account and separate active manager required. Student admission/readiness/verification, availability and platform role do not confer management authority. No manager assignment, roster reader, email resolver, arbitrary subject reader or supplied actor signature.

Reasons use existing profile trim and 1–2000 Unicode characters. Fixed state/key/value allowlists and required CAS: absent roster revision0, first insert1, actual change increments once, new authorized same-state request records one no-op success without advancing revision. Exact canonical JSONB fingerprint spans both operations and actor-scoped request UUID; exact authorized retry returns saved minimal historical receipt and appends no audit. Conflicting/stale/denied requests atomically fail without successful mutation/audit. Missing seeded policy/capability fails closed and mutation does not recreate it. Activation checks live current confirmed exact-domain UNC/campus/account without profile/photo readiness; revocation after target verification loss works.

All seven new private relations have RLS and explicit PUBLIC/anon/authenticated revokes. Internal functions have empty fixed search paths and client/service EXECUTE revokes. Private fixture manager writer requires actual postgres session and original `current_setting('role')` none/postgres, records executor session/role/backend/server time and shares the same serialization/CAS boundary. It is not a hosted bootstrap mechanism. Temporary rollback-only grants prove anon/authenticated/service_role original-role denial independently of EXECUTE/schema denial. Management supplies no profile/photo/chat/private-place reader or moderation role.

## Lock contract and evidence

See `TASK-021A1a-LOCK-DESIGN.md` for exact graph and `TASK-021A1a-SOURCE-AUDIT.md` for final-definition inventory, grants and acceptance mapping. Management/new/retry/trusted fixture: existing social transaction key `(16016,1)` first, exclusive pilot evidence `(16027,1)`, deterministic policy rows, sorted UUID account/manager/roster rows; activation locks actual target Auth/membership/campus rows, deriving campus from the locked current membership tuple. Separate fresh READ COMMITTED statements reauthorize after waits and before writes/receipts. Missing rows are serialized by common keys. External moderation/Auth/campus writers are protected by actual row conflicts, not advisory participation. No abort is caught and returned as success; stronger isolation denies.

Future A1b direct profile/Storage writers acquire shared pilot evidence after their existing row locks without acquiring social in opposite order. Management does not lock profile/Storage rows. A1b must prove the graph, source rechecks and safe aborts; this handoff does not claim current direct writers enforce admission. Existing snapshot/preissued bearer/delivered-byte limits remain unchanged.

Final concurrency run passed 25 exact-holder waits. Before release every waiter had the named leader PID in `pg_blocking_pids(waiter)` and an ungranted `pg_locks` row; sanitized diagnostics captured race/PIDs/lock types, no credentials:

| Races | Cases / both-order behavior | Observed lock |
| --- | --- | --- |
| 1–4 | Manager revoke versus NEW/exact retry, both orders; revoke first denies, authorized operation first may stand | advisory |
| 5–8 | Active account loss versus NEW/exact retry, both orders | transactionid |
| 9–12 | Auth/account deletion versus NEW/exact retry, both orders; live authority cascades, historical receipt/audit remains private | transactionid |
| 13–14 | Missing manager active assignment/revoked insertion before operation | advisory |
| 15–16 | Absent roster activation/revocation competing creation CAS, both winner states | advisory |
| 17–22 | Target email/current campus/active status loss versus activation, both orders | transactionid |
| 23–24 | Actual availability shutdown versus management, both orders; manager authority independent of shutdown | advisory |
| 25 | Competing capability CAS rejects stale overwrite | advisory |

REPEATABLE READ and SERIALIZABLE management both denied before writes. Tests exercise successful waits and expected denials; they do not claim universal deadlock freedom for privileged/provider transaction inversions or future direct writer enforcement.

## Exact checks and results

Environment prefix for DB/API commands: `DO_NOT_TRACK=1`, `DOCKER_HOST=unix:///private/tmp/pals-lima/pals-task002/sock/docker.sock`, PATH includes `/private/tmp/pals-runtime/docker` and `/private/tmp/pals-runtime/bin`, `PALS_PILOT_DISPOSABLE_OWNER=TASK-021A1a`. CLI status is parsed only in memory; no keys/tokens/credentials logged or bundled.

- True prior-schema upgrade: `node --test --test-concurrency=1 supabase/tests/pilot-admission-authority-upgrade.integration.mjs` — **1/1 pass** on initial verified preceding schema; rerun after `node supabase/tests/helpers/reset-pilot-authority-local.mjs prior` — **1/1 pass** with exact 20 committed migration-ID equality against database history. It applies only new SQL, preserves synthetic required/optional profile, private Storage, People preference/private report evidence, old access helper definition and unreplayed old history; roster/managers stay empty and configs off. No historical file altered.
- Guarded current resets: `node supabase/tests/helpers/reset-pilot-authority-local.mjs current` — success applying all21 migrations. Immutable upgrade/HTTP/concurrency fixtures were reset, not deleted ad hoc.
- Mountless `pnpm db:verify` equivalent: `node supabase/tests/helpers/verify-pilot-authority-db.mjs` streams **every20 current SQL file** with `psql -X -v ON_ERROR_STOP=1`, checks process status AND pgTAP `not ok`. Two final clean-reset runs each passed **1,089 assertions**, including **74 authority assertions**. Earlier unexpanded run passed1,082/67 and is superseded by final counts. Existing student suites continue passing unchanged.
- `node --test --test-concurrency=1 supabase/tests/pilot-admission-authority-http.integration.mjs` — **1/1 pass**, real local Auth/PostgREST manager checks, neutral ordinary/platform denial, incomplete target admission, original receipt/audit, fabricated actor denial, old JWT manager revoke/retry denial and attributable trusted bootstrap/revoke.
- `node --test --test-concurrency=1 supabase/tests/pilot-admission-authority-concurrency.integration.mjs` — **1/1 pass**, 25 exact-holder waits, assertions above and stronger-isolation denial; rerun after tightening shutdown to false in both orders also **1/1 pass**.
- `pnpm db:lint` (`--local --schema public,private --level warning --fail-on warning`) — **exit0, no schema errors**, including final run after second final suite.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck` — **exit0** after baseline reconciliation. Explicit new-module Prettier checks, `node --check`, `git diff --check` pass. Root standard formatting excludes authored supabase/docs by existing ignore rules, so new JS was checked explicitly too.
- `pnpm test` — **exit0,48 pass/0 fail/1 existing sandbox-loopback-listener skip**. This skip is not counted as DB/API evidence; authorized actual loopback Auth/DB tests above ran with required local permissions.
- `pnpm build` — **exit0** for web/admin. These existing app builds do not prove later pilot access-state/capability integration.

Dependency setup: offline install initially failed on missing cached @types/node tarball. Existing locked `/private/tmp/pals-task024` dependencies were copied with APFS clone support into the task clone without source/lockfile edits or downloads. External module symlinks initially caused Turbopack root rejection; copies resolved it and both builds passed. `pnpm_config_verify_deps_before_run=false` prevented pnpm's auto-reinstall check against these known locked local copies. Earlier baseline CHANGELOG formatting failure was fixed only by the coordinator's documentation commit and then standard formatting passed. Initial CLI startup lacked Docker on PATH; corrected known runtime PATH, startup succeeded. These are resolved setup issues, not runtime evidence passes.

## Proven target and cleanup

Coordinator recovered and verified the existing stopped `pals-task002` VZ/aarch64 runtime after missing Lima config; preservation backups/precise orphan cleanup were independently reviewed and recorded on canonical main. No download/host mount/bridged network/current disk destruction was introduced. Executor independently verified no containers before start, only owned `supabase_db_pals-local`/`supabase_storage_pals-local` volumes, `pals-local-network` loopback binding, exact config project `pals-local`, Auth user count0, preceding schema and actual postgres database/session. Services started only after clearance; all six named Supabase containers healthy/current. API bound127.0.0.1:54321, DB127.0.0.1:54322, local mail catcher127.0.0.1:54324. No shared/hosted target used.

After final reset and rolled-back full suites, `node supabase/tests/helpers/verify-pilot-authority-clean.mjs` passed: Auth/users/accounts/profiles/memberships/platform roles/Hangouts/participants/Storage objects/admission/managers/management audit/receipts/manager audit all **0**; every nonconfig private evidence table empty; availabilityfalse:revision1; all13 capabilitiesfalse:revision1; all original feature gates off. Existing independent safety/moderation gates were not coupled to ordinary availability. No synthetic/live account persisted.

`supabase stop` — exit0, project filter pals-local only. Docker running-container inventory then empty. The initial `limactl stop pals-task002` sent SIGINT to owned hostagent31863 and ultimately exited1 (`did not receive an event with the exiting status`); guest graceful `limactl shell pals-task002 sudo shutdown -h now` exited0 and VZ recorded stopped at10:39:55. The same control process remained after SIGTERM. Coordinator authorized precise orphan cleanup only after fresh exact command/start-time validation, last VZ state stopped, and no current disk/EFI/listener holders; SIGKILL terminated only revalidated31863 (started10:21:16). Final `limactl list` verified Stopped/hostAgentPID0, process31863 absent, and disk/EFI/test54321/54322/54324 listeners unheld. Guest/data services were stopped gracefully before orphan termination; no running guest was forced and no broad process kill/delete occurred. No credentials/.env/dependency dirs committed.

## Remaining gates

Final independent exact-tip source/evidence review and coordinator-owned task/shared-state update, reviewed branch push/remote SHA, accepted main integration/push/remote SHA remain pending. Executor has made no push and edited no queue/CURRENT_STATE/CHANGELOG. Coordinator must record those receipts before declaring this unit complete or reconciling/dispatching A1b. No product successor is authorized from this sub-stage. No hidden student/app fix was added to mask the intermediate limitation.
