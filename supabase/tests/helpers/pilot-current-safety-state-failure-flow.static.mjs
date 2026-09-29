// Explicit cached memory-only verifier. No actual fixture import/entrypoint,
// process lane, target query, provider, network or reset.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { types as nativeTypes } from "node:util";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";
import * as childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import * as wire from "./pilot-current-safety-failure-wire.mjs";
import ts from "/private/tmp/pals-task024/node_modules/typescript/lib/typescript.js";

const directory = new URL("./", import.meta.url);
const stateModule =
  "pilot-admission-current-safety-state-races.integration.mjs";
const stateEntry = fileURLToPath(new URL(`../${stateModule}`, directory));
const sourceURL = new URL(
  "pilot-current-safety-state-failure-flow.mjs",
  directory,
);
const source = readFileSync(sourceURL, "utf8");
const coreSource = readFileSync(
  new URL("pilot-admission-current-safety.mjs", directory),
  "utf8",
);
const sha = (text) => createHash("sha256").update(text).digest("hex");
let checks = 0,
  contacts = 0;
function check(value) {
  checks++;
  assert.ok(value);
}
function equal(actual, expected) {
  checks++;
  const plain = (value) =>
    Array.isArray(value)
      ? value.map(plain)
      : value &&
          typeof value === "object" &&
          [null, Object.prototype].includes(Object.getPrototypeOf(value))
        ? Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, plain(item)]),
          )
        : value;
  assert.deepEqual(plain(actual), plain(expected));
}
const manifest = wire.failureWireManifest.modules[stateModule];
const externalState =
  "/private/tmp/pals-task021-state-output-adoption/supabase/tests/pilot-admission-current-safety-state-races.integration.mjs";
const stateSource = readFileSync(externalState, "utf8");
const stateTree = ts.createSourceFile(
  "state.mjs",
  stateSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((property) => [
        property.name.text,
        literal(property.initializer),
      ]),
    );
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(stateTree) === "Object.freeze"
  )
    return literal(node.arguments[0]);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  throw new Error("Source literal unavailable");
}
function declaration(name) {
  let found;
  function visit(node) {
    if (
      (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) &&
      node.name?.getText(stateTree) === name
    )
      found = node;
    ts.forEachChild(node, visit);
  }
  visit(stateTree);
  assert.ok(found);
  return found;
}
const sourceCases = literal(declaration("stateManifest").initializer);
const sourceWaits = literal(declaration("stateWaits").initializer);
const caseFields = (cases) =>
  cases.map(({ id, route, loss, order, partition }) => ({
    id,
    route,
    loss,
    order,
    partition,
  }));
equal(caseFields(manifest.cases), caseFields(sourceCases));
// Inspect exact returned writer object ASTs, without executing any fixture body.
const sourceWriters = new Map();
function visitWriter(node) {
  if (
    ts.isReturnStatement(node) &&
    node.expression &&
    ts.isObjectLiteralExpression(node.expression)
  ) {
    const properties = new Map(
      node.expression.properties.map((property) => [
        property.name.text,
        property.initializer,
      ]),
    );
    if (properties.has("kind")) {
      const wait = properties.get("wait");
      sourceWriters.set(literal(properties.get("kind")), {
        relation: literal(properties.get("relation")),
        wait: ts.isConditionalExpression(wait)
          ? { operation: literal(wait.whenTrue), loss: literal(wait.whenFalse) }
          : literal(wait),
      });
      if (ts.isConditionalExpression(wait))
        equal(
          wait.condition.getText(stateTree),
          'cell.order === "operation-first"',
        );
    }
  }
  ts.forEachChild(node, visitWriter);
}
visitWriter(declaration("stateWriter"));
equal(sourceWriters.size, 5);
equal(
  sha(stateSource),
  "94fc316708079c921a14e2a4178dbdae10d57d465f02a4f5ce7caf242bee5db6",
);
equal(manifest.sha256, sha(stateSource));
for (const [name, hash] of [
  [
    "pilot-admission-current-safety.mjs",
    "eafb99908353512261751a0aefe3aa62e0567d439a395e5b327236f9480e0003",
  ],
  [
    "pilot-current-safety-failure-wire.mjs",
    "ad2b570bd23be284a9bbd08acd45028d9711e23486e2243f52b5cdbec605e153",
  ],
  [
    "pilot-current-safety-fixtures.mjs",
    "6664002d668795d59b3ec01d89030a81848d96621011e9131bfac7fbb3506db7",
  ],
  [
    "pilot-current-safety-provider-source.json",
    "bc149f083a52daf9b53de7d61b946d5d40bc676df6314377f682d14ca21c3269",
  ],
])
  equal(sha(readFileSync(new URL(name, directory))), hash);
