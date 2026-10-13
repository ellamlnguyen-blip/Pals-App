# TASK-028R1 — Staging controls for the reviewed profile migration lane

Status: Source/security review and rollback-only staging runtime passed; canonical publication and authorized operation pending.
Date: 2026-10-12.
Parent: TASK-028R hosted test release; no separate successor.
Baseline: canonical main f7e82224c7e0bbf9f81eb20805123eba6f1a4163, plus this contract.
Reviewed dependency: scripts/staging-control directory from P2 task20cdd69cc45398334dbd37aeaee29bd980d1a514 (same reviewed TASK-027 manager/source/emergency controls).

## Problem and scope

The existing exact-target control runner requires latest migration20261005000700, so it now denies all control operations after reviewed profile migrations001/002/003 were applied to exact Pals Staging ffabdrgsmtfylrehwmfo. New rich source gate is deliberately absent from its old allowlist. Fix only the staging administrative runner/test/runbook boundary required by the user's hosted TEST release. Do not weaken migration checks, caller sessions, account identity, immutable receipts, expected-state guards, role transitions or emergency availability-off. No architecture/provider/schema/RLS/UI/domain/Production change.

## Implementation

Fresh Solmedium agent in a separate branch from current origin/main copies only the reviewed scripts/staging-control dependency from P2 (built-in Node implementation/tests and existing SQL templates), then updates exact preflight to require all existing reviewed versions plus profile001/002/003 and latest003. Preserve rejection of missing/unknown future history and wrong project/session. Add only rich_profiles -> private.rich_profile_feature_gate to the source gate allowlist using the existing locked, expected-state, audited gate SQL. No backfill or forced user consent. Preserve analytics/large safeguards exclusion and fixed Ella role authority. Update isolated local test generator/runbook for this reviewed38-lane and clarify truthful administrative session provenance. Add meaningful runner tests for missing profile versions/future history, exact rich table binding, stale-state/conflicting idempotent receipts, and unchanged emergency-off constraints where feasible. Do not duplicate implementation tests without value.

Agent owns scripts/staging-control/** and agents/handoffs/TASK-028R1.md only. Root owns contracts/shared records, publication, hosted execution. No secret/environment files, migration, application source or hosted mutation by agent. Tests may use local rolled-back SQL only if an authorized disposable stack is available; otherwise record that gap and prepare rollback transaction test for root's explicit exact staging review (no real fixture identity/claims or persistent mutations). Do not run existing synthetic-user local generator against hosted staging.

## Review, publication and execution gates

Commit bounded source/handoff to agent/TASK-028R1-staging-profile-controls, independent exact-tip security review, fix findings, push/verify task SHA. Integrate only reviewed control-script source and docs to canonical main (not P2 app/migrations); verify remote main. Root verifies actual clean runner tip/38 history/target/properties and performs only authorized rich source operation with expectedfalse/true, distinct request/reason/authorization and immutable receipt. Existing emergency shutdown remains off-only under existing incident authorization; do not exercise real shutdown during ordinary QA. No additional manager/admin grant. Full hosted rich consent/peer tests still require real verified users; never invent identity or bypass Auth. Parent TASK027/028 release/application gates remain incomplete.
