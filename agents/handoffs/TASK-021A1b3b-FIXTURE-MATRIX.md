# B3b exact fixture matrix and evidence limits

Prepared contract/source plan only. No fixture implemented/executed and every cell remains **uncovered** until observed reviewed evidence. IDs below define required loops, not pass counts. L1–L6 inherit B3a's accepted evidence discipline; no B3a identity-path equivalence substitutes for a new B3b action/target or immutable-host chat retry. Use isolated sources and synthetic identifiers per cell.

## Public action IDs and ready subject sets

| Action ID | Actual call | Independent ready subjects; deduplicate host actor |
| --- | --- | --- |
| RH | host remove joined or left inactive retained target | host=actor; target intentionally not ready |
| RC | co-host remove joined ready noncohost | actor, distinct immutable host, eligible target |
| P | host promote joined ready nonhost | host=actor, target |
| D | host demote retained inactive assignment | host=actor; target intentionally not ready |
| SD | joined effective co-host stepdown | actor, distinct immutable host |
| S | new joined nonhost send | actor, distinct immutable host |
| SR | exact normalized saved joined nonhost send retry | actor, distinct immutable host; independently saved message |

Run additional host-sender S/SR serial controls (subject actor=host dedup), saved mismatched and cross-actor request controls; race S/SR with distinct actor/host is mandatory. RH tests published and cancelled, joined/left target, ready and inactive target; D retained assignment is current even after target admission/account/readiness loss. RC/P targets are separate from immutable host, never a stand-in for it.

## L1 — actual-role/real Auth guard and state table

`L1.<action>.<case>` SQL and HTTP cover every action: success same-action control; absent/revoked actor/host admission; availability/config missing/off; Hangouts purpose/gate missing/off; account inactive, exact UNC evidence loss/email/domain/membership/campus mismatch; missing/incomplete profile/photo; source missing/cancelled/disabled; either host-block direction; null/malformed typed parameters; forged actor/JWT/metadata; anonymous/service/helper/private-table/raw-DML denial; unchanged seven-field ABI/defaults. Bad UUID syntax remains transport parsing error, not counted neutral function denial.

For S/SR the exact error boundary is operation-specific: missing source/caller, source-campus mismatch, source disable, actor/immutable-host current readiness/admission and Hangouts purpose/gate fail with `42501 / Hangout operation not permitted`; published-status loss, current joined loss, actor-host bilateral block, chat purpose/gate, and inherited visibility/location-precision predicates fail with `42501 / Hangout chat unavailable`. The base send guard must not use broad `can_read_hangout` in a way that masks these extra-chat cases. Social-first stronger isolation remains `42501 / Safety operation unavailable`. Fresh S/SR authority must dominate invalid body or mismatch, with the appropriate exact literal; only otherwise-authorized invalid body gets22023 and mismatched own key gets23505.

There is no `h.eligibility` column. Eligibility is create/edit input validation, outside B3b. Stored Hangout CHECK constraints prohibit unsupported visibility/location_precision; audit these as catalog invariants and impossible lawful states, not runtime loss rows. Preserve inherited predicates but do not drop constraints, fabricate unsupported stored rows or race them.

Management authorized null/stale revision returns exact business40001; actor/host/role/eligible-target loss combined with stale revision must give neutral42501. Target null/self/host/absent/removed/left/blocked/cohost outcomes match operation (RH joined/left retained success; RC joined-ready-only; P joined-ready unassigned-only; D retained assignment inactive success). Host cannot leave/stepdown, co-host cannot promote/demote/cancel, no transfer or cancelled expansion. RC target loss dominates stale revision explicitly. RH cancellation timestamp/revision-only invariant verified.

`L1.S/SR.payload`: null request/body, Unicode trim/boundaries1/2000/2001/empty; exact/mismatched key, cross-actor and cross-source same-key isolation. Normalized equivalent retry returns original UUID/sequence/body/server time/mine/author fields; census no conversation/sequence/message/ledger/inbox change. Denied retry after actor/host admission/readiness, source disable/cancel, membership leave/remove or host block returns no saved body. Mismatch after current authority uses23505; lost authority+mismatch/invalidbody returns neutral gate/source literal first. Concurrent same-key duplicate sends commit one message/sequence/ledger/event and exact original return.

## L2 — action policy/roster gates, no representative substitution

All required two-order waits identified `L2.<action>.<loss>.<subject>.<order>` where order `loss-first` / `operation-first`:

- Every RH/RC/P/D/SD/S/SR: availability off/missing, Hangouts capability off/missing, Hangout gate off/missing (six route cells each).
- S and SR additionally chat capability off/missing and chat gate off/missing (four each); caller Hangouts or actor readiness alone cannot imply chat purpose.
- Every action×each ready subject in table: roster revoke and roster delete/missing. Actual approved manager must hold social/exclusive pilot; demonstrate waiter and fresh outcome. No arbitrary privileged roster bypass labeled manager proof.
- Source disable both orders for every action; published→cancel loss for RC/P/D/SD/S/SR. RH cancelled positive control retains lawful management. Host may cancel after operation-first; never reverse terminal cancel to manufacture a second order.

