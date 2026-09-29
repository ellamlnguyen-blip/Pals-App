// Offline verifier only. Never import historical modules or run a target suite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire, syncBuiltinESMExports } from "node:module";
import childProcess from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const require = createRequire("/private/tmp/pals-task024/package.json");
const espree = createRequire(require.resolve("eslint"))("espree");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (name) => readFileSync(`${root}${name}`, "utf8");
const digest = (source) => createHash("sha256").update(source).digest("hex");
const parse = (source) =>
  espree.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    range: true,
  });
const cleanAst = (node) =>
  JSON.parse(
    JSON.stringify(node, (key, value) =>
      ["range", "start", "end", "loc", "raw"].includes(key) ? undefined : value,
    ),
  );
const functions = (ast) => {
  const result = [];
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (
      value.type === "FunctionDeclaration" ||
      value.type === "FunctionExpression" ||
      value.type === "ArrowFunctionExpression"
    )
      result.push(value);
    for (const [key, child] of Object.entries(value)) {
      if (key === "range") continue;
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  }
  visit(ast);
  return result;
};
const helpers = Object.freeze({
  authority: [
    "authority",
    "88311a1740ce2594e69f49993d0968d8387242ba1bcb3e74d0b1ec578ea224bd",
  ],
  owner: [
    "owner",
    "809cd2b5047873ba85b03bf6ff29ba6d5636bd7f48955a959997f8a0a93fbf24",
  ],
  sourceSafety: [
    "source-safety",
    "c170bdbe4bd446747c16d51eda6c1537d9323f1badeb940059fa9c6bde171433",
  ],
  lifecycle: [
    "lifecycle",
    "e53ea77077e6c693017f3a4971681e7483b6fd2145693bc9573b1b5d408aed56",
  ],
  cohostChat: [
    "cohost-chat",
    "fb7747dd9ef5a9603e967f19a062ebb4237e1732adbc123e17a3e929ffaa00d8",
  ],
});
const direct = Object.freeze({
  authority: [
    "pilot-admission-authority-http",
    "pilot-admission-authority-concurrency",
  ],
  owner: ["pilot-admission-owner-http", "pilot-admission-owner-concurrency"],
  sourceSafety: [
    "pilot-admission-source-safety-http",
    "pilot-admission-source-safety-concurrency",
  ],
  lifecycle: [
    "pilot-admission-lifecycle-http",
    "pilot-admission-lifecycle-concurrency",
    "pilot-lifecycle-source-races",
    "pilot-lifecycle-block-membership-races",
    "pilot-lifecycle-crossings",
  ],
  cohostChat: [
    "pilot-admission-cohost-chat-http",
    "pilot-admission-cohost-chat-concurrency",
    "pilot-cohost-chat-identity-races",
    "pilot-cohost-chat-source-state-races",
    "pilot-cohost-chat-absence-retry",
    "pilot-cohost-chat-crossings",
  ],
});
let checks = 0;
function check(value) {
  assert.ok(value);
  checks++;
}
const source = read(
  "supabase/tests/helpers/pilot-current-safety-legacy-compat.mjs",
);
const ast = parse(source);
const coreSource = read(
  "supabase/tests/helpers/pilot-admission-current-safety.mjs",
);
const coreAst = parse(coreSource);
const grammar = functions(ast).find(
  (node) => node.id?.name === "completeSqlDiagnostic",
);
const originalGrammar = functions(coreAst).find(
  (node) => node.id?.name === "completeSqlDiagnostic",
);
const grammarText = source.slice(...grammar.range);
assert.equal(grammarText, coreSource.slice(...originalGrammar.range));
checks++;
assert.deepEqual(cleanAst(grammar), cleanAst(originalGrammar));
checks++;
// Frozen core2fef includes original accessor + guarded binary/signed/quiescence.
assert.equal(
  digest(coreSource),
  "f6555a07f557ea8306b6ae3bbb90b728c247cda71e6724ff8be9873db9c899f9",
);
checks++;
// Fixed reviewed rawSql unit under inert command injection, never a target
// module/suite. This proves the exact emitted Error key rather than matching a
// sanitized message. Only synthetic strings enter this VM; no binary is run.
const rawUnit = coreSource.slice(
  coreSource.indexOf("// PRIVATE SQL DIAGNOSTIC START"),
  coreSource.indexOf("export const expectedMigrationVersions"),
);
const sqlContext = vm.createContext({
  createHash,
  Buffer,
  dockerBinary: "synthetic-only",
  args: [],
  transportBudgets: { sql: 1 },
  command: () => "original successful result",
});
vm.runInContext(
  `${rawUnit.replace("export function originalSqlDiagnostic", "function originalSqlDiagnostic")}\nglobalThis.invoke=rawSql; globalThis.diagnostic=originalSqlDiagnostic;`,
  sqlContext,
);
assert.equal(sqlContext.invoke("inert"), "original successful result");
checks++;
function sqlFailure(stderr, status = 1, signal = null) {
  sqlContext.command = () => {
    const error = new Error("synthetic private child");
    Object.assign(error, { status, signal, stderr });
    throw error;
  };
  try {
    sqlContext.invoke("inert SQL");
    assert.fail("expected mock failure");
  } catch (error) {
    return error;
  }
}
const knownOwner = sqlFailure(
  "ERROR:  42501: Owner operation unavailable\nDETAIL:  synthetic opaque private value\n",
);
assert.equal(
  sqlContext.diagnostic(knownOwner).message,
  "Owner operation unavailable",
);
checks++;
check(
  !knownOwner.message.includes("Owner operation unavailable") &&
    !knownOwner.message.includes("opaque"),
);
check(
  sqlContext.diagnostic(new Error(knownOwner.message)).code === "unavailable",
);
check(
  sqlContext.diagnostic(
    sqlFailure(
      "ERROR:  23514: Photos must be existing owned private objects\n",
    ),
  ).code === "23514",
);
check(
  sqlContext.diagnostic(
    sqlFailure("ERROR:  23503: synthetic private FK\nDETAIL:  synthetic key\n"),
  ).message === "unavailable",
);
check(
  sqlContext.diagnostic(
    sqlFailure("ERROR:  42501: Owner operation unavailable suffix\n"),
  ).code === "unavailable",
);
check(
  sqlContext.diagnostic(
    sqlFailure("ERROR:  42501: Owner operation unavailable\n", null, "SIGKILL"),
  ).code === "unavailable",
);
const originalSession = functions(coreAst).find(
  (node) => node.id?.name === "session",
);
const constructorCall = originalSession.body.body.find(
  (node) =>
    node.type === "VariableDeclaration" &&
    node.declarations[0].id.name === "owned",
).declarations[0].init;
check(
  constructorCall.callee.name === "ownedSession" &&
    constructorCall.arguments.length === 3 &&
    constructorCall.arguments[2].type === "TemplateLiteral",
);
assert.deepEqual(
  constructorCall.arguments[2].quasis.map((part) => part.value.cooked),
  ["set application_name=", ";\n"],
);
checks++;
check(
  constructorCall.arguments[2].expressions[0].callee.name === "quote" &&
    constructorCall.arguments[2].expressions[0].arguments[0].name === "name",
);
const expectedEntries = [
  "sql",
  "localTarget",
  "session",
  "until",
  "restoreDefaults",
  "resetDisposable",
  "assertClean",
  "booleanRace",
  "sourceRace",
  "lifecycleRace",
  "cohostRace",
  "raceBody",
  "createLegacyCompatibility",
];
for (const name of expectedEntries) {
  const fn = functions(ast).find((node) => node.id?.name === name);
  check(
    fn?.body.body[0].type === "ExpressionStatement" &&
      fn.body.body[0].expression.callee?.name ===
        "requireReviewedLegacyRelease",
  );
  check(
    fn.params.every(
      (param) =>
        param.type === "Identifier" ||
        (param.type === "AssignmentPattern" &&
          param.left.type === "Identifier" &&
          param.right.type === "Literal"),
    ),
  );
}
for (const name of [
  "request",
  "rpc",
  "storage",
  "signedGet",
  "quiescence",
  "send",
  "close",
]) {
  const enclosing = functions(ast).filter(
    (node) => node.id?.name === "fixedNamespace",
  )[0];
  const hits = [];
  function scan(value) {
    if (!value || typeof value !== "object") return;
    if (
      value.type === "Property" &&
      value.key?.name === name &&
      value.method === true
    )
      hits.push(value.value);
    for (const child of Object.values(value))
      if (Array.isArray(child)) child.forEach(scan);
      else if (child && typeof child === "object") scan(child);
  }
  scan(enclosing);
  check(
    hits.length === 1 &&
      hits[0].body.body[0].expression?.callee?.name ===
        "requireReviewedLegacyRelease",
  );
}
const exported = ast.body
  .filter((node) => node.type === "ExportNamedDeclaration")
  .flatMap((node) =>
    node.declaration.type === "VariableDeclaration"
      ? node.declaration.declarations.map((item) => item.id.name)
      : [node.declaration.id.name],
  );
