// Offline only: no target helper function is invoked. The private transport unit
// is isolated from source into a VM; injection exists only in this verifier.
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
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
  execFileSync: originalExec,
  Buffer,
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
  `${redactor}\n${isolated}\nglobalThis.unit = { command, ownedSession, runOwnedProcess, redact };`,
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
  // Every real external site is enumerated and routed to these fixed primitives.
  assert.equal((source.match(/execFileSync\(/g) ?? []).length, 1);
  assert.equal((source.match(/spawn\(/g) ?? []).length, 2);
  for (const fragment of [
    "transportBudgets.sql",
    "transportBudgets.metadata",
    "transportBudgets.reset",
    "transportBudgets.session",
    "transportBudgets.module",
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
