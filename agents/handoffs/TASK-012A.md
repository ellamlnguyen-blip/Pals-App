# Handoff — TASK-012A

Date: 2026-09-23
Agent: GPT-6 Sol, medium reasoning (dispatch had no Standard speed selector)
Branch/worktree: `agent/TASK-012A-friendship-backend`, `/private/tmp/pals-task012a-friendship-backend`
Starting main SHA: `7499c1056c866a085389ff373509ee419dca3b8f`
Implementation commit: `383586e3d6721e06ce9a3d89822746bd52d2b27d`
Task branch and pushed commit SHA: recorded in the agent's final publication receipt; the handoff commit cannot contain its own SHA.
Integrated `main` commit SHA: Not integrated; coordinator review is pending.
Main status-record path and last published milestone: `tasks/active/TASK-012A-friendship-backend.md`, published at starting main SHA above.
Outstanding review/integration blockers: independent security review, coordinator acceptance and remote-verified main integration.

## Outcome

Implemented the disposable-local ADR-0014 backend state, caller-bound RPCs and narrowly extended People block teardown. The friendship gate defaults off. No web UI, hosted operation, Hangout access or global block behavior was added.

## Files changed

`supabase/migrations/20260923000100_local_friendship.sql`, three new SQL/Node test files, `docs/engineering/{DATA_MODEL,AUTHORIZATION,TESTING}.md` and `supabase/README.md`.

## Behavior and authorization

One unordered pair has pending/accepted state, immutable server generation and campus at formation. A private caller/key ledger survives teardown; decline/cancel suppression is directional. Requests and acceptance use live same-campus readiness, People opt-in and bilateral block checks. Active participants retain ID-only state and cleanup after opt-out/readiness loss. Explicit accept/decline/cancel/unfriend RPCs require the current generation. Participant readers expose only peer ID, generation, direction and state; all private records and the gate lack client access. Pair transitions and People blocks share the same lock. An authorized block deletes the pair even with friendship gate off; a ready active participant may block the now-hidden peer by ID. Existing People gate/caller checks remain.

## Tests and verification

- Validated Lima's `pals-local-network` binds to `127.0.0.1`, Supabase `API_URL` was exactly `http://127.0.0.1:54321`, and used only this disposable local target.
- Two clean `supabase db reset --local --network-id pals-local-network` runs applied the new migration. Because this worktree is not mounted into the prior Lima VM, `supabase test db` could not mount its test directory. Streamed every `supabase/tests/database/*.sql` through local `docker exec -i ... psql -v ON_ERROR_STOP=1`; both rounds passed six suites: Hangout 114, identity 53, friendship 38, onboarding 22, People 82 and profile 37 pgTAP assertions.
- `supabase db lint --local --schema public,private --level warning --fail-on warning`: no schema errors, after each reset.
- `node --test` on the two new integration files: real Auth/PostgREST caller sessions and deterministic block/accept plus gate-revocation lock waits passed. Tests cleaned synthetic users, rows and gates.
- Direct Prettier check and ESLint check passed. `node --test tests/*.test.mjs`: 17 passed. `git diff --cached --check` passed.
- `pnpm check` could not install workspace dependencies: registry DNS returned `ENOTFOUND`; offline install lacked `@types/node@24.13.6` tarball. Existing matching-lockfile modules were usable for direct Prettier/ESLint but `pnpm check` itself aborted at its module-purge prompt. No green full check or CI is claimed.
- Final local query showed People, friendship and Hangout gates all `false`, zero friendship rows and zero synthetic HTTP/race Auth accounts. Supabase and Lima were stopped. Temporary dependency links were removed.

## Decisions and limits

No new ADR. `public.transition_friendship` is an ungranted internal implementation function; clients receive four action-specific RPCs. Denials use generic `42501`. The independent security reviewer should inspect post-wait authorization, key-ledger retention and the now-hidden block exception. Full `pnpm check` remains an environmental verification gap.

## Documentation updated

Data model, authorization, testing and Supabase API README. Shared NOW/BACKLOG/CURRENT_STATE/CHANGELOG are coordinator-owned and remain for review/integration.

## Ready for next task?

No. TASK-012B waits for independent security review, coordinator acceptance and main integration of A. Remote verification for task branch is recorded in the agent's final publication receipt; main verification and integration belong to the coordinator.
