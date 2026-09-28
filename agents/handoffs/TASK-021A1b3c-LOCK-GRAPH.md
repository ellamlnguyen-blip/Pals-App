# B3c final26 graph and proposed current-safety boundary

Documentation proposal against `f156dcd08590577a62aaafe01c460b920ee58aed`. All 144 final function bodies match inherited accepted B3b26 catalog byte-for-byte. No runtime evidence added. [Inventory](TASK-021A1b3c-SOURCE-INVENTORY.json) includes final signatures/ACLs/callers/locks, 34 source trigger bindings and 39 function writers; fresh27 catalog must independently close the graph.

## Actual final26 paths

Social is **exclusive** `pg_advisory_xact_lock(16016,1)`, despite historical “shared mutation lock” prose. Pilot reader is shared `(16027,1)`; manager writer is exclusive. Pair is one-int hash of sorted UUID text with `:` seed0, separate advisory namespace. Distinguish application serialization from SHARE row mode.

| Lane | Actual final26 acquisition and authority |
| --- | --- |
| Report exact retry | social → normalized original-input fingerprint → own ledger → safety gate SHARE → actor account SHARE → fresh safety/active/fingerprint → own receipt/time; no target lookup/pilot |
| Retained report | social → nonlocking retained classification → safety gate SHARE → actor account SHARE → fresh exact provenance; no pair/ordinary parent/pilot/source gate/readiness requirement |
| Current People report | social → nonretained classification → pair → safety gate SHARE → legacy visible locker: People gate SHARE, actor/peer sequential identity/profile/object/preference SHARE → current People purpose/visibility → clock/rate/report/ledger |
| Current Hangout report | social → nonretained classification → parent UPDATE → safety gate SHARE → Hangout gate SHARE → legacy actor-only identity/profile/object locker → current Hangout purpose/readability → clock/rate/report/ledger |
| All block/unblock | social → shape/active → pair → full joined shared parent UUIDs UPDATE → safety gate SHARE → actor account SHARE; true uses retained evidence or legacy visible locker/current People check, inserts block, tears down all overlaps, deletes friendship/blocks DM; false deletes own direction only |
| Global block reconciliation | social → effects derived from one initial shared-roster snapshot → sorted parents UPDATE → immutable overlap → deterministic participant update → clear effects; independent of all feature/pilot gates |

Final26 current lockers do not acquire pilot policy/roster or independent immutable host evidence through commit. Shared retained/read helpers cannot absorb ordinary purpose/admission requirements. The source change is only current-specific branches/private helper(s); all existing helper hashes outside two public replacements must remain exact.

## Proposed conditional graph

Lane is selected under held social before any lower lock. New report ledger hit exits early through exact replay. New nonretained host mode denies. Retained classification is freshly revalidated after waits; disappearing provenance denies without fallback. Current classification is freshly checked before its new prefix, and cannot later upgrade internally to retained authority. Approved social writers cannot interleave; direct trusted maintenance still requires actual tuple revalidation.

Current CH: social → shared pilot → availability SHARE → `hangouts` capability SHARE → Hangout UPDATE (derive immutable host/campus) → safety gate SHARE → Hangout gate SHARE → phased complete actor+host evidence → fresh held bindings/readability → report clock/rate/insert/ledger.

Current CP: social → shared pilot → availability SHARE → `people` capability SHARE → pair advisory → safety gate SHARE → People gate SHARE → phased complete actor+peer evidence → peer preference SHARE → fresh held bindings/visibility → clock/rate/insert/ledger.

Current CB: social → shared pilot → availability SHARE → `people` capability SHARE → pair advisory → full fresh shared-parent UUIDs UPDATE → safety gate SHARE → People gate SHARE → phased complete actor+peer evidence → peer preference SHARE → fresh held bindings/visibility → original block/teardown/relationship writes. A current-only pair with no retained evidence has no joined shared parent: such a parent itself proves retained overlap. Keep the full discovery/locking step anyway; multi-parent teardown is exercised in retained lane. Do not label this impossible current-only multi-parent condition an observed current path.

Phases: all deduplicated subjects sorted UUID accounts SHARE → roster SHARE → Auth SHARE → membership SHARE/capture exact campus → distinct captured campus UUIDs SHARE → profiles sorted subject SHARE/capture exact primary → objects sorted `(path,subject)` SHARE/capture exact object ID → required peer preference SHARE (People only). Every required lookup immediately denies; bindings hold all exact subject/campus/path/object values through commit. Source campus/immutable host derive only from locked source, People campus from locked actor membership. All source/purpose/identity checks are fresh after the last wait and bound to held tuples. CB completes visibility guard before its intentional block insertion; downstream teardown cannot mistake that write for an external visibility loss.

Retained block/unblock retain social→pair→sorted full parents→safety/actor; retained report/replay remain social→safety/actor→fresh retained evidence/own receipt. No pilot/onboarding/capability locks even when config/roster absent/off. Source report data never comes from retained resolution unless that lane was selected before lower locks. Immutable host resolution for retained `hangout_host` is private and returns only opaque receipt/time.

## Combined accepted lanes and actual writers