Loss-first surviving READ COMMITTED call denies; operation-first may commit then later reader reflects loss. Census uses holder's own post-loss snapshot if loss itself transitions source. Actual allowed same-action call precedes every negative race to prove eligible starting fixture. IDs expand literally per row; no skipped/timeouts/aborts count as coverage.

## L3 — actual acquired evidence and state races

`L3.<action>.<subject>.<loss>.<order>` retains every conceptual action×its deduplicated table ready subjects×both orders, executing the conditional actual/common partition below for lawful identity changes: account status; Auth email/domain/confirmed loss; membership verification/email/campus change; campus active/slug/allowlist loss; profile complete/required fields/primary null loss; lawful primary detach then owned object loss; required membership/profile absence and old tuple delete/replacement. Exact loss IDs are suspended, banned, email_confirmation, email_domain, email_equality, membership_verification, membership_delete, membership_campus, campus_active, campus_unc, campus_allowlist, profile_missing, profile_required, profile_primary, object_detach_delete, membership_delete_replace and profile_delete_replace. These are17 distinct dimensions; no generic identity label counts multiple dimensions. The accompanying JSON expands all action/subject/order cells. Campus-level cells may share the same campus tuple across subjects; only the conditional mappings below apply and every action/cell ID remains recorded. Required tuple missing must fail at original lookup before a fresh replacement EXISTS can authorize. Replacement must not implicitly restore assignment/participation.

Promotion target and RC target have their **own** admission/readiness waits through actual public calls; S/SR immutable-host readiness waits remain separately required. RH/D lawful inactive target controls must succeed and prove no target-ready lock/guard was added. Actual state IDs `L3.state.<writer>.<action>.<order>`:

| Loss writer | Required actual action pair / outcome |
| --- | --- |
| target leaves/is removed | P and RC deny loss-first joined loss; operation-first may stand then departure clears assignment if promoted |
| cohost actor demoted/stepdown | RC and SD and inherited cohost edit/joining deny current role loss; S/SR stay allowed if still joined (role-only loss is a positive control) |
| actor leaves/removal/block departure | SD/RC/cohost edit/joining/S/SR deny once joined/assignment lost; trigger assignment deletion atomic |
| target cohost assignment introduced | RC denies target now-cohost; P denies already-assigned; source parent/social serialize approved writer |
| required assignment disappears | D/SD/RC deny missing actual assignment; role guard never accepts an unlocked replacement |
| bilateral actor-host block | RC/SD/S/SR both block directions and both orders; host-self actions impossible |
| bilateral actor-target block | RC both directions/orders; host-target P both directions/orders; RH/D controls preserve existing retained authority |
| participant row deletion/replacement | lawful joined actor/target and retained RH target deletion-first deny immediate absence; FK-bound assignment cascade recorded; no missing lookup rescued by later row |

Observe actual public departure/management/block writers wherever authority permits; privileged synthetic disable/tuple deletion separately labeled, with real moderator/report authority inherited B2 regression. Role-loss versus edit tests invoke accepted B3a actual public edit/joining, not helper-only assertion. Stronger isolation actual eligible calls every action (including SR) deny social-first literal with no state/body/receipt delta.

## L4 — missing-key serialization

For every action/ready subject: observed roster-delete/approved exclusive-prefix → actual call waiter → absence denial. Then fresh already-absent call denies serially; actual authorized manager activation revision0 admits a later eligible same action (restore only readiness needed, never auto-role/participation). Absence-first call normally denies before activation can queue: **no claim** of two activation wait orders. Policy missing rows deny and management must not recreate missing configuration. This is accepted absence partition, not phantom row lock proof.

## L5 — crossings, results and disclosure census

Exact holder/waiter PID, pg_blocking_pids membership and ungranted pg_locks before release for every successful-order cell. Parent social contenders and direct evidence row waits labeled distinctly. After outcome compare participant/assignment/parent revision+timestamp/private instructions/conversation next_sequence/messages/ledgers/optional notifications; denied SR returns no body. Every attempted40P01/40001 safe abort has separate full rollback census and no successful wait-order credit.

Actual B1 owner-primary assignment versus P target or RC target; actual authenticated direct detached-object DELETE versus S/SR immutable host, both row-wait orders; inherited B1 real Storage HTTP final service INSERT/authenticated DELETE still rerun separately. Profile↔Storage inversion remains accepted safe abort. Existing-source account/Auth deletion is FK-limited: do not fabricate successful source-account deletion to reproduce new-create crossing; inherited B3a lawful unsourced Auth/account safe-abort evidence remains scoped regression only. External trusted maintenance/account writers cannot be asserted universally deadlock-free. New required unproved edge keeps incomplete; propose bounded source/target/crossing fixture split if size exceeds reviewable stage.

## L6 — catalog/upgrade/regressions/static/cleanup

