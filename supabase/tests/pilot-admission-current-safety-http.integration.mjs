import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import {
  localTarget,
  sql as frozenSql,
  quote,
  ok,
  resetDisposable,
  assertClean,
  writeHttpFailureEvidence,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  census as frozenCensus,
  censusTables,
  sanitized,
  assertOutcome,
  caseIds,
  routes,
  campus,
  email,
  photoPath,
  assertCurrentOnly,
  assertStoredProvenance,
  selectedLaterLane,
  identityLoss,
  assertReportOutcome,
  assertCurrentBlockOutcome,
} from "./helpers/pilot-current-safety-fixtures.mjs";

// AUTHORING ONLY. Importing this module is inert. Direct execution requires a
// later coordinator release, fresh ownership review and the frozen full27 target.
// All SQL preparation/observation is privileged synthetic setup, not RLS proof.
export const budgets = Object.freeze({
  requestMs: 30_000,
  moduleMs: 86_400_000,
  childExitMs: 5_000,
  signupQuietMs: 3_900_000,
  signupGapMs: 65_000,
});
export const plannedTotals = Object.freeze({
  verifiedHttpOutcomes: 522,
  uniqueFixtureKeys: 226,
  realAuthSignups: 904,
  serialIdentityAndAdmissionDenials: 114,
  concurrencyCredit: 0,
});
export const executionBlocker =
  "Combined HTTP fixture/transport adoption review, fresh exclusive ownership review and explicit serial runtime release remain required; execution refused before target contact.";
// Starts only after later proven exclusive ownership. The settlement anchor is
// deliberately conservative: target.request has variable synchronous guards
// before fetch, so a timestamp before those guards cannot prove start spacing.
export function createSignupSchedule({ now, wait, signal, ownedAt }) {
  if (!Number.isFinite(ownedAt))
    throw new Error("HTTP ownership clock unavailable");
  const deadline = ownedAt + budgets.moduleMs;
  let next = ownedAt + budgets.signupQuietMs;
  let settled = 0;
  const check = () => {
    if (signal?.aborted) throw new Error("HTTP schedule cancelled");
    const elapsed = now();
    if (!Number.isFinite(elapsed) || elapsed < ownedAt || elapsed >= deadline)
      throw new Error("HTTP module deadline");
    return elapsed;
  };
  return {
    check,
    async beforeSignup() {
      for (;;) {
        const current = check();
        if (current >= next) return;
        await wait(Math.min(next - current, deadline - current), signal);
        // Early wakeups, delayed clocks and cancellation are rechecked; no burst.
      }
    },
    signupSettled() {
      const current = check();
      settled++;
      if (settled > plannedTotals.realAuthSignups)
        throw new Error("HTTP signup allocation exceeded");
      next = current + budgets.signupGapMs;
    },
    get settled() {
      return settled;
    },
  };
}

export const identityDimensions = Object.freeze([
  "suspended",
  "banned",
  "email_confirmation",
  "email_domain",
  "email_equality",
  "membership_verification",
  "membership_delete",
  "membership_campus",
  "campus_active",
  "campus_unc",
  "campus_allowlist",
  "profile_missing",
  "profile_required",
  "profile_primary",
  "object_detach_delete",
  "membership_delete_replace",
  "profile_delete_replace",
]);
export const allocation = Object.freeze({
  "L1.report_exact_retry_shutdown":
    "serial HTTP, original receipt/time, zero54 delta",
  "L1.report_exact_retry_absent_roster":
    "serial HTTP, original receipt/time, zero54 delta",
  "L1.report_exact_retry_no_target_resolution":
    "serial HTTP after source deletion, zero54 delta",
  "L1.report_retry_fingerprint_mismatch": "serial HTTP exact neutral denial",
  "L1.report_retry_safety_loss": "serial HTTP off/missing safety",
  "L1.report_retry_actor_inactive": "serial HTTP suspended/banned actor",
  "L1.report_retained_peer_each_provenance":
    "serial HTTP seven individual proofs and priority",
  "L1.report_retained_hangout": "serial HTTP participant during shutdown",
  "L1.report_retained_host_private_resolution":
    "serial HTTP original mode/reference fingerprint",
  "L1.report_retained_disappears_no_fallback":
    "UNCLAIMED: original-row wait requires separate race",
  "L1.block_retained_shutdown": "serial HTTP retained block during shutdown",
  "L1.block_retained_absent_roster":
    "serial HTTP retained block with absent roster",
  "L1.unblock_shutdown_absent_roster":
    "serial HTTP outbound removal during shutdown",
  "L1.unblock_restores_nothing":
    "serial HTTP exact54 only-outbound-row removal",
  "L1.global_teardown_cancelled_disabled_unready_host":
    "serial HTTP synthetic terminal/unready source setup",
  "L1.global_teardown_all_sorted_parents":
    "serial HTTP full parent set; lock ordering UNCLAIMED",
  "L1.global_teardown_cohost_clear": "serial HTTP cohost trigger outcome",
  "L1.current_hangout_host_denied":
    "serial HTTP nonparticipant hangout_host denial",
  "L1.report_shape_normalization_boundary":
    "serial HTTP normalized/null/default/Unicode/2000/2001",
  "L1.report_inclusive_five_per_hour":
    "UNCLAIMED: capacity only; one-hour edges require SQL assignment",
  "L1.report_clock_after_wait":
    "UNCLAIMED: clock-after-wait requires rate race",
  "L1.report_same_key_exact_and_mismatch":
    "serial HTTP only; concurrent same-key UNCLAIMED",
  "L1.people_actor_not_opted_in_allowed":
    "serial HTTP absent and false actor preferences",
  "L1.people_onboarding_off_allowed":
    "serial HTTP actual People purpose, onboarding off",
  "L1.hangout_onboarding_people_chat_off_allowed":
    "serial HTTP actual Hangouts purpose only",
  "L1.people_hangouts_off_allowed": "serial HTTP actual People purpose only",
  "L1.neutral_nonexistent_crosscampus_self_unknown":
    "serial HTTP separate neutral target/shape cases",
  "L1.stronger_isolation_CH_CP_CB_and_retained":
    "UNCLAIMED: separate SQL assignment",
  "L1.retained_gate_account_serial_missing":
    "serial HTTP missing safety; inactive actor; missing-account UNCLAIMED",
  "L1.current_report_does_not_mutate_source":
    "serial HTTP exact54 report+ledger only",
  "L1.block_no_notification_report": "serial HTTP exact54 block/teardown only",
  "L1.current_lane_no_late_retained_upgrade":
    "UNCLAIMED: frozen-lane wait requires separate race",
});
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const stable = (value) =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stable(value[key])]),
        )
      : value;
const sorted = (rows) =>
  rows.sort((a, b) =>
    JSON.stringify(stable(a)).localeCompare(JSON.stringify(stable(b)), "en"),
  );
function canonical(snapshot) {
  return Object.fromEntries(
    Object.entries(snapshot).map(([name, rows]) => [name, sorted(rows)]),
  );
}
const argsFor = (r, overrides = {}) =>
  r.id === "CB"
    ? { p_account_id: r.target, p_blocked: true, ...overrides }
    : {
        p_request_id: r.request,
        p_target_mode: r.mode,
        p_target_id: r.target,
        p_category: "harassment",
        ...overrides,
      };
const neutral = (r) =>
  r.id === "CB" ? "Safety operation unavailable" : "Safety report unavailable";
const currentDefinition = (id) => routes.find((r) => r.id === id);
const expectedRpcMissing = (name, body) =>
  `Could not find the function public.${name}(${Object.keys(body).sort().join(", ")}) in the schema cache`;

// Failure projections are pure and inert. Arbitrary strings are represented by
// type/length/hash; never serialize AssertionError.message/stack or raw bodies.
const digest = (value) =>
  createHash("sha256").update(String(value)).digest("hex");
const hiddenField =
  /^(?:title|body|narrative|instructions|real_name|bio|major|email|verification_email|password|encrypted_password|access_token|refresh_token|token|raw_user_meta_data|raw_app_meta_data|data|user|session|authorization|apikey|description|note|reason|public_place|primary_photo_path|additional_photo_paths|interests|favorite_foods|favorite_music|down_to_do|weird_fact|instagram|prompts|metadata|path_tokens|name)$/i;
const safeLiteral = new Set([
  "receipt_id",
  "submitted_at",
  "code",
  "details",
  "hint",
  "message",
  "Safety report unavailable",
  "Safety operation unavailable",
  "active",
  "revoked",
  "suspended",
  "banned",
  "joined",
  "left",
  "removed",
  "pending",
  "accepted",
  "blocked",
  "closed",
  "published",
  "cancelled",
  "current_people",
  "current_hangout",
  "owned_block",
  "friendship",
  "friend_request",
  "dm_generation",
  "hangout_host",
  "hangout_overlap",
  "retained_hangout",
  "retained_host",
  "user",
  "hangout",
  "hangout_host",
]);
// Frozen final27 DDL/census projection and the original public HTTP ABI supply
// this finite key allowlist. Identifier syntax alone never proves safe content.
const schemaKeys = new Set([
  ...censusTables,
  ...`account_id action active actor_id additional_photo_paths allowed_email_domains answered_at assigned_at attended audit_id author_id bio blocked_id blocker_id body campus_id campus_zone category conversation_id created_at description disposition down_to_do duplicate_report_id effect enabled ends_at event_code executor_backend_pid executor_original_role executor_session_user favorite_foods favorite_music fingerprint generation_id graduation_year hangout_disable_id hangout_id high_id host_id id initiator_id input_fingerprint instagram instructions interests is_complete joined_at joining_state key kind left_at location_precision low_id major message_id name narrative new_account_status new_disabled new_hangout_disabled new_revision new_state new_status new_value next_sequence note observed_at occurred_at operation operator_id opted_in page_count page_report_ids payload_fingerprint policy_key policy_version previous_account_status previous_disabled previous_hangout_disabled previous_revision previous_state previous_status previous_value primary_photo_path prompts provenance_kind provenance_ref_id public_latitude public_longitude public_place ranking_epoch read_at real_name reason recipient_id removed_at report_id reporter_id request_id requester_id result_revision result_state result_value revision role sanction_id sequence singleton slug source_id source_kind starts_at state status subject_campus_id subject_id subject_target_id subject_target_type subject_type submitted_at target_id target_type threshold_value title university_id updated_at user_id verification_email verified_at visibility weird_fact`.split(
    " ",
  ),
  // Native Storage/Auth authorization projections already used by the fixture.
  ...`bucket_id owner owner_id last_accessed_at metadata path_tokens version level email email_confirmed_at deleted_at raw_user_meta_data raw_app_meta_data`.split(
    " ",
  ),
  // Public response and authored expectation fields; credential keys are named
  // for shape evidence only, and their values remain private below.
  ...`receipt_id code sqlstate error_code message msg details hint access_token refresh_token password encrypted_password token data user session authorization apikey accepted_statuses result_keys provenance different_receipt_required`.split(
    " ",
  ),
]);
const diagnosticNames = new Set([
  "Error",
  "AssertionError",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "AbortError",
  "TimeoutError",
  "strictEqual",
  "deepStrictEqual",
  "notStrictEqual",
  "notDeepStrictEqual",
  "match",
  "doesNotMatch",
  "ok",
  "fail",
  "rejects",
]);
const safeKey = (key) =>
  schemaKeys.has(key) || diagnosticNames.has(key)
    ? key
    : `<redacted-key:type:string;characters:${Array.from(key).length};sha256:${digest(key)}>`;
