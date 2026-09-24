# TASK-018A contract handoff

Date: 2026-09-24
Branch: `agent/TASK-018A-contract`
Baseline: independently remote-verified main `35092024a2b0be5132dd9ee8b84c746fb9c03d2c`

## Outcome

Defined a bounded attendance backend contract under Proposed ADR-0022. It specifies private gate/response records, caller-bound exact/list/write projections, a separate parent lock that preserves the active unready/blocked-host owner path, post-opening schedule freeze, revision and clock behavior, and actual-role/race/regression tests. It creates no migration, RPC, test fixture, gate change or hosted operation.

## Review and remaining gate

A fresh GPT-6 Sol medium reviewer found four concrete contract issues in the draft; all were corrected and the reviewer found no remaining P0/P1/P2 issue on recheck. Standard speed could not be verified through the dispatch tool. `git diff --check` passed before final publication. Explicit user acceptance of ADR-0022 and canonical publication of this contract are required before a fresh A implementation agent; B UI remains separately contracted. No local service or database was started for planning.
