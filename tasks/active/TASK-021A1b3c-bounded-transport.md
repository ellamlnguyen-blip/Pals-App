# B3c bounded fixture transport — authoring only

Status: independently reviewed bounded correction contract; canonical publication required before implementation dispatch.
Date: 2026-09-28. Parent B3c remains incomplete. User requested continuation of pending fixture authoring. Source27 is unchanged and unexecuted; main retains26. Exact reviewed foundation `3e9973ce573a48c9879286624b92fb2d72ca7769` contains source `17b72001c3c76d2002b320d92df32703141bb88e`.

## Concrete gap

Frozen `pilot-admission-current-safety.mjs` performs synchronous `execFileSync` without a timeout in raw SQL, two Docker target-inspection calls, Supabase status and reset. Module event-loop timers cannot bound those calls. Session close has an awaited finite failure but cannot by itself bound prior synchronous guards. Three downstream fixtures must not claim finite whole-module bounds or run until this gap is corrected and independently reviewed. This is test harness transport only, not an application authorization change.

## Required context and boundaries

Read AGENTS, parent source-safety contract, foundation/review/publication, resumption handoff, the three fixture contracts, frozen helper and their exact interface usage. Fresh bounded GPT-6 Sol medium author; Standard is app-controlled/unverifiable. Start from latest verified canonical main plus exact reviewed foundation, on a separate isolated correction branch. Keep the three downstream author branches unchanged during this correction.

Exactly three owned files:
- `supabase/tests/helpers/pilot-admission-current-safety.mjs`
- `supabase/tests/helpers/pilot-current-safety-transport.static.mjs` (offline verification only)
- `agents/handoffs/TASK-021A1b3c-BOUNDED-TRANSPORT.md`

No source/migration/baseSQL/shared fixture outcome helper/API payload/role/grant/guard weakening, other verifier/fixture edits, dependency install, target contact, preflight/start/reset/VM/container operation, hosted/provider/gate/config/force/recovery, shared queue edits, push or downstream dispatch. All target-exercising code remains unexecuted. Offline verification may launch only its own synthetic local test process in a temporary directory; no Pals binaries, socket, credentials, service ports or actual helper target functions may be invoked. Imports stay inert.

## Implementation requirements

Preserve public helper interfaces and exact fixed binary/socket/container/owner/history/current27/source-hash/origin guards. Preserve redaction and actual SQL/business diagnostics. Add explicit finite transport budgets to every external command and bound stdin/session construction and completion. Choose and record budgets appropriate for guarded metadata/query calls versus full database reset; expose test-only injection only to a separate offline transport unit, never an environment override capable of substituting a real target or weakening the production guard. No accepted runtime case can extend a budget implicitly or retry a timeout as success.

Ensure finite timeout cleanup applies only to the directly owned transient command/session. Termination must be followed by actual exit observation; synchronous APIs must document exactly what they guarantee. Never signal unknown descendants, named VM/host agent, container/service, or a process found through generic discovery. If complete owned-child exit cannot be established, report cleanup incomplete and stop. No VM force approval is inherited. Add finite PostgreSQL statement/lock/idle transaction defaults for SQL transport where necessary so disconnect of an owned Docker CLI cannot leave an unbounded server statement/transaction; retain explicit per-case stricter budgets and explain compatibility with holder/waiter observations. Do not describe client termination as proof of server cleanup; later fresh guarded census/owner checks remain mandatory after any runtime interruption.

Handle timeout/abort/spawn/nonzero/malformed output as explicit failed/uncredited evidence. Preserve partial/final command state safely without credentials or raw Auth/status output. A failed or partial reset is not a cleanup receipt and must not be followed by unreviewed recovery, target deletion or success counts. HTTP cancellation and30-second transport budget must remain effective. Owned asynchronous sessions must rollback/close and await exit within a finite bound, reporting any incomplete state honestly.

Downstream whole-module budgets must have a real process-level bound, not only timers around blocked sync operations. Provide an explicitly invoked runner or interface that can be reviewed and used by the later exclusive executor without changing test outcome meaning. If preserving the frozen sync API cannot provide the required guarantee, stop with the exact smallest interface proposal rather than redesigning every fixture or silently claiming a bound. Any additional files/interface change requires coordinator review of a narrower contract amendment before implementation.

## Offline verification and handoff

Meaningful offline checks exercise successful output, safe timeout, aborted input/owned process exit, failed spawn/nonzero and redaction. Verify imports make zero target attempts. Static audit enumerates every external call and finite budget; no skips/TODO/runtime proof. Check syntax/format/lint with existing cached tools only. Record exact local immutable SHA, changed interface/defaults/ownership semantics, unexecuted target obligations and blockers; stop for fresh independent exact-tip review. Only then may coordinator publish/merge the corrected foundation dependency into fixture branches and request final fixture/ownership review. No runtime release or TASK-021 completion follows from this correction.
