import assert from "node:assert/strict";
import test from "node:test";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  localTarget,
  resetDisposable,
} from "./helpers/pilot-admission-cohost-chat.mjs";
// Adapt disposable copies only. Every inherited mutation/SQL/session uses the
// exact B3b/full26 wrapper; no child owner substitution or wildcard manifest.
function adaptHelper(source) {
  const sqlStart = source.indexOf("export function sql("),
    targetStart = source.indexOf("export function localTarget("),
    okStart = source.indexOf("export function ok(");
  assert.ok(sqlStart >= 0 && targetStart > sqlStart && okStart > targetStart);
  source =
    source.slice(0, sqlStart) +
    `export function sql(input){return guardedSql(input);}\nexport function localTarget(){return guardedTarget();}\n` +
    source.slice(okStart);
  if (source.includes("export function resetDisposable(")) {
    const a = source.indexOf("export function resetDisposable("),
      b = source.indexOf("export function session(", a);
    assert.ok(b > a);
    source =
      source.slice(0, a) +
      `export function resetDisposable(){return guardedReset();}\nexport function assertClean(){return guardedClean();}\n` +
      source.slice(b);
  }
  source = source
    .replace(
      "export function session(name) {",
      "export function session(name) { guardedTarget();",
    )
    .replaceAll(
      'spawn("docker",',
      'spawn("/private/tmp/pals-runtime/docker/docker",',
    );
  return (
    `import {sql as guardedSql,localTarget as guardedTarget,resetDisposable as guardedReset,assertClean as guardedClean} from './pilot-admission-cohost-chat.mjs';\n` +
    source
  );
}
test(
  "B3b L6 all fresh A1a/B1/B2 nested once and accepted B3a HTTP/four race modules",
  { concurrency: false, timeout: 1200000 },
  () => {
    localTarget();
    const directory = mkdtempSync(join(tmpdir(), "pals-b3b-regressions-"));
    const outcomes = [];
    try {
      mkdirSync(join(directory, "helpers"));
      writeFileSync(
        join(directory, "helpers", "pilot-admission-cohost-chat.mjs"),
        readFileSync(
          "supabase/tests/helpers/pilot-admission-cohost-chat.mjs",
          "utf8",
        ),
      );
      writeFileSync(
        join(directory, "helpers", "pilot-admission-lifecycle.mjs"),
        adaptHelper(
          readFileSync(
            "supabase/tests/helpers/pilot-admission-lifecycle.mjs",
            "utf8",
          ),
        ),
      );
      writeFileSync(
        join(directory, "helpers", "pilot-lifecycle-fixtures.mjs"),
        readFileSync(
          "supabase/tests/helpers/pilot-lifecycle-fixtures.mjs",
          "utf8",
        ),
      );
      const modules = [
        "pilot-lifecycle-regressions.integration.mjs",
        "pilot-admission-lifecycle-http.integration.mjs",
        "pilot-admission-lifecycle-concurrency.integration.mjs",
        "pilot-lifecycle-source-races.integration.mjs",
        "pilot-lifecycle-block-membership-races.integration.mjs",
        "pilot-lifecycle-crossings.integration.mjs",
      ];
      for (const path of modules) {
        let source = readFileSync("supabase/tests/" + path, "utf8");
        // Distinct output names keep historical accepted25 receipts untouched.
        source = source.replaceAll(
          "agents/handoffs/TASK-021A1b3a-",
          "agents/handoffs/TASK-021A1b3b-REGRESSION-B3A-",
        );
        if (path === "pilot-lifecycle-regressions.integration.mjs") {
          source = source.replaceAll('"TASK-021A1b3a"', '"TASK-021A1b3b"');
          source = source.replace(
            "test(\n",
            adaptHelper.toString() + "\ntest(\n",
          );
          source = source.replace(
            'mkdirSync(join(directory, "helpers"));',
            `mkdirSync(join(directory, "helpers"));writeFileSync(join(directory,'helpers','pilot-admission-cohost-chat.mjs'),readFileSync('supabase/tests/helpers/pilot-admission-cohost-chat.mjs','utf8'));`,
          );
          const a = source.indexOf("        source = source"),
            b = source.indexOf("        assert.ok(source.includes", a);
          assert.ok(a >= 0 && b > a);
          source =
            source.slice(0, a) +
            "        source=adaptHelper(source);\n" +
            source.slice(b);
          // Existing assert of old owner literal becomes an explicit wrapper import
          // assertion, while the parent environment keeps the actual B3b owner.
          source = source.replace(
            "assert.ok(source.includes('\"TASK-021A1b3b\"'));",
            "assert.ok(source.includes('pilot-admission-cohost-chat.mjs'));",
          );
          source = source.replace(
            'readFileSync(`supabase/tests/${modulePath}`, "utf8"),',
            'readFileSync(`supabase/tests/${modulePath}`, "utf8").replaceAll("agents/handoffs/TASK-021A1", "agents/handoffs/TASK-021A1b3b-REGRESSION-A1"),',
          );
        }
        resetDisposable();
        writeFileSync(join(directory, path), source);
        const env = { ...process.env };
        delete env.NODE_TEST_CONTEXT;
        assert.equal(env.PALS_PILOT_DISPOSABLE_OWNER, "TASK-021A1b3b");
        const result = spawnSync(
          process.execPath,
          [
            "--test",
            "--test-reporter=tap",
            "--test-concurrency=1",
            join(directory, path),
          ],
          { encoding: "utf8", env, maxBuffer: 20 * 1024 * 1024 },
        );
        assert.equal(result.error, undefined);
        assert.equal(result.signal, null);
        assert.equal(
          result.status,
          0,
          `${path}: ${result.stderr}; ${result.stdout}`,
        );
        assert.match(result.stdout, /# pass [1-9]\d*/);
        assert.match(result.stdout, /# fail 0\b/);
        assert.match(result.stdout, /# skipped 0\b/);
        assert.match(result.stdout, /# cancelled 0\b/);
        outcomes.push({
          module: path,
          stdout: result.stdout,
          classification:
            path === "pilot-lifecycle-regressions.integration.mjs"
              ? "six actual prior-stage A1a/B1/B2 modules embedded exactly once"
              : "fresh adapted B3a actual module",
        });
      }
      writeFileSync(
        "agents/handoffs/TASK-021A1b3b-REGRESSION-EVIDENCE.json",
        JSON.stringify(outcomes, null, 2) + "\n",
      );
    } finally {
      resetDisposable();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
