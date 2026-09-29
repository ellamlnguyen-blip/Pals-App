import {
  censusTables,
  census,
  capabilityKeys,
} from "./pilot-current-safety-fixtures.mjs";
import { createHash } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  lstatSync,
  realpathSync,
  createWriteStream,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";

export const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
export const dockerBinary = "/private/tmp/pals-runtime/docker/docker";
export const supabaseBinary = "/private/tmp/pals-runtime/bin/supabase";
export const socket =
  "unix:///private/tmp/pals-lima/pals-task002/sock/docker.sock";
const root = fileURLToPath(new URL("../../../", import.meta.url));
// PRIVATE TRANSPORT START: offline verifier isolates this unit; no public injection.
const transportBudgets = Object.freeze({
  metadata: 10_000,
  sql: 30_000,
  reset: 180_000,
  session: 90_000,
  write: 2_000,
  close: 10_000,
  exit: 5_000,
  module: 30 * 60_000,
  httpModule: 24 * 60 * 60_000,
});
const httpModule = "pilot-admission-current-safety-http.integration.mjs";
const moduleBudget = (name) =>
  name === httpModule ? transportBudgets.httpModule : transportBudgets.module;
const transportLimit = 20 * 1024 * 1024;
function nodeStartupGuard(environment) {
  for (const key of ["NODE_OPTIONS", "NODE_PATH"])
    if (Object.hasOwn(environment, key))
      throw new Error("Node startup override forbidden; module uncredited");
}
function command(binary, argv, options, budget) {
  // Node synchronously waits for the directly spawned child's exit after SIGKILL.
  // This does not establish Docker-exec/server/descendant cleanup. OS-level
  // uninterruptible exit is not a finite guarantee of execFileSync; the separate
  // runner supplies the module process deadline and reports interruption honestly.
  return execFileSync(binary, argv, {
    ...options,
    timeout: budget,
    killSignal: "SIGKILL",
    maxBuffer: transportLimit,
  });
}
function ownedSession(binary, argv, initialInput) {
  const child = spawn(binary, argv, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "",
    failure = null,
    exited = false,
    closing = null;
  const timers = new Set();
  const clear = (timer) => {
    clearTimeout(timer);
    timers.delete(timer);
  };
  const timer = (ms, callback) => {
    const handle = setTimeout(() => {
      timers.delete(handle);
      callback();
    }, ms);
    timers.add(handle);
    return handle;
  };
  let resolveDone, rejectDone;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  done.catch(() => {});
  let resolveExit;
  const observedExit = new Promise((resolve) => {
    resolveExit = resolve;
  });
  function stop(reason) {
    failure ??= new Error(reason);
    if (exited) return;
    child.stdin.destroy();
    // Only this exact ChildProcess handle, never a PID lookup or process group.
    if (child.pid !== undefined) child.kill("SIGKILL");
    timer(transportBudgets.exit, () => {
      if (!exited)
        rejectDone(
          new Error("Owned SQL process exit unobserved; cleanup incomplete"),
        );
    });
  }
  child.once("error", () => {
    failure ??= new Error(
      "Owned SQL process spawn/transport failed; cleanup incomplete",
    );
    stop(failure.message);
  });
  child.once("close", (code, signal) => {
    exited = true;
    for (const handle of timers) clearTimeout(handle);
    timers.clear();
    if (signal !== null || !Number.isInteger(code))
      failure ??= new Error(
        "Owned SQL process interrupted; cleanup incomplete",
      );
    resolveExit([code, signal]);
    if (failure) rejectDone(failure);
    else resolveDone([code, signal]);
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (value) => {
      if (Buffer.byteLength(output) + value.length > transportLimit)
        stop("Owned SQL output limit exceeded; cleanup incomplete");
      else output += value;
    });
    stream.on("error", () =>
      stop("Owned SQL output failed; cleanup incomplete"),
    );
  }
  child.stdin.on("error", () =>
    stop("Owned SQL input failed; cleanup incomplete"),
  );
  function write(input) {
    if (failure || exited || child.stdin.destroyed || child.stdin.writableEnded)
      throw new Error("Owned SQL input unavailable; cleanup incomplete");
    if (
      Buffer.byteLength(input) > transportLimit ||
      child.stdin.writableLength > transportLimit
    )
      throw new Error("Owned SQL input limit exceeded; cleanup incomplete");
    const flushed = timer(transportBudgets.write, () =>
      stop("Owned SQL input timed out; cleanup incomplete"),
    );
    return child.stdin.write(input, (error) => {
      clear(flushed);
      if (error) stop("Owned SQL input failed; cleanup incomplete");
    });
  }
  // Construction includes an asynchronous bounded spawn+initial-input receipt.
  const startup = timer(transportBudgets.exit, () =>
    stop("Owned SQL startup timed out; cleanup incomplete"),
  );
  child.once("spawn", () => clear(startup));
  timer(transportBudgets.session, () =>
    stop("Owned SQL lifetime timed out; cleanup incomplete"),
  );
  try {
    write(initialInput);
  } catch {
    stop("Owned SQL startup input failed; cleanup incomplete");
  }
  return {
    child,
    send: write,
    output: () => redact(output),
    done,
    close: () => {
      if (closing) return closing;
      closing = (async () => {
        if (!exited && !child.stdin.destroyed && !child.stdin.writableEnded)
          child.stdin.end("rollback;\n");
        let deadline;
        const clean = await Promise.race([
          observedExit.then(() => true),
          new Promise((resolve) => {
            deadline = timer(transportBudgets.close, () => resolve(false));
          }),
        ]);
        clear(deadline);
        if (!clean) {
          stop("Owned SQL close timed out; cleanup incomplete");
          let exitDeadline;
          const observed = await Promise.race([
            observedExit.then(() => true),
            new Promise((resolve) => {
              exitDeadline = timer(transportBudgets.exit, () => resolve(false));
            }),
          ]);
          clear(exitDeadline);
          if (!observed)
            throw new Error(
              "Owned SQL process exit unobserved; cleanup incomplete",
            );
        }
        if (failure) throw failure;
      })();
      closing.catch(() => {});
      return closing;
    },
  };
}
// Fixed wire allocation mirrors the reviewed HTTP fixture's literal case allocation.
// No source evaluation, module import, caller-selected ID or path is accepted.
const httpFixtureKeys = new Set();
const httpOutcomeIds = new Set();
const httpRoutes = ["CH", "CP", "CB"];
const identityLosses = [
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
  "roster_revoked",
  "roster_missing",
];
const fixtureId = (id) => httpFixtureKeys.add(id);
const outcomeId = (id) => httpOutcomeIds.add(id);
const positiveIds = (id, route) => {
  outcomeId(`${id}.positive`);
  if (route === "CB") outcomeId(`${id}.positive-unblock`);
};
for (const route of httpRoutes) {
  fixtureId(`ABI.${route}`);
  positiveIds(`ABI.${route}`, route);
  for (const suffix of [
    "anon",
    "service",
    "invalid-signature",
    "forged-actor",
    "unknown-overload",
    "typed-uuid",
    "metadata-platform-no-admission",
    "table.safety_reports",
    "table.safety_report_requests",
    "table.people_blocks",
    "table.pilot_account_admission",
    "helper.pilot_lock_current_safety",
    "helper.pilot_require_current_safety",
  ])
    outcomeId(`ABI.${route}.${suffix}`);
  fixtureId(`ABI.${route}.metadata-no-admission`);
  fixtureId(`L1.actual-purpose.${route}`);
  if (route !== "CH") {
    positiveIds(`L1.people_onboarding_hangouts_off_allowed.${route}`, route);
    for (const pref of ["absent", "false"]) {
      const id = `L1.actor-preference.${route}.${pref}`;
      fixtureId(id);
      positiveIds(id, route);
    }
  }
  for (const kind of ["availability", "purpose", "source_gate", "safety_gate"])
    for (const loss of ["off", "missing"]) {
      const id = `HTTP.serial.${route}.${kind}.${loss}`;
      fixtureId(id);
      outcomeId(id);
      positiveIds(id, route);
    }
  for (const subject of route === "CH"
    ? ["actor", "immutable_host"]
    : ["actor", "peer"])
    for (const loss of identityLosses) {
      const id = `HTTP.serial.${route}.${subject}.${loss}`;
      fixtureId(id);
      outcomeId(id);
      positiveIds(id, route);
    }
  if (route !== "CH")
    for (const loss of ["false", "missing"]) {
      const id = `HTTP.serial.${route}.peer-preference.${loss}`;
      fixtureId(id);
      outcomeId(id);
      positiveIds(id, route);
    }
  for (const variant of ["nonexistent", "self", "crosscampus"]) {
    const id = `L1.neutral.${route}.${variant}`;
    fixtureId(id);
    outcomeId(id);
    positiveIds(id, route);
  }
  fixtureId(`HTTP.fresh-account-missing.${route}`);
  outcomeId(`HTTP.fresh-account-missing.${route}`);
  for (const direction of ["outbound", "inbound"]) {
    const id = `HTTP.state.${route}.${direction}`;
    fixtureId(id);
    positiveIds(id, route);
    if (route === "CH" || direction === "inbound") outcomeId(id);
  }
}
fixtureId("ABI.set_people_block");
for (const id of [
  "ABI.set_people_block.true",
  "ABI.set_people_block.false",
  "ABI.set_people_block.anon",
  "ABI.set_people_block.service",
  "ABI.set_people_block.no-bypass",
  "ABI.set_safety_block.null-boolean",
  "L1.hangout_onboarding_people_chat_off_allowed",
  "HTTP.state.CP.outbound.retained",
  "HTTP.state.CB.outbound.retained-repair",
  "L1.global_teardown.serial-full-values",
  "L1.global_teardown.unblock-restores-nothing",
  "L1.teardown.disable-report",
])
  outcomeId(id);
for (const label of [
  "unicode-trim",
  "null",
  "empty",
  "default",
  "2000",
  "2001",
  "other-empty",
  "other-null",
  "category-unknown",
  "category-null",
  "mode-unknown",
  "request-null",
  "target-null",
  "mode-null",
  "nonretained-host",
]) {
  const id = `L1.shape.${label}`;
  fixtureId(id);
  outcomeId(id);
  if (!["unicode-trim", "null", "empty", "default", "2000"].includes(label))
    positiveIds(id, "CH");
}
for (const label of ["null", "empty", "default"])
  outcomeId(`L1.shape.${label}.normalized-equivalent`);
outcomeId("L1.shape.unicode-trim.equivalent");
for (const category of [
  "safety concern",
  "impersonation",
  "spam/commercial promotion",
  "other",
]) {
  fixtureId(`L1.category.${category}`);
  outcomeId(`L1.category.${category}`);
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
  fixtureId(`L1.retry.${loss}`);
  outcomeId(`L1.retry.${loss}`);
  outcomeId(`L1.retry.${loss}.saved`);
}
fixtureId("L1.retry.caller-isolation");
outcomeId("L1.retry.caller-isolation");
outcomeId("L1.retry.caller-isolation.saved");
fixtureId("HTTP.capacity-five-not-hour-edge");
for (const n of [1, 2, 3, 4, 5]) outcomeId(`HTTP.capacity.${n}`);
outcomeId("HTTP.capacity.sixth-denied");
for (const kind of [
  "owned_block",
  "friendship",
  "friend_request",
  "dm_generation",
  "hangout_host",
  "immutable_overlap",
  "positive_interval",
])
  for (const group of ["proof", "priority"]) {
    const id = `L1.retained.${group}.${kind}`;
    fixtureId(id);
    outcomeId(id);
  }
for (const mode of ["hangout", "hangout_host"]) {
  const id = `L1.retained.${mode}`;
  fixtureId(id);
  outcomeId(id);
  outcomeId(`${id}.exact-original-input`);
  outcomeId(`${id}.missing-safety`);
}
outcomeId("L1.retained.host.resolved-input-mismatch");
for (const gap of ["touching", "nonoverlapping"]) {
  fixtureId(`L1.retained.interval.${gap}`);
  outcomeId(`L1.retained.interval.${gap}`);
}
for (const loss of ["shutdown", "absent-roster"]) {
  const id = `L1.retained.block.${loss}`;
  fixtureId(id);
  outcomeId(id);
  outcomeId(`${id}.repair`);
  outcomeId(`${id}.unblock-restores-nothing`);
}
for (const state of ["cancelled", "disabled"]) {
  const id = `HTTP.state.CH.${state}`;
  fixtureId(id);
  outcomeId(id);
  outcomeId(`${id}.positive`);
}
fixtureId("L1.global-teardown");
const httpFailureIds = new Set([
  ...httpFixtureKeys,
  ...httpOutcomeIds,
  "HTTP.execution-gate",
  "HTTP.cleanup",
  "HTTP.planned-completion-totals",
]);
for (const key of httpFixtureKeys)
  for (const slot of ["actor", "host", "peer", "manager"])
    httpFailureIds.add(`${key}.Auth.${slot}`);
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
// Paths identify known fields only; values never contain identity or user content.
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
const failureWireLimits = Object.freeze({
  frame: 64 * 1024,
  records: 4,
  total: 256 * 1024,
  differences: 128,
  count: 1_000_000,
});
function exactFields(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join("|") !== keys.slice().sort().join("|")
  )
    throw new Error("Failure evidence schema invalid");
}
function denseArray(value) {
  return (
    Array.isArray(value) &&
    Object.keys(value).length === value.length &&
    Object.keys(value).every((key, index) => key === String(index))
  );
}
function member(value, allowed) {
  if (!allowed.includes(value))
    throw new Error("Failure evidence value invalid");
}
function validateHttpFailureRecord(record) {
  exactFields(record, [
    "version",
    "case_id",
    "phase",
    "operation",
    "observed",
    "expected",
    "census",
    "availability",
    "differences",
    "cleanup_errors",
  ]);
  if (record.version !== 1 || !httpFailureIds.has(record.case_id))
    throw new Error("Failure evidence allocation invalid");
  member(record.phase, httpFailurePhases);
  member(record.operation, httpFailureOperations);
  for (const http of [record.observed, record.expected]) {
    exactFields(http, ["status", "code", "message", "shape"]);
    if (
      http.status !== null &&
      (!Number.isInteger(http.status) || http.status < 100 || http.status > 599)
    )
      throw new Error("Failure evidence status invalid");
    member(http.code, httpFailureCodes);
    member(http.message, httpFailureMessages);
    member(http.shape, [
      "unavailable",
      "null",
      "boolean",
      "number",
      "string",
      "array",
      "object",
      "unknown-shape",
    ]);
  }
  exactFields(record.census, ["before", "after", "expected"]);
  exactFields(record.availability, ["before", "after", "expected"]);
  for (const key of ["before", "after", "expected"]) {
    member(record.availability[key], ["available", "unavailable"]);
    const counts = record.census[key];
    if (
      !denseArray(counts) ||
      counts.length !== censusTables.length ||
      !counts.every((value) =>
        record.availability[key] === "unavailable"
          ? value === null
          : Number.isInteger(value) &&
            value >= 0 &&
            value <= failureWireLimits.count,
      )
    )
      throw new Error("Failure evidence census invalid");
  }
  if (
    !denseArray(record.differences) ||
    record.differences.length > failureWireLimits.differences
  )
    throw new Error("Failure evidence differences invalid");
  for (const difference of record.differences) {
    exactFields(difference, [
      "scope",
      "table",
      "field",
      "row",
      "kind",
      "expected",
      "observed",
    ]);
    member(difference.scope, ["http", "result", "census"]);
    if (
      difference.scope === "census"
        ? !censusTables.includes(difference.table)
        : difference.table !== null
    )
      throw new Error("Failure evidence table invalid");
    member(difference.field, httpFailureFields);
    if (
      difference.row !== null &&
      (!Number.isInteger(difference.row) ||
        difference.row < 0 ||
        difference.row > failureWireLimits.count)
    )
      throw new Error("Failure evidence row invalid");
    member(difference.kind, [
      "missing",
      "unexpected",
      "type",
      "value",
      "count",
      "unknown-code",
      "unknown-shape",
      "unavailable",
    ]);
    member(difference.expected, httpFailureValues);
    member(difference.observed, httpFailureValues);
  }
  if (!denseArray(record.cleanup_errors) || record.cleanup_errors.length > 4)
    throw new Error("Failure evidence cleanup invalid");
  for (const error of record.cleanup_errors)
    member(error, [
      "not-attempted-target-unestablished",
      "not-attempted-settlement-unproven",
      "guard-failed",
      "reset-failed",
      "census-failed",
      "owned-exit-unobserved",
      "transport-interrupted",
      "deadline",
    ]);
  return record;
}
function failureReceiver() {
  let pending = Buffer.alloc(0),
    total = 0,
    ended = false,
    reason = null;
  const records = [];
  const invalidate = (value) => {
    reason ??= value;
    pending = Buffer.alloc(0);
    records.length = 0;
  };
  return {
    receive(value) {
      if (reason) return;
      total += value.length;
      if (total > failureWireLimits.total) {
        invalidate("overflow");
        return;
      }
      pending = Buffer.concat([pending, value]);
      while (pending.length >= 4) {
        const size = pending.readUInt32BE(0);
        if (size === 0) {
          invalidate("writer-unavailable");
          return;
        }
        if (
          size > failureWireLimits.frame ||
          records.length >= failureWireLimits.records
        ) {
          invalidate("overflow");
          return;
        }
        if (pending.length < size + 4) return;
        const payload = pending.subarray(4, size + 4);
        pending = pending.subarray(size + 4);
        try {
          const encoded = payload.toString("utf8"),
            record = JSON.parse(encoded);
          if (
            !Buffer.from(encoded).equals(payload) ||
            JSON.stringify(record) !== encoded
          )
            throw new Error("Noncanonical frame");
          records.push(validateHttpFailureRecord(record));
        } catch {
          invalidate("invalid-record");
          return;
        }
      }
    },
    end() {
      ended = true;
      if (pending.length) invalidate("truncated");
    },
    error() {
      invalidate("transport-error");
    },
    invalid() {
      return reason !== null;
    },
    hasRecords() {
      return records.length > 0;
    },
    evidence() {
      return reason || !ended || !records.length
        ? {
            availability: "unavailable",
            reason: reason ?? (!ended ? "eof-unobserved" : "absent"),
            records: [],
          }
        : { availability: "available", reason: null, records: records.slice() };
    },
  };
}
let failureWriter = null,
  failureWrites = 0,
  failureBytes = 0,
  failureWriterInvalid = false,
  failureWritePending = false;
