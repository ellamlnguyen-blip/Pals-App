# TASK-021A1b3c state fixture — static author handoff

2026-09-28. **Local authoring checkpoint only; all24 state cells unexecuted. Stop for fresh independent exact-tip review. Parent incomplete.**

Branch `agent/TASK-021A1b3c-state-fixture`; checkout `/private/tmp/pals-task021-resume-state`. Coordinator supplied clean prepared baseline `79fd728abc6753cf6ce5595a2c93ba13f2176180`: canonical main `7b8078d07d5a90cd7ad40e9d4255c3f3bb803146` plus exact reviewed/published policy `cad9a596b76dac2f0dbe2b51908ca2899ba6c915` and bounded transport `404edfabae9ede3a80aa4350937302b989339c20`; reviewed foundation `3e9973ce573a48c9879286624b92fb2d72ca7769` and unexecuted source `17b72001c3c76d2002b320d92df32703141bb88e` are included. State implementation commit **`93533ff5a400aa3e801abaff5eade3dabac532ca`**. This handoff is a following documentation-only commit; the final clean immutable tip is returned separately for review. Author did not independently contact remote or publish this checkpoint.

Standing author model GPT-6 Sol medium. Standard speed remains app-controlled/unverified. Read AGENTS, assigned state contract, STATE-CONTRACT-REVIEW, parent current-source-safety contract, Accepted ADR-0026/0027 and relevant engineering specifications, source/review, LOCK-GRAPH/FIXTURE-MATRIX/MATRIX and reviewed foundation/policy/transport references; inspected actual final27 current functions and final disable/cancel/preference/block writer signatures, authority and effects. No source correction or permission change was made.

## Owned scope and interface

Exactly two files versus prepared baseline:

- `supabase/tests/pilot-admission-current-safety-state-races.integration.mjs`
- `agents/handoffs/TASK-021A1b3c-STATE-FIXTURE.md`

Only the state module was added. It imports reviewed policy helpers inertly for independent case setup, precise full54 expectations/differences, positive current operations, exact diagnostics/redaction and owned cleanup. It does not invoke or register the policy suite. Existing shared helpers, source, SQL, other fixtures, configurations and shared records are unchanged.

Exports: literal `stateManifest`; pure/static `verifyStateManifest`, `stateWriter`, `expectedLaterLane`; target-exercising authored `narrowPurpose`, `prepareCompanion`, `assertWriterDelta`, `assertOperation`, `statePrecheck`, `stateDenied`, `postLoss`, `observeStateRace`; unconditional `requireReviewedStateRelease` and blocked `runStateFixtures`. Imports do not contact targets or register a test. Direct module entry registers only its own Node test, whose first action is the same unconditional precontact refusal. Exported helpers are authoring interfaces, not independently released runtime entrypoints.

`runStateFixtures` refuses before matrix processing, target guard, clean census, setup, sessions or reset. State is **not** in the reviewed runner allowlist. Bounded transport supplies individual reviewed command/session limits, but this module has no finite whole-module release claim: synchronous calls can block its event loop, the Node test timeout is not an independent supervisor, and bounded failure delivery/final adoption require separate review. No environment flag or argument bypass was added.

## Literal24 allocation

The frozen literal objects compare exactly, including route/loss/order/partition/status/outcome classification, to canonical `MATRIX.json` L5 cells. No computed coverage mapping, skips, retries or failed/abort credit:

- `L5.CH.source_disable.loss-first`
- `L5.CH.source_disable.operation-first`
- `L5.CH.source_cancel.loss-first`
- `L5.CH.source_cancel.operation-first`
- `L5.CH.actor_host_block_outbound.loss-first`
- `L5.CH.actor_host_block_outbound.operation-first`
- `L5.CH.actor_host_block_inbound.loss-first`
- `L5.CH.actor_host_block_inbound.operation-first`
- `L5.CP.peer_opt_out.loss-first`
- `L5.CP.peer_opt_out.operation-first`
- `L5.CP.peer_preference_delete.loss-first`
- `L5.CP.peer_preference_delete.operation-first`
- `L5.CP.actor_peer_block_outbound.loss-first`
- `L5.CP.actor_peer_block_outbound.operation-first`
- `L5.CP.actor_peer_block_inbound.loss-first`
- `L5.CP.actor_peer_block_inbound.operation-first`
- `L5.CB.peer_opt_out.loss-first`
- `L5.CB.peer_opt_out.operation-first`
- `L5.CB.peer_preference_delete.loss-first`
- `L5.CB.peer_preference_delete.operation-first`
- `L5.CB.actor_peer_block_outbound.loss-first`
- `L5.CB.actor_peer_block_outbound.operation-first`
- `L5.CB.actor_peer_block_inbound.loss-first`
- `L5.CB.actor_peer_block_inbound.operation-first`

