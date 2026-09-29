// Static authoring checkpoint. Imports are inert; invocation refuses before contact.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { isDeepStrictEqual } from "node:util";
import { test } from "node:test";
import {
  sql,
  quote,
  session,
  until,
  localTarget,
  assertClean,
  resetDisposable,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  routes,
  prepare,
  caseIds,
  auth,
  query,
  census,
  censusQuery,
  censusTables,
  assertCurrentOnly,
  email,
  photoPath,
  campus,
  peerProofsQuery,
} from "./helpers/pilot-current-safety-fixtures.mjs";
import {
  bounds,
  assertCaseSetup,
} from "./pilot-admission-current-safety-concurrency.integration.mjs";

export const retryRateManifest = Object.freeze(
  [
    { id: "L1R.CH.same_key_wait", route: "CH", kind: "same_key_wait" },
    { id: "L1R.CH.normalized_replay", route: "CH", kind: "normalized_replay" },
    { id: "L1R.CH.category_mismatch", route: "CH", kind: "category_mismatch" },
    {
      id: "L1R.CH.narrative_mismatch",
      route: "CH",
      kind: "narrative_mismatch",
    },
    {
      id: "L1R.CH.input_target_mismatch",
      route: "CH",
      kind: "input_target_mismatch",
    },
    {
      id: "L1R.CH.caller_request_isolation",
      route: "CH",
      kind: "caller_request_isolation",
    },
    {
      id: "L1R.CH.fifth_sixth_replay",
      route: "CH",
      kind: "fifth_sixth_replay",
    },
    {
      id: "L1R.CH.clock_after_account_wait",
      route: "CH",
      kind: "clock_after_account_wait",
    },
    { id: "L1R.CP.same_key_wait", route: "CP", kind: "same_key_wait" },
    { id: "L1R.CP.normalized_replay", route: "CP", kind: "normalized_replay" },
    { id: "L1R.CP.category_mismatch", route: "CP", kind: "category_mismatch" },
    {
      id: "L1R.CP.narrative_mismatch",
      route: "CP",
      kind: "narrative_mismatch",
    },
    {
      id: "L1R.CP.input_target_mismatch",
      route: "CP",
      kind: "input_target_mismatch",
    },
    {
      id: "L1R.CP.caller_request_isolation",
      route: "CP",
      kind: "caller_request_isolation",
    },
    {
      id: "L1R.CP.fifth_sixth_replay",
      route: "CP",
      kind: "fifth_sixth_replay",
    },
    {
      id: "L1R.CP.clock_after_account_wait",
      route: "CP",
      kind: "clock_after_account_wait",
    },
    {
      id: "L1R.retained.mode_distinction",
      route: "CH",
      kind: "mode_distinction",
    },
    {
      id: "L1R.retained.reference_distinction",
      route: "CH",
      kind: "reference_distinction",
    },
  ].map((cell) => Object.freeze({ ...cell, status: "unexecuted" })),
);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hash = (v) =>
  createHash("sha256")
    .update(JSON.stringify(v) ?? "<absent>")
    .digest("hex");
