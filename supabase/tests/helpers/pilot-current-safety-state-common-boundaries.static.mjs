// Explicit cached source-isolated memory verifier. Never import/evaluate a live
// fixture or execute upstream SQL/process code. Mocks exist only in this file.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { types as stateNativeTypes } from "node:util";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import ts from "/private/tmp/pals-task024/node_modules/typescript/lib/typescript.js";

let checks = 0,
  traps = 0;
const check = (value) => {
  checks++;
  assert.ok(value);
};
const equal = (actual, expected) => {
  checks++;
  assert.deepEqual(actual, expected);
};
const same = (actual, expected) => {
  checks++;
  assert.equal(actual, expected);
};
const sha = (value) => createHash("sha256").update(value).digest("hex");
const commonURL = new URL(
  "../pilot-admission-current-safety-concurrency.integration.mjs",
  import.meta.url,
);
const common = readFileSync(commonURL, "utf8");
const state = readFileSync(
  "/private/tmp/pals-task021-state-output-adoption/supabase/tests/pilot-admission-current-safety-state-races.integration.mjs",
  "utf8",
);
const sources = {
  flow: readFileSync(
    new URL("pilot-current-safety-state-failure-flow.mjs", import.meta.url),
    "utf8",
  ),
  core: readFileSync(
    new URL("pilot-admission-current-safety.mjs", import.meta.url),
    "utf8",
  ),
  wire: readFileSync(
    new URL("pilot-current-safety-failure-wire.mjs", import.meta.url),
    "utf8",
  ),
};
equal(
  sha(state),
  "94fc316708079c921a14e2a4178dbdae10d57d465f02a4f5ce7caf242bee5db6",
);
for (const [key, expected] of Object.entries({
  flow: "f1e8cf00283274492a244cbb518de6f2bb5854e35f9b6d49dce9a2724a823fd5",
  core: "eafb99908353512261751a0aefe3aa62e0567d439a395e5b327236f9480e0003",
  wire: "ad2b570bd23be284a9bbd08acd45028d9711e23486e2243f52b5cdbec605e153",
}))
  equal(sha(sources[key]), expected);

