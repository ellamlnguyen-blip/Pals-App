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
});
// Short budgets affect only this isolated offline copy, never production exports.
const isolated = privateUnit
  .replace("session: 90_000", "session: 250")
  .replace("write: 2_000", "write: 75")
  .replace("close: 10_000", "close: 75")
  .replace("exit: 5_000", "exit: 100");
vm.runInContext(
  `${redactor}\n${isolated}\nglobalThis.unit = { command, ownedSession, runOwnedProcess, redact, moduleBudget, transportBudgets, failureReceiver, writeFailureRecord, validateHttpFailureRecord, failureWireLimits, httpFixtureKeys, httpOutcomeIds, httpFailureIds };`,
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
    source.indexOf("function rawSql(input)"),
    source.indexOf("export const expectedMigrationVersions"),
  );
  const sqlContext = vm.createContext({
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
  vm.runInContext(`${rawUnit}\nglobalThis.invoke = rawSql;`, sqlContext);
  assert.throws(
    () => sqlContext.invoke("synthetic-only"),
    /transport failed\/interrupted/,
  );
  checks++;
  assert.equal(
    createHash("sha256")
      .update(
        source.slice(
          source.indexOf("const args = ["),
          source.indexOf("// Explicit process runner."),
        ),
      )
      .digest("hex"),
    "18fd5c5b6477fc8c7d209afca08a9c80c15526e542f71724df6180e85b588eb3",
    "fixed target/owner/source/history/environment/SQL/session/reset guards remain byte-for-byte unchanged",
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
    "AbortSignal.timeout(30_000)",
    "AbortSignal.any([",
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
