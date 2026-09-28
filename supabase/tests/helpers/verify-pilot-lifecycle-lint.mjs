import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { localTarget } from "./pilot-admission-lifecycle.mjs";
localTarget();
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
const result = spawnSync(process.env.SUPABASE_CLI ?? "supabase", args, {
  encoding: "utf8",
});
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
const data = JSON.parse(result.stdout.trim());
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
writeFileSync(
  "agents/handoffs/TASK-021A1b3a-LINT-EVIDENCE.json",
  JSON.stringify(
    {
      command: "supabase " + args.join(" "),
      standard_exit_status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      exact_compatibility_verification:
        "only prescribed helper structural composite OUT advisory; no other warning/error",
      diagnostics: data,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Standard lint exit1 preserved; exact one independently reviewed structural advisory verified, no other diagnostic",
);