assert.deepEqual(
  exported.sort(),
  [
    "authority",
    "cohostChat",
    "createLegacyCompatibility",
    "lifecycle",
    "owner",
    "runLegacyCompatibilityExamples",
    "sourceSafety",
  ].sort(),
);
checks++;
check(
  !source.includes("process.env") &&
    !source.includes("fetch(") &&
    !source.includes("writeFile") &&
    !source.includes(".kill("),
);
check(
  ast.body
    .filter((node) => node.type === "ImportDeclaration")
    .every((node) =>
      [
        "node:assert/strict",
        "node:crypto",
        "node:events",
        "./pilot-admission-current-safety.mjs",
        "../pilot-admission-current-safety-concurrency.integration.mjs",
      ].includes(node.source.value),
    ),
);
const racer = functions(ast).find((node) => node.id?.name === "raceBody");
const catcher = racer.body.body.find((node) => node.type === "TryStatement");
check(
  catcher.handler.body.body.some(
    (node) =>
      node.type === "ExpressionStatement" &&
      node.expression.type === "AssignmentExpression" &&
      node.expression.right.type === "AwaitExpression" &&
      node.expression.right.argument.callee.name === "captureFirst",
  ),
);
check(
  catcher.finalizer.body.some(
    (node) =>
      node.type === "VariableDeclaration" &&
      node.declarations[0].init.type === "AwaitExpression" &&
      node.declarations[0].init.argument.callee.name === "settleSessions",
  ),
);
// Startup raw listeners attach before either caller query; both sessions retained
// before attachment and try begins before any construction.
const raceText = source.slice(...racer.range);
check(
  raceText.indexOf("sessions.push(first)") <
    raceText.indexOf("attachPrivateCapture(first)") &&
    raceText.indexOf("attachPrivateCapture(second)") <
      raceText.indexOf("first.send("),
);
const inventory = {},
  originalModuleHashes = {};
