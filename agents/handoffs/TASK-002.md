# Handoff — TASK-002
Date: 2026-09-21
Agent: fresh TASK-002 implementation task; independent read-only security reviewer
Branch/worktree: `agent/TASK-002-supabase`, `/Users/ellanguyen/.codex/worktrees/4445/Pals App`
Prerequisites: `5b155cf` and `297f2a8` present before changes.

## Outcome
Implemented and verified the bounded Supabase foundation locally. TASK-002 remains awaiting authorized staging verification and orchestration review; the combined local/staging acceptance criterion is not marked complete. No work on TASK-003 was begun.

## Files Changed
- Pinned Supabase CLI 2.117.0 and lockfile; local start/stop/reset/test/lint/repeated-verification commands; database CI job.
- Local Supabase config, identity migration, UNC reference seed, and 53 real pgTAP assertions.
- Shared Supabase origin/environment target validator and two additional Node tests.
- Setup, Supabase/security/testing/deployment/data-model notes, current state, changelog, task queue and task status.
- Proposed ADR-0009 preserves the unresolved student verification policy; independent security review recorded in `TASK-002-SECURITY-REVIEW.md`.

## Behavior / Architecture Impact
Implements the accepted universities/account/profile/platform-role foundation using Supabase Auth and RLS. Auth insertion provisions an account and empty profile without trusting user metadata. Confirmed Auth email, server-controlled membership evidence, structural profile completion and suspension are independent. Verification evidence is bound to the current confirmed email, and a live helper rejects changed email, absent verification, inactive campuses, suspended/banned accounts and missing subjects.

Clients cannot change campus, verification, status or roles. Active accounts can only read/edit their own draft and read their membership/role; account restriction status remains owner-readable after suspension. University reference metadata is readable to active authenticated accounts. There is no peer-profile access, moderation bypass, membership-granting endpoint, Storage setup, provider client or auth UI. Future discovery must implement blocking/privacy before expanding access; future moderation requires audited operations.

No major new platform or production eligibility policy was introduced. Local Lima/Docker is development infrastructure, not a deployed backend provider. ADR-0009 remains Proposed and no domain allowlist is populated. The foundation's single current campus per account supports multiple universities without enabling cross-campus people discovery.

## Tests / Verification
- Full frozen workspace install with pnpm 11.19.0: PASS.
- `NEXT_TELEMETRY_DISABLED=1 pnpm check`: PASS (format, zero-warning lint, all package/app strict typechecks, five Node tests, both production builds). Rosetta performance notices persist from bootstrap. Initial check lacked app dependencies after root-only dependency addition; full frozen workspace installation resolved it.
- Local Supabase start: PASS, applied migration `20260921000100_identity_foundation.sql` and UNC seed to Supabase Postgres image `17.6.1.167`.
- `pnpm db:verify`: PASS. Two fresh `db reset --local` executions, each reapplying migration/seed, each followed by all 53 pgTAP checks passing. Then `db lint --local --schema public,private --level warning --fail-on warning`: no schema errors. Final verification log: `/private/tmp/pals-task002-db-verify.log` (temporary, not a durable repository artifact).
- SQL tests execute actual `anon` and `authenticated` roles with synthetic JWT subjects. Coverage includes cross-user/campus reads/writes, unconfirmed email, unverified/missing membership, incomplete/complete profile independence, email changes, inactive campus, suspension/ban, operator isolation and escalation, forged metadata, generated/ownership columns and null subject. Fixtures roll back; only UNC reference seed remains.
- First pgTAP attempt failed because the initially mount-free VM could not mount the test directory. Restarted with only `supabase/tests` mounted read-only; the unchanged SQL suite then passed twice. No mocked substitute was used.
- Fresh security review: no actionable findings. See `TASK-002-SECURITY-REVIEW.md`; reviewer did not execute tests.
- Final formatting and `git diff --check`: PASS.
- Supabase stopped cleanly (local database volume preserved), then Lima VM stopped cleanly. No task runtime remains running.
- Hosted CI, hosted migrations, staging verification, Auth API/session flows and Storage permissions: NOT executed. No staging/production target, remote repository push, DNS change, deployment, cloud resource or production access.

