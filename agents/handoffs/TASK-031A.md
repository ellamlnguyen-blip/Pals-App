# TASK-031 Stage A handoff — saved Hangouts period query

Status: Stage A implementation committed for coordinator review. TASK-031 parent remains incomplete. No migration was applied to any backend and no local browser claim is made.

Branch: `agent/TASK-031-hangouts-map`; baseline `20e25bc0b07e6d9b3badb7b8dd6eb37dc2e0f0e7` (exact reviewed TASK-030 dependency on the canonical documentation baseline).

## Outcome

- Added one migration replacing the existing seven-argument `public.query_saved_hangouts` body. It accepts strictly `0000`–`1111` period masks while preserving `upcoming` and `all`, grants, ten-field pin projection, live campus/source checks, gate lock/epoch and ranking. New York civil-day intervals filter candidates before the 101-row probe. `0000` returns an authorized empty projection.
- Extended the narrow saved query adapter to accept valid masks and reject any source row outside its selected interval. It retains one cutoff and identical arguments across the two RPC calls, fresh access check, full 101-row comparison and 100-row release.
- Exposed pure period validation, classification and New York civil-midnight boundaries for Stage B. The four mask bits mean Today, Tomorrow, This week, Later in that order. Tomorrow wins over a Sunday/Monday boundary; This week is empty where day-after-tomorrow reaches or passes next Monday.
- Added actual-role pgTAP fixture with anonymous/restricted denial, strict malformed-mask checks, legacy `all`, all-off/all-on and 130 excluded earlier Tomorrow rows ahead of a selected Later row. Existing safeguard SQL/HTTP suites still cover gate epoch/ranking/recheck behavior and should be rerun after application.

Migration: `supabase/migrations/20261014000100_saved_hangout_period_masks.sql` SHA-256 `0c65f8b5d72538bd63f8dcb8dfde765f80f91f8291879fac035f88e0261e7215`.

## Verification completed

- Focused Node tests: 7 passed (`saved-periods`, saved ID, map).
- `tsc --noEmit -p apps/web/tsconfig.json`: passed.
- ESLint on changed web/test files: passed.
- Prettier check on changed web/test files and `git diff --check`: passed.

## Remaining gates

Fresh security review must precede application to the named disposable local API `55521` / DB `55522`. Then run the new actual-role pgTAP test and existing legacy/HTTP suites against that target, and verify grant/shape/source/ranking/epoch behavior. Stage B may import `validPeriodMask`, `savedPeriod`, `savedPeriodBounds` and `selectedSavedStart` only after Stage A review. No UI, shared queue, hosted, provider, gate or main integration work was done in this stage. The coordinator owns branch publication, remote SHA verification and shared records.
