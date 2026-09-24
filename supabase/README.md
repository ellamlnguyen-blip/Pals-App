# Supabase identity and onboarding

All schema changes use committed migrations. TASK-002 implements universities, accounts, one current university membership per account, profile drafts, and platform role assignments. TASK-003 adds confirmation-derived membership, private photos and access gates. See `../LOCAL_SETUP.md` for local commands.

## Security contract

- `auth.users` owns email confirmation. An Auth insert provisions an active account and empty profile, ignoring user metadata.
- The trusted Auth trigger assigns membership/verification from the current confirmed email and approved exact domain allowlist. Only trusted operators may change account status, campus policy or platform roles. No client mutation API for these exists. No bulk client moderation bypass exists; a later audited workflow is required.
- Membership verification records the confirmed email. `private.has_verified_membership()` requires it still match the current confirmed Auth email, current domain allowlist, active account and active university. This implements Accepted ADR-0009 email ownership, not independent enrollment verification.
- Clients can read their own account status; active accounts can read/edit their own profile draft and read their own membership/role. Only editable profile columns have UPDATE grants. Photos additionally require verified membership and actual owned Storage objects; unverified draft edits never grant access.
- Profiles are owner-only at this foundation stage. Peer discovery requires its own privacy/block policy before access expands. A platform role never implies unrestricted direct access.
- University reference metadata is readable by active authenticated accounts; this is not cross-campus people discovery. No campus geospatial data is needed in TASK-002.
- All five tables enable RLS, all client grants are explicit, and definer helpers use an empty search path. Do not expose `private` in API schemas or grant client CREATE/privileged DML.
- The local API disables automatic exposure grants. The migrations revoke client defaults on their own tables/functions so hosted defaults cannot defeat them. Server clients use public keys and user sessions; no privileged key is wired. New migrations must explicitly review grants and RLS.

Accepted `ADR-0009` defines the exact UNC domains and badge meaning. The TASK-003 migration installs this policy and reference campus. `profiles.is_complete` remains structural; `get_access_state()` additionally requires live verification/status and an existing owned photo. Private photo readers are active verified owners only. See `docs/engineering/AUTH.md` and `AUTHORIZATION.md`. Rich optional fields and peer access remain future tasks.

## Local Hangout foundation (TASK-005)

Migration `20260922000300_hangout_foundation.sql` installs a disabled-by-default privileged switch in `private.hangout_feature_gate`. The three Hangout tables have RLS and explicit read-only client grants; all direct client DML is denied. No local seed or hosted procedure enables the switch. Only disposable local test fixtures turn it on and turn it off again. `private.hangout_create_requests` is a non-client-readable owner/request UUID ledger for retry identity.

For an explicit TASK-007 disposable-local integration test, first verify `supabase status --output json` reports `API_URL` exactly `http://127.0.0.1:54321` and that Docker container `supabase_db_pals-local` belongs to this local stack. Then a privileged local fixture may run `docker exec supabase_db_pals-local psql -U postgres -d postgres -c "update private.hangout_feature_gate set enabled=true"`. Always disable it in test cleanup with the same command using `enabled=false`; do not add enablement to seed, migrations or hosted configuration. Authenticated client sessions have no grant to the switch. Every Hangout operation requires a read-committed transaction; repeatable-read and serializable snapshots fail closed so stale readiness cannot authorize a write after waiting for a lock.

The client-facing RPC boundary is `create_hangout(p_request_id, p_title, p_starts_at, p_public_place, p_public_latitude, p_public_longitude, ...)`, `edit_hangout(p_hangout_id, p_expected_revision, p_title, p_starts_at, p_public_place, p_public_latitude, p_public_longitude, ...)`, `set_hangout_joining(p_hangout_id, p_expected_revision, p_joining_state)`, `cancel_hangout(p_hangout_id, p_expected_revision)`, `join_hangout(p_hangout_id)`, `leave_hangout(p_hangout_id)`, `remove_hangout_participant(p_hangout_id, p_account_id)` and `get_hangout_participant_state(p_hangout_id, p_account_id)`. Create accepts optional public description/end/zone, private instructions, visibility/precision/eligibility; edit accepts the same optionals and replaces both public and private details atomically. Omitted nullable fields on edit clear them, including private instructions. Create returns the Hangout UUID; edit/joining/cancel return the new revision. Read public `hangouts.revision` and the protected optional `hangout_private_locations.instructions` through their separate RLS tables. Use a fresh request UUID for each new creation intent and preserve it across retries; preserve the same normalized payload. The private retry digest encodes timestamptz values as epoch instants, so the same instant remains the same request across session time zones. SQLSTATE `40001` means a stale expected revision and the caller must reload. A changed payload under one request UUID returns a conflict without exposing the original private payload.

