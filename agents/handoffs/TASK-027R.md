# TASK-027R — Genuine Auth manager concurrency fixtures

Date: 2026-10-05
Branch: `agent/TASK-027R-manager-concurrency`
Base: `bacceda` (reviewed TASK-027Q integration)
Status: Local implementation and focused verification complete; independent review and parent integration pending.

## Outcome

The manager concurrency suite now signs up each disposable manager through local Auth, confirms the local test email, signs in with a password, enrolls and verifies a real TOTP factor, and checks the resulting AAL2 token with Auth's `/user` endpoint. It uses the claims from that Auth-issued token in parallel SQL race sessions. The manager-positive policy and admission calls no longer rely on a synthetic AAL1 identity. Target accounts remain local SQL fixtures. The existing 25 observed wait cases, both committed orders, CAS, denial, retry, audit, isolation and final cleanup assertions remain in place. No manager guard, migration or hosted state changed.

## Evidence

- The focused suite passed: 1 test, 0 failures, with 25 observed lock waits after a clean official local stack start through migration `20261005000600`.
- Source syntax, Prettier formatting and whitespace checks passed.
- Before reset, fixture readback showed zero Auth users and managers, 22 expected immutable audit records, availability false and zero enabled capabilities.
- Official local database reset completed. Final readback showed zero Auth users, managers, management audit and request receipts; availability false; zero enabled capabilities.

## Local runtime note

The initial focused run could not reach Auth because the inherited disposable stack had DB and Auth on different Docker networks. An official CLI v2.117.0 stop/start with the pinned Storage v1.77.5 version recreated a healthy shared local network; no provider schema or application guard was patched.

## Remaining work

Obtain fresh security review of the Auth-to-SQL claims bridge and assertion preservation, then integrate the reviewed fixture. No task branch or main publication has been attempted by this agent.
