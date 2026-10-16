# ADR-0046 — Reconcile duplicate local migration version

Status: Proposed
Date: 2026-10-16

## Context

The independently published TASK-031A `20261014000100_saved_hangout_period_masks.sql` and later TASK-032P8 `20261014000100_notification_attention.sql` use the same Supabase ledger version. A clean TASK-039D local stack applied the first filename encountered and failed the second at `schema_migrations_pkey` (SQLSTATE 23505), before ADR-0045's friendship-only DM migration or Auth/API/browser checks. The exact blocked run is on `agent/TASK-039D-migrated-browser` at `be91b3a7b30b82322e9b003f8d8604531a756240`; its task-owned resources were cleaned.

This is not merely a filename issue for existing databases. Some may record version `20261014000100` for either function set; a currently observed disposable TASK-029 database records that version and has both function sets. Version alone does not prove which body ran. Rewriting ledger rows or deleting private application data would be unsafe.

## Proposed local decision

Keep the earlier published Hangout mask migration's version and bytes intact. Remove the later duplicate-version notification-attention file from the active migration directory while retaining its exact source identity in Git history. Add one new, later reconciliation migration **after** `20261016000200_friendship_only_dm.sql`. It must create or repair notification acknowledgment, reassert the exact current friend-aware notification-attention body and grants from the friendship-only migration, and reassert the authorized saved-Hangout period-mask body and grants. Use idempotent function replacement where signatures permit. Do not edit existing ledger rows or erase data.

The source correction must preserve both effective features and TASK-039B's stricter DM attention filter. A former `20261014000100` ledger row can represent either original body, so the later bridge supplies any missing body after all intervening migrations. It must not broaden RPC access, alter RLS, change user-facing behavior or introduce a new provider. This proposal authorizes a disposable-local correction only; hosted migration remains gated separately.

## Required evidence before acceptance for integration

- Clean full Supabase migration-stack and ledger run from an empty, task-owned local project with each version unique and both functions callable only by intended roles.
- Upgrade matrix from schema/data copies representing version `20261014000100` with Hangout masks only, notification attention only, and both function sets. No mutation of the source databases. Run the pinned CLI 2.117.0 dry run and compare exact ledger versions before application. Confirm post-upgrade function bodies, grants, migration ledger and preserved fixture counts.
- Actual-role tests for notification unread/ack and saved Hangout period masks; regression on ADR-0045 migration and TASK-039D browser stack startup. Independent security/migration review of exact bytes and outcomes.
- Document effects on any environment whose ledger is already past the moved timestamp; use an explicit ordered reconciliation strategy rather than assuming the CLI replays an older version. Stop before hosted or shared-target application until the ledger path is proven for that target.

## Alternatives and tradeoffs

Renaming the later file to an older unused timestamp makes a clean stack start but can skip a missing body on an already advanced ledger. Forcing that old SQL later could overwrite TASK-039B's friend-aware attention filter. Manually inserting or deleting ledger rows obscures which SQL actually ran. One later reconciliation migration and an upgrade matrix cost more work but preserve historical evidence and make each state auditable.

## Acceptance

Requires Ella's explicit acceptance under AGENTS.md because this changes committed migration identities and upgrade behavior. Until accepted, only read-only investigation, a bounded proposal and reversible task-owned analysis may proceed; do not implement the source correction or apply it to any database.
