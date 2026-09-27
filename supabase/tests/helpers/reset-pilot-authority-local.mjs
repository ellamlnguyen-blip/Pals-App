import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { localTarget } from "./pilot-admission-authority.mjs";

localTarget();
const mode = process.argv[2] ?? "current";
assert.ok(
  ["current", "prior"].includes(mode),
  "only known disposable reset modes allowed",
);
const args = [
  "db",
  "reset",
  "--local",
  "--network-id",
  "pals-local-network",
  ...(mode === "prior" ? ["--version", "20260925000200"] : []),
];
const result = spawnSync(process.env.SUPABASE_CLI ?? "supabase", args, {
  encoding: "utf8",
});
console.log(`Guarded owned local reset (${mode}): exit ${result.status}`);
for (const line of (result.stdout + "\n" + result.stderr).split("\n")) {
  if (/Applying migration|Seeding|Finished|Error|failed|ERROR/.test(line))
    console.log(line.slice(0, 800));
}
assert.equal(result.status, 0, "guarded disposable reset must succeed");
