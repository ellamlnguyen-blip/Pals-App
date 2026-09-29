// Static core/setup and audited-read primitives. No target authority or transport.
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
const SOURCE_HASHES = Object.freeze({
  http: "9d2f624e3d3c4c6e9a647ceb5d586fbfb4e7262ff5dbffe700de393823034a1e",
  concurrency:
    "c2ae514f3342785f5441b9ee5389d9a14e363b22f9bb77cc7d3f0843f2d461e7",
  found: "cbe2d4dac9ea239d8bfd0191098dadeb20eeec93528d5300911a94292deaddbc",
  source27: "9dafa05e597928533ba51f100d29bc5c64c248d6f33f4a134b1f058d8d7640e8",
  provider: "bc149f083a52daf9b53de7d61b946d5d40bc676df6314377f682d14ca21c3269",
});
// Literal source column manifest, reconciled independently against all CREATE /
// ADD COLUMN statements through27. Auth intentionally projects only six fields.
const SCHEMA = freeze({
  "auth.users": [
    "id",
    "email",
    "email_confirmed_at",
    "deleted_at",
    "raw_user_meta_data",
    "raw_app_meta_data",
  ],
  "private.account_sanctions": [
    "id",
    "report_id",
    "subject_type",
    "subject_id",
    "operator_id",
    "request_id",
    "action",
    "previous_status",
    "new_status",
    "subject_campus_id",
    "reason",
    "occurred_at",
  ],
  "private.attendance_answers": [
    "hangout_id",
    "account_id",
    "attended",
    "revision",
    "answered_at",
  ],
  "private.attendance_feature_gate": ["singleton", "enabled"],
  "private.dm_feature_gate": ["singleton", "enabled"],
  "private.dm_messages": [
    "id",
    "generation_id",
    "sequence",
    "author_id",
    "body",
    "created_at",
  ],
  "private.dm_pairs": [
    "generation_id",
    "low_id",
    "high_id",
    "initiator_id",
    "campus_id",
    "state",
    "created_at",
    "next_sequence",
  ],
  "private.dm_retries": [
    "actor_id",
    "request_id",
    "kind",
    "target_id",
    "generation_id",
    "message_id",
    "fingerprint",
  ],
  "private.dm_suppression": ["initiator_id", "recipient_id"],
  "private.friendship_create_requests": [
    "actor_id",
    "request_id",
    "target_id",
    "generation_id",
  ],
  "private.friendship_feature_gate": ["singleton", "enabled"],
  "private.friendship_suppression": ["requester_id", "recipient_id"],
  "private.friendships": [
    "low_id",
    "high_id",
    "requester_id",
    "campus_id",
    "generation_id",
    "state",
  ],
  "private.hangout_chat_feature_gate": ["singleton", "enabled"],
  "private.hangout_cohosts": ["hangout_id", "account_id", "assigned_at"],
  "private.hangout_conversations": ["id", "hangout_id", "next_sequence"],
  "private.hangout_create_requests": [
    "host_id",
    "request_id",
    "hangout_id",
    "payload_fingerprint",
  ],
  "private.hangout_disables": [
    "id",
    "report_id",
    "subject_type",
    "hangout_id",
    "operator_id",
    "request_id",
    "previous_disabled",
    "new_disabled",
    "subject_campus_id",
    "reason",
    "occurred_at",
  ],
  "private.hangout_feature_gate": ["singleton", "enabled"],
  "private.hangout_message_requests": [
    "hangout_id",
    "author_id",
    "request_id",
    "message_id",
    "payload_fingerprint",
  ],
  "private.hangout_messages": [
    "id",
    "conversation_id",
    "author_id",
    "sequence",
    "body",
    "created_at",
  ],
  "private.hangout_peer_provenance": ["hangout_id", "low_id", "high_id"],
  "private.large_hangout_feature_gate": [
    "singleton",
    "enabled",
    "ranking_epoch",
  ],
  "private.large_hangout_signals": [
    "hangout_id",
    "policy_version",
    "threshold_value",
    "observed_at",
  ],
  "private.moderation_audit": [
    "id",
    "occurred_at",
    "operator_id",
    "action",
    "report_id",
    "subject_target_type",
    "subject_target_id",
    "subject_campus_id",
    "request_id",
    "previous_state",
    "new_state",
    "previous_revision",
    "new_revision",
    "reason",
    "duplicate_report_id",
    "page_report_ids",
    "page_count",
    "sanction_id",
    "previous_account_status",
    "new_account_status",
    "hangout_disable_id",
    "previous_hangout_disabled",
    "new_hangout_disabled",
  ],
  "private.moderation_cases": [
    "report_id",
    "state",
    "revision",
    "note",
    "disposition",
    "duplicate_report_id",
    "sanction_id",
    "hangout_disable_id",
  ],
  "private.moderation_feature_gate": ["singleton", "enabled"],
  "private.moderation_requests": [
    "operator_id",
    "request_id",
    "fingerprint",
    "report_id",
    "result_state",
    "result_revision",
  ],
  "private.notification_feature_gate": ["singleton", "enabled"],
  "private.notification_items": [
    "id",
    "recipient_id",
    "source_kind",
    "source_id",
    "target_id",
    "event_code",
    "actor_id",
    "created_at",
    "read_at",
  ],
  "private.notification_preferences": ["recipient_id", "category", "enabled"],
  "private.people_blocks": ["blocker_id", "blocked_id"],
  "private.people_feature_gate": ["singleton", "enabled"],
  "private.people_preferences": ["account_id", "opted_in"],
  "private.pilot_account_admission": [
    "account_id",
    "state",
    "revision",
    "created_at",
    "updated_at",
  ],
  "private.pilot_admission_managers": [
    "account_id",
    "state",
    "revision",
    "created_at",
    "updated_at",
  ],
  "private.pilot_availability": [
    "singleton",
    "enabled",
    "revision",
    "created_at",
    "updated_at",
  ],
  "private.pilot_capabilities": [
    "key",
    "enabled",
    "revision",
    "created_at",
    "updated_at",
  ],
  "private.pilot_management_audit": [
    "id",
    "actor_id",
    "operation",
    "target_id",
    "policy_key",
    "previous_value",
    "new_value",
    "previous_revision",
    "new_revision",
    "reason",
    "request_id",
    "occurred_at",
  ],
  "private.pilot_management_requests": [
    "actor_id",
    "request_id",
    "fingerprint",
    "result_value",
    "result_revision",
    "audit_id",
  ],
  "private.pilot_manager_audit": [
    "id",
    "account_id",
    "executor_session_user",
    "executor_original_role",
    "executor_backend_pid",
    "previous_state",
    "new_state",
    "previous_revision",
    "new_revision",
    "reason",
    "request_id",
    "occurred_at",
  ],
  "private.safety_feature_gate": ["singleton", "enabled"],
  "private.safety_reconciliation_effects": [
    "hangout_id",
    "account_id",
    "effect",
  ],
  "private.safety_report_requests": [
    "reporter_id",
    "request_id",
    "input_fingerprint",
    "report_id",
  ],
  "private.safety_reports": [
    "id",
    "submitted_at",
    "reporter_id",
    "target_type",
    "target_id",
    "category",
    "narrative",
    "provenance_kind",
    "provenance_ref_id",
  ],
  "public.accounts": ["id", "status", "created_at"],
  "public.hangout_participants": [
    "hangout_id",
    "account_id",
    "state",
    "joined_at",
    "left_at",
    "removed_at",
    "updated_at",
  ],
  "public.hangout_private_locations": [
    "hangout_id",
    "instructions",
    "updated_at",
  ],
  "public.hangouts": [
    "id",
    "university_id",
    "host_id",
    "title",
    "description",
    "starts_at",
    "ends_at",
    "status",
    "joining_state",
    "visibility",
    "public_place",
    "public_latitude",
    "public_longitude",
    "campus_zone",
    "location_precision",
    "revision",
    "created_at",
    "updated_at",
  ],
  "public.platform_roles": ["user_id", "role", "created_at"],
  "public.profiles": [
    "user_id",
    "real_name",
    "graduation_year",
    "major",
    "bio",
    "primary_photo_path",
    "is_complete",
    "created_at",
    "interests",
    "down_to_do",
    "favorite_music",
    "favorite_foods",
    "weird_fact",
    "prompts",
    "instagram",
    "additional_photo_paths",
    "revision",
  ],
  "public.universities": [
    "id",
    "slug",
    "name",
    "active",
    "allowed_email_domains",
    "created_at",
  ],
  "public.university_memberships": [
    "user_id",
    "university_id",
    "verified_at",
    "verification_email",
    "created_at",
  ],
  "storage.objects": [
    "id",
    "bucket_id",
    "name",
    "owner",
    "created_at",
    "updated_at",
    "last_accessed_at",
    "metadata",
    "path_tokens",
    "version",
    "owner_id",
    "user_metadata",
    "archived_at",
    "is_delete_marker",
    "is_versioned",
  ],
});
const TABLES = Object.freeze(Object.keys(SCHEMA));
const HTTP_IDS = Object.freeze([
  "MODHTTP.signup-four",
  "MODHTTP.gate-off",
  "MODHTTP.metadata-forgery",
  "MODHTTP.anonymous",
  "MODHTTP.private-rest.moderation_cases",
  "MODHTTP.private-rest.moderation_audit",
  "MODHTTP.private-rest.safety_reports",
  "MODHTTP.queue-projection",
  "MODHTTP.conflict.self-filed.detail",
  "MODHTTP.conflict.self-filed.start-review",
  "MODHTTP.conflict.self-target.detail",
  "MODHTTP.conflict.self-target.start-review",
  "MODHTTP.conflict.own-hangout.detail",
  "MODHTTP.conflict.own-hangout.start-review",
  "MODHTTP.detail-projection",
  "MODHTTP.start-review",
  "MODHTTP.second-operator-detail",
  "MODHTTP.annotate",
  "MODHTTP.stale-second-operator",
  "MODHTTP.refresh-and-audit",
  "MODHTTP.actor-suspended-retry",
  "MODHTTP.actor-banned.detail",
  "MODHTTP.actor-banned.retry",
  "MODHTTP.gate-off-retry",
  "MODHTTP.account-action.nonoperator",
  "MODHTTP.account-action.moderator-ban",
  "MODHTTP.account-action.suspend",
  "MODHTTP.account-action.normalized-retry",
  "MODHTTP.account-action.changed-retry",
  "MODHTTP.account-enforcement.access-state",
  "MODHTTP.account-enforcement.own-status",
  "MODHTTP.account-enforcement.profile",
  "MODHTTP.account-enforcement.hangouts",
  "MODHTTP.account-enforcement.retained-ids",
  "MODHTTP.account-enforcement.report",
  "MODHTTP.private-sanction-rest",
  "MODHTTP.reopen",
  "MODHTTP.admin-ban",
  "MODHTTP.admin-downgrade-retry",
]);
const RACES = Object.freeze([
  "gate_first",
  "read_first",
  "role_first",
  "role_read_first",
  "account_first",
  "account_read_first",
  "target_role_first",
  "case_first",
  "two_operators",
  "same_key",
  "membership_delete_first",
  "action_before_membership_delete",
  "current_report_first",
  "detail_first",
  "block_first",
]);
const PHASES = Object.freeze([
  "setup",
  "before",
  "holder",
  "waiter",
  "after",
  "rollback",
]);
const CAPABILITIES = Object.freeze([
  "onboarding",
  "hangouts",
  "hangout_chat",
  "calendar",
  "people",
  "friendship",
  "dm",
  "notifications",
  "attendance",
  "optional_profile",
  "extra_photos",
  "analytics",
  "large_hangout_safeguards",
]);
const snapshots = new WeakMap(),
  operations = new WeakMap(),
  sources = new WeakMap();
const results = new WeakMap(),
  plans = new WeakMap();
const clone = (v) => structuredClone(v);
const hash = (v) => createHash("sha256").update(v).digest("hex");
const check = (v) => {
  if (!v) throw new Error("Moderation model unavailable");
};
const equal = (a, b) => check(isDeepStrictEqual(a, b));
function freeze(v) {
  if (v && typeof v === "object") {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}
function opaque(map, value) {
  const handle = Object.freeze(Object.create(null));
  map.set(handle, value);
  return handle;
}
function own(map, handle) {
  check(map.has(handle));
  return map.get(handle);
}
function keys(v, names) {
  check(v && typeof v === "object" && !Array.isArray(v));
  equal(Object.keys(v).sort(), names.slice().sort());
  check(Object.getOwnPropertySymbols(v).length === 0);
  for (const k of names)
    check(Object.hasOwn(Object.getOwnPropertyDescriptor(v, k), "value"));
}
function ownJson(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number") {
    check(Number.isFinite(value));
    return;
  }
  check(value && typeof value === "object" && !seen.has(value));
  seen.add(value);
  check(
    Array.isArray(value) ||
      [Object.prototype, null].includes(Object.getPrototypeOf(value)),
  );
  check(Object.getOwnPropertySymbols(value).length === 0);
  for (const key of Object.keys(value)) {
    const property = Object.getOwnPropertyDescriptor(value, key);
    check(Object.hasOwn(property, "value"));
    ownJson(property.value, seen);
  }
  if (Array.isArray(value)) check(Object.keys(value).length === value.length);
  seen.delete(value);
}
function snapshot(raw) {
  ownJson(raw);
  keys(raw, TABLES);
  for (const t of TABLES) {
    check(Array.isArray(raw[t]));
    for (const row of raw[t]) keys(row, SCHEMA[t]);
    check(new Set(raw[t].map((r) => JSON.stringify(r))).size === raw[t].length);
  }
  return opaque(snapshots, freeze(clone(raw)));
}
function preciseTime(v) {
  check(typeof v === "string");
  const match =
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(
      v,
    );
  check(match);
  const [year, month, day] = match[1].split("-").map(Number);
  const [hour, minute, second] = match[2].split(":").map(Number);
  check(
    month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= new Date(Date.UTC(year, month, 0)).getUTCDate(),
  );
  check(hour <= 23 && minute <= 59 && second <= 59);
  const ms = Date.parse(`${match[1]}T${match[2]}${match[4]}`);
  check(Number.isFinite(ms));
  return BigInt(ms) * 1000n + BigInt((match[3] ?? "").padEnd(6, "0"));
}
function window(start, end) {
  const low = preciseTime(start),
    high = preciseTime(end);
  check(low <= high && high - low <= 120_000_000n);
  return freeze({ low, high });
}
function bindTime(kind, value, bounds) {
  check(["transaction_timestamp", "clock_timestamp"].includes(kind));
  const time = preciseTime(value);
  check(time >= bounds.low && time <= bounds.high);
  return value; // exact original string remains private; never millisecond-normalized
}
function bindUuid(kind, value, before, used) {
  check(["database_uuid", "go_uuid_v4", "client_uuid_v4"].includes(kind));
  check(
    typeof value === "string" &&
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value),
  );
  if (["go_uuid_v4", "client_uuid_v4"].includes(kind))
    check(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        value,
      ),
    );
  check(!used.has(value));
  for (const table of TABLES)
    for (const row of before[table]) check(!Object.values(row).includes(value));
  used.add(value);
  return value;
}
// Only immutable reviewed bytes can support a source candidate. This handle
// carries SOURCE ONLY classification; it is never a target/config/catalog receipt.
function sourceCandidate(bytes) {
  check(Buffer.isBuffer(bytes) && hash(bytes) === SOURCE_HASHES.provider);
  const asset = JSON.parse(bytes.toString("utf8"));
  equal(asset.qualification, {
    classification: "source_model_only",
    author_source_reconciliation: "passed",
    source_model_verified: false,
    independent_review: "pending",
    target_provenance_verified: false,
    runtime_credit: 0,
    permission_credit: 0,
    installed_catalog_verified: false,
    effective_configuration_verified: false,
    source_to_binary_verified: false,
    note: "Source model verified may be recognized only by a separate exact-asset independent review receipt; this inert file neither mints nor accepts runtime authority.",
  });
  equal(
    asset.storage.candidate_catalog.ordered_columns.map((c) => c.name),
    SCHEMA["storage.objects"],
  );
  equal(
    asset.auth.candidate_projection.ordered_columns.map((c) => c.name),
    SCHEMA["auth.users"],
  );
  check(
    asset.storage.candidate_catalog.ordered_columns[0].default_kind ===
      "database_uuid",
  );
  check(
    asset.auth.fixed_real_signup_plan.required_branch.mailer_autoconfirm ===
      false,
  );
  return opaque(
    sources,
    freeze({
      classification: "source-only",
      assetHash: SOURCE_HASHES.provider,
    }),
  );
}
const SQL_IDS = freeze({
  actor: "52000000-0000-4000-8000-000000000001",
  reporter: "52000000-0000-4000-8000-000000000002",
  target: "52000000-0000-4000-8000-000000000003",
  second: "52000000-0000-4000-8000-000000000004",
  report: "52000000-0000-4000-8002-000000000001",
  report2: "52000000-0000-4000-8002-000000000002",
  report3: "52000000-0000-4000-8002-000000000004",
  hangoutReport: "52000000-0000-4000-8002-000000000003",
  hangout: "52000000-0000-4000-8004-000000000001",
});
const SQL_SUBJECTS = Object.freeze(["actor", "reporter", "target", "second"]);
const SETUP_IDS = Object.freeze([
  "sql-auth-four",
  "http-signup-one",
  "http-confirm-one",
  "initial-roles",
  "initial-reports",
  "initial-hangout",
  "moderation-enable",
  "ordinary-shutdown",
  "actor-suspend",
  "actor-ban",
  "actor-restore",
  "moderation-disable",
  "actor-role-delete",
  "actor-role-restore",
  "target-role-insert",
  "target-role-delete",
  "second-downgrade",
  "target-membership-delete",
  "target-membership-restore",
]);
export const setupModelPlans = freeze(
  Object.fromEntries(
    SETUP_IDS.map((id) => [
      id,
      opaque(plans, freeze({ id, family: "core-setup", sourceOnly: true })),
    ]),
  ),
);
// Fixed source primitives only. Sequence/transport admission is separately
// unavailable even when its audited read component has a lawful model.
const READ_IDS = Object.freeze([
  "queue",
  "detail",
  "second-detail",
  "refresh-detail",
  "gate-off.queue",
  "nonoperator.queue",
  "nonoperator.detail",
  "anonymous.queue",
  "private-rest.moderation_cases",
  "private-rest.moderation_audit",
  "private-rest.safety_reports",
  "conflict.self-filed.detail",
  "conflict.self-filed.start-review",
  "conflict.self-target.detail",
  "conflict.self-target.start-review",
  "conflict.own-hangout.detail",
  "conflict.own-hangout.start-review",
]);
const READ_COMPONENTS = freeze({
  queue: "MODHTTP.queue-projection",
  detail: "MODHTTP.detail-projection",
  "second-detail": "MODHTTP.second-operator-detail",
  "refresh-detail": "MODHTTP.refresh-and-audit",
  "gate-off.queue": "MODHTTP.gate-off",
  "nonoperator.queue": "MODHTTP.metadata-forgery",
  "nonoperator.detail": "MODHTTP.metadata-forgery",
  "anonymous.queue": "MODHTTP.anonymous",
  ...Object.fromEntries(
    READ_IDS.filter(
      (id) => id.startsWith("private-rest.") || id.startsWith("conflict."),
    ).map((id) => [id, `MODHTTP.${id}`]),
  ),
});
export const readModelPlans = freeze(
  Object.fromEntries(
    READ_IDS.map((id) => [
      id,
      opaque(plans, freeze({ id, family: "audited-reads", sourceOnly: true })),
    ]),
  ),
);
// Finite source operations. Request UUIDs are private observations, never a
// caller-selected action/revision/model. SQL keys below are literal originals.
const TRANSITIONS = freeze({
  "http.start": ["actor", "report", null, 0, "start_review", null],
  "http.replay": ["actor", "report", null, 0, "start_review", null],
  "http.start-changed-retry": [
    "actor",
    "report",
    null,
    1,
    "start_review",
    null,
  ],
  "http.start-changed-action-retry": [
    "actor",
    "report",
    null,
    0,
    "annotate",
    "Reviewed evidence",
  ],
  "http.annotate": [
    "actor",
    "report",
    null,
    1,
    "annotate",
    "Reviewed evidence",
  ],
  "http.annotate-normalized-replay": [
    "actor",
    "report",
    null,
    1,
    "annotate",
    "  Reviewed evidence  ",
  ],
  "http.annotate-changed-body-retry": [
    "actor",
    "report",
    null,
    1,
    "annotate",
    "Stale second review",
  ],
  "http.stale": [
    "second",
    "report",
    null,
    1,
    "annotate",
    "Stale second review",
  ],
  "http.reopen": ["second", "report", null, 3, "reopen", "Further review"],
  "http.suspended-retry": ["actor", "report", null, 0, "start_review", null],
  "http.banned-retry": ["actor", "report", null, 0, "start_review", null],
  "http.gate-retry": ["actor", "report", null, 0, "start_review", null],
  "race.target-role": [
    "actor",
    "report",
    "52000000-0000-4000-8003-000000000001",
    0,
    "start_review",
    null,
  ],
  "race.case": [
    "actor",
    "report",
    "52000000-0000-4000-8003-000000000002",
    0,
    "start_review",
    null,
  ],
  "race.case-replay-veto": [
    "actor",
    "report",
    "52000000-0000-4000-8003-000000000002",
    0,
    "start_review",
    null,
  ],
  "race.first-operator": [
    "actor",
    "report2",
    "52000000-0000-4000-8003-000000000003",
    0,
    "start_review",
    null,
  ],
  "race.second-operator": [
    "second",
    "report2",
    "52000000-0000-4000-8003-000000000004",
    0,
    "start_review",
    null,
  ],
  "race.same-key-first": [
    "actor",
    "report3",
    "52000000-0000-4000-8003-000000000007",
    0,
    "start_review",
    null,
  ],
  "race.same-key-replay": [
    "actor",
    "report3",
    "52000000-0000-4000-8003-000000000007",
    0,
    "start_review",
    null,
  ],
  "race.no-campus": [
    "actor",
    "report2",
    "52000000-0000-4000-8003-000000000008",
    1,
    "annotate",
    "Campus unavailable",
  ],
  "race.current-campus": [
    "actor",
    "report2",
    "52000000-0000-4000-8003-000000000009",
    2,
    "annotate",
    "Current campus",
  ],
});
const LOSS_READS = freeze({
  "race.gate-detail": "gate",
  "race.role-detail": "role",
  "race.account-detail": "suspended",
  "http.banned-detail": "banned",
});
export const transitionModelPlans = freeze(
  Object.fromEntries(
    [
      ...Object.keys(TRANSITIONS),
      ...Object.keys(LOSS_READS),
      "race.detail-count",
    ].map((id) => [
      id,
      opaque(plans, freeze({ id, family: "transitions", sourceOnly: true })),
    ]),
  ),
);
// Each sequence is verified at every commit boundary. Restoration/serial guards
// are explicit source steps, not inferred target waits or successful transports.
const RACE_STEPS = freeze({
  gate_first: ["moderation-disable", "race.gate-detail", "moderation-enable"],
  read_first: ["race.detail-count", "moderation-disable", "moderation-enable"],
  role_first: ["actor-role-delete", "race.role-detail", "actor-role-restore"],
  role_read_first: [
    "race.detail-count",
    "actor-role-delete",
    "race.role-detail",
    "actor-role-restore",
  ],
  account_first: ["actor-suspend", "race.account-detail", "actor-restore"],
  account_read_first: [
    "race.detail-count",
    "actor-suspend",
    "race.account-detail",
    "actor-restore",
  ],
  target_role_first: [
    "target-role-insert",
    "race.target-role",
    "target-role-delete",
  ],
  case_first: [
    "race.case",
    "target-role-insert",
    "race.case-replay-veto",
    "target-role-delete",
  ],
  two_operators: ["race.first-operator", "race.second-operator"],
  same_key: ["race.same-key-first", "race.same-key-replay"],
  membership_delete_first: [
    "target-membership-delete",
    "race.no-campus",
    "target-membership-restore",
  ],
  action_before_membership_delete: [
    "race.current-campus",
    "target-membership-delete",
    "target-membership-restore",
  ],
});
const HTTP_TRANSITION_STEPS = freeze({
  "MODHTTP.start-review": ["http.start", "http.replay"],
  "MODHTTP.second-operator-detail": ["second-detail"],
  "MODHTTP.annotate": ["http.annotate"],
  "MODHTTP.stale-second-operator": ["http.stale"],
  "MODHTTP.refresh-and-audit": ["refresh-detail"],
  "MODHTTP.actor-suspended-retry": ["actor-suspend", "http.suspended-retry"],
  "MODHTTP.actor-banned.detail": ["actor-ban", "http.banned-detail"],
  "MODHTTP.actor-banned.retry": ["http.banned-retry"],
  "MODHTTP.gate-off-retry": [
    "actor-restore",
    "moderation-disable",
    "http.gate-retry",
  ],
});
const sequences = new WeakMap();
export const raceModelPlans = freeze(
  Object.fromEntries(
    Object.keys(RACE_STEPS).map((id) => [
      id,
      opaque(
        plans,
        freeze({ id, family: "first-twelve-races", sourceOnly: true }),
      ),
    ]),
  ),
);
// c2a finite source order. Signup is a described unavailable prerequisite,
// never an observation that can obtain original case/pass or JWT authority.
const PRE_SANCTION_ID = "pre-sanction-prefix";
const PRE_SANCTION_LABELS = freeze(HTTP_IDS.slice(0, 24));
const PRE_SANCTION_STEPS = freeze([
  "initial-roles",
  "initial-reports",
  "initial-hangout",
  "gate-off.queue",
  "nonoperator.detail.before",
  "nonoperator.queue.before",
  "anonymous.queue",
  "private-rest.moderation_cases",
  "private-rest.moderation_audit",
  "private-rest.safety_reports",
  "moderation-enable",
  "nonoperator.detail.after",
  "nonoperator.queue.after",
  "queue",
  "audit.before-conflict",
  "conflict.self-filed.detail",
  "conflict.self-filed.start-review",
  "conflict.self-target.detail",
  "conflict.self-target.start-review",
  "conflict.own-hangout.detail",
  "conflict.own-hangout.start-review",
  "audit.after-conflict",
  "detail",
  "http.start",
  "http.replay",
  "second-detail",
  "http.annotate",
  "audit.before-stale",
  "http.stale",
  "audit.after-stale",
  "refresh-detail",
  "audit.start-review",
  "audit.queue-report",
  "audit.before-restricted",
  "actor-suspend",
  "http.suspended-retry",
  "actor-ban",
  "http.banned-detail",
  "http.banned-retry",
  "actor-restore",
  "moderation-disable",
  "http.gate-retry",
  "audit.after-restricted",
  "sanction.membership",
]);
const PRE_SANCTION_COUNTS = freeze({
  "audit.before-conflict": 1,
  "audit.after-conflict": 1,
  "audit.before-stale": 5,
  "audit.after-stale": 5,
  "audit.start-review": "1",
  "audit.queue-report": "1",
  "audit.before-restricted": 6,
  "audit.after-restricted": 6,
});
const preSanctionTerminals = new WeakMap();
// c2b finite suffix starts after the validated prefix's one membership writer.
const FINAL_HTTP_ID = "retained-http-source";
const FINAL_SUFFIX_ID = "post-prefix-sanctions";
const FINAL_SUFFIX_STEPS = freeze([
  "sanction.gate-enable",
  "sanction.nonoperator",
  "sanction.moderator-ban",
  "sanction.suspend",
  "sanction.normalized-retry",
  "sanction.changed-retry",
  "MODHTTP.account-enforcement.access-state",
  "MODHTTP.account-enforcement.own-status",
  "MODHTTP.account-enforcement.profile",
  "MODHTTP.account-enforcement.hangouts",
  "MODHTTP.account-enforcement.retained-ids",
  "MODHTTP.account-enforcement.report",
  "MODHTTP.private-sanction-rest",
  "http.reopen",
  "sanction.admin-ban",
  "second-downgrade",
  "sanction.admin-downgrade-retry",
  "audit.single-ban",
]);
// Explicit literal-source mapping. Reused helper assert sites are lexical sites,
// never multiplied by the number of calls, labels or synthetic observations.
const FINAL_HTTP_MAPPING = freeze(
  [
    [
      55,
      ["signup-four"],
      [27, 32, 59, 60],
      "Auth/signup/login/JWT-unavailable",
    ],
    [90, ["gate-off.queue"], [36, 37, 38], "denied"],
    [
      91,
      [
        "nonoperator.detail.before",
        "nonoperator.queue.before",
        "nonoperator.detail.after",
        "nonoperator.queue.after",
      ],
      [36, 37, 38],
      "untrusted-reporter-metadata",
    ],
    [94, ["anonymous.queue"], [95], "status401/403/404-only;ACL-unavailable"],
    [96, ["private-rest.moderation_cases"], [98], "operator404-only"],
    [96, ["private-rest.moderation_audit"], [98], "operator404-only"],
    [96, ["private-rest.safety_reports"], [98], "operator404-only"],
    [
      110,
      ["queue", "audit.before-conflict"],
      [111, 112, 113, 116],
      "status200/one-row/seven-columns/report-id",
    ],
    [118, ["conflict.self-filed.detail"], [36, 37, 38], "conflict-denied"],
    [
      118,
      ["conflict.self-filed.start-review"],
      [36, 37, 38],
      "conflict-denied",
    ],
    [118, ["conflict.self-target.detail"], [36, 37, 38], "conflict-denied"],
    [
      118,
      ["conflict.self-target.start-review"],
      [36, 37, 38],
      "conflict-denied",
    ],
    [118, ["conflict.own-hangout.detail"], [36, 37, 38], "conflict-denied"],
    [
      118,
      ["conflict.own-hangout.start-review", "audit.after-conflict"],
      [36, 37, 38, 125],
      "conflict-denied/unchanged-numeric-audit",
    ],
    [
      127,
      ["detail"],
      [129, 130, 134, 135],
      "status200/sixteen-columns/narrative/revision0",
    ],
    [
      136,
      ["http.start", "http.replay"],
      [140, 141, 142],
      "status200/start-receipt/same-key-body-equality;replay200-additional",
    ],
    [144, ["second-detail"], [146, 147], "second/status200/revision1"],
    [
      149,
      ["http.annotate", "audit.before-stale"],
      [152],
      "revision2/Reviewed-evidence;200-additional",
    ],
    [
      154,
      ["http.stale", "audit.after-stale"],
      [36, 37, 38, 158],
      "second/stale-revision1/unchanged-numeric-audit",
    ],
    [
      160,
      [
        "refresh-detail",
        "audit.start-review",
        "audit.queue-report",
        "audit.before-restricted",
      ],
      [162, 163, 165],
      "revision2/two-exact-text-counts1;200-additional",
    ],
    [
      168,
      ["actor-suspend", "http.suspended-retry"],
      [36, 37, 38],
      "saved-start-key/live-account-denial",
    ],
    [
      170,
      ["actor-ban", "http.banned-detail"],
      [36, 37, 38],
      "live-account-denial",
    ],
    [
      173,
      ["http.banned-retry"],
      [36, 37, 38],
      "saved-start-key/live-account-denial",
    ],
    [
      174,
      [
        "actor-restore",
        "moderation-disable",
        "http.gate-retry",
        "audit.after-restricted",
      ],
      [36, 37, 38, 177],
      "active-restoration/gate-denial/unchanged-numeric-audit",
    ],
    [
      205,
      ["sanction.nonoperator"],
      [36, 37, 38],
      "reporter/saved-suspend-input/zero54",
    ],
    [
      206,
      ["sanction.moderator-ban"],
      [36, 37, 38],
      "moderator/ban/same-key/zero54",
    ],
    [
      208,
      ["sanction.suspend"],
      [210],
      "moderator/revision2/spaced-Local-decision/closed3-suspended;200-additional",
    ],
    [
      212,
      ["sanction.normalized-retry"],
      [212],
      "same-suspend-key/trimmed-Local-decision/exact-receipt;200-additional",
    ],
    [
      214,
      ["sanction.changed-retry"],
      [36, 37, 38],
      "original-suspend-key/Changed/zero54",
    ],
    [
      216,
      ["MODHTTP.account-enforcement.access-state"],
      [216],
      "target/restricted-body;200-additional",
    ],
    [
      217,
      ["MODHTTP.account-enforcement.own-status"],
      [],
      "target/current-source-body[]-supplemental/historical219-unretained-zero-original-credit;200-additional",
    ],
    [
      220,
      ["MODHTTP.account-enforcement.profile"],
      [220],
      "target/user-id-select/body[];200-additional",
    ],
    [
      222,
      ["MODHTTP.account-enforcement.hangouts"],
      [222],
      "target/id-select/body[];200-additional",
    ],
    [
      227,
      ["MODHTTP.account-enforcement.retained-ids"],
      [41, 42],
      "target/sourceDenied401/403+42501-only/zero54",
    ],
    [
      228,
      ["MODHTTP.account-enforcement.report"],
      [41, 42],
      "target/fresh-report-key/user-reporter/harassment/sourceDenied-only/zero54",
    ],
    [246, ["MODHTTP.private-sanction-rest"], [246], "operator404-only"],
    [
      248,
      ["http.reopen"],
      [251],
      "second/fresh-key/revision3/Further-review/result-revision4;200-additional",
    ],
    [
      252,
      ["sanction.admin-ban"],
      [255],
      "second-admin/fresh-ban-key/revision4/Decision/banned;200-additional",
    ],
    [
      257,
      [
        "second-downgrade",
        "sanction.admin-downgrade-retry",
        "audit.single-ban",
      ],
      [36, 37, 38, 260],
      "second-moderator/saved-ban-key/live-before-replay/zero54/exact-single-ban-count-text1",
    ],
  ].map(([sourceLine, components, assertionLines, qualification], index) => ({
    id: HTTP_IDS[index],
    sourceLine,
    components,
    assertionLines,
    qualification,
    sourceOnly: true,
    runtimeCredit: 0,
    originalCasePassCredit: 0,
    signupAvailable: false,
    jwtAvailable: false,
    transportAvailable: false,
    modelAvailable: index !== 0,
  })),
);
const finalHttpTerminals = new WeakMap();
export const httpTransitionPlans = freeze({
  [FINAL_HTTP_ID]: opaque(
    plans,
    freeze({
      id: FINAL_HTTP_ID,
      family: "retained-http-source",
      sourceOnly: true,
    }),
  ),
  [FINAL_SUFFIX_ID]: opaque(
    plans,
    freeze({
      id: FINAL_SUFFIX_ID,
      family: "post-prefix-sanctions",
      sourceOnly: true,
    }),
  ),
  ...Object.fromEntries(
    Object.keys(HTTP_TRANSITION_STEPS).map((id) => [
      id,
      opaque(
        plans,
        freeze({
          id,
          family: "http-transition-subsequences",
          sourceOnly: true,
        }),
      ),
    ]),
  ),
  [PRE_SANCTION_ID]: opaque(
    plans,
    freeze({
      id: PRE_SANCTION_ID,
      family: "http-pre-sanction-prefix",
      sourceOnly: true,
    }),
  ),
});
// c1 finite source primitives. Whole39 order remains unavailable pending c2.
const SANCTIONS = freeze({
  "sanction.nonoperator": [
    "reporter",
    2,
    "suspend",
    "  Local decision  ",
    false,
  ],
  "sanction.moderator-ban": ["actor", 2, "ban", "  Local decision  ", false],
  "sanction.suspend": ["actor", 2, "suspend", "  Local decision  ", false],
  "sanction.normalized-retry": ["actor", 2, "suspend", "Local decision", true],
  "sanction.changed-retry": ["actor", 2, "suspend", "Changed", true],
  "sanction.admin-ban": ["second", 4, "ban", "Decision", false],
  "sanction.admin-ban-retry": ["second", 4, "ban", "Decision", true],
  "sanction.admin-downgrade-retry": ["second", 4, "ban", "Decision", true],
});
const ENFORCEMENT_IDS = freeze([
  "MODHTTP.account-enforcement.access-state",
  "MODHTTP.account-enforcement.own-status",
  "MODHTTP.account-enforcement.profile",
  "MODHTTP.account-enforcement.hangouts",
  "MODHTTP.account-enforcement.retained-ids",
  "MODHTTP.account-enforcement.report",
  "MODHTTP.private-sanction-rest",
]);
const SANCTION_WRITERS = freeze([
  "sanction.membership",
  "sanction.gate-enable",
]);
const SANCTION_COMPONENTS = freeze({
  ...Object.fromEntries(
    Object.keys(SANCTIONS).map((id) => [
      id,
      `MODHTTP.account-action.${id.slice(9)}`,
    ]),
  ),
  "sanction.admin-ban": "MODHTTP.admin-ban",
  "sanction.admin-ban-retry": null,
  "sanction.admin-downgrade-retry": "MODHTTP.admin-downgrade-retry",
});
export const sanctionModelPlans = freeze(
  Object.fromEntries(
    [...Object.keys(SANCTIONS), ...SANCTION_WRITERS].map((id) => [
      id,
      opaque(
        plans,
        freeze({ id, family: "sanction-primitives", sourceOnly: true }),
      ),
    ]),
  ),
);
export const enforcementModelPlans = freeze(
  Object.fromEntries(
    ENFORCEMENT_IDS.map((id) => [
      id,
      opaque(
        plans,
        freeze({ id, family: "restricted-enforcement", sourceOnly: true }),
      ),
    ]),
  ),
);
const SANCTION_STEPS = freeze({
  "focused-sanctions": [
    "sanction.membership",
    "sanction.gate-enable",
    "sanction.nonoperator",
    "sanction.moderator-ban",
    "sanction.suspend",
    "sanction.normalized-retry",
    "sanction.changed-retry",
    ...ENFORCEMENT_IDS,
    "http.reopen",
    "sanction.admin-ban",
    "second-downgrade",
    "sanction.admin-downgrade-retry",
  ],
});
export const sanctionSequencePlans = freeze(
  Object.fromEntries(
    Object.keys(SANCTION_STEPS).map((id) => [
      id,
      opaque(
        plans,
        freeze({ id, family: "focused-sanction-sequence", sourceOnly: true }),
      ),
    ]),
  ),
);

export function describeModelPlan(handle) {
  if (!plans.has(handle))
    return freeze({ available: false, reason: "unavailable" });
  const p = plans.get(handle);
  return freeze({
    available: true,
    family: p.family,
    id: p.id,
    sourceOnly: true,
    runtimeCredit: 0,
    ...(["retained-http-source", "post-prefix-sanctions"].includes(p.family)
      ? {
          modelAvailable: true,
          transportAvailable: false,
          orderCredit: 0,
          signupAvailable: false,
          jwtAvailable: false,
          actualCasesComplete: false,
          originalCasePassCredit: 0,
          allocatedLabels:
            p.id === FINAL_HTTP_ID ? HTTP_IDS : HTTP_IDS.slice(24),
          components:
            p.id === FINAL_HTTP_ID
              ? FINAL_HTTP_MAPPING
              : FINAL_HTTP_MAPPING.slice(24),
          steps:
            p.id === FINAL_HTTP_ID
              ? [...PRE_SANCTION_STEPS, ...FINAL_SUFFIX_STEPS]
              : FINAL_SUFFIX_STEPS,
          prerequisite:
            "validated-source-only-four-signups-and-opaque44-prefix;actual-Auth/JWT/ACL/HTTP-unavailable",
          writerPlacement: {
            rolesReportsHangout: [66, 89],
            narrowModerationSafety: [100, 106],
            actorSuspend: 168,
            actorBan: 170,
            actorRestoreModerationOff: [174, 175],
            membership: [181, 188],
            moderationOnlyEnable: 201,
            secondDowngrade: [257, 258],
          },
          exclusions: {
            StorageEndpoints: [
              [179, 200],
              [231, 245],
            ],
            deferredEndpoints: [224, 226],
            membershipQualification:
              "privileged183-188-once;not-Storage-or-client-permission",
            auxiliaryAuthorizedBanReplayOriginalCredit: 0,
          },
          assertionQualification: {
            originalLexicalSites: 41,
            literalOriginalRetained: 40,
            historical219: "unretained/unexecuted/zero-original-credit",
            currentSourceBodyEmptySupplemental: 1,
            additionalHttp200Hardening:
              "zero-inherited-lexical/runtime/original-case-credit",
          },
        }
      : {}),
    ...(p.family === "http-pre-sanction-prefix"
      ? {
          modelAvailable: true,
          transportAvailable: false,
          orderCredit: 0,
          allocatedLabels: PRE_SANCTION_LABELS,
          components: PRE_SANCTION_LABELS.map((id) => ({
            id,
            sourceOnly: true,
            modelAvailable: id !== "MODHTTP.signup-four",
            signupAvailable: false,
            jwtAvailable: false,
            transportAvailable: false,
            runtimeCredit: 0,
            originalCasePassCredit: 0,
            qualification:
              id === "MODHTTP.signup-four"
                ? "unavailable-actual-Auth/signup/JWT;validated-source-description-only"
                : "finite-post-signup-source-model;actual-HTTP-unavailable",
          })),
          steps: PRE_SANCTION_STEPS,
          modeledPostSignupLabels: 23,
          signupAvailable: false,
          jwtAvailable: false,
          whole39Available: false,
          suffixAvailable: false,
          prerequisite:
            "four-source-subject-snapshot;actual-signup/JWT-unavailable",
          metadataOrdinals: [
            { subject: "actor", metadata: {} },
            { subject: "reporter", metadata: { role: "admin" } },
            { subject: "target", metadata: {} },
            { subject: "second", metadata: {} },
          ],
          anonymousQualification:
            "static-original-status401/403/404;ACL/JWT-execution-unavailable",
          membershipQualification:
            "privileged-source183-188-once;no-Storage-or-client-permission",
          nextSourceLine: 201,
        }
      : {}),
    ...([
      "sanction-primitives",
      "restricted-enforcement",
      "focused-sanction-sequence",
    ].includes(p.family)
      ? {
          modelAvailable: true,
          transportAvailable: false,
          orderCredit: 0,
          componentId:
            SANCTION_COMPONENTS[p.id] ??
            (ENFORCEMENT_IDS.includes(p.id) ? p.id : null),
          steps: SANCTION_STEPS[p.id] ?? [p.id],
          assertionQualification:
            p.id === "MODHTTP.account-enforcement.own-status"
              ? "current-source-supplemental-body-empty;historical219-unretained-zero-credit"
              : "source-only;success-status200-separate-hardening",
        }
      : {}),
    ...([
      "transitions",
      "first-twelve-races",
      "http-transition-subsequences",
    ].includes(p.family)
      ? {
          modelAvailable: true,
          transportAvailable: false,
          orderCredit: 0,
          steps: RACE_STEPS[p.id] ?? HTTP_TRANSITION_STEPS[p.id] ?? [p.id],
        }
      : {}),
    ...(p.family === "audited-reads"
      ? {
          componentId: READ_COMPONENTS[p.id],
          sequenceAvailable: false,
          transportAvailable: false,
          sourceHttpStatusAllowlist: p.id.startsWith("private-rest.")
            ? [404]
            : p.id === "anonymous.queue"
              ? [401, 403, 404]
              : ["queue", "detail", "second-detail", "refresh-detail"].includes(
                    p.id,
                  )
                ? [200]
                : [401, 403],
        }
      : {}),
  });
}
// Fixed, private source-only preparation for the later current-Hangout report.
// The input is an existing early-operator/source frame; no caller can choose an
// actor, host, operation, expected delta or authority. A later family consumes
// only the opaque validated frame, never a public raw-row getter.
const currentReadinessFrames = new WeakMap();
const currentReportFrames = new WeakMap();
const currentRaceFrames = new WeakMap();
const retainedBlockFrames = new WeakMap();
const currentCommittedReports = new WeakSet();
const CURRENT_REPORT_PLANS = freeze({
  current_report_first: "52000000-0000-4000-8003-000000000005",
  detail_first: "52000000-0000-4000-8003-000000000006",
});
const CURRENT_REPORT_DESCRIPTION = freeze({
  family: "current-hangout-report-receipt",
  sourceOnly: true,
  targetMode: "hangout",
  category: "harassment",
  narrative: null,
  reporter: "existing SQL actor",
  requestIds: CURRENT_REPORT_PLANS,
  provenance: "current_hangout",
  fullTables: 54,
  rollback: "public-positive-to-validated-ready-before",
  actualPermissionCredit: 0,
  raceOrderAvailable: false,
});
const CURRENT_READINESS_DESCRIPTION = freeze({
  family: "current-hangout-report-readiness",
  actor: "existing SQL actor",
  host: "existing immutable SQL Hangout host",
  sourceOnly: true,
  fullTables: 54,
  sourceGuard: [
    "ready actor and immutable host in the same verified UNC campus",
    "pilot availability and Hangouts capability",
    "Hangout and safety source gates",
    "published campus-visible approximate Hangout without disable or pair block",
  ],
  setupOnly: ["open joining", "eligible start time"],
  providerPermissionCredit: 0,
  reportReceiptAvailable: false,
  raceOrderAvailable: false,
});
function currentReadinessNoSeven(raw, actor, host, hangout) {
  check(actor !== host);
  check(
    !raw["private.people_blocks"].some(
      (r) => r.blocker_id === actor && r.blocked_id === host,
    ),
  );
  const low = actor < host ? actor : host,
    high = actor < host ? host : actor;
  check(
    !raw["private.friendships"].some(
      (r) => r.low_id === low && r.high_id === high,
    ) &&
      !raw["private.friendship_create_requests"].some(
        (r) =>
          (r.actor_id === actor && r.target_id === host) ||
          (r.actor_id === host && r.target_id === actor),
      ) &&
      !raw["private.dm_pairs"].some(
        (r) => r.low_id === low && r.high_id === high,
      ) &&
      !raw["public.hangout_participants"].some(
        (r) =>
          r.account_id === actor &&
          raw["public.hangouts"].some(
            (h) => h.id === r.hangout_id && h.host_id === host,
          ),
      ) &&
      !raw["private.hangout_peer_provenance"].some(
        (r) => r.low_id === low && r.high_id === high,
      ),
  );
  const own = raw["public.hangout_participants"].filter(
    (r) => r.account_id === actor,
  );
  for (const mine of own)
    for (const peer of raw["public.hangout_participants"].filter(
      (r) => r.account_id === host && r.hangout_id === mine.hangout_id,
    ))
      check(
        !(
          preciseTime(mine.joined_at) <
            (peer.left_at || peer.removed_at
              ? preciseTime(peer.left_at ?? peer.removed_at)
              : 10n ** 30n) &&
          preciseTime(peer.joined_at) <
            (mine.left_at || mine.removed_at
              ? preciseTime(mine.left_at ?? mine.removed_at)
              : 10n ** 30n)
        ),
      );
  check(
    !raw["public.hangout_participants"].some(
      (r) => r.hangout_id === hangout && r.account_id === actor,
    ),
  );
}
function currentReadinessSubject(raw, id, campus) {
  const account = find(raw, "public.accounts", (r) => r.id === id),
    user = find(raw, "auth.users", (r) => r.id === id),
    membership = find(
      raw,
      "public.university_memberships",
      (r) => r.user_id === id,
    ),
    profile = find(raw, "public.profiles", (r) => r.user_id === id),
    admission = find(
      raw,
      "private.pilot_account_admission",
      (r) => r.account_id === id,
    );
  check(account.status === "active" && admission.state === "active");
  check(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(campus));
  check(
    user.deleted_at === null &&
      user.email_confirmed_at !== null &&
      membership.verified_at !== null &&
      membership.university_id === campus &&
      typeof user.email === "string" &&
      /^[^@\s]+@[^@\s]+$/.test(user.email) &&
      user.email.toLowerCase() === membership.verification_email?.toLowerCase(),
  );
  preciseTime(user.email_confirmed_at);
  preciseTime(membership.verified_at);
  const university = find(raw, "public.universities", (r) => r.id === campus);
  check(
    university.active &&
      university.slug === "unc-chapel-hill" &&
      university.allowed_email_domains.includes(
        user.email.split("@")[1].toLowerCase(),
      ),
  );
  check(
    profile.is_complete === true &&
      typeof profile.real_name === "string" &&
      profile.real_name.length > 0 &&
      Number.isInteger(profile.graduation_year) &&
      typeof profile.major === "string" &&
      profile.major.length > 0 &&
      typeof profile.bio === "string" &&
      profile.bio.length > 0 &&
      profile.primary_photo_path === `${id}/primary.png`,
  );
  find(
    raw,
    "storage.objects",
    (r) =>
      r.bucket_id === "profile-photos" &&
      r.name === profile.primary_photo_path &&
      r.owner_id === id &&
      r.name.split("/")[0] === id,
  );
}
function currentReadinessSource(raw, actor, host, hangout, bounds) {
  const h = find(raw, "public.hangouts", (r) => r.id === hangout),
    campus = h.university_id;
  check(h.host_id === host && h.status === "published");
  check(
    h.visibility === "campus" && h.location_precision === "approximate_area",
  );
  // Open joining and future time establish this fixture; source27 does not
  // add either as an authorization predicate for can_read_hangout(false).
  check(
    h.joining_state === "open" &&
      preciseTime(h.starts_at) > bounds.high &&
      preciseTime(h.starts_at) <= bounds.high + 366n * 86_400_000_000n,
  );
  preciseTime(h.created_at);
  preciseTime(h.updated_at);
  check(
    h.ends_at === null || preciseTime(h.ends_at) > preciseTime(h.starts_at),
  );
  const joined = find(
    raw,
    "public.hangout_participants",
    (r) => r.hangout_id === hangout && r.account_id === host,
  );
  check(
    joined.state === "joined" &&
      joined.left_at === null &&
      joined.removed_at === null,
  );
  preciseTime(joined.joined_at);
  preciseTime(joined.updated_at);
  currentReadinessSubject(raw, actor, campus);
  currentReadinessSubject(raw, host, campus);
  equal(
    raw["private.pilot_availability"].map((r) => [r.singleton, r.enabled]),
    [[true, true]],
  );
  equal(
    raw["private.pilot_capabilities"].map((r) => r.key).sort(),
    CAPABILITIES.slice().sort(),
  );
  check(
    find(raw, "private.pilot_capabilities", (r) => r.key === "hangouts")
      .enabled,
  );
  for (const gate of [
    "private.hangout_feature_gate",
    "private.safety_feature_gate",
  ])
    equal(raw[gate], [{ singleton: true, enabled: true }]);
  check(!raw["private.hangout_disables"].some((r) => r.hangout_id === hangout));
  check(
    !raw["private.people_blocks"].some(
      (r) =>
        (r.blocker_id === actor && r.blocked_id === host) ||
        (r.blocker_id === host && r.blocked_id === actor),
    ),
  );
  currentReadinessNoSeven(raw, actor, host, hangout);
  return campus;
}
function currentReadinessFixture(
  beforeHandle,
  readyHandle,
  bounds,
  sourceHandle,
) {
  own(sources, sourceHandle);
  const before = own(snapshots, beforeHandle),
    ready = own(snapshots, readyHandle),
    actor = SQL_IDS.actor,
    host = SQL_IDS.target,
    hangout = SQL_IDS.hangout;
  check(
    bounds && typeof bounds.low === "bigint" && typeof bounds.high === "bigint",
  );
  const original = find(before, "public.hangouts", (r) => r.id === hangout);
  check(original.host_id === host && original.status === "published");
  currentReadinessNoSeven(before, actor, host, hangout);
  for (const id of [actor, host]) {
    find(before, "public.accounts", (r) => r.id === id);
    find(before, "auth.users", (r) => r.id === id);
    find(before, "public.university_memberships", (r) => r.user_id === id);
    const profile = find(before, "public.profiles", (r) => r.user_id === id);
    check(profile.is_complete === false && profile.primary_photo_path === null);
    check(
      !before["private.pilot_account_admission"].some(
        (r) => r.account_id === id,
      ),
    );
  }
  equal(
    before["private.pilot_availability"].map((r) => r.enabled),
    [false],
  );
  check(
    before["private.pilot_capabilities"].length === CAPABILITIES.length &&
      before["private.pilot_capabilities"].every((r) => !r.enabled),
  );
  equal(before["private.hangout_feature_gate"], [
    { singleton: true, enabled: false },
  ]);
  equal(before["private.safety_feature_gate"], [
    { singleton: true, enabled: true },
  ]);
  const used = new Set();
  const photos = [actor, host].map((id) => {
    const path = `${id}/primary.png`;
    const observed = find(
      ready,
      "storage.objects",
      (r) => r.bucket_id === "profile-photos" && r.name === path,
    );
    return syntheticStorageRow(
      before,
      { ...ready, "storage.objects": [...before["storage.objects"], observed] },
      id,
      path,
      bounds,
      sourceHandle,
      used,
    );
  });
  const admissions = [actor, host].map((id) => {
    check(
      !before["private.pilot_account_admission"].some(
        (r) => r.account_id === id,
      ),
    );
    const observed = find(
      ready,
      "private.pilot_account_admission",
      (r) => r.account_id === id,
    );
    return {
      account_id: id,
      state: "active",
      revision: 1,
      created_at: bindTime("clock_timestamp", observed.created_at, bounds),
      updated_at: bindTime("clock_timestamp", observed.updated_at, bounds),
    };
  });
  const availability = find(
    ready,
    "private.pilot_availability",
    (r) => r.singleton,
  );
  const purpose = find(
    ready,
    "private.pilot_capabilities",
    (r) => r.key === "hangouts",
  );
  const expected = derive(before, {
    "public.profiles": before["public.profiles"].map((r) =>
      [actor, host].includes(r.user_id)
        ? {
            ...r,
            real_name: "Current safety fixture",
            graduation_year: 2028,
            major: "Mathematics",
            bio: "Local safety fixture",
            primary_photo_path: `${r.user_id}/primary.png`,
            is_complete: true,
            revision: r.revision + 1,
          }
        : clone(r),
    ),
    "storage.objects": insertion(before, "storage.objects", photos),
    "private.pilot_account_admission": insertion(
      before,
      "private.pilot_account_admission",
      admissions,
    ),
    "private.pilot_availability": [
      {
        ...before["private.pilot_availability"][0],
        enabled: true,
        revision: before["private.pilot_availability"][0].revision + 1,
        updated_at: bindTime(
          "clock_timestamp",
          availability.updated_at,
          bounds,
        ),
      },
    ],
    "private.pilot_capabilities": before["private.pilot_capabilities"].map(
      (r) =>
        r.key === "hangouts"
          ? {
              ...r,
              enabled: true,
              revision: r.revision + 1,
              updated_at: bindTime(
                "clock_timestamp",
                purpose.updated_at,
                bounds,
              ),
            }
          : clone(r),
    ),
    "private.hangout_feature_gate": [{ singleton: true, enabled: true }],
  });
  equal(
    unorderedRows(ready["storage.objects"]),
    unorderedRows(expected["storage.objects"]),
  );
  for (const table of TABLES)
    equal(unorderedRows(ready[table]), unorderedRows(expected[table]));
  const campus = currentReadinessSource(ready, actor, host, hangout, bounds);
  return opaque(
    currentReadinessFrames,
    freeze({
      beforeHandle,
      readyHandle,
      actor,
      host,
      hangout,
      campus,
      sourceHandle,
    }),
  );
}
// The only report input is the fixed current-Hangout operation. Observed rows
// supply database-generated candidates, never expected row bodies or authority.
function currentReportOperationForPlan(
  readinessHandle,
  afterHandle,
  bounds,
  receipt,
  requestId,
  committedBeforeHandle,
) {
  const ready = own(currentReadinessFrames, readinessHandle),
    beforeHandle = committedBeforeHandle ?? ready.readyHandle,
    before = own(snapshots, beforeHandle),
    after = own(snapshots, afterHandle);
  check(
    bounds && typeof bounds.low === "bigint" && typeof bounds.high === "bigint",
  );
  check(ready.actor === SQL_IDS.actor && ready.host === SQL_IDS.target);
  check(Object.values(CURRENT_REPORT_PLANS).includes(requestId));
  if (committedBeforeHandle !== undefined)
    check(requestId === CURRENT_REPORT_PLANS.detail_first);
  check(ready.hangout === SQL_IDS.hangout);
  own(sources, ready.sourceHandle);
  currentReadinessSource(
    before,
    ready.actor,
    ready.host,
    ready.hangout,
    bounds,
  );
  check(
    !before["private.safety_report_requests"].some(
      (r) => r.reporter_id === ready.actor && r.request_id === requestId,
    ),
  );
  const reports = added(
    before,
    after,
    "private.safety_reports",
    (r) => !before["private.safety_reports"].some((old) => old.id === r.id),
    1,
  );
  const requestRows = added(
    before,
    after,
    "private.safety_report_requests",
    (r) => r.reporter_id === ready.actor && r.request_id === requestId,
    1,
  );
  const reportId = bindUuid("database_uuid", reports[0].id, before, new Set());
  const submittedAt = bindTime(
    "clock_timestamp",
    reports[0].submitted_at,
    bounds,
  );
  check(!Object.values(CURRENT_REPORT_PLANS).includes(reportId));
  check(
    before["private.safety_reports"].filter(
      (r) =>
        r.reporter_id === ready.actor &&
        preciseTime(r.submitted_at) >=
          preciseTime(submittedAt) - 3_600_000_000n &&
        preciseTime(r.submitted_at) <= preciseTime(submittedAt),
    ).length < 5,
  );
  const fingerprint = createHash("md5")
    .update(
      `[${["hangout", ready.hangout, "harassment", null]
        .map((v) => JSON.stringify(v))
        .join(", ")}]`,
    )
    .digest("hex");
  const changed = {
    "private.safety_reports": insertion(before, "private.safety_reports", [
      {
        id: reportId,
        submitted_at: submittedAt,
        reporter_id: ready.actor,
        target_type: "hangout",
        target_id: ready.hangout,
        category: "harassment",
        narrative: null,
        provenance_kind: "current_hangout",
        provenance_ref_id: ready.hangout,
      },
    ]),
    "private.safety_report_requests": insertion(
      before,
      "private.safety_report_requests",
      [
        {
          reporter_id: ready.actor,
          request_id: requestId,
          input_fingerprint: fingerprint,
          report_id: reportId,
        },
      ],
    ),
  };
  equal(requestRows[0], changed["private.safety_report_requests"].at(-1));
  const expectedReceipt = { receipt_id: reportId, submitted_at: submittedAt };
  assertExact(beforeHandle, afterHandle, changed, receipt, expectedReceipt);
  return opaque(
    currentReportFrames,
    freeze({
      readinessHandle,
      beforeHandle,
      afterHandle,
      requestId,
      receipt: expectedReceipt,
    }),
  );
}
function currentReportOperation(readinessHandle, afterHandle, bounds, receipt) {
  return currentReportOperationForPlan(
    readinessHandle,
    afterHandle,
    bounds,
    receipt,
    CURRENT_REPORT_PLANS.current_report_first,
  );
}
function detailFirstCurrentReportOperation(
  readinessHandle,
  afterHandle,
  bounds,
  receipt,
  committedBeforeHandle,
) {
  return currentReportOperationForPlan(
    readinessHandle,
    afterHandle,
    bounds,
    receipt,
    CURRENT_REPORT_PLANS.detail_first,
    committedBeforeHandle,
  );
}
function currentReportRollback(reportHandle, rollbackHandle) {
  check(!currentCommittedReports.has(reportHandle));
  const report = own(currentReportFrames, reportHandle),
    ready = own(currentReadinessFrames, report.readinessHandle),
    before = own(snapshots, ready.readyHandle),
    rollback = own(snapshots, rollbackHandle);
  // Public-positive rollback has no persisted report, ledger, or unrelated delta.
  for (const table of TABLES)
    equal(unorderedRows(rollback[table]), unorderedRows(before[table]));
  return opaque(results, freeze({ rolledBack: true, sourceOnly: true }));
}
const CURRENT_RACE_ORDERS = freeze([
  {
    id: "current_report_first",
    sourceLine: 199,
    leader: "submit_safety_report:request-0005",
    leaderResult: "receipt_id,submitted_at",
    waiter: "get_moderation_report:historical-hangout-report",
    waiterResult: "one audited detail row",
    committed: ["report-0005", "detail-read-1"],
  },
  {
    id: "detail_first",
    sourceLine: 200,
    leader: "get_moderation_report:historical-hangout-report",
    leaderResult: "one audited detail row",
    waiter: "submit_safety_report:request-0006",
    waiterResult: "receipt_id,submitted_at",
    committed: ["detail-read-2", "report-0006"],
  },
]);
const CURRENT_RACE_DESCRIPTION = freeze({
  family: "current-hangout-report-static-orders",
  orders: CURRENT_RACE_ORDERS,
  fullTables: 54,
  sourceOnly: true,
  actualOrderCredit: 0,
  actualPermissionCredit: 0,
  blockFirstAvailable: false,
});
const RETAINED_BLOCK_DESCRIPTION = freeze({
  family: "joined-retained-block-static-order",
  sourceLine: 206,
  order: ["set_safety_block:target:true", "list_moderation_reports"],
  actor: SQL_IDS.actor,
  immutableHostAndTarget: SQL_IDS.target,
  fullTables: 54,
  ordinaryAvailability: false,
  sourceOnly: true,
  actualOrderCredit: 0,
  actualPermissionCredit: 0,
});
// A detail always reads the original historical Hangout report. The first
// report is committed before detail 1; detail 2 commits before report 2.
function currentRaceDetail(priorHandle, afterHandle, bounds, result, ordinal) {
  check(ordinal === 1 || ordinal === 2);
  const prior =
    ordinal === 1
      ? own(currentReportFrames, priorHandle)
      : own(currentRaceFrames, priorHandle);
  if (ordinal === 1)
    check(prior.requestId === CURRENT_REPORT_PLANS.current_report_first);
  else check(prior.phase === "detail-1");
  const beforeHandle = prior.afterHandle,
    before = own(snapshots, beforeHandle),
    after = own(snapshots, afterHandle);
  check(
    bounds && typeof bounds.low === "bigint" && typeof bounds.high === "bigint",
  );
  check(readActor(before, SQL_IDS.actor, "authenticated", "read committed"));
  check(reportAllowed(before, SQL_IDS.actor, SQL_IDS.hangoutReport));
  const rows = detailRows(before, SQL_IDS.hangoutReport);
  const changed = readAudit(
    { beforeHandle, bounds },
    after,
    SQL_IDS.actor,
    "detail_read",
    rows,
  );
  assertExact(beforeHandle, afterHandle, changed, result, rows);
  const priorTime =
    ordinal === 1
      ? preciseTime(prior.receipt.submitted_at)
      : preciseTime(
          find(
            before,
            "private.moderation_audit",
            (r) => r.id === prior.auditId,
          ).occurred_at,
        );
  const audit = changed["private.moderation_audit"].at(-1);
  check(preciseTime(audit.occurred_at) >= priorTime);
  if (ordinal === 1) currentCommittedReports.add(priorHandle);
  return opaque(
    currentRaceFrames,
    freeze({
      phase: ordinal === 1 ? "detail-1" : "detail-2",
      readinessHandle: prior.readinessHandle,
      afterHandle,
      auditId: audit.id,
      firstReportHandle: ordinal === 1 ? priorHandle : prior.firstReportHandle,
    }),
  );
}
function currentRaceReport2(detailHandle, afterHandle, bounds, receipt) {
  const detail = own(currentRaceFrames, detailHandle);
  check(detail.phase === "detail-2");
  const first = own(currentReportFrames, detail.firstReportHandle);
  check(first.requestId === CURRENT_REPORT_PLANS.current_report_first);
  const report2 = detailFirstCurrentReportOperation(
    detail.readinessHandle,
    afterHandle,
    bounds,
    receipt,
    detail.afterHandle,
  );
  check(
    preciseTime(receipt.submitted_at) >=
      preciseTime(
        find(
          own(snapshots, detail.afterHandle),
          "private.moderation_audit",
          (r) => r.id === detail.auditId,
        ).occurred_at,
      ),
  );
  const ready = own(currentReadinessFrames, detail.readinessHandle),
    base = own(snapshots, ready.readyHandle),
    final = own(snapshots, afterHandle);
  check(
    final["private.safety_reports"].length ===
      base["private.safety_reports"].length + 2,
  );
  check(
    final["private.safety_report_requests"].length ===
      base["private.safety_report_requests"].length + 2,
  );
  check(
    final["private.moderation_audit"].length ===
      base["private.moderation_audit"].length + 2,
  );
  currentCommittedReports.add(report2);
  return opaque(
    currentRaceFrames,
    freeze({
      phase: "both-reports-committed",
      readinessHandle: detail.readinessHandle,
      firstReportHandle: detail.firstReportHandle,
      secondReportHandle: report2,
      afterHandle,
    }),
  );
}
function currentRaceOrdinaryShutdown(terminalHandle, afterHandle) {
  const terminal = own(currentRaceFrames, terminalHandle);
  check(terminal.phase === "both-reports-committed");
  own(currentReportFrames, terminal.firstReportHandle);
  own(currentReportFrames, terminal.secondReportHandle);
  const before = own(snapshots, terminal.afterHandle),
    after = own(snapshots, afterHandle);
  equal(
    before["private.pilot_availability"].map((r) => r.enabled),
    [true],
  );
  check(before["private.pilot_capabilities"].length === CAPABILITIES.length);
  check(
    find(before, "private.pilot_capabilities", (r) => r.key === "hangouts")
      .enabled,
  );
  const changed = ordinaryShutdown(before);
  assertExact(terminal.afterHandle, afterHandle, changed, "", "");
  equal(
    after["private.pilot_availability"].map((r) => r.enabled),
    [false],
  );
  check(after["private.pilot_capabilities"].every((r) => !r.enabled));
  // Shutdown changes only ordinary policy. Operator and safety gates, as well
  // as all report, ledger and audit evidence, are checked by full54 equality.
  return opaque(
    currentRaceFrames,
    freeze({
      phase: "ordinary-off-after-both-reports",
      readinessHandle: terminal.readinessHandle,
      afterHandle,
    }),
  );
}
// Separate privileged fixture preparation. This is not an ordinary join while
// pilot availability is off and never establishes a student join permission.
function retainedBlockJoinedFixture(shutdownHandle, joinedHandle, bounds) {
  const terminal = own(currentRaceFrames, shutdownHandle);
  check(terminal.phase === "ordinary-off-after-both-reports");
  const before = own(snapshots, terminal.afterHandle);
  const after = own(snapshots, joinedHandle);
  check(before["private.pilot_availability"][0].enabled === false);
  check(before["private.pilot_capabilities"].length === CAPABILITIES.length);
  check(before["private.pilot_capabilities"].every((r) => !r.enabled));
  equal(before["private.people_feature_gate"], [
    { singleton: true, enabled: false },
  ]);
  equal(before["private.safety_feature_gate"], [
    { singleton: true, enabled: true },
  ]);
  check(readActor(before, SQL_IDS.actor, "authenticated", "read committed"));
  const h = find(before, "public.hangouts", (r) => r.id === SQL_IDS.hangout);
  check(h.host_id === SQL_IDS.target);
  const host = find(
    before,
    "public.hangout_participants",
    (r) => r.hangout_id === h.id && r.account_id === h.host_id,
  );
  check(
    host.state === "joined" &&
      host.left_at === null &&
      host.removed_at === null,
  );
  check(
    !before["public.hangout_participants"].some(
      (r) => r.hangout_id === h.id && r.account_id === SQL_IDS.actor,
    ),
  );
  const actor = find(
    after,
    "public.hangout_participants",
    (r) => r.hangout_id === h.id && r.account_id === SQL_IDS.actor,
  );
  const joinedAt = bindTime("clock_timestamp", actor.joined_at, bounds);
  const updatedAt = bindTime("clock_timestamp", actor.updated_at, bounds);
  const dmCandidate = find(
    after,
    "private.dm_pairs",
    (r) => r.low_id === SQL_IDS.actor && r.high_id === SQL_IDS.target,
  );
  const dmCreatedAt = bindTime(
    "clock_timestamp",
    dmCandidate.created_at,
    bounds,
  );
  check(preciseTime(joinedAt) <= preciseTime(updatedAt));
  const changed = {
    "public.hangout_participants": insertion(
      before,
      "public.hangout_participants",
      [
        {
          hangout_id: h.id,
          account_id: SQL_IDS.actor,
          state: "joined",
          joined_at: joinedAt,
          left_at: null,
          removed_at: null,
          updated_at: updatedAt,
        },
      ],
    ),
    "private.friendships": insertion(before, "private.friendships", [
      {
        low_id: SQL_IDS.actor,
        high_id: SQL_IDS.target,
        requester_id: SQL_IDS.actor,
        campus_id: h.university_id,
        generation_id: "6d000000-0000-4000-8000-000000000021",
        state: "active",
      },
    ]),
    "private.dm_pairs": insertion(before, "private.dm_pairs", [
      {
        generation_id: "6d000000-0000-4000-8000-000000000022",
        low_id: SQL_IDS.actor,
        high_id: SQL_IDS.target,
        initiator_id: SQL_IDS.actor,
        campus_id: h.university_id,
        state: "accepted",
        created_at: dmCreatedAt,
        next_sequence: 1,
      },
    ]),
  };
  assertExact(terminal.afterHandle, joinedHandle, changed, "", "");
  return opaque(
    retainedBlockFrames,
    freeze({ phase: "joined", afterHandle: joinedHandle }),
  );
}
function retainedBlockFirst(joinedHandle, blockedHandle, bounds, result) {
  const frame = own(retainedBlockFrames, joinedHandle);
  check(frame.phase === "joined");
  const before = own(snapshots, frame.afterHandle);
  const after = own(snapshots, blockedHandle);
  check(before["private.pilot_availability"][0].enabled === false);
  check(before["private.pilot_capabilities"].every((r) => !r.enabled));
  equal(before["private.people_feature_gate"], [
    { singleton: true, enabled: false },
  ]);
  equal(before["private.safety_feature_gate"], [
    { singleton: true, enabled: true },
  ]);
  check(
    !before["private.people_blocks"].some(
      (r) => r.blocker_id === SQL_IDS.actor && r.blocked_id === SQL_IDS.target,
    ),
  );
  const h = find(before, "public.hangouts", (r) => r.id === SQL_IDS.hangout);
  check(h.host_id === SQL_IDS.target);
  const actor = find(
    before,
    "public.hangout_participants",
    (r) => r.hangout_id === h.id && r.account_id === SQL_IDS.actor,
  );
  const host = find(
    before,
    "public.hangout_participants",
    (r) => r.hangout_id === h.id && r.account_id === SQL_IDS.target,
  );
  check(actor.state === "joined" && host.state === "joined");
  find(
    before,
    "private.friendships",
    (r) =>
      r.low_id === SQL_IDS.actor &&
      r.high_id === SQL_IDS.target &&
      r.state === "active",
  );
  find(
    before,
    "private.dm_pairs",
    (r) =>
      r.low_id === SQL_IDS.actor &&
      r.high_id === SQL_IDS.target &&
      r.state === "accepted",
  );
  check(
    !before["private.hangout_peer_provenance"].some(
      (r) =>
        r.hangout_id === h.id &&
        r.low_id === SQL_IDS.actor &&
        r.high_id === SQL_IDS.target,
    ),
  );
  const observed = find(
    after,
    "public.hangout_participants",
    (r) => r.hangout_id === h.id && r.account_id === SQL_IDS.actor,
  );
  const leftAt = bindTime("clock_timestamp", observed.left_at, bounds);
  const updatedAt = bindTime("clock_timestamp", observed.updated_at, bounds);
  check(preciseTime(leftAt) > preciseTime(actor.joined_at));
  check(preciseTime(updatedAt) >= preciseTime(leftAt));
  const changed = {
    "private.people_blocks": insertion(before, "private.people_blocks", [
      { blocker_id: SQL_IDS.actor, blocked_id: SQL_IDS.target },
    ]),
    "private.hangout_peer_provenance": insertion(
      before,
      "private.hangout_peer_provenance",
      [{ hangout_id: h.id, low_id: SQL_IDS.actor, high_id: SQL_IDS.target }],
    ),
    "public.hangout_participants": before["public.hangout_participants"].map(
      (r) =>
        r.hangout_id === h.id && r.account_id === SQL_IDS.actor
          ? { ...r, state: "left", left_at: leftAt, updated_at: updatedAt }
          : clone(r),
    ),
    "private.friendships": before["private.friendships"].filter(
      (r) => !(r.low_id === SQL_IDS.actor && r.high_id === SQL_IDS.target),
    ),
    "private.dm_pairs": before["private.dm_pairs"].map((r) =>
      r.low_id === SQL_IDS.actor && r.high_id === SQL_IDS.target
        ? { ...r, state: "blocked" }
        : clone(r),
    ),
  };
  assertExact(frame.afterHandle, blockedHandle, changed, result, true);
  return opaque(
    retainedBlockFrames,
    freeze({ phase: "blocked", afterHandle: blockedHandle }),
  );
}
function retainedBlockQueue(blockedHandle, queuedHandle, bounds, result) {
  const frame = own(retainedBlockFrames, blockedHandle);
  check(frame.phase === "blocked");
  const before = own(snapshots, frame.afterHandle);
  const after = own(snapshots, queuedHandle);
  check(readActor(before, SQL_IDS.actor, "authenticated", "read committed"));
  const rows = queueRows(before, SQL_IDS.actor, {
    p_after_submitted_at: null,
    p_after_id: null,
    p_limit: 24,
  });
  const changed = readAudit(
    { beforeHandle: frame.afterHandle, bounds },
    after,
    SQL_IDS.actor,
    "queue_read",
    rows,
  );
  assertExact(frame.afterHandle, queuedHandle, changed, result, rows);
  return opaque(
    retainedBlockFrames,
    freeze({ phase: "queued", afterHandle: queuedHandle }),
  );
}
function retainedBlockTeardown(queuedHandle, teardownHandle) {
  const frame = own(retainedBlockFrames, queuedHandle);
  check(frame.phase === "queued");
  const after = own(snapshots, teardownHandle);
  const changed = {
    "private.safety_feature_gate": [{ singleton: true, enabled: false }],
    "private.moderation_feature_gate": [{ singleton: true, enabled: false }],
    "private.hangout_feature_gate": [{ singleton: true, enabled: false }],
  };
  assertExact(frame.afterHandle, teardownHandle, changed, "", "");
  check(after["private.pilot_availability"][0].enabled === false);
  check(after["private.pilot_capabilities"].every((r) => !r.enabled));
  // Reports, ledgers, audits, overlap, block and participant history survive.
  return opaque(
    retainedBlockFrames,
    freeze({ phase: "teardown", afterHandle: teardownHandle }),
  );
}
export const modelCheckpoint = freeze({
  family: "core-setup-reads-transitions-first12-sanctions-enforcement",
  modelHash: hash(
    [
      snapshot,
      sourceCandidate,
      preciseTime,
      bindTime,
      bindUuid,
      derive,
      assertExact,
      operation,
      provisionSql,
      provisionHttp,
      confirmHttp,
      syntheticStorageRow,
      setupContext,
      initialRoles,
      initialReports,
      initialHangout,
      ordinaryShutdown,
      initialWriter,
      verifyOperation,
      assertEarlyOperator,
      readContext,
      readActor,
      reportAllowed,
      queueRows,
      detailRows,
      readAudit,
      verifyReadOperation,
      readDenial,
      auditCounts,
      transitionContext,
      transitionDecision,
      transitionAudit,
      verifyTransitionOperation,
      sequenceOperation,
      verifySequence,
      sanctionContext,
      sanctionDecision,
      sanctionChanges,
      sanctionWriter,
      sanctionHttpResult,
      verifySanctionOperation,
      sanctionSequenceOperation,
      verifySanctionSequence,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  privateInterfaceHash: hash(
    "snapshot(raw)->handle;sourceCandidate(exactBytes)->sourceOnlyHandle;operation(fixedPlan,beforeHandle,bounds,sourceHandle,sourceContext)->handle;verifyOperation(handle,afterHandle,result)->privateResultHandle;syntheticStorageRow(before,after,existingSubject,fixedPath,bounds,sourceHandle,used)->independentRow;assertExact(beforeHandle,afterHandle,fixedChangedTables,result,intendedResult)->privateResultHandle",
  ),
  tables: 54,
  publicPrivateTables: 52,
  authFields: 6,
  storageFields: 15,
  sourceHashes: SOURCE_HASHES,
  schemaHash: hash(JSON.stringify(SCHEMA)),
  planHash: hash(JSON.stringify({ HTTP_IDS, RACES, PHASES, SETUP_IDS })),
  interfaceHash: hash(
    "family1a1:setupModelPlans;describeModelPlan(handle);modelCheckpoint;runMemoryExamples(exactSourceBytes);moderationContact():unconditional-refusal;family1a2a:readModelPlans;describeModelPlan(handle)->componentId/sequenceAvailable=false/transportAvailable=false/sourceHttpStatusAllowlist;family1a2b:transitionModelPlans/raceModelPlans/httpTransitionPlans;describeModelPlan(handle)->finiteSteps/modelAvailable/transportAvailable=false/orderCredit=0;family1a2c1:sanctionModelPlans/enforcementModelPlans/sanctionSequencePlans;finiteSourcePlans/assertionQualification/noTransportOrOrderCredit",
  ),
  readModelHash: hash(
    [
      readContext,
      readActor,
      reportAllowed,
      queueRows,
      detailRows,
      readAudit,
      verifyReadOperation,
      readDenial,
      auditCounts,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  readPlanHash: hash(JSON.stringify({ READ_IDS, READ_COMPONENTS })),
  readInterfaceHash: hash(
    "private:readContext(op)->fixedSourceContext;readActor(before,actor,jwtRole,isolation)->boolean;reportAllowed(before,actor,reportId)->boolean;queueRows(before,actor,exactSourceParams)->rows7;detailRows(before,reportId)->rows16;readAudit(op,after,actor,kind,rows)->changedAudit23;auditCounts(snapshotHandle,fixedSetup)->privateCounts;verifyReadOperation(op,afterHandle,actualResult)->privateResult;readDenial(op,before,fixedContext)->fixedResultWithHTTPOnlyMetadataAndREST;public:readModelPlans;describeModelPlan(handle)->componentDescription/sourceHttpStatusAllowlist",
  ),
  auditedReadsAvailable: true,
  readPrimitives: READ_IDS.length,
  transitionModelHash: hash(
    [
      transitionContext,
      transitionDecision,
      transitionAudit,
      verifyTransitionOperation,
      sequenceOperation,
      verifySequence,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  transitionPlanHash: hash(
    JSON.stringify({
      TRANSITIONS,
      LOSS_READS,
      RACE_STEPS,
      HTTP_TRANSITION_STEPS,
    }),
  ),
  transitionInterfaceHash: hash(
    "private:transitionContext(op)->fixedSourceContext;transitionDecision(op,before,c)->independentChanges/resultOrDenial;transitionAudit(op,after,c,decision)->independentAudit23;verifyTransitionOperation(op,afterHandle,actualResult)->privateResult;sourceResult:race.detail-count=text1/race.transition=tuplesOnlyRowText/http.transition=rpcBodyArray;sequenceOperation(fixedPlan,beforeHandle,bounds,sourceHandle,setup,requestBindings)->opaqueSequence;verifySequence(sequenceHandle,orderedPrivateObservations)->privateResult;public:transitionModelPlans/raceModelPlans/httpTransitionPlans;finiteStepsOnly;noTransportOrOrderCredit",
  ),
  sanctionModelHash: hash(
    [
      sanctionContext,
      sanctionDecision,
      sanctionChanges,
      sanctionWriter,
      sanctionHttpResult,
      verifySanctionOperation,
      sanctionSequenceOperation,
      verifySanctionSequence,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  sanctionPlanHash: hash(
    JSON.stringify({
      SANCTIONS,
      ENFORCEMENT_IDS,
      SANCTION_WRITERS,
      SANCTION_COMPONENTS,
      SANCTION_STEPS,
    }),
  ),
  sanctionInterfaceHash: hash(
    "private:sanctionContext(op)->fixedHttpContext;sanctionDecision(op,before,c)->independentDecision;sanctionChanges(op,after,c,d)->independentAccountCaseSanctionLedgerAudit23;sanctionWriter(op,after,c)->fixedMembershipOrGate;sanctionHttpResult(op,actual,expected)->literalAssertionProjection;verifySanctionOperation(op,afterHandle,actualResult)->privateResult;sanctionSequenceOperation(fixedPlan,beforeHandle,bounds,sourceHandle,setup,bindings)->opaqueSequence;verifySanctionSequence(handle,orderedPrivateObservations)->privateResult;public:sanctionModelPlans/enforcementModelPlans/sanctionSequencePlans;fixedOnly;noRawGetterOrTransport",
  ),
  sanctionPrimitivesAvailable: true,
  enforcementPrimitivesAvailable: true,
  focusedSanctionSequenceAvailable: true,
  originalHttpLexicalAssertions: 41,
  originalHttpRetainedAssertions: 40,
  original219RetainedCredit: 0,
  currentSourceOwnStatusSupplementals: 1,
  http200HardeningCredit: 0,
  transitionPrimitivesAvailable: true,
  firstTwelveRaceModelsAvailable: true,
  httpTransitionSubsequencesAvailable: true,
  httpTransportAvailable: false,
  httpSequencesAvailable: false,
  preSanctionPrefixAvailable: true,
  preSanctionSignupAvailable: false,
  preSanctionSuffixAvailable: false,
  preSanctionLabels: 24,
  preSanctionPostSignupModels: 23,
  preSanctionObservations: PRE_SANCTION_STEPS.length,
  preSanctionDescriptionHash: hash(
    JSON.stringify(describeModelPlan(httpTransitionPlans[PRE_SANCTION_ID])),
  ),
  preSanctionPlanHash: hash(
    JSON.stringify({
      PRE_SANCTION_LABELS,
      PRE_SANCTION_STEPS,
      PRE_SANCTION_COUNTS,
    }),
  ),
  preSanctionModelHash: hash(
    [
      preSanctionStart,
      preSanctionOperation,
      preSanctionContext,
      preSanctionProjection,
      verifyPreSanctionPrefix,
      preSanctionTerminal,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  preSanctionInterfaceHash: hash(
    "private:preSanctionStart(beforeHandle,bounds,fixedSetup)->validatedFourSourceSubjects;preSanctionOperation(fixedPlan,beforeHandle,bounds,sourceHandle,setup,sixFreshBindings)->opaquePrefix;verifyPreSanctionPrefix(prefixHandle,44ExactIdObservations)->opaqueTerminal;preSanctionTerminal(prefix,finalHandle)->privateBoundTerminal(nextSource201,membershipOnce);public:httpTransitionPlans.pre-sanction-prefix;finiteDescriptionsOnly;signup/JWT/ACL/transport/whole39/suffixUnavailable;noCasePass",
  ),
  retainedHttpStaticCompositionAvailable: true,
  retainedHttpActualCasesComplete: false,
  retainedHttpObservations:
    PRE_SANCTION_STEPS.length + FINAL_SUFFIX_STEPS.length,
  retainedHttpMappingHash: hash(JSON.stringify(FINAL_HTTP_MAPPING)),
  retainedHttpPlanHash: hash(
    JSON.stringify({ FINAL_HTTP_ID, FINAL_SUFFIX_ID, FINAL_SUFFIX_STEPS }),
  ),
  retainedHttpModelHash: hash(
    [
      finalSuffixOperation,
      finalSuffixContext,
      verifyFinalSuffix,
      finalHttpTerminal,
      retainedHttpOperation,
      verifyRetainedHttp,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  retainedHttpDescriptionHash: hash(
    JSON.stringify(describeModelPlan(httpTransitionPlans[FINAL_HTTP_ID])),
  ),
  retainedHttpInterfaceHash: hash(
    "private:finalSuffixOperation(fixedSuffixPlan,opaqueValidatedPrefixTerminal,fourFreshSuffixBindings)->opaqueSuffix;verifyFinalSuffix(suffixHandle,18ExactIdObservations)->opaqueFinal;retainedHttpOperation(fixedWholePlan,before,bounds,source,fixedSetup,sixPrefixBindings,fourSuffixBindings)->opaqueWhole;verifyRetainedHttp(wholeHandle,62ExactIdObservations)->opaqueFinal;finalHttpTerminalsPrivate;noRawGetter;noAuth/JWT/ACL/HTTP/originalCaseCredit",
  ),
  racesAvailable: false,
  plannedHttpCases: HTTP_IDS.length,
  plannedRaces: RACES.length,
  laterOperationsAvailable: false,
  readinessAvailable: true,
  currentReadinessFixtureAvailable: true,
  currentReadinessModelHash: hash(
    [
      currentReadinessNoSeven,
      currentReadinessSubject,
      currentReadinessSource,
      currentReadinessFixture,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  currentReadinessDescriptionHash: hash(
    JSON.stringify(CURRENT_READINESS_DESCRIPTION),
  ),
  currentReadinessPrivateInterfaceHash: hash(
    "private:currentReadinessFixture(fixedExistingEarlySourceBefore,observedReady,boundedWindow,exactSourceOnlyHandle)->opaqueValidatedActorImmutableHostFrame;full54;noReportOrTransport",
  ),
  currentReportModelHash: hash(
    [
      currentReportOperationForPlan,
      currentReportOperation,
      detailFirstCurrentReportOperation,
      currentReportRollback,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  currentReportDescriptionHash: hash(
    JSON.stringify(CURRENT_REPORT_DESCRIPTION),
  ),
  currentReportPrivateInterfaceHash: hash(
    "private:currentReportOperation(opaqueValidatedReadiness,observedAfter,boundedWindow,observedReceipt)->opaqueFirstReport;detailFirstCurrentReportOperation(opaqueValidatedReadiness,observedAfter,boundedWindow,observedReceipt[,privateCommittedBefore])->opaqueSecondReport;currentReportRollback(opaqueQualifiedUncommittedReport,observedRollback)->opaqueKnownReadyBefore;literalActorHostModeCategoryNarrativeTwoRequests;independentReadyFramesOrSequencedCommit;full54;noAuth/JWT/ACL/HTTP/provider/raceCredit",
  ),
  currentRaceSourceOrdersAvailable: true,
  currentRaceDescriptionHash: hash(JSON.stringify(CURRENT_RACE_DESCRIPTION)),
  currentRaceModelHash: hash(
    [currentRaceDetail, currentRaceReport2, currentRaceOrdinaryShutdown]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  currentRacePrivateInterfaceHash: hash(
    "private:fixed-current-report-first->audited-detail-1->audited-detail-2->fixed-detail-first-report->ordinary-off;opaquePrivateFrames;full54EachCommit;twoSourceOrdersOnly;blockFirstUnavailable;noActualOrderOrPermissionCredit",
  ),
  currentRaceShutdownAvailable: true,
  retainedBlockStaticAvailable: true,
  retainedBlockDescriptionHash: hash(
    JSON.stringify(RETAINED_BLOCK_DESCRIPTION),
  ),
  retainedBlockModelHash: hash(
    [
      retainedBlockJoinedFixture,
      retainedBlockFirst,
      retainedBlockQueue,
      retainedBlockTeardown,
    ]
      .map((fn) => fn.toString())
      .join("\n"),
  ),
  retainedBlockPrivateInterfaceHash: hash(
    "private:ordinary-off-opaque->separateJoinedSourceFixture->blockFirst->auditedQueue->evidencePreservingGateTeardown;fixedActorHostTarget;full54Each;noOrdinaryJoinOrActualOrderOrPermissionCredit",
  ),
  retainedTeardownAvailable: true,
  runtimeCredit: 0,
  providerCredit: 0,
  permissionCredit: 0,
});
// There is no callable capture, emitter, census, lifecycle or transport API here.
export function moderationContact() {
  const error = new Error("Moderation contact unavailable");
  Object.defineProperty(error, "stack", {
    value: "Error: Moderation contact unavailable",
    configurable: false,
    writable: false,
  });
  throw Object.freeze(error);
}
function campusFor(before, email) {
  const rows = before["public.universities"].filter(
    (r) =>
      r.slug === "unc-chapel-hill" &&
      r.active &&
      r.allowed_email_domains.includes(email.split("@")[1].toLowerCase()),
  );
  check(rows.length === 1);
  return rows[0].id;
}
function blankProfile(id, now) {
  return {
    user_id: id,
    real_name: null,
    graduation_year: null,
    major: null,
    bio: null,
    primary_photo_path: null,
    is_complete: false,
    created_at: now,
    interests: [],
    down_to_do: [],
    favorite_music: null,
    favorite_foods: null,
    weird_fact: null,
    prompts: [],
    instagram: null,
    additional_photo_paths: [],
    revision: 0,
  };
}
function member(id, campus, confirmed, created) {
  return {
    user_id: id,
    university_id: campus,
    verified_at: confirmed,
    verification_email: null,
    created_at: created,
  };
}
function insertion(before, table, rows) {
  for (const row of rows) keys(row, SCHEMA[table]);
  return [...before[table].map(clone), ...rows];
}
function replace(before, table, predicate, transform) {
  check(before[table].filter(predicate).length === 1);
  return before[table].map((row) =>
    predicate(row) ? transform(row) : clone(row),
  );
}
function added(before, after, table, predicate, count) {
  const rows = after[table].filter(predicate);
  check(rows.length === count);
  check(before[table].filter(predicate).length === 0);
  check(after[table].length === before[table].length + count);
  rows.forEach((r) => keys(r, SCHEMA[table]));
  return rows;
}
function find(raw, table, predicate) {
  const rows = raw[table].filter(predicate);
  check(rows.length === 1);
  return rows[0];
}
function derive(before, changed) {
  const output = {};
  for (const table of TABLES)
    output[table] = Object.hasOwn(changed, table)
      ? changed[table]
      : clone(before[table]);
  return output;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
function unorderedRows(rows) {
  return rows.slice().sort((a, b) => {
    const x = JSON.stringify(canonical(a)),
      y = JSON.stringify(canonical(b));
    return x < y ? -1 : x > y ? 1 : 0;
  });
}
function assertExact(
  beforeHandle,
  afterHandle,
  changed,
  actualResult,
  intendedResult,
) {
  const before = own(snapshots, beforeHandle),
    after = own(snapshots, afterHandle);
  const expected = derive(before, changed);
  for (const table of TABLES)
    equal(unorderedRows(after[table]), unorderedRows(expected[table]));
  equal(actualResult, intendedResult);
  return opaque(
    results,
    freeze({ result: clone(actualResult), expected: freeze(expected) }),
  );
}
// Private extension seam: fixed operation handle -> independent changed rows ->
// exact54/result verification. Later same-module authors may add named builders;
// missing family/context never resolves to a zero-operation plan.
function operation(planHandle, beforeHandle, bounds, sourceHandle, context) {
  const plan = own(plans, planHandle);
  own(snapshots, beforeHandle);
  own(sources, sourceHandle);
  return opaque(
    operations,
    freeze({
      id: plan.id,
      beforeHandle,
      bounds,
      context: freeze(clone(context)),
    }),
  );
}
function provisionSql(op, after) {
  const before = own(snapshots, op.beforeHandle),
    authRows = [],
    accounts = [],
    profiles = [],
    memberships = [];
  const candidates = added(
    before,
    after,
    "auth.users",
    (r) => SQL_SUBJECTS.some((s) => SQL_IDS[s] === r.id),
    4,
  );
  let tx;
  for (const [index, subject] of SQL_SUBJECTS.entries()) {
    const id = SQL_IDS[subject],
      email = `moderation-race-${index + 1}@unc.edu`;
    const row = candidates.find((r) => r.id === id);
    check(row);
    const now = bindTime(
      "transaction_timestamp",
      row.email_confirmed_at,
      op.bounds,
    );
    if (tx === undefined) tx = now;
    else equal(tx, now);
    authRows.push({
      id,
      email,
      email_confirmed_at: now,
      deleted_at: null,
      raw_user_meta_data: null,
      raw_app_meta_data: null,
    });
    accounts.push({ id, status: "active", created_at: now });
    profiles.push(blankProfile(id, now));
    const membership = member(id, campusFor(before, email), now, now);
    membership.verification_email = email;
    memberships.push(membership);
  }
  return {
    "auth.users": insertion(before, "auth.users", authRows),
    "public.accounts": insertion(before, "public.accounts", accounts),
    "public.profiles": insertion(before, "public.profiles", profiles),
    "public.university_memberships": insertion(
      before,
      "public.university_memberships",
      memberships,
    ),
  };
}
function provisionHttp(op, after) {
  const before = own(snapshots, op.beforeHandle),
    c = op.context;
  keys(c, ["ordinal", "submittedEmail", "responseId"]);
  check(Number.isInteger(c.ordinal) && c.ordinal >= 0 && c.ordinal < 4);
  check(
    /^moderation-http-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}@unc\.edu$/.test(
      c.submittedEmail,
    ),
  );
  const rows = added(
    before,
    after,
    "auth.users",
    (r) => r.email === c.submittedEmail.toLowerCase(),
    1,
  );
  const id = bindUuid("go_uuid_v4", rows[0].id, before, new Set());
  equal(id, c.responseId);
  const account = added(
    before,
    after,
    "public.accounts",
    (r) => r.id === id,
    1,
  )[0];
  added(before, after, "public.profiles", (r) => r.user_id === id, 1);
  const now = bindTime("transaction_timestamp", account.created_at, op.bounds);
  return {
    "auth.users": insertion(before, "auth.users", [
      {
        id,
        email: c.submittedEmail.toLowerCase(),
        email_confirmed_at: null,
        deleted_at: null,
        raw_user_meta_data: c.ordinal === 1 ? { role: "admin" } : {},
        raw_app_meta_data: { provider: "email", providers: ["email"] },
      },
    ]),
    "public.accounts": insertion(before, "public.accounts", [
      { id, status: "active", created_at: now },
    ]),
    "public.profiles": insertion(before, "public.profiles", [
      blankProfile(id, now),
    ]),
  };
}
function confirmHttp(op, after) {
  const before = own(snapshots, op.beforeHandle),
    c = op.context;
  keys(c, ["id"]);
  const old = find(before, "auth.users", (r) => r.id === c.id);
  check(old.email_confirmed_at === null);
  equal(old.raw_app_meta_data, { provider: "email", providers: ["email"] });
  const row = find(after, "auth.users", (r) => r.id === c.id);
  const now = bindTime(
    "transaction_timestamp",
    row.email_confirmed_at,
    op.bounds,
  );
  const membership = member(c.id, campusFor(before, old.email), now, now);
  membership.verification_email = old.email.toLowerCase();
  check(
    !before["public.university_memberships"].some((r) => r.user_id === c.id),
  );
  return {
    "auth.users": replace(
      before,
      "auth.users",
      (r) => r.id === c.id,
      (r) => ({ ...r, email_confirmed_at: now }),
    ),
    "public.university_memberships": insertion(
      before,
      "public.university_memberships",
      [membership],
    ),
  };
}
// Internal Storage seam for1a3; no readiness plan or public Storage authority.
function syntheticStorageRow(
  before,
  after,
  subject,
  path,
  bounds,
  sourceHandle,
  used,
) {
  own(sources, sourceHandle);
  check(path === `${subject}/primary.png`);
  find(before, "public.accounts", (r) => r.id === subject);
  const actual = added(
    before,
    after,
    "storage.objects",
    (r) => r.bucket_id === "profile-photos" && r.name === path,
    1,
  )[0];
  const id = bindUuid("database_uuid", actual.id, before, used);
  const now = bindTime("transaction_timestamp", actual.created_at, bounds);
  equal(actual.updated_at, now);
  equal(actual.last_accessed_at, now);
  return {
    id,
    bucket_id: "profile-photos",
    name: path,
    owner: null,
    created_at: now,
    updated_at: now,
    last_accessed_at: now,
    metadata: null,
    path_tokens: path.split("/"),
    version: null,
    owner_id: subject,
    user_metadata: null,
    archived_at: null,
    is_delete_marker: false,
    is_versioned: false,
  };
}
function setupContext(op) {
  const c = op.context;
  if (Object.keys(c).length === 0) return { ...SQL_IDS, lane: "sql" };
  keys(c, [
    "lane",
    "actor",
    "reporter",
    "target",
    "second",
    "report",
    "selfFiledReport",
    "selfTargetReport",
    "ownHangoutReport",
    "hangout",
  ]);
  check(c.lane === "http");
  const before = own(snapshots, op.beforeHandle);
  const subjects = [c.actor, c.reporter, c.target, c.second];
  check(new Set(subjects).size === 4);
  for (const [i, id] of subjects.entries()) {
    const row = find(before, "auth.users", (r) => r.id === id);
    equal(row.raw_user_meta_data, i === 1 ? { role: "admin" } : {});
    equal(row.raw_app_meta_data, { provider: "email", providers: ["email"] });
    check(row.email_confirmed_at !== null && row.deleted_at === null);
  }
  const fixedIds = [
    c.report,
    c.selfFiledReport,
    c.selfTargetReport,
    c.ownHangoutReport,
    c.hangout,
  ];
  check(new Set([...subjects, ...fixedIds]).size === 9);
  for (const id of fixedIds)
    check(
      typeof id === "string" &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          id,
        ),
    );
  return c;
}
function initialRoles(op, after) {
  const b = own(snapshots, op.beforeHandle),
    c = setupContext(op);
  const rows = added(
    b,
    after,
    "public.platform_roles",
    (r) => [c.actor, c.second].includes(r.user_id),
    2,
  );
  let tx;
  const intended = [
    [c.actor, "moderator"],
    [c.second, "admin"],
  ].map(([user_id, role]) => {
    const row = rows.find((r) => r.user_id === user_id);
    check(row);
    const now = bindTime("transaction_timestamp", row.created_at, op.bounds);
    if (tx === undefined) tx = now;
    else equal(tx, now);
    return { user_id, role, created_at: now };
  });
  return {
    "public.platform_roles": insertion(b, "public.platform_roles", intended),
  };
}
function initialReports(op, after) {
  const b = own(snapshots, op.beforeHandle),
    c = setupContext(op);
  const seeds =
    c.lane === "sql"
      ? [
          [c.report, c.reporter, c.target, "harassment", null],
          [c.report2, c.reporter, c.target, "harassment", null],
          [c.report3, c.reporter, c.target, "harassment", null],
        ]
      : [
          [c.report, c.reporter, c.target, "other", "Local allegation"],
          [c.selfFiledReport, c.actor, c.target, "harassment", null],
          [c.selfTargetReport, c.reporter, c.actor, "harassment", null],
        ];
  const candidates = added(
    b,
    after,
    "private.safety_reports",
    (r) => seeds.some((s) => s[0] === r.id),
    3,
  );
  const rows = seeds.map(
    ([id, reporter_id, target_id, category, narrative]) => {
      const row = candidates.find((r) => r.id === id);
      check(row);
      return {
        id,
        submitted_at: bindTime("clock_timestamp", row.submitted_at, op.bounds),
        reporter_id,
        target_type: "user",
        target_id,
        category,
        narrative,
        provenance_kind: "current_people",
        provenance_ref_id: target_id,
      };
    },
  );
  return {
    "private.safety_reports": insertion(b, "private.safety_reports", rows),
  };
}
function initialHangout(op, after) {
  const b = own(snapshots, op.beforeHandle),
    c = setupContext(op);
  const host = c.lane === "sql" ? c.target : c.actor;
  const auth = find(b, "auth.users", (r) => r.id === host),
    campus = campusFor(b, auth.email);
  const h = added(b, after, "public.hangouts", (r) => r.id === c.hangout, 1)[0];
  // starts_at is independently constrained to the original transaction now()+1h;
  // it is not treated as a free observed-after timestamp/default.
  const tx = preciseTime(h.starts_at) - 3_600_000_000n;
  check(tx >= op.bounds.low && tx <= op.bounds.high);
  const now = bindTime("clock_timestamp", h.created_at, op.bounds);
  const updated = bindTime("clock_timestamp", h.updated_at, op.bounds);
  const p = added(
    b,
    after,
    "public.hangout_participants",
    (r) => r.hangout_id === c.hangout && r.account_id === host,
    1,
  )[0];
  const joined = bindTime("clock_timestamp", p.joined_at, op.bounds),
    participantUpdated = bindTime("clock_timestamp", p.updated_at, op.bounds);
  const reportId = c.lane === "sql" ? c.hangoutReport : c.ownHangoutReport;
  const r = added(
    b,
    after,
    "private.safety_reports",
    (r) => r.id === reportId,
    1,
  )[0];
  const submitted =
    c.lane === "sql"
      ? preciseTime(r.submitted_at) + 86_400_000_000n
      : preciseTime(r.submitted_at);
  check(submitted >= op.bounds.low && submitted <= op.bounds.high);
  return {
    "public.hangouts": insertion(b, "public.hangouts", [
      {
        id: c.hangout,
        university_id: campus,
        host_id: host,
        title: "Local fixture",
        description: null,
        starts_at: h.starts_at,
        ends_at: null,
        status: "published",
        joining_state: "open",
        visibility: "campus",
        public_place: "Approximate place",
        public_latitude: 35,
        public_longitude: -79,
        campus_zone: null,
        location_precision: "approximate_area",
        revision: 1,
        created_at: now,
        updated_at: updated,
      },
    ]),
    "public.hangout_participants": insertion(b, "public.hangout_participants", [
      {
        hangout_id: c.hangout,
        account_id: host,
        state: "joined",
        joined_at: joined,
        left_at: null,
        removed_at: null,
        updated_at: participantUpdated,
      },
    ]),
    "private.safety_reports": insertion(b, "private.safety_reports", [
      {
        id: reportId,
        submitted_at: r.submitted_at,
        reporter_id: c.reporter,
        target_type: "hangout",
        target_id: c.hangout,
        category: "harassment",
        narrative: null,
        provenance_kind: "current_hangout",
        provenance_ref_id: c.hangout,
      },
    ]),
  };
}
function ordinaryShutdown(before) {
  check(before["private.pilot_availability"].length === 1);
  equal(
    before["private.pilot_capabilities"].map((r) => r.key).sort(),
    CAPABILITIES.slice().sort(),
  );
  return {
    "private.pilot_availability": before["private.pilot_availability"].map(
      (r) => ({ ...r, enabled: false }),
    ),
    "private.pilot_capabilities": before["private.pilot_capabilities"].map(
      (r) => ({ ...r, enabled: false }),
    ),
  };
}
function initialWriter(op, after) {
  const b = own(snapshots, op.beforeHandle),
    c = setupContext(op);
  switch (op.id) {
    case "moderation-enable":
    case "moderation-disable": {
      const names =
        op.id === "moderation-enable"
          ? ["private.moderation_feature_gate", "private.safety_feature_gate"]
          : ["private.moderation_feature_gate"];
      return Object.fromEntries(
        names.map((table) => [
          table,
          replace(
            b,
            table,
            (r) => r.singleton === true,
            () => ({ singleton: true, enabled: op.id === "moderation-enable" }),
          ),
        ]),
      );
    }
    case "ordinary-shutdown":
      return ordinaryShutdown(b);
    case "actor-suspend":
    case "actor-ban":
    case "actor-restore":
      return {
        "public.accounts": replace(
          b,
          "public.accounts",
          (r) => r.id === c.actor,
          (r) => ({
            ...r,
            status: {
              "actor-suspend": "suspended",
              "actor-ban": "banned",
              "actor-restore": "active",
            }[op.id],
          }),
        ),
      };
    case "actor-role-delete":
    case "target-role-delete": {
      const id = op.id === "actor-role-delete" ? c.actor : c.target;
      find(b, "public.platform_roles", (r) => r.user_id === id);
      return {
        "public.platform_roles": b["public.platform_roles"]
          .filter((r) => r.user_id !== id)
          .map(clone),
      };
    }
    case "actor-role-restore":
    case "target-role-insert": {
      const user_id = op.id === "actor-role-restore" ? c.actor : c.target;
      const row = added(
        b,
        after,
        "public.platform_roles",
        (r) => r.user_id === user_id,
        1,
      )[0];
      return {
        "public.platform_roles": insertion(b, "public.platform_roles", [
          {
            user_id,
            role: "moderator",
            created_at: bindTime(
              "transaction_timestamp",
              row.created_at,
              op.bounds,
            ),
          },
        ]),
      };
    }
    case "second-downgrade":
      return {
        "public.platform_roles": replace(
          b,
          "public.platform_roles",
          (r) => r.user_id === c.second,
          (r) => ({ ...r, role: "moderator" }),
        ),
      };
    case "target-membership-delete":
      find(b, "public.university_memberships", (r) => r.user_id === c.target);
      return {
        "public.university_memberships": b["public.university_memberships"]
          .filter((r) => r.user_id !== c.target)
          .map(clone),
      };
    case "target-membership-restore": {
      const row = added(
        b,
        after,
        "public.university_memberships",
        (r) => r.user_id === c.target,
        1,
      )[0];
      const auth = find(b, "auth.users", (r) => r.id === c.target);
      const now = bindTime("transaction_timestamp", row.created_at, op.bounds);
      const membership = member(c.target, campusFor(b, auth.email), now, now);
      membership.verification_email = auth.email;
      return {
        "public.university_memberships": insertion(
          b,
          "public.university_memberships",
          [membership],
        ),
      };
    }
    default:
      throw new Error("Moderation model unavailable");
  }
}
function verifyOperation(operationHandle, afterHandle, actualResult) {
  const op = own(operations, operationHandle),
    after = own(snapshots, afterHandle);
  if (READ_IDS.includes(op.id))
    return verifyReadOperation(op, afterHandle, actualResult);
  if (
    Object.hasOwn(TRANSITIONS, op.id) ||
    Object.hasOwn(LOSS_READS, op.id) ||
    op.id === "race.detail-count"
  )
    return verifyTransitionOperation(op, afterHandle, actualResult);
  if (
    Object.hasOwn(SANCTIONS, op.id) ||
    ENFORCEMENT_IDS.includes(op.id) ||
    SANCTION_WRITERS.includes(op.id)
  )
    return verifySanctionOperation(op, afterHandle, actualResult);
  let changed;
  switch (op.id) {
    case "sql-auth-four":
      keys(op.context, []);
      changed = provisionSql(op, after);
      break;
    case "http-signup-one":
      changed = provisionHttp(op, after);
      break;
    case "http-confirm-one":
      changed = confirmHttp(op, after);
      break;
    case "initial-roles":
      changed = initialRoles(op, after);
      break;
    case "initial-reports":
      changed = initialReports(op, after);
      break;
    case "initial-hangout":
      changed = initialHangout(op, after);
      break;
    default:
      changed = initialWriter(op, after);
  }
  // SQL fixture batches return an independently fixed empty result. HTTP signup
  // binds exact response association privately; transport/JWT remains later work.
  if (op.id === "initial-roles") {
    const context = setupContext(op);
    assertEarlyOperator(after, context.actor);
    assertEarlyOperator(after, context.second);
  }
  const intended =
    op.id === "http-signup-one" ? { id: op.context.responseId } : "";
  return assertExact(
    op.beforeHandle,
    afterHandle,
    changed,
    actualResult,
    intended,
  );
}
// Source24 required lookups precede live gate/account/role authorization.
// No student admission, profile readiness or untrusted JWT metadata grants it.
function readActor(before, actor, jwtRole, isolation) {
  if (
    jwtRole !== "authenticated" ||
    isolation !== "read committed" ||
    actor === null
  )
    return false;
  const gate = before["private.moderation_feature_gate"].filter(
    (r) => r.singleton === true,
  );
  const account = before["public.accounts"].filter((r) => r.id === actor);
  const role = before["public.platform_roles"].filter(
    (r) => r.user_id === actor,
  );
  check(gate.length <= 1 && account.length <= 1 && role.length <= 1);
  return (
    gate.length === 1 &&
    account.length === 1 &&
    role.length === 1 &&
    gate[0].enabled === true &&
    account[0].status === "active" &&
    ["moderator", "admin"].includes(role[0].role)
  );
}
function readContext(op) {
  keys(op.context, ["setup", "input", "jwtRole", "isolation"]);
  const c = setupContext({ ...op, context: op.context.setup });
  const actor = op.id.startsWith("nonoperator.")
    ? c.reporter
    : op.id === "anonymous.queue"
      ? null
      : ["second-detail", "refresh-detail"].includes(op.id)
        ? c.second
        : c.actor;
  equal(op.context.jwtRole, actor === null ? "anon" : "authenticated");
  equal(op.context.isolation, "read committed");
  return {
    ...c,
    actor,
    input: op.context.input,
    jwtRole: op.context.jwtRole,
    isolation: op.context.isolation,
  };
}
function reportAllowed(before, actor, reportId) {
  const reports = before["private.safety_reports"].filter(
    (r) => r.id === reportId,
  );
  check(reports.length <= 1);
  if (reports.length === 0) return false;
  const r = reports[0];
  if (r.reporter_id === actor || r.target_id === actor) return false;
  if (r.target_type === "hangout") {
    const hosts = before["public.hangouts"].filter((h) => h.id === r.target_id);
    check(hosts.length <= 1);
    if (hosts[0]?.host_id === actor) return false;
  } else check(r.target_type === "user");
  // Missing/restricted/privileged targets remain readable. The action-only
  // target-role restriction does not apply to queue/detail.
  return true;
}
function queueRows(before, actor, input) {
  keys(input, ["p_after_submitted_at", "p_after_id", "p_limit"]);
  check(
    Number.isInteger(input.p_limit) &&
      input.p_limit >= 1 &&
      input.p_limit <= 24,
  );
  check((input.p_after_submitted_at === null) === (input.p_after_id === null));
  if (input.p_after_id !== null) {
    preciseTime(input.p_after_submitted_at);
    check(
      typeof input.p_after_id === "string" &&
        /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(input.p_after_id),
    );
  }
  const rows = before["private.safety_reports"]
    .filter((r) => {
      if (!reportAllowed(before, actor, r.id)) return false;
      if (input.p_after_id === null) return true;
      const a = preciseTime(r.submitted_at),
        b = preciseTime(input.p_after_submitted_at);
      return a < b || (a === b && r.id < input.p_after_id);
    })
    .sort((a, b) => {
      const at = preciseTime(a.submitted_at),
        bt = preciseTime(b.submitted_at);
      return at > bt
        ? -1
        : at < bt
          ? 1
          : a.id > b.id
            ? -1
            : a.id < b.id
              ? 1
              : 0;
    })
    .slice(0, input.p_limit);
  return rows.map((r) => {
    const cases = before["private.moderation_cases"].filter(
      (c) => c.report_id === r.id,
    );
    check(cases.length <= 1);
    return {
      report_id: r.id,
      submitted_at: r.submitted_at,
      target_type: r.target_type,
      target_id: r.target_id,
      reporter_id: r.reporter_id,
      category: r.category,
      case_state: cases[0]?.state ?? "open",
    };
  });
}
function detailRows(before, reportId) {
  const r = find(before, "private.safety_reports", (r) => r.id === reportId);
  const cases = before["private.moderation_cases"].filter(
    (c) => c.report_id === r.id,
  );
  check(cases.length <= 1);
  const c = cases[0];
  let status = null,
    campus = null,
    disabled = null;
  if (r.target_type === "user") {
    const accounts = before["public.accounts"].filter(
      (a) => a.id === r.target_id,
    );
    const members = before["public.university_memberships"].filter(
      (m) => m.user_id === r.target_id,
    );
    check(accounts.length <= 1 && members.length <= 1);
    if (accounts.length) {
      status = accounts[0].status;
      campus = members[0]?.university_id ?? null;
    }
  } else {
    check(r.target_type === "hangout");
    const targets = before["public.hangouts"].filter(
      (h) => h.id === r.target_id,
    );
    check(targets.length <= 1);
    if (targets.length) {
      status = targets[0].status;
      campus = targets[0].university_id;
      disabled = before["private.hangout_disables"].some(
        (d) => d.hangout_id === r.target_id,
      );
    }
  }
  return [
    {
      report_id: r.id,
      submitted_at: r.submitted_at,
      target_type: r.target_type,
      target_id: r.target_id,
      reporter_id: r.reporter_id,
      category: r.category,
      case_state: c?.state ?? "open",
      case_revision: c?.revision ?? 0,
      narrative: r.narrative,
      provenance_kind: r.provenance_kind,
      provenance_ref_id: r.provenance_ref_id,
      case_note: c?.note ?? null,
      disposition: c?.disposition ?? null,
      target_status: status ?? "unavailable",
      target_campus_id: campus,
      target_disabled: disabled,
    },
  ];
}
function readAudit(op, after, actor, kind, rows) {
  const before = own(snapshots, op.beforeHandle),
    table = "private.moderation_audit";
  check(["queue_read", "detail_read"].includes(kind));
  check(after[table].length === before[table].length + 1);
  const oldIds = new Set(before[table].map((r) => r.id));
  check(oldIds.size === before[table].length);
  const candidates = after[table].filter((r) => !oldIds.has(r.id));
  check(candidates.length === 1);
  const candidate = candidates[0];
  keys(candidate, SCHEMA[table]);
  const used = new Set();
  const id = bindUuid("database_uuid", candidate.id, before, used);
  const request_id = bindUuid(
    "database_uuid",
    candidate.request_id,
    before,
    used,
  );
  const occurred_at = bindTime(
    "clock_timestamp",
    candidate.occurred_at,
    op.bounds,
  );
  const row = {
    id,
    occurred_at,
    operator_id: actor,
    action: kind,
    report_id: kind === "detail_read" ? rows[0].report_id : null,
    subject_target_type: null,
    subject_target_id: null,
    subject_campus_id: null,
    request_id,
    previous_state: null,
    new_state: null,
    previous_revision: null,
    new_revision: null,
    reason: null,
    duplicate_report_id: null,
    page_report_ids:
      kind === "queue_read" ? rows.map((r) => r.report_id) : null,
    page_count: kind === "queue_read" ? rows.length : null,
    sanction_id: null,
    previous_account_status: null,
    new_account_status: null,
    hangout_disable_id: null,
    previous_hangout_disabled: null,
    new_hangout_disabled: null,
  };
  equal(candidate, row);
  return { [table]: insertion(before, table, [row]) };
}
function readDenial(op, before, c) {
  const denied = { code: "42501", message: "Moderation unavailable" };
  if (op.id.startsWith("private-rest.")) {
    check(c.lane === "http");
    keys(c.input, []);
    assertEarlyOperator(before, c.actor);
    return { status: 404 }; // Original assertion: no body/transport credit.
  }
  if (op.id === "anonymous.queue") {
    equal(c.input, {
      p_after_submitted_at: null,
      p_after_id: null,
      p_limit: 24,
    });
    check(!readActor(before, c.actor, c.jwtRole, c.isolation));
    return { execution: "unavailable" }; // Source ACL denial; HTTP401/403/404 remains transport work.
  }
  if (op.id === "gate-off.queue") {
    assertEarlyOperator(before, c.actor);
    equal(
      find(before, "private.moderation_feature_gate", (r) => r.singleton)
        .enabled,
      false,
    );
    equal(c.input, {
      p_after_submitted_at: null,
      p_after_id: null,
      p_limit: 24,
    });
    check(!readActor(before, c.actor, c.jwtRole, c.isolation));
    return denied;
  }
  if (op.id.startsWith("nonoperator.")) {
    check(c.lane === "http");
    equal(
      find(before, "public.accounts", (r) => r.id === c.actor).status,
      "active",
    );
    check(!before["public.platform_roles"].some((r) => r.user_id === c.actor));
    equal(
      find(before, "auth.users", (r) => r.id === c.actor).raw_user_meta_data,
      { role: "admin" },
    );
    equal(
      c.input,
      op.id.endsWith("queue")
        ? { p_after_submitted_at: null, p_after_id: null, p_limit: 24 }
        : { p_report_id: c.report },
    );
    check(!readActor(before, c.actor, c.jwtRole, c.isolation));
    return denied;
  }
  check(op.id.startsWith("conflict."));
  check(readActor(before, c.actor, c.jwtRole, c.isolation));
  assertEarlyOperator(before, c.actor);
  check(c.lane === "http");
  const reportId = op.id.includes("self-filed")
    ? c.selfFiledReport
    : op.id.includes("self-target")
      ? c.selfTargetReport
      : c.ownHangoutReport;
  const r = find(before, "private.safety_reports", (r) => r.id === reportId);
  if (op.id.includes("self-filed")) equal(r.reporter_id, c.actor);
  if (op.id.includes("self-target")) equal(r.target_id, c.actor);
  if (op.id.includes("own-hangout")) {
    equal(r.target_type, "hangout");
    equal(
      find(before, "public.hangouts", (h) => h.id === r.target_id).host_id,
      c.actor,
    );
  }
  check(!reportAllowed(before, c.actor, reportId));
  if (op.id.endsWith("detail")) equal(c.input, { p_report_id: reportId });
  else {
    keys(c.input, [
      "p_report_id",
      "p_request_id",
      "p_expected_revision",
      "p_action",
    ]);
    equal(c.input.p_report_id, reportId);
    equal(c.input.p_expected_revision, 0);
    equal(c.input.p_action, "start_review");
    bindUuid("client_uuid_v4", c.input.p_request_id, before, new Set());
  }
  return denied;
}
function auditCounts(snapshotHandle, setup) {
  const before = own(snapshots, snapshotHandle);
  // Private source-bound count components for later sequence composition.
  const c = setupContext({ beforeHandle: snapshotHandle, context: setup });
  const rows = before["private.moderation_audit"];
  return freeze({
    total: rows.length,
    startReview: rows.filter(
      (r) => r.report_id === c.report && r.action === "start_review",
    ).length,
    queueContainingReport: rows.filter(
      (r) =>
        r.action === "queue_read" &&
        Array.isArray(r.page_report_ids) &&
        r.page_report_ids.includes(c.report),
    ).length,
  });
}
function verifyReadOperation(op, afterHandle, actualResult) {
  const before = own(snapshots, op.beforeHandle),
    after = own(snapshots, afterHandle),
    c = readContext(op);
  if (!["queue", "detail", "second-detail", "refresh-detail"].includes(op.id))
    return assertExact(
      op.beforeHandle,
      afterHandle,
      {},
      actualResult,
      readDenial(op, before, c),
    );
  check(readActor(before, c.actor, c.jwtRole, c.isolation));
  assertEarlyOperator(before, c.actor);
  let rows, kind;
  if (op.id === "queue") {
    rows = queueRows(before, c.actor, c.input);
    kind = "queue_read";
  } else {
    equal(c.input, { p_report_id: c.report });
    check(reportAllowed(before, c.actor, c.report));
    rows = detailRows(before, c.report);
    kind = "detail_read";
  }
  return assertExact(
    op.beforeHandle,
    afterHandle,
    readAudit(op, after, c.actor, kind, rows),
    actualResult,
    rows,
  );
}
function transitionContext(op) {
  keys(op.context, ["setup", "input", "jwtRole", "isolation"]);
  const setup = setupContext({ ...op, context: op.context.setup });
  const fixed = TRANSITIONS[op.id];
  const actor = fixed ? setup[fixed[0]] : setup.actor;
  equal(op.context.jwtRole, "authenticated");
  equal(op.context.isolation, "read committed");
  check(
    op.id.startsWith("http.") ? setup.lane === "http" : setup.lane === "sql",
  );
  if (!fixed) equal(op.context.input, { p_report_id: setup.report });
  else {
    const i = op.context.input;
    const names = [
      "p_report_id",
      "p_request_id",
      "p_expected_revision",
      "p_action",
    ];
    keys(i, [
      ...names,
      ...(Object.hasOwn(i, "p_note") ? ["p_note"] : []),
      ...(Object.hasOwn(i, "p_duplicate_report_id")
        ? ["p_duplicate_report_id"]
        : []),
    ]);
    equal(i.p_report_id, setup[fixed[1]]);
    equal(i.p_expected_revision, fixed[3]);
    equal(i.p_action, fixed[4]);
    equal(i.p_note ?? null, fixed[5]);
    equal(i.p_duplicate_report_id ?? null, null);
    check(
      typeof i.p_request_id === "string" &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          i.p_request_id,
        ),
    );
    if (fixed[2] !== null) equal(i.p_request_id, fixed[2]);
    if (
      [
        "http.replay",
        "http.start-changed-retry",
        "http.start-changed-action-retry",
        "http.annotate-normalized-replay",
        "http.annotate-changed-body-retry",
        "http.suspended-retry",
        "http.banned-retry",
        "http.gate-retry",
        "race.case-replay-veto",
        "race.same-key-replay",
      ].includes(op.id)
    ) {
      const before = own(snapshots, op.beforeHandle);
      const prior = find(
        before,
        "private.moderation_requests",
        (r) => r.operator_id === actor && r.request_id === i.p_request_id,
      );
      equal(prior.report_id, i.p_report_id);
      equal(prior.result_state, "in_review");
      equal(
        prior.result_revision,
        [
          "http.annotate-normalized-replay",
          "http.annotate-changed-body-retry",
        ].includes(op.id)
          ? 2
          : 1,
      );
    }
  }
  return {
    ...setup,
    actor,
    input: op.context.input,
    jwtRole: op.context.jwtRole,
    isolation: op.context.isolation,
  };
}
function transitionDecision(op, before, c) {
  const denied = { code: "42501", message: "Moderation unavailable" };
  // Original SQL uses psql -qAt row text; HTTP uses the exact RPC-body array.
  // Stream framing/marker separation stays unavailable pending transport1b.
  const receipt = (state, revision) =>
    op.id.startsWith("race.")
      ? `${state}|${revision}`
      : [{ case_state: state, revision }];
  const loss = LOSS_READS[op.id];
  if (loss) {
    if (loss === "gate")
      equal(
        find(before, "private.moderation_feature_gate", (r) => r.singleton)
          .enabled,
        false,
      );
    else if (loss === "role")
      check(
        !before["public.platform_roles"].some((r) => r.user_id === c.actor),
      );
    else
      equal(
        find(before, "public.accounts", (r) => r.id === c.actor).status,
        loss,
      );
    check(!readActor(before, c.actor, c.jwtRole, c.isolation));
    return { result: denied, changed: {} };
  }
  const i = c.input;
  if (op.id === "http.suspended-retry")
    equal(
      find(before, "public.accounts", (r) => r.id === c.actor).status,
      "suspended",
    );
  if (op.id === "http.banned-retry")
    equal(
      find(before, "public.accounts", (r) => r.id === c.actor).status,
      "banned",
    );
  if (op.id === "http.gate-retry")
    equal(
      find(before, "private.moderation_feature_gate", (r) => r.singleton)
        .enabled,
      false,
    );
  if (["race.target-role", "race.case-replay-veto"].includes(op.id))
    check(before["public.platform_roles"].some((r) => r.user_id === c.target));
  // Live authorization and target privilege veto precede the retry ledger.
  if (
    !readActor(before, c.actor, c.jwtRole, c.isolation) ||
    !reportAllowed(before, c.actor, i.p_report_id)
  )
    return { result: denied, changed: {} };
  assertEarlyOperator(before, c.actor);
  const report = find(
    before,
    "private.safety_reports",
    (r) => r.id === i.p_report_id,
  );
  if (
    report.target_type === "user" &&
    before["public.platform_roles"].some((r) => r.user_id === report.target_id)
  )
    return { result: denied, changed: {} };
  const note = i.p_note == null ? null : i.p_note.trim() || null;
  // jsonb_build_array(... )::text uses comma-space and JSON strings. All
  // permitted finite revisions are integers, so no numeric rendering inference.
  const payload = [
    i.p_report_id,
    i.p_expected_revision,
    i.p_action,
    note,
    i.p_duplicate_report_id ?? null,
  ];
  const fingerprint = createHash("md5")
    .update(`[${payload.map((v) => JSON.stringify(v)).join(", ")}]`)
    .digest("hex");
  const requests = before["private.moderation_requests"].filter(
    (r) => r.operator_id === c.actor && r.request_id === i.p_request_id,
  );
  check(requests.length <= 1);
  if (
    [
      "http.replay",
      "http.start-changed-retry",
      "http.start-changed-action-retry",
      "http.annotate-normalized-replay",
      "http.annotate-changed-body-retry",
      "race.same-key-replay",
    ].includes(op.id)
  )
    check(requests.length === 1);
  if (
    [
      "http.start",
      "http.annotate",
      "http.stale",
      "http.reopen",
      "race.case",
      "race.first-operator",
      "race.second-operator",
      "race.same-key-first",
      "race.no-campus",
      "race.current-campus",
    ].includes(op.id)
  )
    check(requests.length === 0);
  if (requests.length) {
    const prior = requests[0];
    return prior.fingerprint === fingerprint
      ? {
          changed: {},
          result: receipt(prior.result_state, prior.result_revision),
        }
      : { changed: {}, result: denied };
  }
  bindUuid("client_uuid_v4", i.p_request_id, before, new Set());
  const cases = before["private.moderation_cases"].filter(
    (r) => r.report_id === report.id,
  );
  check(cases.length <= 1);
  const old = cases[0],
    oldState = old?.state ?? "open",
    oldRevision = old?.revision ?? 0;
  if (
    oldRevision !== i.p_expected_revision ||
    oldState !==
      (i.p_action === "start_review"
        ? "open"
        : i.p_action === "reopen"
          ? "closed"
          : "in_review")
  )
    return { result: denied, changed: {} };
  const revision = oldRevision + 1;
  if (op.id === "race.no-campus")
    check(
      !before["public.university_memberships"].some(
        (r) => r.user_id === c.target,
      ),
    );
  if (op.id === "race.current-campus")
    find(
      before,
      "public.university_memberships",
      (r) => r.user_id === c.target,
    );
  const row = {
    report_id: report.id,
    state: "in_review",
    revision,
    note,
    disposition: null,
    duplicate_report_id: null,
    sanction_id: null,
    hangout_disable_id: null,
  };
  const request = {
    operator_id: c.actor,
    request_id: i.p_request_id,
    fingerprint,
    report_id: report.id,
    result_state: "in_review",
    result_revision: revision,
  };
  return {
    result: receipt("in_review", revision),
    report,
    note,
    oldState,
    oldRevision,
    changed: {
      "private.moderation_cases": old
        ? replace(
            before,
            "private.moderation_cases",
            (r) => r.report_id === report.id,
            () => row,
          )
        : insertion(before, "private.moderation_cases", [row]),
      "private.moderation_requests": insertion(
        before,
        "private.moderation_requests",
        [request],
      ),
    },
  };
}
function transitionAudit(op, after, c, decision) {
  const before = own(snapshots, op.beforeHandle),
    table = "private.moderation_audit";
  const oldIds = new Set(before[table].map((r) => r.id));
  check(oldIds.size === before[table].length);
  const candidates = added(before, after, table, (r) => !oldIds.has(r.id), 1);
  const candidate = candidates[0];
  keys(candidate, SCHEMA[table]);
  const used = new Set([c.input.p_request_id]);
  const id = bindUuid("database_uuid", candidate.id, before, used);
  const occurred_at = bindTime(
    "clock_timestamp",
    candidate.occurred_at,
    op.bounds,
  );
  const r = decision.report;
  const campuses =
    r.target_type === "user"
      ? before["public.university_memberships"].filter(
          (m) => m.user_id === r.target_id,
        )
      : before["public.hangouts"].filter((h) => h.id === r.target_id);
  check(campuses.length <= 1);
  const row = {
    id,
    occurred_at,
    operator_id: c.actor,
    action: c.input.p_action,
    report_id: r.id,
    subject_target_type: r.target_type,
    subject_target_id: r.target_id,
    subject_campus_id: campuses[0]?.university_id ?? null,
    request_id: c.input.p_request_id,
    previous_state: decision.oldState,
    new_state: "in_review",
    previous_revision: decision.oldRevision,
    new_revision: decision.oldRevision + 1,
    reason: decision.note,
    duplicate_report_id: null,
    page_report_ids: null,
    page_count: null,
    sanction_id: null,
    previous_account_status: null,
    new_account_status: null,
    hangout_disable_id: null,
    previous_hangout_disabled: null,
    new_hangout_disabled: null,
  };
  equal(candidate, row);
  return { [table]: insertion(before, table, [row]) };
}
function verifyTransitionOperation(op, afterHandle, actualResult) {
  const before = own(snapshots, op.beforeHandle),
    after = own(snapshots, afterHandle),
    c = transitionContext(op);
  if (op.id === "race.detail-count") {
    check(readActor(before, c.actor, c.jwtRole, c.isolation));
    assertEarlyOperator(before, c.actor);
    check(reportAllowed(before, c.actor, c.report));
    const rows = detailRows(before, c.report);
    return assertExact(
      op.beforeHandle,
      afterHandle,
      readAudit(op, after, c.actor, "detail_read", rows),
      actualResult,
      "1",
    );
  }
  const decision = transitionDecision(op, before, c);
  const changed = {
    ...decision.changed,
    ...(decision.report ? transitionAudit(op, after, c, decision) : {}),
  };
  return assertExact(
    op.beforeHandle,
    afterHandle,
    changed,
    actualResult,
    decision.result,
  );
}
// Same-module private seam only; all source roles/actions/revisions are finite.
function sanctionContext(op) {
  keys(op.context, ["setup", "input", "jwtRole", "isolation"]);
  const c = setupContext({ ...op, context: op.context.setup });
  check(c.lane === "http");
  equal(op.context.jwtRole, "authenticated");
  equal(op.context.isolation, "read committed");
  const fixed = SANCTIONS[op.id],
    input = op.context.input;
  if (fixed) {
    keys(input, [
      "p_report_id",
      "p_request_id",
      "p_expected_case_revision",
      "p_action",
      "p_reason",
    ]);
    equal(input.p_report_id, c.report);
    equal(input.p_expected_case_revision, fixed[1]);
    equal(input.p_action, fixed[2]);
    equal(input.p_reason, fixed[3]);
    check(
      typeof input.p_request_id === "string" &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          input.p_request_id,
        ),
    );
    if (fixed[4]) {
      const prior = find(
        own(snapshots, op.beforeHandle),
        "private.moderation_requests",
        (r) =>
          r.operator_id === c[fixed[0]] && r.request_id === input.p_request_id,
      );
      equal(prior.report_id, c.report);
      equal(prior.result_state, "closed");
      equal(prior.result_revision, fixed[1] + 1);
      if (op.id === "sanction.changed-retry") {
        // This label retries the original Local decision, never a saved Changed.
        const originalFingerprint =
          "account:" +
          createHash("md5")
            .update(
              `[${[c.report, 2, "suspend", "Local decision"].map((v) => JSON.stringify(v)).join(", ")}]`,
            )
            .digest("hex");
        equal(prior.fingerprint, originalFingerprint);
        const saved = find(
          own(snapshots, op.beforeHandle),
          "private.account_sanctions",
          (r) =>
            r.operator_id === c.actor &&
            r.request_id === input.p_request_id &&
            r.report_id === c.report,
        );
        equal(saved.subject_type, "user");
        equal(saved.subject_id, c.target);
        equal(saved.action, "suspend");
        equal(saved.reason, "Local decision");
        equal(saved.previous_status, "active");
        equal(saved.new_status, "suspended");
      }
    }
  } else if (op.id === "MODHTTP.account-enforcement.report") {
    keys(input, ["p_request_id", "p_target_mode", "p_target_id", "p_category"]);
    equal(input.p_target_mode, "user");
    equal(input.p_target_id, c.reporter);
    equal(input.p_category, "harassment");
    bindUuid(
      "client_uuid_v4",
      input.p_request_id,
      own(snapshots, op.beforeHandle),
      new Set(),
    );
  } else equal(input, {});
  return {
    ...c,
    actor: fixed
      ? c[fixed[0]]
      : op.id === "MODHTTP.private-sanction-rest"
        ? c.actor
        : c.target,
    input,
    jwtRole: op.context.jwtRole,
    isolation: op.context.isolation,
  };
}
function sanctionDecision(op, before, c) {
  if (
    ["sanction.moderator-ban", "sanction.admin-downgrade-retry"].includes(op.id)
  )
    equal(
      find(before, "public.platform_roles", (r) => r.user_id === c.actor).role,
      "moderator",
    );
  const i = c.input,
    fixed = SANCTIONS[op.id],
    denied = { code: "42501", message: "Moderation unavailable" };
  // Live gate/account/role/conflict/target-role and required ban role FIRST.
  if (
    !readActor(before, c.actor, c.jwtRole, c.isolation) ||
    !reportAllowed(before, c.actor, c.report)
  )
    return { result: denied, changed: {} };
  assertEarlyOperator(before, c.actor);
  const r = find(before, "private.safety_reports", (r) => r.id === c.report);
  const targets = before["public.accounts"].filter((r) => r.id === c.target);
  if (
    r.target_type !== "user" ||
    r.target_id !== c.target ||
    targets.length !== 1 ||
    before["public.platform_roles"].some((r) => r.user_id === c.target) ||
    (i.p_action === "ban" &&
      find(before, "public.platform_roles", (r) => r.user_id === c.actor)
        .role !== "admin")
  )
    return { result: denied, changed: {} };
  const reason = i.p_reason.trim(),
    fingerprint =
      "account:" +
      createHash("md5")
        .update(
          `[${[c.report, i.p_expected_case_revision, i.p_action, reason].map((v) => JSON.stringify(v)).join(", ")}]`,
        )
        .digest("hex");
  const requests = before["private.moderation_requests"].filter(
    (r) => r.operator_id === c.actor && r.request_id === i.p_request_id,
  );
  check(requests.length <= 1);
  if (fixed[4]) check(requests.length === 1);
  else check(requests.length === 0);
  if (requests.length) {
    const prior = requests[0];
    if (prior.fingerprint !== fingerprint)
      return { result: denied, changed: {} };
    const saved = before["private.account_sanctions"].filter(
      (r) =>
        r.operator_id === c.actor &&
        r.request_id === i.p_request_id &&
        r.report_id === c.report,
    );
    check(saved.length <= 1);
    if (saved.length !== 1) return { result: denied, changed: {} };
    equal(
      saved[0].new_status,
      i.p_action === "suspend" ? "suspended" : "banned",
    );
    return {
      changed: {},
      result: [
        {
          case_state: prior.result_state,
          revision: prior.result_revision,
          account_status: saved[0].new_status,
        },
      ],
    };
  }
  bindUuid("client_uuid_v4", i.p_request_id, before, new Set());
  const cases = before["private.moderation_cases"].filter(
    (r) => r.report_id === c.report,
  );
  check(cases.length <= 1);
  const old = cases[0],
    target = targets[0];
  if (
    !old ||
    old.state !== "in_review" ||
    old.revision !== i.p_expected_case_revision ||
    (i.p_action === "suspend"
      ? target.status !== "active"
      : !["active", "suspended"].includes(target.status))
  )
    return { result: denied, changed: {} };
  const memberships = before["public.university_memberships"].filter(
    (r) => r.user_id === c.target,
  );
  check(memberships.length <= 1);
  return {
    reason,
    fingerprint,
    old,
    target,
    campus: memberships[0]?.university_id ?? null,
    nextStatus: i.p_action === "suspend" ? "suspended" : "banned",
    result: [
      {
        case_state: "closed",
        revision: old.revision + 1,
        account_status: i.p_action === "suspend" ? "suspended" : "banned",
      },
    ],
  };
}
function sanctionChanges(op, after, c, d) {
  const before = own(snapshots, op.beforeHandle),
    i = c.input,
    sanctionTable = "private.account_sanctions",
    auditTable = "private.moderation_audit";
  const candidate = added(
    before,
    after,
    sanctionTable,
    (r) => r.operator_id === c.actor && r.request_id === i.p_request_id,
    1,
  )[0];
  const used = new Set([i.p_request_id]);
  const sanctionId = bindUuid("database_uuid", candidate.id, before, used);
  const sanctionTime = bindTime(
    "clock_timestamp",
    candidate.occurred_at,
    op.bounds,
  );
  const row = {
    id: sanctionId,
    report_id: c.report,
    subject_type: "user",
    subject_id: c.target,
    operator_id: c.actor,
    request_id: i.p_request_id,
    action: i.p_action,
    previous_status: d.target.status,
    new_status: d.nextStatus,
    subject_campus_id: d.campus,
    reason: d.reason,
    occurred_at: sanctionTime,
  };
  equal(candidate, row);
  const oldIds = new Set(before[auditTable].map((r) => r.id));
  check(oldIds.size === before[auditTable].length);
  const auditCandidate = added(
    before,
    after,
    auditTable,
    (r) => !oldIds.has(r.id),
    1,
  )[0];
  const auditId = bindUuid("database_uuid", auditCandidate.id, before, used);
  const auditTime = bindTime(
    "clock_timestamp",
    auditCandidate.occurred_at,
    op.bounds,
  );
  const audit = {
    id: auditId,
    occurred_at: auditTime,
    operator_id: c.actor,
    action: i.p_action,
    report_id: c.report,
    subject_target_type: "user",
    subject_target_id: c.target,
    subject_campus_id: d.campus,
    request_id: i.p_request_id,
    previous_state: d.old.state,
    new_state: "closed",
    previous_revision: d.old.revision,
    new_revision: d.old.revision + 1,
    reason: d.reason,
    duplicate_report_id: null,
    page_report_ids: null,
    page_count: null,
    sanction_id: sanctionId,
    previous_account_status: d.target.status,
    new_account_status: d.nextStatus,
    hangout_disable_id: null,
    previous_hangout_disabled: null,
    new_hangout_disabled: null,
  };
  equal(auditCandidate, audit);
  return {
    [sanctionTable]: insertion(before, sanctionTable, [row]),
    [auditTable]: insertion(before, auditTable, [audit]),
    "public.accounts": replace(
      before,
      "public.accounts",
      (r) => r.id === c.target,
      (r) => ({ ...r, status: d.nextStatus }),
    ),
    "private.moderation_cases": replace(
      before,
      "private.moderation_cases",
      (r) => r.report_id === c.report,
      () => ({
        report_id: c.report,
        state: "closed",
        revision: d.old.revision + 1,
        note: d.reason,
        disposition: "action_taken",
        duplicate_report_id: null,
        sanction_id: sanctionId,
        hangout_disable_id: null,
      }),
    ),
    "private.moderation_requests": insertion(
      before,
      "private.moderation_requests",
      [
        {
          operator_id: c.actor,
          request_id: i.p_request_id,
          fingerprint: d.fingerprint,
          report_id: c.report,
          result_state: "closed",
          result_revision: d.old.revision + 1,
        },
      ],
    ),
  };
}
function sanctionWriter(op, after, c) {
  const before = own(snapshots, op.beforeHandle);
  if (op.id === "sanction.gate-enable")
    return {
      "private.moderation_feature_gate": replace(
        before,
        "private.moderation_feature_gate",
        (r) => r.singleton === true,
        () => ({ singleton: true, enabled: true }),
      ),
    };
  equal(op.id, "sanction.membership");
  const auth = find(before, "auth.users", (r) => r.id === c.target);
  const campus = find(
    before,
    "public.universities",
    (r) => r.slug === "unc-chapel-hill",
  );
  const observed = find(
    after,
    "public.university_memberships",
    (r) => r.user_id === c.target,
  );
  const verified = bindTime(
    "transaction_timestamp",
    observed.verified_at,
    op.bounds,
  );
  const existing = before["public.university_memberships"].filter(
    (r) => r.user_id === c.target,
  );
  check(existing.length <= 1);
  const row = {
    user_id: c.target,
    university_id: campus.id,
    verified_at: verified,
    verification_email: auth.email,
    created_at:
      existing[0]?.created_at ??
      bindTime("transaction_timestamp", observed.created_at, op.bounds),
  };
  if (!existing.length) equal(row.created_at, verified);
  return {
    "public.universities": replace(
      before,
      "public.universities",
      (r) => r.id === campus.id,
      (r) => ({ ...r, allowed_email_domains: ["unc.edu"] }),
    ),
    "public.university_memberships": existing.length
      ? replace(
          before,
          "public.university_memberships",
          (r) => r.user_id === c.target,
          () => row,
        )
      : insertion(before, "public.university_memberships", [row]),
  };
}
// HTTP result qualification preserves literal assertion strength. Raw results stay
// private. Extra sourceDenied body fields are not invented exact-body assertions.
function sanctionHttpResult(op, actual, expected) {
  keys(actual, ["status", "body"]);
  if (ENFORCEMENT_IDS.includes(op.id)) {
    if (op.id === "MODHTTP.private-sanction-rest") {
      equal(actual.status, 404);
      return { status: 404 };
    }
    if (
      [
        "MODHTTP.account-enforcement.retained-ids",
        "MODHTTP.account-enforcement.report",
      ].includes(op.id)
    ) {
      check([401, 403].includes(actual.status));
      equal(actual.body?.code, "42501");
      return { status: actual.status, code: "42501" };
    }
    equal(actual.status, 200);
    equal(actual.body, expected);
    return { status: 200, body: clone(expected) };
  }
  if (Array.isArray(expected)) {
    equal(actual.status, 200);
    equal(actual.body, expected);
    return { status: 200, body: clone(expected) };
  }
  check([401, 403].includes(actual.status));
  equal(actual.body?.code, expected.code);
  equal(actual.body?.message, expected.message);
  return {
    status: actual.status,
    code: expected.code,
    message: expected.message,
  };
}
function verifySanctionOperation(op, afterHandle, actualResult) {
  const before = own(snapshots, op.beforeHandle),
    after = own(snapshots, afterHandle),
    c = sanctionContext(op);
  if (SANCTION_WRITERS.includes(op.id))
    return assertExact(
      op.beforeHandle,
      afterHandle,
      sanctionWriter(op, after, c),
      actualResult,
      "",
    );
  if (ENFORCEMENT_IDS.includes(op.id)) {
    if (
      [
        "MODHTTP.account-enforcement.retained-ids",
        "MODHTTP.account-enforcement.report",
      ].includes(op.id)
    )
      equal(
        find(before, "private.safety_feature_gate", (r) => r.singleton === true)
          .enabled,
        true,
      );
    if (op.id !== "MODHTTP.private-sanction-rest")
      equal(
        find(before, "public.accounts", (r) => r.id === c.target).status,
        "suspended",
      );
    const expected =
      op.id === "MODHTTP.account-enforcement.access-state" ? "restricted" : [];
    const projection = sanctionHttpResult(op, actualResult, expected);
    return assertExact(
      op.beforeHandle,
      afterHandle,
      {},
      projection,
      projection,
    );
  }
  const d = sanctionDecision(op, before, c);
  if (
    [
      "sanction.nonoperator",
      "sanction.moderator-ban",
      "sanction.changed-retry",
      "sanction.admin-downgrade-retry",
    ].includes(op.id)
  ) {
    const denied = { code: "42501", message: "Moderation unavailable" };
    equal(d.result, denied);
    equal(d.changed, {});
    const projection = sanctionHttpResult(op, actualResult, denied);
    return assertExact(
      op.beforeHandle,
      afterHandle,
      {},
      projection,
      projection,
    );
  }
  const projection = sanctionHttpResult(op, actualResult, d.result);
  return assertExact(
    op.beforeHandle,
    afterHandle,
    d.old ? sanctionChanges(op, after, c, d) : d.changed,
    projection,
    projection,
  );
}
function sanctionSequenceOperation(
  planHandle,
  beforeHandle,
  bounds,
  sourceHandle,
  setup,
  bindings,
) {
  const p = own(plans, planHandle);
  equal(p.family, "focused-sanction-sequence");
  own(sources, sourceHandle);
  const c = setupContext({ beforeHandle, context: setup });
  check(c.lane === "http");
  equal(
    find(
      own(snapshots, beforeHandle),
      "private.safety_feature_gate",
      (r) => r.singleton === true,
    ).enabled,
    true,
  );
  keys(bindings, ["suspend", "reopen", "ban", "report"]);
  const used = new Set();
  for (const id of Object.values(bindings))
    bindUuid("client_uuid_v4", id, own(snapshots, beforeHandle), used);
  const row = find(
    own(snapshots, beforeHandle),
    "private.moderation_cases",
    (r) => r.report_id === c.report,
  );
  equal(row, {
    report_id: c.report,
    state: "in_review",
    revision: 2,
    note: "Reviewed evidence",
    disposition: null,
    duplicate_report_id: null,
    sanction_id: null,
    hangout_disable_id: null,
  });
  return opaque(
    sequences,
    freeze({
      id: p.id,
      beforeHandle,
      bounds,
      sourceHandle,
      setup: clone(setup),
      bindings: clone(bindings),
    }),
  );
}
function verifySanctionSequence(sequenceHandle, observations) {
  const s = own(sequences, sequenceHandle),
    steps = SANCTION_STEPS[s.id];
  check(steps);
  check(Array.isArray(observations) && observations.length === steps.length);
  let current = s.beforeHandle,
    lastResult;
  const c = setupContext({ beforeHandle: current, context: s.setup });
  for (let n = 0; n < steps.length; n++) {
    const id = steps[n],
      observation = observations[n];
    keys(observation, ["afterHandle", "result"]);
    let plan, context;
    if (id === "http.reopen") {
      plan = transitionModelPlans[id];
      context = {
        setup: s.setup,
        input: {
          p_report_id: c.report,
          p_request_id: s.bindings.reopen,
          p_expected_revision: 3,
          p_action: "reopen",
          p_note: "Further review",
        },
        jwtRole: "authenticated",
        isolation: "read committed",
      };
    } else if (id === "second-downgrade") {
      plan = setupModelPlans[id];
      context = s.setup;
    } else {
      plan = sanctionModelPlans[id] ?? enforcementModelPlans[id];
      const f = SANCTIONS[id];
      const input = f
        ? {
            p_report_id: c.report,
            p_request_id: s.bindings[f[0] === "second" ? "ban" : "suspend"],
            p_expected_case_revision: f[1],
            p_action: f[2],
            p_reason: f[3],
          }
        : id === "MODHTTP.account-enforcement.report"
          ? {
              p_request_id: s.bindings.report,
              p_target_mode: "user",
              p_target_id: c.reporter,
              p_category: "harassment",
            }
          : {};
      context = {
        setup: s.setup,
        input,
        jwtRole: "authenticated",
        isolation: "read committed",
      };
    }
    lastResult = verifyOperation(
      operation(plan, current, s.bounds, s.sourceHandle, context),
      observation.afterHandle,
      observation.result,
    );
    current = observation.afterHandle;
  }
  const final = own(snapshots, current);
  equal(
    find(final, "public.accounts", (r) => r.id === c.target).status,
    "banned",
  );
  equal(
    find(final, "public.platform_roles", (r) => r.user_id === c.second).role,
    "moderator",
  );
  assertEarlyOperator(final, c.actor);
  assertEarlyOperator(final, c.second);
  equal(
    final["private.moderation_audit"].filter(
      (r) => r.report_id === c.report && r.action === "ban",
    ).length,
    1,
  );
  return lastResult;
}

// Private source description validation, never an Auth/signup/JWT receipt.
function preSanctionStart(beforeHandle, bounds, setup) {
  const before = own(snapshots, beforeHandle),
    c = setupContext({ beforeHandle, context: setup });
  equal(c.lane, "http");
  const base = Object.fromEntries(TABLES.map((t) => [t, []]));
  equal(before["public.universities"].length, 1);
  const campus = before["public.universities"][0];
  equal(campus.slug, "unc-chapel-hill");
  equal(campus.active, true);
  check(campus.allowed_email_domains.includes("unc.edu"));
  check(
    campus.allowed_email_domains.every((d) =>
      ["unc.edu", "live.unc.edu"].includes(d),
    ),
  );
  preciseTime(campus.created_at);
  base["public.universities"] = clone(before["public.universities"]);
  equal(before["private.pilot_availability"].length, 1);
  const availability = before["private.pilot_availability"][0];
  equal(availability.singleton, true);
  equal(availability.enabled, false);
  equal(availability.revision, 1);
  preciseTime(availability.created_at);
  preciseTime(availability.updated_at);
  base["private.pilot_availability"] = clone(
    before["private.pilot_availability"],
  );
  equal(
    before["private.pilot_capabilities"].map((r) => r.key).sort(),
    CAPABILITIES.slice().sort(),
  );
  for (const row of before["private.pilot_capabilities"]) {
    equal(row.enabled, false);
    equal(row.revision, 1);
    preciseTime(row.created_at);
    preciseTime(row.updated_at);
  }
  base["private.pilot_capabilities"] = clone(
    before["private.pilot_capabilities"],
  );
  for (const table of TABLES.filter((t) => t.endsWith("feature_gate")))
    base[table] = [
      table === "private.large_hangout_feature_gate"
        ? { singleton: true, enabled: false, ranking_epoch: 0 }
        : { singleton: true, enabled: false },
    ];
  const used = new Set();
  for (const [ordinal, name] of [
    "actor",
    "reporter",
    "target",
    "second",
  ].entries()) {
    const id = bindUuid("go_uuid_v4", c[name], base, used),
      auth = find(before, "auth.users", (r) => r.id === id),
      account = find(before, "public.accounts", (r) => r.id === id);
    check(
      /^moderation-http-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}@unc\.edu$/.test(
        auth.email,
      ),
    );
    const created = bindTime(
        "transaction_timestamp",
        account.created_at,
        bounds,
      ),
      confirmed = bindTime(
        "transaction_timestamp",
        auth.email_confirmed_at,
        bounds,
      );
    base["auth.users"].push({
      id,
      email: auth.email,
      email_confirmed_at: confirmed,
      deleted_at: null,
      raw_user_meta_data: ordinal === 1 ? { role: "admin" } : {},
      raw_app_meta_data: { provider: "email", providers: ["email"] },
    });
    base["public.accounts"].push({ id, status: "active", created_at: created });
    base["public.profiles"].push(blankProfile(id, created));
    const membership = member(
      id,
      campusFor(before, auth.email),
      confirmed,
      confirmed,
    );
    membership.verification_email = auth.email;
    base["public.university_memberships"].push(membership);
  }
  check(new Set(base["auth.users"].map((r) => r.email)).size === 4);
  for (const name of [
    "report",
    "selfFiledReport",
    "selfTargetReport",
    "ownHangoutReport",
    "hangout",
  ])
    bindUuid("client_uuid_v4", c[name], before, used);
  for (const table of TABLES)
    equal(unorderedRows(before[table]), unorderedRows(base[table]));
  return c;
}
function preSanctionOperation(
  planHandle,
  beforeHandle,
  bounds,
  sourceHandle,
  setup,
  bindings,
) {
  const p = own(plans, planHandle);
  equal(p.family, "http-pre-sanction-prefix");
  equal(p.id, PRE_SANCTION_ID);
  own(sources, sourceHandle);
  const before = own(snapshots, beforeHandle),
    c = preSanctionStart(beforeHandle, bounds, setup);
  keys(bindings, [
    "initial",
    "annotate",
    "stale",
    "selfFiled",
    "selfTarget",
    "ownHangout",
  ]);
  const used = new Set([
    c.report,
    c.selfFiledReport,
    c.selfTargetReport,
    c.ownHangoutReport,
    c.hangout,
  ]);
  for (const id of Object.values(bindings))
    bindUuid("client_uuid_v4", id, before, used);
  return opaque(
    sequences,
    freeze({
      id: p.id,
      family: p.family,
      beforeHandle,
      bounds,
      sourceHandle,
      setup: clone(setup),
      bindings: clone(bindings),
    }),
  );
}
function preSanctionContext(s, step) {
  const c = s.setup,
    id = step.replace(/\.(before|after)$/, "");
  if (Object.hasOwn(PRE_SANCTION_COUNTS, id)) return { id, count: true };
  if (Object.hasOwn(setupModelPlans, id))
    return { id, plan: setupModelPlans[id], context: s.setup };
  if (id === "sanction.membership")
    return {
      id,
      plan: sanctionModelPlans[id],
      context: {
        setup: s.setup,
        input: {},
        jwtRole: "authenticated",
        isolation: "read committed",
      },
    };
  let input, plan;
  if (Object.hasOwn(TRANSITIONS, id)) {
    const f = TRANSITIONS[id];
    input = {
      p_report_id: c[f[1]],
      p_request_id:
        s.bindings[
          id === "http.annotate"
            ? "annotate"
            : id === "http.stale"
              ? "stale"
              : "initial"
        ],
      p_expected_revision: f[3],
      p_action: f[4],
      ...(f[5] === null ? {} : { p_note: f[5] }),
    };
    plan = transitionModelPlans[id];
  } else if (Object.hasOwn(LOSS_READS, id)) {
    input = { p_report_id: c.report };
    plan = transitionModelPlans[id];
  } else {
    check(READ_IDS.includes(id));
    plan = readModelPlans[id];
    if (id.startsWith("private-rest.")) input = {};
    else if (id.endsWith("queue") || id === "queue")
      input = {
        p_after_submitted_at: null,
        p_after_id: null,
        p_limit: 24,
      };
    else if (id.startsWith("conflict.")) {
      const name = id.includes("self-filed")
        ? "selfFiled"
        : id.includes("self-target")
          ? "selfTarget"
          : "ownHangout";
      input = { p_report_id: c[`${name}Report`] };
      if (id.endsWith("start-review"))
        Object.assign(input, {
          p_request_id: s.bindings[name],
          p_expected_revision: 0,
          p_action: "start_review",
        });
    } else input = { p_report_id: c.report };
  }
  return {
    id,
    plan,
    context: {
      setup: s.setup,
      input,
      jwtRole: id === "anonymous.queue" ? "anon" : "authenticated",
      isolation: "read committed",
    },
  };
}
function preSanctionProjection(id, actual) {
  keys(actual, ["status", "body"]);
  if (id === "anonymous.queue") {
    check([401, 403, 404].includes(actual.status));
    return { execution: "unavailable" }; // Original asserts status only, not body.
  }
  if (id.startsWith("private-rest.")) {
    equal(actual.status, 404);
    return { status: 404 };
  }
  if (
    [
      "queue",
      "detail",
      "http.start",
      "http.replay",
      "second-detail",
      "http.annotate",
      "refresh-detail",
    ].includes(id)
  )
    equal(actual.status, 200);
  if (
    id.startsWith("nonoperator.") ||
    id.startsWith("conflict.") ||
    [
      "gate-off.queue",
      "http.stale",
      "http.suspended-retry",
      "http.banned-detail",
      "http.banned-retry",
      "http.gate-retry",
    ].includes(id)
  ) {
    check([401, 403].includes(actual.status));
    equal(actual.body?.code, "42501");
    equal(actual.body?.message, "Moderation unavailable");
    return { code: "42501", message: "Moderation unavailable" };
  }
  return actual.body;
}
function verifyPreSanctionPrefix(sequenceHandle, observations) {
  const s = own(sequences, sequenceHandle);
  equal(s.family, "http-pre-sanction-prefix");
  equal(s.id, PRE_SANCTION_ID);
  check(
    Array.isArray(observations) &&
      observations.length === PRE_SANCTION_STEPS.length,
  );
  preSanctionStart(s.beforeHandle, s.bounds, s.setup);
  let current = s.beforeHandle,
    firstReceipt;
  for (const [index, step] of PRE_SANCTION_STEPS.entries()) {
    const observation = observations[index];
    keys(observation, ["id", "afterHandle", "result"]);
    equal(observation.id, step);
    const fixed = preSanctionContext(s, step);
    if (fixed.count) {
      const counts = auditCounts(current, s.setup),
        expected = PRE_SANCTION_COUNTS[step];
      equal(
        step === "audit.start-review"
          ? String(counts.startReview)
          : step === "audit.queue-report"
            ? String(counts.queueContainingReport)
            : counts.total,
        expected,
      );
      assertExact(
        current,
        observation.afterHandle,
        {},
        observation.result,
        expected,
      );
    } else {
      const writer =
          Object.hasOwn(setupModelPlans, fixed.id) ||
          fixed.id === "sanction.membership",
        projected = writer
          ? observation.result
          : preSanctionProjection(fixed.id, observation.result);
      const receipt = verifyOperation(
        operation(fixed.plan, current, s.bounds, s.sourceHandle, fixed.context),
        observation.afterHandle,
        projected,
      );
      if (fixed.id === "http.start")
        firstReceipt = clone(own(results, receipt).result);
      if (fixed.id === "http.replay")
        equal(own(results, receipt).result, firstReceipt);
    }
    current = observation.afterHandle;
  }
  return preSanctionTerminal(s, current);
}
function preSanctionTerminal(s, finalHandle) {
  const final = own(snapshots, finalHandle),
    c = s.setup;
  equal(
    find(final, "private.moderation_cases", (r) => r.report_id === c.report),
    {
      report_id: c.report,
      state: "in_review",
      revision: 2,
      note: "Reviewed evidence",
      disposition: null,
      duplicate_report_id: null,
      sanction_id: null,
      hangout_disable_id: null,
    },
  );
  equal(final["private.moderation_cases"].length, 1);
  equal(final["private.moderation_requests"].length, 2);
  equal(auditCounts(finalHandle, c), {
    total: 6,
    startReview: 1,
    queueContainingReport: 1,
  });
  for (const [id, role] of [
    [c.actor, "moderator"],
    [c.second, "admin"],
  ]) {
    assertEarlyOperator(final, id);
    equal(
      find(final, "public.platform_roles", (r) => r.user_id === id).role,
      role,
    );
  }
  for (const id of [c.reporter, c.target])
    equal(find(final, "public.accounts", (r) => r.id === id).status, "active");
  for (const table of TABLES.filter((t) => t.endsWith("feature_gate"))) {
    equal(
      find(final, table, (r) => r.singleton).enabled,
      table === "private.safety_feature_gate",
    );
  }
  equal(
    find(final, "public.hangouts", (r) => r.id === c.hangout).host_id,
    c.actor,
  );
  equal(
    find(
      final,
      "public.hangout_participants",
      (r) => r.hangout_id === c.hangout && r.account_id === c.actor,
    ).state,
    "joined",
  );
  // Opaque source-bound continuation. No raw getter or caller authority factory.
  return opaque(
    preSanctionTerminals,
    freeze({
      id: PRE_SANCTION_ID,
      finalHandle,
      bounds: s.bounds,
      sourceHandle: s.sourceHandle,
      setup: clone(c),
      bindings: clone(s.bindings),
      verifiedSteps: PRE_SANCTION_STEPS.length,
      nextSourceLine: 201,
      membershipApplied: true,
      signupAvailable: false,
      jwtAvailable: false,
      transportAvailable: false,
      runtimeCredit: 0,
    }),
  );
}

// Only an exact validated prefix continuation supplies the before/source/setup.
function finalSuffixOperation(planHandle, prefixTerminal, bindings) {
  const p = own(plans, planHandle),
    frame = own(preSanctionTerminals, prefixTerminal);
  equal(p.family, "post-prefix-sanctions");
  equal(p.id, FINAL_SUFFIX_ID);
  equal(frame.id, PRE_SANCTION_ID);
  equal(frame.verifiedSteps, 44);
  equal(frame.nextSourceLine, 201);
  equal(frame.membershipApplied, true);
  equal(
    [
      frame.signupAvailable,
      frame.jwtAvailable,
      frame.transportAvailable,
      frame.runtimeCredit,
    ],
    [false, false, false, 0],
  );
  own(sources, frame.sourceHandle);
  equal(
    setupContext({ beforeHandle: frame.finalHandle, context: frame.setup })
      .lane,
    "http",
  );
  // Recheck the exact preserved terminal before accepting any suffix binding.
  preSanctionTerminal(frame, frame.finalHandle);
  keys(bindings, ["suspend", "reopen", "ban", "report"]);
  const used = new Set([
    ...Object.values(frame.bindings),
    ...Object.values(frame.setup).filter((v) => v !== "http"),
  ]);
  for (const id of Object.values(bindings))
    bindUuid("client_uuid_v4", id, own(snapshots, frame.finalHandle), used);
  return opaque(
    sequences,
    freeze({
      id: p.id,
      family: p.family,
      prefixTerminal,
      beforeHandle: frame.finalHandle,
      bounds: frame.bounds,
      sourceHandle: frame.sourceHandle,
      setup: clone(frame.setup),
      bindings: clone(bindings),
    }),
  );
}
function finalSuffixContext(s, id) {
  const c = s.setup;
  if (id === "audit.single-ban") return { count: true };
  if (id === "second-downgrade")
    return { plan: setupModelPlans[id], context: c };
  if (id === "http.reopen")
    return {
      plan: transitionModelPlans[id],
      context: {
        setup: c,
        input: {
          p_report_id: c.report,
          p_request_id: s.bindings.reopen,
          p_expected_revision: 3,
          p_action: "reopen",
          p_note: "Further review",
        },
        jwtRole: "authenticated",
        isolation: "read committed",
      },
    };
  check(
    Object.hasOwn(SANCTIONS, id) ||
      ENFORCEMENT_IDS.includes(id) ||
      id === "sanction.gate-enable",
  );
  const f = SANCTIONS[id],
    input = f
      ? {
          p_report_id: c.report,
          p_request_id: s.bindings[f[0] === "second" ? "ban" : "suspend"],
          p_expected_case_revision: f[1],
          p_action: f[2],
          p_reason: f[3],
        }
      : id === "MODHTTP.account-enforcement.report"
        ? {
            p_request_id: s.bindings.report,
            p_target_mode: "user",
            p_target_id: c.reporter,
            p_category: "harassment",
          }
        : {};
  return {
    plan: sanctionModelPlans[id] ?? enforcementModelPlans[id],
    context: {
      setup: c,
      input,
      jwtRole: "authenticated",
      isolation: "read committed",
    },
  };
}
function verifyFinalSuffix(sequenceHandle, observations) {
  const s = own(sequences, sequenceHandle);
  equal(s.family, "post-prefix-sanctions");
  equal(s.id, FINAL_SUFFIX_ID);
  own(preSanctionTerminals, s.prefixTerminal);
  check(
    Array.isArray(observations) &&
      observations.length === FINAL_SUFFIX_STEPS.length,
  );
  let current = s.beforeHandle,
    suspensionReceipt;
  for (const [index, id] of FINAL_SUFFIX_STEPS.entries()) {
    const o = observations[index];
    keys(o, ["id", "afterHandle", "result"]);
    equal(o.id, id);
    const fixed = finalSuffixContext(s, id);
    if (fixed.count) {
      equal(
        own(snapshots, current)["private.moderation_audit"].filter(
          (r) => r.report_id === s.setup.report && r.action === "ban",
        ).length,
        1,
      );
      assertExact(current, o.afterHandle, {}, o.result, "1");
    } else {
      equal(
        find(
          own(snapshots, current),
          "private.safety_feature_gate",
          (r) => r.singleton,
        ).enabled,
        true,
      );
      let projected = o.result;
      if (id === "http.reopen") {
        keys(o.result, ["status", "body"]);
        equal(o.result.status, 200); // Additional hardening, no original lexical credit.
        projected = o.result.body;
      }
      const receipt = verifyOperation(
        operation(fixed.plan, current, s.bounds, s.sourceHandle, fixed.context),
        o.afterHandle,
        projected,
      );
      if (id === "sanction.suspend")
        suspensionReceipt = clone(own(results, receipt).result);
      if (id === "sanction.normalized-retry")
        equal(own(results, receipt).result, suspensionReceipt);
    }
    current = o.afterHandle;
  }
  return finalHttpTerminal(s, current);
}
function finalHttpTerminal(s, finalHandle) {
  const final = own(snapshots, finalHandle),
    prefix = own(preSanctionTerminals, s.prefixTerminal),
    before = own(snapshots, prefix.finalHandle),
    c = s.setup;
  equal(final["private.moderation_cases"].length, 1);
  const ban = find(
    final,
    "private.account_sanctions",
    (r) => r.operator_id === c.second && r.request_id === s.bindings.ban,
  );
  equal(
    find(final, "private.moderation_cases", (r) => r.report_id === c.report),
    {
      report_id: c.report,
      state: "closed",
      revision: 5,
      note: "Decision",
      disposition: "action_taken",
      duplicate_report_id: null,
      sanction_id: ban.id,
      hangout_disable_id: null,
    },
  );
  equal(final["private.account_sanctions"].length, 2);
  equal(final["private.moderation_requests"].length, 5);
  equal(final["private.moderation_audit"].length, 9);
  equal(
    final["private.moderation_audit"].filter(
      (r) => r.report_id === c.report && r.action === "ban",
    ).length,
    1,
  );
  equal(
    find(final, "public.accounts", (r) => r.id === c.target).status,
    "banned",
  );
  for (const id of [c.actor, c.second]) {
    assertEarlyOperator(final, id);
    equal(
      find(final, "public.platform_roles", (r) => r.user_id === id).role,
      "moderator",
    );
  }
  equal(
    find(final, "public.accounts", (r) => r.id === c.reporter).status,
    "active",
  );
  for (const table of [
    "public.university_memberships",
    "public.universities",
    "public.hangouts",
    "public.hangout_participants",
    "private.pilot_availability",
    "private.pilot_capabilities",
  ])
    equal(unorderedRows(final[table]), unorderedRows(before[table]));
  for (const table of TABLES.filter((t) => t.endsWith("feature_gate")))
    equal(
      find(final, table, (r) => r.singleton).enabled,
      [
        "private.safety_feature_gate",
        "private.moderation_feature_gate",
      ].includes(table),
    );
  return opaque(
    finalHttpTerminals,
    freeze({
      finalHandle,
      prefixTerminal: s.prefixTerminal,
      bounds: s.bounds,
      sourceHandle: s.sourceHandle,
      setup: clone(c),
      prefixBindings: clone(prefix.bindings),
      suffixBindings: clone(s.bindings),
      verifiedPrefixSteps: 44,
      verifiedSuffixSteps: 18,
      allocatedLabels: 39,
      membershipApplied: true,
      signupAvailable: false,
      jwtAvailable: false,
      transportAvailable: false,
      actualCasesComplete: false,
      originalCasePassCredit: 0,
      runtimeCredit: 0,
    }),
  );
}
function retainedHttpOperation(
  planHandle,
  beforeHandle,
  bounds,
  sourceHandle,
  setup,
  prefixBindings,
  suffixBindings,
) {
  const p = own(plans, planHandle);
  equal(p.family, "retained-http-source");
  equal(p.id, FINAL_HTTP_ID);
  const prefixHandle = preSanctionOperation(
    httpTransitionPlans[PRE_SANCTION_ID],
    beforeHandle,
    bounds,
    sourceHandle,
    setup,
    prefixBindings,
  );
  // Validate four fixed fresh source keys before retaining them; rechecked at join.
  keys(suffixBindings, ["suspend", "reopen", "ban", "report"]);
  const used = new Set([
    ...Object.values(prefixBindings),
    ...Object.values(setup).filter((v) => v !== "http"),
  ]);
  for (const id of Object.values(suffixBindings))
    bindUuid("client_uuid_v4", id, own(snapshots, beforeHandle), used);
  return opaque(
    sequences,
    freeze({
      id: p.id,
      family: p.family,
      prefixHandle,
      suffixBindings: clone(suffixBindings),
    }),
  );
}
function verifyRetainedHttp(sequenceHandle, observations) {
  const s = own(sequences, sequenceHandle);
  equal(s.family, "retained-http-source");
  equal(s.id, FINAL_HTTP_ID);
  check(Array.isArray(observations) && observations.length === 62);
  const terminal = verifyPreSanctionPrefix(
    s.prefixHandle,
    observations.slice(0, 44),
  );
  const suffix = finalSuffixOperation(
    httpTransitionPlans[FINAL_SUFFIX_ID],
    terminal,
    s.suffixBindings,
  );
  return verifyFinalSuffix(suffix, observations.slice(44));
}

function sequenceOperation(
  planHandle,
  beforeHandle,
  bounds,
  sourceHandle,
  setup,
  requestBindings,
) {
  const p = own(plans, planHandle);
  check(
    ["first-twelve-races", "http-transition-subsequences"].includes(p.family),
  );
  const before = own(snapshots, beforeHandle);
  own(sources, sourceHandle);
  const c = setupContext({ beforeHandle, context: setup });
  const http = p.family === "http-transition-subsequences";
  check(c.lane === (http ? "http" : "sql"));
  // Both source races start after safety is enabled; their restoration writes
  // moderation only. The preserved setup writer must leave safety unchanged.
  if (!http && ["gate_first", "read_first"].includes(p.id))
    check(
      find(before, "private.safety_feature_gate", (r) => r.singleton === true)
        .enabled === true,
    );
  keys(requestBindings, http ? ["initial", "annotate", "stale"] : []);
  if (http) {
    check(new Set(Object.values(requestBindings)).size === 3);
    for (const id of Object.values(requestBindings))
      check(
        typeof id === "string" &&
          /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
            id,
          ),
      );
  }
  return opaque(
    sequences,
    freeze({
      id: p.id,
      family: p.family,
      beforeHandle,
      bounds,
      sourceHandle,
      setup: clone(setup),
      requestBindings: clone(requestBindings),
    }),
  );
}
function verifySequence(sequenceHandle, observations) {
  const s = own(sequences, sequenceHandle),
    http = s.family === "http-transition-subsequences";
  const steps = (http ? HTTP_TRANSITION_STEPS : RACE_STEPS)[s.id];
  check(Array.isArray(observations) && observations.length === steps.length);
  let currentHandle = s.beforeHandle,
    firstReceipt;
  const c = setupContext({ beforeHandle: currentHandle, context: s.setup });
  const before = own(snapshots, currentHandle);
  if (http) {
    const caseRows = before["private.moderation_cases"].filter(
      (r) => r.report_id === c.report,
    );
    const expectedRevision =
      s.id === "MODHTTP.start-review"
        ? 0
        : ["MODHTTP.second-operator-detail", "MODHTTP.annotate"].includes(s.id)
          ? 1
          : 2;
    equal(caseRows[0]?.revision ?? 0, expectedRevision);
    if (expectedRevision) {
      const request = find(
        before,
        "private.moderation_requests",
        (r) =>
          r.operator_id === c.actor &&
          r.request_id === s.requestBindings.initial,
      );
      equal(request.report_id, c.report);
      equal(request.result_state, "in_review");
      equal(request.result_revision, 1);
    }
  }
  for (const [index, id] of steps.entries()) {
    const observation = observations[index];
    keys(observation, ["afterHandle", "result"]);
    const fixed = TRANSITIONS[id];
    let input, context, plan;
    if (fixed || Object.hasOwn(LOSS_READS, id) || id === "race.detail-count") {
      input = fixed
        ? {
            p_report_id: c[fixed[1]],
            p_request_id:
              fixed[2] ??
              s.requestBindings[
                id === "http.annotate"
                  ? "annotate"
                  : id === "http.stale"
                    ? "stale"
                    : "initial"
              ],
            p_expected_revision: fixed[3],
            p_action: fixed[4],
            ...(fixed[5] !== null ? { p_note: fixed[5] } : {}),
          }
        : { p_report_id: c.report };
      context = {
        setup: s.setup,
        input,
        jwtRole: "authenticated",
        isolation: "read committed",
      };
      plan = transitionModelPlans[id];
    } else if (READ_IDS.includes(id)) {
      input = { p_report_id: c.report };
      context = {
        setup: s.setup,
        input,
        jwtRole: "authenticated",
        isolation: "read committed",
      };
      plan = readModelPlans[id];
    } else {
      context = s.setup;
      plan = setupModelPlans[id];
    }
    const op = operation(
      plan,
      currentHandle,
      s.bounds,
      s.sourceHandle,
      context,
    );
    const receipt = verifyOperation(
      op,
      observation.afterHandle,
      observation.result,
    );
    if (id === "http.start" || id === "race.same-key-first")
      firstReceipt = receipt;
    if (id === "http.replay" || id === "race.same-key-replay")
      equal(own(results, receipt), own(results, firstReceipt));
    // A source-fixed denial cannot be substituted with a legal new operation;
    // its derived result/full54 comparison must be zero delta.
    if (
      [
        "http.stale",
        "http.suspended-retry",
        "http.banned-retry",
        "http.gate-retry",
        "race.target-role",
        "race.case-replay-veto",
        "race.second-operator",
      ].includes(id)
    )
      equal(observation.result, {
        code: "42501",
        message: "Moderation unavailable",
      });
    currentHandle = observation.afterHandle;
  }
  const after = own(snapshots, currentHandle);
  const readCount = (raw) =>
    raw["private.moderation_audit"].filter(
      (r) => r.report_id === c.report && r.action === "detail_read",
    ).length;
  if (["read_first", "role_read_first", "account_read_first"].includes(s.id))
    equal(readCount(after), readCount(before) + 1);
  if (["two_operators", "same_key"].includes(s.id)) {
    const reportId = s.id === "two_operators" ? c.report2 : c.report3;
    equal(
      find(after, "private.moderation_cases", (r) => r.report_id === reportId)
        .revision,
      1,
    );
    equal(
      after["private.moderation_audit"].filter(
        (r) => r.report_id === reportId && r.action === "start_review",
      ).length,
      1,
    );
    equal(
      after["private.moderation_requests"].filter(
        (r) => r.report_id === reportId,
      ).length,
      1,
    );
  }
  if (
    s.id === "membership_delete_first" ||
    s.id === "action_before_membership_delete"
  ) {
    const id =
      s.id === "membership_delete_first"
        ? TRANSITIONS["race.no-campus"][2]
        : TRANSITIONS["race.current-campus"][2];
    const campus = find(
      after,
      "private.moderation_audit",
      (r) => r.request_id === id,
    ).subject_campus_id;
    check(
      s.id === "membership_delete_first" ? campus === null : campus !== null,
    );
  }
  if (s.id === "MODHTTP.refresh-and-audit") {
    const counts = auditCounts(currentHandle, s.setup);
    equal(counts.startReview, 1);
    equal(counts.queueContainingReport, 1);
    equal(detailRows(after, c.report)[0].case_revision, 2);
    equal(counts.total, before["private.moderation_audit"].length + 1);
  }
  return opaque(
    results,
    freeze({
      classification: "source-only-sequence",
      id: s.id,
      verifiedSteps: steps.length,
    }),
  );
}
function assertEarlyOperator(before, actor) {
  equal(
    find(before, "public.accounts", (r) => r.id === actor).status,
    "active",
  );
  check(
    ["moderator", "admin"].includes(
      find(before, "public.platform_roles", (r) => r.user_id === actor).role,
    ),
  );
  check(
    !before["private.pilot_account_admission"].some(
      (r) => r.account_id === actor,
    ),
  );
  const profile = find(before, "public.profiles", (r) => r.user_id === actor);
  check(profile.is_complete === false && profile.primary_photo_path === null);
  equal(
    before["private.pilot_availability"].map((r) => r.enabled),
    [false],
  );
  check(
    before["private.pilot_capabilities"].length === 13 &&
      before["private.pilot_capabilities"].every((r) => !r.enabled),
  );
}
// Own inert examples, not fixture runtime/test entrypoints. Never returns raw
// rows/errors/result handles, and accepts only exact immutable source bytes.
export function runMemoryExamples(exactSourceBytes) {
  try {
    return memoryExamples(exactSourceBytes);
  } catch {
    return freeze({
      available: false,
      reason: "unavailable",
      runtimeCredit: 0,
    });
  }
}
function memoryExamples(bytes) {
  let groups = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  const source = sourceCandidate(bytes);
  const time = "2026-09-29T12:00:00.123456Z",
    later = "2026-09-29T12:00:01.123456Z";
  const bounds = window(time, later),
    campus = "00000000-0000-4000-8000-000000000001";
  const baseline = Object.fromEntries(TABLES.map((t) => [t, []]));
  baseline["public.universities"] = [
    {
      id: campus,
      slug: "unc-chapel-hill",
      name: "UNC Chapel Hill",
      active: true,
      allowed_email_domains: ["unc.edu"],
      created_at: time,
    },
  ];
  baseline["private.pilot_availability"] = [
    {
      singleton: true,
      enabled: false,
      revision: 1,
      created_at: time,
      updated_at: time,
    },
  ];
  baseline["private.pilot_capabilities"] = CAPABILITIES.map((key) => ({
    key,
    enabled: false,
    revision: 1,
    created_at: time,
    updated_at: time,
  }));
  for (const t of TABLES.filter((t) => t.endsWith("feature_gate")))
    baseline[t] = [
      t === "private.large_hangout_feature_gate"
        ? { singleton: true, enabled: false, ranking_epoch: 0 }
        : { singleton: true, enabled: false },
    ];
  const before = snapshot(baseline),
    sqlAfter = clone(baseline);
  for (const [index, subject] of SQL_SUBJECTS.entries()) {
    const id = SQL_IDS[subject],
      email = `moderation-race-${index + 1}@unc.edu`;
    sqlAfter["auth.users"].push({
      id,
      email,
      email_confirmed_at: time,
      deleted_at: null,
      raw_user_meta_data: null,
      raw_app_meta_data: null,
    });
    sqlAfter["public.accounts"].push({
      id,
      status: "active",
      created_at: time,
    });
    sqlAfter["public.profiles"].push({
      user_id: id,
      real_name: null,
      graduation_year: null,
      major: null,
      bio: null,
      primary_photo_path: null,
      is_complete: false,
      created_at: time,
      interests: [],
      down_to_do: [],
      favorite_music: null,
      favorite_foods: null,
      weird_fact: null,
      prompts: [],
      instagram: null,
      additional_photo_paths: [],
      revision: 0,
    });
    sqlAfter["public.university_memberships"].push({
      user_id: id,
      university_id: campus,
      verified_at: time,
      verification_email: email,
      created_at: time,
    });
  }
  const sqlOp = operation(
    setupModelPlans["sql-auth-four"],
    before,
    bounds,
    source,
    {},
  );
  tested(() => {
    check(
      TABLES.length === 54 &&
        TABLES.filter((t) => /^(public|private)\./.test(t)).length === 52,
    );
    verifyOperation(sqlOp, snapshot(sqlAfter), "");
  });
  rejected(() => verifyOperation(sqlOp, snapshot(sqlAfter), 0));
  const altered = clone(sqlAfter);
  altered["public.profiles"][0].favorite_music = "unexplained private mutation";
  rejected(() => verifyOperation(sqlOp, snapshot(altered), ""));
  const unseen = clone(sqlAfter);
  unseen["private.people_blocks"].push({
    blocker_id: SQL_IDS.actor,
    blocked_id: SQL_IDS.target,
  });
  rejected(() => verifyOperation(sqlOp, snapshot(unseen), ""));
  const wrongNull = clone(sqlAfter);
  wrongNull["auth.users"][0].raw_user_meta_data = {};
  rejected(() => verifyOperation(sqlOp, snapshot(wrongNull), ""));
  const unequalTx = clone(sqlAfter);
  unequalTx["auth.users"][1].email_confirmed_at = later;
  rejected(() => verifyOperation(sqlOp, snapshot(unequalTx), ""));
  const wrongFields = clone(sqlAfter);
  wrongFields["auth.users"][0].confirmed_at = time;
  rejected(() => snapshot(wrongFields));
  const wrongTable = clone(sqlAfter);
  delete wrongTable["private.moderation_audit"];
  rejected(() => snapshot(wrongTable));
  const rolesAfter = clone(sqlAfter);
  rolesAfter["public.platform_roles"] = [
    { user_id: SQL_IDS.actor, role: "moderator", created_at: time },
    { user_id: SQL_IDS.second, role: "admin", created_at: time },
  ];
  const rolesBefore = snapshot(sqlAfter);
  tested(() =>
    verifyOperation(
      operation(
        setupModelPlans["initial-roles"],
        rolesBefore,
        bounds,
        source,
        {},
      ),
      snapshot(rolesAfter),
      "",
    ),
  );
  tested(() => {
    assertEarlyOperator(rolesAfter, SQL_IDS.actor);
    assertEarlyOperator(rolesAfter, SQL_IDS.second);
  });
  const statusAfter = clone(rolesAfter);
  statusAfter["public.accounts"][0].status = "suspended";
  tested(() =>
    verifyOperation(
      operation(
        setupModelPlans["actor-suspend"],
        snapshot(rolesAfter),
        bounds,
        source,
        {},
      ),
      snapshot(statusAfter),
      "",
    ),
  );
  const changedRoleTime = clone(statusAfter);
  changedRoleTime["public.platform_roles"][0].created_at = later;
  rejected(() =>
    verifyOperation(
      operation(
        setupModelPlans["actor-suspend"],
        snapshot(rolesAfter),
        bounds,
        source,
        {},
      ),
      snapshot(changedRoleTime),
      "",
    ),
  );
  const shutdownBefore = clone(rolesAfter);
  shutdownBefore["private.pilot_availability"][0].enabled = true;
  shutdownBefore["private.pilot_capabilities"][1].enabled = true;
  tested(() =>
    verifyOperation(
      operation(
        setupModelPlans["ordinary-shutdown"],
        snapshot(shutdownBefore),
        bounds,
        source,
        {},
      ),
      snapshot(rolesAfter),
      "",
    ),
  );
  const enabled = clone(rolesAfter);
  enabled["private.moderation_feature_gate"][0].enabled = true;
  enabled["private.safety_feature_gate"][0].enabled = true;
  tested(() =>
    verifyOperation(
      operation(
        setupModelPlans["moderation-enable"],
        snapshot(rolesAfter),
        bounds,
        source,
        {},
      ),
      snapshot(enabled),
      "",
    ),
  );
  const tooBroad = clone(enabled);
  tooBroad["private.people_feature_gate"][0].enabled = true;
  rejected(() =>
    verifyOperation(
      operation(
        setupModelPlans["moderation-enable"],
        snapshot(rolesAfter),
        bounds,
        source,
        {},
      ),
      snapshot(tooBroad),
      "",
    ),
  );
  const reports = clone(rolesAfter);
  for (const id of [SQL_IDS.report, SQL_IDS.report2, SQL_IDS.report3])
    reports["private.safety_reports"].push({
      id,
      submitted_at: time,
      reporter_id: SQL_IDS.reporter,
      target_type: "user",
      target_id: SQL_IDS.target,
      category: "harassment",
      narrative: null,
      provenance_kind: "current_people",
      provenance_ref_id: SQL_IDS.target,
    });
  tested(() =>
    verifyOperation(
      operation(
        setupModelPlans["initial-reports"],
        snapshot(rolesAfter),
        bounds,
        source,
        {},
      ),
      snapshot(reports),
      "",
    ),
  );
  const ordinaryWriterCases = [
    [
      "actor-ban",
      rolesAfter,
      (() => {
        const v = clone(rolesAfter);
        v["public.accounts"][0].status = "banned";
        return v;
      })(),
    ],
    ["actor-restore", statusAfter, rolesAfter],
    [
      "actor-role-delete",
      rolesAfter,
      (() => {
        const v = clone(rolesAfter);
        v["public.platform_roles"] = [
          clone(rolesAfter["public.platform_roles"][1]),
        ];
        return v;
      })(),
    ],
    [
      "second-downgrade",
      rolesAfter,
      (() => {
        const v = clone(rolesAfter);
        v["public.platform_roles"][1].role = "moderator";
        return v;
      })(),
    ],
    [
      "target-role-insert",
      rolesAfter,
      (() => {
        const v = clone(rolesAfter);
        v["public.platform_roles"].push({
          user_id: SQL_IDS.target,
          role: "moderator",
          created_at: time,
        });
        return v;
      })(),
    ],
    [
      "target-membership-delete",
      rolesAfter,
      (() => {
        const v = clone(rolesAfter);
        v["public.university_memberships"] = v[
          "public.university_memberships"
        ].filter((r) => r.user_id !== SQL_IDS.target);
        return v;
      })(),
    ],
    [
      "moderation-disable",
      enabled,
      (() => {
        const v = clone(enabled);
        v["private.moderation_feature_gate"][0].enabled = false;
        return v;
      })(),
    ],
  ];
  const deletedRole = ordinaryWriterCases.find(
    (c) => c[0] === "actor-role-delete",
  )[2];
  const insertedTargetRole = ordinaryWriterCases.find(
    (c) => c[0] === "target-role-insert",
  )[2];
  const deletedMembership = ordinaryWriterCases.find(
    (c) => c[0] === "target-membership-delete",
  )[2];
  ordinaryWriterCases.push(
    ["actor-role-restore", deletedRole, rolesAfter],
    ["target-role-delete", insertedTargetRole, rolesAfter],
    ["target-membership-restore", deletedMembership, rolesAfter],
  );
  for (const [id, rawBefore, rawAfter] of ordinaryWriterCases) {
    tested(() =>
      verifyOperation(
        operation(setupModelPlans[id], snapshot(rawBefore), bounds, source, {}),
        snapshot(rawAfter),
        "",
      ),
    );
    const unexplained = clone(rawAfter);
    unexplained["public.profiles"][1].bio = "unexpected private draft";
    rejected(() =>
      verifyOperation(
        operation(setupModelPlans[id], snapshot(rawBefore), bounds, source, {}),
        snapshot(unexplained),
        "",
      ),
    );
  }
  const admittedEarly = clone(rolesAfter);
  admittedEarly["private.pilot_account_admission"].push({
    account_id: SQL_IDS.actor,
    state: "active",
    revision: 1,
    created_at: time,
    updated_at: time,
  });
  rejected(() =>
    verifyOperation(
      operation(
        setupModelPlans["initial-roles"],
        rolesBefore,
        bounds,
        source,
        {},
      ),
      snapshot(admittedEarly),
      "",
    ),
  );
  const sourceBefore = snapshot(reports),
    hung = clone(reports);
  hung["public.hangouts"].push({
    id: SQL_IDS.hangout,
    university_id: campus,
    host_id: SQL_IDS.target,
    title: "Local fixture",
    description: null,
    starts_at: "2026-09-29T13:00:00.123456Z",
    ends_at: null,
    status: "published",
    joining_state: "open",
    visibility: "campus",
    public_place: "Approximate place",
    public_latitude: 35,
    public_longitude: -79,
    campus_zone: null,
    location_precision: "approximate_area",
    revision: 1,
    created_at: time,
    updated_at: time,
  });
  hung["public.hangout_participants"].push({
    hangout_id: SQL_IDS.hangout,
    account_id: SQL_IDS.target,
    state: "joined",
    joined_at: time,
    left_at: null,
    removed_at: null,
    updated_at: time,
  });
  hung["private.safety_reports"].push({
    id: SQL_IDS.hangoutReport,
    submitted_at: "2026-09-28T12:00:00.123456Z",
    reporter_id: SQL_IDS.reporter,
    target_type: "hangout",
    target_id: SQL_IDS.hangout,
    category: "harassment",
    narrative: null,
    provenance_kind: "current_hangout",
    provenance_ref_id: SQL_IDS.hangout,
  });
  tested(() =>
    verifyOperation(
      operation(
        setupModelPlans["initial-hangout"],
        sourceBefore,
        bounds,
        source,
        {},
      ),
      snapshot(hung),
      "",
    ),
  );
  const orphan = clone(hung);
  orphan["public.hangout_participants"] = [];
  rejected(() =>
    verifyOperation(
      operation(
        setupModelPlans["initial-hangout"],
        sourceBefore,
        bounds,
        source,
        {},
      ),
      snapshot(orphan),
      "",
    ),
  );
  let httpBefore = clone(baseline);
  for (let ordinal = 0; ordinal < 4; ordinal++) {
    const id = `63000000-0000-4000-8000-00000000000${ordinal + 1}`;
    const submittedEmail = `moderation-http-64000000-0000-4000-8000-00000000000${ordinal + 1}@unc.edu`;
    const httpAfter = clone(httpBefore);
    httpAfter["auth.users"].push({
      id,
      email: submittedEmail,
      email_confirmed_at: null,
      deleted_at: null,
      raw_user_meta_data: ordinal === 1 ? { role: "admin" } : {},
      raw_app_meta_data: { provider: "email", providers: ["email"] },
    });
    httpAfter["public.accounts"].push({
      id,
      status: "active",
      created_at: time,
    });
    httpAfter["public.profiles"].push({
      ...clone(sqlAfter["public.profiles"][0]),
      user_id: id,
    });
    const handle = operation(
      setupModelPlans["http-signup-one"],
      snapshot(httpBefore),
      bounds,
      source,
      { ordinal, submittedEmail, responseId: id },
    );
    tested(() => verifyOperation(handle, snapshot(httpAfter), { id }));
    const badMetadata = clone(httpAfter);
    badMetadata["auth.users"].at(-1).raw_user_meta_data = {
      email_verified: true,
    };
    rejected(() => verifyOperation(handle, snapshot(badMetadata), { id }));
    const badResponse = { id: SQL_IDS.actor };
    rejected(() => verifyOperation(handle, snapshot(httpAfter), badResponse));
    const confirmed = clone(httpAfter);
    confirmed["auth.users"].at(-1).email_confirmed_at = time;
    confirmed["public.university_memberships"].push({
      user_id: id,
      university_id: campus,
      verified_at: time,
      verification_email: submittedEmail,
      created_at: time,
    });
    tested(() =>
      verifyOperation(
        operation(
          setupModelPlans["http-confirm-one"],
          snapshot(httpAfter),
          bounds,
          source,
          { id },
        ),
        snapshot(confirmed),
        "",
      ),
    );
    httpBefore = confirmed;
  }
  const storageBefore = snapshot(sqlAfter),
    photoAfter = clone(sqlAfter),
    objectId = "75000000-0000-3000-8000-000000000001";
  // A database UUID default does not promise v4; Go signup does.
  photoAfter["storage.objects"].push({
    id: objectId,
    bucket_id: "profile-photos",
    name: `${SQL_IDS.actor}/primary.png`,
    owner: null,
    created_at: time,
    updated_at: time,
    last_accessed_at: time,
    metadata: null,
    path_tokens: [SQL_IDS.actor, "primary.png"],
    version: null,
    owner_id: SQL_IDS.actor,
    user_metadata: null,
    archived_at: null,
    is_delete_marker: false,
    is_versioned: false,
  });
  const storageModel = (raw) =>
    syntheticStorageRow(
      own(snapshots, storageBefore),
      own(snapshots, snapshot(raw)),
      SQL_IDS.actor,
      `${SQL_IDS.actor}/primary.png`,
      bounds,
      source,
      new Set(),
    );
  tested(() => {
    const intended = storageModel(photoAfter);
    assertExact(
      storageBefore,
      snapshot(photoAfter),
      { "storage.objects": insertion(sqlAfter, "storage.objects", [intended]) },
      "",
      "",
    );
  });
  const badStorage = clone(photoAfter);
  badStorage["storage.objects"][0].metadata = { private: "unmodeled" };
  rejected(() => {
    const intended = storageModel(badStorage);
    assertExact(
      storageBefore,
      snapshot(badStorage),
      { "storage.objects": insertion(sqlAfter, "storage.objects", [intended]) },
      "",
      "",
    );
  });
  const extraStorage = clone(photoAfter);
  extraStorage["storage.objects"][0].level = 1;
  rejected(() => storageModel(extraStorage));
  const outsideWindow = clone(photoAfter);
  outsideWindow["storage.objects"][0].created_at =
    "2026-09-29T12:00:01.123457Z";
  rejected(() => storageModel(outsideWindow));
  rejected(() => bindUuid("go_uuid_v4", objectId, sqlAfter, new Set()));
  rejected(() => bindUuid("database_uuid", SQL_IDS.actor, sqlAfter, new Set()));
  rejected(() =>
    bindUuid("database_uuid", objectId, sqlAfter, new Set([objectId])),
  );
  rejected(() => bindUuid("observed-default", objectId, sqlAfter, new Set()));
  rejected(() => bindTime("observed-default", time, bounds));
  rejected(() => preciseTime("2026-02-30T12:00:00Z"));
  rejected(() => preciseTime("2026-09-29T24:00:00Z"));
  const nonJson = clone(sqlAfter);
  nonJson["public.accounts"][0].status = undefined;
  rejected(() => snapshot(nonJson));
  const changedNumeric = clone(hung);
  changedNumeric["public.hangouts"][0].public_latitude = -0;
  rejected(() =>
    assertExact(snapshot(hung), snapshot(changedNumeric), {}, "", ""),
  );
  rejected(() => window(later, time));
  rejected(() => sourceCandidate(Buffer.from("{}")));
  rejected(() => sourceCandidate(undefined));
  rejected(() =>
    operation(
      setupModelPlans["sql-auth-four"],
      before,
      bounds,
      Object.freeze({}),
      {},
    ),
  );
  rejected(() =>
    operation(
      Object.freeze({ id: "sql-auth-four" }),
      before,
      bounds,
      source,
      {},
    ),
  );
  rejected(() =>
    verifyOperation(
      operation(setupModelPlans["sql-auth-four"], before, bounds, source, {
        unexpected: true,
      }),
      snapshot(sqlAfter),
      "",
    ),
  );
  tested(() => {
    equal(describeModelPlan(Object.freeze({})), {
      available: false,
      reason: "unavailable",
    });
    check(
      !modelCheckpoint.laterOperationsAvailable &&
        modelCheckpoint.readinessAvailable &&
        !modelCheckpoint.racesAvailable,
    );
  });
  let touched = false;
  const trap = new Proxy(
    {},
    {
      get() {
        touched = true;
        throw new Error("private getter");
      },
      ownKeys() {
        touched = true;
        throw new Error("private keys");
      },
    },
  );
  rejected(() => moderationContact(trap));
  tested(() => {
    try {
      moderationContact(trap);
    } catch (error) {
      equal(Object.keys(error), []);
      equal(error.message, "Moderation contact unavailable");
      equal(error.stack, "Error: Moderation contact unavailable");
      check(!Object.hasOwn(error, "cause"));
    }
  });
  tested(() => check(!touched));
  tested(() => {
    for (const handle of Object.values(setupModelPlans)) {
      equal(Object.keys(handle), []);
      check(Object.isFrozen(handle));
    }
  });
  tested(() => {
    const expected = derive(sqlAfter, {});
    equal(expected, sqlAfter);
    check(
      expected !== sqlAfter &&
        expected["public.accounts"] !== sqlAfter["public.accounts"],
    );
  });
  rejected(() =>
    assertExact(snapshot(sqlAfter), snapshot(altered), {}, "", ""),
  );
  tested(() => {
    const receipt = opaque(
      results,
      freeze({ result: { revision: 2, submitted_at: time } }),
    );
    equal(own(results, receipt).result, { revision: 2, submitted_at: time });
  });
  rejected(() =>
    equal(
      { revision: 2, submitted_at: time },
      { revision: "2", submitted_at: time },
    ),
  );
  rejected(() =>
    equal(
      { revision: 2, submitted_at: time },
      { revision: 2, submitted_at: "2026-09-29T12:00:00.123457Z" },
    ),
  );
  groups += readMemoryExamples(source, bounds, time, later, reports, hung);
  groups += transitionMemoryExamples(source, bounds, time, later, reports);
  groups += sanctionMemoryExamples(source, bounds, time, later, reports);
  groups += preSanctionMemoryExamples(source, bounds, time, later, baseline);
  groups += currentReadinessMemoryExamples(source, bounds, time, later);
  return freeze({
    available: true,
    classification: "memory-only",
    groups,
    tables: TABLES.length,
    sourceOnly: true,
    runtimeCredit: 0,
    providerCredit: 0,
    permissionCredit: 0,
    contactAttempts: 0,
  });
}

// Owned observations are manufactured here only, independently of the model
// builders. They are not original HTTP/race execution or sequence acceptance.
function readMemoryExamples(source, bounds, time, later, sqlReports, sqlHung) {
  let groups = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  const queueInput = {
    p_after_submitted_at: null,
    p_after_id: null,
    p_limit: 24,
  };
  const b = clone(sqlReports);
  b["private.moderation_feature_gate"][0].enabled = true;
  const context = (input, setup = {}, jwtRole = "authenticated") => ({
    setup,
    input,
    jwtRole,
    isolation: "read committed",
  });
  const op = (id, raw, input, setup = {}, jwtRole = "authenticated") =>
    operation(
      readModelPlans[id],
      snapshot(raw),
      bounds,
      source,
      context(input, setup, jwtRole),
    );
  let ordinal = 0;
  const appended = (raw, actor, kind, ids) => {
    const after = clone(raw),
      n = ++ordinal;
    after["private.moderation_audit"].push({
      id: `63000000-0000-1000-8000-${String(n * 2).padStart(12, "0")}`,
      occurred_at: time,
      operator_id: actor,
      action: kind,
      report_id: kind === "detail_read" ? ids[0] : null,
      subject_target_type: null,
      subject_target_id: null,
      subject_campus_id: null,
      request_id: `63000000-0000-1000-8000-${String(n * 2 + 1).padStart(12, "0")}`,
      previous_state: null,
      new_state: null,
      previous_revision: null,
      new_revision: null,
      reason: null,
      duplicate_report_id: null,
      page_report_ids: kind === "queue_read" ? ids : null,
      page_count: kind === "queue_read" ? ids.length : null,
      sanction_id: null,
      previous_account_status: null,
      new_account_status: null,
      hangout_disable_id: null,
      previous_hangout_disabled: null,
      new_hangout_disabled: null,
    });
    return after;
  };
  const queueRow = (id) => ({
    report_id: id,
    submitted_at: time,
    target_type: "user",
    target_id: SQL_IDS.target,
    reporter_id: SQL_IDS.reporter,
    category: "harassment",
    case_state: "open",
  });
  const ordered = [SQL_IDS.report3, SQL_IDS.report2, SQL_IDS.report];
  const queue = ordered.map(queueRow),
    queueAfter = appended(b, SQL_IDS.actor, "queue_read", ordered);
  const queueOp = op("queue", b, queueInput);
  tested(() => verifyOperation(queueOp, snapshot(queueAfter), queue));
  tested(() => equal(Object.keys(queue[0]).length, 7));
  const detail = [
    {
      report_id: SQL_IDS.report,
      submitted_at: time,
      target_type: "user",
      target_id: SQL_IDS.target,
      reporter_id: SQL_IDS.reporter,
      category: "harassment",
      case_state: "open",
      case_revision: 0,
      narrative: null,
      provenance_kind: "current_people",
      provenance_ref_id: SQL_IDS.target,
      case_note: null,
      disposition: null,
      target_status: "active",
      target_campus_id: b["public.universities"][0].id,
      target_disabled: null,
    },
  ];
  const detailInput = { p_report_id: SQL_IDS.report },
    detailOp = op("detail", b, detailInput);
  const detailAfter = appended(b, SQL_IDS.actor, "detail_read", [
    SQL_IDS.report,
  ]);
  tested(() => verifyOperation(detailOp, snapshot(detailAfter), detail));
  tested(() => equal(Object.keys(detail[0]).length, 16));
  // Audit is an exact append, including every nullable enforcement column.
  rejected(() => verifyOperation(detailOp, snapshot(b), detail));
  const auditIndex = detailAfter["private.moderation_audit"].length - 1;
  for (const [key, value] of [
    ["action", "queue_read"],
    ["operator_id", SQL_IDS.second],
    ["report_id", SQL_IDS.report2],
    ["page_count", 0],
    ["subject_target_id", SQL_IDS.target],
    ["new_revision", 1],
    ["id", SQL_IDS.target],
    ["request_id", SQL_IDS.report],
    ["occurred_at", "2026-09-29T12:00:01.123457Z"],
  ]) {
    const wrong = clone(detailAfter);
    wrong["private.moderation_audit"][auditIndex][key] = value;
    rejected(() => verifyOperation(detailOp, snapshot(wrong), detail));
  }
  const repeatedUuid = clone(detailAfter);
  repeatedUuid["private.moderation_audit"][auditIndex].request_id =
    repeatedUuid["private.moderation_audit"][auditIndex].id;
  rejected(() => verifyOperation(detailOp, snapshot(repeatedUuid), detail));
  const extraAudit = clone(detailAfter);
  extraAudit["private.moderation_audit"].push(
    clone(queueAfter["private.moderation_audit"][0]),
  );
  rejected(() => verifyOperation(detailOp, snapshot(extraAudit), detail));
  const privateRow = clone(detailAfter);
  privateRow["private.people_blocks"].push({
    blocker_id: SQL_IDS.actor,
    blocked_id: SQL_IDS.target,
  });
  rejected(() => verifyOperation(detailOp, snapshot(privateRow), detail));
  const privateColumn = clone(detailAfter);
  privateColumn["private.moderation_audit"][auditIndex].private_note = "extra";
  rejected(() => verifyOperation(detailOp, snapshot(privateColumn), detail));
  const leakedQueue = clone(queue);
  leakedQueue[0].narrative = "extra";
  rejected(() => verifyOperation(queueOp, snapshot(queueAfter), leakedQueue));
  const wrongValue = clone(queue);
  wrongValue[0].category = "other";
  rejected(() => verifyOperation(queueOp, snapshot(queueAfter), wrongValue));
  rejected(() =>
    verifyOperation(queueOp, snapshot(queueAfter), queue.slice().reverse()),
  );
  rejected(() =>
    verifyOperation(queueOp, snapshot(queueAfter), queue.slice(1)),
  );
  const leakedDetail = clone(detail);
  leakedDetail[0].sanction_id = null;
  rejected(() =>
    verifyOperation(detailOp, snapshot(detailAfter), leakedDetail),
  );
  const wrongRevision = clone(detail);
  wrongRevision[0].case_revision = "0";
  rejected(() =>
    verifyOperation(detailOp, snapshot(detailAfter), wrongRevision),
  );
  const wrongTime = clone(detail);
  wrongTime[0].submitted_at = later;
  rejected(() => verifyOperation(detailOp, snapshot(detailAfter), wrongTime));
  // Cursor compares timestamptz instants + UUID, filters before applying limit,
  // and every empty page still appends a zero-count queue audit.
  const pageInput = {
    p_after_submitted_at: time,
    p_after_id: SQL_IDS.report3,
    p_limit: 1,
  };
  const pageAfter = appended(b, SQL_IDS.actor, "queue_read", [SQL_IDS.report2]);
  tested(() =>
    verifyOperation(op("queue", b, pageInput), snapshot(pageAfter), [
      queueRow(SQL_IDS.report2),
    ]),
  );
  const emptyInput = {
    p_after_submitted_at: time,
    p_after_id: SQL_IDS.report,
    p_limit: 24,
  };
  const emptyAfter = appended(b, SQL_IDS.actor, "queue_read", []);
  tested(() =>
    verifyOperation(op("queue", b, emptyInput), snapshot(emptyAfter), []),
  );
  for (const input of [
    { ...queueInput, p_limit: 0 },
    { ...queueInput, p_limit: 25 },
    { ...queueInput, p_limit: null },
    { ...queueInput, p_limit: "1" },
    { ...queueInput, p_after_id: SQL_IDS.report },
    { ...queueInput, unknown: null },
  ])
    rejected(() =>
      verifyOperation(op("queue", b, input), snapshot(queueAfter), queue),
    );
  const wrongPageAudit = clone(pageAfter);
  wrongPageAudit["private.moderation_audit"][0].page_report_ids = [
    SQL_IDS.report3,
  ];
  rejected(() =>
    verifyOperation(op("queue", b, pageInput), snapshot(wrongPageAudit), [
      queueRow(SQL_IDS.report2),
    ]),
  );
  const wrongPageCount = clone(pageAfter);
  wrongPageCount["private.moderation_audit"][0].page_count = "1";
  rejected(() =>
    verifyOperation(op("queue", b, pageInput), snapshot(wrongPageCount), [
      queueRow(SQL_IDS.report2),
    ]),
  );
  // Post-wait authority changes are independent before states, not race credit.
  for (const mutation of [
    (raw) => {
      raw["private.moderation_feature_gate"] = [];
    },
    (raw) => {
      raw["private.moderation_feature_gate"][0].enabled = false;
    },
    (raw) => {
      raw["public.accounts"] = raw["public.accounts"].filter(
        (a) => a.id !== SQL_IDS.actor,
      );
    },
    (raw) => {
      raw["public.accounts"][0].status = "suspended";
    },
    (raw) => {
      raw["public.accounts"][0].status = "banned";
    },
    (raw) => {
      raw["public.platform_roles"] = raw["public.platform_roles"].filter(
        (a) => a.user_id !== SQL_IDS.actor,
      );
    },
    (raw) => {
      raw["public.platform_roles"][0].role = "student";
    },
  ]) {
    const changed = clone(b);
    mutation(changed);
    rejected(() =>
      verifyOperation(
        op("detail", changed, detailInput),
        snapshot(detailAfter),
        detail,
      ),
    );
  }
  const wrongRole = context(detailInput);
  wrongRole.jwtRole = "service_role";
  rejected(() =>
    verifyOperation(
      operation(readModelPlans.detail, snapshot(b), bounds, source, wrongRole),
      snapshot(detailAfter),
      detail,
    ),
  );
  const isolation = context(detailInput);
  isolation.isolation = "repeatable read";
  rejected(() =>
    verifyOperation(
      operation(readModelPlans.detail, snapshot(b), bounds, source, isolation),
      snapshot(detailAfter),
      detail,
    ),
  );
  const gateOff = clone(b);
  gateOff["private.moderation_feature_gate"][0].enabled = false;
  const denial = { code: "42501", message: "Moderation unavailable" };
  tested(() =>
    verifyOperation(
      op("gate-off.queue", gateOff, queueInput),
      snapshot(gateOff),
      denial,
    ),
  );
  rejected(() =>
    verifyOperation(op("gate-off.queue", b, queueInput), snapshot(b), denial),
  );
  tested(() =>
    verifyOperation(
      op("anonymous.queue", b, queueInput, {}, "anon"),
      snapshot(b),
      { execution: "unavailable" },
    ),
  );
  // Source-equivalent HTTP setup with distinct private conflict reports and
  // metadata-forgery user. This is manufactured memory, never JWT/signup credit.
  const http = clone(b),
    setup = {
      lane: "http",
      actor: SQL_IDS.actor,
      reporter: SQL_IDS.reporter,
      target: SQL_IDS.target,
      second: SQL_IDS.second,
      report: SQL_IDS.report,
      selfFiledReport: SQL_IDS.report2,
      selfTargetReport: SQL_IDS.report3,
      ownHangoutReport: SQL_IDS.hangoutReport,
      hangout: SQL_IDS.hangout,
    };
  http["auth.users"].forEach((a, i) => {
    a.raw_user_meta_data = i === 1 ? { role: "admin" } : {};
    a.raw_app_meta_data = { provider: "email", providers: ["email"] };
  });
  http["private.safety_reports"][0].category = "other";
  http["private.safety_reports"][0].narrative = "Local allegation";
  http["private.safety_reports"][1].reporter_id = SQL_IDS.actor;
  http["private.safety_reports"][2].target_id = SQL_IDS.actor;
  http["private.safety_reports"][2].provenance_ref_id = SQL_IDS.actor;
  http["public.hangouts"] = clone(sqlHung["public.hangouts"]);
  http["public.hangouts"][0].host_id = SQL_IDS.actor;
  http["private.safety_reports"].push(
    clone(
      sqlHung["private.safety_reports"].find(
        (r) => r.id === SQL_IDS.hangoutReport,
      ),
    ),
  );
  for (const id of READ_IDS.filter((id) => id.startsWith("private-rest."))) {
    tested(() =>
      verifyOperation(op(id, http, {}, setup), snapshot(http), { status: 404 }),
    );
    rejected(() =>
      verifyOperation(op(id, http, {}, setup), snapshot(http), { status: 403 }),
    );
    rejected(() =>
      verifyOperation(op(id, b, {}), snapshot(b), { status: 404 }),
    );
  }
  for (const id of ["nonoperator.queue", "nonoperator.detail"])
    rejected(() =>
      verifyOperation(
        op(id, b, id.endsWith("queue") ? queueInput : detailInput),
        snapshot(b),
        denial,
      ),
    );
  for (const id of ["nonoperator.queue", "nonoperator.detail"])
    tested(() =>
      verifyOperation(
        op(id, http, id.endsWith("queue") ? queueInput : detailInput, setup),
        snapshot(http),
        denial,
      ),
    );
  const filteredAfter = appended(http, SQL_IDS.actor, "queue_read", [
    SQL_IDS.report,
  ]);
  const filteredRows = [{ ...queueRow(SQL_IDS.report), category: "other" }];
  tested(() =>
    verifyOperation(
      op("queue", http, queueInput, setup),
      snapshot(filteredAfter),
      filteredRows,
    ),
  );
  rejected(() =>
    verifyOperation(
      op("queue", http, queueInput, setup),
      snapshot(filteredAfter),
      [...filteredRows, queueRow(SQL_IDS.report2)],
    ),
  );
  const filteredLimitAfter = appended(http, SQL_IDS.actor, "queue_read", [
    SQL_IDS.report,
  ]);
  tested(() =>
    verifyOperation(
      op("queue", http, { ...queueInput, p_limit: 1 }, setup),
      snapshot(filteredLimitAfter),
      filteredRows,
    ),
  );

  for (const id of READ_IDS.filter((id) => id.startsWith("conflict."))) {
    const reportId = id.includes("self-filed")
      ? setup.selfFiledReport
      : id.includes("self-target")
        ? setup.selfTargetReport
        : setup.ownHangoutReport;
    const input = id.endsWith("detail")
      ? { p_report_id: reportId }
      : {
          p_report_id: reportId,
          p_request_id: "64000000-0000-4000-8000-000000000001",
          p_expected_revision: 0,
          p_action: "start_review",
        };
    const conflictOp = op(id, http, input, setup);
    tested(() => verifyOperation(conflictOp, snapshot(http), denial));
    const unexpected = appended(http, SQL_IDS.actor, "detail_read", [reportId]);
    rejected(() => verifyOperation(conflictOp, snapshot(unexpected), denial));
    const unexpectedPrivate = clone(http);
    unexpectedPrivate["private.people_blocks"].push({
      blocker_id: SQL_IDS.actor,
      blocked_id: SQL_IDS.target,
    });
    rejected(() =>
      verifyOperation(conflictOp, snapshot(unexpectedPrivate), denial),
    );
    const conflictRemoved = clone(http),
      r = conflictRemoved["private.safety_reports"].find(
        (r) => r.id === reportId,
      );
    if (id.includes("self-filed")) r.reporter_id = SQL_IDS.reporter;
    if (id.includes("self-target")) r.target_id = SQL_IDS.target;
    if (id.includes("own-hangout"))
      conflictRemoved["public.hangouts"][0].host_id = SQL_IDS.target;
    rejected(() =>
      verifyOperation(
        op(id, conflictRemoved, input, setup),
        snapshot(conflictRemoved),
        denial,
      ),
    );
  }
  const changedError = {
    code: "42501",
    message: "Moderation unavailable extra",
  };
  rejected(() =>
    verifyOperation(
      op("nonoperator.queue", http, queueInput, setup),
      snapshot(http),
      changedError,
    ),
  );
  // Fixed component counts stay private and compare numeric types exactly.
  tested(() =>
    equal(auditCounts(snapshot(queueAfter), {}), {
      total: 1,
      startReview: 0,
      queueContainingReport: 1,
    }),
  );
  const continued = appended(queueAfter, SQL_IDS.actor, "detail_read", [
    SQL_IDS.report,
  ]);
  tested(() =>
    verifyOperation(
      op("detail", queueAfter, detailInput),
      snapshot(continued),
      detail,
    ),
  );
  const oldChanged = clone(continued);
  oldChanged["private.moderation_audit"][0].page_count = 9;
  rejected(() =>
    verifyOperation(
      op("detail", queueAfter, detailInput),
      snapshot(oldChanged),
      detail,
    ),
  );
  // Later read components consume source-bound preexisting case values only;
  // no successful transition expectation or HTTP sequence is implemented here.
  for (const [id, revision, note] of [
    ["second-detail", 1, null],
    ["refresh-detail", 2, "Reviewed evidence"],
  ]) {
    const state = clone(b);
    state["private.moderation_cases"] = [
      {
        report_id: SQL_IDS.report,
        state: "in_review",
        revision,
        note,
        disposition: null,
        duplicate_report_id: null,
        sanction_id: null,
        hangout_disable_id: null,
      },
    ];
    const after = appended(state, SQL_IDS.second, "detail_read", [
      SQL_IDS.report,
    ]);
    const rows = [
      {
        ...detail[0],
        case_state: "in_review",
        case_revision: revision,
        case_note: note,
      },
    ];
    tested(() =>
      verifyOperation(op(id, state, detailInput), snapshot(after), rows),
    );
    tested(() =>
      check(describeModelPlan(readModelPlans[id]).sequenceAvailable === false),
    );
  }
  const restricted = clone(b);
  restricted["public.accounts"][2].status = "suspended";
  restricted["public.platform_roles"].push({
    user_id: SQL_IDS.target,
    role: "admin",
    created_at: time,
  });
  const restrictedAfter = appended(restricted, SQL_IDS.actor, "detail_read", [
    SQL_IDS.report,
  ]);
  tested(() =>
    verifyOperation(
      op("detail", restricted, detailInput),
      snapshot(restrictedAfter),
      [{ ...detail[0], target_status: "suspended" }],
    ),
  );
  const missingMember = clone(b);
  missingMember["public.university_memberships"] = missingMember[
    "public.university_memberships"
  ].filter((m) => m.user_id !== SQL_IDS.target);
  const noCampusAfter = appended(missingMember, SQL_IDS.actor, "detail_read", [
    SQL_IDS.report,
  ]);
  tested(() =>
    verifyOperation(
      op("detail", missingMember, detailInput),
      snapshot(noCampusAfter),
      [{ ...detail[0], target_campus_id: null }],
    ),
  );
  const missingTarget = clone(missingMember);
  missingTarget["public.accounts"] = missingTarget["public.accounts"].filter(
    (a) => a.id !== SQL_IDS.target,
  );
  const noTargetAfter = appended(missingTarget, SQL_IDS.actor, "detail_read", [
    SQL_IDS.report,
  ]);
  tested(() =>
    verifyOperation(
      op("detail", missingTarget, detailInput),
      snapshot(noTargetAfter),
      [{ ...detail[0], target_status: "unavailable", target_campus_id: null }],
    ),
  );
  tested(() => {
    const rows = detailRows(sqlHung, SQL_IDS.hangoutReport);
    equal(rows[0].target_disabled, false);
    equal(rows[0].target_status, "published");
  });
  tested(() => {
    const raw = clone(sqlHung);
    raw["public.hangouts"] = [];
    const rows = detailRows(raw, SQL_IDS.hangoutReport);
    equal(rows[0].target_disabled, null);
    equal(rows[0].target_campus_id, null);
    equal(rows[0].target_status, "unavailable");
  });
  tested(() => {
    for (const handle of Object.values(readModelPlans)) {
      equal(Object.keys(handle), []);
      check(Object.isFrozen(handle));
    }
    check(
      !modelCheckpoint.httpTransportAvailable &&
        !modelCheckpoint.httpSequencesAvailable &&
        !modelCheckpoint.racesAvailable,
    );
    check(
      !Object.hasOwn(readModelPlans, "start-review") &&
        !Object.hasOwn(readModelPlans, "sanction"),
    );
  });
  rejected(() =>
    operation(
      readModelPlans["start-review"],
      snapshot(b),
      bounds,
      source,
      context(detailInput),
    ),
  );
  rejected(() =>
    verifyOperation(
      op("detail", b, { p_report_id: SQL_IDS.report2 }),
      snapshot(detailAfter),
      detail,
    ),
  );
  return groups;
}

// Manufactured observations only. These examples execute no source SQL/module,
// waits, transport or permission operation; every production expectation above
// is independently built from the before snapshot and finite source operation.
function transitionMemoryExamples(source, bounds, time, later, sqlReports) {
  let groups = 0,
    ordinal = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  const denial = { code: "42501", message: "Moderation unavailable" };
  const baseline = clone(sqlReports);
  baseline["private.moderation_feature_gate"][0].enabled = true;
  baseline["private.safety_feature_gate"][0].enabled = true;
  const newId = () =>
    `64000000-0000-1000-8000-${String(++ordinal).padStart(12, "0")}`;
  const bindings = {
    initial: "65000000-0000-4000-8000-000000000001",
    annotate: "65000000-0000-4000-8000-000000000002",
    stale: "65000000-0000-4000-8000-000000000003",
  };
  const context = (input, setup = {}) => ({
    setup,
    input,
    jwtRole: "authenticated",
    isolation: "read committed",
  });
  const requestInput = (id, c, b = bindings) => {
    const [actor, report, request, revision, action, note] = TRANSITIONS[id];
    check(actor);
    return {
      p_report_id: c[report],
      p_request_id:
        request ??
        b[
          [
            "http.annotate",
            "http.annotate-normalized-replay",
            "http.annotate-changed-body-retry",
          ].includes(id)
            ? "annotate"
            : id === "http.stale"
              ? "stale"
              : "initial"
        ],
      p_expected_revision: revision,
      p_action: action,
      ...(note === null ? {} : { p_note: note }),
    };
  };
  const audit = (
    raw,
    actor,
    action,
    report,
    request,
    previous,
    revision,
    note,
    campus,
    ids = null,
  ) => {
    raw["private.moderation_audit"].push({
      id: newId(),
      occurred_at: time,
      operator_id: actor,
      action,
      report_id: report?.id ?? null,
      subject_target_type: report?.target_type ?? null,
      subject_target_id: report?.target_id ?? null,
      subject_campus_id: campus,
      request_id: request,
      previous_state: previous,
      new_state: revision === null ? null : "in_review",
      previous_revision: revision === null ? null : revision - 1,
      new_revision: revision,
      reason: note,
      duplicate_report_id: null,
      page_report_ids: ids,
      page_count: ids === null ? null : ids.length,
      sanction_id: null,
      previous_account_status: null,
      new_account_status: null,
      hangout_disable_id: null,
      previous_hangout_disabled: null,
      new_hangout_disabled: null,
    });
  };
  const manufactured = (id, raw, setup = {}, b = bindings) => {
    const after = clone(raw),
      c = { ...SQL_IDS, ...setup };
    if (
      Object.hasOwn(LOSS_READS, id) ||
      [
        "race.target-role",
        "race.case-replay-veto",
        "race.second-operator",
        "http.stale",
        "http.suspended-retry",
        "http.banned-retry",
        "http.gate-retry",
      ].includes(id)
    )
      return { after, result: clone(denial) };
    if (TRANSITIONS[id]) {
      const [actorKey, reportKey, , expectedRevision, action, note] =
        TRANSITIONS[id];
      const input = requestInput(id, c, b),
        actor = c[actorKey],
        reportId = c[reportKey];
      if (id === "http.replay" || id === "race.same-key-replay")
        return {
          after,
          result: id.startsWith("race.")
            ? "in_review|1"
            : [{ case_state: "in_review", revision: 1 }],
        };
      const report = raw["private.safety_reports"].find(
        (r) => r.id === reportId,
      );
      const old = raw["private.moderation_cases"].find(
        (r) => r.report_id === reportId,
      );
      const revision = expectedRevision + 1;
      after["private.moderation_cases"] = after[
        "private.moderation_cases"
      ].filter((r) => r.report_id !== reportId);
      after["private.moderation_cases"].push({
        report_id: reportId,
        state: "in_review",
        revision,
        note,
        disposition: null,
        duplicate_report_id: null,
        sanction_id: null,
        hangout_disable_id: null,
      });
      // Source-literal text, separate from transitionDecision's value serializer.
      const text = `["${reportId}", ${expectedRevision}, "${action}", ${note === null ? "null" : '"' + note + '"'}, null]`;
      after["private.moderation_requests"].push({
        operator_id: actor,
        request_id: input.p_request_id,
        fingerprint: createHash("md5").update(text).digest("hex"),
        report_id: reportId,
        result_state: "in_review",
        result_revision: revision,
      });
      const campus =
        raw["public.university_memberships"].find(
          (r) => r.user_id === report.target_id,
        )?.university_id ?? null;
      audit(
        after,
        actor,
        action,
        report,
        input.p_request_id,
        old?.state ?? "open",
        revision,
        note,
        campus,
      );
      return {
        after,
        result: id.startsWith("race.")
          ? `in_review|${revision}`
          : [{ case_state: "in_review", revision }],
      };
    }
    if (
      [
        "detail",
        "second-detail",
        "refresh-detail",
        "queue",
        "race.detail-count",
      ].includes(id)
    ) {
      const actor = ["second-detail", "refresh-detail"].includes(id)
        ? c.second
        : c.actor;
      const r = raw["private.safety_reports"].find((r) => r.id === c.report);
      const caseRow = raw["private.moderation_cases"].find(
        (row) => row.report_id === c.report,
      );
      const row = {
        report_id: r.id,
        submitted_at: r.submitted_at,
        target_type: r.target_type,
        target_id: r.target_id,
        reporter_id: r.reporter_id,
        category: r.category,
        case_state: caseRow?.state ?? "open",
      };
      if (id !== "queue")
        Object.assign(row, {
          case_revision: caseRow?.revision ?? 0,
          narrative: r.narrative,
          provenance_kind: r.provenance_kind,
          provenance_ref_id: r.provenance_ref_id,
          case_note: caseRow?.note ?? null,
          disposition: caseRow?.disposition ?? null,
          target_status: "active",
          target_campus_id:
            raw["public.university_memberships"].find(
              (m) => m.user_id === r.target_id,
            )?.university_id ?? null,
          target_disabled: null,
        });
      audit(
        after,
        actor,
        id === "queue" ? "queue_read" : "detail_read",
        id === "queue" ? null : { id: r.id },
        newId(),
        null,
        null,
        null,
        null,
        id === "queue" ? [r.id] : null,
      );
      return { after, result: id === "race.detail-count" ? "1" : [row] };
    }
    switch (id) {
      case "moderation-disable":
        after["private.moderation_feature_gate"][0].enabled = false;
        break;
      case "moderation-enable":
        after["private.moderation_feature_gate"][0].enabled = true;
        after["private.safety_feature_gate"][0].enabled = true;
        break;
      case "actor-suspend":
      case "actor-ban":
      case "actor-restore":
        after["public.accounts"].find((r) => r.id === c.actor).status =
          id === "actor-suspend"
            ? "suspended"
            : id === "actor-ban"
              ? "banned"
              : "active";
        break;
      case "actor-role-delete":
      case "target-role-delete":
        after["public.platform_roles"] = after["public.platform_roles"].filter(
          (r) =>
            r.user_id !== (id === "actor-role-delete" ? c.actor : c.target),
        );
        break;
      case "actor-role-restore":
      case "target-role-insert":
        after["public.platform_roles"].push({
          user_id: id === "actor-role-restore" ? c.actor : c.target,
          role: "moderator",
          created_at: time,
        });
        break;
      case "target-membership-delete":
        after["public.university_memberships"] = after[
          "public.university_memberships"
        ].filter((r) => r.user_id !== c.target);
        break;
      case "target-membership-restore":
        after["public.university_memberships"].push({
          user_id: c.target,
          university_id: raw["public.universities"][0].id,
          verified_at: time,
          verification_email: "moderation-race-3@unc.edu",
          created_at: time,
        });
        break;
      default:
        throw new Error("Moderation model unavailable");
    }
    return { after, result: "" };
  };
  const seqObservations = (ids, raw, setup = {}, b = bindings) => {
    let state = raw;
    const observations = ids.map((id) => {
      const observation = manufactured(id, state, setup, b);
      state = observation.after;
      return { afterHandle: snapshot(state), result: observation.result };
    });
    return { observations, after: state };
  };
  const verify = (id, raw, observed, setup = {}, input) =>
    verifyOperation(
      operation(
        transitionModelPlans[id],
        snapshot(raw),
        bounds,
        source,
        context(
          input ??
            (TRANSITIONS[id]
              ? requestInput(id, { ...SQL_IDS, ...setup })
              : { p_report_id: SQL_IDS.report }),
          setup,
        ),
      ),
      snapshot(observed.after),
      observed.result,
    );
  tested(() =>
    equal(Object.keys(RACE_STEPS), [
      "gate_first",
      "read_first",
      "role_first",
      "role_read_first",
      "account_first",
      "account_read_first",
      "target_role_first",
      "case_first",
      "two_operators",
      "same_key",
      "membership_delete_first",
      "action_before_membership_delete",
    ]),
  );
  for (const id of ["gate_first", "read_first"]) {
    const seq = sequenceOperation(
      raceModelPlans[id],
      snapshot(baseline),
      bounds,
      source,
      {},
      {},
    );
    const made = seqObservations(RACE_STEPS[id], baseline);
    tested(() => {
      verifySequence(seq, made.observations);
      equal(
        made.after["private.safety_feature_gate"],
        baseline["private.safety_feature_gate"],
      );
      equal(made.after["private.moderation_feature_gate"], [
        { singleton: true, enabled: true },
      ]);
    });
    for (const state of ["disabled", "missing"]) {
      const invalid = clone(baseline);
      if (state === "disabled")
        invalid["private.safety_feature_gate"][0].enabled = false;
      else invalid["private.safety_feature_gate"] = [];
      rejected(() =>
        sequenceOperation(
          raceModelPlans[id],
          snapshot(invalid),
          bounds,
          source,
          {},
          {},
        ),
      );
    }
    for (const table of [
      "private.safety_feature_gate",
      "private.people_feature_gate",
    ]) {
      const changed = clone(made.after);
      changed[table][0].enabled = !changed[table][0].enabled;
      const observations = made.observations.slice();
      observations[observations.length - 1] = {
        afterHandle: snapshot(changed),
        result: "",
      };
      rejected(() => verifySequence(seq, observations));
    }
    rejected(() => verifySequence(seq, made.observations.slice(0, -1)));
    rejected(() => verifySequence(seq, made.observations.slice().reverse()));
  }
  let raceState = clone(baseline);
  const allRaceObservations = [];
  for (const id of Object.keys(RACE_STEPS)) {
    const seq = sequenceOperation(
      raceModelPlans[id],
      snapshot(raceState),
      bounds,
      source,
      {},
      {},
    );
    const made = seqObservations(RACE_STEPS[id], raceState);
    tested(() => verifySequence(seq, made.observations));
    rejected(() => verifySequence(seq, made.observations.slice(1)));
    if (id === "same_key")
      tested(() => verifySequence(seq, made.observations.slice().reverse()));
    else
      rejected(() => verifySequence(seq, made.observations.slice().reverse()));
    tested(() =>
      check(describeModelPlan(raceModelPlans[id]).orderCredit === 0),
    );
    allRaceObservations.push(made);
    raceState = made.after;
  }
  tested(() =>
    equal(
      raceState["private.moderation_audit"].filter(
        (r) => r.action === "start_review",
      ).length,
      3,
    ),
  );
  tested(() => equal(raceState["private.moderation_requests"].length, 5));
  tested(() =>
    equal(
      find(
        raceState,
        "private.moderation_cases",
        (r) => r.report_id === SQL_IDS.report2,
      ).revision,
      3,
    ),
  );
  tested(() =>
    equal(
      find(
        raceState,
        "private.moderation_audit",
        (r) => r.request_id === "52000000-0000-4000-8003-000000000008",
      ).subject_campus_id,
      null,
    ),
  );
  tested(() =>
    equal(
      find(
        raceState,
        "private.moderation_audit",
        (r) => r.request_id === "52000000-0000-4000-8003-000000000009",
      ).subject_campus_id,
      baseline["public.universities"][0].id,
    ),
  );
  const first = manufactured("race.case", baseline);
  tested(() => verify("race.case", baseline, first));
  const countRead = manufactured("race.detail-count", baseline);
  tested(() => verify("race.detail-count", baseline, countRead));
  rejected(() =>
    verify("race.detail-count", baseline, { ...countRead, result: 1 }),
  );
  rejected(() =>
    verify("race.detail-count", baseline, { ...countRead, result: "0" }),
  );
  for (const [table, field, value] of [
    ["private.moderation_cases", "revision", 2],
    ["private.moderation_cases", "note", "private changed"],
    ["private.moderation_cases", "disposition", "no_action"],
    ["private.moderation_cases", "sanction_id", SQL_IDS.target],
    ["private.moderation_requests", "fingerprint", "wrong"],
    ["private.moderation_requests", "result_revision", "1"],
    ["private.moderation_requests", "operator_id", SQL_IDS.second],
    ["private.moderation_audit", "operator_id", SQL_IDS.second],
    ["private.moderation_audit", "request_id", SQL_IDS.report],
    ["private.moderation_audit", "reason", "wrong"],
    ["private.moderation_audit", "subject_campus_id", null],
    ["private.moderation_audit", "sanction_id", SQL_IDS.target],
    ["private.moderation_audit", "new_revision", "1"],
    ["private.moderation_audit", "occurred_at", "2026-09-29T12:02:00Z"],
    ["private.moderation_audit", "id", SQL_IDS.target],
    ["public.accounts", "status", "banned"],
  ]) {
    const changed = clone(first);
    changed.after[table][0][field] = value;
    rejected(() => verify("race.case", baseline, changed));
  }
  const extra = clone(first);
  extra.after["private.moderation_audit"].push({
    ...extra.after["private.moderation_audit"][0],
    id: newId(),
  });
  rejected(() => verify("race.case", baseline, extra));
  const column = clone(first);
  column.after["private.moderation_cases"][0].secret = "private";
  rejected(() => verify("race.case", baseline, column));
  const wrongResult = clone(first);
  wrongResult.result = "in_review|01";
  rejected(() => verify("race.case", baseline, wrongResult));
  for (const [key, value] of [
    ["p_action", "annotate"],
    ["p_expected_revision", 1],
    ["p_report_id", SQL_IDS.report2],
    ["p_note", "changed"],
    ["p_duplicate_report_id", SQL_IDS.report2],
    ["p_request_id", "52000000-0000-4000-8003-000000000099"],
  ]) {
    const changed = { ...requestInput("race.case", SQL_IDS), [key]: value };
    rejected(() => verify("race.case", baseline, first, {}, changed));
  }
  for (const loss of ["gate", "role", "account", "target-role"]) {
    const state = clone(baseline);
    if (loss === "gate")
      state["private.moderation_feature_gate"][0].enabled = false;
    if (loss === "role")
      state["public.platform_roles"] = state["public.platform_roles"].filter(
        (r) => r.user_id !== SQL_IDS.actor,
      );
    if (loss === "account")
      state["public.accounts"].find((r) => r.id === SQL_IDS.actor).status =
        "banned";
    if (loss === "target-role")
      state["public.platform_roles"].push({
        user_id: SQL_IDS.target,
        role: "admin",
        created_at: time,
      });
    tested(() => verify("race.case", state, { after: state, result: denial }));
    rejected(() => verify("race.case", state, first));
  }
  // Retry mismatch is derived independently even when an old receipt exists.
  for (const field of ["fingerprint", "result_state", "result_revision"]) {
    const state = clone(first.after);
    state["private.moderation_requests"][0][field] =
      field === "result_revision" ? 2 : "changed";
    if (field === "fingerprint") {
      const op = own(
        operations,
        operation(
          transitionModelPlans["race.case"],
          snapshot(state),
          bounds,
          source,
          context(requestInput("race.case", SQL_IDS)),
        ),
      );
      const c = {
        ...SQL_IDS,
        input: requestInput("race.case", SQL_IDS),
        jwtRole: "authenticated",
        isolation: "read committed",
      };
      tested(() =>
        equal(
          transitionDecision({ ...op, id: "race.same-key-replay" }, state, c)
            .result,
          denial,
        ),
      );
    } else
      rejected(() =>
        verify("race.case-replay-veto", state, {
          after: state,
          result: denial,
        }),
      );
  }
  // Independent, source-bound HTTP before fixture; no signup/JWT/provider proof.
  const httpSetup = {
    lane: "http",
    actor: SQL_IDS.actor,
    reporter: SQL_IDS.reporter,
    target: SQL_IDS.target,
    second: SQL_IDS.second,
    report: SQL_IDS.report,
    selfFiledReport: SQL_IDS.report2,
    selfTargetReport: SQL_IDS.report3,
    ownHangoutReport: SQL_IDS.hangoutReport,
    hangout: SQL_IDS.hangout,
  };
  let httpState = clone(baseline);
  for (const r of httpState["auth.users"]) {
    r.raw_user_meta_data = r.id === SQL_IDS.reporter ? { role: "admin" } : {};
    r.raw_app_meta_data = { provider: "email", providers: ["email"] };
  }
  httpState["private.safety_reports"][0].category = "other";
  httpState["private.safety_reports"][0].narrative = "Local allegation";
  httpState["private.safety_reports"][1].reporter_id = SQL_IDS.actor;
  httpState["private.safety_reports"][2].target_id = SQL_IDS.actor;
  for (const id of ["queue", "detail"]) {
    const made = manufactured(id, httpState, httpSetup);
    const input =
      id === "queue"
        ? { p_after_submitted_at: null, p_after_id: null, p_limit: 24 }
        : { p_report_id: SQL_IDS.report };
    tested(() =>
      verifyOperation(
        operation(
          readModelPlans[id],
          snapshot(httpState),
          bounds,
          source,
          context(input, httpSetup),
        ),
        snapshot(made.after),
        made.result,
      ),
    );
    httpState = made.after;
  }
  const beforeHttp = clone(httpState),
    httpMade = [];
  for (const id of Object.keys(HTTP_TRANSITION_STEPS)) {
    const seq = sequenceOperation(
      httpTransitionPlans[id],
      snapshot(httpState),
      bounds,
      source,
      httpSetup,
      bindings,
    );
    const made = seqObservations(
      HTTP_TRANSITION_STEPS[id],
      httpState,
      httpSetup,
    );
    tested(() => verifySequence(seq, made.observations));
    rejected(() => verifySequence(seq, []));
    tested(() =>
      equal(
        describeModelPlan(httpTransitionPlans[id]).steps,
        HTTP_TRANSITION_STEPS[id],
      ),
    );
    httpMade.push({ id, before: httpState, seq, made });
    httpState = made.after;
  }
  tested(() =>
    equal(
      httpState["private.moderation_audit"].length,
      beforeHttp["private.moderation_audit"].length + 4,
    ),
  );
  const reviewState = httpMade.find(
    (r) => r.id === "MODHTTP.refresh-and-audit",
  ).before;
  tested(() =>
    verify(
      "http.annotate-normalized-replay",
      reviewState,
      {
        after: reviewState,
        result: [{ case_state: "in_review", revision: 2 }],
      },
      httpSetup,
    ),
  );
  tested(() =>
    verify(
      "http.start-changed-retry",
      reviewState,
      { after: reviewState, result: denial },
      httpSetup,
    ),
  );
  tested(() =>
    verify(
      "http.start-changed-action-retry",
      reviewState,
      { after: reviewState, result: denial },
      httpSetup,
    ),
  );
  tested(() =>
    verify(
      "http.annotate-changed-body-retry",
      reviewState,
      { after: reviewState, result: denial },
      httpSetup,
    ),
  );
  const changedKey = {
    ...requestInput("http.start", httpSetup),
    p_request_id: "65000000-0000-4000-8000-000000000010",
  };
  tested(() =>
    verify(
      "http.start",
      reviewState,
      { after: reviewState, result: denial },
      httpSetup,
      changedKey,
    ),
  );
  const deniedDelta = clone(reviewState);
  deniedDelta["private.moderation_requests"].push({
    ...deniedDelta["private.moderation_requests"][0],
    request_id: changedKey.p_request_id,
  });
  rejected(() =>
    verify(
      "http.start",
      reviewState,
      { after: deniedDelta, result: denial },
      httpSetup,
      changedKey,
    ),
  );
  const normalizedDelta = clone(reviewState);
  normalizedDelta["private.moderation_audit"].push({
    ...normalizedDelta["private.moderation_audit"][0],
    id: newId(),
  });
  rejected(() =>
    verify(
      "http.annotate-normalized-replay",
      reviewState,
      {
        after: normalizedDelta,
        result: [{ case_state: "in_review", revision: 2 }],
      },
      httpSetup,
    ),
  );
  const closed = clone(reviewState);
  closed["private.moderation_cases"][0] = {
    report_id: SQL_IDS.report,
    state: "closed",
    revision: 3,
    note: "Local decision",
    disposition: "no_action",
    duplicate_report_id: null,
    sanction_id: null,
    hangout_disable_id: null,
  };
  const reopenInput = {
    p_report_id: SQL_IDS.report,
    p_request_id: "65000000-0000-4000-8000-000000000004",
    p_expected_revision: 3,
    p_action: "reopen",
    p_note: "Further review",
  };
  const reopened = manufactured("http.reopen", closed, httpSetup, {
    ...bindings,
    initial: reopenInput.p_request_id,
  });
  tested(() => verify("http.reopen", closed, reopened, httpSetup, reopenInput));
  tested(() =>
    equal(reopened.after["private.moderation_cases"][0].revision, 4),
  );
  // Source-bound closed action_taken before fixture only. No action RPC model or
  // sanction-to-reopen HTTP sequence is supplied by this independent primitive.
  const sanctioned = clone(closed),
    sanctionId = "65000000-0000-4000-8000-000000000020";
  sanctioned["private.account_sanctions"].push({
    id: sanctionId,
    report_id: SQL_IDS.report,
    subject_type: "user",
    subject_id: SQL_IDS.target,
    operator_id: SQL_IDS.actor,
    request_id: "65000000-0000-4000-8000-000000000021",
    action: "suspend",
    previous_status: "active",
    new_status: "suspended",
    subject_campus_id: baseline["public.universities"][0].id,
    reason: "Local decision",
    occurred_at: time,
  });
  sanctioned["private.moderation_cases"][0].disposition = "action_taken";
  sanctioned["private.moderation_cases"][0].sanction_id = sanctionId;
  sanctioned["public.accounts"].find((r) => r.id === SQL_IDS.target).status =
    "suspended";
  const sanctionReopen = manufactured("http.reopen", sanctioned, httpSetup, {
    ...bindings,
    initial: reopenInput.p_request_id,
  });
  tested(() =>
    verify("http.reopen", sanctioned, sanctionReopen, httpSetup, reopenInput),
  );
  tested(() =>
    equal(
      sanctionReopen.after["private.account_sanctions"],
      sanctioned["private.account_sanctions"],
    ),
  );
  tested(() =>
    equal(
      find(
        sanctionReopen.after,
        "public.accounts",
        (r) => r.id === SQL_IDS.target,
      ).status,
      "suspended",
    ),
  );
  const retainedLink = clone(sanctionReopen);
  retainedLink.after["private.moderation_cases"][0].sanction_id = sanctionId;
  rejected(() =>
    verify("http.reopen", sanctioned, retainedLink, httpSetup, reopenInput),
  );
  const unchangedClosed = clone(reopened);
  unchangedClosed.after["private.moderation_cases"][0].disposition =
    "no_action";
  rejected(() =>
    verify("http.reopen", closed, unchangedClosed, httpSetup, reopenInput),
  );
  rejected(() =>
    verify("http.reopen", reviewState, reopened, httpSetup, reopenInput),
  );
  for (const id of ["current_report_first", "detail_first", "block_first"]) {
    tested(() =>
      equal(describeModelPlan(raceModelPlans[id]), {
        available: false,
        reason: "unavailable",
      }),
    );
    rejected(() =>
      sequenceOperation(
        raceModelPlans[id],
        snapshot(baseline),
        bounds,
        source,
        {},
        {},
      ),
    );
  }
  for (const object of [
    transitionModelPlans,
    raceModelPlans,
    httpTransitionPlans,
  ])
    tested(() => {
      check(Object.isFrozen(object));
      for (const handle of Object.values(object)) {
        check(Object.isFrozen(handle));
        equal(Object.keys(handle), []);
      }
    });
  rejected(() =>
    sequenceOperation(
      httpTransitionPlans["MODHTTP.start-review"],
      snapshot(baseline),
      bounds,
      source,
      {},
      bindings,
    ),
  );
  rejected(() =>
    sequenceOperation(
      raceModelPlans.gate_first,
      snapshot(baseline),
      bounds,
      source,
      {},
      { initial: bindings.initial },
    ),
  );
  rejected(() => verifySequence({}, []));
  tested(() =>
    equal(TRANSITIONS["race.no-campus"].slice(2), [
      "52000000-0000-4000-8003-000000000008",
      1,
      "annotate",
      "Campus unavailable",
    ]),
  );
  tested(() =>
    equal(TRANSITIONS["race.current-campus"].slice(2), [
      "52000000-0000-4000-8003-000000000009",
      2,
      "annotate",
      "Current campus",
    ]),
  );
  tested(() =>
    check(
      !modelCheckpoint.httpTransportAvailable &&
        !modelCheckpoint.httpSequencesAvailable &&
        !modelCheckpoint.racesAvailable &&
        modelCheckpoint.readinessAvailable,
    ),
  );
  check(
    allRaceObservations.length === 12 &&
      httpMade.length === 9 &&
      preciseTime(later) >= preciseTime(time),
  );
  return groups;
}

// Owned manufactured observations, independently written from finite source rows.
function sanctionMemoryExamples(source, bounds, time, later, sqlReports) {
  let groups = 0,
    ordinal = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  const setup = {
    lane: "http",
    actor: SQL_IDS.actor,
    reporter: SQL_IDS.reporter,
    target: SQL_IDS.target,
    second: SQL_IDS.second,
    report: SQL_IDS.report,
    selfFiledReport: SQL_IDS.report2,
    selfTargetReport: SQL_IDS.report3,
    ownHangoutReport: SQL_IDS.hangoutReport,
    hangout: SQL_IDS.hangout,
  };
  const bindings = {
    suspend: "67000000-0000-4000-8000-000000000001",
    reopen: "67000000-0000-4000-8000-000000000002",
    ban: "67000000-0000-4000-8000-000000000003",
    report: "67000000-0000-4000-8000-000000000004",
  };
  const denied = {
    status: 403,
    body: { code: "42501", message: "Moderation unavailable", hint: null },
  };
  const baseline = clone(sqlReports);
  for (const r of baseline["auth.users"]) {
    r.raw_user_meta_data = r.id === SQL_IDS.reporter ? { role: "admin" } : {};
    r.raw_app_meta_data = { provider: "email", providers: ["email"] };
  }
  baseline["private.moderation_feature_gate"][0].enabled = true;
  baseline["private.safety_feature_gate"][0].enabled = true;
  baseline["private.moderation_cases"] = [
    {
      report_id: setup.report,
      state: "in_review",
      revision: 2,
      note: "Reviewed evidence",
      disposition: null,
      duplicate_report_id: null,
      sanction_id: null,
      hangout_disable_id: null,
    },
  ];
  const newId = () =>
    `68000000-0000-1000-8000-${String(++ordinal).padStart(12, "0")}`;
  const input = (id) => {
    const f = SANCTIONS[id];
    return f
      ? {
          p_report_id: setup.report,
          p_request_id: bindings[f[0] === "second" ? "ban" : "suspend"],
          p_expected_case_revision: f[1],
          p_action: f[2],
          p_reason: f[3],
        }
      : id === "MODHTTP.account-enforcement.report"
        ? {
            p_request_id: bindings.report,
            p_target_mode: "user",
            p_target_id: setup.reporter,
            p_category: "harassment",
          }
        : {};
  };
  const context = (id) => ({
    setup,
    input: input(id),
    jwtRole: "authenticated",
    isolation: "read committed",
  });
  const verify = (id, before, made, override = null) =>
    verifyOperation(
      operation(
        sanctionModelPlans[id] ?? enforcementModelPlans[id],
        snapshot(before),
        bounds,
        source,
        override ?? context(id),
      ),
      snapshot(made.after),
      made.result,
    );
  const manufacture = (id, before) => {
    const after = clone(before);
    if (id === "sanction.membership") {
      const campus = after["public.universities"][0];
      campus.allowed_email_domains = ["unc.edu"];
      const row = after["public.university_memberships"].find(
        (r) => r.user_id === setup.target,
      );
      const email = after["auth.users"].find(
        (r) => r.id === setup.target,
      ).email;
      if (row)
        Object.assign(row, {
          university_id: campus.id,
          verified_at: time,
          verification_email: email,
        });
      else
        after["public.university_memberships"].push({
          user_id: setup.target,
          university_id: campus.id,
          verified_at: time,
          verification_email: email,
          created_at: time,
        });
      return { after, result: "" };
    }
    if (id === "sanction.gate-enable") {
      after["private.moderation_feature_gate"][0].enabled = true;
      return { after, result: "" };
    }
    if (ENFORCEMENT_IDS.includes(id))
      return {
        after,
        result:
          id === "MODHTTP.private-sanction-rest"
            ? { status: 404, body: { message: "opaque" } }
            : [
                  "MODHTTP.account-enforcement.retained-ids",
                  "MODHTTP.account-enforcement.report",
                ].includes(id)
              ? {
                  status: 401,
                  body: { code: "42501", message: "Source-specific denial" },
                }
              : {
                  status: 200,
                  body:
                    id === "MODHTTP.account-enforcement.access-state"
                      ? "restricted"
                      : [],
                },
      };
    if (id === "http.reopen") {
      after["private.moderation_cases"][0] = {
        report_id: setup.report,
        state: "in_review",
        revision: 4,
        note: "Further review",
        disposition: null,
        duplicate_report_id: null,
        sanction_id: null,
        hangout_disable_id: null,
      };
      const fingerprint = createHash("md5")
        .update(
          `[${[setup.report, 3, "reopen", "Further review", null].map((v) => JSON.stringify(v)).join(", ")}]`,
        )
        .digest("hex");
      after["private.moderation_requests"].push({
        operator_id: setup.second,
        request_id: bindings.reopen,
        fingerprint,
        report_id: setup.report,
        result_state: "in_review",
        result_revision: 4,
      });
      const campus =
        before["public.university_memberships"].find(
          (r) => r.user_id === setup.target,
        )?.university_id ?? null;
      after["private.moderation_audit"].push({
        id: newId(),
        occurred_at: time,
        operator_id: setup.second,
        action: "reopen",
        report_id: setup.report,
        subject_target_type: "user",
        subject_target_id: setup.target,
        subject_campus_id: campus,
        request_id: bindings.reopen,
        previous_state: "closed",
        new_state: "in_review",
        previous_revision: 3,
        new_revision: 4,
        reason: "Further review",
        duplicate_report_id: null,
        page_report_ids: null,
        page_count: null,
        sanction_id: null,
        previous_account_status: null,
        new_account_status: null,
        hangout_disable_id: null,
        previous_hangout_disabled: null,
        new_hangout_disabled: null,
      });
      return { after, result: [{ case_state: "in_review", revision: 4 }] };
    }
    if (id === "second-downgrade") {
      after["public.platform_roles"].find(
        (r) => r.user_id === setup.second,
      ).role = "moderator";
      return { after, result: "" };
    }
    if (
      [
        "sanction.nonoperator",
        "sanction.moderator-ban",
        "sanction.changed-retry",
        "sanction.admin-downgrade-retry",
      ].includes(id)
    )
      return { after, result: clone(denied) };
    if (id === "sanction.normalized-retry")
      return {
        after,
        result: {
          status: 200,
          body: [
            { case_state: "closed", revision: 3, account_status: "suspended" },
          ],
        },
      };
    const actor = id === "sanction.suspend" ? setup.actor : setup.second,
      revision = id === "sanction.suspend" ? 3 : 5,
      action = id === "sanction.suspend" ? "suspend" : "ban",
      status = id === "sanction.suspend" ? "suspended" : "banned",
      reason = id === "sanction.suspend" ? "Local decision" : "Decision",
      request = action === "suspend" ? bindings.suspend : bindings.ban;
    const account = after["public.accounts"].find((r) => r.id === setup.target),
      previous = account.status;
    const campus =
      before["public.university_memberships"].find(
        (r) => r.user_id === setup.target,
      )?.university_id ?? null;
    const sanction = newId();
    after["private.account_sanctions"].push({
      id: sanction,
      report_id: setup.report,
      subject_type: "user",
      subject_id: setup.target,
      operator_id: actor,
      request_id: request,
      action,
      previous_status: previous,
      new_status: status,
      subject_campus_id: campus,
      reason,
      occurred_at: time,
    });
    account.status = status;
    after["private.moderation_cases"][0] = {
      report_id: setup.report,
      state: "closed",
      revision,
      note: reason,
      disposition: "action_taken",
      duplicate_report_id: null,
      sanction_id: sanction,
      hangout_disable_id: null,
    };
    const fingerprint =
      "account:" +
      createHash("md5")
        .update(
          `[${[setup.report, revision - 1, action, reason].map((v) => JSON.stringify(v)).join(", ")}]`,
        )
        .digest("hex");
    after["private.moderation_requests"].push({
      operator_id: actor,
      request_id: request,
      fingerprint,
      report_id: setup.report,
      result_state: "closed",
      result_revision: revision,
    });
    after["private.moderation_audit"].push({
      id: newId(),
      occurred_at: time,
      operator_id: actor,
      action,
      report_id: setup.report,
      subject_target_type: "user",
      subject_target_id: setup.target,
      subject_campus_id: campus,
      request_id: request,
      previous_state: "in_review",
      new_state: "closed",
      previous_revision: revision - 1,
      new_revision: revision,
      reason,
      duplicate_report_id: null,
      page_report_ids: null,
      page_count: null,
      sanction_id: sanction,
      previous_account_status: previous,
      new_account_status: status,
      hangout_disable_id: null,
      previous_hangout_disabled: null,
      new_hangout_disabled: null,
    });
    return {
      after,
      result: {
        status: 200,
        body: [{ case_state: "closed", revision, account_status: status }],
      },
    };
  };
  const suspended = manufacture("sanction.suspend", baseline);
  tested(() => verify("sanction.suspend", baseline, suspended));
  for (const id of ["sanction.nonoperator", "sanction.moderator-ban"])
    tested(() => verify(id, baseline, manufacture(id, baseline)));
  for (const id of ["sanction.normalized-retry", "sanction.changed-retry"])
    tested(() => verify(id, suspended.after, manufacture(id, suspended.after)));
  // A lawful source-shaped admin ban must not inherit the moderator denial.
  const adminBefore = clone(baseline);
  adminBefore["public.platform_roles"].find(
    (r) => r.user_id === setup.actor,
  ).role = "admin";
  const adminBan = clone(suspended);
  adminBan.after["public.platform_roles"] = clone(
    adminBefore["public.platform_roles"],
  );
  adminBan.after["public.accounts"].find((r) => r.id === setup.target).status =
    "banned";
  adminBan.after["private.moderation_cases"][0].note = "Local decision";
  for (const table of [
    "private.account_sanctions",
    "private.moderation_audit",
  ]) {
    adminBan.after[table][0].action = "ban";
    const statusField =
      table === "private.account_sanctions"
        ? "new_status"
        : "new_account_status";
    adminBan.after[table][0][statusField] = "banned";
  }
  adminBan.after["private.moderation_requests"][0].fingerprint =
    "account:" +
    createHash("md5")
      .update(
        `[${[setup.report, 2, "ban", "Local decision"].map((v) => JSON.stringify(v)).join(", ")}]`,
      )
      .digest("hex");
  adminBan.result.body[0].account_status = "banned";
  rejected(() => verify("sanction.moderator-ban", adminBefore, adminBan));
  rejected(() =>
    verify("sanction.moderator-ban", adminBefore, {
      after: adminBefore,
      result: denied,
    }),
  );
  // Saved Changed is a different lawful identity; the original denial refuses it.
  const changedSaved = clone(suspended.after);
  changedSaved["private.moderation_cases"][0].note = "Changed";
  changedSaved["private.account_sanctions"][0].reason = "Changed";
  changedSaved["private.moderation_audit"][0].reason = "Changed";
  changedSaved["private.moderation_requests"][0].fingerprint =
    "account:" +
    createHash("md5")
      .update(
        `[${[setup.report, 2, "suspend", "Changed"].map((v) => JSON.stringify(v)).join(", ")}]`,
      )
      .digest("hex");
  rejected(() =>
    verify("sanction.changed-retry", changedSaved, {
      after: changedSaved,
      result: suspended.result,
    }),
  );
  rejected(() =>
    verify("sanction.changed-retry", changedSaved, {
      after: changedSaved,
      result: denied,
    }),
  );
  for (const [table, field, value] of [
    ["private.moderation_requests", "request_id", bindings.ban],
    ["private.moderation_requests", "fingerprint", "account:forged"],
    ["private.moderation_requests", "report_id", setup.selfFiledReport],
    ["private.account_sanctions", "request_id", bindings.ban],
    ["private.account_sanctions", "operator_id", setup.second],
    ["private.account_sanctions", "report_id", setup.selfFiledReport],
    ["private.account_sanctions", "subject_type", "hangout"],
    ["private.account_sanctions", "subject_id", setup.reporter],
    ["private.account_sanctions", "action", "ban"],
    ["private.account_sanctions", "reason", "Changed"],
    ["private.account_sanctions", "previous_status", "suspended"],
    ["private.account_sanctions", "new_status", "banned"],
  ]) {
    const bad = clone(suspended.after);
    bad[table][0][field] = value;
    rejected(() =>
      verify("sanction.changed-retry", bad, { after: bad, result: denied }),
    );
  }
  for (const id of [
    "sanction.nonoperator",
    "sanction.moderator-ban",
    "sanction.changed-retry",
  ]) {
    const b = id === "sanction.changed-retry" ? suspended.after : baseline;
    const extraWrite = clone(b);
    extraWrite["private.people_feature_gate"][0].enabled = true;
    rejected(() => verify(id, b, { after: extraWrite, result: denied }));
    rejected(() => verify(id, b, { after: b, result: suspended.result }));
    for (const result of [
      { status: 200, body: denied.body },
      {
        status: 403,
        body: { code: "P0001", message: "Moderation unavailable" },
      },
      { status: 401, body: { code: "42501", message: "other" } },
    ])
      rejected(() => verify(id, b, { after: b, result }));
    tested(() =>
      verify(id, b, { after: b, result: { ...denied, status: 401 } }),
    );
  }
  rejected(() =>
    verify(
      "sanction.changed-retry",
      suspended.after,
      manufacture("sanction.normalized-retry", suspended.after),
    ),
  );
  rejected(() =>
    verify("sanction.normalized-retry", suspended.after, {
      after: clone(suspended.after),
      result: denied,
    }),
  );
  for (const [table, field, value] of [
    ["public.accounts", "status", "active"],
    ["private.moderation_cases", "state", "in_review"],
    ["private.moderation_cases", "revision", 4],
    ["private.moderation_cases", "disposition", "no_action"],
    ["private.moderation_cases", "note", "wrong"],
    ["private.moderation_cases", "sanction_id", setup.target],
    ["private.moderation_requests", "fingerprint", "wrong"],
    ["private.moderation_requests", "result_state", "in_review"],
    ["private.moderation_requests", "result_revision", 2],
    ["private.moderation_requests", "operator_id", setup.reporter],
    ...SCHEMA["private.account_sanctions"]
      .filter((k) => !["id", "occurred_at"].includes(k))
      .map((k) => ["private.account_sanctions", k, null]),
    ...SCHEMA["private.moderation_audit"]
      .filter((k) => !["id", "occurred_at"].includes(k))
      .map((k) => ["private.moderation_audit", k, "wrong"]),
  ]) {
    const bad = clone(suspended);
    const row = bad.after[table].find((r) =>
      table === "public.accounts" ? r.id === setup.target : true,
    );
    row[field] = value;
    rejected(() => verify("sanction.suspend", baseline, bad));
  }
  for (const table of [
    "private.account_sanctions",
    "private.moderation_audit",
  ]) {
    for (const id of [
      setup.actor,
      bindings.suspend,
      "bad-uuid",
      suspended.after["private.account_sanctions"][0].id,
    ]) {
      if (
        table === "private.account_sanctions" &&
        id === suspended.after[table][0].id
      )
        continue;
      const bad = clone(suspended);
      bad.after[table][0].id = id;
      rejected(() => verify("sanction.suspend", baseline, bad));
    }
    for (const timestamp of [
      "bad-time",
      "2026-09-29T11:59:59.123456Z",
      "2026-09-29T12:00:02.123456Z",
    ]) {
      const bad = clone(suspended);
      bad.after[table][0].occurred_at = timestamp;
      rejected(() => verify("sanction.suspend", baseline, bad));
    }
    for (const kind of ["extra-column", "duplicate-row", "missing-row"]) {
      const bad = clone(suspended);
      if (kind === "extra-column") bad.after[table][0].unexpected = true;
      if (kind === "duplicate-row")
        bad.after[table].push(clone(bad.after[table][0]));
      if (kind === "missing-row") bad.after[table] = [];
      rejected(() => verify("sanction.suspend", baseline, bad));
    }
  }
  // Each clock is independently bounded; no invented clock equality/order.
  const badTimeOrder = clone(suspended);
  badTimeOrder.after["private.account_sanctions"][0].occurred_at = later;
  tested(() => verify("sanction.suspend", baseline, badTimeOrder));
  for (const result of [
    { status: 201, body: suspended.result.body },
    {
      status: 200,
      body: [{ case_state: "closed", revision: 3, account_status: "banned" }],
    },
    { status: 403, body: { code: "42501", message: "other" } },
  ])
    rejected(() =>
      verify("sanction.suspend", baseline, { after: suspended.after, result }),
    );
  const unexplained = clone(suspended);
  unexplained.after["private.people_feature_gate"][0].enabled = true;
  rejected(() => verify("sanction.suspend", baseline, unexplained));
  for (const loss of [
    "gate",
    "suspended",
    "banned",
    "role",
    "target-role",
    "self-filed",
    "self-target",
  ]) {
    const b = clone(suspended.after);
    if (loss === "gate")
      b["private.moderation_feature_gate"][0].enabled = false;
    if (["suspended", "banned"].includes(loss))
      b["public.accounts"].find((r) => r.id === setup.actor).status = loss;
    if (loss === "role")
      b["public.platform_roles"] = b["public.platform_roles"].filter(
        (r) => r.user_id !== setup.actor,
      );
    if (loss === "target-role")
      b["public.platform_roles"].push({
        user_id: setup.target,
        role: "admin",
        created_at: time,
      });
    if (loss === "self-filed")
      b["private.safety_reports"][0].reporter_id = setup.actor;
    if (loss === "self-target")
      b["private.safety_reports"][0].target_id = setup.actor;
    tested(() =>
      verify("sanction.normalized-retry", b, { after: b, result: denied }),
    );
    rejected(() =>
      verify(
        "sanction.normalized-retry",
        b,
        manufacture("sanction.normalized-retry", b),
      ),
    );
  }
  const replayCurrentChanged = clone(suspended.after);
  replayCurrentChanged["public.accounts"].find(
    (r) => r.id === setup.target,
  ).status = "banned";
  tested(() =>
    verify(
      "sanction.normalized-retry",
      replayCurrentChanged,
      manufacture("sanction.normalized-retry", replayCurrentChanged),
    ),
  );
  const missingSaved = clone(suspended.after);
  missingSaved["private.account_sanctions"] = [];
  tested(() =>
    verify("sanction.normalized-retry", missingSaved, {
      after: missingSaved,
      result: denied,
    }),
  );
  for (const field of ["jwtRole", "isolation"]) {
    const ctx = context("sanction.suspend");
    ctx[field] = "wrong";
    rejected(() => verify("sanction.suspend", baseline, suspended, ctx));
  }
  const wrongInput = context("sanction.suspend");
  wrongInput.input.p_expected_case_revision = 4;
  rejected(() => verify("sanction.suspend", baseline, suspended, wrongInput));
  for (const state of ["closed", "open"]) {
    const b = clone(baseline);
    b["private.moderation_cases"][0].state = state;
    tested(() => verify("sanction.suspend", b, { after: b, result: denied }));
  }
  const noCampus = clone(baseline);
  noCampus["public.university_memberships"] = noCampus[
    "public.university_memberships"
  ].filter((r) => r.user_id !== setup.target);
  tested(() =>
    verify(
      "sanction.suspend",
      noCampus,
      manufacture("sanction.suspend", noCampus),
    ),
  );
  for (const id of ENFORCEMENT_IDS) {
    const made = manufacture(id, suspended.after);
    tested(() => verify(id, suspended.after, made));
    tested(() =>
      equal(describeModelPlan(enforcementModelPlans[id]).componentId, id),
    );
    rejected(() =>
      verify(id, suspended.after, {
        ...made,
        result: { status: 200, body: [{ status: "suspended" }] },
      }),
    );
    const bad = clone(made);
    bad.after["private.moderation_audit"].push(
      clone(suspended.after["private.moderation_audit"][0]),
    );
    rejected(() => verify(id, suspended.after, bad));
    if (id.includes("retained-ids") || id.endsWith(".report")) {
      for (const result of [
        { status: 400, body: { code: "42501" } },
        { status: 403, body: { code: "P0001" } },
      ])
        rejected(() => verify(id, suspended.after, { ...made, result }));
      tested(() =>
        verify(id, suspended.after, {
          ...made,
          result: {
            status: 403,
            body: { code: "42501", arbitrary: { unasserted: true } },
          },
        }),
      );
    }
  }
  for (const id of SANCTION_WRITERS) {
    const b = clone(baseline);
    b["private.moderation_feature_gate"][0].enabled = false;
    tested(() => verify(id, b, manufacture(id, b)));
    const bad = manufacture(id, b);
    bad.after["private.safety_feature_gate"][0].enabled = false;
    rejected(() => verify(id, b, bad));
  }
  const missingMember = clone(baseline);
  missingMember["public.university_memberships"] = missingMember[
    "public.university_memberships"
  ].filter((r) => r.user_id !== setup.target);
  tested(() =>
    verify(
      "sanction.membership",
      missingMember,
      manufacture("sanction.membership", missingMember),
    ),
  );
  const existingMember = clone(baseline);
  existingMember["public.university_memberships"].find(
    (r) => r.user_id === setup.target,
  ).created_at = "2026-09-28T12:00:00.123456Z";
  tested(() =>
    verify(
      "sanction.membership",
      existingMember,
      manufacture("sanction.membership", existingMember),
    ),
  );
  const sequenceBefore = clone(baseline);
  sequenceBefore["private.moderation_feature_gate"][0].enabled = false;
  const sequence = sanctionSequenceOperation(
    sanctionSequencePlans["focused-sanctions"],
    snapshot(sequenceBefore),
    bounds,
    source,
    setup,
    bindings,
  );
  let raw = sequenceBefore;
  const observations = [],
    history = [];
  for (const id of SANCTION_STEPS["focused-sanctions"]) {
    const made = manufacture(id, raw);
    history.push({ id, before: raw, made });
    observations.push({
      afterHandle: snapshot(made.after),
      result: made.result,
    });
    raw = made.after;
  }
  tested(() => verifySanctionSequence(sequence, observations));
  rejected(() => verifySanctionSequence(sequence, []));
  rejected(() => verifySanctionSequence(sequence, observations.slice(0, -1)));
  rejected(() =>
    verifySanctionSequence(sequence, observations.slice().reverse()),
  );
  const reopened = history.find((r) => r.id === "http.reopen");
  tested(() =>
    equal(
      reopened.made.after["private.account_sanctions"],
      reopened.before["private.account_sanctions"],
    ),
  );
  tested(() =>
    equal(
      reopened.made.after["public.accounts"],
      reopened.before["public.accounts"],
    ),
  );
  tested(() =>
    equal(reopened.made.after["private.moderation_cases"][0].sanction_id, null),
  );
  const banned = history.find((r) => r.id === "sanction.admin-ban");
  tested(() => verify("sanction.admin-ban", banned.before, banned.made));
  const banBad = clone(banned.made);
  banBad.after["private.moderation_audit"].push(
    clone(banBad.after["private.moderation_audit"].at(-1)),
  );
  rejected(() => verify("sanction.admin-ban", banned.before, banBad));
  tested(() =>
    verify("sanction.admin-ban-retry", banned.made.after, {
      after: banned.made.after,
      result: banned.made.result,
    }),
  );
  for (const loss of [
    "gate",
    "suspended",
    "banned",
    "role",
    "target-role",
    "self-filed",
    "self-target",
  ]) {
    const b = clone(banned.made.after);
    if (loss === "gate")
      b["private.moderation_feature_gate"][0].enabled = false;
    if (["suspended", "banned"].includes(loss))
      b["public.accounts"].find((r) => r.id === setup.second).status = loss;
    if (loss === "role")
      b["public.platform_roles"] = b["public.platform_roles"].filter(
        (r) => r.user_id !== setup.second,
      );
    if (loss === "target-role")
      b["public.platform_roles"].push({
        user_id: setup.target,
        role: "admin",
        created_at: time,
      });
    if (loss === "self-filed")
      b["private.safety_reports"][0].reporter_id = setup.second;
    if (loss === "self-target")
      b["private.safety_reports"][0].target_id = setup.second;
    tested(() =>
      verify("sanction.admin-ban-retry", b, { after: b, result: denied }),
    );
    rejected(() =>
      verify("sanction.admin-ban-retry", b, {
        after: b,
        result: banned.made.result,
      }),
    );
  }
  for (const safety of ["disabled", "missing"]) {
    const b = clone(baseline);
    if (safety === "missing") b["private.safety_feature_gate"] = [];
    else b["private.safety_feature_gate"][0].enabled = false;
    rejected(() =>
      sanctionSequenceOperation(
        sanctionSequencePlans["focused-sanctions"],
        snapshot(b),
        bounds,
        source,
        setup,
        bindings,
      ),
    );
    const restricted = clone(suspended.after);
    if (safety === "missing") restricted["private.safety_feature_gate"] = [];
    else restricted["private.safety_feature_gate"][0].enabled = false;
    for (const id of [
      "MODHTTP.account-enforcement.retained-ids",
      "MODHTTP.account-enforcement.report",
    ])
      rejected(() => verify(id, restricted, manufacture(id, restricted)));
  }
  tested(() => {
    const handle = operation(
      enforcementModelPlans["MODHTTP.private-sanction-rest"],
      snapshot(suspended.after),
      bounds,
      source,
      context("MODHTTP.private-sanction-rest"),
    );
    equal(sanctionContext(own(operations, handle)).actor, setup.actor);
  });
  const downgrade = history.at(-1);
  tested(() =>
    verify("sanction.admin-downgrade-retry", downgrade.before, downgrade.made),
  );
  const downgradeWrite = clone(downgrade.made);
  downgradeWrite.after["private.people_feature_gate"][0].enabled = true;
  rejected(() =>
    verify("sanction.admin-downgrade-retry", downgrade.before, downgradeWrite),
  );
  tested(() =>
    verify("sanction.admin-downgrade-retry", downgrade.before, {
      after: downgrade.before,
      result: { ...denied, status: 401 },
    }),
  );
  rejected(() =>
    verify("sanction.admin-downgrade-retry", downgrade.before, {
      after: downgrade.before,
      result: {
        status: 200,
        body: [{ case_state: "closed", revision: 5, account_status: "banned" }],
      },
    }),
  );
  for (const map of [
    sanctionModelPlans,
    enforcementModelPlans,
    sanctionSequencePlans,
  ])
    tested(() => {
      check(Object.isFrozen(map));
      for (const handle of Object.values(map)) {
        check(Object.isFrozen(handle));
        equal(Object.keys(handle), []);
      }
    });
  rejected(() =>
    sanctionSequenceOperation(
      sanctionSequencePlans["whole39"],
      snapshot(baseline),
      bounds,
      source,
      setup,
      bindings,
    ),
  );
  const reused = { ...bindings, ban: bindings.suspend };
  rejected(() =>
    sanctionSequenceOperation(
      sanctionSequencePlans["focused-sanctions"],
      snapshot(baseline),
      bounds,
      source,
      setup,
      reused,
    ),
  );
  const wrongRevision = clone(baseline);
  wrongRevision["private.moderation_cases"][0].revision = 1;
  rejected(() =>
    sanctionSequenceOperation(
      sanctionSequencePlans["focused-sanctions"],
      snapshot(wrongRevision),
      bounds,
      source,
      setup,
      bindings,
    ),
  );
  tested(() => {
    check(
      !modelCheckpoint.httpSequencesAvailable &&
        modelCheckpoint.readinessAvailable &&
        !modelCheckpoint.racesAvailable,
    );
    equal(modelCheckpoint.original219RetainedCredit, 0);
    equal(ENFORCEMENT_IDS.length, 7);
    equal(
      describeModelPlan(
        enforcementModelPlans["MODHTTP.account-enforcement.own-status"],
      ).assertionQualification,
      "current-source-supplemental-body-empty;historical219-unretained-zero-credit",
    );
  });
  return groups;
}
// Independently manufactured source observations, not original HTTP execution.
function preSanctionMemoryExamples(source, bounds, time, later, baseline) {
  let groups = 0,
    serial = 0;
  const tested = (fn) => {
      fn();
      groups++;
    },
    rejected = (fn) => {
      let failed = false;
      try {
        fn();
      } catch {
        failed = true;
      }
      check(failed);
      groups++;
    };
  const setup = {
    lane: "http",
    actor: "69000000-0000-4000-8000-000000000001",
    reporter: "69000000-0000-4000-8000-000000000002",
    target: "69000000-0000-4000-8000-000000000003",
    second: "69000000-0000-4000-8000-000000000004",
    report: "69000000-0000-4000-8001-000000000001",
    selfFiledReport: "69000000-0000-4000-8001-000000000002",
    selfTargetReport: "69000000-0000-4000-8001-000000000003",
    ownHangoutReport: "69000000-0000-4000-8001-000000000004",
    hangout: "69000000-0000-4000-8002-000000000001",
  };
  const bindings = Object.fromEntries(
    [
      "initial",
      "annotate",
      "stale",
      "selfFiled",
      "selfTarget",
      "ownHangout",
    ].map((key, index) => [
      key,
      `69000000-0000-4000-8003-${String(index + 1).padStart(12, "0")}`,
    ]),
  );
  const start = clone(baseline),
    campus = start["public.universities"][0].id;
  for (const [ordinal, id] of [
    setup.actor,
    setup.reporter,
    setup.target,
    setup.second,
  ].entries()) {
    const email = `moderation-http-69000000-0000-4000-8004-${String(ordinal + 1).padStart(12, "0")}@unc.edu`;
    start["auth.users"].push({
      id,
      email,
      email_confirmed_at: time,
      deleted_at: null,
      raw_user_meta_data: ordinal === 1 ? { role: "admin" } : {},
      raw_app_meta_data: { provider: "email", providers: ["email"] },
    });
    start["public.accounts"].push({ id, status: "active", created_at: time });
    start["public.profiles"].push({
      user_id: id,
      real_name: null,
      graduation_year: null,
      major: null,
      bio: null,
      primary_photo_path: null,
      is_complete: false,
      created_at: time,
      interests: [],
      down_to_do: [],
      favorite_music: null,
      favorite_foods: null,
      weird_fact: null,
      prompts: [],
      instagram: null,
      additional_photo_paths: [],
      revision: 0,
    });
    start["public.university_memberships"].push({
      user_id: id,
      university_id: campus,
      verified_at: time,
      verification_email: email,
      created_at: time,
    });
  }
  const plan = httpTransitionPlans["pre-sanction-prefix"],
    make = (raw = start, c = setup, b = bindings, p = plan) =>
      preSanctionOperation(p, snapshot(raw), bounds, source, c, b),
    newId = () =>
      `69000000-0000-1000-8005-${String(++serial).padStart(12, "0")}`;
  const appendAudit = (
    after,
    actor,
    action,
    report,
    request,
    previous,
    next,
    oldRevision,
    revision,
    reason,
    page = null,
  ) => {
    after["private.moderation_audit"].push({
      id: newId(),
      occurred_at: time,
      operator_id: actor,
      action,
      report_id: report?.id ?? null,
      subject_target_type: report?.target_type ?? null,
      subject_target_id: report?.target_id ?? null,
      subject_campus_id: report ? campus : null,
      request_id: request,
      previous_state: previous,
      new_state: next,
      previous_revision: oldRevision,
      new_revision: revision,
      reason,
      duplicate_report_id: null,
      page_report_ids: page,
      page_count: page === null ? null : page.length,
      sanction_id: null,
      previous_account_status: null,
      new_account_status: null,
      hangout_disable_id: null,
      previous_hangout_disabled: null,
      new_hangout_disabled: null,
    });
  };
  const ids = [
    "initial-roles",
    "initial-reports",
    "initial-hangout",
    "gate-off.queue",
    "nonoperator.detail.before",
    "nonoperator.queue.before",
    "anonymous.queue",
    "private-rest.moderation_cases",
    "private-rest.moderation_audit",
    "private-rest.safety_reports",
    "moderation-enable",
    "nonoperator.detail.after",
    "nonoperator.queue.after",
    "queue",
    "audit.before-conflict",
    "conflict.self-filed.detail",
    "conflict.self-filed.start-review",
    "conflict.self-target.detail",
    "conflict.self-target.start-review",
    "conflict.own-hangout.detail",
    "conflict.own-hangout.start-review",
    "audit.after-conflict",
    "detail",
    "http.start",
    "http.replay",
    "second-detail",
    "http.annotate",
    "audit.before-stale",
    "http.stale",
    "audit.after-stale",
    "refresh-detail",
    "audit.start-review",
    "audit.queue-report",
    "audit.before-restricted",
    "actor-suspend",
    "http.suspended-retry",
    "actor-ban",
    "http.banned-detail",
    "http.banned-retry",
    "actor-restore",
    "moderation-disable",
    "http.gate-retry",
    "audit.after-restricted",
    "sanction.membership",
  ];
  const manufacture = (id, before) => {
    const after = clone(before);
    let result = "";
    if (id === "initial-roles")
      after["public.platform_roles"].push(
        { user_id: setup.actor, role: "moderator", created_at: time },
        { user_id: setup.second, role: "admin", created_at: time },
      );
    else if (id === "initial-reports")
      for (const [report, reporter, target, category, narrative] of [
        [
          setup.report,
          setup.reporter,
          setup.target,
          "other",
          "Local allegation",
        ],
        [setup.selfFiledReport, setup.actor, setup.target, "harassment", null],
        [
          setup.selfTargetReport,
          setup.reporter,
          setup.actor,
          "harassment",
          null,
        ],
      ])
        after["private.safety_reports"].push({
          id: report,
          submitted_at: time,
          reporter_id: reporter,
          target_type: "user",
          target_id: target,
          category,
          narrative,
          provenance_kind: "current_people",
          provenance_ref_id: target,
        });
    else if (id === "initial-hangout") {
      after["public.hangouts"].push({
        id: setup.hangout,
        university_id: campus,
        host_id: setup.actor,
        title: "Local fixture",
        description: null,
        starts_at: "2026-09-29T13:00:00.123456Z",
        ends_at: null,
        status: "published",
        joining_state: "open",
        visibility: "campus",
        public_place: "Approximate place",
        public_latitude: 35,
        public_longitude: -79,
        campus_zone: null,
        location_precision: "approximate_area",
        revision: 1,
        created_at: time,
        updated_at: later,
      });
      after["public.hangout_participants"].push({
        hangout_id: setup.hangout,
        account_id: setup.actor,
        state: "joined",
        joined_at: time,
        left_at: null,
        removed_at: null,
        updated_at: later,
      });
      after["private.safety_reports"].push({
        id: setup.ownHangoutReport,
        submitted_at: time,
        reporter_id: setup.reporter,
        target_type: "hangout",
        target_id: setup.hangout,
        category: "harassment",
        narrative: null,
        provenance_kind: "current_hangout",
        provenance_ref_id: setup.hangout,
      });
    } else if (id === "moderation-enable") {
      after["private.moderation_feature_gate"][0].enabled = true;
      after["private.safety_feature_gate"][0].enabled = true;
    } else if (id === "moderation-disable")
      after["private.moderation_feature_gate"][0].enabled = false;
    else if (["actor-suspend", "actor-ban", "actor-restore"].includes(id))
      after["public.accounts"].find((r) => r.id === setup.actor).status =
        id === "actor-suspend"
          ? "suspended"
          : id === "actor-ban"
            ? "banned"
            : "active";
    else if (id === "sanction.membership") {
      after["public.universities"][0].allowed_email_domains = ["unc.edu"];
      const membership = after["public.university_memberships"].find(
        (r) => r.user_id === setup.target,
      );
      membership.verified_at = later;
      membership.verification_email = before["auth.users"].find(
        (r) => r.id === setup.target,
      ).email;
      membership.university_id = campus;
    } else if (id.startsWith("audit.")) {
      const count = before["private.moderation_audit"].length;
      result =
        id === "audit.start-review" || id === "audit.queue-report"
          ? "1"
          : count;
    } else if (
      ["queue", "detail", "second-detail", "refresh-detail"].includes(id)
    ) {
      const report = before["private.safety_reports"].find(
          (r) => r.id === setup.report,
        ),
        caseRow = before["private.moderation_cases"][0],
        body = {
          report_id: setup.report,
          submitted_at: time,
          target_type: "user",
          target_id: setup.target,
          reporter_id: setup.reporter,
          category: "other",
          case_state: caseRow?.state ?? "open",
        };
      if (id !== "queue")
        Object.assign(body, {
          case_revision: caseRow?.revision ?? 0,
          narrative: "Local allegation",
          provenance_kind: "current_people",
          provenance_ref_id: setup.target,
          case_note: caseRow?.note ?? null,
          disposition: null,
          target_status: "active",
          target_campus_id: campus,
          target_disabled: null,
        });
      const second = ["second-detail", "refresh-detail"].includes(id);
      appendAudit(
        after,
        second ? setup.second : setup.actor,
        id === "queue" ? "queue_read" : "detail_read",
        null,
        newId(),
        null,
        null,
        null,
        null,
        null,
        id === "queue" ? [report.id] : null,
      );
      if (id !== "queue")
        after["private.moderation_audit"].at(-1).report_id = setup.report;
      result = { status: 200, body: [body] };
    } else if (id === "http.start" || id === "http.annotate") {
      const revision = id === "http.start" ? 1 : 2,
        oldRevision = revision - 1,
        action = id === "http.start" ? "start_review" : "annotate",
        note = id === "http.start" ? null : "Reviewed evidence",
        request = id === "http.start" ? bindings.initial : bindings.annotate,
        report = before["private.safety_reports"].find(
          (r) => r.id === setup.report,
        );
      after["private.moderation_cases"] = [
        {
          report_id: setup.report,
          state: "in_review",
          revision,
          note,
          disposition: null,
          duplicate_report_id: null,
          sanction_id: null,
          hangout_disable_id: null,
        },
      ];
      const text = `["${setup.report}", ${oldRevision}, "${action}", ${note === null ? "null" : '"Reviewed evidence"'}, null]`;
      after["private.moderation_requests"].push({
        operator_id: setup.actor,
        request_id: request,
        fingerprint: createHash("md5").update(text).digest("hex"),
        report_id: setup.report,
        result_state: "in_review",
        result_revision: revision,
      });
      appendAudit(
        after,
        setup.actor,
        action,
        report,
        request,
        revision === 1 ? "open" : "in_review",
        "in_review",
        oldRevision,
        revision,
        note,
      );
      result = { status: 200, body: [{ case_state: "in_review", revision }] };
    } else if (id === "http.replay")
      result = {
        status: 200,
        body: [{ case_state: "in_review", revision: 1 }],
      };
    else if (id === "anonymous.queue" || id.startsWith("private-rest."))
      result = { status: 404, body: { unasserted: "opaque" } };
    else
      result = {
        status: 403,
        body: {
          code: "42501",
          message: "Moderation unavailable",
          hint: "unasserted",
        },
      };
    return { after, result };
  };
  let current = start;
  const observations = [],
    history = [];
  for (const id of ids) {
    const made = manufacture(id, current);
    observations.push({
      id,
      afterHandle: snapshot(made.after),
      result: made.result,
    });
    history.push({
      id,
      before: current,
      after: made.after,
      result: made.result,
    });
    current = made.after;
  }
  const sequence = make(),
    verify = (list) => verifyPreSanctionPrefix(sequence, list),
    replaceObservation = (id, change) =>
      observations.map((o) => (o.id === id ? change(o) : o));
  for (const id of ["http.replay", "http.annotate", "refresh-detail"]) {
    // Additional HTTP200 hardening; body and full54 after-state stay valid.
    tested(() =>
      verify(
        replaceObservation(id, (o) => ({
          ...o,
          result: { ...o.result, status: 200 },
        })),
      ),
    );
    rejected(() =>
      verify(
        replaceObservation(id, (o) => ({
          ...o,
          result: { ...o.result, status: 201 },
        })),
      ),
    );
  }
  tested(() => equal(PRE_SANCTION_STEPS, ids));
  tested(() => {
    const terminal = verify(observations),
      frame = own(preSanctionTerminals, terminal);
    check(Object.isFrozen(terminal));
    equal(Object.keys(terminal), []);
    equal(frame.verifiedSteps, 44);
    equal(frame.nextSourceLine, 201);
    equal(frame.membershipApplied, true);
    equal(frame.setup, setup);
    equal(frame.bindings, bindings);
    check(
      !frame.signupAvailable &&
        !frame.jwtAvailable &&
        !frame.transportAvailable,
    );
    equal(own(snapshots, frame.finalHandle), current);
  });
  for (const status of [401, 403, 404])
    tested(() =>
      verify(
        replaceObservation("anonymous.queue", (o) => ({
          ...o,
          result: { status, body: null },
        })),
      ),
    );
  rejected(() =>
    verify(
      replaceObservation("anonymous.queue", (o) => ({
        ...o,
        result: { status: 200, body: { code: "42501" } },
      })),
    ),
  );
  for (const row of history) {
    // One unexplained mutation per complete observation independently exercises full54.
    const changed = clone(row.after);
    changed["private.pilot_capabilities"][0].enabled = true;
    rejected(() =>
      verify(
        replaceObservation(row.id, (o) => ({
          ...o,
          afterHandle: snapshot(changed),
        })),
      ),
    );
    rejected(() =>
      verify(
        replaceObservation(row.id, (o) => ({
          ...o,
          result:
            typeof o.result === "object"
              ? { ...o.result, status: 201, body: [] }
              : "wrong",
        })),
      ),
    );
  }
  for (const id of [
    "nonoperator.detail.before",
    "nonoperator.queue.before",
    "nonoperator.detail.after",
    "nonoperator.queue.after",
    "gate-off.queue",
    "http.stale",
    "http.suspended-retry",
    "http.banned-detail",
    "http.banned-retry",
    "http.gate-retry",
  ]) {
    for (const status of [401, 403])
      tested(() =>
        verify(
          replaceObservation(id, (o) => ({
            ...o,
            result: { ...o.result, status },
          })),
        ),
      );
    for (const body of [
      { code: "42501" },
      { code: "42501", message: "different" },
      { code: "23505", message: "Moderation unavailable" },
    ])
      rejected(() =>
        verify(
          replaceObservation(id, (o) => ({
            ...o,
            result: { status: 403, body },
          })),
        ),
      );
  }
  rejected(() => verify(observations.slice(1)));
  rejected(() => verify([...observations, observations.at(-1)]));
  rejected(() =>
    verify([observations[1], observations[0], ...observations.slice(2)]),
  );
  rejected(() =>
    verify(
      replaceObservation("nonoperator.detail.before", (o) => ({
        ...o,
        id: "nonoperator.detail.after",
      })),
    ),
  );
  rejected(() =>
    verify(
      replaceObservation("sanction.membership", (o) => ({
        ...o,
        id: "signup-four",
      })),
    ),
  );
  rejected(() => verifyPreSanctionPrefix({}, []));
  rejected(() =>
    make(start, setup, bindings, httpTransitionPlans["MODHTTP.start-review"]),
  );
  rejected(() => make(start, { ...setup, lane: "sql" }));
  for (const name of Object.keys(bindings)) {
    rejected(() => make(start, setup, { ...bindings, [name]: setup.report }));
    rejected(() =>
      make(
        start,
        setup,
        Object.fromEntries(
          Object.entries(bindings).filter(([key]) => key !== name),
        ),
      ),
    );
  }
  rejected(() => make(start, setup, { ...bindings, extra: bindings.initial }));
  rejected(() =>
    make(start, setup, { ...bindings, annotate: bindings.initial }),
  );
  for (const name of ["actor", "reporter", "target", "second"]) {
    const bad = clone(start);
    bad["auth.users"].find((r) => r.id === setup[name]).raw_user_meta_data =
      name === "reporter" ? {} : { role: "admin" };
    rejected(() => make(bad));
  }
  for (const table of [
    "private.people_feature_gate",
    "private.moderation_feature_gate",
    "private.safety_feature_gate",
  ]) {
    const bad = clone(start);
    bad[table][0].enabled = true;
    rejected(() => make(bad));
  }
  for (const [id, table, column, value] of [
    ["moderation-enable", "private.people_feature_gate", "enabled", true],
    ["initial-hangout", "public.hangouts", "host_id", setup.target],
    ["initial-roles", "public.platform_roles", "role", "admin"],
    ["actor-restore", "public.accounts", "status", "banned"],
    ["moderation-disable", "private.safety_feature_gate", "enabled", false],
    [
      "sanction.membership",
      "public.universities",
      "allowed_email_domains",
      ["other.edu"],
    ],
    [
      "sanction.membership",
      "public.university_memberships",
      "created_at",
      later,
    ],
    ["http.annotate", "private.moderation_cases", "note", "Changed"],
    [
      "http.start",
      "private.moderation_requests",
      "request_id",
      bindings.annotate,
    ],
    [
      "http.annotate",
      "private.moderation_audit",
      "occurred_at",
      "2026-09-29T12:00:02.123456Z",
    ],
  ]) {
    const raw = clone(history.find((r) => r.id === id).after);
    const row =
      table === "public.accounts"
        ? raw[table].find((r) => r.id === setup.actor)
        : table === "public.university_memberships"
          ? raw[table].find((r) => r.user_id === setup.target)
          : table === "private.moderation_audit"
            ? raw[table].at(-1)
            : raw[table][0];
    row[column] = value;
    rejected(() =>
      verify(
        replaceObservation(id, (o) => ({ ...o, afterHandle: snapshot(raw) })),
      ),
    );
  }
  const wrongAudit = clone(history.find((r) => r.id === "queue").after);
  wrongAudit["private.moderation_audit"][0].page_report_ids = [
    setup.selfFiledReport,
  ];
  rejected(() =>
    verify(
      replaceObservation("queue", (o) => ({
        ...o,
        afterHandle: snapshot(wrongAudit),
      })),
    ),
  );
  const duplicateAudit = clone(history.find((r) => r.id === "detail").after);
  duplicateAudit["private.moderation_audit"][1].id =
    duplicateAudit["private.moderation_audit"][0].id;
  rejected(() =>
    verify(
      replaceObservation("detail", (o) => ({
        ...o,
        afterHandle: snapshot(duplicateAudit),
      })),
    ),
  );
  tested(() => {
    const d = describeModelPlan(plan);
    equal(d.allocatedLabels, HTTP_IDS.slice(0, 24));
    equal(d.allocatedLabels.at(-1), "MODHTTP.gate-off-retry");
    equal(d.modeledPostSignupLabels, 23);
    equal(d.components.length, 24);
    check(
      d.components.every(
        (row) =>
          !row.signupAvailable &&
          !row.jwtAvailable &&
          !row.transportAvailable &&
          row.originalCasePassCredit === 0,
      ),
    );
    check(
      d.components[0].modelAvailable === false &&
        d.components.slice(1).every((row) => row.modelAvailable),
    );
    equal(d.steps.length, 44);
    check(
      !d.signupAvailable &&
        !d.jwtAvailable &&
        !d.transportAvailable &&
        !d.whole39Available &&
        !d.suffixAvailable,
    );
    equal(describeModelPlan({}), { available: false, reason: "unavailable" });
    equal(modelCheckpoint.plannedHttpCases, 39);
    equal(modelCheckpoint.runtimeCredit, 0);
  });
  groups += finalCompositionMemoryExamples(
    source,
    bounds,
    time,
    setup,
    bindings,
    start,
    sequence,
    observations,
  );
  return groups;
}

// Independent manufactured suffix values, appended to the original 757 groups.
function finalCompositionMemoryExamples(
  source,
  bounds,
  time,
  setup,
  prefixBindings,
  start,
  prefixSequence,
  prefixObservations,
) {
  let groups = 0,
    serial = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  const bindings = {
    suspend: "6a000000-0000-4000-8006-000000000001",
    reopen: "6a000000-0000-4000-8006-000000000002",
    ban: "6a000000-0000-4000-8006-000000000003",
    report: "6a000000-0000-4000-8006-000000000004",
  };
  const denied = {
    status: 403,
    body: {
      code: "42501",
      message: "Moderation unavailable",
      unasserted: null,
    },
  };
  const newId = () =>
    `6a000000-0000-1000-8007-${String(++serial).padStart(12, "0")}`;
  const manufacture = (id, before) => {
    const after = clone(before);
    if (id === "sanction.gate-enable") {
      after["private.moderation_feature_gate"][0].enabled = true;
      return { after, result: "" };
    }
    if (ENFORCEMENT_IDS.includes(id))
      return {
        after,
        result:
          id === "MODHTTP.private-sanction-rest"
            ? { status: 404, body: { message: "opaque" } }
            : [
                  "MODHTTP.account-enforcement.retained-ids",
                  "MODHTTP.account-enforcement.report",
                ].includes(id)
              ? {
                  status: 401,
                  body: { code: "42501", message: "Source-specific denial" },
                }
              : {
                  status: 200,
                  body:
                    id === "MODHTTP.account-enforcement.access-state"
                      ? "restricted"
                      : [],
                },
      };
    if (id === "http.reopen") {
      after["private.moderation_cases"][0] = {
        report_id: setup.report,
        state: "in_review",
        revision: 4,
        note: "Further review",
        disposition: null,
        duplicate_report_id: null,
        sanction_id: null,
        hangout_disable_id: null,
      };
      const fingerprint = createHash("md5")
        .update(
          `[${[setup.report, 3, "reopen", "Further review", null].map((v) => JSON.stringify(v)).join(", ")}]`,
        )
        .digest("hex");
      after["private.moderation_requests"].push({
        operator_id: setup.second,
        request_id: bindings.reopen,
        fingerprint,
        report_id: setup.report,
        result_state: "in_review",
        result_revision: 4,
      });
      const campus =
        before["public.university_memberships"].find(
          (r) => r.user_id === setup.target,
        )?.university_id ?? null;
      after["private.moderation_audit"].push({
        id: newId(),
        occurred_at: time,
        operator_id: setup.second,
        action: "reopen",
        report_id: setup.report,
        subject_target_type: "user",
        subject_target_id: setup.target,
        subject_campus_id: campus,
        request_id: bindings.reopen,
        previous_state: "closed",
        new_state: "in_review",
        previous_revision: 3,
        new_revision: 4,
        reason: "Further review",
        duplicate_report_id: null,
        page_report_ids: null,
        page_count: null,
        sanction_id: null,
        previous_account_status: null,
        new_account_status: null,
        hangout_disable_id: null,
        previous_hangout_disabled: null,
        new_hangout_disabled: null,
      });
      return {
        after,
        result: {
          status: 200,
          body: [{ case_state: "in_review", revision: 4 }],
        },
      };
    }
    if (id === "second-downgrade") {
      after["public.platform_roles"].find(
        (r) => r.user_id === setup.second,
      ).role = "moderator";
      return { after, result: "" };
    }
    if (
      [
        "sanction.nonoperator",
        "sanction.moderator-ban",
        "sanction.changed-retry",
        "sanction.admin-downgrade-retry",
      ].includes(id)
    )
      return { after, result: clone(denied) };
    if (id === "sanction.normalized-retry")
      return {
        after,
        result: {
          status: 200,
          body: [
            { case_state: "closed", revision: 3, account_status: "suspended" },
          ],
        },
      };
    check(["sanction.suspend", "sanction.admin-ban"].includes(id));
    const actor = id === "sanction.suspend" ? setup.actor : setup.second,
      revision = id === "sanction.suspend" ? 3 : 5,
      action = id === "sanction.suspend" ? "suspend" : "ban",
      status = id === "sanction.suspend" ? "suspended" : "banned",
      reason = id === "sanction.suspend" ? "Local decision" : "Decision",
      request = action === "suspend" ? bindings.suspend : bindings.ban;
    const account = after["public.accounts"].find((r) => r.id === setup.target),
      previous = account.status;
    const campus =
      before["public.university_memberships"].find(
        (r) => r.user_id === setup.target,
      )?.university_id ?? null;
    const sanction = newId();
    after["private.account_sanctions"].push({
      id: sanction,
      report_id: setup.report,
      subject_type: "user",
      subject_id: setup.target,
      operator_id: actor,
      request_id: request,
      action,
      previous_status: previous,
      new_status: status,
      subject_campus_id: campus,
      reason,
      occurred_at: time,
    });
    account.status = status;
    after["private.moderation_cases"][0] = {
      report_id: setup.report,
      state: "closed",
      revision,
      note: reason,
      disposition: "action_taken",
      duplicate_report_id: null,
      sanction_id: sanction,
      hangout_disable_id: null,
    };
    const fingerprint =
      "account:" +
      createHash("md5")
        .update(
          `[${[setup.report, revision - 1, action, reason].map((v) => JSON.stringify(v)).join(", ")}]`,
        )
        .digest("hex");
    after["private.moderation_requests"].push({
      operator_id: actor,
      request_id: request,
      fingerprint,
      report_id: setup.report,
      result_state: "closed",
      result_revision: revision,
    });
    after["private.moderation_audit"].push({
      id: newId(),
      occurred_at: time,
      operator_id: actor,
      action,
      report_id: setup.report,
      subject_target_type: "user",
      subject_target_id: setup.target,
      subject_campus_id: campus,
      request_id: request,
      previous_state: "in_review",
      new_state: "closed",
      previous_revision: revision - 1,
      new_revision: revision,
      reason,
      duplicate_report_id: null,
      page_report_ids: null,
      page_count: null,
      sanction_id: sanction,
      previous_account_status: previous,
      new_account_status: status,
      hangout_disable_id: null,
      previous_hangout_disabled: null,
      new_hangout_disabled: null,
    });
    return {
      after,
      result: {
        status: 200,
        body: [{ case_state: "closed", revision, account_status: status }],
      },
    };
  };

  const prefixTerminal = verifyPreSanctionPrefix(
      prefixSequence,
      prefixObservations,
    ),
    prefix = own(preSanctionTerminals, prefixTerminal),
    plan = httpTransitionPlans[FINAL_SUFFIX_ID],
    suffix = finalSuffixOperation(plan, prefixTerminal, bindings),
    whole = retainedHttpOperation(
      httpTransitionPlans[FINAL_HTTP_ID],
      snapshot(start),
      bounds,
      source,
      setup,
      prefixBindings,
      bindings,
    );
  const ids = [
    "sanction.gate-enable",
    "sanction.nonoperator",
    "sanction.moderator-ban",
    "sanction.suspend",
    "sanction.normalized-retry",
    "sanction.changed-retry",
    "MODHTTP.account-enforcement.access-state",
    "MODHTTP.account-enforcement.own-status",
    "MODHTTP.account-enforcement.profile",
    "MODHTTP.account-enforcement.hangouts",
    "MODHTTP.account-enforcement.retained-ids",
    "MODHTTP.account-enforcement.report",
    "MODHTTP.private-sanction-rest",
    "http.reopen",
    "sanction.admin-ban",
    "second-downgrade",
    "sanction.admin-downgrade-retry",
    "audit.single-ban",
  ];
  let raw = own(snapshots, prefix.finalHandle);
  const observations = [],
    history = [];
  for (const id of ids) {
    const made =
      id === "audit.single-ban"
        ? { after: clone(raw), result: "1" }
        : manufacture(id, raw);
    observations.push({
      id,
      afterHandle: snapshot(made.after),
      result: made.result,
    });
    history.push({ id, before: raw, after: made.after, result: made.result });
    raw = made.after;
  }
  const verify = (list) => verifyFinalSuffix(suffix, list),
    replaceObservation = (id, change) =>
      observations.map((o) => (o.id === id ? change(o) : o)),
    full = [...prefixObservations, ...observations];
  tested(() => equal(FINAL_SUFFIX_STEPS, ids));
  tested(() => {
    const terminal = verifyRetainedHttp(whole, full),
      frame = own(finalHttpTerminals, terminal);
    equal(Object.keys(terminal), []);
    check(Object.isFrozen(terminal));
    equal(frame.verifiedPrefixSteps, 44);
    equal(frame.verifiedSuffixSteps, 18);
    equal(frame.allocatedLabels, 39);
    equal(own(snapshots, frame.finalHandle), raw);
    equal(frame.actualCasesComplete, false);
    equal(frame.originalCasePassCredit, 0);
    equal(
      [
        frame.signupAvailable,
        frame.jwtAvailable,
        frame.transportAvailable,
        frame.runtimeCredit,
      ],
      [false, false, false, 0],
    );
    equal(frame.prefixBindings, prefixBindings);
    equal(frame.suffixBindings, bindings);
    equal(
      raw["private.account_sanctions"].map((r) => [
        r.action,
        r.previous_status,
        r.new_status,
      ]),
      [
        ["suspend", "active", "suspended"],
        ["ban", "suspended", "banned"],
      ],
    );
  });
  tested(() => verify(observations));
  for (const row of history) {
    const changed = clone(row.after);
    changed["private.pilot_capabilities"][0].enabled = true;
    rejected(() =>
      verify(
        replaceObservation(row.id, (o) => ({
          ...o,
          afterHandle: snapshot(changed),
        })),
      ),
    );
    rejected(() =>
      verify(
        replaceObservation(row.id, (o) => ({
          ...o,
          result:
            typeof o.result === "object"
              ? { status: 201, body: o.result.body }
              : "wrong",
        })),
      ),
    );
    const column = clone(row.after);
    column["public.accounts"][0].unexpected = true;
    rejected(() =>
      verify(
        replaceObservation(row.id, (o) => ({
          ...o,
          afterHandle: snapshot(column),
        })),
      ),
    );
  }
  const successes = [
    "sanction.suspend",
    "sanction.normalized-retry",
    "MODHTTP.account-enforcement.access-state",
    "MODHTTP.account-enforcement.own-status",
    "MODHTTP.account-enforcement.profile",
    "MODHTTP.account-enforcement.hangouts",
    "http.reopen",
    "sanction.admin-ban",
  ];
  for (const id of successes) {
    tested(() =>
      verify(
        replaceObservation(id, (o) => ({
          ...o,
          result: { ...o.result, status: 200 },
        })),
      ),
    );
    rejected(() =>
      verify(
        replaceObservation(id, (o) => ({
          ...o,
          result: { ...o.result, status: 201 },
        })),
      ),
    );
    rejected(() =>
      verify(
        replaceObservation(id, (o) => ({
          ...o,
          result: { ...o.result, body: [{ unexpected: true }] },
        })),
      ),
    );
  }
  for (const id of [
    "sanction.nonoperator",
    "sanction.moderator-ban",
    "sanction.changed-retry",
    "sanction.admin-downgrade-retry",
  ]) {
    for (const status of [401, 403])
      tested(() =>
        verify(
          replaceObservation(id, (o) => ({
            ...o,
            result: {
              status,
              body: { code: "42501", message: "Moderation unavailable" },
            },
          })),
        ),
      );
    for (const result of [
      { status: 404, body: denied.body },
      {
        status: 403,
        body: { code: "P0001", message: "Moderation unavailable" },
      },
      { status: 403, body: { code: "42501", message: "wrong" } },
    ])
      rejected(() => verify(replaceObservation(id, (o) => ({ ...o, result }))));
  }
  for (const id of [
    "MODHTTP.account-enforcement.retained-ids",
    "MODHTTP.account-enforcement.report",
  ]) {
    tested(() =>
      verify(
        replaceObservation(id, (o) => ({
          ...o,
          result: {
            status: 403,
            body: { code: "42501", arbitrary: { unasserted: true } },
          },
        })),
      ),
    );
    rejected(() =>
      verify(
        replaceObservation(id, (o) => ({
          ...o,
          result: { status: 404, body: { code: "42501" } },
        })),
      ),
    );
    rejected(() =>
      verify(
        replaceObservation(id, (o) => ({
          ...o,
          result: { status: 403, body: { code: "P0001" } },
        })),
      ),
    );
  }
  tested(() =>
    verify(
      replaceObservation("MODHTTP.private-sanction-rest", (o) => ({
        ...o,
        result: { status: 404, body: null },
      })),
    ),
  );
  rejected(() =>
    verify(
      replaceObservation("MODHTTP.private-sanction-rest", (o) => ({
        ...o,
        result: { status: 403, body: null },
      })),
    ),
  );
  rejected(() =>
    verify(
      replaceObservation("MODHTTP.account-enforcement.own-status", (o) => ({
        ...o,
        result: { status: 200, body: [{ status: "suspended" }] },
      })),
    ),
  );
  rejected(() =>
    verify(
      replaceObservation("audit.single-ban", (o) => ({ ...o, result: 1 })),
    ),
  );
  rejected(() => verify(observations.slice(1)));
  rejected(() => verify([...observations, observations.at(-1)]));
  const swapped = [...observations];
  [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
  rejected(() => verify(swapped));
  rejected(() =>
    verify([
      { ...observations[0], id: "sanction.membership" },
      ...observations.slice(1),
    ]),
  );
  rejected(() =>
    verifyRetainedHttp(
      whole,
      full.filter((o) => o.id !== "sanction.membership"),
    ),
  );
  rejected(() =>
    verifyRetainedHttp(whole, [
      ...prefixObservations,
      prefixObservations.at(-1),
      ...observations,
    ]),
  );
  rejected(() =>
    verifyRetainedHttp(whole, [...observations, ...prefixObservations]),
  );
  rejected(() => verifyRetainedHttp({}, full));
  rejected(() => finalSuffixOperation(plan, {}, bindings));
  rejected(() =>
    finalSuffixOperation(
      httpTransitionPlans[FINAL_HTTP_ID],
      prefixTerminal,
      bindings,
    ),
  );
  rejected(() =>
    finalSuffixOperation(
      sanctionSequencePlans["focused-sanctions"],
      prefixTerminal,
      bindings,
    ),
  );
  for (const key of Object.keys(bindings)) {
    rejected(() =>
      finalSuffixOperation(plan, prefixTerminal, {
        ...bindings,
        [key]:
          bindings.suspend === bindings[key] ? bindings.ban : bindings.suspend,
      }),
    );
    rejected(() =>
      finalSuffixOperation(plan, prefixTerminal, {
        ...bindings,
        [key]: prefixBindings.selfFiled,
      }),
    );
    rejected(() =>
      finalSuffixOperation(plan, prefixTerminal, {
        ...bindings,
        [key]: "unknown",
      }),
    );
  }
  const missing = { ...bindings };
  delete missing.report;
  rejected(() => finalSuffixOperation(plan, prefixTerminal, missing));
  for (const [key, value] of [
    ["verifiedSteps", 43],
    ["nextSourceLine", 183],
    ["membershipApplied", false],
    ["signupAvailable", true],
    ["jwtAvailable", true],
    ["transportAvailable", true],
    ["runtimeCredit", 39],
    ["sourceHandle", {}],
  ]) {
    const bad = opaque(
      preSanctionTerminals,
      freeze({ ...prefix, [key]: value }),
    );
    rejected(() => finalSuffixOperation(plan, bad, bindings));
  }
  for (const [key, value] of [
    ["lane", "sql"],
    ["actor", setup.reporter],
    ["second", setup.actor],
    ["report", setup.selfFiledReport],
  ]) {
    const bad = opaque(
      preSanctionTerminals,
      freeze({ ...prefix, setup: { ...setup, [key]: value } }),
    );
    rejected(() => finalSuffixOperation(plan, bad, bindings));
  }
  for (const id of ["sanction.suspend", "http.reopen", "sanction.admin-ban"]) {
    const row = history.find((r) => r.id === id),
      generated = row.after["private.moderation_audit"].at(-1);
    for (const [field, value] of [
      ["id", setup.report],
      ["occurred_at", "1900-01-01T00:00:00Z"],
      ["operator_id", setup.reporter],
      ["subject_campus_id", null],
      ["request_id", bindings.report],
      ["previous_revision", 99],
    ]) {
      const bad = clone(row.after);
      bad["private.moderation_audit"].at(-1)[field] = value;
      rejected(() =>
        verify(
          replaceObservation(id, (o) => ({ ...o, afterHandle: snapshot(bad) })),
        ),
      );
    }
    tested(() => check(generated.subject_campus_id !== null));
  }
  const suspendAfter = history.find((r) => r.id === "sanction.suspend").after;
  for (const [field, value] of [
    ["id", setup.report],
    ["request_id", bindings.ban],
    ["previous_status", "banned"],
    ["new_status", "active"],
    ["reason", "Changed"],
    ["subject_campus_id", null],
    ["occurred_at", "1900-01-01T00:00:00Z"],
  ]) {
    const bad = clone(suspendAfter);
    bad["private.account_sanctions"][0][field] = value;
    rejected(() =>
      verify(
        replaceObservation("sanction.suspend", (o) => ({
          ...o,
          afterHandle: snapshot(bad),
        })),
      ),
    );
  }
  const reopened = history.find((r) => r.id === "http.reopen").after;
  for (const table of [
    "private.account_sanctions",
    "private.moderation_requests",
  ]) {
    const bad = clone(reopened);
    bad[table] = bad[table].slice(1);
    rejected(() =>
      verify(
        replaceObservation("http.reopen", (o) => ({
          ...o,
          afterHandle: snapshot(bad),
        })),
      ),
    );
  }
  const repeatedMember = clone(history[0].after);
  repeatedMember["public.university_memberships"].find(
    (r) => r.user_id === setup.target,
  ).verified_at = "2026-09-28T12:00:00.999999Z";
  rejected(() =>
    verify(
      replaceObservation("sanction.gate-enable", (o) => ({
        ...o,
        afterHandle: snapshot(repeatedMember),
      })),
    ),
  );
  const extraAudit = clone(raw);
  extraAudit["private.moderation_audit"].push(
    clone(raw["private.moderation_audit"].at(-1)),
  );
  rejected(() =>
    verify(
      replaceObservation("audit.single-ban", (o) => ({
        ...o,
        afterHandle: snapshot(extraAudit),
      })),
    ),
  );
  const safetyOff = clone(history[0].after);
  safetyOff["private.safety_feature_gate"][0].enabled = false;
  rejected(() =>
    verify(
      replaceObservation("sanction.gate-enable", (o) => ({
        ...o,
        afterHandle: snapshot(safetyOff),
      })),
    ),
  );
  tested(() => {
    const d = describeModelPlan(httpTransitionPlans[FINAL_HTTP_ID]);
    equal(d.allocatedLabels, HTTP_IDS);
    equal(
      d.components.map((r) => r.id),
      HTTP_IDS,
    );
    equal(d.steps.length, 62);
    equal(d.components.length, 39);
    equal(
      d.components.slice(24).map((r) => r.id),
      HTTP_IDS.slice(24),
    );
    equal(
      [...new Set(FINAL_HTTP_MAPPING.flatMap((r) => r.assertionLines))].sort(
        (a, b) => a - b,
      ),
      [
        27, 32, 36, 37, 38, 41, 42, 59, 60, 95, 98, 111, 112, 113, 116, 125,
        129, 130, 134, 135, 140, 141, 142, 146, 147, 152, 158, 162, 163, 165,
        177, 210, 212, 216, 220, 222, 246, 251, 255, 260,
      ],
    );
    check(
      d.components.every(
        (r) =>
          !r.transportAvailable &&
          !r.signupAvailable &&
          !r.jwtAvailable &&
          r.originalCasePassCredit === 0,
      ),
    );
    equal(d.components[0].modelAvailable, false);
    equal(d.actualCasesComplete, false);
    equal(d.assertionQualification.literalOriginalRetained, 40);
    equal(d.assertionQualification.currentSourceBodyEmptySupplemental, 1);
    equal(d.exclusions.auxiliaryAuthorizedBanReplayOriginalCredit, 0);
    equal(describeModelPlan(httpTransitionPlans[FINAL_SUFFIX_ID]).steps, ids);
    equal(describeModelPlan({}), { available: false, reason: "unavailable" });
  });
  return groups;
}

// An independently manufactured source frame. These checks exercise the
// private setup seam only; no SQL, Storage provider, JWT or public call runs.
function currentReadinessMemoryExamples(source, bounds, time, later) {
  let groups = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  const actor = SQL_IDS.actor,
    host = SQL_IDS.target,
    hangout = SQL_IDS.hangout,
    campus = "00000000-0000-4000-8000-000000000001";
  const before = Object.fromEntries(TABLES.map((table) => [table, []]));
  before["public.universities"] = [
    {
      id: campus,
      slug: "unc-chapel-hill",
      name: "UNC Chapel Hill",
      active: true,
      allowed_email_domains: ["unc.edu"],
      created_at: time,
    },
  ];
  before["private.pilot_availability"] = [
    {
      singleton: true,
      enabled: false,
      revision: 1,
      created_at: time,
      updated_at: time,
    },
  ];
  before["private.pilot_capabilities"] = CAPABILITIES.map((key) => ({
    key,
    enabled: false,
    revision: 1,
    created_at: time,
    updated_at: time,
  }));
  for (const table of TABLES.filter((name) => name.endsWith("feature_gate")))
    before[table] = [
      table === "private.large_hangout_feature_gate"
        ? { singleton: true, enabled: false, ranking_epoch: 0 }
        : { singleton: true, enabled: table === "private.safety_feature_gate" },
    ];
  for (const [id, label] of [
    [actor, "actor"],
    [host, "host"],
  ]) {
    const email = `${label}@unc.edu`;
    before["auth.users"].push({
      id,
      email,
      email_confirmed_at: time,
      deleted_at: null,
      raw_user_meta_data: {},
      raw_app_meta_data: {},
    });
    before["public.accounts"].push({ id, status: "active", created_at: time });
    before["public.university_memberships"].push({
      user_id: id,
      university_id: campus,
      verified_at: time,
      verification_email: email,
      created_at: time,
    });
    before["public.profiles"].push(blankProfile(id, time));
  }
  before["public.hangouts"] = [
    {
      id: hangout,
      university_id: campus,
      host_id: host,
      title: "Current safety fixture",
      description: null,
      starts_at: "2026-09-29T13:00:00.123456Z",
      ends_at: null,
      status: "published",
      joining_state: "open",
      visibility: "campus",
      public_place: "Approximate place",
      public_latitude: 35,
      public_longitude: -79,
      campus_zone: null,
      location_precision: "approximate_area",
      revision: 1,
      created_at: time,
      updated_at: time,
    },
  ];
  before["public.hangout_participants"] = [
    {
      hangout_id: hangout,
      account_id: host,
      state: "joined",
      joined_at: time,
      left_at: null,
      removed_at: null,
      updated_at: time,
    },
  ];
  before["private.safety_reports"] = [
    {
      id: SQL_IDS.hangoutReport,
      submitted_at: time,
      reporter_id: SQL_IDS.reporter,
      target_type: "hangout",
      target_id: hangout,
      category: "harassment",
      narrative: null,
      provenance_kind: "current_hangout",
      provenance_ref_id: hangout,
    },
  ];
  const ready = clone(before);
  ready["private.pilot_availability"][0] = {
    ...ready["private.pilot_availability"][0],
    enabled: true,
    revision: 2,
    updated_at: later,
  };
  const purpose = ready["private.pilot_capabilities"].find(
    (r) => r.key === "hangouts",
  );
  Object.assign(purpose, { enabled: true, revision: 2, updated_at: later });
  ready["private.hangout_feature_gate"][0].enabled = true;
  for (const [index, id] of [actor, host].entries()) {
    const path = `${id}/primary.png`;
    Object.assign(
      ready["public.profiles"].find((r) => r.user_id === id),
      {
        real_name: "Current safety fixture",
        graduation_year: 2028,
        major: "Mathematics",
        bio: "Local safety fixture",
        primary_photo_path: path,
        is_complete: true,
        revision: 1,
      },
    );
    ready["storage.objects"].push({
      id: `6b000000-0000-4000-8000-00000000000${index + 1}`,
      bucket_id: "profile-photos",
      name: path,
      owner: null,
      created_at: time,
      updated_at: time,
      last_accessed_at: time,
      metadata: null,
      path_tokens: path.split("/"),
      version: null,
      owner_id: id,
      user_metadata: null,
      archived_at: null,
      is_delete_marker: false,
      is_versioned: false,
    });
    ready["private.pilot_account_admission"].push({
      account_id: id,
      state: "active",
      revision: 1,
      created_at: later,
      updated_at: later,
    });
  }
  const verify = (b = before, a = ready) =>
    currentReadinessFixture(snapshot(b), snapshot(a), bounds, source);
  tested(() => {
    const frame = verify();
    check(currentReadinessFrames.has(frame));
    equal(Object.keys(frame), []);
    equal(own(currentReadinessFrames, frame).campus, campus);
    equal(own(currentReadinessFrames, frame).actor, SQL_IDS.actor);
    equal(ready["private.safety_reports"][0].reporter_id, SQL_IDS.reporter);
    check(modelCheckpoint.currentReadinessFixtureAvailable);
    check(
      modelCheckpoint.readinessAvailable &&
        !modelCheckpoint.laterOperationsAvailable,
    );
  });
  rejected(() =>
    currentReadinessSource(ready, SQL_IDS.reporter, host, hangout, bounds),
  );
  const afterLosses = [
    (a) =>
      (a["public.accounts"].find((r) => r.id === actor).status = "suspended"),
    (a) => (a["public.universities"][0].active = false),
    (a) =>
      (a["auth.users"].find((r) => r.id === host).email_confirmed_at = null),
    (a) =>
      (a["auth.users"].find((r) => r.id === host).email_confirmed_at =
        "invalid-time"),
    (a) =>
      (a["auth.users"].find((r) => r.id === host).email = "host@other.edu"),
    (a) =>
      (a["public.university_memberships"].find(
        (r) => r.user_id === actor,
      ).verification_email = "wrong@unc.edu"),
    (a) =>
      (a["public.university_memberships"].find(
        (r) => r.user_id === host,
      ).university_id = "10000000-0000-4000-8000-000000000001"),
    (a) =>
      (a["private.pilot_account_admission"].find(
        (r) => r.account_id === host,
      ).state = "revoked"),
    (a) =>
      (a["public.profiles"].find((r) => r.user_id === actor).is_complete =
        false),
    (a) =>
      (a["public.profiles"].find((r) => r.user_id === host).primary_photo_path =
        null),
    (a) =>
      (a["storage.objects"].find((r) => r.owner_id === actor).owner_id = host),
    (a) =>
      (a["storage.objects"].find((r) => r.owner_id === host).bucket_id =
        "other"),
    (a) => (a["private.pilot_availability"][0].enabled = false),
    (a) =>
      (a["private.pilot_capabilities"].find(
        (r) => r.key === "hangouts",
      ).enabled = false),
    (a) => (a["private.hangout_feature_gate"][0].enabled = false),
    (a) => (a["private.safety_feature_gate"][0].enabled = false),
    (a) => (a["public.hangouts"][0].status = "cancelled"),
    (a) => (a["public.hangouts"][0].visibility = "invite_only"),
    (a) => (a["public.hangouts"][0].location_precision = "exact"),
    (a) =>
      (a["public.hangouts"][0].university_id =
        "10000000-0000-4000-8000-000000000001"),
    (a) => (a["public.hangouts"][0].university_id = "invalid-campus"),
    (a) => (a["public.hangouts"][0].host_id = actor),
    (a) => (a["public.hangout_participants"][0].state = "left"),
    (a) =>
      a["private.hangout_disables"].push({
        ...Object.fromEntries(
          SCHEMA["private.hangout_disables"].map((k) => [k, null]),
        ),
        hangout_id: hangout,
      }),
    (a) =>
      a["private.people_blocks"].push({ blocker_id: host, blocked_id: actor }),
    (a) =>
      a["private.people_blocks"].push({ blocker_id: actor, blocked_id: host }),
    (a) => (a["public.hangouts"][0].joining_state = "closed"),
    (a) => (a["public.hangouts"][0].starts_at = time),
    (a) => (a["public.hangouts"][0].starts_at = "2028-09-29T13:00:00.123456Z"),
    (a) => (a["storage.objects"][0].id = "bad"),
    (a) =>
      (a["private.pilot_account_admission"][0].created_at =
        "1900-01-01T00:00:00Z"),
    (a) => (a["public.profiles"][0].favorite_music = "unrelated"),
    (a) =>
      a["private.moderation_audit"].push(
        Object.fromEntries(
          SCHEMA["private.moderation_audit"].map((k) => [k, null]),
        ),
      ),
  ];
  for (const change of afterLosses) {
    const bad = clone(ready);
    change(bad);
    rejected(() => verify(before, bad));
  }
  // Independent source checks distinguish a failed guard/setup from the
  // separate full54 changed-row assertion above.
  for (const change of afterLosses.slice(0, 28)) {
    const bad = clone(ready);
    change(bad);
    rejected(() => currentReadinessSource(bad, actor, host, hangout, bounds));
  }
  const sourceLosses = [
    (a) =>
      a["private.friendships"].push({
        low_id: actor < host ? actor : host,
        high_id: actor < host ? host : actor,
        requester_id: actor,
        campus_id: campus,
        generation_id: "6c000000-0000-4000-8000-000000000001",
        state: "active",
      }),
    (a) =>
      a["private.friendship_create_requests"].push({
        actor_id: actor,
        request_id: "6c000000-0000-4000-8000-000000000002",
        target_id: host,
        generation_id: "6c000000-0000-4000-8000-000000000003",
      }),
    (a) =>
      a["private.dm_pairs"].push({
        generation_id: "6c000000-0000-4000-8000-000000000004",
        low_id: actor < host ? actor : host,
        high_id: actor < host ? host : actor,
        initiator_id: actor,
        campus_id: campus,
        state: "active",
        created_at: time,
        next_sequence: 1,
      }),
    (a) =>
      a["public.hangout_participants"].push({
        hangout_id: hangout,
        account_id: actor,
        state: "joined",
        joined_at: time,
        left_at: null,
        removed_at: null,
        updated_at: time,
      }),
    (a) =>
      a["private.hangout_peer_provenance"].push({
        hangout_id: hangout,
        low_id: actor < host ? actor : host,
        high_id: actor < host ? host : actor,
      }),
    (a) => {
      const other = "6d000000-0000-4000-8000-000000000001";
      for (const id of [actor, host])
        a["public.hangout_participants"].push({
          hangout_id: other,
          account_id: id,
          state: "left",
          joined_at: time,
          left_at: later,
          removed_at: null,
          updated_at: later,
        });
    },
  ];
  for (const change of sourceLosses) {
    const bad = clone(ready);
    change(bad);
    rejected(() => verify(before, bad));
    rejected(() => currentReadinessNoSeven(bad, actor, host, hangout));
  }
  rejected(() =>
    verify(before, {
      ...ready,
      "storage.objects": ready["storage.objects"].slice(1),
    }),
  );
  rejected(() =>
    currentReadinessFixture(snapshot(before), snapshot(ready), bounds, {}),
  );
  groups += currentReportMemoryExamples(verify(), ready, bounds, later);
  const raceBefore = clone(before),
    raceReady = clone(ready);
  for (const frame of [raceBefore, raceReady]) {
    frame["private.moderation_feature_gate"][0].enabled = true;
    frame["public.platform_roles"].push({
      user_id: actor,
      role: "moderator",
      created_at: time,
    });
  }
  groups += currentRaceMemoryExamples(
    verify(raceBefore, raceReady),
    raceReady,
    bounds,
    later,
  );
  return groups;
}

function currentReportMemoryExamples(readinessHandle, ready, bounds, later) {
  let groups = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  for (const [planIndex, [planName, requestId]] of Object.entries(
    CURRENT_REPORT_PLANS,
  ).entries()) {
    const reportId = `6f000000-0000-4000-8000-00000000000${planIndex + 1}`;
    const operation =
      planName === "current_report_first"
        ? currentReportOperation
        : detailFirstCurrentReportOperation;
    const fingerprint = createHash("md5")
      .update(
        `[${["hangout", SQL_IDS.hangout, "harassment", null]
          .map((v) => JSON.stringify(v))
          .join(", ")}]`,
      )
      .digest("hex");
    const after = clone(ready);
    after["private.safety_reports"].push({
      id: reportId,
      submitted_at: later,
      reporter_id: SQL_IDS.actor,
      target_type: "hangout",
      target_id: SQL_IDS.hangout,
      category: "harassment",
      narrative: null,
      provenance_kind: "current_hangout",
      provenance_ref_id: SQL_IDS.hangout,
    });
    after["private.safety_report_requests"].push({
      reporter_id: SQL_IDS.actor,
      request_id: requestId,
      input_fingerprint: fingerprint,
      report_id: reportId,
    });
    const receipt = { receipt_id: reportId, submitted_at: later };
    const verify = (rows = after, result = receipt) =>
      operation(readinessHandle, snapshot(rows), bounds, result);
    tested(() => {
      const handle = verify();
      check(currentReportFrames.has(handle));
      equal(Object.keys(handle), []);
      equal(own(currentReportFrames, handle).requestId, requestId);
      currentReportRollback(handle, snapshot(ready));
      check(
        modelCheckpoint.readinessAvailable &&
          modelCheckpoint.permissionCredit === 0 &&
          modelCheckpoint.runtimeCredit === 0 &&
          CURRENT_REPORT_DESCRIPTION.actualPermissionCredit === 0 &&
          !CURRENT_REPORT_DESCRIPTION.raceOrderAvailable,
      );
    });
    const reportChanges = [
      (r) => (r.reporter_id = SQL_IDS.reporter),
      (r) => (r.reporter_id = SQL_IDS.target),
      (r) => (r.target_type = "user"),
      (r) => (r.target_id = SQL_IDS.target),
      (r) => (r.provenance_kind = "retained_hangout"),
      (r) => (r.provenance_ref_id = SQL_IDS.target),
      (r) => (r.category = "other"),
      (r) => (r.category = "safety concern"),
      (r) => (r.narrative = "Invented"),
      (r) => (r.id = CURRENT_REPORT_PLANS.detail_first),
      (r) => (r.id = "malformed"),
      (r) => (r.submitted_at = "1900-01-01T00:00:00Z"),
    ];
    for (const change of reportChanges) {
      const bad = clone(after);
      change(bad["private.safety_reports"].at(-1));
      rejected(() => verify(bad));
    }
    const ledgerChanges = [
      (r) => (r.reporter_id = SQL_IDS.reporter),
      (r) => (r.reporter_id = SQL_IDS.target),
      (r) =>
        (r.request_id =
          requestId === CURRENT_REPORT_PLANS.current_report_first
            ? CURRENT_REPORT_PLANS.detail_first
            : CURRENT_REPORT_PLANS.current_report_first),
      (r) => (r.request_id = "6e000000-0000-4000-8000-000000000001"),
      (r) => (r.request_id = SQL_IDS.target),
      (r) => (r.input_fingerprint = "false-fingerprint"),
      (r) =>
        (r.input_fingerprint = createHash("md5")
          .update(
            `[${["hangout", SQL_IDS.hangout, "safety concern", null]
              .map((v) => JSON.stringify(v))
              .join(", ")}]`,
          )
          .digest("hex")),
      (r) => (r.report_id = SQL_IDS.target),
    ];
    for (const change of ledgerChanges) {
      const bad = clone(after);
      change(bad["private.safety_report_requests"][0]);
      rejected(() => verify(bad));
    }
    for (const table of [
      "private.safety_reports",
      "private.safety_report_requests",
    ]) {
      const missing = clone(after);
      missing[table].pop();
      rejected(() => verify(missing));
      const extra = clone(after);
      extra[table].push(
        table === "private.safety_reports"
          ? { ...extra[table].at(-1), id: SQL_IDS.target }
          : {
              ...extra[table][0],
              request_id: SQL_IDS.target,
              report_id: SQL_IDS.target,
            },
      );
      rejected(() => verify(extra));
    }
    const unrelated = clone(after);
    unrelated["public.profiles"][0].bio = "Unexpected";
    rejected(() => verify(unrelated));
    const historical = clone(after);
    historical["private.safety_reports"][0].reporter_id = SQL_IDS.actor;
    rejected(() => verify(historical));
    const privateChange = clone(after);
    privateChange["private.pilot_availability"][0].revision++;
    rejected(() => verify(privateChange));
    rejected(() => verify(after, { ...receipt, actual_permission_pass: true }));
    rejected(() =>
      verify(after, { receipt_id: SQL_IDS.target, submitted_at: later }),
    );
    rejected(() =>
      verify(after, { receipt_id: reportId, submitted_at: "bad" }),
    );
    rejected(() => operation({}, snapshot(after), bounds, receipt));
    const duplicate = clone(after);
    duplicate["private.safety_report_requests"].push({
      ...after["private.safety_report_requests"][0],
      report_id: SQL_IDS.target,
    });
    rejected(() => verify(duplicate));
    const qualified = verify();
    const wrongRollback = clone(ready);
    wrongRollback["private.safety_reports"].push(
      after["private.safety_reports"].at(-1),
    );
    rejected(() => currentReportRollback(qualified, snapshot(wrongRollback)));
    rejected(() => currentReportRollback({}, snapshot(ready)));
  }
  return groups;
}

function currentRaceMemoryExamples(readinessHandle, ready, bounds, later) {
  let groups = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  const fingerprint = createHash("md5")
    .update(
      `[${["hangout", SQL_IDS.hangout, "harassment", null]
        .map((v) => JSON.stringify(v))
        .join(", ")}]`,
    )
    .digest("hex");
  const reportAfter = (before, ordinal) => {
    const after = clone(before),
      id = `6f000000-0000-4000-8000-00000000000${ordinal}`,
      requestId =
        ordinal === 1
          ? CURRENT_REPORT_PLANS.current_report_first
          : CURRENT_REPORT_PLANS.detail_first;
    after["private.safety_reports"].push({
      id,
      submitted_at: later,
      reporter_id: SQL_IDS.actor,
      target_type: "hangout",
      target_id: SQL_IDS.hangout,
      category: "harassment",
      narrative: null,
      provenance_kind: "current_hangout",
      provenance_ref_id: SQL_IDS.hangout,
    });
    after["private.safety_report_requests"].push({
      reporter_id: SQL_IDS.actor,
      request_id: requestId,
      input_fingerprint: fingerprint,
      report_id: id,
    });
    return { after, receipt: { receipt_id: id, submitted_at: later } };
  };
  const detailAfter = (before, ordinal) => {
    const after = clone(before),
      audit = Object.fromEntries(
        SCHEMA["private.moderation_audit"].map((key) => [key, null]),
      );
    Object.assign(audit, {
      id: `6e000000-0000-4000-8000-00000000000${ordinal * 2 - 1}`,
      occurred_at: later,
      operator_id: SQL_IDS.actor,
      action: "detail_read",
      report_id: SQL_IDS.hangoutReport,
      request_id: `6e000000-0000-4000-8000-00000000000${ordinal * 2}`,
    });
    after["private.moderation_audit"].push(audit);
    return after;
  };
  const first = reportAfter(ready, 1);
  const firstHandle = currentReportOperation(
    readinessHandle,
    snapshot(first.after),
    bounds,
    first.receipt,
  );
  tested(() => {
    equal(
      own(currentReportFrames, firstHandle).requestId,
      CURRENT_REPORT_PLANS.current_report_first,
    );
    rejected(() => currentReportRollback(firstHandle, snapshot(first.after)));
  });
  const d1 = detailAfter(first.after, 1);
  const detailResult = detailRows(first.after, SQL_IDS.hangoutReport);
  const d1Handle = currentRaceDetail(
    firstHandle,
    snapshot(d1),
    bounds,
    detailResult,
    1,
  );
  tested(() => equal(own(currentRaceFrames, d1Handle).phase, "detail-1"));
  const d2 = detailAfter(d1, 2);
  const d2Handle = currentRaceDetail(
    d1Handle,
    snapshot(d2),
    bounds,
    detailResult,
    2,
  );
  tested(() => equal(own(currentRaceFrames, d2Handle).phase, "detail-2"));
  const second = reportAfter(d2, 2);
  const terminal = currentRaceReport2(
    d2Handle,
    snapshot(second.after),
    bounds,
    second.receipt,
  );
  tested(() => {
    equal(own(currentRaceFrames, terminal).phase, "both-reports-committed");
    equal(
      second.after["private.safety_reports"].length,
      ready["private.safety_reports"].length + 2,
    );
    equal(
      second.after["private.safety_report_requests"].length,
      ready["private.safety_report_requests"].length + 2,
    );
    equal(
      second.after["private.moderation_audit"].length,
      ready["private.moderation_audit"].length + 2,
    );
  });
  rejected(() => currentReportRollback(firstHandle, snapshot(ready)));
  rejected(() =>
    currentReportRollback(
      own(currentRaceFrames, terminal).secondReportHandle,
      snapshot(ready),
    ),
  );
  const shutdown = derive(second.after, ordinaryShutdown(second.after));
  let off;
  tested(() => {
    off = currentRaceOrdinaryShutdown(terminal, snapshot(shutdown));
    equal(own(currentRaceFrames, off).phase, "ordinary-off-after-both-reports");
    check(
      !CURRENT_RACE_DESCRIPTION.blockFirstAvailable &&
        CURRENT_RACE_DESCRIPTION.actualOrderCredit === 0 &&
        modelCheckpoint.permissionCredit === 0 &&
        !modelCheckpoint.racesAvailable,
    );
    equal(
      CURRENT_RACE_DESCRIPTION.orders.map((r) => r.id),
      ["current_report_first", "detail_first"],
    );
    equal(
      CURRENT_RACE_DESCRIPTION.orders.map((r) => r.committed),
      [
        ["report-0005", "detail-read-1"],
        ["detail-read-2", "report-0006"],
      ],
    );
  });
  rejected(() => currentRaceDetail({}, snapshot(d1), bounds, detailResult, 1));
  rejected(() =>
    currentRaceDetail(firstHandle, snapshot(d1), bounds, detailResult, 2),
  );
  rejected(() =>
    currentRaceDetail(d1Handle, snapshot(d2), bounds, detailResult, 1),
  );
  rejected(() =>
    currentRaceReport2(
      d1Handle,
      snapshot(second.after),
      bounds,
      second.receipt,
    ),
  );
  rejected(() => currentRaceOrdinaryShutdown(d2Handle, snapshot(shutdown)));
  rejected(() => currentRaceOrdinaryShutdown(terminal, snapshot(second.after)));
  rejected(() => currentRaceOrdinaryShutdown({}, snapshot(shutdown)));
  const wrongOrder = reportAfter(first.after, 2);
  rejected(() =>
    currentRaceReport2(
      d1Handle,
      snapshot(wrongOrder.after),
      bounds,
      wrongOrder.receipt,
    ),
  );
  for (const [ordinal, prior, after, result] of [
    [1, firstHandle, d1, detailResult],
    [2, d1Handle, d2, detailResult],
  ]) {
    const badAudit = clone(after);
    badAudit["private.moderation_audit"].at(-1).report_id = SQL_IDS.report;
    rejected(() =>
      currentRaceDetail(prior, snapshot(badAudit), bounds, result, ordinal),
    );
    const missing = clone(after);
    missing["private.moderation_audit"].pop();
    rejected(() =>
      currentRaceDetail(prior, snapshot(missing), bounds, result, ordinal),
    );
    rejected(() =>
      currentRaceDetail(prior, snapshot(after), bounds, [], ordinal),
    );
  }
  for (const table of [
    "private.safety_reports",
    "private.safety_report_requests",
  ]) {
    const missing = clone(second.after);
    missing[table].pop();
    rejected(() =>
      currentRaceReport2(d2Handle, snapshot(missing), bounds, second.receipt),
    );
    const extra = clone(second.after);
    extra[table].push({
      ...extra[table].at(-1),
      ...(table === "private.safety_reports"
        ? { id: SQL_IDS.target }
        : { request_id: SQL_IDS.target }),
    });
    rejected(() =>
      currentRaceReport2(d2Handle, snapshot(extra), bounds, second.receipt),
    );
  }
  const wrongRequest = clone(second.after);
  wrongRequest["private.safety_report_requests"].at(-1).request_id =
    CURRENT_REPORT_PLANS.current_report_first;
  rejected(() =>
    currentRaceReport2(
      d2Handle,
      snapshot(wrongRequest),
      bounds,
      second.receipt,
    ),
  );
  const wrongProvenance = clone(second.after);
  wrongProvenance["private.safety_reports"].at(-1).provenance_kind =
    "retained_hangout";
  rejected(() =>
    currentRaceReport2(
      d2Handle,
      snapshot(wrongProvenance),
      bounds,
      second.receipt,
    ),
  );
  const wrongTime = clone(second.after);
  wrongTime["private.safety_reports"].at(-1).submitted_at =
    "1900-01-01T00:00:00Z";
  rejected(() =>
    currentRaceReport2(d2Handle, snapshot(wrongTime), bounds, second.receipt),
  );
  const repeatedAuditId = clone(d2);
  repeatedAuditId["private.moderation_audit"].at(-1).id =
    repeatedAuditId["private.moderation_audit"][0].id;
  rejected(() =>
    currentRaceDetail(
      d1Handle,
      snapshot(repeatedAuditId),
      bounds,
      detailResult,
      2,
    ),
  );
  const wrongReceipt = { ...second.receipt, actual_order_pass: true };
  rejected(() =>
    currentRaceReport2(d2Handle, snapshot(second.after), bounds, wrongReceipt),
  );
  for (const mutate of [
    (r) => {
      r["private.pilot_availability"][0].enabled = true;
    },
    (r) => {
      r["private.pilot_capabilities"][0].enabled = true;
    },
    (r) => {
      r["private.moderation_feature_gate"][0].enabled = false;
    },
    (r) => {
      r["private.safety_reports"][0].category = "other";
    },
    (r) => {
      r["public.profiles"][0].bio = "Unexpected";
    },
  ]) {
    const bad = clone(shutdown);
    mutate(bad);
    rejected(() => currentRaceOrdinaryShutdown(terminal, snapshot(bad)));
  }
  groups += retainedBlockMemoryExamples(off, shutdown, bounds, later);
  return groups;
}

function retainedBlockMemoryExamples(shutdownHandle, shutdown, bounds, later) {
  let groups = 0;
  const tested = (fn) => {
    fn();
    groups++;
  };
  const rejected = (fn) => {
    let failed = false;
    try {
      fn();
    } catch {
      failed = true;
    }
    check(failed);
    groups++;
  };
  const joined = clone(shutdown);
  joined["public.hangout_participants"].push({
    hangout_id: SQL_IDS.hangout,
    account_id: SQL_IDS.actor,
    state: "joined",
    joined_at: "2026-09-29T12:00:00.623456Z",
    left_at: null,
    removed_at: null,
    updated_at: "2026-09-29T12:00:00.623456Z",
  });
  const campus = find(
    joined,
    "public.hangouts",
    (r) => r.id === SQL_IDS.hangout,
  ).university_id;
  joined["private.friendships"].push({
    low_id: SQL_IDS.actor,
    high_id: SQL_IDS.target,
    requester_id: SQL_IDS.actor,
    campus_id: campus,
    generation_id: "6d000000-0000-4000-8000-000000000021",
    state: "active",
  });
  joined["private.dm_pairs"].push({
    generation_id: "6d000000-0000-4000-8000-000000000022",
    low_id: SQL_IDS.actor,
    high_id: SQL_IDS.target,
    initiator_id: SQL_IDS.actor,
    campus_id: campus,
    state: "accepted",
    created_at: "2026-09-29T12:00:00.623456Z",
    next_sequence: 1,
  });
  let joinedHandle;
  tested(() => {
    joinedHandle = retainedBlockJoinedFixture(
      shutdownHandle,
      snapshot(joined),
      bounds,
    );
  });
  const blocked = clone(joined);
  blocked["private.people_blocks"].push({
    blocker_id: SQL_IDS.actor,
    blocked_id: SQL_IDS.target,
  });
  blocked["private.hangout_peer_provenance"].push({
    hangout_id: SQL_IDS.hangout,
    low_id: SQL_IDS.actor,
    high_id: SQL_IDS.target,
  });
  blocked["private.friendships"] = [];
  blocked["private.dm_pairs"][0].state = "blocked";
  const participant = find(
    blocked,
    "public.hangout_participants",
    (r) => r.hangout_id === SQL_IDS.hangout && r.account_id === SQL_IDS.actor,
  );
  Object.assign(participant, {
    state: "left",
    left_at: later,
    updated_at: later,
  });
  let blockedHandle;
  tested(() => {
    blockedHandle = retainedBlockFirst(
      joinedHandle,
      snapshot(blocked),
      bounds,
      true,
    );
  });
  const rows = queueRows(blocked, SQL_IDS.actor, {
    p_after_submitted_at: null,
    p_after_id: null,
    p_limit: 24,
  });
  const queued = clone(blocked);
  const audit = Object.fromEntries(
    SCHEMA["private.moderation_audit"].map((key) => [key, null]),
  );
  Object.assign(audit, {
    id: "6d000000-0000-4000-8000-000000000011",
    occurred_at: later,
    operator_id: SQL_IDS.actor,
    action: "queue_read",
    request_id: "6d000000-0000-4000-8000-000000000012",
    page_report_ids: rows.map((r) => r.report_id),
    page_count: rows.length,
  });
  queued["private.moderation_audit"].push(audit);
  let queuedHandle;
  tested(() => {
    queuedHandle = retainedBlockQueue(
      blockedHandle,
      snapshot(queued),
      bounds,
      rows,
    );
  });
  const teardown = clone(queued);
  for (const name of [
    "private.safety_feature_gate",
    "private.moderation_feature_gate",
    "private.hangout_feature_gate",
  ])
    teardown[name][0].enabled = false;
  tested(() => {
    const terminal = retainedBlockTeardown(queuedHandle, snapshot(teardown));
    equal(own(retainedBlockFrames, terminal).phase, "teardown");
    check(
      modelCheckpoint.retainedTeardownAvailable &&
        !modelCheckpoint.racesAvailable,
    );
    equal(RETAINED_BLOCK_DESCRIPTION.order, [
      "set_safety_block:target:true",
      "list_moderation_reports",
    ]);
    check(
      rows.every(
        (r) => r.reporter_id !== SQL_IDS.actor && r.target_id !== SQL_IDS.actor,
      ),
    );
  });
  rejected(() => retainedBlockJoinedFixture({}, snapshot(joined), bounds));
  rejected(() =>
    retainedBlockFirst(shutdownHandle, snapshot(blocked), bounds, true),
  );
  rejected(() =>
    retainedBlockQueue(joinedHandle, snapshot(queued), bounds, rows),
  );
  rejected(() => retainedBlockTeardown(blockedHandle, snapshot(teardown)));
  rejected(() =>
    retainedBlockFirst(joinedHandle, snapshot(blocked), bounds, false),
  );
  for (const mutate of [
    (s) => {
      s["private.pilot_availability"][0].enabled = true;
    },
    (s) => {
      s["private.pilot_capabilities"][0].enabled = true;
    },
    (s) => {
      s["private.people_feature_gate"][0].enabled = true;
    },
    (s) => {
      s["public.hangouts"][0].host_id = SQL_IDS.actor;
    },
    (s) => {
      s["public.hangout_participants"].at(-1).account_id = SQL_IDS.reporter;
    },
    (s) => {
      s["private.safety_reports"][0].provenance_kind = "retained_host";
    },
    (s) => {
      s["private.friendships"][0].generation_id = SQL_IDS.report;
    },
    (s) => {
      s["private.dm_pairs"][0].state = "blocked";
    },
  ]) {
    const bad = clone(joined);
    mutate(bad);
    rejected(() =>
      retainedBlockJoinedFixture(shutdownHandle, snapshot(bad), bounds),
    );
  }
  for (const mutate of [
    (s) => {
      s["private.people_blocks"].pop();
    },
    (s) => {
      s["private.people_blocks"].at(-1).blocked_id = SQL_IDS.reporter;
    },
    (s) => {
      s["private.hangout_peer_provenance"].pop();
    },
    (s) => {
      s["public.hangout_participants"].at(-1).state = "removed";
    },
    (s) => {
      s["public.hangout_participants"].at(-1).left_at = null;
    },
    (s) => {
      s["public.hangout_participants"][0].state = "left";
    },
    (s) => {
      s["private.safety_reports"].pop();
    },
    (s) => {
      s["private.friendships"].push(joined["private.friendships"][0]);
    },
    (s) => {
      s["private.dm_pairs"][0].state = "accepted";
    },
  ]) {
    const bad = clone(blocked);
    mutate(bad);
    rejected(() =>
      retainedBlockFirst(joinedHandle, snapshot(bad), bounds, true),
    );
  }
  for (const mutate of [
    (s) => {
      s["private.moderation_audit"].pop();
    },
    (s) => {
      s["private.moderation_audit"].at(-1).page_count = 0;
    },
    (s) => {
      s["private.moderation_audit"].at(-1).action = "detail_read";
    },
    (s) => {
      s["private.people_blocks"].pop();
    },
  ]) {
    const bad = clone(queued);
    mutate(bad);
    rejected(() =>
      retainedBlockQueue(blockedHandle, snapshot(bad), bounds, rows),
    );
  }
  rejected(() =>
    retainedBlockQueue(blockedHandle, snapshot(queued), bounds, []),
  );
  for (const mutate of [
    (s) => {
      s["private.safety_reports"].pop();
    },
    (s) => {
      s["private.safety_report_requests"].pop();
    },
    (s) => {
      s["private.moderation_audit"].pop();
    },
    (s) => {
      s["private.people_blocks"].pop();
    },
    (s) => {
      s["private.hangout_peer_provenance"].pop();
    },
    (s) => {
      s["public.hangout_participants"].pop();
    },
    (s) => {
      s["public.hangouts"].pop();
    },
    (s) => {
      s["private.moderation_feature_gate"][0].enabled = true;
    },
    (s) => {
      s["private.pilot_capabilities"][0].enabled = true;
    },
  ]) {
    const bad = clone(teardown);
    mutate(bad);
    rejected(() => retainedBlockTeardown(queuedHandle, snapshot(bad)));
  }
  return groups;
}
