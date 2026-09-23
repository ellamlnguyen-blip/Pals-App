# TASK-015A handoff — private notification ledger and social events

Status: task branch prepared for independent exact-tip security review; not integrated or complete on canonical main.

## Baseline and scope

- Branch: `agent/TASK-015A-notification-ledger` in an isolated worktree.
- Exact starting canonical main: `3cf7bfccf89749d4ff5b4dcdae61588b5341d8ec`.
- Authority: Accepted ADR-0017 and the published TASK-015A contract. Only disposable-local friendship and DM sources are hooked. No Hangout/chat source, web UI, hosted target, Realtime, push/email or global blocking/reporting change.
- GPT-6 Sol medium was assigned. Dispatch exposed no speed selector, so Standard speed was not independently configured or verified.

## Outcome

- Additive migration `20260923000400_local_notifications_social.sql` adds a default-disabled private gate, sparse four-category owner preferences and a private ledger. RLS is enabled; `anon` and `authenticated` have no direct table grants. Rows store only server IDs, supported event code, actor/recipient, server time and read time. A unique recipient/source/event identity uses the friendship or DM generation, or the later DM message's server ID. Source teardown retains rows privately.
- Same-transaction triggers generate incoming friendship and DM requests, acceptance to the requester/initiator, and later accepted DM messages. The atomic first reply generates acceptance alone. Exact source retries and no-op transitions do not create extra rows. A disabled notification gate does not veto source mutation or replay missed rows.
- Owner-bound, fixed-search-path RPCs read/set preferences, read a deterministic descending `(created_at,id)` page of at most 24, and idempotently mark owned items read. All reject stronger isolation, disabled gate and inactive owner. Preferences remain available to active owners after readiness loss. Unavailable items expose only opaque notification ID, generic label, time and read state; source fields and peer/target IDs are null. Destination APIs must reauthorize on open.
- Source hooks follow existing retry/pair/eligibility locks, then take the notification gate row `FOR SHARE`, then a per-recipient advisory transaction lock. Preference writes take the gate row before the same recipient lock and recheck state after the wait. Mark-read locks the gate row before changing read state.

## Verification

- Validated disposable local API URL was `http://127.0.0.1:54321`, using the existing local Lima Docker VM and no hosted target.
- Two clean local resets applied every migration. On the second reset, all nine actual-role SQL suites passed: Hangout 114, identity 53, DM 46, friendship 38, Hangout chat 72, notifications 31, onboarding 22, People 82 and profile 37 TAP assertions. `supabase test db` itself cannot mount this isolated worktree into the Lima VM; the same suite files were streamed directly into local PostgreSQL with `ON_ERROR_STOP=1` and checked for TAP failures.
- New real Auth/PostgREST notification suite passed. It exercises gate denial, owner isolation, table/forged RPC denial, source transitions, no text copy, bounded cursor, mark-read, revocation, preference access after readiness loss and suspended denial.
- New concurrency suite passed with observed PostgreSQL lock waits in both preference-mute and gate-disable orders. A committed mute/disable first suppressed the waiting message item; an event holding the recipient/gate locks first committed before the change.
- Five existing friendship/DM real Auth and concurrency suites passed after adding hooks. `pnpm db:lint` found no warning. `pnpm check` passed format, ESLint, typecheck, 26 unit tests and web/admin builds. Final focused `pnpm format:check` and `git diff --check` passed.
- Final local inspection found People, friendship, DM and notification gates false; zero notification items, preferences or synthetic notification Auth users; zero client grants and zero Realtime publications for notification tables. Disposable Supabase and VM shutdown are required before publication receipt.

## Review focus and limits

- Independently inspect source-trigger placement and transaction lock order, including DM first reply. Review owner and current-source predicates in `list_notifications`, especially neutral projection after opt-out/block/campus/readiness/gate changes. A committed revocation was tested; an in-flight inbox read crossing revocation was not instrumented. The source route remains the final destination authorization boundary.
- `notification_items` has no source foreign key by design; this preserves historical evidence after friendship deletion and DM terminal state. Production retention and moderator access remain open policy, with no hosted use authorized.
- Coordinator owns shared task queue/state/changelog, exact-tip security review, main integration and remote SHA verification. This task branch does not finish TASK-015A or dispatch TASK-015B.