equal(
  sha(
    readFileSync(
      new URL(
        "../pilot-admission-current-safety-concurrency.integration.mjs",
        directory,
      ),
    ),
  ),
  "4126c80132c8a644986dfe28f7640b87c3a2555a175f252782e220306bfc3582",
);

// Trap actual contact during the real inert helper import. No fixture is imported.
const originals = new Map();
const mutableChild = childProcess.default;
for (const name of [
  "spawn",
  "exec",
  "execFile",
  "execSync",
  "execFileSync",
  "spawnSync",
  "fork",
]) {
  originals.set(name, mutableChild[name]);
  mutableChild[name] = () => {
    contacts++;
    throw new Error("Contact trapped");
  };
}
const savedFetch = globalThis.fetch;
globalThis.fetch = () => {
  contacts++;
  throw new Error("Contact trapped");
};
syncBuiltinESMExports();
try {
  const publicAPI = await import(sourceURL.href);
  equal(Object.keys(publicAPI).sort(), [
    "createStateFailureFlow",
    "originalStateFailure",
    "originalStateFlowUnavailable",
    "requireReviewedStateFailureFlow",
  ]);
  const trap = new Proxy(
    {},
    {
      get() {
        contacts++;
        throw new Error("Inspected supplied argument");
      },
      ownKeys() {
        contacts++;
        throw new Error("Inspected supplied keys");
      },
    },
  );
  const flow = publicAPI.createStateFailureFlow(trap);
  for (const call of [
    () => flow.first(trap, trap),
    () => flow.supplement(trap, trap, trap),
  ]) {
    let failure;
    try {
      await call();
    } catch (error) {
      failure = error;
    }
    check(failure?.message === "State failure evidence unavailable");
    equal(publicAPI.originalStateFlowUnavailable(failure), null);
    equal(publicAPI.originalStateFailure(failure), null);
  }
  equal(flow.disposition().reset, "forbidden");
  equal(publicAPI.originalStateFailure(flow), null);
} finally {
  for (const [name, original] of originals) mutableChild[name] = original;
  globalThis.fetch = savedFetch;
  syncBuiltinESMExports();
}
equal(contacts, 0);

// Private source isolation is confined to this verifier. No public injection or
// bypass exists. Only new helper source and the existing inert core writer unit
// are evaluated; original fixtures are read as text, never evaluated/imported.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const isolatedSource = source
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replaceAll("export ", "")
  .replaceAll("import.meta.url", JSON.stringify(sourceURL.href));
