# TASK-031 Stage A handoff — saved Hangouts period query

Status: Stage A accepted after source review and coordinator verification on named disposable DB55522. TASK-031 parent remains incomplete. At implementation handoff no migration had been applied; the later coordinator acceptance below records local application. No rendered browser claim is made for this backend stage.

Branch: `agent/TASK-031-hangouts-map`; baseline `20e25bc0b07e6d9b3badb7b8dd6eb37dc2e0f0e7` (exact reviewed TASK-030 dependency on the canonical documentation baseline).

## Outcome

- Added one migration replacing the existing seven-argument `public.query_saved_hangouts` body. It accepts strictly `0000`–`1111` period masks while preserving `upcoming` and `all`, grants, ten-field pin projection, live campus/source checks, gate lock/epoch and ranking. New York civil-day intervals filter candidates before the 101-row probe. `0000` returns an authorized empty projection.
- Extended the narrow saved query adapter to accept valid masks and reject any source row outside its selected interval. It retains one cutoff and identical arguments across the two RPC calls, fresh access check, full 101-row comparison and 100-row release.
- Exposed pure period validation, classification and New York civil-midnight boundaries for Stage B. The four mask bits mean Today, Tomorrow, This week, Later in that order. Tomorrow wins over a Sunday/Monday boundary; This week is empty where day-after-tomorrow reaches or passes next Monday.
- Added actual-role pgTAP fixture with anonymous/restricted denial, strict malformed-mask checks, legacy `all`, all-off/all-on and 130 excluded earlier Tomorrow rows ahead of a selected Later row. All fixture Hangouts have joined-host participant rows, and the deferred host invariant is forced to check before rollback. Live-cutoff RPC assertions cover Today/Tomorrow and This week/Later boundaries; historical PostgreSQL civil-expression assertions cover Sunday and both DST changes without weakening the two-minute RPC cutoff guard. Existing safeguard SQL/HTTP suites still cover gate epoch/ranking/recheck behavior and should be rerun after application.

Migration: `supabase/migrations/20261014000100_saved_hangout_period_masks.sql` SHA-256 `0c65f8b5d72538bd63f8dcb8dfde765f80f91f8291879fac035f88e0261e7215`.

## Verification completed

- Focused Node tests: 7 passed (`saved-periods`, saved ID, map).
- `tsc --noEmit -p apps/web/tsconfig.json`: passed.
- ESLint on changed web/test files: passed.
- Prettier check on changed web/test files and `git diff --check`: passed.

## Current remaining gates

Stage A source review and named-local database/API verification are complete as recorded below. Stage B UI review and rendered verification, branch/current-state publication and parent staged application integration remain coordinator gates. No hosted release follows this backend stage.

## Coordinator local acceptance

Fresh GPT-6 Sol medium source/security review cleared migration c11e093 and the test-only correction83f56b7. Coordinator applied exact hash `0c65f8b5d72538bd63f8dcb8dfde765f80f91f8291879fac035f88e0261e7215` atomically to named disposable DB55522, recording version20261014000100; migration count38→39, existing fixture counts and RPC grants unchanged. New actual-role pgTAP23/23 passes. Legacy safeguard64/64 passes using only test-copy generated coordinates/valid query viewport isolated from preserved fictional plans; source test file stays unchanged and rollback restores existing IDs/statuses/revisions/member counts. The initial unisolated legacy run had five ordering/count failures from other existing plans in the queried campus. An attempted transactional status isolation was rejected by the immutable lifecycle guard and rolled back; no trigger or privilege was bypassed.

Real fictional Auth/PostgREST verifies all16 masks with two identical reads around live access, ten public pin fields only, default-off chronology/current epoch, all-on equality with legacy upcoming, and malformed/stale/anonymous denial. Normal caller RPC created fictional Tomorrow Board games and Later Live music fixtures; private instruction sentinel does not appear in source projection. Keys/fixtures stay outsideGit. User supplied a public Mapbox configuration; localhost style/vector requests both200, rendered StageB map remains pending.

StageA is accepted locally for dependent UI work; StageB dispatched under published contract80de6fa/main8604fe2. Parent TASK031 remains incomplete behind independent UI/runtime review, publication and existing TASK027/TASK028 staged/main acceptance. No hosted migration/data/gate/deployment/domain or provider setting change.

## Verified task milestone publication

Candidate7040131a35dcff06cb15c41229d34401c95c4b11 on agent/TASK-031-hangouts-map was pushed and independently verified with git ls-remote. Pending documentation-only main publication will record StageA acceptance and active StageB; app/schema main integration stays gated. This receipt names a verified source milestone, not its own future hash.
