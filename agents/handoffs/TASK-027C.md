# TASK-027C — Immediate-access lifecycle test reconciliation

Date: 2026-10-05  
Branch: `agent/TASK-027C-access-lifecycle`  
Status: Test expectations reconciled; parent TASK-027 and this acceptance gate remain incomplete

## Outcome

- The real Auth/Storage HTTP fixture now proves that a confirmed exact-domain UNC account is `ready` with an empty profile, no primary photo and no pilot admission row. An equally unprofiled peer can discover and join a public Hangout. The existing private-instruction denial before joining, owner-only Storage access, peer-folder denial, stale-email revocation, removal/cancellation denial and feature-gate checks remain.
- The web lifecycle checks now recognize the `/hangouts` redirect to saved discovery and check the saved page instead of obsolete mock Hangout copy. Removing a viewer's primary photo no longer hides opted-in People text. The profile metadata-loss assertion already expected `ready`; its label now matches ADR-0030.
- The in-flight Hangout privacy fixture now holds a **completed real chat HTTP response** through the local-only test preload, commits suspension while no database lock is held by the hold, then releases that response. It verifies that the final page omits private instructions and source IDs. The former database table-lock barrier caused a reader/writer deadlock.

## Verification

- `node --test supabase/tests/auth-storage.integration.mjs`: **1/1 passed** against the disposable local Supabase stack after Storage was repaired to runtime v1.77.5.
- Full `test:auth:web`: **3/4 passed, 1 failed** on the existing stale Hangout edit assertion. The web action returned `uncertain` after about 69 seconds, while the test requires `conflict`. PostgreSQL repeatedly raised `Stale Hangout revision` (`40001`) during that request. The assertion remains strict; no `uncertain` result was accepted as success. This is a source/transport behavior requiring separate correction or an explicit product decision.
- One diagnostic `test:auth:web` run temporarily omitted only that stale web edit call: **4/4 passed**, including the new in-flight revocation/privacy check and the three concurrency suites. The stale edit assertion was restored before this handoff. The diagnostic pass does **not** count as a full acceptance pass.
- Focused local preload test: **1/1 passed**, covering loopback matching, a completed response held until release, single queue consumption and the existing after-commit transport fault.
- Syntax checks, Prettier check and `git diff --check` passed for changed files. Exact disposable Auth/Hangout leftovers from deadlocked exploratory runs were removed; the final diagnostic run cleaned its own fixtures.

## Remaining work

1. Resolve the stale edit web action's repeated `40001`/`uncertain` behavior without weakening stale-revision denial. Rerun the full `test:auth:web` suite and any directly relevant regression checks.
2. Coordinator review, shared status records and remote-verified main integration remain with TASK-027. No hosted service was changed.