for (const [namespace, [file, hash]] of Object.entries(helpers)) {
  const original = read(`supabase/tests/helpers/pilot-admission-${file}.mjs`);
  assert.equal(digest(original), hash);
  checks++;
  const originalRace = functions(parse(original)).find(
    (node) => node.id?.name === "race",
  );
  const replacementName =
    namespace === "authority" || namespace === "owner"
      ? "booleanRace"
      : namespace === "sourceSafety"
        ? "sourceRace"
        : namespace === "lifecycle"
          ? "lifecycleRace"
          : "cohostRace";
  const replacementRace = functions(ast).find(
    (node) => node.id?.name === replacementName,
  );
  assert.deepEqual(
    cleanAst(originalRace.params),
    cleanAst(replacementRace.params),
  );
  checks++;
  const consumed = new Set();
  // Read only direct sources plus helper callsites. Never import/execute them.
  const dependencyHelpers =
    namespace === "lifecycle"
      ? ["helpers/pilot-lifecycle-fixtures"]
      : namespace === "cohostChat"
        ? [
            "helpers/pilot-cohost-chat-fixtures",
            "helpers/pilot-cohost-chat-matrix",
          ]
        : [];
  for (const name of [...direct[namespace], ...dependencyHelpers]) {
    const moduleSource = read(
      `supabase/tests/${name}.integration.mjs`.replace(
        /helpers\/(.*)\.integration\.mjs$/,
        "helpers/$1.mjs",
      ),
    );
    originalModuleHashes[name] = digest(moduleSource);
    const moduleAst = parse(moduleSource);
    for (const item of moduleAst.body)
      if (
        item.type === "ImportDeclaration" &&
        item.source.value.endsWith(`/pilot-admission-${file}.mjs`)
      )
        for (const specifier of item.specifiers) {
          assert.equal(specifier.type, "ImportSpecifier");
          consumed.add(specifier.imported.name);
        }
  }
  inventory[namespace] = [...consumed].sort();
}
// Inert import + public refusals: changing any imported dependency to contact
// attempts trips a trap before a target is touched.
let traps = 0;
const saved = new Map();
for (const key of [
  "spawn",
  "spawnSync",
  "exec",
  "execSync",
  "execFile",
  "execFileSync",
  "fork",
]) {
  saved.set(key, childProcess[key]);
  childProcess[key] = () => {
    traps++;
    throw new Error("Offline contact trap");
  };
}
const savedFetch = globalThis.fetch;
globalThis.fetch = () => {
  traps++;
  throw new Error("Offline contact trap");
};
syncBuiltinESMExports();
let exampleResult;
try {
  const helper = await import("./pilot-current-safety-legacy-compat.mjs");
  const common =
    await import("../pilot-admission-current-safety-concurrency.integration.mjs");
  const neutral = common.neutralSuiteError(knownOwner);
  check(
    common.originalSuiteError(neutral) === knownOwner &&
      sqlContext.diagnostic(common.originalSuiteError(neutral)).message ===
        "Owner operation unavailable",
  );
  const hostile = new Proxy(
    {},
    {
      get() {
        throw new Error("argument inspected before refusal");
      },
      ownKeys() {
        throw new Error("argument enumerated before refusal");
      },
    },
  );
  assert.throws(
    () => helper.createLegacyCompatibility(hostile),
    /Reviewed legacy compatibility release required/,
  );
  checks++;
  for (const namespace of Object.keys(helpers)) {
    const current = helper[namespace];
    for (const imported of inventory[namespace]) {
      assert.ok(
        Object.hasOwn(current, imported),
        `${namespace}.${imported} missing`,
      );
      checks++;
    }
    for (const name of [
      "sql",
      "localTarget",
      "session",
      "restoreDefaults",
      "resetDisposable",
      "assertClean",
    ].filter((name) => Object.hasOwn(current, name))) {
      assert.throws(
        () => current[name](hostile),
        /Reviewed legacy compatibility release required/,
      );
      checks++;
    }
    await assert.rejects(
      current.race(hostile, hostile, hostile, hostile, hostile, hostile),
      /Reviewed legacy compatibility release required/,
    );
    checks++;
    if (current.until) {
      await assert.rejects(
        current.until(hostile),
        /Reviewed legacy compatibility release required/,
      );
      checks++;
    }
    for (const lane of [
      "current24",
      "current25",
      "current26",
      "prior25-upgrade",
      "prior26-upgrade",
      "current27",
    ]) {
      assert.throws(
        () => current.localTarget(lane),
        /Reviewed legacy compatibility release required/,
      );
      checks++;
    }
  }
  exampleResult = await helper.runLegacyCompatibilityExamples();
  assert.equal(traps, 0);
  checks++;
} finally {
  for (const [key, value] of saved) childProcess[key] = value;
  globalThis.fetch = savedFetch;
  syncBuiltinESMExports();
}
console.log(
  JSON.stringify({
    offline: true,
    checks,
    examples: exampleResult,
    attemptedContacts: traps,
    grammarSha256: digest(grammarText),
    grammarAstSha256: digest(JSON.stringify(cleanAst(grammar))),
    consumedExports: inventory,
    originalModuleHashes,
  }),
);