function isolate({
  writer,
  diagnostic,
  coreReceipt,
  entry = stateEntry,
  canonical = stateEntry,
} = {}) {
  const records = [],
    diagnostics = new WeakMap(),
    wireReceipts = new WeakMap();
  const fakeProcess = { argv: ["node", entry] };
  const factory = new AsyncFunction(
    "dependencies",
    `const {nativeTypes,realpathSync,fileURLToPath,failureWireManifest,genericFailureLimits,genericWireUnavailableExit,originalFailureValue,unavailableFailureValue,normalizeFailureEnvelope,encodeFailureFrame,writeGenericFailureEvidence,originalGenericWireFailure,originalSqlDiagnostic,process}=dependencies;\n${isolatedSource}\nreturn {createStateFailureFlow,originalStateFailure,originalStateFlowUnavailable,flowStates,deliverFirst,deliverSupplement,normalizeCapture,expectedContext,waits};`,
  );
  return factory({
    ...wire,
    nativeTypes,
    fileURLToPath,
    process: fakeProcess,
    realpathSync: () => canonical,
    writeGenericFailureEvidence:
      writer ??
      (async (record) => {
        records.push(record);
      }),
    originalSqlDiagnostic:
      diagnostic ??
      ((error) => diagnostics.get(error) ?? { code: "unavailable" }),
    originalGenericWireFailure:
      coreReceipt ?? ((error) => wireReceipts.get(error) ?? null),
  }).then((api) => ({
    ...api,
    records,
    diagnostics,
    wireReceipts,
    fakeProcess,
  }));
}
function context(api, cell) {
  const expected = api.expectedContext(cell);
  return {
    id: cell.id,
    order: cell.order,
    writerKind: expected.writer,
    wait: expected.wait,
    resource: expected.resource,
    classification: expected.classification,
    phase: "actual-lock-observation",
    partition: cell.partition,
  };
}
function rawSnapshot(value = "private narrative") {
  return Object.fromEntries(
    wire.failureWireManifest.tables.map((table) => [table, [{ value }]]),
  );
}
function newFlow(api) {
  const flow = api.createStateFailureFlow();
  return [flow, api.flowStates.get(flow)];
}
async function unavailable(api, action, state, original) {
  let error;
  try {
    await action();
  } catch (failure) {
    error = failure;
  }
  check(error instanceof Error);
  equal(error.message, "State failure evidence unavailable");
  equal(error.stack, "Error: State failure evidence unavailable");
  equal(Object.keys(error), []);
  equal(api.originalStateFlowUnavailable(error)?.required_exit_status, 78);
  equal(api.originalStateFlowUnavailable(new Error(error.message)), null);
  equal(api.originalStateFlowUnavailable({ ...error }), null);
  if (state.hasOriginal) equal(api.originalStateFailure(error), original);
  equal(state.unavailable, true);
  return error;
}
const api = await isolate();
equal(manifest.cases.length, 24);
equal(
  manifest.cases.filter(
    (cell) => cell.partition === "actual-state-wait-required",
  ).length,
  22,
);
equal(
  manifest.cases.filter(
    (cell) => cell.partition !== "actual-state-wait-required",
  ).length,
  2,
);
equal(api.waits.length, 6);
equal(api.waits, sourceWaits);
for (const wait of api.waits) check(stateSource.includes(JSON.stringify(wait)));
for (const cell of manifest.cases) {
  check(stateSource.includes(JSON.stringify(cell.id)));
  const [flow, state] = newFlow(api),
    original = new Error("private original");
  const writerKind =
    {
      source_disable: "disable",
      source_cancel: "cancel",
      peer_opt_out: "optout",
      peer_preference_delete: "delete",
    }[cell.loss] ?? "block";
  const sourceWriter = sourceWriters.get(writerKind);
  equal(api.expectedContext(cell).writer, writerKind);
  equal(api.expectedContext(cell).resource, sourceWriter.relation);
  equal(
    api.expectedContext(cell).wait,
    typeof sourceWriter.wait === "string"
      ? sourceWriter.wait
      : cell.order === "operation-first"
        ? sourceWriter.wait.operation
        : sourceWriter.wait.loss,
  );
  const before = rawSnapshot(cell.id);
  const bundle = {
    context: context(api, cell),
    snapshots: {
      before: { kind: "raw", value: before },
      after: { kind: "raw", value: before },
      expected: { kind: "missing" },
      holder: { kind: "inherited-withheld" },
    },
    observations: { close: true, done: true, absence: true },
  };
  const result = await api.deliverFirst(state, original, bundle);
  const record = api.records.at(-1);
  equal(record.context.case_id, cell.id);
  equal(record.context.wait, context(api, cell).wait);
  equal(record.context.classification, context(api, cell).classification);
  equal(record.context.resource, context(api, cell).resource);
  equal(record.summaries.before.tables.length, 54);
  equal(
    record.summaries.before.tables[0].value,
    wire.originalFailureValue(before[wire.failureWireManifest.tables[0]]),
  );
  equal(record.summaries.expected, { available: false, tables: null });
  equal(record.summaries.holder, { available: false, tables: null });
  equal(result.credits, {
    order: 0,
    suite: 0,
    allocation: 0,
    cleanup: false,
    pass: false,
  });
  equal(result.settlement, "unproven");
  equal(api.originalStateFailure(flow), original);
  before[wire.failureWireManifest.tables[0]][0].value = "mutated after capture";
  equal(
    state.captures[0].bundle.snapshots.before.value[
      wire.failureWireManifest.tables[0]
    ][0].value,
    cell.id,
  );
  equal(Object.keys(result).sort(), [
    "cleanup",
    "credits",
    "evidence",
    "required_exit_status",
    "reset",
    "settlement",
    "target",
  ]);
  check(!JSON.stringify(record).includes("private original"));
  const receiver = wire.createFailureWireReceiver(stateModule);
  receiver.receive(wire.encodeFailureFrame(record, stateModule));
  receiver.end();
  receiver.close(0, null);
  equal(receiver.evidence().availability, "available");
  check(receiver.evidence().module_failed);
}
for (const phase of manifest.phases) {
  const [, state] = newFlow(api);
  await api.deliverFirst(state, new Error(), { context: { phase } });
  equal(api.records.at(-1).context.phase, phase);
}
for (const partition of manifest.partitions) {
  const [, state] = newFlow(api);
  await api.deliverFirst(state, new Error(), { context: { partition } });
  equal(api.records.at(-1).context.partition, partition);
}
// Different raw originals hash differently; projections cannot substitute for
// originals, and inherited placeholders never receive fabricated hash precision.
{
  const [, state] = newFlow(api);
  const projected = rawSnapshot();
  projected[wire.failureWireManifest.tables[0]] = [
    { available: true, type: "object", sha256: "a".repeat(64) },
  ];
  await api.deliverFirst(state, new Error(), {
    snapshots: { before: { kind: "raw", value: projected } },
  });
  const descriptor = api.records.at(-1).summaries.before.tables[0].value;
  equal(descriptor, wire.unavailableFailureValue("array", true));
  check(
    wire.originalFailureValue(["one"]).sha256 !==
      wire.originalFailureValue(["two"]).sha256,
  );
  equal(
    wire.originalFailureValue("<redacted>"),
    wire.unavailableFailureValue("string", true),
  );
  const [, partialState] = newFlow(api),
    partial = rawSnapshot();
  delete partial[wire.failureWireManifest.tables[0]];
  await api.deliverFirst(partialState, new Error(), {
    snapshots: { after: { kind: "raw", value: partial } },
  });
  equal(api.records.at(-1).summaries.after, { available: false, tables: null });
}
// Source-known structural paths alone gain coordinates. Catalog/provider/dotted
// and nested paths retain only opaque descriptors, with raw paths private.
{
  const [, state] = newFlow(api),
    table = "public.accounts",
    column = wire.failureWireManifest.columns[table][0];
  await api.deliverFirst(state, new Error(), {
    differences: [
      { segments: [table, "0", column] },
      {
        segments: [table, "0", column],
        expected: "private expected",
        actual: "private actual",
      },
      {
        segments: [table, "0", column, "provider-secret"],
        expected: 1,
        actual: 2,
      },
      { field: `${table}.0.${column}`, expected: 1, actual: 2 },
      { segments: ["unknown.provider", "0", "secret"], expected: 1, actual: 2 },
      { segments: [table, "01", column], expected: 1, actual: 2 },
      { segments: [table, "0", "unknown"], expected: 1, actual: 2 },
    ],
  });
  const differences = api.records.at(-1).differences;
  equal(differences[0].expected, wire.unavailableFailureValue());
  equal(differences[0].observed, wire.unavailableFailureValue());
  equal(differences[0].kind, "unavailable");
  equal(
    [
      differences[1].scope,
      differences[1].table,
      differences[1].row,
      differences[1].column,
    ],
    ["domain", table, 0, column],
  );
  for (const difference of differences.slice(2))
    equal(
      [difference.scope, difference.table, difference.row, difference.column],
      ["opaque", null, null, null],
    );
  check(!JSON.stringify(differences).includes("private expected"));
}
// Exact owned core identity only. A copied pair, neutral text, arbitrary Error
// properties and combined child output are never read to mint known diagnostics.
{
  const known = new Error("private"),
    copied = Object.assign(
      new Error("Disposable SQL error: 42501: Safety report unavailable"),
      {
        code: "42501",
        diagnostic: { code: "42501", message: "Safety report unavailable" },
        stderr: "ERROR: 42501: Safety report unavailable",
      },
    );
  api.diagnostics.set(known, {
    code: "42501",
    message: "Safety report unavailable",
  });
  for (const original of [known, copied]) {
    const [, state] = newFlow(api);
    await api.deliverFirst(state, original, {});
    equal(
      api.records.at(-1).diagnostic,
      original === known
        ? { code: "42501", message: "Safety report unavailable", detail: null }
        : { code: null, message: null, detail: wire.unavailableFailureValue() },
    );
  }
  const hostile = new Error("private");
  for (const name of [
    "message",
    "cause",
    "stack",
    "actual",
    "expected",
    "stderr",
  ])
    Object.defineProperty(hostile, name, {
      get() {
        contacts++;
        throw new Error("Raw error inspected");
      },
    });
  const [, state] = newFlow(api);
  await api.deliverFirst(state, hostile, {});
  equal(contacts, 0);
}
// First identity remains private; duplicate catches differ from explicitly
// justified supplements, including supplements about the same original object.
{
  const local = await isolate(),
    [flow, state] = newFlow(local),
    original = new Error("first");
  await local.deliverFirst(state, original, {});
  const repeated = await local.deliverFirst(state, original, {});
  equal(repeated.duplicate_original, true);
  equal(local.records.length, 1);
  for (const receipt of [
    "supplemental-observation",
    "supplemental-rollback",
    "supplemental-closure",
    "supplemental-reset",
    "supplemental-restoration",
  ])
    await local.deliverSupplement(state, receipt, original, {});
  equal(
    local.records.map((record) => record.sequence),
    [0, 1, 2, 3, 4, 5],
  );
  equal(
    local.records.map((record) => record.original_sequence),
    [0, 0, 0, 0, 0, 0],
  );
  equal(local.originalStateFailure(flow), original);
  const separate = new Error("independent late closure");
  await local.deliverSupplement(state, "supplemental-closure", separate, {});
  equal(state.captures.at(-1).error, separate);
  equal(local.originalStateFailure(flow), original);
  await unavailable(
    local,
    () => local.deliverFirst(state, separate, {}),
    state,
    original,
  );
}
// Awaited delivery blocks future caller finally; concurrency invalidates the
// whole channel rather than silently suppressing a separate event.
{
  let release,
    started = false,
    finished = false;
  const local = await isolate({
    writer: () => {
      started = true;
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  });
  const [, state] = newFlow(local),
    original = new Error();
  const first = local.deliverFirst(state, original, {}).then(() => {
    finished = true;
  });
  await Promise.resolve();
  check(started);
  check(!finished);
  release();
  await first;
  check(finished);
}
{
  let release;
  const local = await isolate({
    writer: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const [, state] = newFlow(local),
    original = new Error();
  const first = local.deliverFirst(state, original, {});
  await Promise.resolve();
  await unavailable(
    local,
    () =>
      local.deliverSupplement(state, "supplemental-closure", new Error(), {}),
    state,
    original,
  );
  release();
  await unavailable(local, () => first, state, original);
}
// Normalization failure is unavailable as a whole; no getter, prototype, proxy,
// sparse data, cycle, provider extension, projection or fabricated expected data.
for (const malformed of (() => {
  const getter = {};
  Object.defineProperty(getter, "context", {
    enumerable: true,
    get() {
      contacts++;
      return {};
    },
  });
  const cycle = {};
  cycle.context = cycle;
  const sparse = [];
  sparse.length = 2;
  let deep = {};
  for (let i = 0; i < 18; i++) deep = { nested: deep };
  return [
    getter,
    cycle,
    new Proxy(
      {},
      {
        ownKeys() {
          contacts++;
          return [];
        },
      },
    ),
    Object.create({ context: {} }),
    { privateProvider: "secret" },
    { context: { provider: "secret" } },
    { differences: sparse },
    { observations: deep },
    {
      observations: {
        toJSON() {
          contacts++;
          return {};
        },
      },
    },
    { snapshots: { before: { kind: "raw", value: { projected: true } } } },
    {
      differences: Array.from({ length: 129 }, () => ({
        expected: 1,
        actual: 2,
      })),
    },
    { differences: [{ expected: "x".repeat(65537), actual: 2 }] },
    { observations: Array.from({ length: 4100 }, () => 1) },
  ];
})()) {
  const local = await isolate(),
    [, state] = newFlow(local),
    original = new Error();
  await unavailable(
    local,
    () => local.deliverFirst(state, original, malformed),
    state,
    original,
  );
  equal(local.records.length, 0);
}
equal(contacts, 0);
// 128 actual differences are retained; full54 slots plus all actual differences
// that exceed the frame bound invalidate rather than trim the evidence.
{
  const differences = Array.from({ length: 128 }, () => ({
    segments: ["public.accounts", "0", "id"],
    expected: "private expected",
    actual: "private actual",
  }));
  const local = await isolate(),
    [, state] = newFlow(local);
  await local.deliverFirst(state, new Error(), { differences });
  equal(local.records[0].differences.length, 128);
  const large = await isolate(),
    [, largeState] = newFlow(large),
    original = new Error();
  const snapshots = Object.fromEntries(
    ["before", "after", "expected", "holder"].map((slot) => [
      slot,
      { kind: "raw", value: rawSnapshot() },
    ]),
  );
  const [, sizeState] = newFlow(large);
  const oversized = large.normalizeCapture(
    sizeState,
    "original-before-cleanup",
    original,
    { snapshots, differences },
  );
  check(
    Buffer.byteLength(JSON.stringify(oversized)) >
      wire.genericFailureLimits.frame,
  );
  assert.throws(() => wire.encodeFailureFrame(oversized, stateModule));
  checks++;
  await unavailable(
    large,
    () => large.deliverFirst(largeState, original, { snapshots, differences }),
    largeState,
    original,
  );
  equal(large.records.length, 0);
}
// Unknown sentinels safely lose contextual precision. Known canonical mismatch
// is a whole-flow failure, never a fabricated replacement source label.
{
  const [, state] = newFlow(api);
  await api.deliverFirst(state, new Error(), {
    context: {
      id: "<suite>",
      phase: "private",
      order: "private",
      writerKind: "private",
      wait: "private",
    },
  });
  equal(Object.values(api.records.at(-1).context), Array(10).fill(null));
}
for (const cell of manifest.cases)
  for (const patch of [
    { order: cell.order === "loss-first" ? "operation-first" : "loss-first" },
    {
      writerKind:
        context(api, cell).writerKind === "block" ? "disable" : "block",
    },
    { wait: api.waits.find((wait) => wait !== context(api, cell).wait) },
    {
      classification:
        context(api, cell).classification === "planned-committed-state-loss"
          ? "retained-repair-no-new-loss"
          : "planned-committed-state-loss",
    },
  ]) {
    const local = await isolate(),
      [, state] = newFlow(local),
      original = new Error();
    await unavailable(
      local,
      () =>
        local.deliverFirst(state, original, {
          context: { ...context(api, cell), ...patch },
        }),
      state,
      original,
    );
  }
// Record ceiling invalidates all previously written evidence through exact
// private unavailable identity and mandatory future reserved exit78.
{
  const local = await isolate(),
    [, state] = newFlow(local),
    original = new Error();
  await local.deliverFirst(state, original, {});
  for (let i = 1; i < 16; i++)
    await local.deliverSupplement(
      state,
      "supplemental-observation",
      new Error(),
      {},
    );
  equal(local.records.length, 16);
  await unavailable(
    local,
    () =>
      local.deliverSupplement(state, "supplemental-closure", new Error(), {}),
    state,
    original,
  );
  equal(local.records.length, 16);
  const receiver = wire.createFailureWireReceiver(stateModule);
  for (const record of local.records)
    receiver.receive(wire.encodeFailureFrame(record, stateModule));
  receiver.end();
  receiver.close(78, null);
  equal(receiver.evidence().availability, "unavailable");
}
{
  const local = await isolate(),
    [, state] = newFlow(local),
    original = new Error();
  state.bytes = wire.genericFailureLimits.total;
  await unavailable(
    local,
    () => local.deliverFirst(state, original, {}),
    state,
    original,
  );
  equal(local.records.length, 0);
}
// Entry path/module has no caller selector; changed argv, foreign fixture or
// noncanonical path can never reach the bound core writer.
for (const options of [
  { entry: "/private/tmp/foreign.mjs" },
  { canonical: "/private/tmp/symlink.mjs" },
]) {
  const local = await isolate(options),
    [, state] = newFlow(local),
    original = new Error();
  await unavailable(
    local,
    () => local.deliverFirst(state, original, {}),
    state,
    original,
  );
  equal(local.records.length, 0);
}
{
  const local = await isolate(),
    [, state] = newFlow(local),
    original = new Error();
  local.fakeProcess.argv[1] = "/private/tmp/switched.mjs";
  await unavailable(
    local,
    () => local.deliverFirst(state, original, {}),
    state,
    original,
  );
}
// Exercise the byte-identical reviewed core writer section with private streams.
const coreUnit = coreSource
  .slice(
    coreSource.indexOf("const genericObservedEntry"),
    coreSource.indexOf("// PRIVATE GENERIC FAILURE END"),
  )
  .replaceAll("export ", "");
async function mockCore(mode) {
  const stream = new EventEmitter();
  stream.destroy = () => {};
  stream.write = (frame, callback) => {
    if (mode === "stalled") return;
    queueMicrotask(() =>
      callback(mode === "error" ? new Error("private provider message") : null),
    );
  };
  const factory = new AsyncFunction(
    "dependencies",
    `const {process,root,resolve,realpathSync,createWriteStream,failureWireManifest,genericFailureLimits,encodeFailureFrame,genericWireUnavailableExit,performance,setTimeout,clearTimeout,Buffer}=dependencies;\n${coreUnit}\nreturn {writeGenericFailureEvidence,originalGenericWireFailure};`,
  );
  return factory({
    process: { argv: ["node", stateEntry] },
    root: "/fixed",
    resolve: (_root, _tests, name) =>
      name === stateModule ? stateEntry : `/fixed/${name}`,
    realpathSync: (path) => path,
    createWriteStream: () => stream,
    ...wire,
    performance,
    setTimeout,
    clearTimeout,
    Buffer,
  });
}
for (const mode of ["error", "stalled"]) {
  const core = await mockCore(mode);
  const local = await isolate({
    writer: core.writeGenericFailureEvidence,
    coreReceipt: core.originalGenericWireFailure,
  });
  const [flow, state] = newFlow(local),
    original = new Error("first original");
  const start = performance.now();
  await unavailable(
    local,
    () => local.deliverFirst(state, original, {}),
    state,
    original,
  );
  check(performance.now() - start < 3000);
  equal(state.wireReceipt.required_exit_status, 78);
  equal(local.originalStateFailure(flow), original);
  equal(
    core.originalGenericWireFailure(
      new Error("Generic failure evidence unavailable"),
    ),
    null,
  );
}
{
  const copied = new Error("Generic failure evidence unavailable");
  const local = await isolate({
    writer: async () => {
      throw copied;
    },
  });
  const [, state] = newFlow(local),
    original = new Error();
  await unavailable(
    local,
    () => local.deliverFirst(state, original, {}),
    state,
    original,
  );
  equal(state.wireReceipt, null);
}
equal(contacts, 0);
console.log(
  JSON.stringify({
    checks,
    trapped_contact_attempts: contacts,
    target_runtime_credit: 0,
    actual_state_adopted: false,
    required_future_unavailable_exit: 78,
  }),
);