const privateField = (field) =>
  hiddenField.test(field) || (field !== "" && !schemaKeys.has(field));
const neutralMessages = new Set([
  "Safety report unavailable",
  "Safety operation unavailable",
]);
const knownCodes = new Set([
  "22023",
  "23503",
  "23505",
  "23514",
  "40001",
  "40P01",
  "42501",
  "22P02",
  "57014",
  "P0001",
  "PGRST301",
  "PGRST202",
  "PGRST205",
]);
const exactCode = (value) =>
  typeof value === "string" &&
  /^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(value) &&
  knownCodes.has(value);
const redactedContent = (value) => ({
  type: Array.isArray(value) ? "array" : typeof value,
  ...(typeof value === "string"
    ? { characters: Array.from(value).length }
    : Array.isArray(value)
      ? { length: value.length }
      : {}),
  sha256: digest(JSON.stringify(stable(value))),
  redacted: true,
});
export function redactedValue(value, field = "") {
  if (value === undefined) return { type: "undefined" };
  if (value === null) return value;
  if (privateField(field)) return redactedContent(value);
  if (field === "message" || field === "msg")
    return neutralMessages.has(value) ? value : redactedContent(value);
  if (["code", "sqlstate"].includes(field))
    return exactCode(value) ? value : redactedContent(value);
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    if (
      safeLiteral.has(value) ||
      uuidPattern.test(value) ||
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(
        value,
      )
    )
      return value;
    return {
      type: "string",
      characters: Array.from(value).length,
      sha256: digest(value),
      redacted: true,
    };
  }
  if (Array.isArray(value))
    return {
      type: "array",
      length: value.length,
      items: value.map((item) => redactedValue(item, field)),
    };
  if (typeof value === "object")
    return {
      type: "object",
      keys: Object.keys(value).map(safeKey).sort(),
      fields: Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          safeKey(key),
          redactedValue(item, key),
        ]),
      ),
    };
  return { type: typeof value, redacted: true };
}
export function redactedDifferences(expected, actual, path = "$", field = "") {
  if (JSON.stringify(stable(expected)) === JSON.stringify(stable(actual)))
    return [];
  // Keep full precise field/index differences but redact private value content.
  if (
    !privateField(field) &&
    expected &&
    actual &&
    typeof expected === "object" &&
    typeof actual === "object" &&
    Array.isArray(expected) === Array.isArray(actual)
  ) {
    return Array.from(
      new Set([...Object.keys(expected), ...Object.keys(actual)]),
    )
      .sort()
      .flatMap((key) =>
        redactedDifferences(
          expected[key],
          actual[key],
          Array.isArray(expected) &&
            /^(?:0|[1-9][0-9]*)$/.test(key) &&
            Number(key) < Math.max(expected.length, actual.length)
            ? `${path}[${key}]`
            : `${path}.${safeKey(key)}`,
          Array.isArray(expected) ? "" : key,
        ),
      );
  }
  return [
    {
      path,
      expected: redactedValue(expected, field),
      actual: redactedValue(actual, field),
    },
  ];
}
export function redactedHttp(response) {
  const body = response?.body;
  const message =
    body && !Array.isArray(body) ? (body.message ?? body.msg) : undefined;
  return {
    status: typeof response?.status === "number" ? response.status : null,
    code: body?.code === undefined ? null : redactedValue(body.code, "code"),
    auth_error_code:
      typeof body?.error_code === "string" &&
      ["over_email_send_rate_limit", "over_request_rate_limit"].includes(
        body.error_code,
      )
        ? body.error_code
        : redactedValue(body?.error_code),
    neutral_error:
      safeLiteral.has(message) && String(message).startsWith("Safety ")
        ? message
        : null,
    message: redactedValue(message, "message"),
    body_shape: {
      type:
        body === null ? "null" : Array.isArray(body) ? "array" : typeof body,
      ...(Array.isArray(body)
        ? {
            length: body.length,
            row_keys: body.map((row) =>
              row && typeof row === "object"
                ? Object.keys(row).map(safeKey).sort()
                : [],
            ),
          }
        : body && typeof body === "object"
          ? { keys: Object.keys(body).map(safeKey).sort() }
          : {}),
    },
  };
}
// Pure reusable regression checks: no target, Auth, child, census or entrypoint.
export function verifyFailureRedactionProjection() {
  const marker = "TACOS";
  const response = redactedHttp({
    status: 403,
    body: { code: "42501", message: marker, [marker]: marker },
  });
  assert.equal(response.code, "42501");
  assert.equal(response.message.redacted, true);
  assert.equal(response.message.characters, 5);
  assert.equal(response.neutral_error, null);
  assert.ok(!JSON.stringify(response).includes(marker));
  for (const field of [
    "",
    "message",
    "msg",
    "narrative",
    "title",
    "access_token",
    marker,
  ]) {
    const value = redactedValue(marker, field);
    assert.equal(value.redacted, true);
    assert.equal(value.characters, 5);
    assert.ok(!JSON.stringify(value).includes(marker));
  }
  for (const [code, field] of [
    ["42501", "code"],
    ["40P01", "sqlstate"],
    ["PGRST202", "code"],
  ])
    assert.equal(redactedValue(code, field), code);
  assert.equal(redactedValue("42501").redacted, true);
  assert.equal(redactedValue(marker, "code").redacted, true);
  assert.equal(redactedValue("PGRST202", "narrative").redacted, true);
  const differences = redactedDifferences(
    {
      status: 200,
      provenance_kind: "current_people",
      [marker]: "private-before",
    },
    { status: 403, provenance_kind: "retained_host", [marker]: marker },
  );
  assert.ok(
    differences.some(
      (d) => d.path === "$.status" && d.expected === 200 && d.actual === 403,
    ),
  );
  assert.ok(
    differences.some(
      (d) =>
        d.path === "$.provenance_kind" &&
        d.expected === "current_people" &&
        d.actual === "retained_host",
    ),
  );
  assert.ok(
    differences.some((d) =>
      d.path.includes("<redacted-key:type:string;characters:5;sha256:"),
    ),
  );
  assert.ok(!JSON.stringify(differences).includes(marker));
  assert.ok(!JSON.stringify(differences).includes("private-before"));
  const neutral = redactedHttp({
    status: 403,
    body: { code: "42501", message: "Safety report unavailable" },
  });
  assert.equal(neutral.neutral_error, "Safety report unavailable");
  assert.equal(neutral.message, "Safety report unavailable");
  return {
    pure_projection: true,
    unknown_message_value_key_redacted: true,
    known_code_field_retained: true,
    expected_field_differences_retained: true,
    neutral_literal_retained: true,
  };
}