| Actual writer/helper | Concrete edges; B3c allocation |
| --- | --- |
| B3a six lifecycle RPCs | social → shared pilot/availability/Hangouts → create request if used → locked saved/current parent → Hangout gate → actor/host held readiness → state/private place/request/optional hooks; fresh rerun all B3a route/retry/no-op/source/state modules |
| B3b five co-host/chat RPCs | social → shared pilot/availability/sorted actual capabilities → parent UPDATE → Hangout/chat gates → phased full actor/host/eligible target identity → required participants/assignments → fresh binding guards → state or conversation/request/message; fresh all B3b policy/identity/absence/retry/state/crossing modules |
| A1a approved management | social → exclusive pilot → deterministic availability/capabilities → sorted accounts → manager/roster → activation Auth/member/campus → live authority/CAS → immutable audit/request; actual authenticated manager races for revoke/shutdown/purpose; deletion is privileged maintenance using exact prefix, not manager API permission |
| authenticated profile UPDATE | profile row → alphabetical `bump_profile_revision` → `pals_require_active_profile_write` (B1 shared pilot/availability/onboarding/account/roster/Auth/member/campus) → `validate_profile_photos` (sorted referenced primary/extra Storage KEY SHARE); no social after row |
| real Storage INSERT/final UPSERT | Storage1.72.1 current-object advisory/row → `pals_require_active_photo_insert` B1 live evidence; exact storage-admin/service-role final INSERT owner derived server-side; final authenticated/service-role UPDATE rejected by `pals_reject_client_profile_photo_update`; rerun real B1 final-write and raw-insert winner controls |
| authenticated Storage DELETE | object row → alphabetical `pals_protect_profile_photo_delete` (profile UPDATE, referenced primary/extra denial) → `pals_require_active_photo_delete` B1 shared evidence; no social; service-role DELETE denies |
| `set_people_preference(false)` | peer account UPDATE → preference UPSERT, no social/pilot; CP/CB acquire peer account SHARE and peer preference SHARE, real opt-out writer waits; actor preference remains irrelevant |
| Auth provisioning/email sync/delete | Auth row first → `provision_account` account/profile or `sync_confirmed_membership` membership/campus → FK cascade on delete; no social/pilot convention; actual lawful Auth email/confirmation waits and inherited B1 real Auth regression |
| trusted account/member/campus/config/role/preference DML | actual UPDATE/DELETE/INSERT row/FK locks; never assume advisor participation. Exact current identity waits use privileged synthetic holder with actual authenticated public RPC waiter; source-bound destructive FK cases impossible, not inferred waits |
| ordinary/retained friendship and DM writers | social→request/pair→legacy gates/evidence→private relationships/messages; exact final function/writer inventory retained. B3c block deletes friendship and blocks active DM generations regardless deferred gates. Full deferred RPC/policy closure A1c, exact teardown regression B3c |
| participant transitions | accepted lifecycle/management/block/reconciliation social and parent before participant UPDATE; `clear_departing_cohost` AFTER state change deletes assignment when departing; FK deletion cascades recorded; no late row→social trigger |
| source disable | `apply_hangout_moderation_action` social before moderation → report SHARE → parent UPDATE → request/case → immutable disable/audit; CH loss uses actual report-bound admin action plus synthetic direct maintenance labeled separately |
| account moderation | independent moderation advisory→gate→actor account→role→target account UPDATE→request/case/membership→sanction/status/audit; no pilot; current account SHARE conflicts directly |

Each of the 39 source DML functions appears in JSON with exact relations, final file and stage allocation; trigger-only NEW/OLD mutation functions and all 34 bindings are inventoried separately. Unchanged functions not in current acquisition closure are catalog-preserved, with named accepted-stage regression or explicitly A1c full historical closure; preservation is not invented runtime coverage. Trusted provider operations are separately listed because they are not SQL function call edges. Final27 reviewer must compare all144 inherited bodies except the two planned replacements, exact trigger definitions/order, direct writers and new helper closure; any missing writer/edge remains open.

## Independent operators and mandatory FOUND repair

Final migration24 `moderation_actor`: advisory `(17017,1)` → mandatory moderation gate SHARE **immediate NOT FOUND** → actor account SHARE **immediate NOT FOUND** → platform role SHARE **immediate NOT FOUND** → fresh gate/account/role. Five direct callers exactly: list_moderation_reports, get_moderation_report, transition_moderation_case, apply_account_moderation_action, apply_hangout_moderation_action. Report/target context is report-only; optional absent target is not a missing mandatory authority fix. Account action target UPDATE prevents role FK insert race; Hangout action takes social first, never after parent/moderation rows. Exact action retry rechecks authority/conflicts before bound old receipt. No pilot requirement. Fresh repair regression must exercise all five callers, retries and admin downgrade; inherited repair cannot be called unaddressed or omitted from combined acceptance.

## Crossings and safe outcomes

Ordinary/current shared pilot→profile/object crosses B1 direct profile/object→shared pilot. Shared modes are compatible; approved manager cannot queue exclusive pilot behind a current lane while current owns social, because management must first obtain that social key. This rules out that specific manufactured three-party manager cycle, not universal deadlock freedom. Profile→Storage KEY SHARE vs Storage DELETE→profile UPDATE remains a real inversion. Ordinary account→Auth can cross provider Auth→account/member; peer preference account→preference directly participates without social. Moderator actor/target account, membership/campus and trusted external orders can conflict.

Observed successful two-order waits need exact holder/waiter PID, `pg_blocking_pids` membership and ungranted `pg_locks`, then expected outcome and complete census. 40P01/40001 aborts are separate full rollback partitions, never a success order or silently swallowed retry. Current stronger-isolation eligible calls deny at social before mutation/receipt. Required-row deletion/replacement: missing locked SELECT must deny immediately; later fresh eligible replacement may pass a new call, never resurrect old authorization. No absent-row phantom lock claim, no impossible role/account/referenced-primary deletion/replacement fixture.

Already-running snapshots, preissued bearer URLs and delivered data are not recalled. No new photo/source reader, provider policy, hosted deployment or cleanup force authority is created.