## Source-backed preparation and results

Every cell has a fresh deterministic actor/host/peer/manager/source/request set and separately derived operator/post-loss request IDs. Initial independent setup uses reviewed policy full54 rowsets and explicitly qualified Storage identity/owner/bucket/name/UUID/time expectations. Remaining provider fields are named opaque immutable before-value anchors only: **provider-default-source verification remains false**, with no mutated expected delta or authorization result derived from those anchors. Source-owned setup fields and unrelated Auth/Storage/private rows cannot become an adopted baseline.

A separately verified full54 narrowing delta leaves only Hangouts CH or People CP/CB purpose/source gate enabled, with onboarding and all other deferred purposes/gates off. Actor preference alternates absent/loss-first or false/operation-first. Every cell then performs an actual current route rollback positive with exact stored current provenance/report+request or intentional new-block delta, bounded generated timestamps/UUIDs, exact rolled-back full54 state and no retained evidence. CH is a distinct nonparticipant actor plus immutable joined host/published source. CP/CB contain none of seven retained peer proofs and no shared joined parent.

Companion preparation follows that positive control and is separately verified across all54 tables:

- CH block: enable People capability/gate alongside Hangouts; outbound actor→host opts in host; inbound host→actor opts in actor.
- CP/CB inbound peer→actor: opt in actor, including CB operation-first. Actor→peer block is not caller-owned retained authority for the peer writer. Peer opt-in remains intact.
- CH disable: privileged synthetic active independent manager-account admin role, moderation gate, fresh source-bound Hangout report and `in_review` revision1 case; reporter/operator/immutable host are distinct. Operator remains unadmitted/incomplete. Synthetic operator preparation has zero permission-regression credit; the loss writer itself invokes the actual public authority.
- Other cells add no companion rows.

After companion preparation every cell rechecks current classification/no retained proof and repeats the current rollback/provenance control before the race. The original absent/false positive establishes the tested route's permission; companion actor opt-in and CH People purpose are separately disclosed writer eligibility, never a new current-route actor requirement. No retained proof or direct visibility bypass is manufactured.

Actual authenticated writers use `apply_hangout_moderation_action(report,request,1,reason)` → exact `{case_state:'closed',revision:2,target_disabled:true}`, immutable host `cancel_hangout(source,1)` → `2`, peer `set_people_preference(false)` → `false`, and direction-correct `set_safety_block(target,true)` → `true`. Only peer preference DELETE is privileged synthetic maintenance, with exact count1. The disable action passes real report-only role/gate/account/conflict/report/parent/case/CAS prerequisites; no direct disable/cancel/block substitute, disabled constraints or terminal restoration.

Exact writer expectations cover all54 tables, including immutable disable, closed case, request fingerprint and all audit columns; cancel status/joining/revision/bounded updated timestamp; preference update/delete; direction-correct block insert or lawful duplicate repair. All source/host/participant/private-location/cohost/chat/relationship/provenance/notification/report/request/rate and unrelated operator records outside specified deltas stay exact. Block produces no automatic report/notification. Disable preserves its report and unrelated source revision/status; cancellation preserves participant/private instructions and emits no notification with deferred notification gates off. Expected data is source-backed; complete observed snapshots are not expected outcomes.

## Observed order and lane requirements (authored, not executed)

`observeStateRace` constructs both owned sessions inside try, starts only the real operation or writer in the holder transaction and waits for its actual HELD marker. The waiter invokes the other real public call or precise synthetic DELETE. Before release, it requires distinct actual PIDs, `pg_blocking_pids(waiter)` including holder and actual ungranted `pg_locks`. Relation names are explicitly namespace-qualified through catalog lookup, independent of connection search_path. No generic lock preamble manufactures contention.

- Disable/cancel/block: exact exclusive two-int social `(16016,1)` advisory (`objsubid=2`) before pilot/lane selection. This is social serialization, **zero lower-current-tuple or frozen-lane no-upgrade/no-fallback credit**.
- Public opt-out: peer account UPDATE→preference UPSERT. Operation-first writer waits on the current peer account SHARE; loss-first current account SHARE waits on the writer's account UPDATE. This is the account conflict before preference acquisition, not a preference lookup wait.
- Synthetic preference DELETE: actual required preference tuple/transaction conflict in either order. Tuple/transaction observations and holder relation locks are required; advisory-only evidence is rejected.