async function sendFailureFrame(frame) {
  await new Promise((resolve, reject) => {
    let timer,
      settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        failureWriterInvalid = true;
        failureWriter?.destroy();
        reject(new Error("HTTP failure evidence unavailable"));
      } else resolve();
    };
    try {
      if (!failureWriter) {
        failureWriter = createWriteStream(null, { fd: 3, autoClose: false });
        failureWriter.on("error", () => {
          failureWriterInvalid = true;
        });
      }
      failureWriter.once("error", finish);
      timer = setTimeout(
        () => finish(new Error("Failure evidence write deadline")),
        transportBudgets.write,
      );
      failureWriter.write(frame, (error) => {
        failureWriter.removeListener("error", finish);
        finish(error);
      });
    } catch {
      finish(new Error("Failure evidence write failed"));
    }
  });
}
async function unavailableFailureWriter() {
  failureWriterInvalid = true;
  // Fixed zero-length sentinel invalidates earlier records without sending the
  // rejected payload. If the pipe itself fails, the receiver reports no EOF.
  try {
    await sendFailureFrame(Buffer.alloc(4));
  } catch {
    /* unavailable */
  }
  throw new Error("HTTP failure evidence unavailable");
}
async function writeFailureRecord(record) {
  if (failureWriterInvalid || failureWritePending)
    return unavailableFailureWriter();
  // Canonical serialization is validated again so getters/custom serialization
  // cannot inject a field or payload after the first validation.
  let payload;
  try {
    validateHttpFailureRecord(record);
    payload = Buffer.from(JSON.stringify(record));
    validateHttpFailureRecord(JSON.parse(payload.toString("utf8")));
    if (
      payload.length > failureWireLimits.frame ||
      failureWrites >= failureWireLimits.records ||
      failureBytes + payload.length + 4 > failureWireLimits.total
    )
      throw new Error("Failure evidence overflow");
  } catch {
    return unavailableFailureWriter();
  }
  const frame = Buffer.alloc(payload.length + 4);
  frame.writeUInt32BE(payload.length);
  payload.copy(frame, 4);
  failureWrites++;
  failureBytes += frame.length;
  failureWritePending = true;
  try {
    await sendFailureFrame(frame);
  } finally {
    failureWritePending = false;
  }
}
async function runOwnedProcess(
  binary,
  argv,
  options,
  budget,
  httpEvidence = false,
) {
  nodeStartupGuard(options.env ?? process.env);
  const child = spawn(binary, argv, {
    ...options,
    stdio: httpEvidence
      ? ["ignore", "pipe", "pipe", "pipe"]
      : ["ignore", "pipe", "pipe"],
  });
  let output = "",
    failure = null,
    exited = false,
    timer,
    exitTimer;
  const receiver = httpEvidence ? failureReceiver() : null;
  return new Promise((resolve, reject) => {
    const fail = (error) => {
      if (receiver) error.httpFailureEvidence = receiver.evidence();
      reject(error);
    };
    const stop = (reason) => {
      failure ??= new Error(reason);
      if (exited) return;
      if (child.pid !== undefined) child.kill("SIGKILL");
      exitTimer ??= setTimeout(() => {
        fail(new Error("Owned module exit unobserved; cleanup incomplete"));
      }, transportBudgets.exit);
    };
    child.once("error", () =>
      stop("Owned module spawn failed; cleanup incomplete"),
    );
    child.once("close", (code, signal) => {
      exited = true;
      clearTimeout(timer);
      clearTimeout(exitTimer);
      if (failure) fail(failure);
      else if (
        code !== 0 ||
        signal !== null ||
        receiver?.hasRecords() ||
        receiver?.invalid()
      )
        fail(
          new Error("Owned module failed; output withheld; cleanup unverified"),
        );
      else resolve(redact(output));
    });
    for (const stream of [child.stdout, child.stderr]) {
      stream.on("data", (value) => {
        if (Buffer.byteLength(output) + value.length > transportLimit)
          stop("Owned module output exceeded limit; cleanup incomplete");
        else output += value;
      });
      stream.on("error", () =>
        stop("Owned module output failed; cleanup incomplete"),
      );
    }
    if (receiver) {
      const channel = child.stdio[3];
      channel.on("data", (value) => {
        receiver.receive(value);
        if (receiver.invalid())
          stop("Owned module failure evidence invalid; cleanup incomplete");
      });
      channel.once("end", () => receiver.end());
      channel.once("error", () => {
        receiver.error();
        stop(
          "Owned module failure evidence transport failed; cleanup incomplete",
        );
      });
    }
    timer = setTimeout(
      () =>
        stop("Owned module deadline interrupted execution; cleanup incomplete"),
      budget,
    );
  });
}
// PRIVATE LEGACY HTTP START: no injection/options for origin, budgets or fetch.
const ownedHttpBudgets = Object.freeze({ request: 30_000, observe: 5_000 });
function guardedHttpUrl(input, signed = false) {
  const origin = "http://127.0.0.1:54321";
  const value = input instanceof URL ? input.href : input;
  if (typeof value !== "string" || /[\s\\\u0000-\u001f\u007f]/.test(value))
    throw new Error("Fixed loopback path unavailable");
  if (!signed && (!value.startsWith("/") || value.startsWith("//")))
    throw new Error("Fixed loopback path unavailable");
  if (signed && !value.startsWith(`${origin}/`))
    throw new Error("Fixed signed loopback URL unavailable");
  const path = value.split("?")[0];
  if (/(?:^|\/)\.{1,2}(?:\/|$)|%(?:2e|2f|5c)/i.test(path))
    throw new Error("Fixed loopback path unavailable");
  let url;
  try {
    url = new URL(value, origin);
  } catch {
    throw new Error("Fixed loopback path unavailable");
  }
  if (url.origin !== origin || url.username || url.password || url.hash)
    throw new Error("Fixed loopback path unavailable");
  if (
    signed &&
    (!/^\/storage\/v1\/object\/sign\/profile-photos\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.png$/.test(
      url.pathname,
    ) ||
      [...url.searchParams.keys()].join("|") !== "token" ||
      !url.searchParams.get("token"))
  )
    throw new Error("Fixed signed loopback URL unavailable");
  return url;
}
function ownedHttpTransport() {
  const records = new Set();
  // Observe the original promise itself; a timer only bounds observation, never settles it.
  function track(record, promise) {
    const item = { settled: false, rejected: false };
    record.promises.add(item);
    item.promise = Promise.resolve(promise).then(
      (value) => {
        item.settled = true;
        return value;
      },
      (error) => {
        item.settled = true;
        item.rejected = true;
        throw error;
      },
    );
    item.promise.catch(() => {});
    return item.promise;
  }
  async function consume(url, init, signal, json) {
    if (signal !== undefined && !(signal instanceof AbortSignal))
      throw new Error("Guarded loopback API transport/JSON failure");
    const controller = new AbortController();
    const record = {
      promises: new Set(),
      failed: false,
      uncertain: false,
      complete: false,
    };
    records.add(record);
    let reader,
      bodyStream,
      cancelled = false,
      deadline,
      observation,
      resolveResult,
      rejectResult,
      returned = false;
    const result = new Promise((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    const fail = () => {
      record.failed = true;
      if (!returned) {
        returned = true;
        rejectResult(new Error("Guarded loopback API transport/JSON failure"));
      }
    };
    const cancel = () => {
      if ((reader || bodyStream) && !cancelled) {
        cancelled = true;
        try {
          track(record, reader ? reader.cancel() : bodyStream.cancel()).catch(
            () => {
              record.failed = true;
            },
          );
        } catch {
          record.failed = true;
        }
      }
    };
    const abort = () => {
      controller.abort();
      cancel();
      observation ??= setTimeout(() => {
        if (
          !record.complete ||
          [...record.promises].some((item) => !item.settled)
        )
          record.uncertain = true;
        fail();
      }, ownedHttpBudgets.observe);
    };
    if (signal?.aborted) {
      record.complete = true;
      fail(); // No fetch, body or cancel was started.
      return result;
    }
    signal?.addEventListener("abort", abort, { once: true });
    deadline = setTimeout(abort, ownedHttpBudgets.request);
    const operation = (async () => {
      try {
        if (controller.signal.aborted) throw new Error("unavailable");
        const response = await track(
          record,
          fetch(url, { ...init, signal: controller.signal, redirect: "error" }),
        );
        bodyStream = response.body;
        if (bodyStream) reader = bodyStream.getReader();
        if (
          response.redirected ||
          (response.url && new URL(response.url).href !== url.href)
        )
          throw new Error("unavailable");
        let length = 0;
        const chunks = [];
        if (response.body) {
          if (controller.signal.aborted) {
            cancel();
            throw new Error("unavailable");
          }
          await track(
            record,
            (async () => {
              for (;;) {
                const next = await reader.read();
                if (controller.signal.aborted) throw new Error("unavailable");
                if (next.done) break;
                if (
                  !(next.value instanceof Uint8Array) ||
                  length + next.value.byteLength > transportLimit
                )
                  throw new Error("unavailable");
                length += next.value.byteLength;
                if (json) chunks.push(Buffer.from(next.value));
              }
            })(),
          );
        }
        if (controller.signal.aborted) throw new Error("unavailable");
        const raw = json ? Buffer.concat(chunks).toString("utf8") : "";
        const value = json
          ? { status: response.status, body: raw ? JSON.parse(raw) : null }
          : { status: response.status };
        if (!returned) {
          returned = true;
          resolveResult(value);
        }
      } catch {
        record.failed = true;
        abort();
      } finally {
        // A cancel promise can outlive fetch/body; observe all original promises.
        await Promise.allSettled(
          [...record.promises]
            .filter((item) => item.promise)
            .map((item) => item.promise),
        );
        record.complete = true;
        clearTimeout(deadline);
        signal?.removeEventListener("abort", abort);
        if ([...record.promises].every((item) => item.settled)) {
          clearTimeout(observation);
          if (record.failed) fail();
        }
      }
    })();
    operation.catch(() => {
      record.failed = true;
      abort();
    });
    return result;
  }
  async function quiescence() {
    const snapshot = [...records];
    await new Promise((resolve) => {
      if (
        snapshot.every(
          (record) =>
            record.complete &&
            [...record.promises].every((item) => item.settled),
        )
      ) {
        resolve();
        return;
      }
      const end = setTimeout(resolve, ownedHttpBudgets.observe);
      Promise.allSettled(
        snapshot.flatMap((record) =>
          [...record.promises].map((item) => item.promise),
        ),
      ).then(() => {
        if (snapshot.every((record) => record.complete)) {
          clearTimeout(end);
          resolve();
        }
      });
    });
    const settled = snapshot.filter(
      (record) =>
        record.complete && [...record.promises].every((item) => item.settled),
    ).length;
    const failed = snapshot.filter((record) => record.failed).length;
    const uncertain = snapshot.filter((record) => record.uncertain).length;
    const available =
      snapshot.length === records.size &&
      settled === snapshot.length &&
      !failed &&
      !uncertain;
    return Object.freeze({
      available,
      quiescent: available,
      started: records.size,
      settled,
      pending: records.size - settled,
      failed,
      uncertain,
    });
  }
  return { consume, quiescence };
}
// PRIVATE LEGACY HTTP END
// PRIVATE TRANSPORT END
// HTTP-only dedicated fd3 writer; this export makes no operation until called.
// Await each record before cleanup. It never grants pass or cleanup credit.
export async function writeHttpFailureEvidence(record) {
  nodeStartupGuard(process.env);
  if (
    !process.argv[1] ||
    resolve(process.argv[1]) !== resolve(root, "supabase/tests", httpModule)
  )
    throw new Error("HTTP failure evidence unavailable");
  await writeFailureRecord(record);
}
const args = [
  "--host",
  socket,
  "exec",
  "-e",
  "PGOPTIONS=-c statement_timeout=30000 -c lock_timeout=20000 -c idle_in_transaction_session_timeout=90000 -c idle_session_timeout=90000",
  "-i",
  "supabase_db_pals-local",
  "psql",
  "-X",
  "-qAt",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-v",
  "VERBOSITY=verbose",
];
// PRIVATE SQL DIAGNOSTIC START: only the exact emitted sanitized Error is keyed.
const sqlDiagnostics = new WeakMap();
const unavailableSqlDiagnostic = () =>
  Object.freeze({
    code: "unavailable",
    detail: Object.freeze({ type: "string", available: false }),
  });
const originalDiagnosticPairs = new Set([
  ...[
    "Safety report unavailable",
    "Safety operation unavailable",
    "Hangout operation not permitted",
    "Hangout chat unavailable",
    "Moderation unavailable",
    "Pilot management unavailable",
    "Owner operation unavailable",
  ].map((message) => `42501:${message}`),
  "23514:Detach a profile photo before deleting it",
  "23514:Photos must be existing owned private objects",
  "40P01:deadlock detected",
  "40001:could not serialize access due to concurrent update",
  "40001:could not serialize access due to read/write dependencies among transactions",
  "57014:canceling statement due to statement timeout",
  "55P03:canceling statement due to lock timeout",
]);
function completeSqlDiagnostic(stderr) {
  if (
    typeof stderr !== "string" ||
    Buffer.byteLength(stderr) > 64 * 1024 ||
    /\r(?!\n)/.test(stderr)
  )
    return null;
  const lines = stderr.replaceAll("\r\n", "\n").split("\n");
  if (lines.at(-1) === "") lines.pop(); // Exactly one optional terminating newline.
  if (
    !lines.length ||
    lines.length > 64 ||
    lines.some((line) => !line || Buffer.byteLength(line) > 4096)
  )
    return null;
  const main = /^ERROR: {2}([A-Z0-9]{5}): ([^\r\n]+)$/.exec(lines[0]);
  if (!main) return null;
  let current = null,
    previous = -1,
    continuations = 0;
  const fields = ["DETAIL", "HINT", "CONTEXT", "LOCATION"];
  for (const line of lines.slice(1)) {
    // Even indented ERROR/unknown labeled records cannot masquerade as opaque continuation.
    const field = /^([A-Z]+): {2}(.+)$/.exec(line);
    if (field) {
      const order = fields.indexOf(field[1]);
      if (order < 0 || order <= previous) return null;
      current = field[1];
      previous = order;
      continuations = 0;
    } else {
      if (
        !current ||
        current === "LOCATION" ||
        ++continuations > 16 ||
        /^\s*[A-Za-z][A-Za-z0-9_ -]*:/.test(line)
      )
        return null;
      if (
        !/^[ \t]+\S/.test(line) &&
        !(
          current === "CONTEXT" &&
          /^PL\/pgSQL function [^\r\n]+ line [1-9][0-9]* at [^\r\n]+$/.test(
            line,
          )
        )
      )
        return null;
    }
  }
  return { code: main[1], message: main[2] };
}
function privateSqlDiagnostic(stderr) {
  const parsed = completeSqlDiagnostic(stderr);
  if (!parsed) return unavailableSqlDiagnostic();
  if (parsed.code === "23503")
    return Object.freeze({ code: "23503", message: "unavailable" });
  if (originalDiagnosticPairs.has(`${parsed.code}:${parsed.message}`))
    return Object.freeze(parsed);
  return Object.freeze({
    code: "unavailable",
    detail: Object.freeze({
      type: "object",
      available: true,
      sha256: createHash("sha256").update(JSON.stringify(parsed)).digest("hex"),
    }),
  });
}
// Memory-only. Never serialize this receipt or use it as cleanup/permission proof.
export function originalSqlDiagnostic(error) {
  return sqlDiagnostics.get(error) ?? unavailableSqlDiagnostic();
}
// PRIVATE SQL DIAGNOSTIC END
function rawSql(input) {
  try {
    return command(
      dockerBinary,
      args,
      {
        input,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
      transportBudgets.sql,
    ).trim();
  } catch (error) {
    if (!Number.isInteger(error.status) || error.signal || error.code)
      throw new Error(
        "Disposable SQL transport failed/interrupted; cleanup unverified",
      );
    const diagnostic = /ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/.exec(
      String(error.stderr ?? ""),
    );
    const safe =
      diagnostic &&
      [
        "Safety report unavailable",
        "Safety operation unavailable",
        "Hangout operation not permitted",
        "Hangout chat unavailable",
        "Moderation unavailable",
        "Pilot management unavailable",
      ].includes(diagnostic[2].trim());
    const emitted = new Error(
      `Disposable SQL error: ${diagnostic?.[1] ?? "transport"}: ${safe ? diagnostic[2].trim() : "operation failed"}`,
    );
    sqlDiagnostics.set(emitted, privateSqlDiagnostic(error.stderr));
    throw emitted;
  }
}
export const expectedMigrationVersions = Object.freeze([
  "20260921000100",
  "20260922000100",
  "20260922000200",
  "20260922000300",
  "20260922000400",
  "20260922000500",
  "20260922000600",
  "20260923000100",
  "20260923000200",
  "20260923000300",
  "20260923000400",
  "20260923000500",
  "20260923000600",
  "20260923000700",
  "20260924000100",
  "20260924000200",
  "20260924000300",
  "20260924000400",
  "20260925000100",
  "20260925000200",
  "20260927000100",
  "20260927000200",
  "20260927000300",
  "20260927000400",
  "20260927000500",
  "20260927000600",
  "20260928000100",
]);
export const migrationFiles = Object.freeze({
  "20260921000100_identity_foundation.sql":
    "1652ac3feb644e83cea6deb1420e9782db22f54c4093ce4ca1a9ad2cede00026",
  "20260922000100_verified_onboarding.sql":
    "486777e3b94bc0e7ec71a06b56e892c85be562b7974d98f941a357c8d6f738ab",
  "20260922000200_owner_profile_enrichment.sql":
    "1e558790a18cc8f75f3ebaec029bef3600c68c6359df1300c09874d8e8e8e549",
  "20260922000300_hangout_foundation.sql":
    "dfdb9a7b4eae9380d34ccfd20a34432e6bb9fd639cb1a395f65fe5b7c8ff1332",
  "20260922000400_people_text_directory.sql":
    "d0c8c25d07bef72040b32a9c170d56a05f2b66c081d134e4419b345ecc8935fb",
  "20260922000500_people_raw_name_cursor.sql":
    "b895cc4ea9e82eaa3704a1b115ab91ee7091fcd16c78de3b204d20a6a36181b7",
  "20260922000600_people_id_cursor.sql":
    "8955873efdf6c1a18924850a3d65bcc423fe4b37fe9a5e3ec5f6a4f403ea5f98",
  "20260923000100_local_friendship.sql":
    "4774d2e2e4371dbd3996854be7bfdb2e93395f78eb5efeacf134fb5b88bf2332",
  "20260923000200_local_hangout_chat.sql":
    "65a3796bef7a96963b1664d78be030221f7c720e61ce11d746fbed66c4952147",
  "20260923000300_local_direct_messages.sql":
    "f883d899a91b147b3aa41156814884b07dbf90bcdd0aa06aba75ea0e00e75248",
  "20260923000400_local_notifications_social.sql":
    "9d6d2f3ef7364e8e532a583b45d23eacb5cf9a7de7aa9236fff9862e497befd3",
  "20260923000500_local_notifications_hangouts.sql":
    "0ae4e2c604c83c870e251477d37c2a869d5bb82364be87c649ff7966adac973e",
  "20260923000600_local_global_blocks.sql":
    "cea998d5667c16ced036b85176dd856ee686d6fbdded80b68db14934e7a84f01",
  "20260923000700_local_safety_reports.sql":
    "7e6847936cf10e4c58db73cb09b22a72f50cd32e1bea8e4b9fb20a4bd237209d",
  "20260924000100_local_moderation_review.sql":
    "b6f0baa0a6368357a088eb6443782f40aa2da84ba2bd4c2224531f693999a84f",
  "20260924000200_local_account_enforcement.sql":
    "0a1f5d20564fa87c7c27247334c570913bea9a1217c0164eddc9d067681449e5",
  "20260924000300_local_hangout_disable.sql":
    "4afd775c4a7531f702aebcac09321976172f6fbef16fa0453c99ea23b8513397",
  "20260924000400_local_attendance.sql":
    "8bc375dbf1caaa7e6945a78474557bf52bb4831351a8aa857cb3982288af60d7",
  "20260925000100_local_large_hangout_safeguards.sql":
    "ded5fdd091e11803d5a4bf53e971db9ee6efddb58a86a3f82dd4af5b542c1b34",
  "20260925000200_local_cohost_authority.sql":
    "e332af2ad56d052506f51a35949e4424136f23c739cdf373db02a339380b59c3",
  "20260927000100_private_pilot_admission_authority.sql":
    "7f424a677feb37bd25bef23a343806a3a5b3ba272f5fccc34370e5e42f423764",
  "20260927000200_pilot_owner_admission.sql":
    "27e196389c0e422afa9a03966d8dfb84a48cc0229e03c8756c3aeb9ed7fb4103",
  "20260927000300_pilot_source_safety.sql":
    "a97344460a7fa78b7a9e652e0203fcc3acecea1c3c9d49993bf975ad7198510b",
  "20260927000400_moderation_mandatory_lock_results.sql":
    "6806ae080cf3c68c1e5426fb15994523c210cba60597d5c6639d4cdd9ff60e47",
  "20260927000500_pilot_ordinary_lifecycle.sql":
    "215c55a26b302ab0fc8f69cd5127122fde343663cab3090dcddc773cd8da56e1",
  "20260927000600_pilot_cohost_chat.sql":
    "a8d181810320170493bc1f625ee59bdfe87034a0633dd37384b3ed3b3846fb45",
  "20260928000100_pilot_current_safety.sql":
    "9dafa05e597928533ba51f100d29bc5c64c248d6f33f4a134b1f058d8d7640e8",
});
const configSha256 =
  "eb17d8b4be23f8cfc93f964ded2e944c5411034895de2510aa1e5ae6533df0e6";
let guardedLane = null;
const redact = (value) =>
  String(value)
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "<redacted-token>",
    )
    .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1<redacted>@");
function environmentGuard() {
  nodeStartupGuard(process.env);
  assert.equal(process.env.DO_NOT_TRACK, "1", "telemetry must remain disabled");
  assert.equal(process.env.DOCKER_HOST, socket, "exact owned socket required");
  assert.equal(
    process.env.PALS_PILOT_DISPOSABLE_OWNER,
    "TASK-021A1b3c",
    "exact exclusive B3c owner required",
  );
  for (const key of [
    "DOCKER_CONTEXT",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CERT_PATH",
    "DOCKER_TLS",
  ])
    assert.ok(!process.env[key], "conflicting Docker override forbidden");
  assert.ok(
    !process.env.SUPABASE_CLI || process.env.SUPABASE_CLI === supabaseBinary,
    "fixed cached Supabase binary required",
  );
  assert.equal(
    realpathSync(socket.slice(7)),
    socket.slice(7),
    "exact nonredirected socket path required",
  );
  const entry = lstatSync(socket.slice(7));
  assert.ok(
    entry.isSocket() && entry.uid === 501,
    "existing UID501 Unix socket required",
  );
  assert.equal(
    createHash("sha256")
      .update(readFileSync(resolve(root, "supabase/config.toml")))
      .digest("hex"),
    configSha256,
    "reviewed pals-local loopback config required",
  );
  const names = readdirSync(resolve(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.deepEqual(
    names,
    Object.keys(migrationFiles),
    "exact full27 source manifest required",
  );
  for (const name of names)
    assert.equal(
      createHash("sha256")
        .update(readFileSync(resolve(root, "supabase/migrations", name)))
        .digest("hex"),
      migrationFiles[name],
      "reviewed immutable migration required",
    );
}
export function cliEnvironment() {
  environmentGuard();
  return {
    ...process.env,
    PATH: `/private/tmp/pals-runtime/docker:${process.env.PATH ?? ""}`,
    DOCKER_HOST: socket,
    DO_NOT_TRACK: "1",
  };
}
function historyGuard(lane) {
  assert.ok(
    ["current27", "prior26-upgrade"].includes(lane),
    "exact history lane required",
  );
  const versions = rawSql(
    "select version from supabase_migrations.schema_migrations order by version",
  ).split("\n");
  const current =
    JSON.stringify(versions) === JSON.stringify(expectedMigrationVersions);
  const prior =
    JSON.stringify(versions) ===
    JSON.stringify(expectedMigrationVersions.slice(0, 26));
  assert.ok(
    current || (lane === "prior26-upgrade" && prior),
    "exact full27 or explicit full26 upgrade manifest required",
  );
}
function targetGuard(lane) {
  environmentGuard();
  let container, image;
  try {
    container = JSON.parse(
      command(
        dockerBinary,
        ["--host", socket, "inspect", "supabase_db_pals-local"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        transportBudgets.metadata,
      ),
    )[0];
    image = JSON.parse(
      command(
        dockerBinary,
        ["--host", socket, "image", "inspect", container.Config.Image],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        transportBudgets.metadata,
      ),
    )[0];
  } catch {
    throw new Error("Exact existing disposable database/image unavailable");
  }
  assert.equal(container.Name, "/supabase_db_pals-local");
  assert.equal(container.State.Running, true);
  assert.ok(
    [
      "public.ecr.aws/supabase/postgres:17.6.1.167",
      "supabase/postgres:17.6.1.167",
    ].includes(container.Config.Image),
    "exact cached PostgreSQL image required",
  );
  assert.equal(
    container.Image,
    image.Id,
    "actual running image identity required",
  );
  assert.deepEqual(
    container.NetworkSettings.Ports["5432/tcp"],
    [{ HostIp: "127.0.0.1", HostPort: "54322" }],
    "loopback DB binding required",
  );
  assert.equal(
    rawSql(
      "select current_database()||':'||session_user||':'||current_setting('server_version_num')",
    ),
    "postgres:postgres:170006",
    "actual PostgreSQL17.6 session/database required",
  );
  historyGuard(lane);
}
export function sql(input, { lane = "current27" } = {}) {
  assert.equal(guardedLane, lane, "localTarget required for exact SQL lane");
  targetGuard(lane);
  return rawSql(input);
}
export function localTarget(lane = "current27") {
  guardedLane = null;
  assert.ok(
    ["current27", "prior26-upgrade"].includes(lane),
    "exact history lane required",
  );
  targetGuard(lane);
  let status;
  try {
    status = JSON.parse(
      command(
        supabaseBinary,
        ["status", "--output", "json"],
        {
          cwd: root,
          env: cliEnvironment(),
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
        transportBudgets.metadata,
      ),
    );
  } catch {
    throw new Error("Exact disposable CLI status unavailable");
  }
  assert.equal(
    status.API_URL,
    "http://127.0.0.1:54321",
    "exact local API required",
  );
  let dbUrl;
  try {
    dbUrl = new URL(status.DB_URL);
  } catch {
    throw new Error("Invalid disposable database status URL");
  }
  assert.equal(dbUrl.hostname, "127.0.0.1");
  assert.equal(dbUrl.port, "54322");
  assert.equal(dbUrl.pathname, "/postgres");
  assert.equal(
    status.INBUCKET_URL ?? status.MAILPIT_URL,
    "http://127.0.0.1:54324",
    "exact loopback mail required",
  );
  guardedLane = lane;
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  assert.ok(
    typeof key === "string" && key.length > 0,
    "local public credential required",
  );
  const transport = ownedHttpTransport();
  function apiGuard() {
    assert.equal(lane, "current27", "API accepts captured current27 only");
    assert.equal(guardedLane, "current27", "API guard lane changed");
    targetGuard("current27");
  }
  function apiRequest(path, token, body, options, contentType) {
    apiGuard();
    const url = guardedHttpUrl(path);
    const method = options.method ?? (body === undefined ? "GET" : "POST");
    if (!["GET", "POST", "PATCH", "DELETE"].includes(method))
      throw new Error("Fixed loopback method unavailable");
    if (
      contentType === "image/png" &&
      (!Buffer.isBuffer(body) ||
        method !== "POST" ||
        !/^\/storage\/v1\/object\/profile-photos\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.png$/.test(
          url.pathname,
        ))
    )
      throw new Error("Fixed Storage bytes unavailable");
    let payload;
    try {
      payload =
        body === undefined
          ? undefined
          : contentType === "image/png"
            ? body
            : JSON.stringify(body);
    } catch {
      throw new Error("Guarded loopback API transport/JSON failure");
    }
    if (payload !== undefined && Buffer.byteLength(payload) > transportLimit)
      throw new Error("Fixed loopback body unavailable");
    return transport.consume(
      url,
      {
        method,
        headers: {
          apikey: key,
          authorization: `Bearer ${token ?? key}`,
          ...(body === undefined && contentType === null
            ? {}
            : { "content-type": contentType ?? "application/json" }),
        },
        ...(payload === undefined ? {} : { body: payload }),
      },
      options.signal,
      true,
    );
  }
  async function request(path, token, body, options = {}) {
    return apiRequest(
      path,
      token,
      body,
      options,
      body === undefined ? null : "application/json",
    );
  }
  async function storage(path, token, body, options = {}) {
    const content = options.contentType ?? "application/json";
    if (!["application/json", "image/png"].includes(content))
      throw new Error("Fixed Storage content unavailable");
    return apiRequest(path, token, body, options, content);
  }
  async function signedGet(input, options = {}) {
    apiGuard();
    return transport.consume(
      guardedHttpUrl(input, true),
      { method: "GET" },
      options.signal,
      false,
    );
  }
  return {
    status,
    key,
    request,
    storage,
    signedGet,
    quiescence: transport.quiescence,
    rpc: (name, token, body) => {
      assert.match(name, /^[a-z][a-z0-9_]*$/, "RPC identifier required");
      return request(`/rest/v1/rpc/${name}`, token, body);
    },
  };
}
export function ok(result) {
  assert.ok(
    [200, 204].includes(result.status),
    `Unexpected response status ${result.status}`,
  );
  return result.body;
}
export function resetDisposable(lane = "current27") {
  localTarget(lane);
  try {
    command(
      supabaseBinary,
      ["db", "reset", "--local", "--network-id", "pals-local-network"],
      {
        cwd: root,
        env: cliEnvironment(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
      transportBudgets.reset,
    );
  } catch {
    throw new Error("Owned full27 reset failed; task incomplete");
  }
  localTarget("current27");
  assertClean();
}
export function assertClean() {
  // Imported only when explicitly invoked; imports never contact a target.
  assert.equal(guardedLane, "current27");
  targetGuard("current27");
  const snapshot = census();
  assert.deepEqual(Object.keys(snapshot).sort(), censusTables.slice().sort());
  for (const [table, rows] of Object.entries(snapshot)) {
    if (table === "public.universities") {
      assert.deepEqual(
        rows.map((r) => r.id),
        ["00000000-0000-4000-8000-000000000001"],
      );
      assert.equal(rows[0].slug, "unc-chapel-hill");
      assert.equal(rows[0].active, true);
      assert.deepEqual(rows[0].allowed_email_domains, [
        "live.unc.edu",
        "unc.edu",
        "ad.unc.edu",
        "business.unc.edu",
        "kenan-flagler.unc.edu",
      ]);
    } else if (table.endsWith("_feature_gate")) {
      assert.deepEqual(rows, [{ enabled: false, singleton: true }], table);
    } else if (table === "private.pilot_availability") {
      assert.equal(rows.length, 1);
      assert.equal(rows[0].singleton, true);
      assert.equal(rows[0].enabled, false);
      assert.equal(rows[0].revision, 1);
    } else if (table === "private.pilot_capabilities") {
      assert.deepEqual(
        rows.map((r) => r.key).sort(),
        capabilityKeys.slice().sort(),
      );
      for (const row of rows) {
        assert.equal(row.enabled, false);
        assert.equal(row.revision, 1);
      }
    } else
      assert.deepEqual(rows, [], table + " zero synthetic/retained records");
  }
}
export function session(name) {
  assert.equal(guardedLane, "current27", "held SQL session requires current27");
  targetGuard("current27");
  const owned = ownedSession(
    dockerBinary,
    args,
    `set application_name=${quote(name)};\n`,
  );
  return {
    ...owned,
    send: (query) => {
      assert.equal(guardedLane, "current27");
      targetGuard("current27");
      return owned.send(`${query}\n`);
    },
  };
}

export async function until(check) {
  const deadline = performance.now() + 6_000;
  for (let n = 0; n < 240 && performance.now() < deadline; n++) {
    const observed = check();
    if (performance.now() >= deadline) break;
    if (observed) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Observed database lock wait timed out");
}
export async function race(
  name,
  firstQuery,
  secondQuery,
  rejection = null,
  holderSnapshotSQL = null,
  receiptPrefix = null,
) {
  let first, second;
  try {
    first = session(`${name}_leader`);
    second = session(`${name}_waiter`);
    first.send(
      `begin; ${firstQuery} ${holderSnapshotSQL ? `select 'B3C_CENSUS:'||(${holderSnapshotSQL})::text;` : ""} select 'HELD';`,
    );
    await until(() => first.output().includes("HELD"));
    second.send(`begin; ${secondQuery} select 'COMPLETED'; commit;`);
    await until(
      () =>
        sql(
          `select count(*) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(`${name}_leader`)} where w.application_name=${quote(`${name}_waiter`)} and w.wait_event_type='Lock' and h.pid<>w.pid and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`,
        ) === "1",
    );
    const evidence = sql(
      `select jsonb_build_object('race',${quote(name)},'holder_pid',h.pid,'waiter_pid',w.pid,'waiting_lock_types',(select jsonb_agg(distinct l.locktype) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(`${name}_leader`)} where w.application_name=${quote(`${name}_waiter`)} and h.pid<>w.pid and h.pid=any(pg_blocking_pids(w.pid))`,
    );
    first.send("commit;");
    first.child.stdin.end();
    second.child.stdin.end();
    const [firstResult, secondResult] = await Promise.all([
      first.done,
      second.done,
    ]);
    assert.equal(firstResult[0], 0);
    assert.doesNotMatch(first.output(), /ERROR:/);
    if (rejection !== null) {
      assert.notEqual(secondResult[0], 0);
      assert.match(second.output(), /42501:/, "exact SQLSTATE required");
      assert.ok(
        second.output().includes(rejection),
        "exact authority error required",
      );
      assert.doesNotMatch(
        second.output(),
        /deadlock|serialize|timeout|40P01|40001|57014|55P03/i,
      );
      assert.doesNotMatch(second.output(), /COMPLETED/);
    } else {
      assert.equal(secondResult[0], 0);
      assert.match(second.output(), /COMPLETED/);
      assert.doesNotMatch(second.output(), /ERROR:/);
    }
    let receiptEvidence = {};
    if (receiptPrefix !== null) {
      const parseReceipt = (session) => {
        const row = session
          .output()
          .split("\n")
          .find((v) => v.startsWith(receiptPrefix));
        assert.ok(row, "actual receipt row required");
        return JSON.parse(row.slice(receiptPrefix.length));
      };
      const firstReceipt = parseReceipt(first),
        secondReceipt = parseReceipt(second);
      assert.deepEqual(
        firstReceipt,
        secondReceipt,
        "concurrent same key returns exact original receipt fields",
      );
      receiptEvidence = {
        receipts_equal: true,
        receipt_sha256: createHash("sha256")
          .update(JSON.stringify(firstReceipt))
          .digest("hex"),
        receipt_fields: Object.keys(firstReceipt[0]).sort(),
      };
    }
    return {
      ...JSON.parse(evidence),
      ...receiptEvidence,
      ...(holderSnapshotSQL
        ? {
            holder_snapshot: JSON.parse(
              first
                .output()
                .split("\n")
                .find((v) => v.startsWith("B3C_CENSUS:"))
                .slice(11),
            ),
          }
        : {}),
    };
  } catch (error) {
    throw new Error(
      `${name}: ${redact(error.message)}; session transcripts withheld from error logs`,
    );
  } finally {
    const closed = await Promise.allSettled(
      [first, second].filter(Boolean).map((owned) => owned.close()),
    );
    if (closed.some((result) => result.status === "rejected"))
      throw new Error(
        `${name}: owned SQL session closure failed; cleanup incomplete`,
      );
  }
}

// Explicit process runner. Importing this module never dispatches anything.
// The invocation is reserved for a later separately released exclusive executor.
const runnerModules = Object.freeze([
  "pilot-admission-current-safety-http.integration.mjs",
  "pilot-admission-current-safety-concurrency.integration.mjs",
  "pilot-admission-current-safety-absence.integration.mjs",
  "pilot-admission-current-safety-identity-races.integration.mjs",
]);
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    assert.equal(process.argv.length, 4, "explicit runner invocation required");
    assert.equal(
      process.argv[2],
      "--run-exclusive-current27",
      "explicit released current27 runner required",
    );
    assert.ok(
      runnerModules.includes(process.argv[3]),
      "reviewed fixture module required",
    );
    environmentGuard();
    const modulePath = resolve(root, "supabase/tests", process.argv[3]);
    assert.equal(
      realpathSync(modulePath),
      modulePath,
      "nonredirected fixture required",
    );
    const result = await runOwnedProcess(
      process.execPath,
      ["--unhandled-rejections=strict", modulePath],
      {
        cwd: root,
        env: cliEnvironment(),
      },
      moduleBudget(process.argv[3]),
      process.argv[3] === httpModule,
    );
    process.stdout.write(result);
  } catch (error) {
    if (process.argv[3] === httpModule) {
      const evidence = error.httpFailureEvidence ?? {
        availability: "unavailable",
        reason: "not-started",
        records: [],
      };
      process.stderr.write(
        JSON.stringify({
          classification: "child-reported-failed-uncredited",
          cleanup: "unverified",
          evidence,
        }) + "\n",
      );
    }
    process.stderr.write(
      "Bounded current27 module failed/uncredited; cleanup unverified; fresh guarded owner/census review required; no reset/retry authorized.\n",
    );
    // A missing child-exit receipt must not keep this supervisor alive forever.
    // Exit is failed/uncredited; it does not prove any descendant/server cleanup.
    process.exit(1);
  }
}
