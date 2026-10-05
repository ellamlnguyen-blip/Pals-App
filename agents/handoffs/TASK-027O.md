# TASK-027O — Genuine Auth-backed moderation concurrency

Date: 2026-10-05
Branch: `agent/TASK-027O-genuine-moderation-concurrency`
Status: Local implementation and focused verification complete; independent security review clear and local parent integration complete. Publication remains pending.

## Outcome

The legacy moderation race fixture now creates four disposable local Auth users. Its moderator and admin each sign in through Auth, enroll a TOTP factor, challenge and verify it, and receive an Auth-issued AAL2 token. The fixture validates each token with Auth's `/user` endpoint, checks the AAL2, subject and session claims, then passes those actual claims to the parallel SQL transactions. Positive moderator identity/session claims are no longer invented in the fixture. The suite's gate, role, account, target role, case, membership, report and block lock-order assertions remain intact. No guard, migration, provider, hosted state or service-role caller was changed.

Cleanup now detaches and deletes both fixture photo objects by their actual paths. Partial signup failures remove already created users without masking the test failure. Immutable moderation audit is cleared by the final disposable reset.

## Evidence

- The exact final source passed `node --test supabase/tests/moderation-concurrency.integration.mjs`: 1 passed, 0 failed. Expected denied paths emitted `Moderation unavailable`; both successful and denied wait orders completed.
- `node --check` and `git diff --check` passed.
- Following the successful suite, mutable fixture counts were zero for users, roles, storage, reports and accounts; availability, moderation, safety and Hangout gates were off. Append-only audit held 11 expected test records.
- An official clean local reset using the repository's Supabase CLI v2.117.0 and pinned Storage v1.77.5 then returned users, roles, storage and moderation audit to zero with those gates still off.

## Local runtime note

An initial reset with a global CLI v2.119.0 failed the local Storage health check because its new database container landed on a different Docker network from retained Auth/Storage containers. Using the documented TASK-027E nonsecret Storage version pin and the repository's v2.117.0 CLI for official preserved stop/start and clean resets restored the disposable stack. No provider schema was patched.

## Remaining work

Request independent security review before parent integration. This branch has not been pushed or merged, and no hosted operation was performed.
