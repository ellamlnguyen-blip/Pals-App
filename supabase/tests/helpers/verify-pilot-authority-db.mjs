import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { localTarget } from "./pilot-admission-authority.mjs";

localTarget();
let assertions = 0;
const directory = new URL("../database/", import.meta.url);
for (const file of readdirSync(directory)
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_pals-local",
      "psql",
      "-X",
      "-qAt",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: readFileSync(new URL(file, directory), "utf8"), encoding: "utf8" },
  );
  const output = result.stdout + "\n" + result.stderr;
  if (result.status !== 0 || /^not ok\b/m.test(output)) {
    console.error(output);
    assert.equal(result.status, 0, file);
    assert.doesNotMatch(output, /^not ok\b/m, file);
  }
  const count = (result.stdout.match(/^ok\s+\d+/gm) ?? []).length;
  assert.ok(count > 0, `${file}: actual pgTAP assertions required`);
  assertions += count;
  console.log(`${file}: ${count} assertions pass`);
}
console.log(
  `Full database suite: ${assertions} assertions pass; SQL exit statuses and pgTAP not-ok checked`,
);
