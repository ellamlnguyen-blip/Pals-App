# TASK-039B fresh security review

Date: 2026-10-16
Reviewed source: remote-verified `agent/TASK-039B-friendship-dm-server` at `1692e91edf1b641843909f8bd18cb02924c36c52`; implementation `936023aa69539d425f30a4be3ed88fb17a99fea9`.
Migration: `supabase/migrations/20261016000200_friendship_only_dm.sql`, SHA-256 `babae80f981c6cceeea0ab156f3764ee03b56e8b03c6d322d65c8e5d22fdde2c`.

The independent reviewer found no concrete direct-message authorization bypass at this pinned tip. Current friendship gates reads, sends, exact retries, poll access, combined attention and notifications. Pending and nonfriend generations become privately terminal without deleting evidence; old request/independent-consent RPCs are revoked. Friend send and teardown use the shared social/pair lock, and the focused tests cover both send/teardown serializations. The reviewer confirmed that DM attention excludes peer opt-out/readiness loss before projecting a row.

TASK-039C may depend on this tip for disposable-local web/API work. This is not final acceptance, application-main integration or hosted approval. Remaining verification: a truly concurrent read versus unfriend, a clean complete migration-stack/ledger run, broader legacy notification variants, and attention pagination under larger data. The server handoff records the isolated `pals_task039b` database evidence and its schema-only clone/pg_cron limitation.