The database stores supplied timestamps as instants; later UI work handles America/New_York local-time disambiguation. Creation or a changed start must be within now and 366 days; end must follow start by at most seven days. This local foundation has no application flow, automatic expiry, hosted migration, block enforcement or launch authorization. See Accepted ADR-0010 and the TASK-005 contract for the full matrix.

## Disposable-local moderation review backend (TASK-017A)

Migration `20260924000100_local_moderation_review.sql` adds a separate
`private.moderation_feature_gate`, default `false`. Only a live active account
with an explicit `moderator` or `admin` platform role may use the three public
caller-bound RPCs after a disposable local fixture enables that gate. The role
does not grant a table reader; the private report, case, retry and audit tables
retain RLS and no client grants. This stage does not include sanctions, Hangout
disablement, an admin UI, or hosted use.

- `list_moderation_reports(p_after_submitted_at,p_after_id,p_limit)` returns up
  to 24 allowlisted queue rows in descending `(submitted_at,id)` order. Pass the
  last returned time and ID together for the next page. Each successful page,
  including an empty one, writes one audit event with a server request UUID and
  returned IDs/count.
- `get_moderation_report(p_report_id)` returns one allegation plus narrowly
  projected current target context, or `unavailable` if its target row is gone.
  Accepted ADR-0020 adds server-owned `case_revision` to this audited exact-ID
  detail only; an absent case row returns zero. Queue and student APIs omit it.
  Each successful opening writes one audit event. Unknown or conflicted IDs
  receive `42501` with the same neutral message.
- `transition_moderation_case(p_report_id,p_request_id,p_expected_revision,
  p_action,p_note,p_duplicate_report_id)` returns only case state and revision.
  Actions are `start_review`, `annotate`, `close_no_action`,
  `close_duplicate`, and `reopen`. Preserve the operator-scoped UUID and the
  same normalized payload for an uncertain retry. New actions require the
  current revision; a changed-key payload or stale revision is denied.

The new RPCs require READ COMMITTED. They acquire one moderation transaction
advisory lock, then the gate row, operator account `FOR SHARE` row and role row,
report row, target account or Hangout row, and finally case/retry
state. Queue/detail user targets use `FOR SHARE`; user-target case actions use
`FOR UPDATE`: a concurrent role insertion's
foreign-key key-share must wait, so an operator cannot act on a newly
privileged account from a stale negative role lookup. The functions make fresh
checks after any lock wait. A revocation that commits before those checks
denies; an already-authorized operation holding locks can commit first. Case
mutation, retry result and audit append share one transaction. Reporter and
case report foreign keys restrict deletion; audit actor/subject IDs are
retained UUIDs without cascading foreign keys.

Before hosted use, resolve retention/deletion and legal holds, operator
onboarding and MFA, appeals/escalation, and staffed response. Stage B must add
atomic sanction/closure and source authorization enforcement separately.

## Hosted procedure

A configured, authorized non-production Supabase project is required before these steps. Its Postgres major version must match local 17. Review the project name and reference against the environment inventory; never infer staging from a URL or substitute production. Use a disposable checkout dedicated to hosted operations. Current target and actual verification evidence are recorded in `docs/operations/HOSTED_ENVIRONMENT.md`.

1. Run local `pnpm db:verify` and review migrations and open ADRs.
2. With environment-scoped credentials, link **only the verified staging reference** using `pnpm exec supabase link --project-ref "$PALS_STAGING_PROJECT_REF"`.
3. Inspect `pnpm exec supabase migration list --linked`, then `pnpm exec supabase db push --linked --dry-run`.
4. Review that plan; when the staging application is authorized, run `pnpm exec supabase db push --linked`.
5. Record the applied versions, run staging-specific smoke/permission checks with authorized synthetic accounts, and document the result. Never label the local pgTAP run as staging evidence.

Do not use `db reset --linked`, `--include-seed`, or the local pgTAP fixture suite on hosted projects. Local tests intentionally assume an empty account set and privileged transactional fixture setup. TASK-003's migration provisions the accepted UNC reference/allowlist; local seed is never sent to hosted projects. Minimal hosted Auth settings are separate from local configuration. Do not push local rate limits or local-only service settings to a hosted project.

## Local People text boundary (TASK-011A)