// Additional owned slots are explicit and disjoint; the inherited eight-slot helper is unchanged.
const extraSlots = Object.freeze([
  "actor2",
  "source2",
  "opaqueTarget",
  "trimmedRequest",
  "guardRequest",
  "request1",
  "request2",
  "request3",
  "request4",
  "request5",
  "request6",
  "seedReport1",
  "seedReport2",
  "seedReport3",
  "seedReport4",
  "seedReport5",
  "seedRequest1",
  "seedRequest2",
  "seedRequest3",
  "seedRequest4",
  "seedRequest5",
]);
export function fixtureBindings(cell) {
  return Object.freeze(
    Object.fromEntries(
      extraSlots.map((slot) => {
        const h = createHash("sha256")
          .update(`TASK-021A1b3c:retry-rate:${cell.id}:${slot}`)
          .digest("hex");
        return [
          slot,
          `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`,
        ];
      }),
    ),
  );
}
// Parse the fractional six digits separately; Date is used only for whole seconds.
// Exact receipt comparisons always compare the untouched database strings as well.
export function timestampMicros(value) {
  const m =
    /^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|[+-]\d\d(?::?\d\d)?)$/.exec(
      value,
    );
  assert.ok(m, "bounded PostgreSQL timestamp syntax required");
  const zone =
    m[4] === "Z"
      ? "Z"
      : m[4].length === 3
        ? `${m[4]}:00`
        : m[4].length === 5
          ? `${m[4].slice(0, 3)}:${m[4].slice(3)}`
          : m[4];
  const seconds = Date.parse(`${m[1]}T${m[2]}${zone}`);
  assert.ok(
    Number.isSafeInteger(seconds),
    "valid whole-second timestamp required",
  );
  return BigInt(seconds) * 1000n + BigInt((m[3] ?? "").padEnd(6, "0"));
}
function boundTime(value, window) {
  const time = timestampMicros(value),
    start = timestampMicros(window.start),
    end = timestampMicros(window.end);
  assert.ok(
    end >= start && time >= start && time <= end,
    "microsecond server window required",
  );
  return value;
}
let lastWallMicros = null;
function observeClock(value) {
  const current = timestampMicros(value);
  assert.ok(
    lastWallMicros === null || current >= lastWallMicros,
    "backward database wall clock forbids credit",
  );
  lastWallMicros = current;
  return value;
}
const wall = () => observeClock(sql("select clock_timestamp()::text"));
export function inputFingerprint(route, options = {}) {
  const category = (options.category ?? "harassment").trim().toLowerCase();
  const narrative = options.narrative?.trim() || null;
  return createHash("md5")
    .update(
      `[${[route.mode, route.target, category, narrative].map((v) => JSON.stringify(v)).join(", ")}]`,
    )
    .digest("hex");
}
function valueSQL(route, options) {
  return `select 'RESULT:'||to_jsonb(q)::text from (${query(route, options).trim().replace(/;$/, "")}) q;`;
}
function operationSQL(route, options) {
  return `${auth(route.actor)}${valueSQL(route, options)}reset role;select 'SNAPSHOT:'||(${censusQuery})::text;`;
}
function marker(output, prefix) {
  const lines = output.split("\n").filter((line) => line.startsWith(prefix));
  assert.equal(lines.length, 1, "one exact private in-memory marker required");
  return JSON.parse(lines[0].slice(prefix.length));
}
function receiptShape(result, window) {
  assert.deepEqual(Object.keys(result).sort(), ["receipt_id", "submitted_at"]);
  assert.match(result.receipt_id, uuidPattern);
  if (window) boundTime(result.submitted_at, window);
  else timestampMicros(result.submitted_at);
}
function reportRows(route, result, options = {}) {
  return {
    report: {
      id: result.receipt_id,
      submitted_at: result.submitted_at,
      reporter_id: route.actor,
      target_type: route.mode === "hangout_host" ? "user" : route.mode,
      target_id: route.mode === "hangout_host" ? route.host : route.target,
      category: (options.category ?? "harassment").trim().toLowerCase(),
      narrative: options.narrative?.trim() || null,
      provenance_kind: route.provenance,
      provenance_ref_id: route.target,
    },
    ledger: {
      reporter_id: route.actor,
      request_id: options.request ?? route.request,
      input_fingerprint: inputFingerprint(route, options),
      report_id: result.receipt_id,
    },
  };
}
export function expectedAddition(
  before,
  after,
  route,
  result,
  options,
  window,
) {
  receiptShape(result, window);
  const { report, ledger } = reportRows(route, result, options);
  return exactSnapshot(before, after, {
    "private.safety_reports": [...before["private.safety_reports"], report],
    "private.safety_report_requests": [
      ...before["private.safety_report_requests"],
      ledger,
    ],
  });
}
function unchanged(before, after) {
  return verifiedOutcome({ result: true, expectedResult: true, before, after });
}
function added(before, after, route, result, options, window) {
  return verifiedOutcome({
    result,
    expectedResult: {
      receipt_id: result.receipt_id,
      submitted_at: result.submitted_at,
    },
    before,
    after,
    expectedAfter: expectedAddition(
      before,
      after,
      route,
      result,
      options,
      window,
    ),
  });
}
// Raw differences remain private until paths and original values are digested.
// Never hash the inherited walker's already-redacted placeholders.
const privateDifferences = Symbol("original raw full54 differences");
const originalFailure = Symbol("original private failure");
const tableNames = new Set(censusTables);
const knownCodes = new Set([
  "42501",
  "40P01",
  "40001",
  "57014",
  "55P03",
  "23503",
  "23514",
  "23505",
  "P0001",
]);
const neutralMessages = new Set([
  "Safety report unavailable",
  "Safety operation unavailable",
  "Hangout operation not permitted",
  "Hangout chat unavailable",
  "Moderation unavailable",
  "Pilot management unavailable",
]);
function knownDiagnostic(code, message) {
  if (!knownCodes.has(code)) return null;
  return {
    code,
    message:
      code === "42501" && neutralMessages.has(message) ? message : "<withheld>",
  };
}
export function parseSQLWrapper(message) {
  if (typeof message !== "string" || /[\r\n]/.test(message)) return [];
  const match = /^Disposable SQL error: ([A-Z0-9]{5}): ([^\r\n]*)$/.exec(
    message,
  );
  const diagnostic = match && knownDiagnostic(match[1], match[2]);
  return diagnostic ? [diagnostic] : [];
}
function diagnostics(output) {
  return output.split("\n").flatMap((line) => {
    const match = /^ERROR:\s+([A-Z0-9]{5}):[ \t]*([^\r\n]*)$/.exec(line);
    const diagnostic = match && knownDiagnostic(match[1], match[2]);
    return diagnostic ? [diagnostic] : [];
  });
}
function valueType(value) {
  return value === null
    ? "null"
    : Array.isArray(value)
      ? "array"
      : typeof value;
}
function valueDigest(value, present) {
  return createHash("sha256")
    .update(JSON.stringify({ present, type: valueType(value), value }))
    .digest("hex");
}
function safeSegment(key, array, root) {
  if (array && /^(0|[1-9]\d*)$/.test(key)) return `[${key}]`;
  if (root && tableNames.has(key)) return `[${JSON.stringify(key)}]`;
  return `[key-sha256:${createHash("sha256").update(key).digest("hex")}]`;
}
export function structuralDifferences(expected, actual) {
  const rows = [];
  function walk(e, a, path, ep = true, ap = true, root = false) {
    if (ep === ap && isDeepStrictEqual(e, a)) return;
    if (
      ep &&
      ap &&
      e !== null &&
      a !== null &&
      typeof e === "object" &&
      typeof a === "object" &&
      Array.isArray(e) === Array.isArray(a)
    ) {
      const keys = new Set([...Object.keys(e), ...Object.keys(a)]);
      if (Array.isArray(e) && e.length !== a.length)
        rows.push({
          path: `${path}.length`,
          expected: e.length,
          actual: a.length,
          expectedPresent: true,
          actualPresent: true,
        });
      for (const key of keys)
        walk(
          e[key],
          a[key],
          `${path}${safeSegment(key, Array.isArray(e), root)}`,
          Object.hasOwn(e, key),
          Object.hasOwn(a, key),
        );
    } else
      rows.push({
        path,
        expected: e,
        actual: a,
        expectedPresent: ep,
        actualPresent: ap,
      });
  }
  walk(expected, actual, "$", true, true, true);
  return rows;
}
export function safeDifferenceReceipt(rows) {
  return rows.map((row) => ({
    path: row.path,
    expected_present: row.expectedPresent,
    actual_present: row.actualPresent,
    expected_type: valueType(row.expected),
    actual_type: valueType(row.actual),
    expected_sha256: valueDigest(row.expected, row.expectedPresent),
    actual_sha256: valueDigest(row.actual, row.actualPresent),
  }));
}
function mismatch(expected, actual) {
  const error = new Error("Exact full54 outcome mismatch");
  Object.defineProperty(error, privateDifferences, {
    value: structuralDifferences(expected, actual),
  });
  return error;
}
function exactSnapshot(before, after, replacements) {
  const expected = structuredClone(before);
  for (const [table, rows] of Object.entries(replacements)) {
    if (rows.length !== after[table].length)
      throw mismatch({ [table]: rows }, { [table]: after[table] });
    const used = new Set();
    expected[table] = after[table].map((actual) => {
      const index = rows.findIndex(
        (row, i) => !used.has(i) && isDeepStrictEqual(row, actual),
      );
      if (index < 0)
        throw mismatch({ [table]: rows }, { [table]: after[table] });
      used.add(index);
      return rows[index];
    });
  }
  return expected;
}
function verifiedOutcome(input) {
  const expected = input.expectedAfter ?? input.before;
  for (const snapshot of [input.before, input.after, expected])
    assert.deepEqual(Object.keys(snapshot).sort(), censusTables.slice().sort());
  if (!isDeepStrictEqual(expected, input.after))
    throw mismatch(expected, input.after);
  // Preserve strict actual comparisons; diagnostic hashing never supplies equality.
  assert.deepEqual(input.after, expected);
  assert.deepEqual(input.result, input.expectedResult);
  return { full54_values_verified: true };
}
export function failureReceipt(error, context, snapshot = null) {
  const wrapped = parseSQLWrapper(error.message);
  const available = (error.sqlDiagnostics ?? []).flatMap((row) => {
    const diagnostic = knownDiagnostic(row.code, row.message);
    return diagnostic ? [diagnostic] : [];
  });
  // A failure class is never evidence of settled owned exits. Every failed
  // cell conservatively stops for fresh recovery review; deny() separately
  // handles the exact expected neutral denial plus full54 zero delta.
  error.cleanupIncomplete = true;
  return {
    id: context.id,
    phase: context.phase,
    partition: "failed-no-success-credit",
    observed_wait_credit: 0,
    reset_forbidden: Boolean(error.cleanupIncomplete),
    original_error_preserved: true,
    lock_observation: context.observation ?? null,
    diagnostics: [...available, ...wrapped].filter(
      (row, index, rows) =>
        rows.findIndex((other) => isDeepStrictEqual(row, other)) === index,
    ),
    differences: safeDifferenceReceipt(error[privateDifferences] ?? []),
    table_summaries: snapshot
      ? Object.fromEntries(
          censusTables.map((t) => [
            t,
            { count: snapshot[t].length, sha256: hash(snapshot[t]) },
          ]),
        )
      : null,
    private_assertion_details_withheld: true,
    private_difference_precision: error[privateDifferences]
      ? "original-raw-values-digested"
      : error.preciseDifferences
        ? "inherited-original-values-unavailable"
        : "no-owned-raw-difference",
  };
}
function recordFailure(error, context) {
  if (error.failureRecorded) return;
  let snapshot;
  try {
    snapshot = census();
  } catch (cause) {
    error.sqlDiagnostics = [
      ...(error.sqlDiagnostics ?? []),
      ...parseSQLWrapper(cause.message),
    ];
    error.cleanupIncomplete = true;
  }
  console.error(JSON.stringify(failureReceipt(error, context, snapshot)));
  error.failureRecorded = true;
}
// Pure exit assessment. Actual serial/wait cleanup passes no expected-denial
// proof, so every actual nonzero exit is unaccepted. The conditional branch
// exists for inert examples of an independently established exact denial.
export function certifyOwnedExit(exit, output, expectedDenialProof = null) {
  try {
    assert.ok(
      Array.isArray(exit) &&
        exit.length === 2 &&
        Number.isInteger(exit[0]) &&
        exit[1] === null,
      "settled normal owned exit required",
    );
    assert.equal(
      typeof output,
      "string",
      "available owned transcript required",
    );
    const errorLines = output
      .split("\n")
      .filter((line) => line.includes("ERROR:"));
    if (exit[0] === 0) {
      assert.equal(
        errorLines.length,
        0,
        "successful normal exit cannot carry an ERROR",
      );
      return { partition: "normal-zero-exit", certified: true };
    }
    assert.deepEqual(
      expectedDenialProof,
      {
        code: "42501",
        message: "Safety report unavailable",
        full54_zero_delta_verified: true,
      },
      "explicit exact denial and independent zero-delta proof required",
    );
    assert.equal(
      errorLines.length,
      1,
      "one complete expected denial diagnostic required",
    );
    assert.match(
      errorLines[0],
      /^ERROR:[ \t]+42501:[ \t]*Safety report unavailable$/,
    );
    assert.deepEqual(diagnostics(output), [
      { code: "42501", message: "Safety report unavailable" },
    ]);
    assert.doesNotMatch(
      output,
      /(?:RESULT:|COMPLETED)/,
      "denial transcript cannot claim success",
    );
    return { partition: "explicit-expected-denial", certified: true };
  } catch (error) {
    error.cleanupIncomplete = true;
    error.sqlDiagnostics =
      typeof output === "string" ? diagnostics(output) : [];
    throw error;
  }
}
export function assertOwnedSuccess(exit, output, prefixes) {
  try {
    certifyOwnedExit(exit, output);
    assert.deepEqual(diagnostics(output), []);
    assert.doesNotMatch(
      output,
      /ERROR:/,
      "any unaccepted SQL diagnostic forbids success",
    );
    assert.equal(
      output.split("\n").filter((line) => line === "COMPLETED").length,
      1,
      "complete successful transaction transcript required",
    );
    for (const prefix of prefixes) marker(output, prefix);
  } catch (error) {
    // Do this before any AssertionError escapes to the reset-safe partition.
    error.cleanupIncomplete = true;
    error.sqlDiagnostics =
      typeof output === "string" ? diagnostics(output) : [];
    throw error;
  }
}
async function closeOwned(owned, error, context) {
  const settled = await Promise.all(
    owned.filter(Boolean).map(async (session) => {
      // Close initiates bounded rollback/EOF; BOTH closure and done must settle.
      // Inherited close alone is insufficient for an ordinary nonzero exit.
      const [closure, done] = await Promise.allSettled([
        Promise.resolve().then(() => session.close()),
        Promise.resolve().then(() => session.done),
      ]);
      let output = "",
        certification;
      try {
        output = session.output();
        if (closure.status !== "fulfilled" || done.status !== "fulfilled")
          throw new Error("Owned settlement incomplete");
        certification = certifyOwnedExit(done.value, output);
      } catch (cause) {
        cause.cleanupIncomplete = true;
        return {
          certified: false,
          diagnostics: typeof output === "string" ? diagnostics(output) : [],
          unexpected_error_available:
            typeof output === "string" && output.includes("ERROR:"),
        };
      }
      return { ...certification, diagnostics: [] };
    }),
  );
  if (settled.some((result) => !result.certified)) {
    const failure = error ?? new Error("Owned cleanup incomplete");
    failure.cleanupIncomplete = true;
    // Preserve original diagnostics; closure has its own finite safe receipt.
    console.error(
      JSON.stringify({
        id: context.id,
        phase: context.phase,
        partition: "owned-exit-unproven",
        reset_forbidden: true,
        original_error_preserved: Boolean(error),
        cleanup_diagnostics: settled.flatMap((result) => result.diagnostics),
        unexpected_error_available: settled.some(
          (result) => result.unexpected_error_available,
        ),
      }),
    );
    throw failure;
  }
}
let applicationSequence = 0;
function applicationName(cell, suffix) {
  const name = `b3crr_${hash(cell.id).slice(0, 16)}_${++applicationSequence}_${suffix}`;
  assert.ok(Buffer.byteLength(name) <= 63);
  return name;
}
async function serial(
  cell,
  route,
  context,
  options = {},
  rollback = false,
  original = null,
) {
  let owned, error;
  const start = wall();
  try {
    owned = session(applicationName(cell, "s"));
    owned.send(
      `${bounds}begin;${operationSQL(route, options)}${rollback ? "rollback" : "commit"};select 'COMPLETED';`,
    );
    owned.child.stdin.end();
    const exit = await owned.done;
    assertOwnedSuccess(exit, owned.output(), ["RESULT:", "SNAPSHOT:"]);
    const end = wall(),
      result = marker(owned.output(), "RESULT:"),
      snapshot = marker(owned.output(), "SNAPSHOT:");
    receiptShape(result, original ? null : { start, end });
    if (original)
      assert.deepEqual(
        result,
        original,
        "exact original receipt/time string required",
      );
    return { result, snapshot, window: { start, end } };
  } catch (cause) {
    error = cause;
    error.sqlDiagnostics = diagnostics(owned?.output() ?? "");
    recordFailure(error, context);
    throw error;
  } finally {
    await closeOwned([owned], error, context);
  }
}
async function submit(cell, route, context, options = {}, rollback = false) {
  const before = census();
  const observed = await serial(cell, route, context, options, rollback);
  added(
    before,
    observed.snapshot,
    route,
    observed.result,
    options,
    observed.window,
  );
  if (rollback) unchanged(before, census());
  else unchanged(observed.snapshot, census());
  return observed.result;
}
async function replay(cell, route, context, original, options = {}) {
  const before = census(),
    observed = await serial(cell, route, context, options, false, original);
  assert.deepEqual(
    observed.result,
    original,
    "exact original immutable receipt and timestamp string required",
  );
  // Replay timestamps are checked against the exact original, not the new call window.
  unchanged(before, observed.snapshot);
  unchanged(before, census());
}
function deny(route, context, options = {}) {
  const before = census();
  let caught;
  try {
    sql(`${bounds}begin;${auth(route.actor)}${query(route, options)}commit;`);
  } catch (error) {
    caught = error;
  }
  if (
    !caught ||
    caught.message !== "Disposable SQL error: 42501: Safety report unavailable"
  ) {
    const failure = caught ?? new Error("Expected neutral denial absent");
    recordFailure(failure, context);
    throw failure;
  }
  unchanged(before, census());
}
function countAt(route, clock, expected) {
  assert.equal(
    sql(
      `select count(*) from private.safety_reports where reporter_id=${quote(route.actor)} and submitted_at between ${quote(clock)}::timestamptz-interval '1 hour' and ${quote(clock)}::timestamptz`,
    ),
    String(expected),
  );
}
async function guard(cell, route, context, slots) {
  assertCurrentOnly(route);
  assert.equal(
    census()["private.pilot_capabilities"].find((r) => r.key === "onboarding")
      .enabled,
    false,
  );
  await submit(cell, route, context, { request: slots.guardRequest }, true);
  assertCurrentOnly(route);
}
function qualifyTimes(clean, snapshot, window) {
  for (const [table, rows] of Object.entries(snapshot))
    for (const row of rows) {
      if (clean[table].some((old) => hash(old) === hash(row))) continue;
      // Existing policy timestamps are immutable anchors, not setup-generated fields.
      if (
        table === "private.pilot_availability" ||
        table === "private.pilot_capabilities"
      )
        continue;
      for (const [key, value] of Object.entries(row)) {
        if (key === "starts_at") {
          const tick = timestampMicros(value) - 86400000000n;
          assert.ok(
            tick >= timestampMicros(window.start) &&
              tick <= timestampMicros(window.end),
          );
        } else if (key.endsWith("_at") && typeof value === "string")
          boundTime(value, window);
      }
    }
  assert.ok(timestampMicros(window.end) >= timestampMicros(window.start));
}
function addActor(route, actor, context) {
  const before = census(),
    start = wall();
  sql(`${bounds}begin;insert into auth.users(id,email,email_confirmed_at) values(${quote(actor)},${quote(email(actor))},now());
    insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',${quote(photoPath(actor))},${quote(actor)});
    update public.profiles set real_name='Current safety fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path=${quote(photoPath(actor))} where user_id=${quote(actor)};
    insert into private.pilot_account_admission(account_id,state,revision) values(${quote(actor)},'active',1);commit;`);
  const after = census(),
    window = { start, end: wall() };
  const one = (table, key) => {
    const rows = after[table].filter((r) => r[key] === actor);
    assert.equal(rows.length, 1);
    return rows[0];
  };
  const stamp = (table, key, field) =>
    boundTime(one(table, key)[field], window);
  const object = after["storage.objects"].filter(
    (r) => r.name === photoPath(actor),
  );
  assert.equal(object.length, 1);
  assert.match(object[0].id, uuidPattern);
  assert.equal(object[0].owner_id, actor);
  assert.equal(object[0].bucket_id, "profile-photos");
  const anchor = {
    id: object[0].id,
    name: photoPath(actor),
    owner_id: actor,
    bucket_id: "profile-photos",
  };
  for (const [field, value] of Object.entries(object[0]))
    if (!Object.hasOwn(anchor, field))
      anchor[field] =
        field.endsWith("_at") && value !== null
          ? boundTime(value, window)
          : structuredClone(value);
  const rows = {
    "auth.users": {
      id: actor,
      email: email(actor),
      email_confirmed_at: stamp("auth.users", "id", "email_confirmed_at"),
      deleted_at: null,
      raw_user_meta_data: null,
      raw_app_meta_data: null,
    },
    "public.accounts": {
      id: actor,
      status: "active",
      created_at: stamp("public.accounts", "id", "created_at"),
    },
    "public.profiles": {
      user_id: actor,
      real_name: "Current safety fixture",
      graduation_year: 2028,
      major: "Math",
      bio: "Local",
      primary_photo_path: photoPath(actor),
      is_complete: true,
      created_at: stamp("public.profiles", "user_id", "created_at"),
      interests: [],
      down_to_do: [],
      favorite_music: null,
      favorite_foods: null,
      weird_fact: null,
      prompts: [],
      instagram: null,
      additional_photo_paths: [],
      revision: 1,
    },
    "public.university_memberships": {
      user_id: actor,
      university_id: campus,
      verified_at: one("auth.users", "id").email_confirmed_at,
      verification_email: email(actor),
      created_at: stamp(
        "public.university_memberships",
        "user_id",
        "created_at",
      ),
    },
    "private.pilot_account_admission": {
      account_id: actor,
      state: "active",
      revision: 1,
      created_at: stamp(
        "private.pilot_account_admission",
        "account_id",
        "created_at",
      ),
      updated_at: stamp(
        "private.pilot_account_admission",
        "account_id",
        "updated_at",
      ),
    },
    "storage.objects": anchor,
  };
  unchangedExpected(
    before,
    after,
    Object.fromEntries(
      Object.entries(rows).map(([t, r]) => [t, [...before[t], r]]),
    ),
  );
  const other = {
    ...route,
    actor,
    subject: actor,
    subjects:
      route.id === "CH"
        ? { actor, immutable_host: route.host }
        : { actor, peer: route.peer },
  };
  assertCurrentOnly(other);
  assert.equal(
    after["private.people_preferences"].some((r) => r.account_id === actor),
    false,
  );
  if (route.id === "CP")
    assert.ok(
      Object.values(JSON.parse(sql(peerProofsQuery(other)))).every(
        (v) => v === false,
      ),
    );
  context.extra_actor_provider_anchor_qualified = true;
  return other;
}
function unchangedExpected(before, after, replacements) {
  return verifiedOutcome({
    result: true,
    expectedResult: true,
    before,
    after,
    expectedAfter: exactSnapshot(before, after, replacements),
  });
}
function retainedSetup(route, slots, second) {
  const before = census(),
    start = wall();
  const times = JSON.parse(
    sql(
      "select jsonb_build_object('joined',clock_timestamp()-interval '2 hours','left',clock_timestamp()-interval '90 minutes')",
    ),
  );
  assert.ok(timestampMicros(times.joined) < timestampMicros(times.left));
  const parent = before["public.hangouts"][0];
  assert.ok(
    timestampMicros(times.left) <
      timestampMicros(before["public.hangout_participants"][0].joined_at),
  );
  sql(`${bounds}begin;insert into public.hangout_participants(hangout_id,account_id,state,joined_at,left_at,updated_at)
    values(${quote(route.source)},${quote(route.actor)},'left',${quote(times.joined)},${quote(times.left)},${quote(times.left)});
    ${
      second
        ? `insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude) values(${quote(slots.source2)},${quote(route.host)},${quote(campus)},'Undisclosed fixture',${quote(parent.starts_at)},'Approximate',35.91,-79.05);
    insert into public.hangout_participants(hangout_id,account_id,state,joined_at) values(${quote(slots.source2)},${quote(route.host)},'joined',${quote(before["public.hangout_participants"][0].joined_at)});
    insert into public.hangout_participants(hangout_id,account_id,state,joined_at,left_at,updated_at) values(${quote(slots.source2)},${quote(route.actor)},'left',${quote(times.joined)},${quote(times.left)},${quote(times.left)});`
        : ""
    }commit;`);
  const after = census(),
    window = { start, end: wall() };
  const participant = (source) => ({
    hangout_id: source,
    account_id: route.actor,
    state: "left",
    joined_at: times.joined,
    left_at: times.left,
    removed_at: null,
    updated_at: times.left,
  });
  const replacements = {
    "public.hangout_participants": [
      ...before["public.hangout_participants"],
      participant(route.source),
    ],
  };
  if (second) {
    const row = after["public.hangouts"].find((r) => r.id === slots.source2),
      host = after["public.hangout_participants"].find(
        (r) => r.hangout_id === slots.source2 && r.account_id === route.host,
      );
    assert.ok(row && host);
    replacements["public.hangouts"] = [
      ...before["public.hangouts"],
      {
        ...parent,
        id: slots.source2,
        created_at: boundTime(row.created_at, window),
        updated_at: boundTime(row.updated_at, window),
      },
    ];
    replacements["public.hangout_participants"].push(
      participant(slots.source2),
      {
        hangout_id: slots.source2,
        account_id: route.host,
        state: "joined",
        joined_at: before["public.hangout_participants"][0].joined_at,
        left_at: null,
        removed_at: null,
        updated_at: boundTime(host.updated_at, window),
      },
    );
  }
  unchangedExpected(before, after, replacements);
  assert.deepEqual(after["private.hangout_peer_provenance"], []);
  assert.equal(
    sql(
      `select kind||':'||ref_id from private.safety_report_peer_source(${quote(route.actor)},${quote(route.host)})`,
    ),
    `hangout_host:${[route.source, ...(second ? [slots.source2] : [])].sort()[0]}`,
  );
  return { ...route, mode: "hangout_host", provenance: "retained_host" };
}
function observationSQL(holder, waiter, condition) {
  return `select jsonb_build_object('holder_pid',h.pid,'waiter_pid',w.pid,'blocking_pids',pg_blocking_pids(w.pid),'clock',clock_timestamp()::text,'locks',(select jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,'relation',l.relation::regclass::text,'classid',l.classid,'objid',l.objid,'objsubid',l.objsubid)) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity h join pg_stat_activity w on w.application_name=${quote(waiter)} where h.application_name=${quote(holder)} and h.pid<>w.pid and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and ${condition}`;
}
async function waitPair(
  cell,
  route,
  context,
  { expiry = null, seeds = null } = {},
) {
  let holder, waiter, error;
  const before = census(),
    start = wall(),
    hname = applicationName(cell, "h"),
    wname = applicationName(cell, "w");
  try {
    holder = session(hname);
    waiter = session(wname);
    const holderStarted = performance.now();
    holder.send(
      `${bounds}begin;${expiry ? `select 'ACCOUNT_LOCKED:'||id::text from public.accounts where id=${quote(route.actor)} for update;select 'SNAPSHOT:'||(${censusQuery})::text;` : operationSQL(route, {})}select 'HELD';`,
    );
    await until(() => holder.output().split("\n").includes("HELD"));
    const held = marker(holder.output(), "SNAPSHOT:");
    if (expiry) {
      assert.equal(
        holder
          .output()
          .split("\n")
          .filter((line) => line.startsWith("ACCOUNT_LOCKED:"))
          .join(""),
        `ACCOUNT_LOCKED:${route.actor}`,
      );
      unchanged(before, held);
    } else
      added(
        before,
        held,
        route,
        marker(holder.output(), "RESULT:"),
        {},
        { start, end: wall() },
      );
    context.phase = expiry
      ? "account-share-wait-before-expiry"
      : "same-key-social-wait";
    const waiterStarted = performance.now();
    waiter.send(
      `${bounds}begin;${operationSQL(route, {})}commit;select 'COMPLETED';`,
    );
    const condition = expiry
      ? "exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted and l.locktype='transactionid' and l.mode='ShareLock' and l.transactionid=h.backend_xid)"
      : "exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted and l.locktype='advisory' and l.classid=16016 and l.objid=1 and l.objsubid=2 and l.mode='ExclusiveLock')";
    const probe = observationSQL(hname, wname, condition);
    let observed;
    await until(() => {
      const raw = sql(probe);
      if (raw && raw !== "null") {
        observed = JSON.parse(raw);
        return true;
      }
      return false;
    });
    context.observation = observed;
    observeClock(observed.clock);
    assert.ok(observed.blocking_pids.includes(observed.holder_pid));
    assert.notEqual(observed.holder_pid, observed.waiter_pid);
    if (expiry) {
      assert.ok(
        timestampMicros(observed.clock) < timestampMicros(expiry),
        "actual account SHARE wait observed before boundary required",
      );
      countAt(route, observed.clock, 5);
      let previous = timestampMicros(observed.clock),
        releasedAt;
      const deadline = performance.now() + 6000;
      for (let n = 0; n < 240 && performance.now() < deadline; n++) {
        const raw = sql(probe);
        assert.ok(
          raw && raw !== "null",
          "same held wait must persist across boundary",
        );
        const now = JSON.parse(raw),
          tick = timestampMicros(now.clock);
        assert.equal(now.holder_pid, observed.holder_pid);
        assert.equal(now.waiter_pid, observed.waiter_pid);
        assert.ok(
          tick >= previous,
          "backward database wall clock forbids credit",
        );
        previous = tick;
        observeClock(now.clock);
        if (tick > timestampMicros(expiry) + 100000n) {
          releasedAt = now.clock;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      assert.ok(
        releasedAt && performance.now() < deadline,
        "finite post-boundary wall-clock observation required",
      );
      assert.ok(
        timestampMicros(releasedAt) < timestampMicros(expiry) + 1000000n,
        "release within one-second boundary margin required",
      );
      context.observation.after_boundary_clock = releasedAt;
      countAt(route, releasedAt, 4);
      unchanged(before, census());
    }
    const releaseClock = wall();
    assert.ok(
      performance.now() - holderStarted < 14000 &&
        performance.now() - waiterStarted < 9000,
      "release before idle/lock deadlines required",
    );
    if (expiry)
      assert.ok(
        timestampMicros(releaseClock) > timestampMicros(expiry) + 100000n &&
          timestampMicros(releaseClock) < timestampMicros(expiry) + 1000000n,
        "actual release clock within finite boundary margin required",
      );
    holder.send("commit;select 'COMPLETED';");
    holder.child.stdin.end();
    waiter.child.stdin.end();
    const exits = await Promise.all([holder.done, waiter.done]);
    assertOwnedSuccess(
      exits[0],
      holder.output(),
      expiry ? ["SNAPSHOT:"] : ["RESULT:", "SNAPSHOT:"],
    );
    assertOwnedSuccess(exits[1], waiter.output(), ["RESULT:", "SNAPSHOT:"]);
    const result = marker(waiter.output(), "RESULT:"),
      after = marker(waiter.output(), "SNAPSHOT:"),
      end = wall();
    if (expiry) {
      assert.ok(timestampMicros(result.submitted_at) > timestampMicros(expiry));
      assert.ok(
        timestampMicros(result.submitted_at) >= timestampMicros(releaseClock),
        "source sampled clock after held wait release required",
      );
      added(before, after, route, result, {}, { start, end });
      for (const seed of seeds)
        assert.deepEqual(
          after["private.safety_reports"].find((r) => r.id === seed.report.id),
          seed.report,
        );
    } else {
      const original = marker(holder.output(), "RESULT:");
      assert.deepEqual(
        result,
        original,
        "same-key byte-equivalent receipt/time required",
      );
      added(before, after, route, result, {}, { start, end });
    }
    unchanged(after, census());
    return result;
  } catch (cause) {
    error = cause;
    error.sqlDiagnostics = [
      ...diagnostics(holder?.output() ?? ""),
      ...diagnostics(waiter?.output() ?? ""),
    ];
    recordFailure(error, context);
    throw error;
  } finally {
    await closeOwned([holder, waiter], error, context);
  }
}
function seedExpiry(route, slots) {
  const before = census();
  const anchors = JSON.parse(
    sql(
      "select jsonb_build_object('t',clock_timestamp()::text,'recent',clock_timestamp()-interval '10 minutes','expiring',clock_timestamp()-interval '1 hour'+interval '6 seconds')",
    ),
  );
  observeClock(anchors.t);
  const expiry = sql(
    `select (${quote(anchors.expiring)}::timestamptz+interval '1 hour')::text`,
  );
  assert.ok(
    timestampMicros(expiry) > timestampMicros(anchors.t) + 5900000n &&
      timestampMicros(expiry) < timestampMicros(anchors.t) + 6100000n,
  );
  const requestIDs = [
    slots.seedRequest1,
    slots.seedRequest2,
    slots.seedRequest3,
    slots.seedRequest4,
    slots.seedRequest5,
  ];
  const reportIDs = [
    slots.seedReport1,
    slots.seedReport2,
    slots.seedReport3,
    slots.seedReport4,
    slots.seedReport5,
  ];
  const seeds = reportIDs.map((id, index) =>
    reportRows(
      route,
      {
        receipt_id: id,
        submitted_at: index === 4 ? anchors.expiring : anchors.recent,
      },
      { request: requestIDs[index] },
    ),
  );
  sql(
    `${bounds}begin;${seeds.map(({ report, ledger }) => `insert into private.safety_reports select * from jsonb_populate_record(null::private.safety_reports,${quote(JSON.stringify(report))}::jsonb);insert into private.safety_report_requests select * from jsonb_populate_record(null::private.safety_report_requests,${quote(JSON.stringify(ledger))}::jsonb);`).join("")}commit;`,
  );
  const after = census();
  unchangedExpected(before, after, {
    "private.safety_reports": [
      ...before["private.safety_reports"],
      ...seeds.map((s) => s.report),
    ],
    "private.safety_report_requests": [
      ...before["private.safety_report_requests"],
      ...seeds.map((s) => s.ledger),
    ],
  });
  const initial = wall();
  assert.ok(
    timestampMicros(initial) < timestampMicros(expiry),
    "initial five-report qualification before boundary required",
  );
  countAt(route, initial, 5);
  return { expiry, seeds };
}
// Committed pure examples. Explicit invocation performs only memory operations
// and mock session closure; it never invokes a fixture suite or target guard.
export async function runRetryRateInertExamples() {
  const privateKey = "unknown-auth-provider-key-with-private-uuid-5a5a";
  const expected = {
    "auth.users": [
      {
        [privateKey]: "11111111-1111-4111-8111-111111111111",
        secret: "private-secret-one",
      },
    ],
  };
  const actual = {
    "auth.users": [
      {
        [privateKey]: "22222222-2222-4222-8222-222222222222",
        secret: "private-secret-two",
      },
    ],
  };
  const raw = structuralDifferences(expected, actual);
  const receipt = safeDifferenceReceipt(raw),
    rendered = JSON.stringify(receipt);
  assert.equal(raw.length, 2);
  assert.doesNotMatch(
    rendered,
    /unknown-auth-provider|11111111|22222222|private-secret|"secret"/,
  );
  assert.ok(
    receipt.every(
      (row) =>
        row.expected_type === "string" &&
        row.actual_type === "string" &&
        row.expected_sha256 !== row.actual_sha256,
    ),
  );
  assert.match(rendered, /key-sha256:/);
  assert.deepEqual(
    parseSQLWrapper("Disposable SQL error: 42501: Safety report unavailable"),
    [{ code: "42501", message: "Safety report unavailable" }],
  );
  assert.deepEqual(
    parseSQLWrapper("Disposable SQL error: 40P01: operation failed"),
    [{ code: "40P01", message: "<withheld>" }],
  );
  for (const message of [
    "prefix Disposable SQL error: 42501: Safety report unavailable",
    "Disposable SQL error: 42501: Safety report unavailable\n",
    "Disposable SQL error: 40P01: hidden\rdata",
    "Disposable SQL error: ZZZZZ: private",
    "Disposable SQL error: 42501",
    "Disposable SQL error: 42501: private\nDisposable SQL error: 40P01: private",
  ])
    assert.deepEqual(parseSQLWrapper(message), []);
  const complete = 'RESULT:{"receipt_id":"opaque"}\nSNAPSHOT:{}\nCOMPLETED\n';
  const scenarios = [
    { exit: [3, null], output: complete },
    { exit: [null, null], output: complete },
    { exit: [0, null], output: 'RESULT:{"receipt_id":"opaque"}\nSNAPSHOT:{' },
    { exit: [0, null], output: complete + "ERROR: ZZZZZ: private\n" },
  ];
  let closed = 0;
  for (const scenario of scenarios) {
    const mock = {
      done: Promise.resolve(scenario.exit),
      output: () => scenario.output,
      close: async () => {
        closed++;
      },
    };
    let original;
    try {
      assertOwnedSuccess(await mock.done, mock.output(), [
        "RESULT:",
        "SNAPSHOT:",
      ]);
    } catch (error) {
      original = error;
    }
    assert.ok(original && original.cleanupIncomplete);
    const failure = failureReceipt(original, {
      id: "<inert>",
      phase: "mock-exit",
    });
    assert.equal(failure.reset_forbidden, true);
    assert.equal(failure.original_error_preserved, true);
    if (scenario.exit[0] !== 0 || scenario.output.includes("ERROR:"))
      await assert.rejects(
        closeOwned([mock], original, { id: "<inert>", phase: "mock-close" }),
        (error) => error === original && error.cleanupIncomplete,
      );
    else
      await closeOwned([mock], original, {
        id: "<inert>",
        phase: "mock-close",
      });
    assert.equal(original.cleanupIncomplete, true);
  }
  assert.equal(closed, scenarios.length);
  const original = new Error("private original failure");
  original.cleanupIncomplete = true;
  original.sqlDiagnostics = [{ code: "40P01", message: "<withheld>" }];
  const priorDiagnostic = failureReceipt(original, {
    id: "<inert>",
    phase: "mock-before-cleanup",
  }).diagnostics;
  await assert.rejects(
    closeOwned(
      [
        {
          done: Promise.resolve([0, null]),
          output: () => "",
          close: async () => {
            throw new Error("private cleanup failure");
          },
        },
      ],
      original,
      { id: "<inert>", phase: "mock-cleanup-failure" },
    ),
    (error) => error === original && error.cleanupIncomplete,
  );
  assert.deepEqual(
    failureReceipt(original, { id: "<inert>", phase: "mock-after-cleanup" })
      .diagnostics,
    priorDiagnostic,
  );
  // Exceptional serial and wait paths must assess settlement even when the
  // successful exit check was skipped by the original lost-wait assertion.
  for (const phase of ["mock-serial-lost-wait", "mock-wait-lost-wait"]) {
    for (const [exit, output] of [
      [[3, null], ""],
      [[0, null], "ERROR: ZZZZZ: unknown private data\n"],
    ]) {
      let first;
      try {
        assert.ok(false, "lost wait");
      } catch (error) {
        first = error;
      }
      first.sqlDiagnostics = [{ code: "40P01", message: "<withheld>" }];
      const prior = failureReceipt(first, { id: "<inert>", phase }).diagnostics;
      const abnormal = {
        done: Promise.resolve(exit),
        output: () => output,
        close: async () => {},
      };
      const normal = {
        done: Promise.resolve([0, null]),
        output: () => "",
        close: async () => {},
      };
      const owned =
        phase === "mock-wait-lost-wait" ? [normal, abnormal] : [abnormal];
      await assert.rejects(
        closeOwned(owned, first, { id: "<inert>", phase }),
        (error) => error === first && error.cleanupIncomplete,
      );
      assert.deepEqual(
        failureReceipt(first, { id: "<inert>", phase }).diagnostics,
        prior,
      );
    }
    await closeOwned(
      [
        {
          done: Promise.resolve([0, null]),
          output: () => "",
          close: async () => {},
        },
      ],
      null,
      { id: "<inert>", phase: phase + ".normal0" },
    );
  }
  const exactDenial = "ERROR:  42501: Safety report unavailable\n";
  const denialProof = {
    code: "42501",
    message: "Safety report unavailable",
    full54_zero_delta_verified: true,
  };
  assert.throws(() => certifyOwnedExit([3, null], exactDenial));
  assert.throws(() =>
    certifyOwnedExit([3, null], exactDenial, {
      ...denialProof,
      full54_zero_delta_verified: false,
    }),
  );
  assert.deepEqual(certifyOwnedExit([3, null], exactDenial, denialProof), {
    partition: "explicit-expected-denial",
    certified: true,
  });
  assert.throws(() =>
    certifyOwnedExit(
      [3, null],
      "ERROR: 42501: Safety report unavailable\nERROR: ZZZZZ: private\n",
      denialProof,
    ),
  );
  assert.deepEqual(certifyOwnedExit([0, null], ""), {
    partition: "normal-zero-exit",
    certified: true,
  });
  const context = { id: "<inert>", phase: "mock-setup-clock-count-seed" };
  for (const code of ["42501", "40P01"]) {
    const error = new Error(
      `Disposable SQL error: ${code}: ${code === "42501" ? "Safety report unavailable" : "operation failed"}`,
    );
    const failure = failureReceipt(error, context);
    assert.equal(failure.diagnostics[0].code, code);
    assert.equal(failure.reset_forbidden, true);
  }
  assert.deepEqual(
    failureReceipt(
      new Error("Disposable SQL error: 42501: private\nraw"),
      context,
    ).diagnostics,
    [],
  );
  const before = Object.fromEntries(censusTables.map((table) => [table, []]));
  const after = structuredClone(before);
  after["auth.users"] = [{ [privateKey]: "private-secret" }];
  assert.throws(() =>
    verifiedOutcome({ result: true, expectedResult: true, before, after }),
  );
  assert.throws(() =>
    verifiedOutcome({
      result: { private: "wrong" },
      expectedResult: { private: "expected" },
      before,
      after: before,
    }),
  );
  const ids = caseIds("L1R.retained.mode_distinction");
  const route = {
    ...ids,
    id: "CH",
    mode: "hangout_host",
    target: ids.source,
    provenance: "retained_host",
  };
  const result = {
    receipt_id: fixtureBindings(retryRateManifest[16]).seedReport1,
    submitted_at: "2026-09-28T12:00:00.123456+00:00",
  };
  const report = {
    id: result.receipt_id,
    submitted_at: result.submitted_at,
    reporter_id: ids.actor,
    target_type: "user",
    target_id: ids.host,
    category: "harassment",
    narrative: null,
    provenance_kind: "retained_host",
    provenance_ref_id: ids.source,
  };
  const ledger = {
    reporter_id: ids.actor,
    request_id: ids.request,
    input_fingerprint: createHash("md5")
      .update(`["hangout_host", "${ids.source}", "harassment", null]`)
      .digest("hex"),
    report_id: result.receipt_id,
  };
  const reportAfter = {
    ...structuredClone(before),
    "private.safety_reports": [report],
    "private.safety_report_requests": [ledger],
  };
  const window = {
    start: "2026-09-28T12:00:00.123455+00:00",
    end: "2026-09-28T12:00:00.123457+00:00",
  };
  assert.deepEqual(
    expectedAddition(before, reportAfter, route, result, {}, window),
    reportAfter,
  );
  for (const [table, field, wrong] of [
    ["private.safety_reports", "target_type", "hangout"],
    ["private.safety_reports", "target_id", ids.source],
    ["private.safety_reports", "category", "other"],
    ["private.safety_reports", "reporter_id", ids.host],
    ["private.safety_report_requests", "request_id", ids.host],
    ["private.safety_report_requests", "input_fingerprint", "wrong"],
  ]) {
    const wrongAfter = structuredClone(reportAfter);
    wrongAfter[table][0][field] = wrong;
    assert.throws(() =>
      expectedAddition(before, wrongAfter, route, result, {}, window),
    );
  }
  assert.throws(() =>
    expectedAddition(
      before,
      reportAfter,
      route,
      { ...result, private_extra: "private" },
      {},
      window,
    ),
  );
  const error = mismatch(expected, actual);
  assert.deepEqual(failureReceipt(error, context).differences, receipt);
  return {
    examples: "passed",
    raw_private_values_distinct: true,
    unknown_keys_hashed: true,
    strict_wrappers: true,
    unexpected_exits_reset_forbidden: true,
    original_failures_preserved: true,
    exceptional_serial_and_wait_exit_checks: true,
    conditional_expected_denial_inert_only: true,
    normal_zero_exit_checks: true,
    mock_sessions_closed: closed,
    target_attempts: 0,
    fixture_suites_invoked: 0,
  };
}
export function requireReviewedRetryRateRelease() {
  throw new Error(
    "B3c retry/rate runtime refused before contact: full fixture review, runner adoption and failed-child delivery, combined ownership review and exclusive release remain pending",
  );
}
export async function runRetryRateFixtures() {
  requireReviewedRetryRateRelease(); // Unconditional before localTarget, census, setup or cleanup.
  assert.equal(retryRateManifest.length, 18);
  assert.equal(new Set(retryRateManifest.map((c) => c.id)).size, 18);
  localTarget("current27");
  assertClean();
  let originalError,
    cleanupSafe = true,
    context = { id: "<suite>", phase: "setup" };
  try {
    for (const cell of retryRateManifest) {
      context = { id: cell.id, phase: "independent-case-setup" };
      const slots = fixtureBindings(cell),
        clean = census(),
        start = wall();
      const preference = cell.route === "CP" ? false : "absent";
      const route = prepare(
        routes.find((r) => r.id === cell.route),
        { caseKey: cell.id, actorPreference: preference },
      );
      const setupSnapshot = census(),
        window = { start, end: wall() };
      context.setupQualification = assertCaseSetup(
        clean,
        setupSnapshot,
        route,
        window,
        preference,
      );
      qualifyTimes(clean, setupSnapshot, window);
      assert.equal(
        new Set([...Object.values(caseIds(cell.id)), ...Object.values(slots)])
          .size,
        8 + extraSlots.length,
      );
      context.phase = "actual-public-positive-rollback-guard";
      await guard(cell, route, context, slots);
      context.phase = cell.kind;
      if (cell.kind === "same_key_wait") {
        const original = await waitPair(cell, route, context);
        countAt(route, wall(), 1);
        await replay(cell, route, context, original);
      } else if (cell.kind === "normalized_replay") {
        const original = await submit(cell, route, context);
        for (const narrative of ["", "  \t\n  "])
          await replay(cell, route, context, original, {
            category: "  HARASSMENT  ",
            narrative,
          });
        const options = {
          request: slots.trimmedRequest,
          category: "  HARASSMENT  ",
          narrative: "  Fixture narrative  ",
        };
        const nonempty = await submit(cell, route, context, options);
        await replay(cell, route, context, nonempty, {
          request: slots.trimmedRequest,
          category: "harassment",
          narrative: "Fixture narrative",
        });
        countAt(route, wall(), 2);
      } else if (
        [
          "category_mismatch",
          "narrative_mismatch",
          "input_target_mismatch",
        ].includes(cell.kind)
      ) {
        const original = await submit(cell, route, context);
        const altered =
          cell.kind === "input_target_mismatch"
            ? { ...route, target: slots.opaqueTarget }
            : route;
        deny(
          altered,
          context,
          cell.kind === "category_mismatch"
            ? { category: "safety concern" }
            : cell.kind === "narrative_mismatch"
              ? { narrative: "Different fixture narrative" }
              : {},
        );
        await replay(cell, route, context, original);
        countAt(route, wall(), 1);
      } else if (cell.kind === "caller_request_isolation") {
        const other = addActor(route, slots.actor2, context);
        await guard(cell, other, context, slots);
        const first = await submit(cell, route, context),
          second = await submit(cell, other, context);
        assert.notEqual(first.receipt_id, second.receipt_id);
        countAt(route, wall(), 1);
        countAt(other, wall(), 1);
        await replay(cell, route, context, first);
        await replay(cell, other, context, second);
      } else if (cell.kind === "fifth_sixth_replay") {
        const requests = [
          slots.request1,
          slots.request2,
          slots.request3,
          slots.request4,
          slots.request5,
        ];
        let fifth;
        for (const [index, request] of requests.entries()) {
          fifth = await submit(cell, route, context, { request });
          countAt(route, wall(), index + 1);
        }
        deny(route, context, { request: slots.request6 });
        await replay(cell, route, context, fifth, { request: slots.request5 });
        countAt(route, wall(), 5);
      } else if (cell.kind === "clock_after_account_wait") {
        const seeded = seedExpiry(route, slots);
        const result = await waitPair(cell, route, context, seeded);
        countAt(route, result.submitted_at, 5);
        await replay(cell, route, context, result);
      } else {
        const retained = retainedSetup(
          route,
          slots,
          cell.kind === "reference_distinction",
        );
        const original = await submit(cell, retained, context);
        deny(
          cell.kind === "mode_distinction"
            ? { ...retained, mode: "user", target: route.host }
            : { ...retained, target: slots.source2 },
          context,
        );
        await replay(cell, retained, context, original);
        countAt(retained, wall(), 1);
      }
      console.log(
        JSON.stringify({
          id: cell.id,
          partition: "complete-actual-public-control",
          full54_values_verified: true,
          observed_wait_credit: [
            "same_key_wait",
            "clock_after_account_wait",
          ].includes(cell.kind)
            ? 1
            : 0,
          lock_observation: context.observation ?? null,
          private_payloads_withheld: true,
        }),
      );
      context.phase = "guarded-case-reset";
      resetDisposable("current27");
    }
  } catch (error) {
    originalError = error;
    recordFailure(error, context);
    if (error.cleanupIncomplete) cleanupSafe = false;
  } finally {
    if (cleanupSafe)
      try {
        resetDisposable("current27");
        assertClean();
      } catch (cleanup) {
        console.error(
          JSON.stringify({
            id: context.id,
            partition: "cleanup-failed",
            original_error_preserved: Boolean(originalError),
            reset_retry_forbidden: true,
          }),
        );
        originalError ??= cleanup;
      }
  }
  if (originalError) {
    const failure = new Error(
      "Retry/rate fixture failed; private details withheld; see redacted cell receipt",
    );
    Object.defineProperty(failure, originalFailure, { value: originalError });
    throw failure;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  test(
    "B3c literal18 unchanged-source retry/rate controls; runtime release pending",
    { timeout: 900_000 },
    runRetryRateFixtures,
  );