New guarded26 modules, all fresh adapted A1a/B1/B2/B3a modules serially; the required existing suite list is fixed below; assertion counts are fixture-source review outputs, never historical pass counts. TAP one completed plan/count>0, no notok/SKIP/TODO; Node counts must show actual modules (nested marker cleared only in copied child environment) and zero skipped/failures. Permission observations use actual roles or real Auth; privileged setup never permission assertion. Source equivalence does not upgrade existing25 results into26 evidence.

Required stage-adapted existing sources (all retain B3b owner and26 guard; originals stay unchanged): `database/private_pilot_admission_authority.test.sql`, `pilot-admission-owner.test.sql`, `pilot-admission-source-safety.test.sql`, `pilot-admission-lifecycle.test.sql`; A1a `pilot-admission-authority-http.integration.mjs` and `pilot-admission-authority-concurrency.integration.mjs`; B1 `pilot-admission-owner-http.integration.mjs` and `pilot-admission-owner-concurrency.integration.mjs`; B2 `pilot-admission-source-safety-http.integration.mjs` and `pilot-admission-source-safety-concurrency.integration.mjs`; B3a `pilot-admission-lifecycle-http.integration.mjs`, `pilot-admission-lifecycle-concurrency.integration.mjs`, `pilot-lifecycle-source-races.integration.mjs`, `pilot-lifecycle-block-membership-races.integration.mjs`, `pilot-lifecycle-crossings.integration.mjs`, and `pilot-lifecycle-regressions.integration.mjs` without accidentally duplicating or omitting its six embedded prior-stage modules. Run accepted catalog/lint verifier logic under newly narrowed26 owner/history wrapper; do not change public source to accommodate copied tests. New26 upgrade is distinct from old A1a true20/B3a true24 history verifiers, which may not be run through permissive wildcard history.

True25→only26 upgrade preserves full25 manifest, all retained public/private/Storage values and exact tables/columns/types/defaults/ACL/RLS/policies/constraints/triggers/defaultACL. Verify inherited62 scoped catalog ABI/default/result/ACL/path, all current domain functions, untouched body hashes, two new private helper closure, five replacements only and removed overload absence. Standard lint exact inherited one-diagnostic exception only; new extra warning is failure. Full historical A1c and app A2 remain explicitly uncovered even if static succeeds. Final reset26 zero/off/rev1 census and normal owned service/VM stop + independent ownership verification are completion evidence.

## Impossible and uncovered partitions

Currently **all B3b execution cells are uncovered**: this is docs-only. These intentional impossible cells must be enumerated with IDs in executor matrix, not hidden by skips: distinct actor/host for host-only RH/P/D; required-ready target for RH/D; host-self block; successful referenced-primary object deletion; deletion of source-bound account/Auth/campus while live FKs prevent it; reversed terminal cancel/disable; absent roster phantom row lock; replacement assignment after failed required lookup; role-only demotion revoking still-joined send; exact retry producing a new notification/sequence; cross-actor key returning original sender body. Lawful alternatives above require individual proof. Snapshot read already in flight/preissued bearer/delivered bytes recall remains outside accepted guarantee.

## Conditional partition and bounded execution

The coordinator accepts a **conditional** common L3 partition: actual identity paths RH.host_actor; RC.actor/host/target; P.target; S.host; SR.actor/host (8×17×2=272). Map D.host_actor and P.host_actor to RH.host_actor; SD.actor/host to RC.actor/host; S.actor to SR.actor through the same send RPC unbranched pre-ledger prefix. All152 L2 cells remain actual, giving424 planned actual cells plus170 explicit common-equivalent conceptual cells,594 unique conceptual cases total. Every cell is unobserved/uncovered, not pass evidence. Promotion/RC targets stay distinct; S/SR hosts stay distinct. Equivalence is gated by independent implementation SOURCE review confirming one identical unbranched identity acquisition and final acquired-tuple checks before any public branch; per-route SQL and real Auth guard-dominance assertions stay actual. Any divergence restores the mapped actual races. This partition reduces only L3 identity executions; all L1/L2/L4/source/role/block/retry/state/crossing/isolation/upgrade/catalog/regression/cleanup requirements remain.

| Conceptual path | Actual representative (same17 losses×both orders) |
| --- | --- |
| D.host_actor | RH.host_actor |
| P.host_actor | RH.host_actor |
| SD.actor | RC.actor |
| SD.host | RC.host |
| S.actor | SR.actor; same send RPC unbranched pre-ledger prefix |

Original594 unpartitioned executions remain historical planning provenance. Current424 actual cells use bounded separate modules and serial exclusive runtime, with170 explicit mapped conceptual cases conditionally source-reviewed; no silent deletion or skipped pass. Independent fixture review must verify all representative IDs and guard assertions before runtime release.

Assignment-terminal races also require classification: SD/D-first may remove the assignment such that a later competing SD/D is lawfully denied, rather than demonstrating a second committed deletion. Record operation-first actual outcome and terminal no-op/denial separately; do not fabricate assignment restoration or count a failed loss writer as successful committed-loss proof.
