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
import * as failureWire from "./pilot-current-safety-failure-wire.mjs";

if (process.argv[2] === "--generic-failure-wire-only") {
  await runGenericFailureWireExamples();
  process.exit(0);
}

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
  // Exact source-shaped nested SQL statement frame between PL/pgSQL frames.
  const ownerSource = readFileSync(
    new URL(
      "../../migrations/20260927000200_pilot_owner_admission.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    ownerSource.includes(
      "perform private.pilot_lock_owner_evidence(auth.uid());",
    ),
  );
  assert.ok(
    ownerSource.includes("perform private.pilot_lock_owner_evidence(subject);"),
  );
  const ownerContext =
    'CONTEXT:  PL/pgSQL function private.pilot_lock_owner_evidence(uuid) line 24 at RAISE\nSQL statement "SELECT private.pilot_lock_owner_evidence(auth.uid())"\nPL/pgSQL function private.require_active_profile_write() line 4 at PERFORM\nLOCATION:  exec_stmt_raise, pl_exec.c:3924\n';
  const photoContext = ownerContext
    .replace("auth.uid()", "subject")
    .replace("require_active_profile_write()", "require_active_photo_write()");
  const multilineContext = ownerContext.replace(
    'SQL statement "SELECT private.pilot_lock_owner_evidence(auth.uid())"',
    'SQL statement "SELECT private.pilot_lock_owner_evidence(\nauth.uid()\n)"',
  );
  const initialMultiline =
    'CONTEXT:  SQL statement "SELECT private.pilot_lock_owner_evidence(\n  auth.uid()\n)"\nPL/pgSQL function private.require_active_profile_write() line 4 at PERFORM\nLOCATION:  exec_stmt_raise, pl_exec.c:3924\n';
  for (const context of [
    ownerContext,
    photoContext,
    multilineContext,
    initialMultiline,
  ]) {
    const error = sqlError(
      `ERROR:  42501: Owner operation unavailable\n${context}`,
    );
    assert.equal(
      JSON.stringify(sqlContext.diagnostic(error)),
      '{"code":"42501","message":"Owner operation unavailable"}',
    );
    assert.equal(
      error.message,
      "Disposable SQL error: 42501: operation failed",
    );
    assert.equal(Object.keys(error).length, 0);
    assert.ok(!error.stack.includes("pilot_lock_owner_evidence"));
    const wrongPair = sqlContext.diagnostic(
      sqlError(`ERROR:  23514: Owner operation unavailable\n${context}`),
    );
    assert.equal(wrongPair.code, "unavailable");
    assert.equal(wrongPair.detail.available, true);
    const unknownPair = sqlContext.diagnostic(
      sqlError(`ERROR:  42501: PRIVATE CONTEXT MESSAGE\n${context}`),
    );
    assert.equal(unknownPair.code, "unavailable");
    assert.ok(
      !JSON.stringify(unknownPair).includes("pilot_lock_owner_evidence"),
    );
  }
  const contextError = "ERROR:  42501: Owner operation unavailable\n";
  for (const invalidContext of [
    'CONTEXT:  SQL statement "unterminated',
    ownerContext.replace('auth.uid())"', "auth.uid())"),
    'CONTEXT:  SQL statement "SELECT\nERROR:  42501: Owner operation unavailable\n)"',
    'CONTEXT:  SQL statement "SELECT\n UNKNOWN:  PRIVATE\n)"',
    'CONTEXT:  SQL statement "SELECT\nPL/pgSQL function private.other() line 1 at PERFORM\n)"',
    'CONTEXT:  SQL statement "SELECT\nSQL statement "nested"\n)"',
    'CONTEXT:  SQL statement "SELECT\nLOCATION:  PRIVATE',
    "CONTEXT:  SQL statement without quotes",
    'CONTEXT:  SQL statement ""',
    'CONTEXT:  SQL statement "\n"',
    ownerContext + "TRAILING PRIVATE\n",
    'CONTEXT:  SQL statement "SELECT\n' + "  PRIVATE\n".repeat(16) + ')"',
    ' SQL statement "SELECT private.pilot_lock_owner_evidence(auth.uid())"\n' +
      ownerContext,
  ])
    assert.equal(
      sqlContext.diagnostic(sqlError(contextError + invalidContext)).detail
        .available,
      false,
    );
  // Auxiliaries cannot add or replace the main message, including an approved-looking SQL string.
  const cannotSupplyMessage = sqlContext.diagnostic(
    sqlError(
      'ERROR:  42501: PRIVATE ORIGINAL\nCONTEXT:  SQL statement "Owner operation unavailable"\n',
    ),
  );
  assert.equal(cannotSupplyMessage.code, "unavailable");
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
      .update(
        source
          .slice(0, source.indexOf("// PRIVATE LEGACY HTTP START"))
          .replace(
            /import \{\n  failureWireManifest,[\s\S]*?from "\.\/pilot-current-safety-failure-wire\.mjs";\n/,
            "",
          )
          .replace(
            /\/\/ PRIVATE GENERIC FAILURE START:[\s\S]*?\/\/ PRIVATE GENERIC FAILURE END\n/,
            "",
          ),
      )
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

// Explicit mock-only lane: exits before the historical synthetic-process lane.
// No actual fixture is imported/evaluated or target/helper operation invoked.
async function runGenericFailureWireExamples() {
  const {
    failureWireManifest: manifest,
    genericFailureLimits: limits,
    normalizeFailureEnvelope: normalize,
    encodeFailureFrame: encode,
    decodeFailurePayload: decode,
    createFailureWireReceiver: receiver,
    originalFailureValue: value,
    unavailableFailureValue: unavailable,
    futureFailureInterruptionCeiling: ceiling,
  } = failureWire;
  let checked = 0,
    contacts = 0;
  const check = (truth) => {
    assert.ok(truth);
    checked++;
  };
  const rejects = (operation) => {
    assert.throws(operation);
    checked++;
  };
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const names = Object.keys(manifest.modules);
  const make = (name, sequence = 0) => ({
    version: 1,
    module: name,
    sequence,
    original_sequence: 0,
    receipt:
      sequence === 0 ? "original-before-cleanup" : "supplemental-observation",
    context: {
      case_id: null,
      phase: null,
      partition: null,
      order: null,
      writer: null,
      wait: null,
      resource: null,
      classification: null,
      suite: name.includes("rate-edge") ? "B3c-instrumented-rate-edge" : null,
      qualification: name.includes("rate-edge")
        ? "instrumented-actual-public-predicate-only"
        : null,
    },
    diagnostic: { code: null, message: null, detail: unavailable() },
    summaries: Object.fromEntries(
      ["before", "after", "expected", "holder"].map((k) => [
        k,
        { available: false, tables: null },
      ]),
    ),
    differences: [],
    flags: {
      cleanup: "unverified",
      reset: "forbidden",
      target: "unestablished",
      settlement: "unproven",
    },
    credits: { order: 0, suite: 0, allocation: 0, cleanup: false, pass: false },
  });
  check(names.length === 10);
  check(
    manifest.tables.length === 54 &&
      Object.keys(manifest.columns).length === 54 &&
      Object.values(manifest.columns).flat().length === 306,
  );
  const counts = [72, 24, 204, 24, 37, 60, 18, 4, 0, 76];
  const hours = [36, 12, 96, 12, 24, 36, 12, 2, 2, 48];
  for (let i = 0; i < names.length; i++) {
    const name = names[i],
      m = manifest.modules[name];
    check(m.cases.length === counts[i] && ceiling(name) === hours[i] * 3600000);
    check(normalize(make(name), name).credits.pass === false);
    for (const cell of m.cases) {
      const record = make(name);
      record.context.case_id = cell.id;
      record.context.order = cell.order ?? null;
      check(normalize(record, name).context.case_id === cell.id);
      const wrong = copy(record);
      wrong.context.order = "wrong-order";
      rejects(() => normalize(wrong, name));
      const cross = copy(record);
      cross.module = names.find((n) => n !== name);
      rejects(() => normalize(cross, name));
    }
    for (const phase of m.phases) {
      const r = make(name);
      r.context.phase = phase;
      check(normalize(r, name).context.phase === phase);
    }
    for (const partition of m.partitions) {
      const r = make(name);
      r.context.partition = partition;
      check(normalize(r, name).context.partition === partition);
    }
    const r = make(name);
    r.context.case_id = "unknown-id";
    rejects(() => normalize(r, name));
    r.context.case_id = null;
    r.context.phase = "Safety report unavailable private UUID body";
    rejects(() => normalize(r, name));
  }
  // Regression contexts from the independently reviewed frozen runtime paths.
  // Carry each original phase/partition through sender, framing and receiver;
  // even a complete zero-exit record remains failure-only with zero credits.
  const correctedContexts = [
    [
      names[5],
      "X.CH.actor.referenced_primary_protection.serial",
      "serial",
      null,
    ],
    [names[5], null, "cleanup", null],
    [
      names[6],
      "L1R.CH.clock_after_account_wait",
      "account-share-wait-before-expiry",
      null,
    ],
    [names[6], "L1R.CP.same_key_wait", "same-key-social-wait", null],
    [
      names[9],
      "M.list_moderation_reports.gate_delete_replace.loss-first",
      "eligible-public-precheck",
      "abort-rollback-no-credit",
    ],
    [
      names[9],
      "M.list_moderation_reports.gate_delete_replace.operation-first",
      "eligible-public-precheck",
      "failed-no-credit",
    ],
  ];
  for (const [name, candidateID, phase, partition] of correctedContexts) {
    const r = make(name);
    const cell =
      candidateID === null
        ? null
        : manifest.modules[name].cases.find((cell) => cell.id === candidateID);
    const canonical = cell;
    if (candidateID !== null) check(Boolean(canonical));
    Object.assign(r.context, {
      case_id: canonical?.id ?? null,
      order: canonical?.order ?? null,
      phase,
      partition,
    });
    const encoded = encode(r, name);
    assert.deepEqual(
      decode(encoded.subarray(4), name).context,
      normalize(r, name).context,
    );
    checked++;
    const received = receiver(name);
    received.receive(encoded);
    received.end();
    received.close(0, null);
    const evidence = received.evidence();
    check(
      evidence.availability === "available" &&
        evidence.module_failed &&
        evidence.module_credit === 0,
    );
    assert.deepEqual(copy(evidence.records[0].credits), r.credits);
    checked++;
    const invalid = copy(r);
    invalid.context[phase === null ? "partition" : "phase"] =
      "untrusted-private-context";
    rejects(() => encode(invalid, name));
    if (name === names[9]) {
      // Operator failure labels do not replace canonical order/partition checks.
      const wrongOrder = copy(r);
      wrongOrder.context.order =
        canonical.order === "loss-first" ? "operation-first" : "loss-first";
      rejects(() => encode(wrongOrder, name));
      const wrongPartition = copy(r);
      wrongPartition.context.partition = "actual-exact-retry-wait";
      rejects(() => encode(wrongPartition, name));
      wrongPartition.context.partition = "untrusted-private-context";
      rejects(() => encode(wrongPartition, name));
      const wrongWriter = copy(r);
      wrongWriter.context.writer = "untrusted-private-context";
      rejects(() => encode(wrongWriter, name));
      for (const otherName of names.filter((n) => n !== name)) {
        const other = make(otherName);
        other.context.partition = partition;
        rejects(() => encode(other, otherName));
        const otherCell = manifest.modules[otherName].cases[0];
        if (otherCell) {
          other.context.case_id = otherCell.id;
          other.context.order = otherCell.order ?? null;
          rejects(() => encode(other, otherName));
        }
      }
    }
  }
  check(
    ceiling("pilot-admission-current-safety-http.integration.mjs") ===
      24 * 3600000,
  );
  for (const name of [
    "../arbitrary.mjs",
    "pilot-admission-owner.integration.mjs",
    "pilot-moderation-http.integration.mjs",
    "pilot-current-safety-operator.test.sql",
    "__proto__",
    "",
  ])
    rejects(() => ceiling(name));
  rejects(() =>
    receiver("pilot-admission-current-safety-http.integration.mjs"),
  );
  const diagnosticPairs = [
    ...[
      "Safety report unavailable",
      "Safety operation unavailable",
      "Hangout operation not permitted",
      "Hangout chat unavailable",
      "Moderation unavailable",
      "Pilot management unavailable",
      "Owner operation unavailable",
    ].map((message) => ["42501", message]),
    ["23514", "Detach a profile photo before deleting it"],
    ["23514", "Photos must be existing owned private objects"],
    ["40P01", "deadlock detected"],
    ["40001", "could not serialize access due to concurrent update"],
    [
      "40001",
      "could not serialize access due to read/write dependencies among transactions",
    ],
    ["57014", "canceling statement due to statement timeout"],
    ["55P03", "canceling statement due to lock timeout"],
  ];
  for (const name of names)
    for (const [code, message] of diagnosticPairs) {
      const r = make(name);
      r.diagnostic = { code, message, detail: null };
      check(normalize(r, name).diagnostic.message === message);
      r.diagnostic.message += " PRIVATE";
      rejects(() => normalize(r, name));
    }
  const name = names[0],
    original = make(name),
    frame = encode(original, name);
  check(decode(frame.subarray(4), name).module === name);
  for (const text of [
    "private RPC receipt",
    "title narrative 29e86a47-0e27-4ffc-8b56-a1403c42afe1",
    "Safety report unavailable",
    "Auth bearer body provider secret",
    "neutral-looking operation failed",
  ]) {
    const r = copy(original);
    r.extra = text;
    rejects(() => normalize(r, name));
    r.extra = undefined;
    delete r.extra;
    r.diagnostic.message = text;
    rejects(() => normalize(r, name));
    check(!JSON.stringify(value({ unknownKey: text })).includes(text));
  }
  let getters = 0;
  const accessor = copy(original);
  Object.defineProperty(accessor, "version", {
    get() {
      getters++;
      return 1;
    },
    enumerable: true,
  });
  rejects(() => normalize(accessor, name));
  check(getters === 0);
  const symbol = copy(original);
  symbol[Symbol("private")] = 1;
  rejects(() => normalize(symbol, name));
  const custom = Object.assign(Object.create({ private: 1 }), original);
  rejects(() => normalize(custom, name));
  const toJSON = copy(original);
  toJSON.toJSON = () => {
    getters++;
    return original;
  };
  rejects(() => normalize(toJSON, name));
  check(getters === 0);
  const proxy = new Proxy(original, {
    ownKeys() {
      getters++;
      return [];
    },
  });
  rejects(() => normalize(proxy, name));
  check(getters === 0);
  const cycle = copy(original);
  cycle.extra = cycle;
  rejects(() => normalize(cycle, name));
  const sparse = copy(original);
  sparse.differences = new Array(2);
  rejects(() => normalize(sparse, name));
  const hidden = copy(original);
  Object.defineProperty(hidden, "private", { value: 1 });
  rejects(() => normalize(hidden, name));
  for (const n of [
    -1,
    NaN,
    Infinity,
    -0,
    0.5,
    Number.MAX_SAFE_INTEGER + 1,
    limits.count + 1,
  ]) {
    const r = copy(original);
    r.sequence = n;
    rejects(() => normalize(r, name));
  }
  check(value("<redacted>").precision === "inherited-withheld");
  for (const projected of [
    { available: false },
    { type: "string", available: false, original_value_unavailable: true },
    value("already private"),
    { nested: { type: "object", available: true, sha256: "a".repeat(64) } },
  ])
    check(value(projected).precision === "inherited-withheld");
  check(value({ body: "<absent>" }).available === false);
  check(
    value({ a: 1, b: "private" }).sha256 ===
      value({ b: "private", a: 1 }).sha256,
  );
  check(value("1").sha256 !== value(1).sha256);
  check(value({ a: 1 }).sha256 !== value({ a: 2 }).sha256);
  check(value(accessor).available === false && getters === 0);
  check(value(new Error("private error")).available === false);
  const summary = copy(original);
  summary.summaries.before = {
    available: true,
    tables: manifest.tables.map((table) => ({
      table,
      count: 0,
      value: value([]),
    })),
  };
  check(normalize(summary, name).summaries.before.tables.length === 54);
  for (const mutation of [
    (r) => r.summaries.before.tables.pop(),
    (r) => (r.summaries.before.tables[0].table = "private.unknown"),
    (r) => (r.summaries.before.tables[0].count = null),
    (r) => (r.summaries.before.tables[0].count = limits.count + 1),
    (r) => (r.summaries.before.available = false),
    (r) => (r.summaries.after.tables = []),
    (r) => (r.summaries.before.tables[0].value.sha256 = "placeholder"),
    (r) => (r.summaries.before.tables[0].value.available = false),
  ]) {
    const r = copy(summary);
    mutation(r);
    rejects(() => normalize(r, name));
  }
  const diff = {
    scope: "domain",
    table: "public.hangouts",
    row: 0,
    column: "title",
    kind: "value",
    expected: value("private before"),
    observed: value("private after"),
  };
  const delta = copy(original);
  delta.differences = [diff];
  check(normalize(delta, name).differences[0].column === "title");
  for (const mutation of [
    (r) => (r.differences[0].column = "title.private"),
    (r) => (r.differences[0].column = "provider_unknown"),
    (r) => (r.differences[0].table = "public.unknown"),
    (r) => (r.differences[0].row = limits.count + 1),
    (r) => (r.differences[0].expected.precision = "inherited-withheld"),
    (r) => (r.differences[0].expected.type = "unknown"),
    (r) => (r.differences[0].scope = "catalog"),
  ]) {
    const r = copy(delta);
    mutation(r);
    rejects(() => normalize(r, name));
  }
  const opaque = copy(delta);
  Object.assign(opaque.differences[0], {
    scope: "opaque",
    table: null,
    row: null,
    column: null,
  });
  check(normalize(opaque, name).differences[0].table === null);
  const wide = copy(summary);
  for (const slot of ["after", "expected", "holder"])
    wide.summaries[slot] = copy(wide.summaries.before);
  wide.differences = Array.from({ length: 128 }, () => copy(diff));
  rejects(() => encode(wide, name));
  const cap = copy(original);
  cap.differences = Array.from({ length: 128 }, () => copy(diff));
  check(normalize(cap, name).differences.length === 128);
  cap.differences.push(copy(diff));
  rejects(() => normalize(cap, name));
  for (const mutation of [
    (r) => (r.credits.pass = true),
    (r) => (r.credits.cleanup = true),
    (r) => (r.credits.order = 1),
    (r) => (r.credits.suite = 1),
    (r) => (r.credits.allocation = 1),
    (r) => (r.flags.cleanup = "verified"),
    (r) => (r.flags.reset = "allowed"),
    (r) => (r.original_sequence = 1),
    (r) => (r.sequence = 16),
    (r) => (r.receipt = "supplemental-closure"),
  ]) {
    const r = copy(original);
    mutation(r);
    rejects(() => normalize(r, name));
  }
  for (const sequence of [1, 2, 15]) {
    const r = make(name, sequence);
    check(normalize(r, name).sequence === sequence);
    r.receipt = "original-before-cleanup";
    rejects(() => normalize(r, name));
  }
  for (const receipt of [
    "supplemental-observation",
    "supplemental-rollback",
    "supplemental-closure",
    "supplemental-reset",
    "supplemental-restoration",
  ]) {
    const r = make(name, 1);
    r.receipt = receipt;
    check(normalize(r, name).receipt === receipt);
  }
  const state = names.find((n) => n.includes("state-races"));
  const waits = [
    "social (16016,1) exclusive before moderation/pilot/lane selection; no lower current tuple credit",
    "social (16016,1) exclusive before shared pilot/lifecycle and current lane selection; no lower tuple credit",
    "public opt-out account UPDATE waits on current peer account SHARE, before preference UPSERT",
    "current peer account SHARE waits on public opt-out account UPDATE, before required preference lookup",
    "required peer preference SHARE versus actual preference DELETE tuple/transaction wait; privileged synthetic maintenance only",
    "social (16016,1) exclusive before shared pilot/current-or-retained lane selection; no lower tuple/no-upgrade/no-fallback credit",
  ];
  const seenWaits = new Set();
  for (const cell of manifest.modules[state].cases) {
    const r = make(state);
    r.context.case_id = cell.id;
    r.context.order = cell.order;
    r.context.writer =
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
    r.context.wait = waits[index];
    r.context.classification =
      cell.id === "L5.CB.actor_peer_block_inbound.operation-first"
        ? "public-writer-denial-no-committed-loss-order"
        : cell.id === "L5.CB.actor_peer_block_outbound.operation-first"
          ? "retained-repair-no-new-loss"
          : "planned-committed-state-loss";
    seenWaits.add(index);
    check(normalize(r, state).context.wait === waits[index]);
    const wrong = copy(r);
    wrong.context.writer = "disable-private";
    rejects(() => normalize(wrong, state));
    wrong.context.writer = r.context.writer;
    wrong.context.order = null;
    rejects(() => normalize(wrong, state));
    wrong.context.order = r.context.order;
    wrong.context.wait = waits[(index + 1) % 6];
    rejects(() => normalize(wrong, state));
  }
  check(seenWaits.size === 6);
  const identity = names.find((n) => n.includes("identity-races"));
  for (const cell of manifest.modules[identity].cases) {
    const r = make(identity);
    const phase =
      cell.loss === "object_detach_delete"
        ? "profile UPDATE; formerly referenced DELETE after detach"
        : cell.loss.startsWith("campus_")
          ? "campus"
          : cell.loss.startsWith("email_") && cell.loss !== "email_equality"
            ? "Auth"
            : cell.loss.startsWith("membership_") ||
                cell.loss === "email_equality"
              ? "membership"
              : cell.loss.startsWith("profile_")
                ? "profile"
                : "account";
    Object.assign(r.context, {
      case_id: cell.id,
      order: cell.order,
      phase,
      resource: phase,
      writer:
        "privileged synthetic identity preparation; not permission evidence",
    });
    check(normalize(r, identity).context.resource === phase);
    r.context.phase = phase === "Auth" ? "account" : "Auth";
    rejects(() => normalize(r, identity));
  }
  // Split/coalesced frames, all ordered supplements, and every invalidation keep
  // all module credits zero. A valid failure with exit zero is still a failure.
  for (const exitCode of [0, 1, 3]) {
    const r = receiver(name);
    for (let i = 0; i < frame.length; i++) r.receive(frame.subarray(i, i + 1));
    r.end();
    check(r.evidence().availability === "unavailable");
    r.close(exitCode, null);
    check(
      r.evidence().availability === "available" &&
        r.evidence().module_failed &&
        r.evidence().module_credit === 0,
    );
  }
  const ordered = receiver(name);
  ordered.receive(
    Buffer.concat(
      Array.from({ length: 16 }, (_, i) => encode(make(name, i), name)),
    ),
  );
  ordered.end();
  ordered.close(1, null);
  check(ordered.evidence().records.length === 16);
  const invalidate = (
    chunks,
    ending = true,
    closeCode = 1,
    closeSignal = null,
  ) => {
    const r = receiver(name);
    r.receive(frame);
    for (const c of chunks) r.receive(c);
    if (ending) r.end();
    r.close(closeCode, closeSignal);
    check(
      r.evidence().availability === "unavailable" &&
        r.evidence().records.length === 0,
    );
  };
  invalidate([frame]);
  invalidate([encode(make(name, 2), name)]);
  invalidate([Buffer.alloc(4)]);
  invalidate([Buffer.from([0, 0, 0])]);
  invalidate([Buffer.from([0, 1, 0, 1])]);
  invalidate([Buffer.alloc(limits.total)]);
  invalidate([], true, failureWire.genericWireUnavailableExit, null);
  invalidate([], true, null, null);
  invalidate([], true, 1, "SIGKILL");
  invalidate([], true, 0, "unknown");
  invalidate([], false);
  const seventeenth = receiver(name);
  for (let i = 0; i < 16; i++) seventeenth.receive(encode(make(name, i), name));
  seventeenth.receive(frame);
  seventeenth.end();
  seventeenth.close(1, null);
  check(seventeenth.evidence().records.length === 0);
  for (const method of ["error", "interrupt"]) {
    const r = receiver(name);
    r.receive(frame);
    r[method]();
    r.end();
    r.close(1, null);
    check(r.evidence().records.length === 0);
  }
  const late = receiver(name);
  late.receive(frame);
  late.end();
  late.receive(frame);
  late.close(1, null);
  check(late.evidence().records.length === 0);
  const json = frame.subarray(4).toString();
  const badPayloads = [
    Buffer.from(json.replace('"version":1', '"version":1,"version":1')),
    Buffer.from(json + "\n"),
    Buffer.from(" " + json),
    Buffer.from(json.replace('"sequence":0', '"sequence":NaN')),
    Buffer.from(json.replace('"sequence":0', '"sequence":-0')),
    Buffer.from(json.replace('"version":1', '"version":1.0')),
    Buffer.from([0xff]),
    Buffer.alloc(0),
    Buffer.alloc(limits.frame + 1),
  ];
  for (const payload of badPayloads) {
    rejects(() => decode(payload, name));
    const bad = Buffer.alloc(payload.length + 4);
    bad.writeUInt32BE(payload.length);
    payload.copy(bad, 4);
    invalidate([bad]);
  }
  const privateMalformed = Buffer.from("{PRIVATE NARRATIVE ERROR}");
  assert.throws(
    () => decode(privateMalformed, name),
    (error) =>
      error.message === "Generic failure evidence unavailable" &&
      !error.message.includes("PRIVATE"),
  );
  checked++;
  check(value("x".repeat(limits.frame + 1)).available === false);
  const deep = copy(original);
  deep.extra = {};
  let level = deep.extra;
  for (let i = 0; i < 17; i++) {
    level.next = {};
    level = level.next;
  }
  rejects(() => normalize(deep, name));
  const nodes = copy(original);
  nodes.extra = Array.from({ length: 4097 }, () => null);
  rejects(() => normalize(nodes, name));
  // Read-only source reconciliation, never execution/import of source modules.
  const ts = (
    await import("/private/tmp/pals-task024/node_modules/typescript/lib/typescript.js")
  ).default;
  const literal = (n) => {
    if (ts.isStringLiteral(n)) return n.text;
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(literal);
    if (ts.isNewExpression(n) && n.expression.getText() === "Set")
      return literal(n.arguments[0]);
    if (ts.isObjectLiteralExpression(n))
      return Object.fromEntries(
        n.properties.map((p) => {
          assert.ok(ts.isPropertyAssignment(p));
          return [p.name.text, literal(p.initializer)];
        }),
      );
    if (
      ts.isCallExpression(n) &&
      n.expression.getText().startsWith("Object.freeze")
    )
      return literal(n.arguments[0]);
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === "map"
    )
      return literal(n.expression.expression);
    throw new Error("Trusted source literal unavailable");
  };
  const extract = (text, label) => {
    const tree = ts.createSourceFile(
      "source.mjs",
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    let result;
    const visit = (n) => {
      if (ts.isVariableDeclaration(n) && n.name.getText() === label)
        result = literal(n.initializer);
      ts.forEachChild(n, visit);
    };
    visit(tree);
    assert.notEqual(result, undefined, "Trusted source literal unavailable");
    return result;
  };
  // Independently derive finite contexts from source syntax, never by importing
  // fixtures or iterating the wire's own allowlists. Exclude only authored inert
  // example bodies; unknown source sentinels map to explicit unavailable context.
  const sourceContexts = (text) => {
    const tree = ts.createSourceFile(
      "source.mjs",
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    const contexts = { phase: new Set(), partition: new Set() };
    const values = (n, field) => {
      if (ts.isStringLiteral(n)) {
        if (!["unknown", "<unknown>"].includes(n.text))
          contexts[field].add(n.text);
      } else if (ts.isConditionalExpression(n)) {
        values(n.whenTrue, field);
        values(n.whenFalse, field);
      }
    };
    const visit = (n) => {
      if (
        ts.isFunctionDeclaration(n) &&
        /Examples|Offline/.test(n.name?.text ?? "")
      )
        return;
      if (
        ts.isPropertyAssignment(n) &&
        ["phase", "partition"].includes(n.name.getText())
      )
        values(n.initializer, n.name.getText());
      if (
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(n.left) &&
        n.left.name.text === "phase"
      )
        values(n.right, "phase");
      ts.forEachChild(n, visit);
    };
    visit(tree);
    return contexts;
  };
  const sameLabels = (actual, expected) => {
    assert.equal(
      new Set(actual).size,
      actual.length,
      "Duplicate context label",
    );
    assert.deepEqual(
      actual.slice().sort(),
      [...expected].sort(),
      "Frozen source context parity",
    );
  };
  const commonText = readFileSync(
    new URL(
      "../pilot-admission-current-safety-concurrency.integration.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  // These four already-existing failure support labels belong to the inherited
  // projector, including modules whose local source emits its own partitions.
  const supportPartitions = [
    "failed-no-success-credit",
    "supplemental-failure-no-credit",
    "cleanup-failed",
    "owned-exit-unproven",
  ];
  const commonPartitions = extract(commonText, "projectionPartitions");
  for (const label of supportPartitions)
    check(commonPartitions.includes(label));
  const roots = [
    null,
    null,
    "identity-adoption",
    "state-output-adoption",
    "retained",
    "crossings",
    "retry-rate",
    "rate-edge",
    "upgrade-fixture",
    "operators",
  ];
  const labels = [
    "policyManifest",
    "absenceManifest",
    "identityPlans",
    "stateManifest",
    "retainedManifest",
    "crossingManifest",
    "retryRateManifest",
    "edgeManifest",
    "labels",
    "operatorManifest",
  ];
  for (let i = 0; i < names.length; i++) {
    const base = roots[i]
      ? `/private/tmp/pals-task021-${roots[i]}`
      : new URL("../../../", import.meta.url).pathname;
    const text = readFileSync(join(base, "supabase/tests", names[i]), "utf8");
    check(
      createHash("sha256").update(text).digest("hex") ===
        manifest.modules[names[i]].sha256,
    );
    const contexts = sourceContexts(text);
    // Source enums supplement emitted labels where the module deliberately
    // keeps dormant/cleanup labels or derives its phase from canonical cells.
    if (i === 2) {
      const output = extract(text, "identityOutputManifest");
      output.phases.forEach((label) => contexts.phase.add(label));
      output.partitions.forEach((label) => contexts.partition.add(label));
    }
    if (i === 5)
      extract(text, "phases").forEach((label) => contexts.phase.add(label));
    if (i === 6)
      extract(text, "retryRateManifest").forEach((cell) =>
        contexts.phase.add(cell.kind),
      );
    if (i === 7)
      extract(text, "edgePhases").forEach((label) => contexts.phase.add(label));
    if (i === 8)
      extract(text, "labels").forEach((label) => contexts.phase.add(label));
    supportPartitions.forEach((label) => contexts.partition.add(label));
    for (const [field, sourceLabels] of Object.entries(contexts)) {
      const wireLabels = manifest.modules[names[i]][`${field}s`];
      sameLabels(wireLabels, sourceLabels);
      checked++;
      // Prove the independent comparison catches both omission and arbitrary
      // extension for every module/field, including inherited support labels.
      rejects(() => sameLabels(wireLabels.slice(1), sourceLabels));
      rejects(() =>
        sameLabels([...wireLabels, "untrusted-private-context"], sourceLabels),
      );
    }
    const expected = extract(text, labels[i]);
    if (i === 8) {
      assert.deepEqual(expected, manifest.modules[names[i]].phases);
      checked++;
      continue;
    }
    const keys = [
      "id",
      "route",
      "subject",
      "loss",
      "order",
      "writer",
      "wait",
      "partition",
      "outcome_classification",
      "kind",
      "family",
      "older",
      "caller",
    ];
    assert.deepEqual(
      expected.map((cell) =>
        Object.fromEntries(
          keys.filter((k) => cell[k] !== undefined).map((k) => [k, cell[k]]),
        ),
      ),
      copy(manifest.modules[names[i]].cases),
    );
    checked++;
  }
  const stateText = readFileSync(
    "/private/tmp/pals-task021-state-output-adoption/supabase/tests/pilot-admission-current-safety-state-races.integration.mjs",
    "utf8",
  );
  assert.deepEqual(extract(stateText, "stateWaits"), waits);
  checked++;
  const helperText = readFileSync(
    new URL("./pilot-admission-current-safety.mjs", import.meta.url),
    "utf8",
  );
  const oldCore = helperText
    .replace(
      /import \{\n  failureWireManifest,[\s\S]*?from "\.\/pilot-current-safety-failure-wire\.mjs";\n/,
      "",
    )
    .replace(
      /\/\/ PRIVATE GENERIC FAILURE START:[\s\S]*?\/\/ PRIVATE GENERIC FAILURE END\n/,
      "",
    );
  check(
    createHash("sha256").update(oldCore).digest("hex") ===
      "f6555a07f557ea8306b6ae3bbb90b728c247cda71e6724ff8be9873db9c899f9",
  );
  const policyText = readFileSync(
    new URL(
      "../pilot-admission-current-safety-concurrency.integration.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.deepEqual(
    extract(policyText, "projectionColumns"),
    copy(manifest.columns),
  );
  checked++;
  const fixtureText = readFileSync(
    new URL("./pilot-current-safety-fixtures.mjs", import.meta.url),
    "utf8",
  );
  assert.deepEqual(extract(fixtureText, "censusTables"), copy(manifest.tables));
  checked++;
  const matrixText = readFileSync(
    new URL(
      "../../../agents/handoffs/TASK-021A1b3c-MATRIX.json",
      import.meta.url,
    ),
    "utf8",
  );
  check(
    createHash("sha256").update(matrixText).digest("hex") ===
      manifest.matrix_sha256,
  );
  const matrix = JSON.parse(matrixText);
  for (const prefix of ["L2.", "L3.", "L4.", "L5."]) {
    const matching = Object.values(manifest.modules)
      .flatMap((m) => m.cases)
      .filter((c) => c.id.startsWith(prefix));
    assert.deepEqual(
      matching.map((c) => c.id).sort(),
      (prefix === "L4." ? matrix.serial_cells : matrix.cells)
        .filter((c) => c.id.startsWith(prefix))
        .map((c) => c.id)
        .sort(),
    );
    checked++;
  }
  // Exact unchanged production segment and runner allowlist are byte preserved.
  check(
    createHash("sha256")
      .update(
        helperText
          .split("// PRIVATE TRANSPORT START:")[1]
          .split("// PRIVATE TRANSPORT END")[0],
      )
      .digest("hex") ===
      "21d22022e7e95e736053a4feb8758e26950f69c094dc58b8c21f54d603e252f9",
  );
  check(
    helperText.includes(
      '"pilot-admission-current-safety-http.integration.mjs",',
    ) &&
      helperText.includes(
        '"pilot-admission-current-safety-concurrency.integration.mjs",',
      ) &&
      helperText.includes(
        '"pilot-admission-current-safety-absence.integration.mjs",',
      ) &&
      helperText.includes(
        '"pilot-admission-current-safety-identity-races.integration.mjs",',
      ),
  );
  // Inert imports under contact traps; all stream operations below are mocks.
  const originalSpawn = childProcess.default.spawn,
    originalExec = childProcess.default.execFileSync,
    originalFetch = globalThis.fetch;
  try {
    childProcess.default.spawn =
      childProcess.default.execFileSync =
      globalThis.fetch =
        () => {
          contacts++;
          throw new Error("Forbidden contact");
        };
    syncBuiltinESMExports();
    await import("./pilot-admission-current-safety.mjs");
    check(contacts === 0);
  } finally {
    childProcess.default.spawn = originalSpawn;
    childProcess.default.execFileSync = originalExec;
    globalThis.fetch = originalFetch;
    syncBuiltinESMExports();
  }
  const genericSource = helperText
    .split("// PRIVATE GENERIC FAILURE START:")[1]
    .split("\n")
    .slice(1)
    .join("\n")
    .split("// PRIVATE GENERIC FAILURE END")[0]
    .replace(
      "export { futureFailureInterruptionCeiling, createFailureWireReceiver };",
      "",
    )
    .replace(
      "export async function writeGenericFailureEvidence",
      "async function writeGenericFailureEvidence",
    )
    .replace(
      "export function originalGenericWireFailure",
      "function originalGenericWireFailure",
    )
    .replaceAll("genericFailureLimits.write", "15");
  function mock(mode = "success", pathName = name) {
    const frames = [];
    let creation = 0;
    const listeners = new Map();
    const stream = {
      on(event, fn) {
        listeners.set(event, fn);
      },
      once(event, fn) {
        listeners.set(event, fn);
      },
      removeListener(event, fn) {
        if (listeners.get(event) === fn) listeners.delete(event);
      },
      write(chunk, callback) {
        frames.push(Buffer.from(chunk));
        if (mode === "success") queueMicrotask(() => callback());
        if (mode === "error")
          queueMicrotask(() => callback(new Error("private channel error")));
      },
      destroy() {},
    };
    const c = vm.createContext({
      failureWireManifest: manifest,
      genericFailureLimits: limits,
      encodeFailureFrame: encode,
      futureFailureInterruptionCeiling: ceiling,
      createFailureWireReceiver: receiver,
      genericWireUnavailableExit: failureWire.genericWireUnavailableExit,
      performance,
      process: { argv: ["node", `/fixed/supabase/tests/${pathName}`] },
      root: "/fixed",
      resolve: (...pieces) => pieces.join("/"),
      realpathSync: (p) => p,
      createWriteStream: () => {
        creation++;
        return stream;
      },
      Buffer,
      setTimeout,
      clearTimeout,
      queueMicrotask,
    });
    vm.runInContext(
      genericSource +
        "\nglobalThis.unit={writeGenericFailureEvidence,originalGenericWireFailure};",
      c,
    );
    return {
      writer: c.unit.writeGenericFailureEvidence,
      receipt: c.unit.originalGenericWireFailure,
      frames,
      created: () => creation,
    };
  }
  const w = mock();
  await w.writer(original);
  await w.writer(make(name, 1));
  check(w.frames.length === 2 && w.created() === 1);
  await assert.rejects(w.writer(original));
  checked++;
  check(w.frames.at(-1).equals(Buffer.alloc(4)));
  for (const mode of ["error", "stall"]) {
    const w = mock(mode);
    await assert.rejects(
      w.writer(original),
      /Generic failure evidence unavailable/,
    );
    checked++;
    await assert.rejects(w.writer(make(name, 1)));
    checked++;
    check(w.frames.length === 1);
  }
  const concurrent = mock("stall");
  const first = concurrent.writer(original),
    second = concurrent.writer(make(name, 1));
  const outcomes = await Promise.allSettled([first, second]);
  check(outcomes.every((r) => r.status === "rejected"));
  check(
    concurrent.frames.filter((f) => f.equals(Buffer.alloc(4))).length === 0,
  );
  const receiptMock = mock("stall");
  let wireError;
  try {
    await receiptMock.writer(original);
  } catch (error) {
    wireError = error;
  }
  check(receiptMock.receipt(wireError).required_exit_status === 78);
  check(receiptMock.receipt(new Error(wireError.message)) === null);
  const wrongEntry = mock("success", "unknown.mjs");
  await assert.rejects(wrongEntry.writer(original));
  checked++;
  check(wrongEntry.created() === 0);
  const httpEntry = mock(
    "success",
    "pilot-admission-current-safety-http.integration.mjs",
  );
  await assert.rejects(httpEntry.writer(original));
  checked++;
  check(httpEntry.created() === 0);
  console.log(
    JSON.stringify({
      generic_failure_offline_checks: checked,
      import_target_attempts: contacts,
      mocked_transport_only: true,
      target_runtime_credit: 0,
      production_runner_adopted: false,
    }),
  );
}
