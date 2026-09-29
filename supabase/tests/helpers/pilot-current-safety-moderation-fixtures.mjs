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
export const modelCheckpoint = freeze({
  family: "core-setup-and-audited-reads",
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
    "family1a1:setupModelPlans;describeModelPlan(handle);modelCheckpoint;runMemoryExamples(exactSourceBytes);moderationContact():unconditional-refusal;family1a2a:readModelPlans;describeModelPlan(handle)->componentId/sequenceAvailable=false/transportAvailable=false/sourceHttpStatusAllowlist",
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
  httpTransportAvailable: false,
  httpSequencesAvailable: false,
  racesAvailable: false,
  plannedHttpCases: HTTP_IDS.length,
  plannedRaces: RACES.length,
  laterOperationsAvailable: false,
  readinessAvailable: false,
  retainedTeardownAvailable: false,
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
        !modelCheckpoint.readinessAvailable &&
        !modelCheckpoint.retainedTeardownAvailable,
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