Migration `20260922000400_people_text_directory.sql` adds a separate `private.people_feature_gate`, initialized false after every reset. It also adds private owner preferences and directional blocks with no client table grants. The public caller-session RPCs are `get_people_preference`, `set_people_preference`, `browse_people`, `get_people_detail`, `set_people_block` and `list_people_blocked_ids`. Browse pages contain at most 24 fixed text cards, ordered by normalized name and account ID. The additive `20260922000600_people_id_cursor.sql` migration supersedes the raw-name cursor behavior from `20260922000500_people_raw_name_cursor.sql`: pass only the last returned card's `account_id` as `p_after_id`, with `p_after_name` omitted. PostgreSQL looks up the cursor row under current visibility and filters, then derives its normalized name key. A cursor ID that is now hidden or no longer matches filters is unavailable; restart pagination. Detail uses a known account ID and returns only the accepted text fields. Block management returns only outbound account IDs. All peer reads, opt-in and block operations require the gate; an active owner may opt out while it is disabled. Never enable this gate outside an explicitly validated disposable local fixture. The existing Hangout gate and Hangout authorization are independent.

## Local friendship boundary (TASK-012A)

Migration `20260923000100_local_friendship.sql` installs a separate default-disabled private gate, one canonical pending/accepted pair, immutable generation, caller-scoped creation-key ledger and directional decline/cancel suppression. No private table or gate has client grants. `create_friend_request(p_target_id,p_request_id)` returns the generation UUID; retain a new UUID per creation intent across retries. `list_friendships(p_after_peer_id,p_limit)` and `get_friendship(p_peer_id)` return peer ID, generation UUID, direction and state only. Supply that generation to `accept_friend_request`, `decline_friend_request`, `cancel_friend_request` or `unfriend`. A stale generation or creation UUID cannot act on a later pair. All denials use generic unavailable errors; reload owner state before retrying an uncertain transition. Peer text requires a separate current People detail call. The existing People block RPC now deletes the pair atomically even if the friendship gate is off. These changes do not affect Hangouts.

## Disposable-local Hangout chat backend (TASK-013A)

Migration `20260923000200_local_hangout_chat.sql` adds a separate `private.hangout_chat_feature_gate`, default false. Both it and the Hangout gate must be explicitly enabled only in a validated disposable local fixture. Current ready joined members of a published campus Hangout call `send_hangout_message(p_hangout_id,p_request_id,p_body)` and `read_hangout_messages(p_hangout_id,p_after_sequence,p_limit)`. A fresh UUID creation key belongs to each composed message; preserve it and the normalized text across an uncertain retry. A changed-payload retry fails with `23505`. The read defaults to 50 ascending rows; pass the last returned `sequence` to get the next page. A caller authorized before any send gets an empty page. No client table grant, Realtime publication, hosted enablement or moderator read path is added.

Send locks the Hangout row, then both gate rows, account, Auth user, membership, campus, profile, referenced primary photo and participant row in that order using `FOR SHARE` for mutable evidence. It rechecks authorization in a fresh READ COMMITTED statement. A committed revocation before that check denies; a later revocation waits for the send transaction. The reader checks authorization in the same statement as page projection. A read already authorized before a concurrent revocation may complete, and delivered content cannot be recalled. The author ID appears only while that author is currently ready and joined; otherwise only `Former participant` appears. Left/removed members and all client roles after cancellation lose future reads, while private records remain for later safety work.

## Disposable-local direct-message backend (TASK-014A)

Migration `20260923000300_local_direct_messages.sql` adds a separate private DM gate, false after every reset. Only validated disposable local fixtures may enable it. Caller-bound RPCs are `create_dm_request(p_target_id,p_request_id,p_body)`, `transition_dm(p_peer_id,p_generation_id,p_action,p_reply_request_id,p_reply_body)`, `send_dm_message(p_peer_id,p_generation_id,p_request_id,p_body)`, `get_dm_status(p_peer_id)`, `list_dm_inbox(p_after_created_at,p_after_generation_id,p_limit)` and `read_dm_messages(p_peer_id,p_generation_id,p_after_sequence,p_limit)`. Inbox pages cap at 24 and message pages at 50. Creation and sends use caller-scoped UUID retry keys; keep the same key and normalized body after an uncertain response. A reply uses its own UUID key. The active pair has one immutable generation; terminal generations and retained messages are not client-readable. A People block terminates an active DM pair even with the DM gate off. No private DM table is granted to clients or published to Realtime. This migration changes no Hangout or Hangout-chat authorization.

## Disposable-local notification backend (TASK-015A)

Migration `20260923000400_local_notifications_social.sql` adds a separate private gate, false after every reset. Only a validated disposable local fixture may enable it. The authenticated RPCs are `get_notification_preferences()`, `set_notification_preference(p_category,p_enabled)`, `list_notifications(p_after_created_at,p_after_id,p_limit)` and `mark_notification_read(p_notification_id)`. Preferences default on for `social_requests`, `messages`, `hangout_updates` and `host_activity`; mute affects only later optional rows. Inbox pages cap at 24 and use descending server time plus ID as the cursor. An unavailable source has no event code, actor or target in the projection. The notification item is never destination authorization. Only friendship and DM source hooks are present here; no private table has client or Realtime access.
