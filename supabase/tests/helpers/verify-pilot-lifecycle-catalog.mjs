import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { localTarget, sql, quote } from "./pilot-admission-lifecycle.mjs";
localTarget();
const baseline = JSON.parse(
  readFileSync("agents/handoffs/TASK-021A1b3-SOURCE-INVENTORY.json", "utf8"),
);
const data = JSON.parse(
  sql(
    `select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'identity_args',pg_get_function_identity_arguments(p.oid),'arguments_with_defaults',pg_get_function_arguments(p.oid),'result',pg_get_function_result(p.oid),'volatility',p.provolatile,'security_definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'),'service_execute',has_function_privilege('service_role',p.oid,'execute'),'definition',pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public')`,
  ),
);
for (const expected of baseline.functions) {
  const installed = data.find(
    (row) =>
      row.name === expected.name &&
      row.identity_args === expected.identity_args,
  );
  assert.ok(installed, expected.name + " exact ordered ABI");
  for (const key of [
    "identity_args",
    "arguments_with_defaults",
    "result",
    "volatility",
    "security_definer",
    "config",
    "acl",
    "anon_execute",
    "authenticated_execute",
    "service_execute",
  ])
    assert.deepEqual(installed[key], expected[key], expected.name + " " + key);
  if (expected.allocation !== "B3a") {
    const crypto = await import("node:crypto");
    const body = sql(
      `select encode(convert_to(prosrc,'UTF8'),'hex') from pg_proc where oid=${quote(
        expected.name +
          "(" +
          expected.identity_args
            .split(", ")
            .map((a) => a.replace(/^\w+ /, ""))
            .join(",") +
          ")",
      )}::regprocedure`,
    );
    assert.equal(
      crypto
        .createHash("sha256")
        .update(Buffer.from(body, "hex"))
        .digest("hex"),
      expected.body_sha256,
      expected.name + " unchanged body",
    );
  }
}
for (const name of [
  "private.pilot_lock_ordinary_lifecycle",
  "private.pilot_require_ordinary_lifecycle",
]) {
  const installed = data.filter((row) => row.name === name);
  assert.equal(installed.length, 1);
  const f = installed[0];
  assert.equal(f.volatility, "v");
  assert.equal(f.security_definer, true);
  assert.deepEqual(f.config, ['search_path=""']);
  for (const key of [
    "anon_execute",
    "authenticated_execute",
    "service_execute",
  ])
    assert.equal(f[key], false);
}
writeFileSync(
  "agents/handoffs/TASK-021A1b3a-CATALOG.json",
  JSON.stringify(
    data.filter(
      (row) =>
        baseline.functions.some((f) => f.name === row.name) ||
        row.name.startsWith("private.pilot_"),
    ),
    null,
    2,
  ) + "\n",
);
console.log(
  "Exact inherited ABI/default/result/effective grants and untouched bodies; private helpers fixed path/volatile/closed ACL",
);
