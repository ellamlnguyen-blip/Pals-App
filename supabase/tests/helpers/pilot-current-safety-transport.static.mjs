// Offline only: no target helper function is invoked. The private transport unit
// is isolated from source into a VM; injection exists only in this verifier.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, rmSync, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import * as childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";

const source = readFileSync(
  new URL("./pilot-admission-current-safety.mjs", import.meta.url),
  "utf8",
);
const directory = mkdtempSync(join(tmpdir(), "pals-offline-transport-"));
const privateUnit = source
  .split("// PRIVATE TRANSPORT START:")[1]
  .split("\n")
  .slice(1)
  .join("\n")
  .split("// PRIVATE TRANSPORT END")[0];
const redactor = source.slice(
  source.indexOf("const redact ="),
  source.indexOf("function environmentGuard()"),
);
const censusSource = readFileSync(
  new URL("./pilot-current-safety-fixtures.mjs", import.meta.url),
  "utf8",
);
const censusTables = vm.runInNewContext(
  censusSource
    .split("export const censusTables = Object.freeze(")[1]
    .split(");")[0],
);
const executable = process.execPath;
let attempts = 0;
const originalSpawn = childProcess.default.spawn;
const originalExec = childProcess.default.execFileSync;
const originalFetch = globalThis.fetch;
try {
  childProcess.default.spawn = childProcess.default.execFileSync = () => {
    attempts++;
    throw new Error("Target contact forbidden");
  };
  globalThis.fetch = () => {
    attempts++;
    throw new Error("Target contact forbidden");
  };
  syncBuiltinESMExports();
  await import("./pilot-admission-current-safety.mjs");
  assert.equal(attempts, 0, "imports must remain inert");
} finally {
  childProcess.default.spawn = originalSpawn;
  childProcess.default.execFileSync = originalExec;
  globalThis.fetch = originalFetch;
  syncBuiltinESMExports();
}
const context = vm.createContext({
  spawn: originalSpawn,
  process: { env: {} },
  execFileSync: originalExec,
  Buffer,
  censusTables,
  createWriteStream,
  setTimeout,
  clearTimeout,
  URL,
  AbortController,
  AbortSignal,
  Uint8Array,
});
// Short budgets affect only this isolated offline copy, never production exports.
const isolated = privateUnit
  .replace("session: 90_000", "session: 250")
  .replace("write: 2_000", "write: 75")
  .replace("close: 10_000", "close: 75")
  .replace("exit: 5_000", "exit: 100");