const freshFailureContext = () => ({
  caseId: "HTTP.execution-gate",
  fixtureKey: null,
  phase: "execution-blocked-before-target",
  expectedHttp: null,
  actualHttp: null,
  actualWire: null,
  operation: "none",
  snapshots: [],
  targetEstablished: false,
  transportUnproven: false,
  httpInFlight: false,
  verifiedOutcomes: 0,
  fixtureCount: 0,
});
let failureContext = freshFailureContext();
function beginCase(id, phase, expectedHttp = null) {
  failureContext.caseId = id;
  failureContext.phase = phase;
  failureContext.expectedHttp = expectedHttp;
  failureContext.actualHttp = null;
  failureContext.actualWire = null;
  failureContext.operation = "none";
  failureContext.snapshots = [];
}
function sql(input, options) {
  if (
    /\b(?:insert|update|delete)\b/i.test(input) &&
    !failureContext.phase.includes("real-Auth")
  ) {
    failureContext.caseId = failureContext.fixtureKey ?? failureContext.caseId;
    failureContext.phase = "privileged-fixture-mutation-or-restoration";
    failureContext.expectedHttp = null;
    failureContext.actualHttp = null;
  }
  const priorPhase = failureContext.phase;
  failureContext.phase = `${priorPhase}:privileged-sql`;
  failureContext.operation = "privileged-sql";
  try {
    const result = frozenSql(input, options);
    failureContext.phase = priorPhase;
    return result;
  } catch (error) {
    failureContext.transportUnproven = true;
    throw error;
  }
}
function census() {
  const priorPhase = failureContext.phase;
  failureContext.phase = `${priorPhase}:full54-census`;
  failureContext.operation = "full54-census";
  try {
    const snapshot = frozenCensus();
    failureContext.snapshots.push(snapshot);
    failureContext.phase = priorPhase;
    return snapshot;
  } catch (error) {
    failureContext.transportUnproven = true;
    throw error;
  }
}
export function failureRecord(
  error,
  context = failureContext,
  failureCensus = null,
  censusError = null,
) {
  const snapshots = context.snapshots;
  return {
    id: "HTTP.original-failure",
    case_id: context.caseId,
    fixture_key: context.fixtureKey,
    phase: context.phase,
    actual_http: context.actualHttp,
    expected_http: redactedValue(context.expectedHttp),
    assertion: {
      name: typeof error?.name === "string" ? safeKey(error.name) : "Error",
      operator:
        typeof error?.operator === "string" ? safeKey(error.operator) : null,
      differences: redactedDifferences(error?.expected, error?.actual),
      message: redactedValue(error?.message, "message"),
    },
    full54_census_before_cleanup: {
      available_snapshots: snapshots.map(sanitized),
      failure_snapshot: failureCensus ? sanitized(failureCensus) : null,
      changes_from_before:
        snapshots.length && failureCensus
          ? redactedDifferences(
              canonical(structuredClone(snapshots[0])),
              canonical(structuredClone(failureCensus)),
            )
          : [],
      census_failure: censusError
        ? {
            name: safeKey(censusError.name ?? "Error"),
            message: redactedValue(censusError.message, "message"),
          }
        : null,
    },
    transport_settlement_proven:
      !context.transportUnproven && !context.httpInFlight,
    target_established: context.targetEstablished,
    verified_before_failure: context.verifiedOutcomes,
    fixture_keys_before_failure: context.fixtureCount,
    credited_outcomes: 0,
    concurrency_credit: 0,
    failed_case_credit: 0,
    task_incomplete: true,
  };
}
// Fixed reviewed wire enums. This projection never forwards internal hashes,
// unknown keys, raw provider strings, row identities or private content.
const httpFailurePhases = [
  "execution-blocked-before-target",
  "target-current27-guard",
  "real-Auth-signup",
  "real-Auth-password-login",
  "signup-quiet-period",
  "signup-cadence",
  "privileged-fixture-preparation",
  "privileged-existing-Auth-fixture-preparation",
  "privileged-fixture-mutation-or-restoration",
  "denial-outcome",
  "report-result-provenance-full54",
  "block-result-teardown-full54",
  "current-only-positive-guard",
  "report-exact-replay-full54",
  "separate-caller-receipt-provenance-full54",
  "exact-total-assertions",
  "guarded-full27-reset-and-zero54",
];
const httpFailureOperations = [
  "none",
  "privileged-sql",
  "full54-census",
  "HTTP-result-assertion",
  "signup",
  "password-login",
  "submit_safety_report",
  "set_safety_block",
  "set_people_block",
  "safety_reports",
  "safety_report_requests",
  "people_blocks",
  "pilot_account_admission",
  "pilot_lock_current_safety",
  "pilot_require_current_safety",
];
const httpFailureCodes = [
  null,
  "42501",
  "PGRST301",
  "PGRST202",
  "PGRST205",
  "22P02",
  "40P01",
  "40001",
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "invalid_credentials",
  "email_not_confirmed",
  "unknown-code",
  "unavailable",
];
const httpFailureMessages = [
  null,
  "Safety report unavailable",
  "Safety operation unavailable",
  "permission-denied",
  "invalid-signature",
  "rpc-missing",
  "table-missing",
  "invalid-uuid",
  "unknown-shape",
  "unavailable",
];
const httpFailureValues = [
  "missing",
  "null",
  "true",
  "false",
  "redacted-string",
  "redacted-number",
  "array",
  "object",
  "unknown",
  "current_hangout",
  "current_people",
  "current_visible_new_block",
  "retained_hangout",
  "retained_host",
  "owned_block",
  "friendship",
  "friend_request",
  "dm_generation",
  "hangout_host",
  "hangout_overlap",
  "published",
  "cancelled",
  "joined",
  "left",
  "removed",
  "active",
  "revoked",
  "suspended",
  "banned",
  "pending",
  "accepted",
  "blocked",
  "user",
  "hangout",
];
const httpFailureFields = [
  "$",
  "count",
  "status",
  "code",
  "message",
  "shape",
  "receipt_id",
  "submitted_at",
  "id",
  "reporter_id",
  "target_type",
  "target_id",
  "category",
  "narrative",
  "provenance_kind",
  "provenance_ref_id",
  "request_id",
  "report_id",
  "blocker_id",
  "blocked_id",
  "hangout_id",
  "account_id",
  "host_id",
  "user_id",
  "university_id",
  "state",
  "status",
  "enabled",
  "singleton",
  "revision",
  "key",
  "opted_in",
  "joined_at",
  "left_at",
  "removed_at",
  "low_id",
  "high_id",
  "generation_id",
  "initiator_id",
  "campus_id",
  "primary_photo_path",
  "email",
  "email_confirmed_at",
  "deleted_at",
  "raw_user_meta_data",
  "raw_app_meta_data",
  "verified_at",
  "verification_email",
  "active",
  "slug",
  "allowed_email_domains",
  "real_name",
  "major",
  "bio",
  "graduation_year",
  "bucket_id",
  "name",
  "owner_id",
  "title",
  "body",
  "instructions",
  "joining_state",
  "starts_at",
  "public_place",
  "public_latitude",
  "public_longitude",
  "created_at",
  "updated_at",
  "role",
  "reason",
  "operator_id",
  "subject_campus_id",
  "other-field",
];

function httpOperation(path) {
  const fixed = {
    "/auth/v1/signup": "signup",
    "/auth/v1/token?grant_type=password": "password-login",
  };
  if (fixed[path]) return fixed[path];
  const route = path.split("?")[0].replace(/^\/rest\/v1\/(?:rpc\/)?/, "");
  if (!httpFailureOperations.includes(route))
    throw new Error("HTTP failure operation unrepresentable");
  return route;
}
const wireShape = (value) =>
  value === undefined
    ? "unavailable"
    : value === null
      ? "null"
      : Array.isArray(value)
        ? "array"
        : ["boolean", "number", "string", "object"].includes(typeof value)
          ? typeof value
          : "unknown-shape";
function wireMessage(message) {
  if (message == null) return null;
  if (
    ["Safety report unavailable", "Safety operation unavailable"].includes(
      message,
    )
  )
    return message;
  if (typeof message !== "string") return "unknown-shape";
  if (
    /^permission denied for function (?:submit_safety_report|set_safety_block|set_people_block)$/.test(
      message,
    )
  )
    return "permission-denied";
  if (message === "JWSError JWSInvalidSignature") return "invalid-signature";
  if (message === 'invalid input syntax for type uuid: "not-a-uuid"')
    return "invalid-uuid";
  // Classify dynamic cache diagnostics without copying their signatures/keys.
  if (message.startsWith("Could not find the function public."))
    return "rpc-missing";
  if (message.startsWith("Could not find the table 'public."))
    return "table-missing";
  return "unknown-shape";
}
function wireHttp(response) {
  if (!response)
    return {
      status: null,
      code: "unavailable",
      message: "unavailable",
      shape: "unavailable",
    };
  const code = response.body?.code ?? response.body?.error_code;
  return {
    status:
      Number.isInteger(response.status) &&
      response.status >= 100 &&
      response.status <= 599
        ? response.status
        : null,
    code:
      code == null
        ? null
        : httpFailureCodes.includes(code)
          ? code
          : "unknown-code",
    message: wireMessage(response.body?.message ?? response.body?.msg),
    shape: wireShape(response.body),
  };
}
function expectedWireHttp(expected) {
  if (!expected) return wireHttp(null);
  return wireHttp({
    status: expected.status ?? null,
    body: Object.hasOwn(expected, "body")
      ? expected.body
      : expected.result_keys
        ? []
        : expected.code !== undefined || expected.message !== undefined
          ? { code: expected.code, message: expected.message }
          : undefined,
  });
}
const completeSnapshot = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join("|") ===
    censusTables.slice().sort().join("|") &&
  censusTables.every(
    (table) =>
      Array.isArray(value[table]) &&
      value[table].length <= 1_000_000 &&
      Object.keys(value[table]).length === value[table].length,
  );
function wireValue(value, field) {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return "redacted-number";
  if (typeof value === "string") {
    // Only source-backed provenance/state/type fields can retain finite enums.
    if (
      ["provenance_kind", "state", "status", "target_type"].includes(field) &&
      httpFailureValues.includes(value)
    )
      return value;
    return "redacted-string";
  }
  if (Array.isArray(value)) return "array";
  return typeof value === "object" ? "object" : "unknown";
}
export function normalizeHttpFailure(
  error,
  context,
  failureCensus = null,
  cleanupErrors = [],
) {
  if (
    !Array.isArray(cleanupErrors) ||
    cleanupErrors.length > 4 ||
    !cleanupErrors.every((value) =>
      [
        "not-attempted-target-unestablished",
        "not-attempted-settlement-unproven",
        "guard-failed",
        "reset-failed",
        "census-failed",
        "owned-exit-unobserved",
        "transport-interrupted",
        "deadline",
      ].includes(value),
    )
  )
    throw new Error("HTTP cleanup failure unrepresentable");
  const [phase, ...suffixes] = context.phase.split(":");
  for (let index = 0; index < suffixes.length; index++) {
    if (
      ["privileged-sql", "full54-census", "HTTP-result-assertion"].includes(
        suffixes[index],
      )
    )
      continue;
    if (suffixes[index] === "HTTP") {
      const path = suffixes[++index];
      if (["/auth/v1/signup", "/auth/v1/token"].includes(path)) continue;
      if (typeof path === "string" && path.startsWith("/rest/v1/")) {
        httpOperation(path);
        continue;
      }
    }
    throw new Error("HTTP failure phase suffix unrepresentable");
  }
  if (
    !httpFailurePhases.includes(phase) ||
    !httpFailureOperations.includes(context.operation ?? "none")
  )
    throw new Error("HTTP failure context unrepresentable");
  const expectedSnapshot = completeSnapshot(error?.expected)
    ? error.expected
    : null;
  const before = completeSnapshot(context.snapshots?.[0])
    ? context.snapshots[0]
    : null;
  const after = completeSnapshot(failureCensus)
    ? failureCensus
    : context.snapshots?.length >= 2 &&
        completeSnapshot(context.snapshots.at(-1))
      ? context.snapshots.at(-1)
      : null;
  const counts = (snapshot) =>
    snapshot
      ? censusTables.map((table) => snapshot[table].length)
      : censusTables.map(() => null);
  const differences = [];
  const add = (scope, table, field, row, a, b, kind = null) => {
    differences.push({
      scope,
      table,
      field,
      row,
      kind:
        kind ??
        (a === undefined
          ? "unexpected"
          : b === undefined
            ? "missing"
            : wireShape(a) !== wireShape(b)
              ? "type"
              : "value"),
      expected: wireValue(a, field),
      observed: wireValue(b, field),
    });
    if (differences.length > 128)
      throw new Error("HTTP failure differences overflow");
  };
  const walk = (a, b, scope, table = null, field = "$", row = null) => {
    if (isDeepStrictEqual(a, b)) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length)
        add(scope, table, "count", row, a.length, b.length, "count");
      for (let index = 0; index < Math.max(a.length, b.length); index++)
        walk(a[index], b[index], scope, table, field, row ?? index);
    } else if (
      a &&
      b &&
      typeof a === "object" &&
      typeof b === "object" &&
      !Array.isArray(a) &&
      !Array.isArray(b) &&
      Object.getPrototypeOf(a) === Object.prototype &&
      Object.getPrototypeOf(b) === Object.prototype &&
      (field === "$" || !privateField(field))
    ) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (httpFailureFields.includes(key))
          walk(a[key], b[key], scope, table, key, row);
        else add(scope, table, "other-field", row, a[key], b[key]);
      }
    } else
      add(
        scope,
        table,
        httpFailureFields.includes(field) ? field : "other-field",
        row,
        a,
        b,
      );
  };
  if (expectedSnapshot) {
    if (after)
      for (const table of censusTables)
        walk(expectedSnapshot[table], after[table], "census", table);
    else
      add(
        "census",
        censusTables[0],
        "$",
        null,
        expectedSnapshot,
        undefined,
        "unavailable",
      );
  } else {
    walk(error?.expected, error?.actual, "result");
    if (before && after)
      for (const table of censusTables)
        walk(before[table], after[table], "census", table);
  }
  const observed = context.actualWire ?? wireHttp(null);
  const expected = expectedWireHttp(context.expectedHttp);
  if (
    ![observed, expected].every((http) =>
      httpFailureMessages.includes(http.message),
    )
  )
    throw new Error("HTTP failure message unrepresentable");
  for (const key of ["status", "code", "message", "shape"])
    if (observed[key] !== expected[key])
      add(
        "http",
        null,
        key,
        null,
        expected[key],
        observed[key],
        observed[key] === "unknown-code"
          ? "unknown-code"
          : observed[key] === "unknown-shape"
            ? "unknown-shape"
            : "value",
      );
  const record = {
    version: 1,
    case_id: context.caseId,
    phase,
    operation: context.operation ?? "none",
    observed,
    expected,
    census: {
      before: counts(before),
      after: counts(after),
      expected: counts(expectedSnapshot),
    },
    availability: {
      before: before ? "available" : "unavailable",
      after: after ? "available" : "unavailable",
      expected: expectedSnapshot ? "available" : "unavailable",
    },
    differences,
    cleanup_errors: cleanupErrors,
  };
  if (Buffer.byteLength(JSON.stringify(record)) > 64 * 1024)
    throw new Error("HTTP failure payload overflow");
  return record;
}
async function publishFailure(
  error,
  context,
  failureCensus,
  cleanupErrors = [],
) {
  let record;
  try {
    record = normalizeHttpFailure(error, context, failureCensus, cleanupErrors);
  } catch {
    // The reviewed writer's invalid-record sentinel invalidates earlier evidence;
    // never silently trim an oversized/unrepresentable failure into pass credit.
    try {
      await writeHttpFailureEvidence(null);
    } catch {
      /* unavailable */
    }
    failureContext.failureChannelUnavailable = true;
    return;
  }
  try {
    await writeHttpFailureEvidence(record);
  } catch {
    failureContext.failureChannelUnavailable = true;
  }
}

