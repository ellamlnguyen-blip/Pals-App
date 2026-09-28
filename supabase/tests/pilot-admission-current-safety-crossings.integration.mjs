// Static authoring only. Importing registers no tests and contacts no target.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  quote,
  sql,
  session,
  until,
  localTarget,
  resetDisposable,
  assertClean,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  routes,
  prepare,
  caseIds,
  auth,
  census,
  censusQuery,
  censusTables,
  photoPath,
  assertCurrentOnly,
  denialFor,
  selectedLaterLane,
  sanitized,
} from "./helpers/pilot-current-safety-fixtures.mjs";
import {
  assertCaseSetup,
  assertSuccess,
  dynamicTime,
  bounds,
  successSQL,
} from "./pilot-admission-current-safety-concurrency.integration.mjs";

// Literal allocations: 48 actual writer orders and 12 distinct serial fixtures.
// No allocation has execution or permission credit before its actual assertions.
export const crossingManifest = Object.freeze([
  Object.freeze({
    id: "X.CH.actor.owner_primary_assignment.writer-first",
    route: "CH",
    subject: "actor",
    writer: "owner_primary_assignment",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.owner_primary_assignment.operation-first",
    route: "CH",
    subject: "actor",
    writer: "owner_primary_assignment",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.owner_primary_detach_delete.writer-first",
    route: "CH",
    subject: "actor",
    writer: "owner_primary_detach_delete",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.owner_primary_detach_delete.operation-first",
    route: "CH",
    subject: "actor",
    writer: "owner_primary_detach_delete",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.auth_confirmation_null.writer-first",
    route: "CH",
    subject: "actor",
    writer: "auth_confirmation_null",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.auth_confirmation_null.operation-first",
    route: "CH",
    subject: "actor",
    writer: "auth_confirmation_null",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.auth_invalid_domain.writer-first",
    route: "CH",
    subject: "actor",
    writer: "auth_invalid_domain",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.auth_invalid_domain.operation-first",
    route: "CH",
    subject: "actor",
    writer: "auth_invalid_domain",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.referenced_primary_protection.serial",
    route: "CH",
    subject: "actor",
    writer: "referenced_primary_protection",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.actor.owner_onboarding_off.serial",
    route: "CH",
    subject: "actor",
    writer: "owner_onboarding_off",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.owner_primary_assignment.writer-first",
    route: "CH",
    subject: "immutable_host",
    writer: "owner_primary_assignment",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.owner_primary_assignment.operation-first",
    route: "CH",
    subject: "immutable_host",
    writer: "owner_primary_assignment",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.owner_primary_detach_delete.writer-first",
    route: "CH",
    subject: "immutable_host",
    writer: "owner_primary_detach_delete",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.owner_primary_detach_delete.operation-first",
    route: "CH",
    subject: "immutable_host",
    writer: "owner_primary_detach_delete",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.auth_confirmation_null.writer-first",
    route: "CH",
    subject: "immutable_host",
    writer: "auth_confirmation_null",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.auth_confirmation_null.operation-first",
    route: "CH",
    subject: "immutable_host",
    writer: "auth_confirmation_null",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.auth_invalid_domain.writer-first",
    route: "CH",
    subject: "immutable_host",
    writer: "auth_invalid_domain",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.auth_invalid_domain.operation-first",
    route: "CH",
    subject: "immutable_host",
    writer: "auth_invalid_domain",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.referenced_primary_protection.serial",
    route: "CH",
    subject: "immutable_host",
    writer: "referenced_primary_protection",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CH.immutable_host.owner_onboarding_off.serial",
    route: "CH",
    subject: "immutable_host",
    writer: "owner_onboarding_off",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.owner_primary_assignment.writer-first",
    route: "CP",
    subject: "actor",
    writer: "owner_primary_assignment",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.owner_primary_assignment.operation-first",
    route: "CP",
    subject: "actor",
    writer: "owner_primary_assignment",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.owner_primary_detach_delete.writer-first",
    route: "CP",
    subject: "actor",
    writer: "owner_primary_detach_delete",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.owner_primary_detach_delete.operation-first",
    route: "CP",
    subject: "actor",
    writer: "owner_primary_detach_delete",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.auth_confirmation_null.writer-first",
    route: "CP",
    subject: "actor",
    writer: "auth_confirmation_null",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.auth_confirmation_null.operation-first",
    route: "CP",
    subject: "actor",
    writer: "auth_confirmation_null",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.auth_invalid_domain.writer-first",
    route: "CP",
    subject: "actor",
    writer: "auth_invalid_domain",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.auth_invalid_domain.operation-first",
    route: "CP",
    subject: "actor",
    writer: "auth_invalid_domain",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.referenced_primary_protection.serial",
    route: "CP",
    subject: "actor",
    writer: "referenced_primary_protection",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.actor.owner_onboarding_off.serial",
    route: "CP",
    subject: "actor",
    writer: "owner_onboarding_off",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.owner_primary_assignment.writer-first",
    route: "CP",
    subject: "peer",
    writer: "owner_primary_assignment",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.owner_primary_assignment.operation-first",
    route: "CP",
    subject: "peer",
    writer: "owner_primary_assignment",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.owner_primary_detach_delete.writer-first",
    route: "CP",
    subject: "peer",
    writer: "owner_primary_detach_delete",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.owner_primary_detach_delete.operation-first",
    route: "CP",
    subject: "peer",
    writer: "owner_primary_detach_delete",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.auth_confirmation_null.writer-first",
    route: "CP",
    subject: "peer",
    writer: "auth_confirmation_null",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.auth_confirmation_null.operation-first",
    route: "CP",
    subject: "peer",
    writer: "auth_confirmation_null",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.auth_invalid_domain.writer-first",
    route: "CP",
    subject: "peer",
    writer: "auth_invalid_domain",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.auth_invalid_domain.operation-first",
    route: "CP",
    subject: "peer",
    writer: "auth_invalid_domain",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.referenced_primary_protection.serial",
    route: "CP",
    subject: "peer",
    writer: "referenced_primary_protection",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CP.peer.owner_onboarding_off.serial",
    route: "CP",
    subject: "peer",
    writer: "owner_onboarding_off",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.owner_primary_assignment.writer-first",
    route: "CB",
    subject: "actor",
    writer: "owner_primary_assignment",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.owner_primary_assignment.operation-first",
    route: "CB",
    subject: "actor",
    writer: "owner_primary_assignment",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.owner_primary_detach_delete.writer-first",
    route: "CB",
    subject: "actor",
    writer: "owner_primary_detach_delete",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.owner_primary_detach_delete.operation-first",
    route: "CB",
    subject: "actor",
    writer: "owner_primary_detach_delete",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.auth_confirmation_null.writer-first",
    route: "CB",
    subject: "actor",
    writer: "auth_confirmation_null",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.auth_confirmation_null.operation-first",
    route: "CB",
    subject: "actor",
    writer: "auth_confirmation_null",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.auth_invalid_domain.writer-first",
    route: "CB",
    subject: "actor",
    writer: "auth_invalid_domain",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.auth_invalid_domain.operation-first",
    route: "CB",
    subject: "actor",
    writer: "auth_invalid_domain",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.referenced_primary_protection.serial",
    route: "CB",
    subject: "actor",
    writer: "referenced_primary_protection",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.actor.owner_onboarding_off.serial",
    route: "CB",
    subject: "actor",
    writer: "owner_onboarding_off",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.owner_primary_assignment.writer-first",
    route: "CB",
    subject: "peer",
    writer: "owner_primary_assignment",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.owner_primary_assignment.operation-first",
    route: "CB",
    subject: "peer",
    writer: "owner_primary_assignment",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.owner_primary_detach_delete.writer-first",
    route: "CB",
    subject: "peer",
    writer: "owner_primary_detach_delete",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.owner_primary_detach_delete.operation-first",
    route: "CB",
    subject: "peer",
    writer: "owner_primary_detach_delete",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.auth_confirmation_null.writer-first",
    route: "CB",
    subject: "peer",
    writer: "auth_confirmation_null",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.auth_confirmation_null.operation-first",
    route: "CB",
    subject: "peer",
    writer: "auth_confirmation_null",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.auth_invalid_domain.writer-first",
    route: "CB",
    subject: "peer",
    writer: "auth_invalid_domain",
    order: "writer-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.auth_invalid_domain.operation-first",
    route: "CB",
    subject: "peer",
    writer: "auth_invalid_domain",
    order: "operation-first",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.referenced_primary_protection.serial",
    route: "CB",
    subject: "peer",
    writer: "referenced_primary_protection",
    order: "serial",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "X.CB.peer.owner_onboarding_off.serial",
    route: "CB",
    subject: "peer",
    writer: "owner_onboarding_off",
    order: "serial",
    status: "unexecuted",
  }),
]);