vm.runInContext(
  `${redactor}\n${isolated}\nglobalThis.unit = { command, ownedSession, runOwnedProcess, redact, moduleBudget, transportBudgets, failureReceiver, writeFailureRecord, validateHttpFailureRecord, failureWireLimits, httpFixtureKeys, httpOutcomeIds, httpFailureIds, ownedHttpTransport, guardedHttpUrl, ownedHttpBudgets };`,
  context,
);
const unit = context.unit;
const options = {
  cwd: directory,
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
};
const nodeArgs = (script) => ["-e", script];
let checks = 0;
try {
  assert.equal(
    unit.command(
      executable,
      nodeArgs("process.stdout.write('success')"),
      options,
      1000,
    ),
    "success",
  );
  checks++;
  assert.throws(
    () =>
      unit.command(
        executable,
        nodeArgs("setInterval(()=>{},1000)"),
        options,
        75,
      ),
    (error) =>
      error.code === "ETIMEDOUT" && error.signal === "SIGKILL" && error.pid > 0,
  );
  checks++;
  assert.throws(
    () => unit.command(join(directory, "missing"), [], options, 100),
    (error) => error.code === "ENOENT",
  );
  checks++;
  assert.throws(
    () => unit.command(executable, nodeArgs("process.exit(9)"), options, 1000),
    (error) => error.status === 9,
  );
  checks++;
  const good = unit.ownedSession(
    executable,
    nodeArgs(
      "process.stdin.resume();process.stdin.on('end',()=>process.stdout.write('complete'))",
    ),
    "initial\n",
  );
  await good.close();
  assert.equal((await good.done)[0], 0);
  assert.equal(good.output(), "complete");
  checks++;
  const interrupted = unit.ownedSession(
    executable,
    nodeArgs(
      "process.stdin.once('data',()=>process.stderr.write('ERROR: 42501: Safety report unavailable\\n',()=>process.kill(process.pid,'SIGKILL')))",
    ),
    "initial\n",
  );
  await assert.rejects(interrupted.done, /process interrupted/);
  assert.equal(interrupted.child.signalCode, "SIGKILL");
  assert.match(interrupted.output(), /42501: Safety report unavailable/);
  await assert.rejects(interrupted.close(), /process interrupted/);
  checks++;
  const denied = unit.ownedSession(
    executable,
    nodeArgs(
      "process.stdin.once('data',()=>process.stderr.write('ERROR: 42501: Safety report unavailable\\n',()=>process.exit(1)))",
    ),
    "initial\n",
  );
  assert.equal((await denied.done)[0], 1);
  assert.match(denied.output(), /42501: Safety report unavailable/);
  await denied.close();
  checks++;
  let startupAttempts = 0;
  context.spawn = () => {
    startupAttempts++;
    throw new Error("Injection reached spawn");
  };
  for (const key of ["NODE_OPTIONS", "NODE_PATH"]) {
    await assert.rejects(
      unit.runOwnedProcess(
        executable,
        nodeArgs("process.exit(0)"),
        {
          cwd: directory,
          env: {
            [key]:
              key === "NODE_OPTIONS"
                ? "--require=/synthetic/injection.cjs"
                : "/synthetic/injection",
          },
        },
        1000,
      ),
      /Node startup override forbidden/,
    );
    await assert.rejects(
      unit.runOwnedProcess(executable, [], { env: { [key]: "" } }, 1000),
      /Node startup override forbidden/,
    );
  }
  assert.equal(
    startupAttempts,
    0,
    "startup override rejected before owned child spawn",
  );
  context.spawn = originalSpawn;
  checks++;
  const blocked = unit.ownedSession(
    executable,
    nodeArgs("process.stdin.pause();setInterval(()=>{},1000)"),
    "initial\n",
  );
  blocked.send("x".repeat(2 * 1024 * 1024));
  await assert.rejects(blocked.done, /input timed out/);
  assert.notEqual(
    blocked.child.signalCode,
    null,
    "actual owned process exit observed",
  );
  await assert.rejects(blocked.close(), /input timed out/);
  checks++;
  const closing = unit.ownedSession(
    executable,
    nodeArgs("process.stdin.resume();setInterval(()=>{},1000)"),
    "initial\n",
  );
  await assert.rejects(closing.close(), /close timed out/);
  assert.equal(closing.child.signalCode, "SIGKILL");
  checks++;
  const missing = unit.ownedSession(
    join(directory, "missing"),
    [],
    "initial\n",
  );
  await assert.rejects(missing.done, /spawn\/transport failed/);
  await assert.rejects(missing.close(), /spawn\/transport failed/);
  checks++;
  assert.equal(
    await unit.runOwnedProcess(
      executable,
      nodeArgs("process.stdout.write('whole module')"),
      { cwd: directory },
      1000,
    ),
    "whole module",
  );
  checks++;
  await assert.rejects(
    unit.runOwnedProcess(
      executable,
      nodeArgs("while(true){}"),
      { cwd: directory },
      75,
    ),
    /deadline interrupted/,
  );
  checks++;
  await assert.rejects(
    unit.runOwnedProcess(
      executable,
      nodeArgs("process.exit(9)"),
      { cwd: directory },
      1000,
    ),
    /module failed/,
  );
  checks++;
  await assert.rejects(
    unit.runOwnedProcess(
      join(directory, "missing"),
      [],
      { cwd: directory },
      100,
    ),
    /spawn failed/,
  );
  checks++;
  // HTTP-only budget; all other exact allowlist entries retain thirty minutes.
  assert.equal(
    unit.moduleBudget("pilot-admission-current-safety-http.integration.mjs"),
    24 * 60 * 60_000,
  );
  for (const name of [
    "pilot-admission-current-safety-concurrency.integration.mjs",
    "pilot-admission-current-safety-absence.integration.mjs",
    "pilot-admission-current-safety-identity-races.integration.mjs",
    "HTTP",
    "pilot-admission-current-safety-http.integration.mjs.extra",
  ])
    assert.equal(unit.moduleBudget(name), 30 * 60_000);
  assert.equal(unit.httpFixtureKeys.size, 226);
  assert.equal(unit.httpOutcomeIds.size, 522);
  assert.equal(unit.httpFailureIds.size, 1447);
  checks++;
  const record = {
    version: 1,
    case_id: "ABI.CH.anon",
    phase: "denial-outcome",
    operation: "HTTP-result-assertion",
    observed: {
      status: 429,
      code: "over_request_rate_limit",
      message: "unknown-shape",
      shape: "object",
    },
    expected: {
      status: 401,
      code: "42501",
      message: "permission-denied",
      shape: "object",
    },
    census: {
      before: censusTables.map(() => 0),
      after: censusTables.map(() => 0),
      expected: censusTables.map(() => 0),
    },
    availability: {
      before: "available",
      after: "available",
      expected: "available",
    },
    differences: [
      {
        scope: "census",
        table: "private.safety_reports",
        field: "provenance_kind",
        row: 0,
        kind: "value",
        expected: "current_people",
        observed: "retained_host",
      },
    ],
    cleanup_errors: ["not-attempted-settlement-unproven"],
  };
  const frameFor = (value) => {
    const payload = Buffer.from(JSON.stringify(value)),
      frame = Buffer.alloc(payload.length + 4);
    frame.writeUInt32BE(payload.length);
    payload.copy(frame, 4);
    return frame;
  };
  const frame = frameFor(record);
  const receiver = unit.failureReceiver();
  for (let n = 0; n < frame.length; n++)
    receiver.receive(frame.subarray(n, n + 1));
  receiver.end();
  assert.equal(receiver.evidence().availability, "available");
  assert.equal(
    JSON.stringify(receiver.evidence().records),
    JSON.stringify([record]),
  );
  checks++;
  const invalidRecords = [
    { ...record, access_token: "secret" },
    { ...record, case_id: "someone@unc.edu" },
    { ...record, phase: "private narrative" },
    {
      ...record,
      observed: {
        ...record.observed,
        message: "secret password private title",
      },
    },
    { ...record, observed: { ...record.observed, code: "secret" } },
    {
      ...record,
      differences: [{ ...record.differences[0], field: "private narrative" }],
    },
    {
      ...record,
      differences: [{ ...record.differences[0], observed: "secret title" }],
    },
    { ...record, census: { ...record.census, before: [0] } },
    {
      ...record,
      availability: { ...record.availability, before: "unavailable" },
    },
    { ...record, cleanup_errors: ["cleanup-complete"] },
    { ...record, pass: true },
  ];
  for (const invalid of invalidRecords) {
    const bad = unit.failureReceiver();
    bad.receive(frameFor(invalid));
    bad.end();
    assert.equal(bad.evidence().availability, "unavailable");
    assert.equal(bad.evidence().records.length, 0);
  }
  const corrupt = unit.failureReceiver();
  corrupt.receive(Buffer.from([0, 0, 0, 1, 123]));
  corrupt.end();
  assert.equal(corrupt.evidence().reason, "invalid-record");
  const truncated = unit.failureReceiver();
  truncated.receive(frame.subarray(0, frame.length - 1));
  truncated.end();
  assert.equal(truncated.evidence().reason, "truncated");
  const oversize = unit.failureReceiver();
  const header = Buffer.alloc(4);
  header.writeUInt32BE(unit.failureWireLimits.frame + 1);
  oversize.receive(header);
  oversize.end();
  assert.equal(oversize.evidence().reason, "overflow");
  const overflow = unit.failureReceiver();
  for (let n = 0; n < 5; n++) overflow.receive(frame);
  overflow.end();
  assert.equal(overflow.evidence().reason, "overflow");
  const totalOverflow = unit.failureReceiver();
  totalOverflow.receive(Buffer.alloc(unit.failureWireLimits.total + 1));
  totalOverflow.end();
  assert.equal(totalOverflow.evidence().reason, "overflow");
  const absent = unit.failureReceiver();
  absent.end();
  assert.equal(absent.evidence().reason, "absent");
  const noncanonical = unit.failureReceiver();
  const duplicatePayload = Buffer.from(
    JSON.stringify(record).replace('"version":1', '"version":1,"version":1'),
  );
  const duplicateFrame = Buffer.alloc(duplicatePayload.length + 4);
  duplicateFrame.writeUInt32BE(duplicatePayload.length);
  duplicatePayload.copy(duplicateFrame, 4);
  noncanonical.receive(duplicateFrame);
  noncanonical.end();
  assert.equal(noncanonical.evidence().reason, "invalid-record");
  checks++;
  // Inline children evaluate only this isolated private unit and synthetic data.
  // They never import or execute a real target helper/module.
  const childWriter = `const {createWriteStream}=require('node:fs'); const censusTables=${JSON.stringify(censusTables)}; ${isolated}; const record=${JSON.stringify(record)}; `;
  for (const ending of [
    "process.exit(9)",
    "process.kill(process.pid,'SIGKILL')",
    "while(true){}",
    "process.exit(0)",
  ]) {
    const program =
      childWriter +
      `writeFailureRecord(record).then(()=>{process.stdout.write('PRIVATE RAW OUTPUT'); ${ending};});`;
    await assert.rejects(
      unit.runOwnedProcess(
        executable,
        nodeArgs(program),
        { cwd: directory },
        ending.includes("while") ? 150 : 1000,
        true,
      ),
      (error) => {
        assert.equal(error.httpFailureEvidence.availability, "available");
        assert.equal(
          JSON.stringify(error.httpFailureEvidence.records),
          JSON.stringify([record]),
        );
        assert.ok(!error.message.includes("PRIVATE RAW OUTPUT"));
        return true;
      },
    );
  }
  checks++;
  // Real channel corruption/absence on failing children has no raw fallback.
  for (const script of [
    "process.stderr.write('RAW PRIVATE');process.exit(9)",
    "require('node:fs').writeSync(3,Buffer.from([0,0,0,5,123]));process.exit(9)",
    "require('node:fs').writeSync(3,Buffer.from([0,1,0,1]));setInterval(()=>{},1000)",
  ]) {
    await assert.rejects(
      unit.runOwnedProcess(
        executable,
        nodeArgs(script),
        { cwd: directory },
        1000,
        true,
      ),
      (error) => {
        assert.equal(error.httpFailureEvidence.availability, "unavailable");
        assert.equal(error.httpFailureEvidence.records.length, 0);
        assert.ok(!error.message.includes("RAW PRIVATE"));
        return true;
      },
    );
  }
  checks++;
  for (const script of [
    childWriter +
      "writeFailureRecord(record).then(()=>writeFailureRecord({...record, password:'SECRET'})).catch(()=>process.exit(9));",
    childWriter +
      "(async()=>{for(let n=0;n<5;n++) await writeFailureRecord(record)})().catch(()=>process.exit(9));",
  ]) {
    await assert.rejects(
      unit.runOwnedProcess(
        executable,
        nodeArgs(script),
        { cwd: directory },
        1000,
        true,
      ),
      (error) => {
        assert.equal(error.httpFailureEvidence.availability, "unavailable");
        assert.equal(error.httpFailureEvidence.reason, "writer-unavailable");
        assert.equal(error.httpFailureEvidence.records.length, 0);
        return true;
      },
    );
  }
  checks++;
  // Injected offline child handle deliberately never supplies close. Only its
  // own kill method is called; no PID discovery or real unknown process exists.
  const { EventEmitter } = await import("node:events");
  const fakeChild = new EventEmitter();
  fakeChild.pid = 123;
  fakeChild.stdout = new EventEmitter();
  fakeChild.stderr = new EventEmitter();
  fakeChild.stdio = [
    null,
    fakeChild.stdout,
    fakeChild.stderr,
    new EventEmitter(),
  ];
  let ownedKills = 0;
  fakeChild.kill = (signal) => {
    assert.equal(signal, "SIGKILL");
    ownedKills++;
  };
  context.spawn = () => fakeChild;
  await assert.rejects(
    unit.runOwnedProcess(executable, [], { cwd: directory }, 10, true),
    (error) => {
      assert.match(error.message, /exit unobserved; cleanup incomplete/);
      assert.equal(error.httpFailureEvidence.availability, "unavailable");
      assert.equal(error.httpFailureEvidence.reason, "eof-unobserved");
      return true;
    },
  );
  assert.equal(ownedKills, 1);
  context.spawn = originalSpawn;
  checks++;
  // Channel-free normal success remains the original output path.
  assert.equal(
    await unit.runOwnedProcess(
      executable,
      nodeArgs("process.stdout.write('success')"),
      { cwd: directory },
      1000,
      true,
    ),
    "success",
  );
  checks++;
  const stalledWriter = new EventEmitter();
  let writeAttempts = 0,
    destroyedWrites = 0;
  stalledWriter.write = () => {
    writeAttempts++;
  };
  stalledWriter.destroy = () => {
    destroyedWrites++;
  };
  context.createWriteStream = () => stalledWriter;
  await assert.rejects(
    unit.writeFailureRecord(record),
    /HTTP failure evidence unavailable/,
  );
  assert.equal(writeAttempts, 1);
  assert.equal(destroyedWrites, 1);
  context.createWriteStream = createWriteStream;
  checks++;
  const token = "eyJabc.def.ghi";
  assert.equal(
    unit.redact(`${token} postgresql://secret:password@localhost/db`),
    "<redacted-token> postgresql://<redacted>@localhost/db",
  );
  checks++;
  const rawUnit = source.slice(
    source.indexOf("// PRIVATE SQL DIAGNOSTIC START"),
    source.indexOf("export const expectedMigrationVersions"),
  );
  const sqlContext = vm.createContext({
    createHash,
    Buffer,
    dockerBinary: "synthetic-only",
    args: [],
    transportBudgets: { sql: 1 },
    command: () => {
      const error = new Error("secret");
      error.status = null;
      error.signal = "SIGKILL";
      error.stderr = "ERROR: 42501: Safety report unavailable";
      throw error;
    },
  });
  vm.runInContext(
    `${rawUnit.replace("export function originalSqlDiagnostic", "function originalSqlDiagnostic")}\nglobalThis.invoke = rawSql; globalThis.diagnostic = originalSqlDiagnostic;`,
    sqlContext,
  );
  assert.throws(
    () => sqlContext.invoke("synthetic-only"),
    /transport failed\/interrupted/,
  );
  checks++;
  // Complete fixed verbose grammar only; public wrapper remains the existing neutralizer.
  function sqlError(stderr, extra = {}) {
    sqlContext.command = () => {
      const error = new Error("PRIVATE CHILD");
      Object.assign(error, { status: 1, stderr, ...extra });
      throw error;
    };
    try {
      sqlContext.invoke("PRIVATE SQL");
      assert.fail("expected failure");
    } catch (error) {
      return error;
    }
  }
  const approved = [
    ["42501", "Owner operation unavailable"],
    ["23514", "Detach a profile photo before deleting it"],
    ["23514", "Photos must be existing owned private objects"],
    ...[
      "Safety report unavailable",
      "Safety operation unavailable",
      "Hangout operation not permitted",
      "Hangout chat unavailable",
      "Moderation unavailable",
      "Pilot management unavailable",
    ].map((message) => ["42501", message]),
    ["40P01", "deadlock detected"],
    ["40001", "could not serialize access due to concurrent update"],
    [
      "40001",
      "could not serialize access due to read/write dependencies among transactions",
    ],
    ["57014", "canceling statement due to statement timeout"],
    ["55P03", "canceling statement due to lock timeout"],
  ];
  for (const [code, message] of approved) {
    const error = sqlError(
      `ERROR:  ${code}: ${message}\nDETAIL:  PRIVATE KEY\n  PRIVATE DETAIL CONTINUATION\nHINT:  PRIVATE HINT\nCONTEXT:  SQL statement "PRIVATE SQL"\nPL/pgSQL function private.synthetic() line 14 at PERFORM\nLOCATION:  exec_stmt_raise, pl_exec.c:3924\n`,
    );
    assert.equal(
      JSON.stringify(sqlContext.diagnostic(error)),
      JSON.stringify({ code, message }),
    );
    assert.equal(Object.keys(error).length, 0);
    assert.equal(error.cause, undefined);
    assert.ok(!JSON.stringify(error).includes("PRIVATE"));
    assert.ok(!error.stack.includes("PRIVATE"));
    assert.equal(
      sqlContext.diagnostic(new Error(error.message)).code,
      "unavailable",
    );
    if (
      [
        "Owner operation unavailable",
        "Detach a profile photo before deleting it",
        "Photos must be existing owned private objects",
      ].includes(message)
    )
      assert.equal(
        error.message,
        `Disposable SQL error: ${code}: operation failed`,
      );
  }
  const fk = sqlError(
    'ERROR:  23503: PRIVATE ROW KEY\nDETAIL:  Key (PRIVATE) is still referenced.\nCONTEXT:  SQL statement "PRIVATE"\nPL/pgSQL function private.synthetic() line 2 at SQL statement\nLOCATION:  ri_ReportViolation, ri_triggers.c:2600\n',
  );
  assert.equal(
    JSON.stringify(sqlContext.diagnostic(fk)),
    JSON.stringify({ code: "23503", message: "unavailable" }),
  );
  for (const malformed of [
    "ERROR: 42501: Owner operation unavailable",
    "ERROR:  4250: Owner operation unavailable",
    "NOTICE:  PRIVATE\nERROR:  42501: Owner operation unavailable",
    "ERROR:  42501: Owner operation unavailable\nERROR:  23503: PRIVATE",
    "ERROR:  42501: Owner operation unavailable\n PRIVATE MESSAGE CONTINUATION",
    "ERROR:  42501: Owner operation unavailable\nUNKNOWN:  PRIVATE",
    "ERROR:  42501: Owner operation unavailable\nDETAIL:  PRIVATE\n unknown: PRIVATE",
    "ERROR:  42501: Owner operation unavailable\nDETAIL:  PRIVATE\n ERROR: PRIVATE",
    "ERROR:  42501: Owner operation unavailable\nDETAIL:  PRIVATE\nUNKNOWN PRIVATE",
    "ERROR:  42501: Owner operation unavailable\nLOCATION:  PRIVATE\n  EXTRA",
    "ERROR:  42501: Owner operation unavailable\nHINT:  PRIVATE\nDETAIL:  PRIVATE",
    "ERROR:  42501: Owner operation unavailable\nDETAIL:  PRIVATE\nDETAIL:  EXTRA",
    "ERROR:  42501: Owner operation unavailable\n\n",
    "ERROR:  42501: Owner operation unavailable\r",
    "ERROR:  42501: Owner operation unavailable\nDETAIL:  PRIVATE\n" +
      " PRIVATE\n".repeat(17),
    "ERROR:  42501: Owner operation unavailable\nDETAIL:  " + "x".repeat(4097),
  ])
    assert.equal(
      sqlContext.diagnostic(sqlError(malformed)).detail.available,
      false,
    );
  assert.equal(
    sqlContext.diagnostic(
      sqlError("ERROR:  42502: Owner operation unavailable"),
    ).code,
    "unavailable",
  );
  assert.equal(
    sqlContext.diagnostic(
      sqlError("ERROR:  42501: Owner operation unavailable suffix"),
    ).code,
    "unavailable",
  );
  const unknown = sqlContext.diagnostic(
    sqlError("ERROR:  42501: PRIVATE UNKNOWN"),
  );
  assert.equal(unknown.code, "unavailable");
  assert.equal(unknown.detail.available, true);
  assert.match(unknown.detail.sha256, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(unknown).includes("PRIVATE"));
  assert.equal(
    sqlContext.diagnostic(
      sqlError("ERROR:  42501: Owner operation unavailable", {
        signal: "SIGKILL",
      }),
    ).code,
    "unavailable",
  );
  assert.equal(
    sqlContext.diagnostic(
      sqlError("ERROR:  42501: Owner operation unavailable", {
        code: "ETIMEDOUT",
      }),
    ).code,
    "unavailable",
  );
  assert.equal(
    sqlContext.diagnostic(
      sqlError("ERROR:  42501: Owner operation unavailable\r\n"),
    ).code,
    "42501",
  );
  checks++;
  // Dormant localTarget API unit only: independently guarded origin is synthetic,
  // targetGuard is an assertion trap in this private VM, never the real guard.
  let guardCalls = 0,
    fetchCalls = 0;
  const httpContext = vm.createContext({
    URL,
    AbortController,
    AbortSignal,
    Uint8Array,
    Buffer,
    assert,
    setTimeout,
    clearTimeout,
    transportLimit: 20 * 1024 * 1024,
    lane: "current27",
    guardedLane: "current27",
    key: "PRIVATE KEY",
    targetGuard: (lane) => {
      assert.equal(lane, "current27");
      guardCalls++;
    },
  });
  const httpUnit = source
    .split("// PRIVATE LEGACY HTTP START:")[1]
    .split("\n")
    .slice(1)
    .join("\n")
    .split("// PRIVATE LEGACY HTTP END")[0]
    .replace("request: 30_000", "request: 150")
    .replace("observe: 5_000", "observe: 30");
  const apiUnit = source.slice(
    source.indexOf("  const transport = ownedHttpTransport();"),
    source.indexOf(
      "  return {\n    status,",
      source.indexOf("  const transport = ownedHttpTransport();"),
    ),
  );
  vm.runInContext(
    `${httpUnit}\n${apiUnit}\nglobalThis.api = {request, storage, signedGet, quiescence: transport.quiescence}; globalThis.fresh = ownedHttpTransport; globalThis.path = guardedHttpUrl;`,
    httpContext,
  );
  const http = httpContext.api;
  function bodyResponse(chunks, status = 200) {
    let index = 0;
    return {
      status,
      body: {
        getReader: () => ({
          read: async () =>
            index < chunks.length
              ? { value: chunks[index++], done: false }
              : { done: true },
          cancel: async () => {},
        }),
      },
    };
  }
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=";
  assert.ok(
    readFileSync(
      new URL("../pilot-admission-owner-http.integration.mjs", import.meta.url),
      "utf8",
    ).includes(pngBase64),
    "exact frozen B1 PNG source bytes",
  );
  const png = Buffer.from(pngBase64, "base64");
  const objectPath =
    "/storage/v1/object/profile-photos/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png";
  const signed =
    "http://127.0.0.1:54321" +
    objectPath.replace("/object/", "/object/sign/") +
    "?token=PRIVATE_TOKEN";
  httpContext.fetch = async (url, init) => {
    fetchCalls++;
    assert.equal(url.origin, "http://127.0.0.1:54321");
    assert.equal(init.redirect, "error");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.apikey, "PRIVATE KEY");
    assert.equal(init.headers.authorization, "Bearer PRIVATE TOKEN");
    assert.equal(init.headers["content-type"], "image/png");
    assert.equal(init.body, png);
    return bodyResponse([Buffer.from('{"ok":true}')]);
  };
  assert.equal(
    JSON.stringify(
      await http.storage(objectPath, "PRIVATE TOKEN", png, {
        method: "POST",
        contentType: "image/png",
      }),
    ),
    '{"status":200,"body":{"ok":true}}',
  );
  httpContext.fetch = async (url, init) => {
    fetchCalls++;
    assert.equal(init.body, '{"unchanged":true}');
    assert.equal(init.method, "PATCH");
    assert.equal(init.headers["content-type"], "application/json");
    return bodyResponse([Buffer.from('{"original":[1,null]}')]);
  };
  assert.equal(
    JSON.stringify(
      await http.request(
        "/rest/v1/profiles?x=1",
        "PRIVATE TOKEN",
        { unchanged: true },
        { method: "PATCH" },
      ),
    ),
    '{"status":200,"body":{"original":[1,null]}}',
  );
  httpContext.fetch = async (url, init) => {
    fetchCalls++;
    assert.equal(url.href, signed);
    assert.equal(init.method, "GET");
    assert.equal(init.headers, undefined);
    assert.equal(init.body, undefined);
    return bodyResponse([png], 200);
  };
  assert.equal(
    JSON.stringify(await http.signedGet(new URL(signed))),
    '{"status":200}',
  );
  httpContext.fetch = async () => {
    fetchCalls++;
    return bodyResponse([Buffer.from("PRIVATE expired bearer body")], 400);
  };
  assert.equal((await http.signedGet(signed)).status, 400);
  assert.equal((await http.quiescence()).quiescent, true);
  const beforeInvalid = fetchCalls;
  for (const path of [
    "//example.invalid/x",
    "/\\example.invalid/x",
    "http://example.invalid/x",
    "/x/../rest/v1/x",
    "/%2e%2e/x",
    "/%2fx",
    "/x#PRIVATE",
    "/x\n",
  ])
    await assert.rejects(http.request(path));
  for (const url of [
    signed.replace("54321", "54322"),
    signed.replace("127.0.0.1", "localhost"),
    signed.replace("/sign/", "/authenticated/"),
    signed + "&extra=PRIVATE",
    signed + "&token=PRIVATE",
    signed.replace("http://", "http://PRIVATE@"),
    signed.replace("/storage/", "/x/../storage/"),
    signed.replace(
      "11111111-1111-1111-1111-111111111111",
      "------------------------------------",
    ),
  ])
    await assert.rejects(http.signedGet(url));
  for (const method of ["PUT", "HEAD", "OPTIONS", "post"])
    await assert.rejects(
      http.request("/rest/v1/x", null, undefined, { method }),
    );
  await assert.rejects(
    http.storage(
      objectPath,
      null,
      { png: "changed" },
      { contentType: "image/png" },
    ),
  );
  await assert.rejects(
    http.storage(objectPath, null, png, {
      method: "DELETE",
      contentType: "image/png",
    }),
  );
  assert.equal(fetchCalls, beforeInvalid);
  assert.ok(guardCalls > 0);
  checks++;
  function fresh() {
    return httpContext.fresh();
  }
  function invoke(owner, signal, json = true) {
    return owner.consume(
      new URL("http://127.0.0.1:54321/rest/v1/x"),
      { method: "GET" },
      signal,
      json,
    );
  }
  const pre = fresh(),
    preSignal = new AbortController();
  preSignal.abort();
  await assert.rejects(invoke(pre, preSignal.signal));
  assert.equal(fetchCalls, beforeInvalid);
  assert.equal((await pre.quiescence()).quiescent, false);
  // AbortSignal.any remains caller-owned: the exact combined signal reaches the
  // private controller via listener; both abort sources are exercised offline.
  for (const which of ["caller", "module"]) {
    const owner = fresh(),
      caller = new AbortController(),
      module = new AbortController();
    let propagated = false;
    httpContext.fetch = (url, init) => {
      fetchCalls++;
      return new Promise((resolve, reject) =>
        init.signal.addEventListener("abort", () => {
          propagated = true;
          reject(new Error("PRIVATE CREDENTIAL FAILURE"));
        }),
      );
    };
    const pending = invoke(
      owner,
      AbortSignal.any([caller.signal, module.signal]),
    );
    (which === "caller" ? caller : module).abort();
    await assert.rejects(pending, (error) => {
      assert.equal(
        error.message,
        "Guarded loopback API transport/JSON failure",
      );
      assert.equal(Object.keys(error).length, 0);
      assert.equal(error.cause, undefined);
      return true;
    });
    assert.equal(propagated, true);
    const receipt = await owner.quiescence();
    assert.equal(receipt.pending, 0);
    assert.equal(receipt.uncertain, 0);
    assert.equal(receipt.quiescent, false);
  }
  checks++;
  const httpOverflow = fresh();
  let cancelled = 0;
  httpContext.fetch = async () => ({
    status: 200,
    body: {
      getReader: () => ({
        read: async () => ({
          done: false,
          value: Buffer.alloc(20 * 1024 * 1024 + 1),
        }),
        cancel: async () => {
          cancelled++;
        },
      }),
    },
  });
  await assert.rejects(invoke(httpOverflow));
  assert.equal(cancelled, 1);
  assert.equal((await httpOverflow.quiescence()).quiescent, false);
  const exactCap = fresh();
  httpContext.fetch = async () =>
    bodyResponse([Buffer.alloc(20 * 1024 * 1024)]);
  assert.equal((await invoke(exactCap, undefined, false)).status, 200);
  assert.equal((await exactCap.quiescence()).quiescent, true);
  for (const stage of ["headers", "body", "cancel"]) {
    const owner = fresh();
    let settleFetch,
      settleRead,
      settleCancel,
      bodyCancelled = false;
    httpContext.fetch = () => {
      fetchCalls++;
      if (stage === "headers")
        return new Promise((resolve) => {
          settleFetch = resolve;
        });
      return Promise.resolve({
        status: 200,
        body: {
          getReader: () => ({
            read: () =>
              new Promise((resolve) => {
                settleRead = resolve;
              }),
            cancel: () => {
              bodyCancelled = true;
              if (stage === "body") return Promise.resolve();
              return new Promise((resolve) => {
                settleCancel = resolve;
              });
            },
          }),
        },
      });
    };
    await assert.rejects(invoke(owner));
    let receipt = await owner.quiescence();
    assert.equal(receipt.quiescent, false);
    assert.ok(receipt.pending > 0);
    assert.ok(receipt.uncertain > 0);
    if (stage === "headers") settleFetch(bodyResponse([]));
    else {
      assert.equal(bodyCancelled, true);
      settleRead({ done: true });
      if (stage === "cancel") settleCancel();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    receipt = await owner.quiescence();
    assert.equal(receipt.pending, 0);
    assert.equal(receipt.quiescent, false);
    assert.ok(receipt.uncertain > 0);
  }
  // Finite header+body deadline also observes cancellation that actually settles.
  const bounded = fresh();
  let finishRead,
    cancellationSeen = false;
  httpContext.fetch = async () => ({
    status: 200,
    body: {
      getReader: () => ({
        read: () =>
          new Promise((resolve) => {
            finishRead = resolve;
          }),
        cancel: async () => {
          cancellationSeen = true;
          finishRead({ done: true });
        },
      }),
    },
  });
  await assert.rejects(invoke(bounded));
  assert.equal(cancellationSeen, true);
  assert.equal((await bounded.quiescence()).pending, 0);
  const cancelFailure = fresh();
  httpContext.fetch = async () => ({
    status: 200,
    body: {
      getReader: () => ({
        read: async () => ({
          done: false,
          value: Buffer.alloc(20 * 1024 * 1024 + 1),
        }),
        cancel: async () => {
          throw new Error("PRIVATE CANCEL");
        },
      }),
    },
  });
  await assert.rejects(invoke(cancelFailure));
  assert.equal((await cancelFailure.quiescence()).quiescent, false);
  for (const responseChange of [
    { redirected: true },
    { url: "http://example.invalid/PRIVATE" },
    { url: "http://127.0.0.1:54321/rest/v1/different" },
  ]) {
    const rejectedResponse = fresh();
    let rejectedBodyCancelled = false;
    httpContext.fetch = async () => ({
      ...responseChange,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            assert.fail("rejected response must not be read");
          },
          cancel: async () => {
            rejectedBodyCancelled = true;
          },
        }),
      },
    });
    await assert.rejects(invoke(rejectedResponse));
    assert.equal(rejectedBodyCancelled, true);
    assert.equal((await rejectedResponse.quiescence()).quiescent, false);
  }
  const privateJson = fresh();
  httpContext.fetch = async () =>
    bodyResponse([Buffer.from("PRIVATE TOKEN URL response")]);
  await assert.rejects(
    invoke(privateJson),
    (error) => !error.stack.includes("PRIVATE"),
  );
  checks++;
  const concurrent = fresh(),
    releases = [];
  httpContext.fetch = async () => {
    let sent = false;
    return {
      status: 200,
      body: {
        getReader: () => ({
          read: () =>
            sent
              ? Promise.resolve({ done: true })
              : new Promise((resolve) => {
                  sent = true;
                  releases.push(() =>
                    resolve({ value: Buffer.from("null"), done: false }),
                  );
                }),
          cancel: async () => {},
        }),
      },
    };
  };
  const first = invoke(concurrent),
    second = invoke(concurrent);
  const receiptInFlight = concurrent.quiescence();
  const third = invoke(concurrent);
  const pendingReceipt = await receiptInFlight;
  assert.equal(pendingReceipt.started, 3);
  assert.equal(pendingReceipt.quiescent, false);
  assert.equal(pendingReceipt.pending, 3);
  releases.forEach((release) => release());
  await Promise.all([first, second, third]);
  const completeReceipt = await concurrent.quiescence();
  assert.equal(completeReceipt.quiescent, true);
  assert.equal(completeReceipt.settled, 3);
  checks++;
  assert.equal(
    createHash("sha256")
      .update(
        source.slice(
          source.indexOf("const args = ["),
          source.indexOf("// PRIVATE SQL DIAGNOSTIC START"),
        ) +
          source.slice(
            source.indexOf("export const expectedMigrationVersions"),
            source.indexOf("  const transport = ownedHttpTransport();"),
          ) +
          source.slice(
            source.indexOf("    rpc: (name, token, body) => {"),
            source.indexOf("// Explicit process runner."),
          ),
      )
      .digest("hex"),
    "787379f27365c83d2e709276ef7d0584365d05a639d98f4d147921cd84794950",
    "fixed target/owner/source/history/environment/SQL/session/reset guards remain byte-for-byte unchanged",
  );
  assert.equal(
    createHash("sha256")
      .update(source.slice(0, source.indexOf("// PRIVATE LEGACY HTTP START")))
      .digest("hex"),
    "295f40d3e56a4238bdd3c88aea1814cad917533235f25ba000f2c17341b66369",
    "existing command/session/module/fd3 schema and transport bytes unchanged",
  );
  assert.equal(
    createHash("sha256")
      .update(
        source
          .slice(
            source.indexOf("function rawSql(input)"),
            source.indexOf("export const expectedMigrationVersions"),
          )
          .replace("const emitted = new Error(", "throw new Error(")
          .replace(
            "    sqlDiagnostics.set(emitted, privateSqlDiagnostic(error.stderr));\n    throw emitted;\n",
            "",
          ),
      )
      .digest("hex"),
    "f57e606ad7ec534a43bcda8b9b9fcfd9c89ee4a22bb9cca1eade6a88b0fefb45",
    "public SQL wrapper behavior unchanged except private emitted-error receipt",
  );
  // Every real external site is enumerated and routed to these fixed primitives.
  assert.equal((source.match(/execFileSync\(/g) ?? []).length, 1);
  assert.equal((source.match(/spawn\(/g) ?? []).length, 2);
  for (const fragment of [
    "nodeStartupGuard(process.env);",
    "nodeStartupGuard(options.env ?? process.env);",
    "transportBudgets.sql",
    "transportBudgets.metadata",
    "transportBudgets.reset",
    "transportBudgets.session",
    "transportBudgets.module",
    "moduleBudget(process.argv[3])",
    "process.argv[3] === httpModule",
    "stdio: httpEvidence",
    'killSignal: "SIGKILL"',
    "statement_timeout=30000",
    "lock_timeout=20000",
    "idle_in_transaction_session_timeout=90000",
    "idle_session_timeout=90000",
    "request: 30_000, observe: 5_000",
    "options.signal,",
    'signal?.addEventListener("abort", abort, { once: true })',
    "if (!Number.isInteger(error.status) || error.signal || error.code)",
  ])
    assert.ok(source.includes(fragment), fragment);
  assert.equal((source.match(/transportBudgets\.metadata/g) ?? []).length, 3);
  assert.ok(
    !source.includes("export function command") &&
      !source.includes("export function ownedSession"),
  );
  checks++;
  console.log(
    JSON.stringify({
      offline_checks: checks,
      import_target_attempts: attempts,
      synthetic_processes_only: true,
      target_runtime_credit: 0,
    }),
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