function section(source, start, end) {
  equal(source.split(start).length, 2);
  equal(source.split(end).length, 2);
  return source.slice(source.indexOf(start), source.indexOf(end) + end.length);
}
const imports = section(
  common,
  "// BEGIN dormant state boundary imports",
  "// END dormant state boundary imports.\n",
);
const added = section(
  common,
  "// BEGIN dormant state awaited boundaries.",
  "// END dormant state awaited boundaries.\n",
);
const original = common.replace(imports, "").replace(added, "");
equal(
  sha(original),
  "4126c80132c8a644986dfe28f7640b87c3a2555a175f252782e220306bfc3582",
);
const tree = (source) =>
  ts.createSourceFile(
    "source.mjs",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
const commonTree = tree(common),
  originalTree = tree(original),
  stateTree = tree(state),
  addedTree = tree(added);
function functions(parsed) {
  return new Map(
    parsed.statements
      .filter(ts.isFunctionDeclaration)
      .map((node) => [node.name.text, node]),
  );
}
const commonFunctions = functions(commonTree),
  originalFunctions = functions(originalTree),
  stateFunctions = functions(stateTree),
  addedFunctions = functions(addedTree);
const api = [
  "createStateBoundaryContext",
  "captureStateFailureAwaited",
  "finishStateOwnedSessionsAwaited",
  "executeStateSuccessAwaited",
  "verifyStateCurrentPrecheckOutcome",
  "originalStateBoundaryUnavailable",
];
const exported = (parsed) =>
  parsed.statements
    .filter((node) =>
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
    )
    .map((node) => node.name?.text ?? node.getText(parsed));
equal(exported(addedTree), api);
equal(
  exported(commonTree).filter((name) => !api.includes(name)),
  exported(originalTree),
);
for (const [name, node] of originalFunctions)
  equal(
    commonFunctions.get(name).getText(commonTree),
    node.getText(originalTree),
  );
for (const name of api.slice(1, 5)) {
  const node = addedFunctions.get(name);
  check(node.modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword));
  equal(
    node.body.statements[0].getText(addedTree),
    "refuseStateBoundaryContact();",
  );
  check(
    node.parameters.every((p) => ts.isIdentifier(p.name) && !p.initializer),
  );
}
const refuse = addedFunctions.get("refuseStateBoundaryContact");
equal(refuse.body.statements.length, 1);
check(ts.isThrowStatement(refuse.body.statements[0]));
equal(addedFunctions.get("createStateBoundaryContext").parameters.length, 0);
check(!/\bcensus\s*\(|\bresetDisposable\s*\(|\bassertClean\s*\(/.test(added));
check(!/exactDiagnostic\s*\(|originalSqlDiagnostic\s*\(/.test(added));
check(!/console\.|process\.|setTimeout|setInterval|fetch\s*\(/.test(added));
check(
  !/firstAttempted|failureRecorded|flowStates|originalStateFailure/.test(added),
);
equal((added.match(/createStateFailureFlow\(\)/g) ?? []).length, 1);
equal(
  (added.match(/state\.flow\.invalidate\(state\.original\)/g) ?? []).length,
  1,
);
equal(
  (added.match(/state\.flow\.first\(state\.original, bundle\)/g) ?? []).length,
  1,
);
equal(
  (added.match(/state\.flow\.supplement\(receipt, original, bundle\)/g) ?? [])
    .length,
  1,
);
// Exact state current-only expansion, with unchanged assertion/fingerprint SQL.
const operation = stateFunctions.get("assertOperation").body.statements;
equal(
  operation[1].getText(stateTree),
  'if (route.id !== "CB") dynamicTime(result.submitted_at, window);',
);
const operationReturn = operation.at(-1).expression;
equal(operationReturn.expression.getText(stateTree), "assertSuccess");
equal(
  operationReturn.arguments.slice(1).map((n) => n.getText(stateTree)),
  ["before", "after", "result", "request"],
);
equal(
  operationReturn.arguments[0].getText(stateTree).replace(/\s+/g, " "),
  'lane === "retained" ? { ...route, provenance: "owned_block" } : route',
);
const precheck = stateFunctions.get("statePrecheckInner").getText(stateTree);
check(/endWindow\(start\),\s*"current"/.test(precheck));
check(/route\.request,\s*endWindow\(start\)/.test(precheck));
const verifier = addedFunctions
  .get("verifyStateCurrentPrecheckOutcome")
  .getText(addedTree);
check(verifier.includes(operation[1].getText(stateTree)));
check(
  verifier.includes(
    "assertSuccess(route, before, snapshot, result, route.request);",
  ),
);
check(verifier.includes("await stateBoundaryDeliver("));
check(added.includes('"rollback", "request"'));
check(added.includes("assert.equal(request, boundRoute.request);"));
check(added.includes('"supplemental-observation"'));
check(added.includes('"supplemental-closure"'));
check(
  !/"supplemental-reset"|"supplemental-restoration"|"supplemental-rollback"/.test(
    added,
  ),
);
check(
  sources.flow.includes(
    "if (state.unavailable || state.pending) throw fail(state);",
  ),
);
for (const literal of [
  "genericFailureLimits.records",
  "genericFailureLimits.total",
  "genericFailureLimits.differences",
  "await writeGenericFailureEvidence(record)",
])
  check(sources.flow.includes(literal));
check(sources.core.includes("genericFailureLimits.write"));

// No actual original module import/evaluation. Extract only this task's owned
// section and exact unchanged assertion primitives into an isolated data module.
// Fixed dependency names below are privately mocked, never publicly injectable.
const primitiveNames = [
  "marker",
  "originalSuiteError",
  "differences",
  "verifiedOutcome",
  "exactSnapshot",
  "dynamicTime",
  "assertSuccess",
];
const primitives = primitiveNames
  .map((name) => commonFunctions.get(name).getText(commonTree))
  .join("\n");
let fixedFactoryCalls = 0;
const flows = [],
  receipts = new WeakMap();
let mode = { type: "success" };
function createStateFailureFlow() {
  fixedFactoryCalls++;
  const state = {
    original: null,
    hasOriginal: false,
    records: [],
    invalidations: 0,
    unavailable: null,
  };
  const flow = Object.freeze({
    async first(error, bundle) {
      state.hasOriginal = true;
      state.original = error;
      state.records.push({ receipt: "first", error, bundle });
      if (mode.type === "refuse") throw new Error("Dormant refusal");
      if (mode.wait) await mode.wait;
      if (mode.type === "reject") throw flow.invalidate(error);
      if (state.unavailable) throw state.unavailable;
      return Object.freeze({});
    },
    async supplement(receipt, error, bundle) {
      state.records.push({ receipt, error, bundle });
      if (state.unavailable || mode.type === "reject")
        throw flow.invalidate(error);
      if (mode.wait) await mode.wait;
      return Object.freeze({});
    },
    invalidate(error) {
      state.invalidations++;
      if (!state.hasOriginal) {
        state.hasOriginal = true;
        state.original = error;
      }
      if (!state.unavailable) {
        state.unavailable = new Error("Mock exact flow unavailable");
        receipts.set(
          state.unavailable,
          Object.freeze({
            classification: "state-flow-unavailable",
            required_exit_status: 78,
            cleanup: "unverified",
            reset: "forbidden",
            target: "unestablished",
            settlement: "unproven",
          }),
        );
      }
      return state.unavailable;
    },
  });
  flows.push({ flow, state });
  return flow;
}
const originalStateFlowUnavailable = (error) => receipts.get(error) ?? null;
const genericFailureLimits = Object.freeze({ nodes: 4096, depth: 16 });
const routes = Object.freeze([
  Object.freeze({
    id: "CH",
    rpc: "submit_safety_report",
    mode: "hangout",
    purpose: "hangouts",
    provenance: "current_hangout",
  }),
  Object.freeze({
    id: "CP",
    rpc: "submit_safety_report",
    mode: "user",
    purpose: "people",
    provenance: "current_people",
  }),
  Object.freeze({
    id: "CB",
    rpc: "set_safety_block",
    purpose: "people",
    provenance: "current_visible_new_block",
  }),
]);
let sessionFactory,
  sqlFailure = null;
const events = [],
  sqlCalls = [],
  successCalls = [];
const session = (name) => {
  events.push(["session", name]);
  return sessionFactory();
};
const successSQL = (route, options) => {
  successCalls.push({ route, options });
  return "FIXED-MOCK-SUCCESS;";
};
const quote = (value) => `'${value}'`;
const sql = (text) => {
  sqlCalls.push(text);
  if (sqlFailure) throw sqlFailure;
  return "fixed-mock-fingerprint";
};
const rawAssertOutcome = ({
  result,
  expectedResult,
  before,
  after,
  expectedAfter = before,
}) => {
  assert.deepEqual(result, expectedResult);
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort());
  assert.deepEqual(after, expectedAfter);
};
const mocks = {
  assert,
  stateNativeTypes,
  createStateFailureFlow,
  originalStateFlowUnavailable,
  genericFailureLimits,
  routes,
  session,
  successSQL,
  quote,
  sql,
  rawAssertOutcome,
};
// A one-use private bridge only for this source-isolated verifier. Nothing in
// production reads globals, accepts mocks or exports inspection methods.
globalThis.__palsStateCommonStaticMocks = mocks;
const prefix = `const {assert,stateNativeTypes,createStateFailureFlow,originalStateFlowUnavailable,genericFailureLimits,routes,session,successSQL,quote,sql,rawAssertOutcome}=globalThis.__palsStateCommonStaticMocks;
delete globalThis.__palsStateCommonStaticMocks;
const privateSuiteErrors=new WeakMap();
const bounds="FIXED-MOCK-BOUNDS;";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
`;
const probes = `\nexport const staticPrivateProbe={stateBoundaryContexts,stateBoundaryOutcomes,stateBoundaryMarkers,stateBoundaryDeliver,stateBoundaryCopy,privateSuiteErrors};`;
const trap = () => {
  traps++;
  throw new Error("Static contact trapped");
};
const originals = new Map();
for (const name of [
  "spawn",
  "spawnSync",
  "exec",
  "execSync",
  "execFile",
  "execFileSync",
  "fork",
]) {
  originals.set(name, childProcess[name]);
  childProcess[name] = trap;
}
const originalFetch = globalThis.fetch;
globalThis.fetch = trap;
syncBuiltinESMExports();
try {
  const isolated = (source) => {
    globalThis.__palsStateCommonStaticMocks = mocks;
    return import(
      `data:text/javascript;base64,${Buffer.from(prefix + primitives + "\n" + source + probes).toString("base64")}`
    );
  };
  const refused = await isolated(added);
  const liveMemory = await isolated(
    added.replaceAll("  refuseStateBoundaryContact();\n", ""),
  );
  const probe = liveMemory.staticPrivateProbe;
  equal(
    Object.keys(refused).sort(),
    [
      ...api,
      "staticPrivateProbe",
      ...primitiveNames.filter((name) => name !== "marker"),
    ].sort(),
  );
  let inspections = 0;
  const hostile = new Proxy(
    {},
    {
      get() {
        inspections++;
        throw new Error("Getter inspected");
      },
      ownKeys() {
        inspections++;
        throw new Error("Keys inspected");
      },
      getPrototypeOf() {
        inspections++;
        throw new Error("Prototype inspected");
      },
    },
  );
  for (const name of api.slice(1, 5)) {
    const failure = await refused[name](
      hostile,
      hostile,
      hostile,
      hostile,
    ).catch((error) => error);
    same(failure.message, "State common boundary unavailable");
    equal(Object.keys(failure), []);
    same(refused.originalStateBoundaryUnavailable(failure), null);
  }
  same(inspections, 0);
  // Pre-flow failure after delivered evidence vetoes the same private flow;
  // repeated original catch keeps the exact rejected delivery identity.
  const originalError = new Error("PRIVATE original payload");
  originalError.secret = "PRIVATE raw value";
  const invalidContext = liveMemory.createStateBoundaryContext();
  const invalidError = await liveMemory
    .captureStateFailureAwaited(invalidContext, originalError, hostile)
    .catch((error) => error);
  const invalidAgain = await liveMemory
    .captureStateFailureAwaited(invalidContext, originalError, {})
    .catch((error) => error);
  same(invalidAgain, invalidError);
  same(flows.at(-1).state.records.length, 0);
  const deliveredContext = liveMemory.createStateBoundaryContext();
  await liveMemory.captureStateFailureAwaited(
    deliveredContext,
    originalError,
    {},
  );
  const laterOriginal = new Error("PRIVATE independent later original");
  const veto = await liveMemory
    .captureStateFailureAwaited(deliveredContext, laterOriginal, {})
    .catch((error) => error);
  same(
    liveMemory.originalStateBoundaryUnavailable(veto)?.required_exit_status,
    78,
  );
  same(
    probe.stateBoundaryContexts.get(deliveredContext).original,
    originalError,
  );
  same(flows.at(-1).state.original, originalError);
  same(flows.at(-1).state.records.length, 1);
  const handle = refused.createStateBoundaryContext();
  check(Object.isFrozen(handle));
  equal(Object.keys(handle), []);
  same(refused.originalStateBoundaryUnavailable(handle), null);
  for (const foreign of [
    {},
    hostile,
    new Proxy(handle, {}),
    Object.freeze({}),
  ]) {
    const failure = await liveMemory
      .captureStateFailureAwaited(foreign, hostile, hostile)
      .catch((error) => error);
    same(failure.message, "State common boundary unavailable");
    same(liveMemory.originalStateBoundaryUnavailable(failure), null);
  }
  same(inspections, 0);
  mode = { type: "reject" };
  const rejectedContext = liveMemory.createStateBoundaryContext();
  const first = liveMemory.captureStateFailureAwaited(
    rejectedContext,
    originalError,
    {},
  );
  const duplicate = liveMemory.captureStateFailureAwaited(
    rejectedContext,
    originalError,
    {},
  );
  const [firstError, duplicateError] = await Promise.all([
    first.catch((error) => error),
    duplicate.catch((error) => error),
  ]);
  same(firstError, duplicateError);
  same(
    probe.stateBoundaryContexts.get(rejectedContext).original,
    originalError,
  );
  equal(Object.keys(firstError), []);
  check(!JSON.stringify(firstError).includes("PRIVATE"));
  const exactReceipt = liveMemory.originalStateBoundaryUnavailable(firstError);
  same(
    liveMemory.originalStateBoundaryUnavailable(rejectedContext),
    exactReceipt,
  );
  same(exactReceipt.required_exit_status, 78);
  check(Object.isFrozen(exactReceipt));
  for (const copied of [
    new Error(firstError.message),
    { ...firstError },
    { ...exactReceipt },
    true,
    new Proxy(firstError, {}),
  ])
    same(liveMemory.originalStateBoundaryUnavailable(copied), null);
  same(flows.at(-1).state.records.length, 1);
  mode = { type: "refuse" };
  const refusedContext = liveMemory.createStateBoundaryContext();
  const flowRefusal = await liveMemory
    .captureStateFailureAwaited(refusedContext, originalError, {})
    .catch((error) => error);
  same(liveMemory.originalStateBoundaryUnavailable(flowRefusal), null);
  same(probe.stateBoundaryContexts.get(refusedContext).original, originalError);
  mode = { type: "success" };
  for (const input of [
    hostile,
    {
      get context() {
        inspections++;
        return {};
      },
    },
    { invalidKey: true },
    {
      snapshots: {
        after: {
          kind: "raw",
          value: {
            toJSON() {
              inspections++;
            },
          },
        },
      },
    },
    { observations: Array(2) },
    { observations: new Date() },
  ]) {
    const ctx = liveMemory.createStateBoundaryContext();
    const error = await liveMemory
      .captureStateFailureAwaited(ctx, originalError, input)
      .catch((failure) => failure);
    same(
      liveMemory.originalStateBoundaryUnavailable(error)?.required_exit_status,
      78,
    );
    same(probe.stateBoundaryContexts.get(ctx).original, originalError);
    same(flows.at(-1).state.records.length, 0);
    same(flows.at(-1).state.invalidations, 1);
  }
  same(inspections, 0);
  let release;
  mode = {
    type: "success",
    wait: new Promise((resolve) => {
      release = resolve;
    }),
  };
  const pendingContext = liveMemory.createStateBoundaryContext();
  let settled = false;
  const pending = liveMemory
    .captureStateFailureAwaited(pendingContext, originalError, {
      observations: { private: "owned-before-await" },
    })
    .then(() => {
      settled = true;
    });
  await Promise.resolve();
  same(settled, false);
  same(
    flows.at(-1).state.records[0].bundle.observations.private,
    "owned-before-await",
  );
  release();
  await pending;
  same(settled, true);
  mode = { type: "success" };
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const route = (kind = "CB") => ({
    ...routes.find((r) => r.id === kind),
    actor: id(1),
    host: id(2),
    peer: id(3),
    source: id(4),
    request: id(5),
    target: kind === "CH" ? id(4) : id(3),
  });
  const before = { "private.people_blocks": [] };
  const cbAfter = {
    "private.people_blocks": [{ blocker_id: id(1), blocked_id: id(3) }],
  };
  const output = (result, snapshot) =>
    `RESULT:${JSON.stringify(result)}\nSNAPSHOT:${JSON.stringify(snapshot)}\n`;
  function owned({
    text = output(true, cbAfter),
    sendError,
    closeError,
    doneError,
    exit = [0, null],
    endError,
  } = {}) {
    return {
      send() {
        events.push(["send"]);
        if (sendError) throw sendError;
      },
      child: {
        stdin: {
          end() {
            events.push(["end"]);
            if (endError) throw endError;
          },
        },
      },
      output() {
        events.push(["output"]);
        return text;
      },
      get done() {
        events.push(["done"]);
        return doneError ? Promise.reject(doneError) : Promise.resolve(exit);
      },
      async close() {
        events.push(["close"]);
        if (closeError) throw closeError;
      },
    };
  }
  sessionFactory = () => owned();
  // Empty completion is only this exact batch: a later accepted execution must
  // own-close and observe actual done before its token can be verified.
  const emptyContext = liveMemory.createStateBoundaryContext();
  const emptyAck = await liveMemory.finishStateOwnedSessionsAwaited(
    emptyContext,
    null,
  );
  const emptyState = probe.stateBoundaryContexts.get(emptyContext);
  const emptyFinish = emptyState.finishing;
  same(
    await liveMemory.finishStateOwnedSessionsAwaited(emptyContext, null),
    emptyAck,
  );
  same(emptyState.finishing, emptyFinish);
  events.length = 0;
  const afterEmptyToken = await liveMemory.executeStateSuccessAwaited(
    emptyContext,
    route(),
    before,
    { rollback: true },
  );
  check(emptyState.finishing !== emptyFinish);
  same(emptyState.finishing.batch.length, 1);
  same(emptyState.finishing.settled, true);
  same(emptyState.sessions[0].closeObserved, true);
  same(emptyState.sessions[0].doneObserved, true);
  same(events.filter(([event]) => event === "session").length, 1);
  same(events.filter(([event]) => event === "close").length, 1);
  same(events.filter(([event]) => event === "done").length, 2);
  check(
    events.findLastIndex(([event]) => event === "done") >
      events.findIndex(([event]) => event === "close"),
  );
  const completedAck = await liveMemory.finishStateOwnedSessionsAwaited(
    emptyContext,
    null,
  );
  same(
    await liveMemory.finishStateOwnedSessionsAwaited(emptyContext, null),
    completedAck,
  );
  same(events.filter(([event]) => event === "close").length, 1);
  same(events.filter(([event]) => event === "done").length, 2);
  await liveMemory.verifyStateCurrentPrecheckOutcome(
    emptyContext,
    afterEmptyToken,
    { start: "2026-09-29T00:00:00Z", end: "2026-09-29T00:00:01Z" },
  );
  same(emptyState.execution, null);
  // A later actual original never inherits the empty acknowledgement. Delivery
  // stays pending before ANY newly registered child cleanup and retains identity.
  for (const [deliveryType, childCount] of [
    ["success", 0],
    ["success", 1],
    ["reject", 0],
    ["reject", 1],
  ]) {
    const ctx = liveMemory.createStateBoundaryContext();
    const state = probe.stateBoundaryContexts.get(ctx);
    await liveMemory.finishStateOwnedSessionsAwaited(ctx, null);
    const prior = state.finishing;
    if (childCount) state.sessions.push({ owned: owned() });
    let deliverRelease;
    mode = {
      type: deliveryType,
      wait: new Promise((resolve) => {
        deliverRelease = resolve;
      }),
    };
    events.length = 0;
    let finishSettled = false;
    const pendingOriginal = liveMemory
      .finishStateOwnedSessionsAwaited(ctx, originalError)
      .catch((error) => {
        finishSettled = true;
        return error;
      });
    await Promise.resolve();
    await Promise.resolve();
    same(finishSettled, false);
    same(state.original, originalError);
    same(flows.at(-1).state.original, originalError);
    same(flows.at(-1).state.records.length, 1);
    check(state.finishing !== prior);
    same(state.finishing.hasOriginal, true);
    same(state.finishing.original, originalError);
    same(events.filter(([event]) => event === "close").length, 0);
    deliverRelease();
    const outward = await pendingOriginal;
    same(finishSettled, true);
    same(liveMemory.originalSuiteError(outward), originalError);
    equal(Object.keys(outward), []);
    check(state.sessions.every((entry) => entry.closeObserved));
    check(state.sessions.every((entry) => entry.doneObserved));
    same(events.filter(([event]) => event === "close").length, childCount);
    same(events.filter(([event]) => event === "done").length, childCount);
    same(
      await liveMemory
        .finishStateOwnedSessionsAwaited(ctx, originalError)
        .catch((error) => error),
      outward,
    );
    same(flows.at(-1).state.records.length, 1);
    if (deliveryType === "reject") {
      const storedRejection = await state.firstDelivery.catch((error) => error);
      same(
        await liveMemory
          .captureStateFailureAwaited(ctx, originalError, {})
          .catch((error) => error),
        storedRejection,
      );
      same(
        liveMemory.originalStateBoundaryUnavailable(outward),
        liveMemory.originalStateBoundaryUnavailable(storedRejection),
      );
      same(
        liveMemory.originalStateBoundaryUnavailable(outward)
          .required_exit_status,
        78,
      );
    }
    let createdAfterFailure = 0;
    sessionFactory = () => {
      createdAfterFailure++;
      return owned();
    };
    const noRecovery = await liveMemory
      .executeStateSuccessAwaited(ctx, route(), before, { rollback: true })
      .catch((error) => error);
    same(createdAfterFailure, 0);
    same(liveMemory.originalSuiteError(noRecovery), originalError);
    same(state.original, originalError);
  }
  mode = { type: "success" };
  // A pending owning finish rejects execute before its factory. The pre-child
  // rejection still retains/delivers its original and cannot recover the flow.
  const pendingFinishContext = liveMemory.createStateBoundaryContext();
  let releaseClose;
  const closeWait = new Promise((resolve) => {
    releaseClose = resolve;
  });
  const pendingChild = owned();
  pendingChild.close = async () => {
    events.push(["pending-close"]);
    await closeWait;
  };
  const pendingFinishState =
    probe.stateBoundaryContexts.get(pendingFinishContext);
  pendingFinishState.sessions.push({ owned: pendingChild });
  const firstFinish = liveMemory.finishStateOwnedSessionsAwaited(
    pendingFinishContext,
    null,
  );
  same(pendingFinishState.finishing.settled, false);
  let pendingCreated = 0;
  sessionFactory = () => {
    pendingCreated++;
    return owned();
  };
  const blockedExecute = liveMemory
    .executeStateSuccessAwaited(pendingFinishContext, route(), before, {
      rollback: true,
    })
    .catch((error) => error);
  await Promise.resolve();
  await Promise.resolve();
  same(pendingCreated, 0);
  same(pendingFinishState.sessions.length, 1);
  check(pendingFinishState.hasOriginal);
  same(flows.at(-1).state.records.length, 1);
  releaseClose();
  await firstFinish.catch(() => {});
  const blockedError = await blockedExecute;
  same(
    liveMemory.originalSuiteError(blockedError),
    pendingFinishState.original,
  );
  same(pendingFinishState.sessions[0].closeObserved, true);
  same(pendingFinishState.sessions[0].doneObserved, true);
  // Private isolated registrations exercise a changed batch while its earlier
  // generation is pending. No production caller owns this inspection bridge.
  const generationContext = liveMemory.createStateBoundaryContext();
  const generationState = probe.stateBoundaryContexts.get(generationContext);
  let generationRelease;
  const generationWait = new Promise((resolve) => {
    generationRelease = resolve;
  });
  const generationChild = owned();
  generationChild.close = async () => {
    events.push(["generation-close"]);
    await generationWait;
  };
  generationState.sessions.push({ owned: generationChild });
  const generationFirst = liveMemory.finishStateOwnedSessionsAwaited(
    generationContext,
    null,
  );
  const generationPrior = generationState.finishing;
  generationState.sessions.push({ owned: owned() }, { owned: owned() });
  events.length = 0;
  const generationSecond = liveMemory.finishStateOwnedSessionsAwaited(
    generationContext,
    null,
  );
  check(generationState.finishing !== generationPrior);
  same(generationState.finishing.batch.length, 3);
  same(generationState.finishing.settled, false);
  await Promise.resolve();
  same(events.length, 0);
  generationRelease();
  await generationFirst;
  const generationAck = await generationSecond;
  check(
    generationState.sessions.every(
      (registration) => registration.closeObserved && registration.doneObserved,
    ),
  );
  same(events.filter(([event]) => event === "close").length, 2);
  same(events.filter(([event]) => event === "done").length, 3);
  same(
    await liveMemory.finishStateOwnedSessionsAwaited(generationContext, null),
    generationAck,
  );
  same(events.filter(([event]) => event === "close").length, 2);
  same(events.filter(([event]) => event === "done").length, 3);
  // A changed original while the earlier owning close is pending begins first
  // delivery immediately. Failed close and actual done remain independent; the
  // later failure never replaces the supplied original or stored rejection.
  for (const deliveryType of ["success", "reject"]) {
    const ctx = liveMemory.createStateBoundaryContext();
    const state = probe.stateBoundaryContexts.get(ctx);
    const pendingCloseFailure = new Error("PRIVATE pending close failure");
    const pendingDoneFailure = new Error("PRIVATE pending done failure");
    let closeRelease, originalRelease;
    const pendingCloseWait = new Promise((resolve) => {
      closeRelease = resolve;
    });
    const child = owned({ doneError: pendingDoneFailure });
    child.close = async () => {
      events.push(["original-pending-close"]);
      await pendingCloseWait;
      throw pendingCloseFailure;
    };
    state.sessions.push({
      owned: child,
      closeObserved: false,
      doneObserved: false,
    });
    events.length = 0;
    const priorPending = liveMemory
      .finishStateOwnedSessionsAwaited(ctx, null)
      .catch((error) => error);
    const prior = state.finishing;
    mode = {
      type: deliveryType,
      wait: new Promise((resolve) => {
        originalRelease = resolve;
      }),
    };
    let changedSettled = false;
    const changedPending = liveMemory
      .finishStateOwnedSessionsAwaited(ctx, originalError)
      .catch((error) => {
        changedSettled = true;
        return error;
      });
    check(state.finishing !== prior);
    same(state.original, originalError);
    same(flows.at(-1).state.records[0].error, originalError);
    same(flows.at(-1).state.records[0].receipt, "first");
    same(changedSettled, false);
    same(events.filter(([event]) => event === "done").length, 0);
    originalRelease();
    await state.firstDelivery.catch(() => {});
    closeRelease();
    const priorError = await priorPending;
    const changedError = await changedPending;
    same(changedSettled, true);
    same(liveMemory.originalSuiteError(priorError), originalError);
    same(liveMemory.originalSuiteError(changedError), originalError);
    same(state.original, originalError);
    same(flows.at(-1).state.original, originalError);
    same(events.filter(([event]) => event === "done").length, 1);
    equal(
      flows.at(-1).state.records.map((record) => record.error),
      [originalError, pendingCloseFailure, pendingDoneFailure],
    );
    same(state.sessions[0].closeObserved, false);
    same(state.sessions[0].doneObserved, false);
    if (deliveryType === "reject") {
      same(
        await liveMemory
          .captureStateFailureAwaited(ctx, originalError, {})
          .catch((error) => error),
        await state.firstDelivery.catch((error) => error),
      );
      same(
        liveMemory.originalStateBoundaryUnavailable(changedError),
        liveMemory.originalStateBoundaryUnavailable(ctx),
      );
    }
    mode = { type: "success" };
  }
  sessionFactory = () => owned();
  const goodContext = liveMemory.createStateBoundaryContext();
  const mutableRoute = route(),
    mutableBefore = structuredClone(before);
  const token = await liveMemory.executeStateSuccessAwaited(
    goodContext,
    mutableRoute,
    mutableBefore,
    { rollback: true },
  );
  check(Object.isFrozen(token));
  equal(Object.keys(token), []);
  mutableRoute.request = id(9);
  mutableBefore["private.people_blocks"].push({ private: "substitution" });
  const acknowledgement = await liveMemory.verifyStateCurrentPrecheckOutcome(
    goodContext,
    token,
    { start: "2026-09-29T00:00:00Z", end: "2026-09-29T00:00:01Z" },
  );
  equal(Object.keys(acknowledgement), []);
  check(Object.isFrozen(acknowledgement));
  same(sqlCalls.length, 0);
  same(successCalls.at(-1).options.request, id(5));
  same(probe.stateBoundaryOutcomes.get(token).execution.route.request, id(5));
  const sameFlow = probe.stateBoundaryContexts.get(goodContext).flow;
  const factoriesBeforeReuse = fixedFactoryCalls;
  const closesBeforeReuse = events.filter(
    ([event]) => event === "close",
  ).length;
  const secondToken = await liveMemory.executeStateSuccessAwaited(
    goodContext,
    route(),
    before,
    { rollback: true },
  );
  check(secondToken !== token);
  same(probe.stateBoundaryContexts.get(goodContext).flow, sameFlow);
  same(fixedFactoryCalls, factoriesBeforeReuse);
  same(
    events.filter(([event]) => event === "close").length,
    closesBeforeReuse + 1,
  );
  await liveMemory.verifyStateCurrentPrecheckOutcome(goodContext, secondToken, {
    start: "2026-09-29T00:00:00Z",
    end: "2026-09-29T00:00:01Z",
  });
  same(probe.stateBoundaryOutcomes.get(token).execution.consumed, true);
  same(probe.stateBoundaryOutcomes.get(secondToken).execution.consumed, true);
  same(probe.stateBoundaryContexts.get(goodContext).execution, null);
  same(probe.stateBoundaryContexts.get(goodContext).sessions.length, 0);
  same(probe.stateBoundaryContexts.get(goodContext).finishing, null);
  for (const [ctx, copiedToken] of [
    [goodContext, {}],
    [liveMemory.createStateBoundaryContext(), token],
    [goodContext, new Proxy(token, {})],
  ]) {
    const error = await liveMemory
      .verifyStateCurrentPrecheckOutcome(ctx, copiedToken, hostile)
      .catch((failure) => failure);
    same(error.message, "State common boundary unavailable");
  }
  same(inspections, 0);
  const reused = await liveMemory
    .verifyStateCurrentPrecheckOutcome(goodContext, token, {})
    .catch((failure) => failure);
  same(reused.message, "State common boundary unavailable");
  // Parse one marker without destroying available other marker; inherited after
  // never becomes original raw precision or a fabricated expected slot.
  for (const [text, resultAvailable, snapshotAvailable] of [
    ['RESULT:{invalid}\nSNAPSHOT:{"private.people_blocks":[]}\n', false, true],
    ["RESULT:true\nSNAPSHOT:{invalid}\n", true, false],
    ["RESULT:{invalid}\nSNAPSHOT:{invalid}\n", false, false],
  ]) {
    sessionFactory = () => owned({ text });
    const ctx = liveMemory.createStateBoundaryContext();
    const error = await liveMemory
      .executeStateSuccessAwaited(ctx, route(), before, { rollback: true })
      .catch((failure) => failure);
    same(error.message, "State common boundary unavailable");
    const execution = probe.stateBoundaryContexts.get(ctx).execution;
    same(execution.hasResult, resultAvailable);
    same(execution.hasSnapshot, snapshotAvailable);
    const records = flows.at(-1).state.records;
    same(
      records[0].bundle.snapshots.after.kind,
      snapshotAvailable ? "inherited-withheld" : "missing",
    );
    same(records[0].bundle.snapshots.expected.kind, "missing");
    same(records.length, !resultAvailable && !snapshotAvailable ? 2 : 1);
  }
  // Original capture settles before OWN finally, and close failure cannot skip
  // actual done or replace first original. Every late failure is separate.
  const sendError = new Error("PRIVATE send"),
    closeError = new Error("PRIVATE close"),
    doneError = new Error("PRIVATE done");
  sessionFactory = () => owned({ sendError, closeError, doneError });
  let firstRelease;
  mode = {
    type: "success",
    wait: new Promise((resolve) => {
      firstRelease = resolve;
    }),
  };
  const lateContext = liveMemory.createStateBoundaryContext();
  events.length = 0;
  const operationPending = liveMemory
    .executeStateSuccessAwaited(lateContext, route(), before, {
      rollback: true,
    })
    .catch((failure) => failure);
  await Promise.resolve();
  await Promise.resolve();
  check(!events.some(([event]) => event === "close"));
  same(probe.stateBoundaryContexts.get(lateContext).original, sendError);
  firstRelease();
  const lateError = await operationPending;
  mode = { type: "success" };
  same(liveMemory.originalSuiteError(lateError), sendError);
  equal(
    flows.at(-1).state.records.map((r) => r.receipt),
    ["first", "supplemental-closure", "supplemental-closure"],
  );
  same(flows.at(-1).state.records[1].error, closeError);
  same(flows.at(-1).state.records[2].error, doneError);
  equal(
    probe.stateBoundaryContexts
      .get(lateContext)
      .deliveries.map((attempt) => attempt.original),
    [sendError, closeError, doneError],
  );
  check(
    events.findIndex(([event]) => event === "done") >
      events.findIndex(([event]) => event === "close"),
  );
  // Source-isolated private registrations model several common-owned partial
  // children; this is not a caller-supplied production ownership bridge.
  const multipleContext = liveMemory.createStateBoundaryContext();
  const multipleState = probe.stateBoundaryContexts.get(multipleContext);
  const close1 = new Error("PRIVATE first close"),
    done1 = new Error("PRIVATE first done"),
    close2 = new Error("PRIVATE second close"),
    done2 = new Error("PRIVATE second done");
  multipleState.sessions.push(
    { owned: owned({ closeError: close1, doneError: done1 }) },
    { owned: owned({ closeError: close2, doneError: done2 }) },
    { owned: owned() },
  );
  const multipleFailure = await liveMemory
    .finishStateOwnedSessionsAwaited(multipleContext, null)
    .catch((error) => error);
  same(liveMemory.originalSuiteError(multipleFailure), close1);
  equal(
    flows.at(-1).state.records.map((r) => r.error),
    [close1, done1, close2, done2],
  );
  equal(
    flows.at(-1).state.records.map((r) => r.receipt),
    [
      "first",
      "supplemental-closure",
      "supplemental-closure",
      "supplemental-closure",
    ],
  );
  check(
    multipleState.sessions[2].closeObserved &&
      multipleState.sessions[2].doneObserved,
  );
  const recordCount = flows.at(-1).state.records.length;
  await liveMemory
    .finishStateOwnedSessionsAwaited(multipleContext, null)
    .catch(() => {});
  same(flows.at(-1).state.records.length, recordCount);
  mode = { type: "refuse" };
  const refusedLateContext = liveMemory.createStateBoundaryContext();
  sessionFactory = () => owned({ sendError, closeError, doneError });
  const refusedLate = await liveMemory
    .executeStateSuccessAwaited(refusedLateContext, route(), before, {
      rollback: true,
    })
    .catch((error) => error);
  same(liveMemory.originalSuiteError(refusedLate), sendError);
  equal(
    probe.stateBoundaryContexts
      .get(refusedLateContext)
      .deliveries.map((attempt) => attempt.original),
    [sendError, closeError, doneError],
  );
  same(liveMemory.originalStateBoundaryUnavailable(refusedLate), null);
  mode = { type: "success" };
  // Direct finish original is delivered before close and never false-acknowledged.
  const finishContext = liveMemory.createStateBoundaryContext();
  const finished = await liveMemory
    .finishStateOwnedSessionsAwaited(finishContext, originalError)
    .catch((failure) => failure);
  same(liveMemory.originalSuiteError(finished), originalError);
  same(flows.at(-1).state.records.length, 1);
  // Child creation/send/end failures remain privately registered where available.
  for (const initialization of ["factory", "send", "end"]) {
    const error = new Error(`PRIVATE ${initialization}`);
    sessionFactory = () => {
      if (initialization === "factory") throw error;
      return owned({
        sendError: initialization === "send" ? error : null,
        endError: initialization === "end" ? error : null,
      });
    };
    const ctx = liveMemory.createStateBoundaryContext();
    const outward = await liveMemory
      .executeStateSuccessAwaited(ctx, route(), before, { rollback: true })
      .catch((failure) => failure);
    same(liveMemory.originalSuiteError(outward), error);
    same(
      probe.stateBoundaryContexts.get(ctx).sessions.length,
      initialization === "factory" ? 0 : 1,
    );
    equal(Object.keys(outward), []);
  }
  const getterExit = Object.defineProperty([0, null], "0", {
    get() {
      inspections++;
      throw new Error("Exit getter inspected");
    },
    enumerable: true,
  });
  for (const exit of [
    [1, null],
    [0, "SIGTERM"],
    [null, null],
    [],
    [undefined, null],
    getterExit,
  ]) {
    sessionFactory = () => owned({ exit });
    const ctx = liveMemory.createStateBoundaryContext();
    const failure = await liveMemory
      .executeStateSuccessAwaited(ctx, route(), before, { rollback: true })
      .catch((error) => error);
    same(failure.message, "State common boundary unavailable");
    check(probe.stateBoundaryContexts.get(ctx).hasOriginal);
    if (exit === getterExit)
      same(
        liveMemory.originalStateBoundaryUnavailable(failure)
          ?.required_exit_status,
        78,
      );
  }
  // Caller controls/selectors/methods never become an ownership bridge.
  for (const options of [
    { rollback: false },
    { rollback: true, request: id(9) },
    { rollback: true, lane: "retained" },
    { rollback: true, sink: hostile },
    hostile,
  ]) {
    sessionFactory = () => {
      traps++;
      throw new Error("Unexpected session");
    };
    const ctx = liveMemory.createStateBoundaryContext();
    const failure = await liveMemory
      .executeStateSuccessAwaited(ctx, route(), before, options)
      .catch((error) => error);
    same(
      liveMemory.originalStateBoundaryUnavailable(failure)
        ?.required_exit_status,
      78,
    );
    same(probe.stateBoundaryContexts.get(ctx).sessions.length, 0);
  }
  same(inspections, 0);
  // Non-CB exact fingerprint SQL stays inside refused-first async verifier.
  const reportRoute = route("CP"),
    result = { receipt_id: id(7), submitted_at: "2026-09-29T00:00:00.500Z" };
  const reportBefore = {
    "private.safety_reports": [],
    "private.safety_report_requests": [],
  };
  const reportAfter = {
    "private.safety_reports": [
      {
        id: id(7),
        submitted_at: result.submitted_at,
        reporter_id: id(1),
        target_type: "user",
        target_id: id(3),
        category: "harassment",
        narrative: null,
        provenance_kind: "current_people",
        provenance_ref_id: id(3),
      },
    ],
    "private.safety_report_requests": [
      {
        reporter_id: id(1),
        request_id: id(5),
        input_fingerprint: "fixed-mock-fingerprint",
        report_id: id(7),
      },
    ],
  };
  sessionFactory = () => owned({ text: output(result, reportAfter) });
  const reportContext = liveMemory.createStateBoundaryContext();
  const reportToken = await liveMemory.executeStateSuccessAwaited(
    reportContext,
    reportRoute,
    reportBefore,
    { rollback: true },
  );
  await liveMemory.verifyStateCurrentPrecheckOutcome(
    reportContext,
    reportToken,
    { start: "2026-09-29T00:00:00Z", end: "2026-09-29T00:00:01Z" },
  );
  same(
    sqlCalls.at(-1),
    "select md5(jsonb_build_array('user','00000000-0000-4000-8000-000000000003'::uuid,'harassment',null)::text)",
  );
  const fingerprintFailure = new Error(
    "PRIVATE synchronous original SQL identity",
  );
  const sqlContext = liveMemory.createStateBoundaryContext();
  const sqlToken = await liveMemory.executeStateSuccessAwaited(
    sqlContext,
    reportRoute,
    reportBefore,
    { rollback: true },
  );
  sqlFailure = fingerprintFailure;
  const sqlError = await liveMemory
    .verifyStateCurrentPrecheckOutcome(sqlContext, sqlToken, {
      start: "2026-09-29T00:00:00Z",
      end: "2026-09-29T00:00:01Z",
    })
    .catch((error) => error);
  sqlFailure = null;
  same(liveMemory.originalSuiteError(sqlError), fingerprintFailure);
  same(flows.at(-1).state.records[0].error, fingerprintFailure);
  equal(Object.keys(sqlError), []);
  // Window copy/shape failures invalidate, rather than minting observation proof.
  for (const window of [
    hostile,
    { start: "bad", end: "bad" },
    { start: "2026-09-30", end: "2026-09-29" },
    { start: "2026-09-29", end: "2026-09-30", lane: "current" },
  ]) {
    sessionFactory = () => owned();
    const ctx = liveMemory.createStateBoundaryContext();
    const tok = await liveMemory.executeStateSuccessAwaited(
      ctx,
      route(),
      before,
      { rollback: true },
    );
    const failure = await liveMemory
      .verifyStateCurrentPrecheckOutcome(ctx, tok, window)
      .catch((error) => error);
    same(
      liveMemory.originalStateBoundaryUnavailable(failure)
        ?.required_exit_status,
      78,
    );
    same(flows.at(-1).state.invalidations, 1);
  }
  for (const text of [
    'RESULT:{"toJSON":null}\nSNAPSHOT:{"private.people_blocks":[]}\n',
    'RESULT:true\nSNAPSHOT:{"toJSON":null}\n',
  ]) {
    sessionFactory = () => owned({ text });
    const ctx = liveMemory.createStateBoundaryContext();
    const failure = await liveMemory
      .executeStateSuccessAwaited(ctx, route(), before, { rollback: true })
      .catch((error) => error);
    same(
      liveMemory.originalStateBoundaryUnavailable(failure)
        ?.required_exit_status,
      78,
    );
    const execution = probe.stateBoundaryContexts.get(ctx).execution;
    check(execution.hasResult || execution.hasSnapshot);
    same(flows.at(-1).state.invalidations, 1);
  }
  // Node/depth/cycle/own-data limits invalidate without contact/record allocation.
  let deep = {};
  for (let i = 0; i < 18; i++) deep = { child: deep };
  const cycle = {};
  cycle.self = cycle;
  for (const data of [
    deep,
    cycle,
    Array.from({ length: 4097 }, () => null),
    { toJSON: null },
    { n: NaN },
  ]) {
    const ctx = liveMemory.createStateBoundaryContext();
    const failure = await liveMemory
      .captureStateFailureAwaited(ctx, originalError, { observations: data })
      .catch((error) => error);
    same(
      liveMemory.originalStateBoundaryUnavailable(failure)
        ?.required_exit_status,
      78,
    );
    same(flows.at(-1).state.records.length, 0);
  }
  same(inspections, 0);
  same(traps, 0);
  same(fixedFactoryCalls, flows.length);
  console.log(
    JSON.stringify({
      checks,
      trapped_contacts: traps,
      raw_getter_proxy_inspections: inspections,
      added_exports: api.length,
      original_functions_preserved: originalFunctions.size,
      baseline_common_sha256: sha(original),
      new_section_sha256: sha(added),
      primitive_sha256: sha(primitives),
      original_ast_sha256: sha(ts.createPrinter().printFile(originalTree)),
      new_section_ast_sha256: sha(ts.createPrinter().printFile(addedTree)),
      actual_state_adopted: false,
      target_runtime_credit: 0,
      required_future_unavailable_exit: 78,
    }),
  );
} finally {
  for (const [name, fn] of originals) childProcess[name] = fn;
  globalThis.fetch = originalFetch;
  delete globalThis.__palsStateCommonStaticMocks;
  syncBuiltinESMExports();
}