Successful holder/writer closes, exact results/diagnostic arrays, explicit post-COMMIT markers and full54 expected snapshots are mandatory. Operation-first proves successful original current call and commit before writer commit. Loss-first proves the actual writer's held loss snapshot and commit before the waiting call finishes. Exact `42501` neutral error is the sole denied current diagnostic; psql ON_ERROR_STOP exit3/null signal is required and RESULT/SNAPSHOT output, receipt/body/title/target, abort/timeout diagnostics are excluded. Fresh state denial controls use their own exact-diagnostic owned sessions rather than first-error substring acceptance.

A later CP/CB owned outbound block is explicitly verified as the sole retained proof and exact `owned_block` provenance/ref. CP report or CB repair may lawfully succeed; it is retained credit only, never current denial or selected-current upgrade. CH remains current/nonparticipant and denied after all source/actor-host losses. CP/CB inbound-only block remains current denial absent other evidence. CB operation-first's own intentional block supplies retained recovery after any loss. Where the independent loss survives, explicit authenticated outbound unblock has an exact separate delta, proves none of seven retained proofs and supplies a fresh current denial. Outbound actor-block cells are not artificially unblocked to invent a loss that no longer exists. Terminal CH sources are fresh per order and never reversed.

## Failure and cleanup behavior

Failure emits literal cell/phase, available actual locks (or safely qualified unavailable observation), exact diagnostics, available public/writer result, setup qualification, held snapshot, committed full54 census/summary and precise field differences before cleanup, with credential redaction and zero successful-order credit. Raw Auth/provider credentials/session transcripts are withheld. Failed holder, 40P01/40001, timeout and transport interruption cannot become a successful order. After proven owned exits, recognized database abort/timeout paths check exact full54 rollback against initial state or the proven lawful holder commit; rollback mismatches retain original error and emit separate differences without credit.

Owned close failures preserve original errors, append separate cleanup diagnostics and forbid reset. Normal fully observed exits use guarded full27 resets; immutable reports/audits/ledgers are not selectively deleted. Guarded reset failure is incomplete, preserves original error and permits no invented retry/force/recovery. All cleanup behavior is authored only: no target session, reset, server rollback, census or stopped/unheld receipt was exercised here.

## Offline evidence

Existing cached `/private/tmp/pals-task024/node_modules` only; no install.

- Syntax check passes.
- Cached Prettier **API** format and equality check pass. Cached CLI initially returned without formatting, so API formatting/check is the recorded evidence.
- Cached narrow ESLint `no-unused-vars`/`no-undef` check passes: zero errors/warnings.
- Whitespace diff check passes.
- Inert module import plus exported blocked suite with child-process/fetch traps: **0 target attempts**; exact literal24 canonical comparison and24 writer/direction/later-lane examples pass.
- Pure offline VM examples invoke only expectation logic with synthetic54-table snapshots and deterministic mocked fingerprint output: **6** valid writer outcomes (new/retained duplicate block, opt-out, delete, cancel, disable) accepted; **34** deliberate wrong-result/extra-row/disable-case-audit-ledger changes rejected; **0 target attempts**, **0 runtime credit**. VM uses cached local module source; no real helper target function is invoked.

These checks do not prove PostgreSQL compilation, real public writer eligibility, exact live lock locations/orders, permissions/privacy, Auth/HTTP, report rate behavior, provider defaults, reset/server cleanup, catalog/lint, true26→only27 preservation or any matrix pass. No target API/DB/CLI/Pals binary/socket/preflight/start/reset/service/VM/container/hosted/provider/config operation, install, force/unknown signal, push, shared queue/state change, dependent dispatch or task completion occurred.

## Stop and remaining gates

Freeze the final clean two-file tip for fresh independent Sol-medium review. Coordinator owns publication and shared records. Source27/fixture work remain task-only/unexecuted; canonical main retains26 code. State runner allowlist/adoption and bounded failure delivery, combined exact fixture/ownership review, exclusive serial release, actual all24 observations/full54 evidence and broader required source/regression/upgrade/catalog/lint/security/cleanup review, reviewed task publication and independently remote-verified accepted integration remain. B3c/B3/A1c/A2/TASK-021 remain incomplete. No hosted/pilot-ready, finite module runtime, parent completion or product successor claim.
