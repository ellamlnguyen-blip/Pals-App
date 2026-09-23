# TASK-015A independent security and evidence review

Date: 2026-09-23
Reviewed branch: `agent/TASK-015A-notification-ledger`
Exact reviewed and remotely verified tip: `b9681f1a1bcfb5bdaa62329436c8cd3935dd9fd1`
Published contract baseline: `3cf7bfccf89749d4ff5b4dcdae61588b5341d8ec`

## Conclusion
Clear for canonical integration within the disposable-local TASK-015A boundary. A fresh GPT-6 Sol medium read-only reviewer inspected the exact diff, confirmed live GitHub branch SHA, and found no blocking privacy or authorization issue. The reviewer did not rerun the stopped local database stack; implementation verification is recorded in `TASK-015A.md`.

## Security findings and evidence
- Private tables have RLS and no client table grants; caller-bound RPCs own preferences, bounded inbox and mark-read. No generic client notification insertion or platform-role bypass was found.
- Same-transaction source triggers generate the specified friendship/DM transitions without copied message text. Exact retries and the first reply's single acceptance event match the contract.
- Gate, mute and recipient locks follow the reviewed order. Current source authorization is rechecked before source IDs, event code or actor are returned; unavailable rows project a neutral item.
- The handoff's committed-revocation checks passed. An instrumented in-flight inbox read crossing gate disable or suspension was not run. The reviewer confirmed the implementation's already-authorized in-flight read may finish, which ADR-0017 permits; a later RPC observes committed revocation. This is an evidence limit, not an integration blocker.

## Boundaries
Hangout/chat event hooks, Notifications UI, global blocking/reporting, Realtime, push/email, hosted delivery and production retention are not reviewed or completed here. TASK-015B contract/publication follows reviewed A integration.
