# Handoff — TASK-015A backend contract

Date: 2026-09-23
Coordinator branch: `agent/TASK-015A-contract`
Starting canonical `origin/main`: `929fc4f163e11ea63b38e9d975d9fa932b49237b` (freshly fetched and remotely verified)
Policy: Accepted ADR-0017, explicit user “yes” after reviewed planning publication

## Outcome
Narrowed backend implementation to a private default-off ledger, owner preferences/reader RPCs, and authoritative friendship/DM events. Hangout/chat source hooks and Notifications UI are separate TASK-015B/C stages. No code, migration, route, gate enablement or hosted change is included in this contract publication.

## Independent review
A fresh GPT-6 Sol medium read-only security/planning reviewer examined the actual friendship/DM migrations and found six contract gaps: friendship gate recheck, neutral unavailable output, event-to-preference mapping, notification gate locking, per-transition event identity, and retention after friendship hard deletion. Those were corrected. The reviewer then found a gate/advisory lock-order deadlock possibility for preference writes; the contract now requires gate-first ordering. Final reread found no remaining publication blocker. This is contract clearance, not implementation verification.

## Publication and remaining work
Reviewed contract and ADR acceptance are published to the bounded branch and canonical main before a fresh TASK-015A implementation dispatch; both remote SHAs must be verified. The implementation agent must use the exact published baseline, deliver the tests/handoff in the contract, push/verify its task branch, then stop. Independent exact-tip security review and canonical integration precede TASK-015B. TASK-010/ADR-0012, TASK-016 global safety, Realtime and hosted gates remain open.
