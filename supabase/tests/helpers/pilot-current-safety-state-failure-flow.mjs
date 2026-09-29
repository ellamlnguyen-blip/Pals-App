// Dormant state-only failure flow. No fixture import, registration or contact
// on import. Future adopters must remove the refusal only under separate review.
import { types as nativeTypes } from "node:util";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  failureWireManifest,
  genericFailureLimits,
  genericWireUnavailableExit,
  originalFailureValue,
  unavailableFailureValue,
  normalizeFailureEnvelope,
  encodeFailureFrame,
} from "./pilot-current-safety-failure-wire.mjs";
import {
  writeGenericFailureEvidence,
  originalGenericWireFailure,
  originalSqlDiagnostic,
} from "./pilot-admission-current-safety.mjs";

const stateModule =
  "pilot-admission-current-safety-state-races.integration.mjs";
const stateEntry = fileURLToPath(new URL(`../${stateModule}`, import.meta.url));
const observedEntry = process.argv[1];
const manifest = failureWireManifest.modules[stateModule];
const waits = Object.freeze([
  "social (16016,1) exclusive before moderation/pilot/lane selection; no lower current tuple credit",
  "social (16016,1) exclusive before shared pilot/lifecycle and current lane selection; no lower tuple credit",
  "public opt-out account UPDATE waits on current peer account SHARE, before preference UPSERT",
  "current peer account SHARE waits on public opt-out account UPDATE, before required preference lookup",
  "required peer preference SHARE versus actual preference DELETE tuple/transaction wait; privileged synthetic maintenance only",
  "social (16016,1) exclusive before shared pilot/current-or-retained lane selection; no lower tuple/no-upgrade/no-fallback credit",
]);
const receipts = Object.freeze([
  "supplemental-observation",
  "supplemental-rollback",
  "supplemental-closure",
  "supplemental-reset",
  "supplemental-restoration",
]);
const slots = Object.freeze(["before", "after", "expected", "holder"]);
const flowStates = new WeakMap();
const errorOriginals = new WeakMap();
const unavailableReceipts = new WeakMap();
const conservative = Object.freeze({
  cleanup: "unverified",
  reset: "forbidden",
  target: "unestablished",
  settlement: "unproven",
});
const credits = Object.freeze({
  order: 0,
  suite: 0,
  allocation: 0,
  cleanup: false,
  pass: false,
});
function invalid() {
  throw new Error("State failure evidence unavailable");
}
function neutral(state, unavailable = false) {
  const error = new Error("State failure evidence unavailable");
  error.stack = "Error: State failure evidence unavailable";
  if (state?.hasOriginal) errorOriginals.set(error, state.original);
  if (unavailable)
    unavailableReceipts.set(
      error,
      Object.freeze({
        classification: "state-flow-unavailable",
        required_exit_status: genericWireUnavailableExit,
        ...conservative,
      }),
    );
  return error;
}
// Every contact-bearing public entry refuses before inspecting supplied data.
export function requireReviewedStateFailureFlow() {
  throw neutral(null);
}
// Memory-only identity lookup; originals/receipts must never be serialized.
export function originalStateFailure(value) {
  const state = flowStates.get(value);
  return state?.hasOriginal
    ? state.original
    : (errorOriginals.get(value) ?? null);
}
export function originalStateFlowUnavailable(error) {
  return unavailableReceipts.get(error) ?? null;
}
export function createStateFailureFlow() {
  const state = {
    hasOriginal: false,
    original: undefined,
    sequence: 0,
    bytes: 0,
    pending: false,
    unavailable: false,
    unavailableError: null,
    wireReceipt: null,
    captures: [],
  };
  const flow = Object.freeze({
    async first(error, bundle) {
      requireReviewedStateFailureFlow();
      return deliverFirst(state, error, bundle);
    },
    async supplement(receipt, error, bundle) {
      requireReviewedStateFailureFlow();
      return deliverSupplement(state, receipt, error, bundle);
    },
    invalidate(originalError) {
      if (!state.hasOriginal) {
        state.hasOriginal = true;
        state.original = originalError;
      }
      return fail(state);
    },
    disposition() {
      return disposition(state);
    },
  });
  flowStates.set(flow, state);
  return flow;
}
function disposition(state) {
  return Object.freeze({
    ...conservative,
    credits,
    evidence: state.unavailable ? "unavailable" : "unestablished",
    required_exit_status: state.unavailable ? genericWireUnavailableExit : null,
  });
}
function fail(state, cause) {
  state.unavailable = true;
  // Only the exact core identity confers a transport-unavailable receipt.
  state.wireReceipt ??= originalGenericWireFailure(cause);
  state.unavailableError ??= neutral(state, true);
  if (state.hasOriginal)
    errorOriginals.set(state.unavailableError, state.original);
  return state.unavailableError;
}
function bindEntry() {
  if (
    observedEntry !== stateEntry ||
    process.argv[1] !== observedEntry ||
    realpathSync(stateEntry) !== stateEntry
  )
    invalid();
}
// Copy raw owned own-data without getters, custom prototypes, proxy traps or
// serialization hooks. Errors are retained separately by identity, never copied.
function copyOwned(value) {
  let nodes = 0;
  const seen = new Set();
  function copy(v, depth) {
    if (
      ++nodes > genericFailureLimits.nodes ||
      depth > genericFailureLimits.depth
    )
      invalid();
    if (
      v === null ||
      ["undefined", "boolean", "string", "bigint"].includes(typeof v)
    )
      return v;
    if (typeof v === "number") {
      if (!Number.isFinite(v)) invalid();
      return v;
    }
    if (typeof v !== "object" || nativeTypes.isProxy(v) || seen.has(v))
      invalid();
    const array = Array.isArray(v),
      prototype = Object.getPrototypeOf(v);
    if (
      array
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    )
      invalid();
    const keys = Reflect.ownKeys(v),
      ds = Object.getOwnPropertyDescriptors(v);
    if (
      keys.some((key) => typeof key !== "string") ||
      keys.length > genericFailureLimits.nodes
    )
      invalid();
    seen.add(v);
    const result = array ? [] : Object.create(null);
    if (array && keys.length !== ds.length.value + 1) invalid();
    for (const key of keys) {
      if (array && key === "length") continue;
      const d = ds[key];
      if (!Object.hasOwn(d, "value") || !d.enumerable || key === "toJSON")
        invalid();
      if (array && !/^(0|[1-9][0-9]*)$/.test(key)) invalid();
      result[key] = copy(d.value, depth + 1);
    }
    if (array && result.length !== ds.length.value) invalid();
    seen.delete(v);
    return Object.freeze(result);
  }
  return copy(value, 0);
}
function fields(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  if (Object.keys(value).some((key) => !allowed.includes(key))) invalid();
}
function expectedContext(cell) {
  const writer =
    {
      source_disable: "disable",
      source_cancel: "cancel",
      peer_opt_out: "optout",
      peer_preference_delete: "delete",
    }[cell.loss] ?? "block";
  const index =
    cell.loss === "source_disable"
      ? 0
      : cell.loss === "source_cancel"
        ? 1
        : cell.loss === "peer_opt_out"
          ? cell.order === "operation-first"
            ? 2
            : 3
          : cell.loss === "peer_preference_delete"
            ? 4
            : 5;
  return {
    writer,
    wait: waits[index],
    resource:
      cell.loss === "peer_opt_out"
        ? "public.accounts"
        : cell.loss === "peer_preference_delete"
          ? "private.people_preferences"
          : null,
    classification:
      cell.id === "L5.CB.actor_peer_block_inbound.operation-first"
        ? "public-writer-denial-no-committed-loss-order"
        : cell.id === "L5.CB.actor_peer_block_outbound.operation-first"
          ? "retained-repair-no-new-loss"
          : "planned-committed-state-loss",
  };
}
function mapContext(input = {}) {
  fields(input, [
    "id",
    "phase",
    "partition",
    "order",
    "writerKind",
    "wait",
    "resource",
    "classification",
  ]);
  const cell = manifest.cases.find((candidate) => candidate.id === input.id);
  const result = {
    case_id: cell?.id ?? null,
    phase: manifest.phases.includes(input.phase) ? input.phase : null,
    partition: manifest.partitions.includes(input.partition)
      ? input.partition
      : null,
    order: null,
    writer: null,
    wait: null,
    resource: null,
    classification: null,
    suite: null,
    qualification: null,
  };
  if (!cell) return result;
  const expected = expectedContext(cell);
  if (["operation-first", "loss-first"].includes(input.order)) {
    if (input.order !== cell.order) invalid();
    result.order = input.order;
  }
  for (const [source, target, known] of [
    [
      "writerKind",
      "writer",
      ["disable", "cancel", "optout", "delete", "block"],
    ],
    ["wait", "wait", waits],
    ["resource", "resource", ["public.accounts", "private.people_preferences"]],
    [
      "classification",
      "classification",
      [
        "planned-committed-state-loss",
        "retained-repair-no-new-loss",
        "public-writer-denial-no-committed-loss-order",
      ],
    ],
  ]) {
    if (known.includes(input[source])) {
      if (input[source] !== expected[target]) invalid();
      result[target] = input[source];
    }
  }
  if (result.order !== cell.order || result.writer !== expected.writer)
    result.wait = null;
  return result;
}
function describe(value) {
  // Only privately copied own-data reaches this traversal. Recognize inherited
  // descendants before hashing, but visit every sibling and measure the exact
  // generic typed encoding so withholding cannot hide an encoding overflow.
  let inherited = false;
  function measure(v) {
    const type = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
    if (type === "string" && /<redacted(?:-token)?>|<absent>/.test(v))
      inherited = true;
    if (!["object", "array"].includes(type)) {
      const encoded =
        type === "undefined" || type === "null"
          ? [type]
          : [
              type,
              type === "bigint"
                ? String(v)
                : type === "number"
                  ? Object.is(v, -0)
                    ? "-0"
                    : String(v)
                  : v,
            ];
      const bytes = Buffer.byteLength(JSON.stringify(encoded));
      if (bytes > genericFailureLimits.frame) invalid();
      return bytes;
    }
    const keys = Object.keys(v);
    if (
      Object.hasOwn(v, "available") &&
      typeof v.available === "boolean" &&
      (v.available === false ||
        (Object.hasOwn(v, "type") &&
          [
            "undefined",
            "null",
            "boolean",
            "number",
            "bigint",
            "string",
            "array",
            "object",
            "unknown",
          ].includes(v.type)) ||
        Object.hasOwn(v, "sha256"))
    )
      inherited = true;
    let bytes = Buffer.byteLength(JSON.stringify([type, []]));
    for (const [index, key] of keys.entries()) {
      bytes += measure(v[key]) + (index === 0 ? 0 : 1);
      if (type === "object")
        bytes += Buffer.byteLength(JSON.stringify(key)) + 3;
      if (bytes > genericFailureLimits.frame) invalid();
    }
    return bytes;
  }
  measure(value);
  if (inherited)
    return unavailableFailureValue(
      value === null ? "null" : Array.isArray(value) ? "array" : typeof value,
      true,
    );
  const descriptor = originalFailureValue(value);
  if (!descriptor.available && descriptor.precision !== "inherited-withheld")
    invalid();
  return descriptor;
}
function mapSummary(slot) {
  if (slot === undefined) return { available: false, tables: null };
  fields(slot, ["kind", "value"]);
  if (["missing", "inherited-withheld"].includes(slot.kind)) {
    if (Object.hasOwn(slot, "value")) invalid();
    return { available: false, tables: null };
  }
  if (slot.kind !== "raw" || !Object.hasOwn(slot, "value")) invalid();
  const snapshot = slot.value;
  fields(snapshot, failureWireManifest.tables);
  // Missing original table rows make the entire slot unavailable, never partial.
  if (Object.keys(snapshot).length !== failureWireManifest.tables.length)
    return { available: false, tables: null };
  const tables = failureWireManifest.tables.map((table) => {
    const rows = snapshot[table];
    if (!Array.isArray(rows) || rows.length > genericFailureLimits.count)
      invalid();
    return { table, count: rows.length, value: describe(rows) };
  });
  return { available: true, tables };
}
function mapDifferences(input = []) {
  if (!Array.isArray(input) || input.length > genericFailureLimits.differences)
    invalid();
  return input.map((item) => {
    fields(item, ["field", "segments", "expected", "actual"]);
    const segments = item.segments;
    let table = null,
      row = null,
      column = null;
    // Only complete, direct structural coordinates. Never parse dotted strings.
    if (
      Array.isArray(segments) &&
      segments.length >= 1 &&
      segments.length <= 3 &&
      Object.hasOwn(failureWireManifest.columns, segments[0])
    ) {
      table = segments[0];
      if (segments.length > 1) {
        if (
          typeof segments[1] !== "string" ||
          !/^(0|[1-9][0-9]*)$/.test(segments[1]) ||
          Number(segments[1]) > genericFailureLimits.count
        )
          table = null;
        else row = Number(segments[1]);
      }
      if (segments.length > 2) {
        if (!failureWireManifest.columns[table]?.includes(segments[2]))
          table = null;
        else column = segments[2];
      }
    }
    if (table === null) row = column = null;
    return {
      scope: table === null ? "opaque" : "domain",
      table,
      row,
      column,
      kind:
        !Object.hasOwn(item, "expected") || !Object.hasOwn(item, "actual")
          ? "unavailable"
          : item.expected === undefined
            ? "unexpected"
            : item.actual === undefined
              ? "missing"
              : "value",
      expected: Object.hasOwn(item, "expected")
        ? describe(item.expected)
        : unavailableFailureValue(),
      observed: Object.hasOwn(item, "actual")
        ? describe(item.actual)
        : unavailableFailureValue(),
    };
  });
}
function mapDiagnostic(error) {
  // Lookup uses the exact private core error identity. Supplied pairs/messages,
  // projected streams, copied errors and public child output have no authority.
  const diagnostic = originalSqlDiagnostic(error);
  if (
    diagnostic.code !== "unavailable" &&
    typeof diagnostic.message === "string" &&
    diagnostic.message !== "unavailable"
  )
    return { code: diagnostic.code, message: diagnostic.message, detail: null };
  return { code: null, message: null, detail: unavailableFailureValue() };
}
function normalizeCapture(state, receipt, error, supplied) {
  const bundle = copyOwned(supplied ?? {});
  fields(bundle, ["context", "snapshots", "differences", "observations"]);
  const snapshots = bundle.snapshots ?? {};
  fields(snapshots, slots);
  // Raw context/snapshots/diffs/observations stay exclusively in this WeakMap
  // owned capture. No original Error fields are read or attached to an envelope.
  const capture = Object.freeze({ error, bundle });
  state.captures.push(capture);
  const summaries = Object.fromEntries(
    slots.map((slot) => [slot, mapSummary(snapshots[slot])]),
  );
  return normalizeFailureEnvelope(
    {
      version: 1,
      module: stateModule,
      sequence: state.sequence,
      original_sequence: 0,
      receipt,
      context: mapContext(bundle.context),
      diagnostic: mapDiagnostic(error),
      summaries,
      differences: mapDifferences(bundle.differences),
      flags: conservative,
      credits,
    },
    stateModule,
  );
}
async function deliver(state, receipt, error, bundle) {
  if (state.unavailable || state.pending) throw fail(state);
  state.pending = true;
  try {
    bindEntry();
    const record = normalizeCapture(state, receipt, error, bundle);
    const bytes = encodeFailureFrame(record, stateModule).length;
    if (
      state.sequence >= genericFailureLimits.records ||
      state.bytes + bytes > genericFailureLimits.total
    )
      invalid();
    // Sole fixed two-second writer; no retry, callback/sink or second deadline.
    await writeGenericFailureEvidence(record);
    if (state.unavailable) throw fail(state);
    state.sequence++;
    state.bytes += bytes;
    return disposition(state);
  } catch (failure) {
    throw fail(state, failure);
  } finally {
    state.pending = false;
  }
}
async function deliverFirst(state, error, bundle) {
  if (state.hasOriginal) {
    // A repeated wrapper catch is not a new event. Explicit supplements are
    // separate even when their observation concerns the same original identity.
    if (state.original === error && !state.pending && !state.unavailable)
      return Object.freeze({ ...disposition(state), duplicate_original: true });
    throw fail(state);
  }
  state.hasOriginal = true;
  state.original = error;
  return deliver(state, "original-before-cleanup", error, bundle);
}
async function deliverSupplement(state, receipt, error, bundle) {
  if (!state.hasOriginal || !receipts.includes(receipt)) throw fail(state);
  return deliver(state, receipt, error, bundle);
}
