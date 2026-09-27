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
} from "./helpers/pilot-admission-lifecycle.mjs";
// Run reviewed B1/B2 modules serially under the child's exact ownership guard.
// No inherited acknowledgement, wildcard, dependency/source edit or wider
// historical-suite claim. Adapters are disposable text copies, never commits.
test(
  "B3a L6 reviewed B1 owner and B2 source/safety/operator module regressions",
  { concurrency: false, timeout: 1200000 },
  () => {
    localTarget();
    const directory = mkdtempSync(join(tmpdir(), "pals-b3a-regressions-"));
    try {
      mkdirSync(join(directory, "helpers"));
      for (const [stage, helper, modules] of [
        [
          "TASK-021A1b1",
          "pilot-admission-owner.mjs",
          [
            "pilot-admission-owner-concurrency.integration.mjs",
            "pilot-admission-owner-http.integration.mjs",
          ],
        ],
        [
          "TASK-021A1b2",
          "pilot-admission-source-safety.mjs",
          [
            "pilot-admission-source-safety-concurrency.integration.mjs",
            "pilot-admission-source-safety-http.integration.mjs",
          ],
        ],
      ]) {
        let source = readFileSync(`supabase/tests/helpers/${helper}`, "utf8");
        assert.ok(
          source.includes(`"${stage}"`),
          "exact inherited ownership literal must exist",
        );
        source = source
          .replaceAll(`"${stage}"`, '"TASK-021A1b3a"')
          .replaceAll("24:20260927000400", "25:20260927000500");
        assert.ok(source.includes('"TASK-021A1b3a"'));
        writeFileSync(join(directory, "helpers", helper), source);
        for (const module of modules) {
          resetDisposable();
          writeFileSync(
            join(directory, module),
            readFileSync(`supabase/tests/${module}`, "utf8"),
          );
          const result = spawnSync(
            process.execPath,
            ["--test", "--test-concurrency=1", join(directory, module)],
            { encoding: "utf8", env: process.env, maxBuffer: 20 * 1024 * 1024 },
          );
          // Inherited outputs sanitize tokens; retain bounded test/evidence output.
          console.log(result.stdout);
          assert.match(result.stdout, /# pass [1-9]\d*/);
          assert.match(result.stdout, /# fail 0\b/);
          assert.match(result.stdout, /# skipped 0\b/);
          assert.equal(result.status, 0, `${module}: ${result.stderr}`);
        }
      }
    } finally {
      resetDisposable();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
