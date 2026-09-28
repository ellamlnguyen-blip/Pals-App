# TASK-021A1b3a ordinary lifecycle handoff

Status: final independent review cleared `fe4f23c5b43b4b042c3a8e8a99f38da412d4f3fa` and task branch is remotely verified. Coordinator accepts bounded code/evidence including explicit lint compatibility exception; canonical integration publication/verification and completion receipt remain pending.

Branch: `agent/TASK-021A1b3a-ordinary-lifecycle`, independent no-hardlinks clone `/private/tmp/pals-task021a1b3a-lifecycle`. Canonical contract baseline was `936b784ed2ae6965b4251fe9c6195b8f63671f2e`; coordinator documentation through `1605684bafbb20129af537ec079ef2b8c4abaea6` was reconciled conflict-free. Source was independently cleared at `9dbec14`; complete corrected fixtures at `67fc312`; subsequent narrow corrections were independently reviewed. The final migration initializer-only delta is `40a2143`; reproducible lint verifier source was `ce9b4be`, followed by the strict result-shape correction described below.

## Implementation and preserved boundary

Migration 25 adds two private ordinary-only helpers and replaces only the final six public create/edit/cancel/join/leave/set_hangout_joining bodies. Public signatures, defaults, results, ACLs, errors, body normalization, request fingerprint, revisions, private instructions, terminal states, existing cohost powers, notifications and large-Hangout safeguards remain inherited. No onboarding capability is required for an otherwise ready Hangouts caller. Shared `lock_hangout`, safety/chat helpers, retained/read/operator functions and B3b/B3c callers remain unchanged.

The private locker derives `auth.uid()` and permits only the six operations. Its prescribed TABLE result includes the locked source composite and tuple bindings; callers cannot supply actor, host, campus or readiness authority. It deduplicates actor and immutable host discovered from the locked parent. Its graph is social exclusive 16016 → pilot shared 16027 → availability/Hangouts policy → existing create request hash/own ledger only → saved/source parent UPDATE → feature gate → sorted accounts → rosters → Auth → memberships → deduplicated locked campuses → profiles → actual owned primary Storage objects → current participant/cohost → fresh tuple/source/purpose/operation checks. Required NOT FOUND denies immediately; replacement tuples cannot be accepted by a later EXISTS. Fresh checks precede conflicts, payload validation, revision disclosure, no-op/saved-ID success and mutation.

Both new helpers are VOLATILE SECURITY DEFINER with empty fixed search path and fully qualified relations. EXECUTE is revoked from PUBLIC, anon, authenticated and service_role. The fresh checker derives its caller/source and acquires no new lock edge. Stronger isolation retains exact `42501 Safety operation unavailable`; ordinary READ COMMITTED denial is exact `42501 Hangout operation not permitted`. Authorized business `40001 Stale Hangout revision`, `23505 Creation request conflict` and original `22023` input literals remain distinct from PostgreSQL aborts.

Migration 25 and child helpers are owned by this bounded stage. The guarded runtime helper requires exact `PALS_PILOT_DISPOSABLE_OWNER=TASK-021A1b3a`, DO_NOT_TRACK=1, exact Docker socket and installed25 before setup. Only the explicit prior24 upgrade lane permits known24/current25. Serial adapters retain the child acknowledgement, never switch to inherited owners, and modify only disposable copies of accepted A1a/B1/B2 test helpers. No stage25 ownership or history is silently inherited by later children.

## Executed evidence

| Check | Actual result |
| --- | --- |
| Bounded stage-adapted SQL suite | 986 assertions with completed TAP plans, no skips/TODO; passed before and after true24 upgrade |
| Post-cast six-route SQL | 61 assertions with complete plan and no skips |
| Main lifecycle races | 288 exact waits: 160 direct public route cases + 128 independently reviewed common-identity cases; 15 explicit classifications |
| Source/immutable-disable races | 23 exact waits + four impossible/allowed-state classifications |
| Bilateral block/current-membership races | 34 exact waits + one host-self impossibility classification |
| New owner/Storage/Auth crossings | Five exact successful waits + separate actual external Auth/account 40P01 cycle and rollback proof |
| New real Auth HTTP | One complete module pass; 1,087 recorded entries include setup/control, not independent races |
| Fresh A1a regressions | Both modules pass; concurrency asserts 25 exact waits |
| Fresh B1 owner/Storage regressions | Both modules pass; concurrency 59 exact waits + separate profile/Storage 40P01; real Storage HTTP final INSERT/DELETE authority-loss checks pass |
| Fresh B2 source/safety/operator regressions | Both modules pass; concurrency 14 exact waits, retained/report/operator HTTP projections preserved |
| Catalog | Exact inherited54 ABI/default/result/ACL/effective-grant checks, untouched body hashes and helper closure pass; 142 domain functions, unchanged52 tables |
| True24→only migration25 upgrade | Exact24 manifest, retained public/private/Storage values and full columns/types/defaults/ACL/RLS/policies/constraints/triggers/defaultACL snapshot preserved; off/revision1 defaults; normal reset restores25 |
| Static | Repository lint, typecheck, web/admin builds, format scope and unit49/49 pass; no dependencies installed or lockfile changes |

The new Hangout modules total 350 observed successful waits (288+23+34+5). Inherited regression waits and PostgreSQL aborts are excluded from that total. Exact holder/waiter PIDs, pg_blocking_pids membership and ungranted lock types are saved in module evidence. Denied-call census uses the holder's post-loss snapshot where the loss itself changes source state. No timeout, skip, deadlock or serialization abort is converted into a successful order.

