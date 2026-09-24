# Handoff — TASK-017B1 account enforcement backend
Date: 2026-09-24
Agent: GPT-6 Sol medium task agent (the dispatch tool does not expose a Standard-speed verification field)
Branch/worktree: `agent/TASK-017B1-account-enforcement` at `/private/tmp/pals-task-017b1-account-enforcement`
Task branch and pushed commit SHA: pending this handoff commit and independent remote verification; coordinator receives the receipt separately.
Integrated `main` commit SHA: pending independent review and coordinator integration.
Main status-record path and last published milestone: coordinator-owned `tasks/NOW.md`, `tasks/BACKLOG.md`, `docs/operations/CURRENT_STATE.md`, `CHANGELOG.md`; B1 accepted planning baseline `64f4e0b48a58a61dbcbc52e798261866376ee5fa`.
Outstanding review/integration blockers: fresh exact-tip security review and canonical-main integration remain with coordinator.

## Outcome

Implemented only disposable-local account suspension, ban and reinstatement under Accepted ADR-0019/0021. One caller-bound RPC acts on the exact user target stored in an `in_review` report case. Moderator/admin may suspend an active nonoperator; only admin may ban or reinstate. The RPC requires the expected case revision, a trimmed 1–2000-code-point reason, live gate/actor/role/conflict/target-role checks, and READ COMMITTED. It returns case state/revision and resulting account status. No UI, Hangout disable, hosted operation or role-assignment path was added.

## Files Changed

- `supabase/migrations/20260924000200_local_account_enforcement.sql`: sanction schema, exact report/subject and case/sanction references, immutable evidence, RPC, and write-boundary status locks.
- `supabase/tests/database/local_account_enforcement.test.sql`: actual-role sanction and lifecycle assertions.
- `supabase/tests/account-enforcement-concurrency.integration.mjs`: observed-wait races.
- `supabase/tests/moderation-http.integration.mjs`: real local Auth/PostgREST/Storage sanction and source checks; append-only fixture cleanup adjustment.
- `supabase/tests/moderation-concurrency.integration.mjs`: append-only fixture cleanup adjustment.
- `supabase/README.md`, `supabase/tests/README.md`: backend boundary and local test instructions.

## Behavior / Architecture Impact

The new private sanction record has an exact `(report_id,'user',subject_id)` foreign key to the stored report, restrictive subject/operator references, and one operator-scoped request UUID. Cases link `(sanction_id,report_id)` restrictively when disposition is `action_taken`. Reopen clears only that current link; the sanction and audit remain. A new audit event records exact subject/type, current membership campus when present, operator, request, reason, old/new account status, old/new case state and revision. It copies no allegation, profile, photo, message or location. Audit and sanction rows reject update/delete; raw client/service-role table readers remain absent. Failed actions roll back all writes.

Lock order is Stage A's moderation advisory lock, moderation gate, actor account/role, stored report, target account `FOR UPDATE`, operator request UUID, case, then target membership `FOR SHARE` and writes. Target role insertion's account foreign-key key-share conflicts with the target account lock. Gate/actor/role/report/target state are freshly rechecked after waits. The B1 retry fingerprint has a nonhex `account:` prefix, so a Stage A case-transition UUID can never be replayed as enforcement, or vice versa. Exact B1 replay rechecks the current action-specific role; a demoted admin loses ban/reinstatement replay.

Student source inventory and live enforcement:

| Surface | Current denial and sanction ordering |
| --- | --- |
| `accounts` own status | Owner-only RLS deliberately remains readable while restricted. Other account fields gain no reader. |
| Universities, memberships, profiles, platform-role owner reads | Existing RLS uses live active account; restricted callers lose these reads except own `accounts`. Direct profile UPDATE now locks the caller account `FOR SHARE` and rechecks active after its profile-row wait. |
| Profile-photo Storage | Existing owner/verified RLS denies new reads, uploads, deletes and signed URL issuance after sanction. New INSERT/DELETE trigger locks/rechecks active account after object contention. App photo route already checks live access on uncached requests. A preissued signed URL remains a bearer URL until local expiry per ADR-0021. |
| People | Directory RPCs use current ready/active evidence. Preference write already locks owner account `FOR UPDATE`; block management locks actor account `FOR SHARE`. Old `set_people_block` delegates to the same safety boundary. |
| Friendship | Create/accept lock both accounts and readiness evidence through commit. Existing active checks cover reads. B1 private friendship UPDATE/DELETE trigger adds a held actor account lock for decline/cancel/unfriend cleanup writes. |
| DM | Create, accept/reply and send lock live actor/peer evidence. Inbox/message readers require active actor and current source rights. B1 private pair UPDATE/DELETE trigger closes the cleanup transition gap for ignore/withdraw/close. |
| Hangout, roster, private instructions, Calendar, chat | Direct REST RLS and caller-bound RPCs use ready active account and Hangout/source gates. Hangout and chat writers already hold actor account evidence `FOR SHARE` after shared safety/Hangout locks. Calendar reads the same Hangout source. Retained-ID recovery uses active account and a safety gate. |
| Notifications | Inbox and preference readers require active owner and source projection. B1 private preference INSERT/UPDATE and read-marker UPDATE triggers hold/recheck active caller through commit, including after row waits. Notification source emission remains optional and does not recreate missed events. |
| Report intake and web routes | Report intake and safety block management already lock/recheck actor account. Web API/server actions use caller sessions and source RPCs; no service-role proxy or browser state grants a bypass. |