const digest = (v) =>
  createHash("sha256")
    .update(JSON.stringify(v) ?? "<undefined>")
    .digest("hex");
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
const rows = (v) =>
  v
    .map(canonical)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const codes = new Set(["42501", "23514", "40P01", "40001", "57014", "55P03"]);
const neutral = new Set([
  "Safety report unavailable",
  "Safety operation unavailable",
]);
const phases = new Set([
  "setup",
  "precheck",
  "companion",
  "serial",
  "holder",
  "waiter",
  "wait",
  "release",
  "outcome",
  "postcheck",
  "reset",
  "cleanup",
]);
// Only the frozen guarded SQL wrapper's complete format is accepted here.
export function strictDiagnostic(message) {
  const match = /^Disposable SQL error: ([A-Z0-9]{5}): ([^\r\n]*)$/.exec(
    message ?? "",
  );
  if (!match || !codes.has(match[1]))
    return { classification: "unexpected-withheld" };
  return {
    code: match[1],
    message: neutral.has(match[2]) ? match[2] : "operation failed",
  };
}
function sessionDiagnostics(output) {
  return output
    .split("\n")
    .filter((line) => line.includes("ERROR:"))
    .map((line) => {
      const match = /^ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)$/.exec(line);
      return match
        ? strictDiagnostic(
            `Disposable SQL error: ${match[1]}: ${match[2].trim()}`,
          )
        : { classification: "unexpected-withheld" };
    });
}
// Every textual leaf and every field path is hashed, including UUID-looking text,
// Auth metadata keys, narratives, unknown AssertionError fields and provider data.
// Numeric row indices plus a known table name permit precise private comparison.
export function privateDifferences(expected, actual, path = [], table = null) {
  if (Object.is(expected, actual)) return [];
  if (
    expected &&
    actual &&
    typeof expected === "object" &&
    typeof actual === "object"
  ) {
    return [
      ...new Set([...Object.keys(expected), ...Object.keys(actual)]),
    ].flatMap((k) =>
      privateDifferences(
        expected[k],
        actual[k],
        [...path, k],
        table ?? (censusTables.includes(k) ? k : null),
      ),
    );
  }
  const project = (v) =>
    typeof v === "number" || typeof v === "boolean" || v === null
      ? v
      : { sha256: digest(v), absent: v === undefined };
  return [
    {
      table: table ?? "unknown",
      field_sha256: digest(path),
      expected: project(expected),
      actual: project(actual),
    },
  ];
}
function exact(expected, actual) {
  assert.deepEqual(Object.keys(expected).sort(), censusTables.slice().sort());
  assert.deepEqual(Object.keys(actual).sort(), censusTables.slice().sort());
  const e = Object.fromEntries(censusTables.map((t) => [t, rows(expected[t])]));
  const a = Object.fromEntries(censusTables.map((t) => [t, rows(actual[t])]));
  const difference = privateDifferences(e, a);
  if (difference.length) {
    const error = new Error("Crossing full54 mismatch");
    error.crossingDifferences = difference;
    throw error;
  }
}
function one(state, table, field, value) {
  const matches = state[table].filter((r) => r[field] === value);
  assert.equal(matches.length, 1, "independent exact row binding required");
  return matches[0];
}
function marker(output, prefix) {
  const matches = output.split("\n").filter((line) => line.startsWith(prefix));
  assert.equal(matches.length, 1, "exact one internal marker required");
  return JSON.parse(matches[0].slice(prefix.length));
}
function noErrors(owned) {
  assert.equal(
    sessionDiagnostics(owned.output()).length,
    0,
    "actual statement must complete",
  );
}
const clock = () => sql("select clock_timestamp()::text");
const windowNow = (start) => ({ start, end: clock() });
function boundResult(route, result, window) {
  if (route.id === "CB") assert.equal(result, true);
  else {
    assert.deepEqual(Object.keys(result).sort(), [
      "receipt_id",
      "submitted_at",
    ]);
    assert.match(result.receipt_id, uuid);
    dynamicTime(result.submitted_at, window);
  }
}
function assertPublic(
  route,
  before,
  after,
  result,
  window,
  request = route.request,
) {
  boundResult(route, result, window);
  // Reviewed policy export independently specifies normalized report, original
  // input fingerprint, provenance, request ledger or exact own block; no suite.
  assertSuccess(route, before, after, result, request);
  const expected = structuredClone(before);
  if (route.id === "CB")
    expected["private.people_blocks"].push({
      blocker_id: route.actor,
      blocked_id: route.peer,
    });
  else {
    const fingerprint = sql(
      `select md5(jsonb_build_array(${quote(route.mode)},${quote(route.target)}::uuid,'harassment',null)::text)`,
    );
    expected["private.safety_reports"].push({
      id: result.receipt_id,
      submitted_at: result.submitted_at,
      reporter_id: route.actor,
      target_type: route.mode,
      target_id: route.target,
      category: "harassment",
      narrative: null,
      provenance_kind: route.provenance,
      provenance_ref_id: route.target,
    });
    expected["private.safety_report_requests"].push({
      reporter_id: route.actor,
      request_id: request,
      input_fingerprint: fingerprint,
      report_id: result.receipt_id,
    });
  }
  exact(expected, after);
  return expected;
}
export function writerDefinition(cell, route) {
  const subject = route.subjects[cell.subject];
  assert.ok(subject && Object.values(route.subjects).includes(subject));
  const secondId = caseIds(cell.id + ".second-object").source;
  const secondPath = `${subject}/22222222.png`;
  const oldPath = photoPath(subject);
  const profile = `where user_id=${quote(subject)}`;
  const object = `where id=${quote(secondId)} and bucket_id='profile-photos' and name=${quote(secondPath)} and owner_id=${quote(subject)}`;
  const former = `where bucket_id='profile-photos' and name=${quote(oldPath)} and owner_id=${quote(subject)}`;
  const update = (value) =>
    `${auth(subject)}with changed as(update public.profiles set primary_photo_path=${value} ${profile} returning user_id,primary_photo_path,revision,is_complete) select 'WRITER_PROFILE:'||coalesce(jsonb_agg(changed),'[]')::text from changed;`;
  let statement;
  if (
    cell.writer === "owner_primary_assignment" ||
    cell.writer === "owner_onboarding_off"
  )
    statement = update(quote(secondPath));
  else if (cell.writer === "owner_primary_detach_delete")
    statement = `${update("null")}set local storage.allow_delete_query='true';with changed as(delete from storage.objects ${former} returning id,bucket_id,name,owner_id) select 'WRITER_DELETE:'||coalesce(jsonb_agg(changed),'[]')::text from changed;`;
  else if (cell.writer === "referenced_primary_protection")
    statement = `${auth(subject)}set local storage.allow_delete_query='true';with changed as(delete from storage.objects ${former} returning id,bucket_id,name,owner_id) select 'WRITER_DELETE:'||coalesce(jsonb_agg(changed),'[]')::text from changed;`;
  else {
    assert.ok(
      ["auth_confirmation_null", "auth_invalid_domain"].includes(cell.writer),
    );
    statement = `with changed as(update auth.users set ${cell.writer === "auth_confirmation_null" ? "email_confirmed_at=null" : `email=${quote(subject + "@example.invalid")}`} where id=${quote(subject)} returning id,email,email_confirmed_at) select 'WRITER_AUTH:'||coalesce(jsonb_agg(changed),'[]')::text from changed;`;
  }
  return {
    subject,
    secondId,
    secondPath,
    oldPath,
    object,
    sql: statement + "reset role;",
    table: cell.writer.startsWith("auth_") ? "auth.users" : "public.profiles",
    key: cell.writer.startsWith("auth_") ? "id" : "user_id",
    classification: cell.writer.startsWith("auth_")
      ? "direct trusted external Auth writer; original membership sync; no Auth API permission proof"
      : "actual authenticated subject owner; grants/RLS/original triggers",
  };
}
export function expectedWriter(before, cell, definition) {
  const expected = structuredClone(before),
    s = definition.subject;
  if (
    ["owner_onboarding_off", "referenced_primary_protection"].includes(
      cell.writer,
    )
  )
    return expected;
  if (cell.writer.startsWith("owner_")) {
    const profile = one(expected, "public.profiles", "user_id", s);
    profile.primary_photo_path =
      cell.writer === "owner_primary_assignment" ? definition.secondPath : null;
    profile.revision += 1;
    profile.is_complete = cell.writer === "owner_primary_assignment";
    if (cell.writer === "owner_primary_detach_delete") {
      const old = one(expected, "storage.objects", "name", definition.oldPath);
      assert.equal(old.owner_id, s);
      expected["storage.objects"] = expected["storage.objects"].filter(
        (r) => r.id !== old.id,
      );
    }
  } else {
    const user = one(expected, "auth.users", "id", s);
    if (cell.writer === "auth_confirmation_null")
      user.email_confirmed_at = null;
    else user.email = `${s}@example.invalid`;
    one(expected, "public.university_memberships", "user_id", s);
    expected["public.university_memberships"] = expected[
      "public.university_memberships"
    ].filter((r) => r.user_id !== s);
  }
  return expected;
}
function verifyWriter(output, before, cell, d) {
  if (cell.writer === "owner_onboarding_off")
    assert.deepEqual(marker(output, "WRITER_PROFILE:"), []);
  else if (cell.writer === "referenced_primary_protection")
    assert.deepEqual(marker(output, "WRITER_DELETE:"), []);
  else if (cell.writer.startsWith("owner_")) {
    const old = one(before, "public.profiles", "user_id", d.subject);
    assert.deepEqual(marker(output, "WRITER_PROFILE:"), [
      {
        user_id: d.subject,
        primary_photo_path:
          cell.writer === "owner_primary_assignment" ? d.secondPath : null,
        revision: old.revision + 1,
        is_complete: cell.writer === "owner_primary_assignment",
      },
    ]);
    if (cell.writer === "owner_primary_detach_delete") {
      const oldObject = one(before, "storage.objects", "name", d.oldPath);
      assert.deepEqual(marker(output, "WRITER_DELETE:"), [
        {
          id: oldObject.id,
          bucket_id: "profile-photos",
          name: d.oldPath,
          owner_id: d.subject,
        },
      ]);
    }
  } else {
    const old = one(before, "auth.users", "id", d.subject);
    assert.deepEqual(marker(output, "WRITER_AUTH:"), [
      {
        id: d.subject,
        email:
          cell.writer === "auth_invalid_domain"
            ? `${d.subject}@example.invalid`
            : old.email,
        email_confirmed_at:
          cell.writer === "auth_confirmation_null"
            ? null
            : old.email_confirmed_at,
      },
    ]);
  }
}
async function closeOwned(owned, original = null) {
  const closed = await Promise.allSettled(
    owned.filter(Boolean).map((s) => s.close()),
  );
  if (closed.some((r) => r.status === "rejected")) {
    const error = original ?? new Error("Crossing owned exit unproven");
    error.crossingResetForbidden = true;
    error.crossingCleanup = [
      { classification: "owned-exit-unproven", reset_forbidden: true },
    ];
    throw error;
  }
}
async function currentRollback(route, context, request = route.request) {
  await freshCurrent(route); // Every claimed CB current call gets public unblock first.
  assertCurrentOnly(route);
  const before = census(),
    start = clock();
  let owned, failure;
  try {
    owned = session("xc_pos_" + request.replaceAll("-", "").slice(0, 24));
    owned.send(
      `${bounds}begin;${successSQL(route, { request })}rollback;select 'ROLLED_BACK';`,
    );
    owned.child.stdin.end();
    assert.equal((await owned.done)[0], 0);
    noErrors(owned);
    assert.ok(owned.output().split("\n").includes("ROLLED_BACK"));
    assertPublic(
      route,
      before,
      marker(owned.output(), "SNAPSHOT:"),
      marker(owned.output(), "RESULT:"),
      windowNow(start),
      request,
    );
    exact(before, census());
    assertCurrentOnly(route);
  } catch (error) {
    failure = error;
    context.diagnostics = sessionDiagnostics(owned?.output() ?? "");
    recordFailure(error, context);
    throw error;
  } finally {
    await closeOwned([owned], failure);
  }
}
async function freshCurrent(route) {
  if (route.id !== "CB") {
    assertCurrentOnly(route);
    return;
  }
  const before = census();
  const owned = before["private.people_blocks"].filter(
    (r) => r.blocker_id === route.actor && r.blocked_id === route.peer,
  );
  assert.ok(owned.length <= 1);
  if (owned.length) assert.equal(selectedLaterLane(route), "retained");
  // Even when already absent, execute the authorized outbound unblock. This
  // does not restore any readiness, participation, relationship or consent.
  const result = JSON.parse(
    sql(
      `${bounds}begin;${auth(route.actor)}select to_jsonb(public.set_safety_block(${quote(route.peer)},false));commit;`,
    ),
  );
  assert.equal(result, false);
  const expected = structuredClone(before);
  expected["private.people_blocks"] = expected["private.people_blocks"].filter(
    (r) => !(r.blocker_id === route.actor && r.blocked_id === route.peer),
  );
  exact(expected, census());
  assertCurrentOnly(route);
}
function currentDenial(route, context, request) {
  const before = census();
  assertCurrentOnly(route);
  let caught;
  try {
    sql(
      `${bounds}begin;${auth(route.actor)}${route.id === "CB" ? `select public.set_safety_block(${quote(route.peer)},true);` : `select * from public.submit_safety_report(${quote(request)},${quote(route.mode)},${quote(route.target)},'harassment',null);`}commit;`,
    );
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "actual current denial required");
  const diagnostic = strictDiagnostic(caught.message);
  context.diagnostics = [diagnostic];
  assert.deepEqual(diagnostic, { code: "42501", message: denialFor(route) });
  exact(before, census());
}
async function companion(cell, route, d, context) {
  const before = census(),
    start = clock();
  // Extra object is private, distinct, explicitly bound and never referenced as
  // an additional photo. Trusted synthetic preparation is not Storage permission.
  sql(
    `begin;insert into storage.objects(id,bucket_id,name,owner_id) values(${quote(d.secondId)},'profile-photos',${quote(d.secondPath)},${quote(d.subject)});commit;`,
  );
  const after = census(),
    object = one(after, "storage.objects", "id", d.secondId);
  assert.equal(object.bucket_id, "profile-photos");
  assert.equal(object.name, d.secondPath);
  assert.equal(object.owner_id, d.subject);
  assert.match(object.id, uuid);
  const anchor = {
    id: d.secondId,
    bucket_id: "profile-photos",
    name: d.secondPath,
    owner_id: d.subject,
  };
  for (const field of ["created_at", "updated_at", "last_accessed_at"])
    if (Object.hasOwn(object, field) && object[field] !== null)
      anchor[field] = dynamicTime(object[field], windowNow(start));
  const opaque = [];
  for (const key of Object.keys(object))
    if (!Object.hasOwn(anchor, key)) {
      opaque.push(digest(key));
      anchor[key] = structuredClone(object[key]);
    }
  const expected = structuredClone(before);
  expected["storage.objects"].push(anchor);
  exact(expected, after);
  assert.deepEqual(
    one(after, "public.profiles", "user_id", d.subject).additional_photo_paths,
    [],
  );
  context.provider_anchor_fields_sha256 = opaque;
  if (
    (cell.writer.startsWith("owner_") &&
      cell.writer !== "owner_onboarding_off") ||
    cell.writer === "referenced_primary_protection"
  ) {
    const b = census();
    assert.equal(
      one(b, "private.pilot_capabilities", "key", "onboarding").enabled,
      false,
    );
    sql(
      "begin;update private.pilot_capabilities set enabled=true where key='onboarding';commit;",
    );
    const e = structuredClone(b);
    one(e, "private.pilot_capabilities", "key", "onboarding").enabled = true;
    exact(e, census());
  }
}
function binding(d) {
  const found = JSON.parse(
    sql(
      `select jsonb_build_object('subject',${quote(d.subject)},'relation',${quote(d.table)},'ctid',ctid::text) from ${d.table} where ${d.key}=${quote(d.subject)}`,
    ),
  );
  assert.equal(found.subject, d.subject);
  assert.equal(found.relation, d.table);
  assert.match(found.ctid, /^\(\d+,\d+\)$/);
  return found;
}
function observationSQL(holderName, waiterName, d, b) {
  const [page, tuple] = b.ctid.slice(1, -1).split(",").map(Number);
  // An ungranted xid lock alone does not identify an evidence tuple. Require
  // the waiter's actual heavyweight tuple lock on the independently bound
  // subject's pre-race ctid, exact relation, and holder's transaction ID.
  return `select jsonb_build_object('holder_pid',h.pid,'waiter_pid',w.pid,'blocking_pids',pg_blocking_pids(w.pid),'relation',${quote(d.table)},'subject',${quote(d.subject)},'page',${page},'tuple',${tuple},'ungranted_locks',(select jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,'transactionid',l.transactionid::text)) from pg_locks l where l.pid=w.pid and not l.granted),'holder_xid',h.backend_xid::text) from pg_stat_activity h join pg_stat_activity w on w.application_name=${quote(waiterName)} where h.application_name=${quote(holderName)} and h.pid<>w.pid and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks u where u.pid=w.pid and not u.granted and u.locktype='transactionid' and u.transactionid=h.backend_xid) and exists(select 1 from pg_locks t where t.pid=w.pid and t.locktype='tuple' and t.relation=${quote(d.table)}::regclass and t.page=${page} and t.tuple=${tuple})`;
}
function projectedWait(wait) {
  if (!wait) return null;
  // Safe fixed keys only; subject is still hashed.
  return {
    holder_pid: wait.holder_pid,
    waiter_pid: wait.waiter_pid,
    blocking_pids: wait.blocking_pids,
    relation: ["auth.users", "public.profiles"].includes(wait.relation)
      ? wait.relation
      : "withheld",
    subject_sha256: digest(wait.subject),
    page: wait.page,
    tuple: wait.tuple,
    ungranted_locks: (Array.isArray(wait.ungranted_locks)
      ? wait.ungranted_locks
      : []
    ).map((l) => ({
      locktype: ["transactionid", "tuple"].includes(l.locktype)
        ? l.locktype
        : "withheld",
      mode: ["ShareLock", "ExclusiveLock"].includes(l.mode)
        ? l.mode
        : "withheld",
      transactionid_sha256: digest(l.transactionid),
    })),
  };
}
function failureEvidence(error, context) {
  // Never serialize AssertionError.actual/expected, arbitrary messages/keys,
  // raw snapshots, Auth metadata, SQL transcripts, or imported preciseDifferences.
  return {
    id: crossingManifest.some((c) => c.id === context.id)
      ? context.id
      : "withheld",
    phase: phases.has(context.phase) ? context.phase : "unknown",
    partition: "failed-no-success-credit",
    successful_wait_order_credit: false,
    lock_observation: projectedWait(context.observation),
    diagnostics: context.diagnostics ?? [strictDiagnostic(error?.message)],
    differences:
      error.crossingDifferences ??
      (Array.isArray(error.preciseDifferences)
        ? error.preciseDifferences.map((d) => ({
            field_sha256: digest(d.field),
            expected_sha256: digest(d.expected),
            actual_sha256: digest(d.actual),
          }))
        : privateDifferences(error.expected, error.actual)),
    settlement: context.settlement ?? "unavailable",
    committed_full54_summary: context.failureCensus ?? null,
    census_diagnostic: context.censusDiagnostic ?? null,
    cleanup_diagnostics: error.crossingCleanup ?? [],
    reset_forbidden: true,
  };
}
function recordFailure(error, context) {
  // Called before owned-session cleanup. Snapshots stay private; only known
  // full54 names, counts and hashes are emitted. No assertion message is used.
  try {
    context.failureCensus = sanitized(census());
  } catch (cause) {
    context.censusDiagnostic = strictDiagnostic(cause.message);
  }
  console.error(JSON.stringify(failureEvidence(error, context)));
  error.crossingFailureRecorded = true;
}
async function race(cell, route, d, before, context) {
  const start = clock(),
    prefix = "xc_" + caseIds(cell.id).request.replaceAll("-", "").slice(0, 24);
  const first = cell.order === "operation-first";
  const writerSQL = d.sql + `select 'SNAPSHOT:'||(${censusQuery})::text;`;
  const b = binding(d);
  let holder, waiter, failure;
  let hdone,
    wdone,
    releaseSent = false;
  try {
    holder = session(prefix + "_h");
    waiter = session(prefix + "_w");
    context.phase = "holder";
    holder.send(
      `${bounds}begin;${first ? successSQL(route) : writerSQL}select 'HELD';`,
    );
    await until(() => holder.output().split("\n").includes("HELD"));
    noErrors(holder);
    const held = marker(holder.output(), "SNAPSHOT:");
    let heldExpected;
    if (first)
      heldExpected = assertPublic(
        route,
        before,
        held,
        marker(holder.output(), "RESULT:"),
        windowNow(start),
      );
    else {
      verifyWriter(holder.output(), before, cell, d);
      heldExpected = expectedWriter(before, cell, d);
      exact(heldExpected, held);
    }
    context.phase = "waiter";
    waiter.send(
      `${bounds}begin;${first ? writerSQL : successSQL(route)}select 'COMPLETED';commit;select 'COMMITTED';`,
    );
    context.phase = "wait";
    await until(() => {
      const result = sql(observationSQL(prefix + "_h", prefix + "_w", d, b));
      if (!result) return false;
      context.observation = JSON.parse(result);
      return true;
    });
    const wait = context.observation;
    assert.notEqual(wait.holder_pid, wait.waiter_pid);
    assert.ok(wait.blocking_pids.includes(wait.holder_pid));
    assert.ok(wait.ungranted_locks.length > 0);
    assert.equal(wait.subject, d.subject);
    assert.equal(wait.relation, d.table);
    assert.ok(
      wait.ungranted_locks.some(
        (l) =>
          l.locktype === "transactionid" && l.transactionid === wait.holder_xid,
      ),
    );
    context.phase = "release";
    releaseSent = true;
    holder.send("commit;select 'COMMITTED';");
    holder.child.stdin.end();
    waiter.child.stdin.end();
    [hdone, wdone] = await Promise.all([holder.done, waiter.done]);
    assert.equal(hdone[0], 0);
    noErrors(holder);
    assert.ok(holder.output().split("\n").includes("COMMITTED"));
    context.phase = "outcome";
    const committed = census();
    const assignment = cell.writer === "owner_primary_assignment";
    if (first || assignment) {
      assert.equal(wdone[0], 0);
      noErrors(waiter);
      assert.ok(waiter.output().split("\n").includes("COMMITTED"));
      if (first) {
        verifyWriter(waiter.output(), heldExpected, cell, d);
        exact(
          expectedWriter(heldExpected, cell, d),
          marker(waiter.output(), "SNAPSHOT:"),
        );
        exact(expectedWriter(heldExpected, cell, d), committed);
      } else {
        const opAfter = marker(waiter.output(), "SNAPSHOT:");
        const finalExpected = assertPublic(
          route,
          heldExpected,
          opAfter,
          marker(waiter.output(), "RESULT:"),
          windowNow(start),
        );
        exact(finalExpected, committed);
      }
    } else {
      assert.notEqual(wdone[0], 0);
      context.diagnostics = sessionDiagnostics(waiter.output());
      assert.deepEqual(context.diagnostics, [
        { code: "42501", message: denialFor(route) },
      ]);
      assert.ok(!/RESULT:|SNAPSHOT:|COMPLETED|COMMITTED/.test(waiter.output()));
      exact(expectedWriter(before, cell, d), committed);
    }
    context.settlement = "exact committed writer and public outcome verified";
    return {
      id: cell.id,
      partition: "actual-observed-wait-order",
      writer: d.classification,
      wait: projectedWait(wait),
      wait_phase:
        d.table === "auth.users"
          ? "Auth before membership"
          : "profile UPDATE before former-object DELETE",
      successful_wait_order_credit: true,
      full54_values_verified: true,
      before: sanitized(before),
      after: sanitized(committed),
      order: cell.order,
    };
  } catch (error) {
    failure = error;
    error.crossingResetForbidden = true;
    context.diagnostics = [
      ...sessionDiagnostics(holder?.output() ?? ""),
      ...sessionDiagnostics(waiter?.output() ?? ""),
    ];
    // Markers after COMMIT distinguish a committed survivor from two rollbacks.
    // No marker after a sent release is unknown settlement, never before==after.
    const committed = (s) =>
      s?.output().split("\n").includes("COMMITTED") ?? false;
    context.settlement =
      releaseSent && !committed(holder)
        ? "commit settlement unavailable; reset forbidden"
        : "pending owned close and survivor verification";
    recordFailure(error, context);
    throw error;
  } finally {
    try {
      await closeOwned([holder, waiter], failure);
    } finally {
      if (failure) {
        try {
          const hcommit =
            holder?.output().split("\n").includes("COMMITTED") ?? false;
          const wcommit =
            waiter?.output().split("\n").includes("COMMITTED") ?? false;
          if (releaseSent && !hcommit) throw new Error("unobserved settlement");
          if (
            releaseSent &&
            !wcommit &&
            !sessionDiagnostics(waiter?.output() ?? "").some((d) =>
              codes.has(d.code),
            )
          )
            throw new Error("unobserved waiter settlement");
          // Exact known backend names must be absent after owned close before
          // describing rollback. Direct child exit alone is insufficient.
          assert.equal(
            sql(
              `select count(*) from pg_stat_activity where application_name in(${quote(prefix + "_h")},${quote(prefix + "_w")})`,
            ),
            "0",
            "owned server session exit required",
          );
          let expected = structuredClone(before);
          // The holder always finishes its work before release; completed
          // writer changes and public additions are independently verified.
          if (hcommit) {
            const held = marker(holder.output(), "SNAPSHOT:");
            if (first)
              expected = assertPublic(
                route,
                before,
                held,
                marker(holder.output(), "RESULT:"),
                windowNow(start),
              );
            else {
              verifyWriter(holder.output(), before, cell, d);
              expected = expectedWriter(before, cell, d);
              exact(expected, held);
            }
          }
          if (wcommit) {
            if (first) {
              verifyWriter(waiter.output(), expected, cell, d);
              expected = expectedWriter(expected, cell, d);
            } else {
              const after = marker(waiter.output(), "SNAPSHOT:");
              expected = assertPublic(
                route,
                expected,
                after,
                marker(waiter.output(), "RESULT:"),
                windowNow(start),
              );
            }
          }
          exact(expected, census());
          context.settlement = {
            holder_committed: hcommit,
            waiter_committed: wcommit,
            full54_survivor_verified: true,
          };
        } catch (settlement) {
          context.settlement = "unavailable or mismatched; reset forbidden";
          if (settlement.crossingDifferences)
            failure.crossingDifferences = settlement.crossingDifferences;
        }
      }
    }
  }
}
async function serial(cell, route, d, before, context) {
  let owned, failure;
  try {
    owned = session(
      "xc_ser_" + caseIds(cell.id).request.replaceAll("-", "").slice(0, 24),
    );
    owned.send(
      `${bounds}begin;${d.sql}select 'SNAPSHOT:'||(${censusQuery})::text;commit;select 'COMMITTED';`,
    );
    owned.child.stdin.end();
    assert.equal((await owned.done)[0], 0);
    noErrors(owned);
    assert.ok(owned.output().split("\n").includes("COMMITTED"));
    verifyWriter(owned.output(), before, cell, d);
    exact(before, marker(owned.output(), "SNAPSHOT:"));
    exact(before, census());
    await currentRollback(
      route,
      context,
      caseIds(cell.id + ".serial-positive").request,
    );
    return {
      id: cell.id,
      partition: "serial-RLS-zero-rows",
      affected_rows: 0,
      full54_zero_delta: true,
      successful_wait_order_credit: false,
      current_rollback_positive: true,
      writer: d.classification,
    };
  } catch (error) {
    failure = error;
    context.diagnostics = sessionDiagnostics(owned?.output() ?? "");
    if (!error.crossingFailureRecorded) recordFailure(error, context);
    throw error;
  } finally {
    await closeOwned([owned], failure);
  }
}
async function retainedRecovery(route, context) {
  assert.equal(route.id, "CB");
  assert.equal(selectedLaterLane(route), "retained");
  const before = census();
  const result = JSON.parse(
    sql(
      `${bounds}begin;${auth(route.actor)}select to_jsonb(public.set_safety_block(${quote(route.peer)},true));commit;`,
    ),
  );
  assert.equal(result, true);
  exact(before, census());
  context.retained_classification =
    "lawful retained owned-block repair; no current-loss credit";
}
export function requireReviewedCrossingRelease() {
  throw new Error(
    "Crossings runtime refused before target contact: runner adoption, failed-child delivery, whole-module bounds, combined fixture ownership review and explicit exclusive serial release remain incomplete",
  );
}
export async function runCrossingFixtures() {
  requireReviewedCrossingRelease(); // Unconditional. No environment flag bypass.
  localTarget("current27");
  assertClean();
  let context, original;
  try {
    assert.equal(crossingManifest.length, 60);
    assert.equal(new Set(crossingManifest.map((c) => c.id)).size, 60);
    for (const cell of crossingManifest) {
      context = { id: cell.id, phase: "setup" };
      const clean = census(),
        start = clock(),
        actorPreference = cell.order === "operation-first" ? false : "absent";
      const route = prepare(
        routes.find((r) => r.id === cell.route),
        { caseKey: cell.id, actorPreference },
      );
      context.setup = assertCaseSetup(
        clean,
        census(),
        route,
        windowNow(start),
        actorPreference,
      );
      context.phase = "precheck";
      await currentRollback(route, context);
      const d = writerDefinition(cell, route);
      context.phase = "companion";
      await companion(cell, route, d, context);
      await currentRollback(
        route,
        context,
        caseIds(cell.id + ".companion-positive").request,
      );
      context.phase = cell.order === "serial" ? "serial" : "holder";
      // Prepare the raced public call independently of the preceding rollback
      // positive. Each claimed CB current operation gets its own public unblock.
      await freshCurrent(route);
      const before = census();
      const evidence =
        cell.order === "serial"
          ? await serial(cell, route, d, before, context)
          : await race(cell, route, d, before, context);
      if (cell.order !== "serial") {
        context.phase = "postcheck";
        if (route.id === "CB" && selectedLaterLane(route) === "retained")
          await retainedRecovery(route, context);
        await freshCurrent(route);
        if (cell.writer === "owner_primary_assignment") {
          const state = census(),
            profile = one(state, "public.profiles", "user_id", d.subject),
            object = one(state, "storage.objects", "id", d.secondId);
          assert.equal(profile.primary_photo_path, d.secondPath);
          assert.equal(object.name, d.secondPath);
          assert.equal(object.owner_id, d.subject);
          await currentRollback(
            route,
            context,
            caseIds(cell.id + ".new-primary-positive").request,
          );
        } else
          currentDenial(
            route,
            context,
            caseIds(cell.id + ".fresh-loss").request,
          );
      }
      console.log(
        JSON.stringify({
          ...evidence,
          retained_recovery: context.retained_classification ?? null,
        }),
      );
      context.phase = "reset";
      resetDisposable("current27");
      assertClean();
    }
  } catch (error) {
    original = error;
    // Evidence precedes cleanup. Any failure forbids automatic reset, including
    // proven client exit; that exit is not proof of server/descendant cleanup.
    if (!error.crossingFailureRecorded) recordFailure(error, context ?? {});
    // Emit post-close settlement separately; it does not replace the original
    // pre-cleanup failure or turn an abort into successful-order credit.
    console.error(
      JSON.stringify({
        id: context?.id ?? "withheld",
        partition: "post-close-failure-settlement",
        settlement: context?.settlement ?? "unavailable",
        cleanup_diagnostics: error.crossingCleanup ?? [],
        reset_forbidden: true,
        successful_wait_order_credit: false,
      }),
    );
    throw new Error(
      "Crossing failed and uncredited; private diagnostics withheld; reset forbidden",
      { cause: error },
    );
  } finally {
    if (!original) {
      resetDisposable("current27");
      assertClean();
    }
  }
}
// Pure authoring examples only. No SQL, sessions, guards, reset or target calls.
export function pureExpectedDeltaExamples() {
  assert.equal(crossingManifest.length, 60);
  assert.equal(crossingManifest.filter((c) => c.order === "serial").length, 12);
  assert.equal(new Set(crossingManifest.map((c) => c.id)).size, 60);
  const subject = "00000000-0000-4000-8000-000000000002";
  const base = Object.fromEntries(censusTables.map((t) => [t, []]));
  base["public.profiles"] = [
    {
      user_id: subject,
      primary_photo_path: photoPath(subject),
      revision: 1,
      is_complete: true,
      additional_photo_paths: [],
    },
  ];
  base["storage.objects"] = [
    { id: "old", name: photoPath(subject), owner_id: subject },
    { id: "new", name: `${subject}/22222222.png`, owner_id: subject },
  ];
  base["auth.users"] = [
    {
      id: subject,
      email: "fixture@unc.edu",
      email_confirmed_at: "2026-09-28T00:00:00Z",
      raw_user_meta_data: null,
      raw_app_meta_data: null,
    },
  ];
  base["public.university_memberships"] = [
    { user_id: subject, university_id: "campus" },
  ];
  const d = {
    subject,
    oldPath: photoPath(subject),
    secondPath: `${subject}/22222222.png`,
  };
  const assignment = expectedWriter(
    base,
    { writer: "owner_primary_assignment" },
    d,
  );
  assert.equal(assignment["public.profiles"][0].revision, 2);
  assert.equal(assignment["storage.objects"].length, 2);
  const detached = expectedWriter(
    base,
    { writer: "owner_primary_detach_delete" },
    d,
  );
  assert.equal(detached["public.profiles"][0].is_complete, false);
  assert.deepEqual(detached["storage.objects"], [base["storage.objects"][1]]);
  for (const writer of ["auth_confirmation_null", "auth_invalid_domain"]) {
    const loss = expectedWriter(base, { writer }, d);
    assert.deepEqual(loss["public.university_memberships"], []);
    assert.deepEqual(loss["public.profiles"], base["public.profiles"]);
  }
  for (const writer of [
    "owner_onboarding_off",
    "referenced_primary_protection",
  ])
    exact(base, expectedWriter(base, { writer }, d));
  const text = "00000000-0000-4000-8000-000000000099";
  const projected = privateDifferences(
    { narrative: text, raw_user_meta_data: { [text]: text } },
    { narrative: "private", raw_user_meta_data: { [text]: "private" } },
  );
  assert.ok(!JSON.stringify(projected).includes(text));
  assert.deepEqual(
    strictDiagnostic("Disposable SQL error: 42501: Safety report unavailable"),
    { code: "42501", message: "Safety report unavailable" },
  );
  assert.deepEqual(
    strictDiagnostic("private 42501: Safety report unavailable"),
    { classification: "unexpected-withheld" },
  );
  assert.deepEqual(
    strictDiagnostic("Disposable SQL error: 40P01: private UUID " + text),
    { code: "40P01", message: "operation failed" },
  );
  return {
    literal_allocations: 60,
    planned_actual_orders: 48,
    serial_controls: 12,
    pure_examples: "pass",
    runtime: "unexecuted",
  };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await runCrossingFixtures();
  } catch {
    process.stderr.write(
      "Crossings refused or failed; no runtime credit; reset/release incomplete.\n",
    );
    process.exitCode = 1;
  }
}