function evidenceError(record, cleanup) {
  const error = new Error("Redacted fixture failure evidence retained");
  error.safeEvidence = {
    original_failure: record,
    failure_channel: failureContext.failureChannelUnavailable
      ? "unavailable"
      : "child-reported-failed-uncredited",
    cleanup,
    credited_outcomes: 0,
    concurrency_credit: 0,
    task_incomplete: true,
  };
  return error;
}

export async function runSerialHttp() {
  failureContext = freshFailureContext();
  // Fail BEFORE any contact; authoring cannot waive review/ownership/release.
  assert.equal(executionBlocker, null, executionBlocker);
  failureContext.phase = "target-current27-guard";
  const target = localTarget("current27");
  failureContext.targetEstablished = true;
  const moduleSignal = AbortSignal.timeout(budgets.moduleMs);
  const schedule = createSignupSchedule({
    now: () => performance.now(),
    wait: (ms, signal) => delay(ms, undefined, { signal }),
    signal: moduleSignal,
    ownedAt: performance.now(),
  });
  const evidence = [];
  const emittedIds = new Set();
  const fixtureIds = new Set();
  const emit = (id, record) => {
    assert.ok(!emittedIds.has(id), "literal unique evidence ID");
    emittedIds.add(id);
    const safe = {
      id,
      observation: "real-Auth-HTTP-serial",
      concurrency_credit: 0,
      ...record,
    };
    evidence.push(safe);
    failureContext.verifiedOutcomes = evidence.length;
    failureContext.fixtureCount = fixtureIds.size;
    console.log(JSON.stringify(safe));
  };
  // Frozen request rechecks fixed origin/owner/full27 before EACH Auth/REST call.
  const request = async (path, token, body, options = {}) => {
    schedule.check();
    failureContext.operation = httpOperation(path);
    failureContext.httpInFlight = true;
    failureContext.actualHttp = null;
    failureContext.actualWire = null;
    const priorPhase = failureContext.phase;
    failureContext.phase = `${priorPhase}:HTTP:${path.split("?")[0]}`;
    try {
      const response = await target.request(path, token, body, {
        ...options,
        signal: AbortSignal.any([
          moduleSignal,
          AbortSignal.timeout(budgets.requestMs),
        ]),
      });
      failureContext.httpInFlight = false;
      failureContext.actualHttp = redactedHttp(response);
      failureContext.actualWire = wireHttp(response);
      schedule.check();
      failureContext.phase = `${priorPhase}:HTTP-result-assertion`;
      return response;
    } catch (error) {
      // Aborted fetch/unobserved target children may still be executing. A reset
      // must not run while their termination/transaction settlement is unproven.
      failureContext.transportUnproven = true;
      throw error;
    }
  };
  const rpc = (name, token, body) =>
    request(`/rest/v1/rpc/${name}`, token, body);
  const signup = async (key, slot, metadata = {}) => {
    beginCase(`${key}.Auth.${slot}`, "real-Auth-signup", {
      accepted_statuses: [200, 204],
    });
    const address = email(caseIds(`${key}.${slot}`).actor);
    const password = `Local-only-${randomUUID()}`;
    failureContext.phase =
      schedule.settled === 0 ? "signup-quiet-period" : "signup-cadence";
    await schedule.beforeSignup();
    failureContext.phase = "real-Auth-signup";
    const signupResponse = await request("/auth/v1/signup", null, {
      email: address,
      password,
      data: metadata,
    });
    schedule.signupSettled();
    const created = ok(signupResponse);
    const id = created.user?.id ?? created.id;
    assert.match(id, uuidPattern);
    // Confirmation is local fixture preparation. It grants no client permission.
    sql(
      `update auth.users set email_confirmed_at=now() where id=${quote(id)};`,
    );
    beginCase(`${key}.Auth.${slot}`, "real-Auth-password-login", {
      accepted_statuses: [200, 204],
    });
    const login = ok(
      await request("/auth/v1/token?grant_type=password", null, {
        email: address,
        password,
      }),
    );
    assert.equal(login.user.id, id);
    assert.equal(login.user.email, address);
    assert.equal(typeof login.access_token, "string");
    return { id, email: address, token: login.access_token };
  };
  const makeSource = (r, source = r.source, host = r.host) =>
    sql(`begin;
    insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude)
      values(${quote(source)},${quote(host)},${quote(campus)},'Undisclosed fixture',now()+interval '1 day','Approximate',35.91,-79.05);
    insert into public.hangout_participants(hangout_id,account_id,state) values(${quote(source)},${quote(host)},'joined');
    insert into public.hangout_private_locations(hangout_id,instructions) values(${quote(source)},'Undisclosed synthetic instructions');commit;`);
  const fixture = async (
    key,
    routeId,
    actorPreference = "absent",
    metadata = {},
  ) => {
    assert.ok(
      !fixtureIds.has(key),
      "fresh reporter/source/peer/manager per case",
    );
    fixtureIds.add(key);
    failureContext.fixtureKey = key;
    failureContext.fixtureCount = fixtureIds.size;
    beginCase(key, "privileged-fixture-preparation");
    const ids = { ...caseIds(`HTTP.${key}`) };
    const users = {};
    for (const slot of ["actor", "host", "peer", "manager"]) {
      users[slot] = await signup(key, slot, slot === "actor" ? metadata : {});
      ids[slot] = users[slot].id;
    }
    beginCase(key, "privileged-existing-Auth-fixture-preparation");
    // Adapter mirrors frozen setup except Auth users already exist via signup.
    // Never INSERT/replace/delete Auth users, credentials or triggers.
    const ready = [ids.actor, ids.host, ids.peer];
    sql(`begin;
      insert into storage.objects(bucket_id,name,owner_id) values ${ready.map((id) => `('profile-photos',${quote(photoPath(id))},${quote(id)})`).join(",")};
      update public.profiles set real_name='Current safety fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path=user_id::text||'/11111111.png' where user_id in (${ready.map(quote).join(",")});
      insert into private.pilot_account_admission(account_id,state,revision) values ${ready.map((id) => `(${quote(id)},'active',1)`).join(",")};
      select private.set_pilot_manager_fixture(${quote(ids.manager)},'active',0,'B3c synthetic manager',${quote(ids.managerRequest)});
      insert into public.universities(id,name,slug,allowed_email_domains,active) values(${quote(ids.otherCampus)},'Other synthetic campus',${quote("b3c-" + ids.otherCampus)},array['unc.edu'],true);
      update private.pilot_availability set enabled=true;
      update private.pilot_capabilities set enabled=key=${quote(currentDefinition(routeId).purpose)};
      update private.hangout_feature_gate set enabled=true;
      update private.people_feature_gate set enabled=true;
      update private.safety_feature_gate set enabled=true;
      insert into private.people_preferences(account_id,opted_in) values(${quote(ids.peer)},true);
      ${actorPreference === false ? `insert into private.people_preferences(account_id,opted_in) values(${quote(ids.actor)},false);` : ""}
      commit;`);
    const r = {
      ...currentDefinition(routeId),
      ...ids,
      users,
      subject: ids.actor,
      target: routeId === "CH" ? ids.source : ids.peer,
      subjects:
        routeId === "CH"
          ? { actor: ids.actor, immutable_host: ids.host }
          : { actor: ids.actor, peer: ids.peer },
    };
    if (routeId === "CH") makeSource(r);
    assertCurrentOnly(r);
    return r;
  };
  const denyResponse = async (id, invoke, expected) => {
    beginCase(id, "denial-outcome", expected);
    const before = census();
    const response = await invoke();
    assert.equal(response.status, expected.status, id);
    assert.equal(response.body?.code, expected.code, id);
    assert.equal(response.body?.message, expected.message, id);
    assert.deepEqual(Object.keys(response.body).sort(), [
      "code",
      "details",
      "hint",
      "message",
    ]);
    // Neutral business and ACL errors must not carry hidden source details.
    if (expected.code === "42501") {
      assert.equal(response.body.details, null);
      assert.equal(response.body.hint, null);
    }
    assert.doesNotMatch(
      JSON.stringify(response.body),
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|Undisclosed fixture|Undisclosed synthetic instructions|receipt_id|submitted_at|reporter_id/,
    );
    const after = census();
    const proof = assertOutcome({
      result: {
        status: response.status,
        code: response.body.code,
        message: response.body.message,
      },
      expectedResult: expected,
      before,
      after,
    });
    emit(id, {
      http: response.status,
      code: expected.code,
      message: expected.message,
      zero54_delta: true,
      ...proof,
    });
    return response;
  };
  const denied = (
    id,
    r,
    overrides = {},
    name = r.rpc,
    token = r.users.actor.token,
  ) =>
    denyResponse(id, () => rpc(name, token, argsFor(r, overrides)), {
      status: 403,
      code: "42501",
      message: neutral(r),
    });
  const allowedReport = async (id, r, overrides = {}, provenance = null) => {
    beginCase(id, "report-result-provenance-full54", {
      status: 200,
      result_keys: ["receipt_id", "submitted_at"],
      provenance: provenance ?? { kind: r.provenance, target_id: r.target },
    });
    const body = argsFor(r, overrides);
    const before = census();
    const response = await rpc(r.rpc, r.users.actor.token, body);
    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
    const receipt = response.body[0];
    assert.deepEqual(Object.keys(receipt).sort(), [
      "receipt_id",
      "submitted_at",
    ]);
    assert.match(receipt.receipt_id, uuidPattern);
    assert.ok(Number.isFinite(Date.parse(receipt.submitted_at)));
    const normalization = JSON.parse(
      sql(`select jsonb_build_object('category',lower(private.profile_trim(${quote(body.p_category)})),
      'narrative',nullif(private.profile_trim(${body.p_narrative == null ? "null" : quote(body.p_narrative)}),''),
      'fingerprint',md5(jsonb_build_array(${quote(body.p_target_mode)},${quote(body.p_target_id)}::uuid,
      lower(private.profile_trim(${quote(body.p_category)})),nullif(private.profile_trim(${body.p_narrative == null ? "null" : quote(body.p_narrative)}),''))::text))`),
    );
    const p = provenance ?? {
      kind: r.provenance,
      ref: r.target,
      target: r.target,
      type: r.mode,
    };
    const expectedReport = {
      id: receipt.receipt_id,
      submitted_at: receipt.submitted_at,
      reporter_id: r.actor,
      target_type: p.type,
      target_id: p.target,
      category: normalization.category,
      narrative: normalization.narrative,
      provenance_kind: p.kind,
      provenance_ref_id: p.ref,
    };
    const expectedLedger = {
      reporter_id: r.actor,
      request_id: body.p_request_id,
      input_fingerprint: normalization.fingerprint,
      report_id: receipt.receipt_id,
    };
    const after = census();
    // Frozen report assertion supports exact current target/provenance; for a
    // privately resolved retained host the independently expected route adapts.
    const assertedRoute = {
      ...r,
      request: body.p_request_id,
      target: p.target,
      provenance: p.kind,
    };
    let proof;
    if (p.ref === p.target)
      proof = assertReportOutcome(assertedRoute, {
        before,
        after,
        receipt,
        expectedReport,
        expectedLedger,
      });
    else {
      const expectedAfter = structuredClone(before);
      expectedAfter["private.safety_reports"].push(expectedReport);
      expectedAfter["private.safety_report_requests"].push(expectedLedger);
      proof = assertOutcome({
        result: response,
        expectedResult: { status: 200, body: [receipt] },
        before: canonical(before),
        after: canonical(after),
        expectedAfter: canonical(expectedAfter),
      });
    }
    if (!provenance) assertStoredProvenance(assertedRoute, receipt);
    emit(id, {
      rpc: r.rpc,
      http: 200,
      result: receipt,
      provenance: { kind: p.kind, ref_id: p.ref },
      ...proof,
    });
    return receipt;
  };
  const changeBlock = async (
    id,
    r,
    blocked,
    { name = r.rpc, teardown = null } = {},
  ) => {
    beginCase(id, "block-result-teardown-full54", {
      status: 200,
      body: blocked,
    });
    const before = census();
    const response = await rpc(name, r.users.actor.token, {
      p_account_id: r.peer,
      p_blocked: blocked,
    });
    assert.deepEqual(response, { status: 200, body: blocked });
    const after = census();
    let proof;
    if (
      blocked &&
      !teardown &&
      !before["private.people_blocks"].some(
        (b) => b.blocker_id === r.actor && b.blocked_id === r.peer,
      )
    ) {
      // people_blocks has exactly these two fields; no generated timestamp.
      proof = assertCurrentBlockOutcome(r, {
        before,
        after,
        result: response.body,
        expectedBlock: { blocker_id: r.actor, blocked_id: r.peer },
      });
    } else {
      const expectedAfter = structuredClone(before);
      if (blocked) {
        if (
          !expectedAfter["private.people_blocks"].some(
            (b) => b.blocker_id === r.actor && b.blocked_id === r.peer,
          )
        )
          expectedAfter["private.people_blocks"].push({
            blocker_id: r.actor,
            blocked_id: r.peer,
          });
        if (teardown) teardown(expectedAfter, after);
      } else
        expectedAfter["private.people_blocks"] = expectedAfter[
          "private.people_blocks"
        ].filter((b) => !(b.blocker_id === r.actor && b.blocked_id === r.peer));
      proof = assertOutcome({
        result: response,
        expectedResult: { status: 200, body: blocked },
        before: canonical(before),
        after: canonical(after),
        expectedAfter: canonical(expectedAfter),
      });
    }
    emit(id, {
      rpc: name,
      http: 200,
      result: blocked,
      selected_later_lane: blocked
        ? selectedLaterLane(r)
        : "freshly classified",
      ...proof,
    });
    return response.body;
  };
  const positive = async (id, r) => {
    beginCase(`${id}.positive`, "current-only-positive-guard");
    assertCurrentOnly(r);
    if (r.id === "CB") {
      await changeBlock(`${id}.positive`, r, true);
      // Actual authorized outbound removal restores current-only classification.
      await changeBlock(`${id}.positive-unblock`, r, false);
      assertCurrentOnly(r);
    } else
      await allowedReport(`${id}.positive`, r, {
        p_request_id: caseIds(`${id}.positive`).request,
      });
  };
  const replay = async (id, r, receipt, overrides = {}) => {
    beginCase(id, "report-exact-replay-full54", {
      status: 200,
      body: [receipt],
    });
    const before = census();
    const response = await rpc(
      r.rpc,
      r.users.actor.token,
      argsFor(r, overrides),
    );
    const after = census();
    const proof = assertOutcome({
      result: response,
      expectedResult: { status: 200, body: [receipt] },
      before,
      after,
    });
    emit(id, {
      http: 200,
      result: receipt,
      original_receipt_time: true,
      no_second_rate_slot: true,
      ...proof,
    });
  };
  const restoreRow = (table, snapshot, predicate) => {
    const row = snapshot[table].find(predicate);
    assert.ok(row);
    // Policy rows have no generated columns. This is trusted fixture restoration.
    return `insert into ${table} select * from jsonb_populate_record(null::${table},${quote(JSON.stringify(row))}::jsonb);`;
  };
  const shutdown = (r) =>
    sql(`update private.pilot_availability set enabled=false;
    update private.pilot_capabilities set enabled=false;update private.people_feature_gate set enabled=false;
    update private.hangout_feature_gate set enabled=false;delete from private.pilot_account_admission where account_id in(${quote(r.actor)},${quote(r.peer)},${quote(r.host)});`);
  const pair = (r) => [r.actor, r.peer].sort();
  const addProof = (r, kind, key = kind) => {
    const [low, high] = pair(r),
      ref = caseIds(`HTTP.${key}`).source;
    const common = `${quote(low)},${quote(high)}`;
    if (kind === "owned_block")
      sql(
        `insert into private.people_blocks(blocker_id,blocked_id) values(${quote(r.actor)},${quote(r.peer)});`,
      );
    if (kind === "friendship")
      sql(
        `insert into private.friendships(low_id,high_id,requester_id,campus_id,generation_id,state) values(${common},${quote(r.actor)},${quote(campus)},${quote(ref)},'accepted');`,
      );
    if (kind === "friend_request")
      sql(
        `insert into private.friendship_create_requests(actor_id,request_id,target_id,generation_id) values(${quote(r.actor)},${quote(r.request)},${quote(r.peer)},${quote(ref)});`,
      );
    if (kind === "dm_generation")
      sql(
        `insert into private.dm_pairs(low_id,high_id,initiator_id,campus_id,generation_id,state) values(${common},${quote(r.actor)},${quote(campus)},${quote(ref)},'closed');`,
      );
    if (
      ["hangout_host", "immutable_overlap", "positive_interval"].includes(kind)
    ) {
      makeSource(r, ref, kind === "hangout_host" ? r.peer : r.host);
      if (kind === "immutable_overlap")
        sql(
          `insert into private.hangout_peer_provenance(hangout_id,low_id,high_id) values(${quote(ref)},${common});`,
        );
      else
        sql(`insert into public.hangout_participants(hangout_id,account_id,state,joined_at,left_at)
        values(${quote(ref)},${quote(r.actor)},'left','2026-01-01T12:00:00Z','2026-01-01T12:10:00Z')
        ${kind === "positive_interval" ? `,(${quote(ref)},${quote(r.peer)},'left','2026-01-01T12:05:00Z','2026-01-01T12:15:00Z')` : ""};`);
    }
    return {
      kind: ["immutable_overlap", "positive_interval"].includes(kind)
        ? "hangout_overlap"
        : kind,
      ref: kind === "owned_block" ? r.peer : ref,
      target: r.peer,
      type: "user",
    };
  };
  let completed = false;
  let originalFailure = null;
  let cleanup = null;
  try {
    assertClean();
    for (const routeId of ["CH", "CP", "CB"]) {
      const r = await fixture(`ABI.${routeId}`, routeId);
      await positive(`ABI.${routeId}`, r);
      const body = argsFor(r);
      for (const [label, token, http] of [
        ["anon", null, 401],
        ["service", target.status.SERVICE_ROLE_KEY, 403],
      ]) {
        if (label === "service")
          assert.ok(token, "local service key must exist in memory");
        await denyResponse(
          `ABI.${routeId}.${label}`,
          () => rpc(r.rpc, token, body),
          {
            status: http,
            code: "42501",
            message: `permission denied for function ${r.rpc}`,
          },
        );
      }
      const jwt = r.users.actor.token.split(".");
      assert.equal(jwt.length, 3);
      jwt[2] = (jwt[2][0] === "A" ? "B" : "A") + jwt[2].slice(1);
      await denyResponse(
        `ABI.${routeId}.invalid-signature`,
        () => rpc(r.rpc, jwt.join("."), body),
        {
          status: 401,
          code: "PGRST301",
          message: "JWSError JWSInvalidSignature",
        },
      );
      const extra = { ...body, p_actor_id: r.host };
      await denyResponse(
        `ABI.${routeId}.forged-actor`,
        () => rpc(r.rpc, r.users.actor.token, extra),
        {
          status: 404,
          code: "PGRST202",
          message: expectedRpcMissing(r.rpc, extra),
        },
      );
      const incomplete =
        routeId === "CB"
          ? { p_account_id: r.peer }
          : { p_request_id: r.request, p_target_id: r.target };
      await denyResponse(
        `ABI.${routeId}.unknown-overload`,
        () => rpc(r.rpc, r.users.actor.token, incomplete),
        {
          status: 404,
          code: "PGRST202",
          message: expectedRpcMissing(r.rpc, incomplete),
        },
      );
      const invalid = argsFor(
        r,
        routeId === "CB"
          ? { p_account_id: "not-a-uuid" }
          : { p_target_id: "not-a-uuid" },
      );
      await denyResponse(
        `ABI.${routeId}.typed-uuid`,
        () => rpc(r.rpc, r.users.actor.token, invalid),
        {
          status: 400,
          code: "22P02",
          message: 'invalid input syntax for type uuid: "not-a-uuid"',
        },
      );
      for (const table of [
        "safety_reports",
        "safety_report_requests",
        "people_blocks",
        "pilot_account_admission",
      ])
        await denyResponse(
          `ABI.${routeId}.table.${table}`,
          () => request(`/rest/v1/${table}`, r.users.actor.token),
          {
            status: 404,
            code: "PGRST205",
            message: `Could not find the table 'public.${table}' in the schema cache`,
          },
        );
      for (const [name, args] of [
        [
          "pilot_lock_current_safety",
          { p_operation: "report_current_people", p_target_id: r.peer },
        ],
        [
          "pilot_require_current_safety",
          {
            p_operation: "report_current_people",
            p_target_id: r.peer,
            p_bindings: [],
          },
        ],
      ])
        await denyResponse(
          `ABI.${routeId}.helper.${name}`,
          () => rpc(name, r.users.actor.token, args),
          {
            status: 404,
            code: "PGRST202",
            message: expectedRpcMissing(name, args),
          },
        );
      const bad = await fixture(
        `ABI.${routeId}.metadata-no-admission`,
        routeId,
        "absent",
        {
          role: "service_role",
          platform_role: "admin",
          admitted: true,
          campus_id: campus,
        },
      );
      sql(
        `delete from private.pilot_account_admission where account_id=${quote(bad.actor)};insert into public.platform_roles(user_id,role) values(${quote(bad.actor)},'admin');`,
      );
      await denied(`ABI.${routeId}.metadata-platform-no-admission`, bad);
    }
    for (const pref of ["absent", false])
      for (const id of ["CP", "CB"]) {
        const r = await fixture(`L1.actor-preference.${id}.${pref}`, id, pref);
        await positive(`L1.actor-preference.${id}.${pref}`, r);
      }
    const chPurpose = await fixture("L1.actual-purpose.CH", "CH");
    await allowedReport(
      "L1.hangout_onboarding_people_chat_off_allowed",
      chPurpose,
    );
    for (const id of ["CP", "CB"]) {
      const r = await fixture(`L1.actual-purpose.${id}`, id);
      await positive(`L1.people_onboarding_hangouts_off_allowed.${id}`, r);
    }
    // Separate fresh actor/source/request per serial negative case. No wait credit.
    for (const routeId of ["CH", "CP", "CB"]) {
      for (const tableKind of [
        "availability",
        "purpose",
        "source_gate",
        "safety_gate",
      ])
        for (const loss of ["off", "missing"]) {
          const id = `HTTP.serial.${routeId}.${tableKind}.${loss}`;
          const r = await fixture(id, routeId);
          await positive(id, r);
          const beforeSetup = census();
          const table =
            tableKind === "availability"
              ? "private.pilot_availability"
              : tableKind === "purpose"
                ? "private.pilot_capabilities"
                : tableKind === "source_gate"
                  ? routeId === "CH"
                    ? "private.hangout_feature_gate"
                    : "private.people_feature_gate"
                  : "private.safety_feature_gate";
          const where =
            tableKind === "purpose" ? `key=${quote(r.purpose)}` : "singleton";
          sql(
            loss === "off"
              ? `update ${table} set enabled=false where ${where};`
              : `delete from ${table} where ${where};`,
          );
          await denied(id, r);
          // On failure, preserve live loss and its census until the outer catch;
          // a restoration failure cannot overwrite the original assertion.
          sql(
            loss === "off"
              ? `update ${table} set enabled=true where ${where};`
              : restoreRow(
                  table,
                  beforeSetup,
                  (row) => tableKind !== "purpose" || row.key === r.purpose,
                ),
          );
        }
      for (const subjectLabel of routeId === "CH"
        ? ["actor", "immutable_host"]
        : ["actor", "peer"]) {
        for (const loss of [
          ...identityDimensions,
          "roster_revoked",
          "roster_missing",
        ]) {
          const id = `HTTP.serial.${routeId}.${subjectLabel}.${loss}`;
          const r = await fixture(id, routeId);
          await positive(id, r);
          const bound = r.subjects[subjectLabel];
          const slot = Object.keys(r.users).find(
            (k) => r.users[k].id === bound,
          );
          const beforeSetup = census();
          let plan;
          if (loss.startsWith("roster_"))
            plan = {
              loss:
                loss === "roster_missing"
                  ? `delete from private.pilot_account_admission where account_id=${quote(bound)};`
                  : `update private.pilot_account_admission set state='revoked' where account_id=${quote(bound)};`,
              restore:
                loss === "roster_missing"
                  ? restoreRow(
                      "private.pilot_account_admission",
                      beforeSetup,
                      (row) => row.account_id === bound,
                    )
                  : `update private.pilot_account_admission set state='active' where account_id=${quote(bound)};`,
            };
          else {
            plan = identityLoss(loss, bound, r);
            // Frozen helper's fixture email differs from real signup email.
            // Preserve the signup identity exactly in lawful restoration/setup.
            plan.loss = plan.loss.replaceAll(email(bound), r.users[slot].email);
            plan.restore = plan.restore.replaceAll(
              email(bound),
              r.users[slot].email,
            );
            if (loss === "membership_delete_replace") {
              plan.loss += `update public.university_memberships set verified_at=null,verification_email=null where user_id=${quote(bound)};`;
              plan.restore = `update public.university_memberships set verified_at=now(),verification_email=${quote(r.users[slot].email)} where user_id=${quote(bound)};`;
            }
            if (loss === "profile_delete_replace") {
              plan.loss += `update public.profiles set bio=null where user_id=${quote(bound)};`;
              plan.restore = `update public.profiles set bio='Local' where user_id=${quote(bound)};`;
            }
          }
          sql(`begin;${plan.loss}commit;`);
          await denied(id, r);
          // Restore only after the denial passes. Failure evidence precedes any
          // later reset; unproven transport forbids further fixture writes.
          if (plan.restore) sql(`begin;${plan.restore}commit;`);
        }
      }
      if (routeId !== "CH")
        for (const loss of ["false", "missing"]) {
          const id = `HTTP.serial.${routeId}.peer-preference.${loss}`;
          const r = await fixture(id, routeId);
          await positive(id, r);
          sql(
            loss === "false"
              ? `update private.people_preferences set opted_in=false where account_id=${quote(r.peer)};`
              : `delete from private.people_preferences where account_id=${quote(r.peer)};`,
          );
          await denied(id, r);
        }
    }
    // Compatibility is real delegation, both boolean ABI and no purpose bypass.
    const wrapper = await fixture("ABI.set_people_block", "CB");
    await changeBlock("ABI.set_people_block.true", wrapper, true, {
      name: "set_people_block",
    });
    await changeBlock("ABI.set_people_block.false", wrapper, false, {
      name: "set_people_block",
    });
    for (const [label, token, http] of [
      ["anon", null, 401],
      ["service", target.status.SERVICE_ROLE_KEY, 403],
    ]) {
      if (label === "service") assert.ok(token);
      await denyResponse(
        `ABI.set_people_block.${label}`,
        () => rpc("set_people_block", token, argsFor(wrapper)),
        {
          status: http,
          code: "42501",
          message: "permission denied for function set_people_block",
        },
      );
    }
    await denied("ABI.set_safety_block.null-boolean", wrapper, {
      p_blocked: null,
    });
    sql(
      "update private.pilot_capabilities set enabled=false where key='people';",
    );
    await denied(
      "ABI.set_people_block.no-bypass",
      wrapper,
      {},
      "set_people_block",
    );
    // Neutral targets and malformed business payloads are separate from parsing.
    for (const routeId of ["CH", "CP", "CB"])
      for (const variant of ["nonexistent", "self", "crosscampus"]) {
        const id = `L1.neutral.${routeId}.${variant}`;
        const r = await fixture(id, routeId);
        await positive(id, r);
        const targetId =
          variant === "nonexistent"
            ? caseIds(id).otherCampus
            : variant === "self"
              ? r.actor
              : r.target;
        if (variant === "crosscampus")
          sql(
            `update public.university_memberships set university_id=${quote(r.otherCampus)} where user_id=${quote(routeId === "CH" ? r.host : r.peer)};`,
          );
        await denied(
          id,
          r,
          routeId === "CB"
            ? { p_account_id: targetId }
            : {
                p_target_id: targetId,
                ...(variant === "self" ? { p_target_mode: "user" } : {}),
              },
        );
      }
    const shapes = [
      [
        "unicode-trim",
        {
          p_category: "\u00a0 HaRaSsMeNt \uFEFF",
          p_narrative: "\u00a0 narrative \uFEFF",
        },
        true,
      ],
      ["null", { p_narrative: null }, true],
      ["empty", { p_narrative: "   " }, true],
      ["default", {}, true],
      ["2000", { p_category: "other", p_narrative: "🦋".repeat(2000) }, true],
      ["2001", { p_category: "other", p_narrative: "x".repeat(2001) }, false],
      ["other-empty", { p_category: "other", p_narrative: "\u00a0" }, false],
      ["other-null", { p_category: "other", p_narrative: null }, false],
      ["category-unknown", { p_category: "unknown" }, false],
      ["category-null", { p_category: null }, false],
      ["mode-unknown", { p_target_mode: "unknown" }, false],
      ["request-null", { p_request_id: null }, false],
      ["target-null", { p_target_id: null }, false],
      ["mode-null", { p_target_mode: null }, false],
      ["nonretained-host", { p_target_mode: "hangout_host" }, false],
    ];
    for (const [label, body, permitted] of shapes) {
      const r = await fixture(`L1.shape.${label}`, "CH");
      if (permitted) {
        const saved = await allowedReport(`L1.shape.${label}`, r, body);
        if (["null", "empty", "default"].includes(label))
          await replay(`L1.shape.${label}.normalized-equivalent`, r, saved, {
            p_narrative: "\u00a0  \uFEFF",
            p_category: " HARASSMENT ",
          });
        if (label === "unicode-trim")
          await replay("L1.shape.unicode-trim.equivalent", r, saved, {
            p_category: "harassment",
            p_narrative: "narrative",
          });
      } else {
        await positive(`L1.shape.${label}`, r);
        await denied(`L1.shape.${label}`, r, body);
      }
    }
    // Four remaining category values are positive, with a fresh reporter each.
    for (const category of [
      "safety concern",
      "impersonation",
      "spam/commercial promotion",
      "other",
    ]) {
      const r = await fixture(`L1.category.${category}`, "CP");
      await allowedReport(`L1.category.${category}`, r, {
        p_category: category,
        p_narrative: category === "other" ? "Details" : null,
      });
    }
    for (const loss of [
      "shutdown",
      "absent-roster",
      "target-deleted",
      "fingerprint-mismatch",
      "safety-off",
      "safety-missing",
      "actor-suspended",
      "actor-banned",
    ]) {
      const r = await fixture(`L1.retry.${loss}`, "CH");
      const saved = await allowedReport(`L1.retry.${loss}.saved`, r);
      if (loss === "shutdown") shutdown(r);
      if (loss === "absent-roster")
        sql(
          `delete from private.pilot_account_admission where account_id in(${quote(r.actor)},${quote(r.host)});`,
        );
      if (loss === "target-deleted")
        sql(`delete from public.hangouts where id=${quote(r.source)};`);
      if (loss === "safety-off")
        sql("update private.safety_feature_gate set enabled=false;");
      if (loss === "safety-missing")
        sql("delete from private.safety_feature_gate;");
      if (loss.startsWith("actor-"))
        sql(
          `update public.accounts set status=${quote(loss.slice(6))} where id=${quote(r.actor)};`,
        );
      if (["shutdown", "absent-roster", "target-deleted"].includes(loss))
        await replay(`L1.retry.${loss}`, r, saved);
      else
        await denied(
          `L1.retry.${loss}`,
          r,
          loss === "fingerprint-mismatch"
            ? { p_narrative: "Changed fingerprint" }
            : {},
        );
      if (loss === "safety-missing")
        sql(
          "insert into private.safety_feature_gate(singleton,enabled) values(true,true);",
        );
    }
    const isolation = await fixture("L1.retry.caller-isolation", "CH");
    const saved = await allowedReport(
      "L1.retry.caller-isolation.saved",
      isolation,
    );
    beginCase(
      "L1.retry.caller-isolation",
      "separate-caller-receipt-provenance-full54",
      { status: 200, different_receipt_required: true },
    );
    const beforeCaller = census();
    const otherResponse = await rpc(
      isolation.rpc,
      isolation.users.peer.token,
      argsFor(isolation),
    );
    assert.equal(otherResponse.status, 200);
    assert.notEqual(otherResponse.body[0].receipt_id, saved.receipt_id);
    // Reuse full expected report logic with the independently authenticated peer.
    // An eligible second caller may submit; it never receives the first receipt.
    const peerRoute = {
      ...isolation,
      actor: isolation.peer,
      users: { ...isolation.users, actor: isolation.users.peer },
    };
    const peerReceipt = otherResponse.body[0];
    const fingerprint = sql(
      `select md5(jsonb_build_array('hangout',${quote(isolation.source)}::uuid,'harassment',null)::text)`,
    );
    const proofCaller = assertReportOutcome(peerRoute, {
      before: beforeCaller,
      after: census(),
      receipt: peerReceipt,
      expectedReport: {
        id: peerReceipt.receipt_id,
        submitted_at: peerReceipt.submitted_at,
        reporter_id: isolation.peer,
        target_type: "hangout",
        target_id: isolation.source,
        category: "harassment",
        narrative: null,
        provenance_kind: "current_hangout",
        provenance_ref_id: isolation.source,
      },
      expectedLedger: {
        reporter_id: isolation.peer,
        request_id: isolation.request,
        input_fingerprint: fingerprint,
        report_id: peerReceipt.receipt_id,
      },
    });
    emit("L1.retry.caller-isolation", {
      http: 200,
      distinct_receipt: true,
      ...proofCaller,
    });
    // Capacity only: preserve five reports and reject a sixth. No timestamp edits.
    const capacity = await fixture("HTTP.capacity-five-not-hour-edge", "CP");
    for (let n = 1; n <= 5; n++)
      await allowedReport(`HTTP.capacity.${n}`, capacity, {
        p_request_id: caseIds(`HTTP.capacity.${n}`).request,
      });
    await denied("HTTP.capacity.sixth-denied", capacity, {
      p_request_id: caseIds("HTTP.capacity.sixth").request,
    });
    for (const kind of [
      "owned_block",
      "friendship",
      "friend_request",
      "dm_generation",
      "hangout_host",
      "immutable_overlap",
      "positive_interval",
    ]) {
      const r = await fixture(`L1.retained.proof.${kind}`, "CP");
      const provenance = addProof(r, kind, `retained.${kind}`);
      shutdown(r);
      await allowedReport(`L1.retained.proof.${kind}`, r, {}, provenance);
    }
    const priorities = [
      "owned_block",
      "friendship",
      "friend_request",
      "dm_generation",
      "hangout_host",
      "immutable_overlap",
      "positive_interval",
    ];
    for (let index = 0; index < priorities.length; index++) {
      const r = await fixture(
        `L1.retained.priority.${priorities[index]}`,
        "CP",
      );
      let expectedPriority;
      for (const kind of priorities.slice(index)) {
        const proof = addProof(
          r,
          kind,
          `priority.${priorities[index]}.${kind}`,
        );
        if (!expectedPriority) expectedPriority = proof;
      }
      shutdown(r);
      await allowedReport(
        `L1.retained.priority.${priorities[index]}`,
        r,
        {},
        expectedPriority,
      );
    }
    for (const mode of ["hangout", "hangout_host"]) {
      const r = await fixture(`L1.retained.${mode}`, "CH");
      sql(
        `insert into public.hangout_participants(hangout_id,account_id,state,joined_at,left_at) values(${quote(r.source)},${quote(r.actor)},'left','2026-01-01T12:00:00Z','2026-01-01T12:10:00Z');`,
      );
      shutdown(r);
      const receipt = await allowedReport(
        `L1.retained.${mode}`,
        r,
        { p_target_mode: mode },
        {
          kind: mode === "hangout_host" ? "retained_host" : "retained_hangout",
          ref: r.source,
          target: mode === "hangout_host" ? r.host : r.source,
          type: mode === "hangout_host" ? "user" : "hangout",
        },
      );
      await replay(`L1.retained.${mode}.exact-original-input`, r, receipt, {
        p_target_mode: mode,
      });
      if (mode === "hangout_host")
        await denied("L1.retained.host.resolved-input-mismatch", r, {
          p_target_mode: "user",
          p_target_id: r.host,
        });
      const beforeLoss = census();
      sql("delete from private.safety_feature_gate;");
      await denied(`L1.retained.${mode}.missing-safety`, r, {
        p_request_id: caseIds(`retained.${mode}.fresh`).request,
        p_target_mode: mode,
      });
      sql(restoreRow("private.safety_feature_gate", beforeLoss, () => true));
    }
    for (const routeId of ["CH", "CP", "CB"]) {
      const r = await fixture(`HTTP.fresh-account-missing.${routeId}`, routeId);
      // Actor has no immutable report/audit/source FK. Account deletion naturally
      // removes dependent evidence; this is a fresh serial account-absence check.
      sql(`delete from public.accounts where id=${quote(r.actor)};`);
      await denied(`HTTP.fresh-account-missing.${routeId}`, r);
    }
    // Touching/nonoverlapping intervals supply no retained authority in shutdown.
    for (const gap of ["touching", "nonoverlapping"]) {
      const r = await fixture(`L1.retained.interval.${gap}`, "CP");
      makeSource(r);
      sql(`insert into public.hangout_participants(hangout_id,account_id,state,joined_at,left_at) values
        (${quote(r.source)},${quote(r.actor)},'left','2026-01-01T12:00:00Z','2026-01-01T12:10:00Z'),
        (${quote(r.source)},${quote(r.peer)},'left',${quote(gap === "touching" ? "2026-01-01T12:10:00Z" : "2026-01-01T12:11:00Z")},'2026-01-01T12:15:00Z');`);
      shutdown(r);
      await denied(`L1.retained.interval.${gap}`, r);
    }
    for (const loss of ["shutdown", "absent-roster"]) {
      const r = await fixture(`L1.retained.block.${loss}`, "CB");
      addProof(r, "friendship", `retained-block.${loss}`);
      if (loss === "shutdown") shutdown(r);
      else
        sql(
          `delete from private.pilot_account_admission where account_id in(${quote(r.actor)},${quote(r.peer)});`,
        );
      await changeBlock(`L1.retained.block.${loss}`, r, true, {
        teardown: (expected) => {
          const [low, high] = pair(r);
          expected["private.friendships"] = expected[
            "private.friendships"
          ].filter((f) => !(f.low_id === low && f.high_id === high));
        },
      });
      await changeBlock(`L1.retained.block.${loss}.repair`, r, true);
      await changeBlock(
        `L1.retained.block.${loss}.unblock-restores-nothing`,
        r,
        false,
      );
    }
    // State serial controls classify own outbound retained evidence honestly.
    for (const routeId of ["CH", "CP", "CB"])
      for (const direction of ["outbound", "inbound"]) {
        const r = await fixture(`HTTP.state.${routeId}.${direction}`, routeId);
        await positive(`HTTP.state.${routeId}.${direction}`, r);
        const peer = routeId === "CH" ? r.host : r.peer;
        // Direct trusted setup isolates direction without adding moderator/reader permission.
        sql(
          `insert into private.people_blocks(blocker_id,blocked_id) values(${quote(direction === "outbound" ? r.actor : peer)},${quote(direction === "outbound" ? peer : r.actor)});`,
        );
        if (routeId === "CH" || direction === "inbound")
          await denied(`HTTP.state.${routeId}.${direction}`, r);
        else if (routeId === "CP")
          await allowedReport(
            `HTTP.state.CP.outbound.retained`,
            r,
            {},
            { kind: "owned_block", ref: r.peer, target: r.peer, type: "user" },
          );
        else
          await changeBlock("HTTP.state.CB.outbound.retained-repair", r, true);
      }
    const cancelled = await fixture("HTTP.state.CH.cancelled", "CH");
    await positive("HTTP.state.CH.cancelled", cancelled);
    sql(
      `update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1 where id=${quote(cancelled.source)};`,
    );
    await denied("HTTP.state.CH.cancelled", cancelled);
    const disabled = await fixture("HTTP.state.CH.disabled", "CH");
    const disabledReceipt = await allowedReport(
      "HTTP.state.CH.disabled.positive",
      disabled,
      { p_request_id: caseIds("disabled.guard").request },
    );
    sql(
      `insert into private.hangout_disables(report_id,hangout_id,operator_id,request_id,subject_campus_id,reason) values(${quote(disabledReceipt.receipt_id)},${quote(disabled.source)},${quote(disabled.manager)},${quote(disabled.request)},${quote(campus)},'Synthetic source disable');`,
    );
    await denied("HTTP.state.CH.disabled", disabled);
    // Full retained teardown: actor-host removes target, third-party host leaves
    // actor; cancelled/disabled/unready-host parents stay safety-operable. Three
    // distinct parents plus exact cohost/friendship/DM/provenance outcome.
    const td = await fixture("L1.global-teardown", "CB");
    const parents = [
      caseIds("teardown.actor-host").source,
      caseIds("teardown.third-host").source,
      caseIds("teardown.disabled").source,
    ].sort();
    makeSource(td, parents[0], td.actor);
    makeSource(td, parents[1], td.host);
    makeSource(td, parents[2], td.host);
    sql(`begin;
      insert into public.hangout_participants(hangout_id,account_id,state) values
      (${quote(parents[0])},${quote(td.peer)},'joined'),
      (${quote(parents[1])},${quote(td.actor)},'joined'),(${quote(parents[1])},${quote(td.peer)},'joined'),
      (${quote(parents[2])},${quote(td.actor)},'joined'),(${quote(parents[2])},${quote(td.peer)},'joined');
      insert into private.hangout_cohosts(hangout_id,account_id) values(${quote(parents[0])},${quote(td.peer)}),(${quote(parents[1])},${quote(td.actor)});
      update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1 where id=${quote(parents[1])};commit;`);
    addProof(td, "friendship", "teardown.friendship");
    const [low, high] = pair(td);
    sql(
      `insert into private.dm_pairs(low_id,high_id,initiator_id,campus_id,generation_id,state) values(${quote(low)},${quote(high)},${quote(td.actor)},${quote(campus)},${quote(caseIds("teardown.dm").source)},'accepted');`,
    );
    // Retained Hangout report supplies a genuine report reference for synthetic
    // one-way disable preparation; no moderator permission control is claimed.
    const tr = {
      ...td,
      id: "CH",
      rpc: "submit_safety_report",
      mode: "hangout",
      source: parents[2],
      target: parents[2],
    };
    const tReceipt = await allowedReport(
      "L1.teardown.disable-report",
      tr,
      {},
      {
        kind: "retained_hangout",
        ref: parents[2],
        target: parents[2],
        type: "hangout",
      },
    );
    sql(
      `insert into private.hangout_disables(report_id,hangout_id,operator_id,request_id,subject_campus_id,reason) values(${quote(tReceipt.receipt_id)},${quote(parents[2])},${quote(td.manager)},${quote(caseIds("teardown.disable").request)},${quote(campus)},'Synthetic disable');update public.profiles set bio=null where user_id=${quote(td.host)};`,
    );
    shutdown(td);
    const lowerClock = Date.parse(sql("select clock_timestamp()"));
    await changeBlock("L1.global_teardown.serial-full-values", td, true, {
      teardown: (expected, actual) => {
        const upperClock = Date.parse(sql("select clock_timestamp()"));
        for (const parent of parents) {
          const ownerIsActor = parent === parents[0];
          const changed = ownerIsActor ? td.peer : td.actor;
          const row = expected["public.hangout_participants"].find(
            (p) => p.hangout_id === parent && p.account_id === changed,
          );
          const observed = actual["public.hangout_participants"].find(
            (p) => p.hangout_id === parent && p.account_id === changed,
          );
          const stamp = ownerIsActor ? "removed_at" : "left_at";
          for (const key of [stamp, "updated_at"])
            assert.ok(
              Date.parse(observed[key]) >= lowerClock &&
                Date.parse(observed[key]) <= upperClock,
              "server transition time bounded by DB clocks",
            );
          row.state = ownerIsActor ? "removed" : "left";
          row[stamp] = observed[stamp];
          row.updated_at = observed.updated_at;
          expected["private.hangout_cohosts"] = expected[
            "private.hangout_cohosts"
          ].filter(
            (c) => !(c.hangout_id === parent && c.account_id === changed),
          );
          const members = expected["public.hangout_participants"]
            .filter((p) => p.hangout_id === parent)
            .map((p) => p.account_id);
          for (const a of [td.actor, td.peer])
            for (const b of members.filter((m) => m !== a)) {
              const [l, h] = [a, b].sort();
              if (
                !expected["private.hangout_peer_provenance"].some(
                  (p) =>
                    p.hangout_id === parent &&
                    p.low_id === l &&
                    p.high_id === h,
                )
              )
                expected["private.hangout_peer_provenance"].push({
                  hangout_id: parent,
                  low_id: l,
                  high_id: h,
                });
            }
        }
        expected["private.friendships"] = expected[
          "private.friendships"
        ].filter((f) => !(f.low_id === low && f.high_id === high));
        for (const dm of expected["private.dm_pairs"])
          if (
            dm.low_id === low &&
            dm.high_id === high &&
            ["pending", "accepted"].includes(dm.state)
          )
            dm.state = "blocked";
      },
    });
    await changeBlock("L1.global_teardown.unblock-restores-nothing", td, false);
    failureContext.caseId = "HTTP.planned-completion-totals";
    failureContext.phase = "exact-total-assertions";
    assert.equal(
      evidence.length,
      plannedTotals.verifiedHttpOutcomes,
      "exact planned HTTP outcome total; no silent skipped cells",
    );
    assert.equal(
      fixtureIds.size,
      plannedTotals.uniqueFixtureKeys,
      "exact fresh fixture total",
    );
    assert.equal(
      schedule.settled,
      plannedTotals.realAuthSignups,
      "exact genuine signup total",
    );
    schedule.check();
    completed = true;
  } catch (error) {
    // Capture the original case and available full54 evidence BEFORE any reset.
    // Preserve its phase even if collecting one more census itself fails.
    // Frozen helper internal SQL failures expose no child-exit contract. Fail
    // conservatively; do not infer settlement from a redacted Error string.
    if (error?.name === "Error") failureContext.transportUnproven = true;
    const originalContext = {
      ...failureContext,
      snapshots: failureContext.snapshots.slice(),
    };
    let failureCensus = null;
    let censusError = null;
    if (
      failureContext.targetEstablished &&
      !failureContext.transportUnproven &&
      !failureContext.httpInFlight
    ) {
      try {
        failureCensus = census();
      } catch (errorDuringCensus) {
        censusError = errorDuringCensus;
      }
    }
    originalContext.transportUnproven = failureContext.transportUnproven;
    originalFailure = failureRecord(
      error,
      originalContext,
      failureCensus,
      censusError,
    );
    console.error(JSON.stringify(originalFailure));
    // Await original diagnostics before finally can reset. Channel failure stays
    // separate and cannot replace the original error or prove target settlement.
    await publishFailure(error, originalContext, failureCensus);
  } finally {
    if (
      !failureContext.targetEstablished ||
      failureContext.transportUnproven ||
      failureContext.httpInFlight
    ) {
      cleanup = {
        id: "HTTP.cleanup-not-attempted",
        case_id: failureContext.caseId,
        reason:
          "Target ownership or transport/child exit/transaction settlement unproven; reset forbidden",
        guarded_full27_reset: false,
        zero54: false,
        task_incomplete: true,
        concurrency_credit: 0,
      };
      console.error(JSON.stringify(cleanup));
      await publishFailure(null, failureContext, null, [
        !failureContext.targetEstablished
          ? "not-attempted-target-unestablished"
          : "not-attempted-settlement-unproven",
      ]);
    } else {
      // Never delete/retime immutable evidence. Cleanup errors are a separate
      // record, never a replacement for the original failing case/census.
      try {
        beginCase("HTTP.cleanup", "guarded-full27-reset-and-zero54");
        resetDisposable("current27");
        assertClean();
        cleanup = {
          id: "HTTP.cleanup",
          guarded_full27_reset: true,
          zero54: true,
          defaults_revision1: true,
          completed,
          concurrency_credit: 0,
        };
        console.log(JSON.stringify(cleanup));
      } catch (cleanupError) {
        cleanup = {
          id: "HTTP.cleanup-failure",
          case_id: "HTTP.cleanup",
          phase: failureContext.phase,
          error: failureRecord(cleanupError),
          guarded_full27_reset: false,
          zero54: false,
          credited_outcomes: 0,
          concurrency_credit: 0,
          task_incomplete: true,
        };
        console.error(JSON.stringify(cleanup));
        await publishFailure(cleanupError, failureContext, null, [
          failureContext.phase.endsWith(":full54-census")
            ? "census-failed"
            : "reset-failed",
        ]);
      }
    }
  }
  if (originalFailure || cleanup?.task_incomplete)
    throw evidenceError(originalFailure, cleanup);
  console.log(
    JSON.stringify({
      id: "HTTP.completed",
      completed_outcomes: evidence.length,
      unique_fixture_keys: fixtureIds.size,
      concurrency_credit: 0,
      allocation,
      unclaimed: [
        "all L2/L3/L5 lock orders",
        "stronger SQL isolation",
        "operator permissions",
        "raw owner Storage crossings",
        "one-hour inclusive/older-excluded edges",
        "clock-after-wait",
        "original-tuple replacement waits",
        "normal service/VM stop and independent ownership cleanup audit",
      ],
    }),
  );
  return { completed_outcomes: evidence.length, concurrency_credit: 0 };
}

// The reviewed independent helper runner supplies the fixed outer 24h deadline.
// HTTP adoption/combined review and exclusive ownership/release are still absent.
// This local entrypoint never spawns a child or supplies cleanup proof.
export async function runBoundedChild() {
  throw new Error(executionBlocker);
}

const direct =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  try {
    if (process.argv[2] === "--serial-worker") await runSerialHttp();
    else {
      assert.equal(process.argv.length, 2, "no unknown execution flags");
      await runBoundedChild();
    }
  } catch (error) {
    // Structured original evidence survives cleanup errors; never print raw
    // Auth/provider bodies, assertion messages/stacks or credential-bearing rows.
    console.error(
      JSON.stringify({
        id: "HTTP.direct-failure",
        ...(error.safeEvidence ?? {
          original_failure: failureRecord(error),
          cleanup: {
            attempted: false,
            reason: "Execution refused before target contact",
          },
        }),
        credited_outcomes: 0,
        concurrency_credit: 0,
        task_incomplete: true,
      }),
    );
    process.exitCode = 1;
  }
}