Reinstatement sets only `accounts.status='active'`; it does not rebuild friendships, DMs, attendance, disabled Hangouts or missed notifications. All moderation/source gates remain default-off.

## Tests / Verification

- Multiple clean disposable local resets applied the migration. Schema lint found no warnings. All 14 SQL pgTAP files streamed serially to local Postgres passed (733 assertions total) because the official `supabase test db` wrapper cannot mount this `/private/tmp` checkout into the Lima VM.
- B1 actual-role SQL checks passed: gate/role/revision/state/retry matrix, cross-RPC UUID collision, linked case/sanction/audit, immutable/restrictive deletion, reopen history, reinstatement and restricted notification marker.
- Real Auth/PostgREST/Storage B1 test passed serially: anon/student/forged metadata denial inherited from Stage A, moderator suspend, admin ban, demoted-admin replay denial, own status view, source RPC/direct REST denial, private table denial, new photo read/sign denial, and a preissued bearer URL working after sanction then expiring locally. Stage A moderation concurrency passed serially as a regression.
- B1 overlapping-session test observed lock waits for gate-first, operator-role-first and target-role-first denial; sanction-first profile/photo delete/notification preference/friendship cleanup denial; and each corresponding source-first commit followed by sanction. It checked final status, evidence row and audit counts.
- Existing local Auth/Storage, profile and People concurrency, friendship HTTP/concurrency, DM HTTP/concurrency/revocation, Hangout concurrency, chat HTTP/concurrency, notification HTTP/concurrency and Hangout notification HTTP/concurrency, report HTTP/concurrency, and global block HTTP/concurrency suites passed serially. The `auth-storage.integration.mjs` suite also covers source HTTP checks through its helper imports.
- Direct Prettier, ESLint, 37 Node tests and both app TypeScript checks passed with borrowed local dependency links. Formal `pnpm check` stopped before checks at its borrowed `node_modules` purge guard (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Both direct Next builds were attempted but Turbopack rejected the borrowed app `node_modules` symlinks pointing outside the checkout. Coordinator can run archive-based direct builds with copied module directories.

## Decisions

Accepted ADR-0021 bounds photo revocation: B1 denies new authenticated photo access immediately after committed sanction, while a preissued signed URL remains usable until its local expiration. No immediate bearer-token revocation or object deletion was added.

## Known Limitations

This is disposable-local evidence only. Hosted retention/deletion/legal hold, operator onboarding/MFA, appeals, staffed response, CDN behavior and immediate preissued-photo URL revocation remain outside B1. The existing Stage A audit's append-only rule requires a final disposable database reset to remove HTTP test fixtures. No production data was touched.

## Follow-up Tasks

Fresh exact-tip independent security review, coordinator integration and remote verification of canonical main. TASK-017B2 independently owns Hangout disable and its source effects. TASK-017C owns admin UI.

## Documentation Updated

`supabase/README.md` and `supabase/tests/README.md` describe the B1 boundary and local verification. Coordinator owns shared queue/state/changelog updates.

## Ready for Next Task?

The independently remote-verified exact task tip passed fresh security review with no P0/P1 blocker. Reviewed code merged at `c82d42e3939624516a3a19aa7fd2ce3dc60787e9`; canonical publication and remote verification remain before B2 can depend on B1.

Remote verification for both refs: task-branch receipt follows after commit/push; canonical-main receipt follows only after independent review and coordinator integration.

## Coordinator review and integration receipt

Task branch `agent/TASK-017B1-account-enforcement` was independently remote-verified at `79ffee1244a62a7af3bad9bd8bd2c9815efe4e0f`. Fresh read-only exact-tip review found no concrete P0/P1 security or contract blocker; see `agents/handoffs/TASK-017B1-REVIEW.md`. The coordinator merged the reviewed tip onto current main in `c82d42e3939624516a3a19aa7fd2ce3dc60787e9`.

The formal `pnpm check` wrapper remained blocked by its borrowed dependency guard. The agent passed direct Prettier, ESLint, 37 Node tests and both TypeScript checks. The coordinator also ran both Next production builds successfully from an isolated archive of the exact task tip with copied dependency directories. The task agent's database and Auth/Storage evidence and cleanup are recorded above. Canonical remote SHA follows publication.