The common identity partition uses actual new create, exact saved create and distinct cohost edit actor/immutable host through the same reviewed locker. Roster, shutdown, purpose, gate, source, powers, retry and no-op coverage remains route-specific. FK-bound account/campus/referenced-primary-object deletion is not fabricated; lawful detach/object loss and old membership/profile replacement are distinct. New create has no existing source or distinct immutable host. Terminal cancel is not reversed, immutable disables use isolated sources/reset, and cancelled leave/exact host retry retain original allowed behavior. Peer block reconciliation requires both currently joined: genuine join loss-first leaves a joined blocked peer and denies, whereas mutation-first join or joined no-op lets the peer blocker leave and preserves lawful actor operation. See FIXTURE-MAPPING for the complete actual/common/impossible partition.

Exclusive social ordering rules out the reviewed queued-manager cycle. Real profile/Storage and external Auth/account inversions remain explicit; this is not a universal deadlock-free claim. B3a direct authenticated detached-object DELETE is SQL evidence; fresh B1 exercises actual Storage HTTP final roles separately. Privileged immutable-disable race fixtures are labeled synthetic, while real report/moderator authority is separately HTTP/B2 evidence. No full historical A1c, app A2, full pilot or launch-readiness claim is made.

## Exact lint compatibility exception

The unchanged project command is `supabase db lint --local --schema public,private --level warning --fail-on warning`. It **exits 1**, not clean/pass. After the three explicit jsonb initializer casts, exactly one diagnostic remains: function `private.pilot_lock_ordinary_lifecycle`, severity `warning extra`, SQLSTATE `00000`, message `composite OUT variable "source_row" is not single argument`. No other warning/error remains. Exact stdout/stderr and exit are in LINT-EVIDENCE.json.

Independent review classified this as the structural advisory for the contract-mandated composite TABLE OUT interface, consistent with the [primary checker's author example](https://okbob.blogspot.com/2017/05/new-version-of-plpgsqlcheck.html). The interface is preserved. This is a narrow compatibility exception requiring final review acceptance, not warning suppression or a changed package threshold. Post-cast61 and catalog checks pass; earlier runtime behavior is source-equivalent under the independently cleared initializer-only delta. The reproducible verifier rejects spawn errors/signals, unexpected nonJSON stdout, any stderr outside the exact benign connection/schema lines, any extra diagnostic, or any changed function/message/severity/SQLSTATE. Its source is committed for review; it was not executed after shutdown. Actual captured lint and strict one-diagnostic assertion were executed before stop.

## Excluded attempts

- Initial main setup failed23514 before any race because source and joined host were separate fixture transactions; the production deferred constraint stayed intact and cde627c made only fixture setup atomic.
- Initial HTTP trusted detached-object delete failed existing Storage delete protection;6285913 added transaction-local trusted fixture context only.
- Main replacement follow-up expected success after an edit had advanced revision; exact authorized business stale error was retained and ad806b6 corrects the positive control's revision.
- Initial block module expected allow for genuine join after peer-first block despite no shared-current pair; d904b53 corrects the expectation/classification, preserving product reconciliation.
- Initial regression wrapper executed no inherited modules because Node's internal nested-test marker skipped files;14db837 removes only that marker from a copied child environment,03a39e6 chooses explicit TAP for strict count assertions.
- Initial standard database lint failed the three jsonb initializer warnings plus the composite structural advisory;40a2143 explicitly types the initializers, leaving the exact reviewed advisory nonzero.

Every failed runtime fixture attempt completed its guarded final reset and is excluded from module passes/counts. Initial unit48/one sandbox skip is superseded only by permitted loopback unit49/no-skip run. Static identifier/missing copied dependency issues were resolved without installs or product changes.

Final independent review of `003e1d4cc7db77b805cfb07c7d6422c198297892` cleared lifecycle source, executed evidence and cleanup, and accepted the bounded nonzero lint compatibility exception. Its only finding was verifier result-shape strictness. The source-only correction now compares the entire results array to the exact single function/issue object, rejecting nonarrays and unexpected result-level fields. Command, threshold, exit1, transport guards and captured evidence remain unchanged. No runtime restart or verifier rerun occurred; exact correction tip awaits final delta clearance.

## Disposable cleanup and remaining gates

Only previously reviewed mountless rootless UID501 `pals-task002` and six cached services were normally started, after fresh global stopped/absent/unheld preflight. No pulls, installs, new mounts/networks, recovery, hosted/config/provider operations occurred. Existing B2 dependencies were copied; telemetry stayed disabled.

Final full25 reset and zero synthetic census pass: Auth/accounts/profiles/memberships/roles/Hangouts/participants/objects empty, private synthetic evidence empty, all pilot/original gates off, availability and13 capability revisions1. Supabase stopped normally with backups enabled; no service containers remained running. The same VM stopped normally through VZ at `2026-09-27T16:39:18-04:00`. Fresh global audit finds no Pals agents, registrations, sockets, actual `disk`/`vz-efi` holders or listeners on54321/54322/54324. Historical non-hostagent limactl PID56460 remains untouched. The coordinator independently corroborated stopped VM, missing registrations/socket, unheld exact disk/EFI, empty ports and no named Pals hostagents in a separate read-only audit. CLEANUP-EVIDENCE.json contains only narrowly filtered Pals ownership outcomes.

Remaining: final independent source/evidence review including the lint compatibility exception and corrected verifier; authorized task-branch push and remote SHA verification; accepted coordinator canonical integration/shared records and verified main SHA. Do not dispatch B3b/B3c on this handoff before accepted B3a reconciliation. The child stops at this bounded stage and does not self-declare completion.

## Coordinator reviewed publication receipt

Reviewed task branch remotely verified `fe4f23c5b43b4b042c3a8e8a99f38da412d4f3fa`; see REVIEW.md for exact acceptance, lint qualification and independent cleanup. Accepted main SHA is pending the prepared integration push. No dependent implementation dispatch or completion yet.
