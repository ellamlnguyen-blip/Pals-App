# TASK-039D — Migrated friendship-only chat browser verification

Status: blocked before runtime verification; TASK-039D and parent TASK-039 remain incomplete.

## Baseline and ownership

- Branch: `agent/TASK-039D-migrated-browser` at `8a163da`, based on canonical-main contract `a03a7f8802c26cd7384e59c27230012305e639f7` and exact reviewed TASK-039C source `8ceca20fdcc017e9aad4ede1bb000846744824f4`.
- The copied migration `20261016000200_friendship_only_dm.sql` matches the reviewed source: SHA-256 `babae80f981c6cceeea0ab156f3764ee03b56e8b03c6d322d65c8e5d22fdde2c`.
- Task-owned trial target: project ID `pals-task039d-disposable`, copied source under `/private/tmp/pals-task039d-owned/supabase`, Docker network `pals-task039d-network`, planned API/DB/mail ports `55621/55622/55624` and web origin `127.0.0.1:3039`. No shared project configuration, migration, data, service, or app source was changed.

## Result and blocker

The cached Supabase CLI 2.117.0 and local images were available. `supabase start --network-id pals-task039d-network` began a normal migration-ledger application in the isolated project. It stopped before Auth/REST startup at `schema_migrations_pkey`: both committed `20261014000100_notification_attention.sql` and `20261014000100_saved_hangout_period_masks.sql` use ledger version `20261014000100`. The CLI applied the first and rejected the second with SQLSTATE `23505`, then stopped its task-owned containers. The exact friendship-only migration was never reached or applied. Changing a timestamp or inserting ledger rows in the copied source would no longer verify the committed migration set normally, so the trial ended at this blocker.

An offline frozen workspace install was also unavailable: pnpm 11.25.0 first lacked local supply-chain metadata for `electron-to-chromium`; trusting the committed lockfile then exposed a missing cached `eslint-config-next@16.3.5` tarball. No package download was attempted. A cached CLI binary from an existing task checkout was used for the isolated start; it reported the repository-pinned version 2.117.0.

## Verification and cleanup

- No synthetic accounts or fixtures were created. There is no migration ledger for the requested DM migration, authenticated browser session, viewport screenshot, or claim of DM/Hangout behavior.
- After the failed start, `docker ps -a` and `docker volume ls` showed no TASK-039D containers or volumes; inspection of the task network showed no attached containers. The empty task network was removed. Existing `pals-local`, TASK-028 and TASK-029 resources were not stopped or reset; the user-open 3035 preview was not touched.
- The copied task files under `/private/tmp/pals-task039d-owned` contain only task-owned configuration/source and no fixture or credential. The branch contains this handoff only.

## Remaining work

Resolve the duplicate committed migration version through a separately reviewed bounded source correction that preserves already-applied migration history. Then rerun this contract from a fresh task-owned stack: apply the exact migration through the normal ledger, use two synthetic verified-campus accounts, verify the specified DM authorization transitions and Hangout regression in actual browser sessions at 811px and 375px, capture evidence, and clean up only owned resources. TASK-039B edge-case tests and hosted/application-main gates remain separate.