## Local Runtime Established
Official Lima 2.2.0 archive, checksum matched `bbdef91774885a0d05f7b048c4eb89ae2bcf3a0c252ae7ca7934e63df76d93c3`. Official Docker CLI 29.6.1. Temporary binaries: `/private/tmp/pals-runtime`; VM home: `/private/tmp/pals-lima`; instance: `pals-task002`. VM uses 2 CPUs, 4 GiB RAM and a 20 GiB sparse disk, no bridged networking and only the SQL test folder mounted read-only. Downloads may remain in Lima's standard user cache under `~/Library/Caches/lima`; no Homebrew, global Docker app or system service was installed.

To resume this temporary host setup, if paths still exist:

```sh
LIMA_HOME=/private/tmp/pals-lima /private/tmp/pals-runtime/bin/limactl start pals-task002 --tty=false
export PATH="/private/tmp/pals-runtime/docker:$PATH"
export DOCKER_HOST=unix:///private/tmp/pals-lima/pals-task002/sock/docker.sock
pnpm db:start
pnpm db:verify
pnpm db:stop
LIMA_HOME=/private/tmp/pals-lima /private/tmp/pals-runtime/bin/limactl stop pals-task002
```

The `pals-local-network` already exists in that VM. A fresh runtime needs the network creation in `LOCAL_SETUP.md`. Other worktrees must update the read-only test mount before pgTAP can run. Temporary directories may be cleaned by the host; this is not a permanent workstation install.

Observed network limitation: CLI 2.117.0 publishes database 54322 on all interfaces inside the VM despite the Docker network's loopback option; API/mail bind loopback. Lima host-agent logs explicitly confirm database forwarding at host `127.0.0.1:54322`. Other Docker runtimes must contain host exposure before use; the network option alone is insufficient for the database. This is documented in local setup.

Official tool references consulted: https://supabase.com/docs/guides/local-development and https://lima-vm.io/docs/installation/ . Release archives came from the Lima GitHub releases and Docker's official download host.

## Decisions
- Implemented only accepted foundation entities. Profile drafts stay owner-only until a separately reviewed peer discovery/blocking policy exists; platform role assignment grants no blanket client access.
- No automatic verification; the research is not treated as an accepted enrollment/domain policy. The exact allowlist and evidence required remain unresolved in Proposed ADR-0009.
- Staging migration instructions use a dedicated checkout and explicitly verified staging project reference, dry-run before application, no local seed or destructive hosted reset. They are instructions only, not evidence of execution.
- The target validator exists but no application client consumes it yet; TASK-003 must integrate it. Correct human environment/project mapping remains required.

## Known Limitations
Staging is unconfigured and unverified. The task's combined local/staging acceptance criterion stays open. No production launch eligibility policy exists. Rich optional profile fields, photo validation/ownership, real verification workflow, Auth API integration, platform moderation audit flows and peer discovery are future task work. Hosted configuration does not automatically inherit local config. No service-role application integration was added.

## Follow-up Tasks
Orchestrator: review this handoff and the fresh security review; resolve/authorize a separate staging target before completing the remaining TASK-002 criterion. Resolve the user's unanswered email/profile versus enrollment-evidence choice and exact domains before TASK-003 implements verification. Dispatch any follow-up in a fresh bounded context; this implementation task stops here.

## Documentation Updated
`LOCAL_SETUP.md`, Supabase READMEs, config README, engineering data-model/authorization/deployment/testing notes, `CURRENT_STATE.md`, `CHANGELOG.md`, `tasks/NOW.md`, TASK-002 contract/status, Proposed ADR-0009 and both handoff/review records.

## Ready for Next Task?
No automatic TASK-003 dispatch. The local foundation is verified and ready for orchestration review, but staging verification and production verification-policy decisions remain explicit dependencies. TASK-002 is not represented as fully complete.
