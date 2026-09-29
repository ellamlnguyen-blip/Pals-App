import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  localTarget,
  cliEnvironment,
  supabaseBinary,
} from "./pilot-admission-current-safety.mjs";
const args = [
  "db",
  "lint",
  "--local",
  "--schema",
  "public,private",
  "--level",
  "warning",
  "--fail-on",
  "warning",
];
export function verifyLintResult(result) {
  assert.equal(result.error, undefined, "spawn error cannot be accepted");
  assert.equal(result.signal, null, "signal termination cannot be accepted");
  assert.deepEqual(
    result.stderr.trim().split(/\r?\n/),
    [
      "Connecting to local database...",
      "Linting schema: public",
      "Linting schema: private",
    ],
    "only exact benign captured stderr lines permitted",
  );
  // Parse the entire stdout. Any plaintext, second JSON record or empty output fails.
  let data;
  try {
    data = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error("Whole lint stdout must be exactly one JSON document");
  }
  assert.deepEqual(Object.keys(data).sort(), ["message", "results"]);
  assert.equal(data.message, "db lint");
  assert.equal(
    result.status,
    1,
    "standard lint remains nonzero; no pass conversion",
  );
  assert.deepEqual(data.results, [
    {
      function: "private.pilot_lock_ordinary_lifecycle",
      issues: [
        {
          level: "warning extra",
          message: 'composite OUT variable "source_row" is not single argument',
          sqlState: "00000",
        },
      ],
    },
  ]);
  return {
    standard_exit_status: result.status,
    diagnostics: data,
    exact_compatibility_verification:
      "sole inherited lifecycle composite OUT advisory; not clean lint",
  };
}
export function runLint() {
  localTarget();
  return verifyLintResult(
    spawnSync(supabaseBinary, args, {
      cwd: fileURLToPath(new URL("../../../", import.meta.url)),
      env: cliEnvironment(),
      encoding: "utf8",
    }),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(JSON.stringify(runLint()));
