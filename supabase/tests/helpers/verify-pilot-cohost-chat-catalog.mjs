import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { localTarget, sql } from "./pilot-admission-cohost-chat.mjs";
localTarget();
const baseline = JSON.parse(
  readFileSync("agents/handoffs/TASK-021A1b3a-CATALOG.json", "utf8"),
);
const inventory = JSON.parse(
  readFileSync("agents/handoffs/TASK-021A1b3b-SOURCE-INVENTORY.json", "utf8"),
);
const replaced = new Set(
  inventory.functions
    .filter((f) => f.allocation === "replace public body only")
    .map((f) => f.name),
);
const data = JSON.parse(
  sql(
    `select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'identity_args',pg_get_function_identity_arguments(p.oid),'arguments_with_defaults',pg_get_function_arguments(p.oid),'result',pg_get_function_result(p.oid),'volatility',p.provolatile,'security_definer',p.prosecdef,'config',p.proconfig,'owner',pg_get_userbyid(p.proowner),'acl',p.proacl,'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'),'service_execute',has_function_privilege('service_role',p.oid,'execute'),'definition',pg_get_functiondef(p.oid),'body',p.prosrc) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private')`,
  ),
);
for (const expected of baseline) {
  const f = data.find(
    (f) =>
      f.name === expected.name && f.identity_args === expected.identity_args,
  );
  assert.ok(f, expected.name + " exact ABI");
  for (const field of [
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
    assert.deepEqual(f[field], expected[field], expected.name + " " + field);
  if (!replaced.has(f.name))
    assert.equal(
      f.definition,
      expected.definition,
      f.name + " untouched installed definition",
    );
}
for (const expected of inventory.functions.filter(
  (f) => !replaced.has(f.name),
)) {
  const matches = data.filter((f) => f.name === expected.name);
  assert.equal(matches.length, 1, expected.name + " unique installed overload");
  assert.equal(
    createHash("sha256").update(matches[0].body).digest("hex"),
    expected.body_sha256,
    expected.name + " untouched source body",
  );
}
for (const name of [
  "private.pilot_lock_cohost_chat",
  "private.pilot_require_cohost_chat",
]) {
  const matches = data.filter((f) => f.name === name);
  assert.equal(matches.length, 1);
  const f = matches[0];
  assert.equal(
    f.identity_args,
    "p_operation text, p_hangout_id uuid, p_account_id uuid",
  );
  assert.equal(f.arguments_with_defaults, f.identity_args);
  assert.equal(f.volatility, "v");
  assert.equal(f.security_definer, true);
  assert.equal(f.owner, "postgres");
  assert.deepEqual(f.config, ['search_path=""']);
  assert.deepEqual(f.acl, ["postgres=X/postgres"]);
  for (const field of [
    "anon_execute",
    "authenticated_execute",
    "service_execute",
  ])
    assert.equal(f[field], false);
  assert.equal(
    f.result,
    name.endsWith("pilot_require_cohost_chat")
      ? "void"
      : "TABLE(actor_id uuid, host_id uuid, campus_id uuid, source_id uuid, locked_subject_bindings jsonb)",
  );
}
assert.equal(
  data.filter((f) => f.name === "public.remove_hangout_participant").length,
  1,
  "removed overload absent",
);
assert.equal(
  sql(
    "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private')",
  ),
  "144",
  "accepted142 domain functions plus only2 private helpers",
);
assert.equal(
  sql(
    "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r'",
  ),
  "52",
  "inherited52 tables unchanged",
);
// Installed trigger bindings, every domain body and source-preservation are also
// captured/compared over the true25→26 upgrade, independent of this scoped ABI.
writeFileSync(
  "agents/handoffs/TASK-021A1b3b-CATALOG.json",
  JSON.stringify(data, null, 2) + "\n",
);
console.log(
  "Exact inherited scoped ABI/defaults/results/ACLs and unchanged definitions; two owner-only scalar helpers;144 domain functions/52 tables; removed overload absent",
);
