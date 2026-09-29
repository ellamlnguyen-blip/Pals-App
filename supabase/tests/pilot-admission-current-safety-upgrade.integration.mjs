import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertClean,
  cliEnvironment,
  expectedMigrationVersions,
  localTarget,
  migrationFiles,
  quote,
  resetDisposable,
  sql,
  supabaseBinary,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  capabilityKeys,
  censusQuery,
  censusTables,
  sanitized,
} from "./helpers/pilot-current-safety-fixtures.mjs";
import {
  differences,
  neutralSuiteError,
  originalSuiteError,
  outgoingValue,
  projectOutgoingEvidence,
} from "./pilot-admission-current-safety-concurrency.integration.mjs";

// Dormant, excluded from the shared runner. No import or example has authority
// to call a guard, SQL, CLI, API, reset or provider. No environment release knob.
const root = fileURLToPath(new URL("../../", import.meta.url));
const priorLane = Object.freeze({ lane: "prior26-upgrade" });
const sourceName = "20260928000100_pilot_current_safety.sql";
const priorVersions = expectedMigrationVersions.slice(0, 26);
const resetArgs = Object.freeze([
  "db",
  "reset",
  "--local",
  "--network-id",
  "pals-local-network",
  "--version",
  "20260927000600",
]);
const resetOptions = Object.freeze({
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  timeout: 180_000,
  killSignal: "SIGKILL",
  maxBuffer: 20 * 1024 * 1024,
});
const replacements = Object.freeze([
  "public.set_safety_block",
  "public.submit_safety_report",
]);
const additions = Object.freeze([
  "private.pilot_lock_current_safety",
  "private.pilot_require_current_safety",
]);
const labels = Object.freeze([
  "upgrade-refused",
  "prior-reset-complete",
  "prior-baseline-qualified",
  "only27-preservation-verified",
  "original-failure-before-cleanup",
  "cleanup-refused",
  "full27-clean",
  "cleanup-failed",
]);
function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
function read(relative) {
  return readFileSync(new URL(`../../${relative}`, import.meta.url), "utf8");
}
function pinnedJSON(path, hash) {
  const text = read(path);
  assert.equal(digest(text), hash, "fixed reviewed source anchor");
  return JSON.parse(text);
}
function emit(label, record) {
  assert.ok(labels.includes(label), "owned finite upgrade label");
  // Shared default-deny projection first; only this independently fixed label
  // may be attached afterwards. No input key/row/catalog value gains authority.
  return { ...projectOutgoingEvidence(record), upgrade_phase: label };
}
function assertExact(expected, actual, coordinate) {
  const delta = differences(expected, actual, "$", coordinate);
  if (delta.length) {
    const error = new Error("Upgrade comparison failed");
    error.differences = delta; // Private until the outgoing projector.
    throw error;
  }
}
function requireUpgradeReview() {
  throw new Error(
    "B3c upgrade fixtures runtime blocked: require full source/guard/catalog/privacy review, combined freeze, fresh ownership preflight and explicit exclusive serial release before target contact",
  );
}
function acceptedResetExit(receipt) {
  return (
    receipt &&
    Number.isSafeInteger(receipt.status) &&
    receipt.status === 0 &&
    receipt.signal == null &&
    !receipt.error &&
    receipt.code == null
  );
}
function priorSQL(input) {
  return sql(input, priorLane);
}
function snapshot(lane) {
  const query = lane === "prior26-upgrade" ? priorSQL : sql;
  assertExact(
    censusTables.filter((t) => /^(public|private)\./.test(t)).sort(),
    JSON.parse(
      query(
        "select jsonb_agg(table_schema||'.'||table_name order by table_schema,table_name) from information_schema.tables where table_type='BASE TABLE' and table_schema in('public','private')",
      ),
    ),
    ["catalog", "tables"],
  );
  const rows = JSON.parse(query(censusQuery));
  assertExact(censusTables.slice().sort(), Object.keys(rows).sort(), [
    "census",
  ]);
  return rows;
}
function history(query) {
  return JSON.parse(
    query(
      "select coalesce(jsonb_agg(to_jsonb(m) order by version),'[]') from supabase_migrations.schema_migrations m",
    ),
  );
}
function exactVersions(rows, versions) {
  assertExact(
    versions,
    rows.map((r) => r.version),
    ["history", "versions"],
  );
  for (const row of rows) {
    const filename = Object.keys(migrationFiles).find((n) =>
      n.startsWith(row.version + "_"),
    );
    assert.equal(
      row.name,
      filename.slice(15, -4),
      "exact committed history name",
    );
    assert.ok(
      Array.isArray(row.statements) && row.statements.length > 0,
      "complete populated source receipt",
    );
    assert.equal(
      canonicalSQL(row.statements.join(";\n")),
      canonicalSQL(read(`supabase/migrations/${filename}`)),
      "independent complete migration source receipt",
    );
  }
}
// Whitespace/comments outside SQL literals have no execution meaning. Dollar
// quoted bodies and string values stay byte-exact. This is a receipt comparator,
// never a migration parser that rewrites the applied source.
function canonicalSQL(text) {
  const tokens =
    text.match(
      /\$\w*\$[\s\S]*?\$\w*\$|'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/|[^\s;]+|;/g,
    ) ?? [];
  return tokens
    .filter((t) => !t.startsWith("--") && !t.startsWith("/*"))
    .join(" ")
    .replace(/(?:\s*;)+\s*$/, "");
}
function migrationBody(full, expectedHash) {
  assert.equal(digest(full), expectedHash, "exact reviewed migration hash");
  const opening =
    "-- TASK-021A1b3c / ADR-0027: current safety acquisition only.\n-- Retained evidence, exact report replay, unblock and operator authority stay independent.\nbegin;";
  assert.ok(full.startsWith(opening + "\n"), "exact reviewed opening wrapper");
  assert.ok(full.endsWith("\ncommit;\n"), "exact reviewed closing wrapper");
  const body = full.slice(opening.length, -"\ncommit;\n".length);
  // Only BEGIN/COMMIT bytes are removed. Preserve leading reviewed comments.
  return opening.slice(0, -"begin;".length) + body;
}
function sourceFreeze() {
  const sources = {};
  for (const [name, hash] of Object.entries(migrationFiles)) {
    const text = read(`supabase/migrations/${name}`);
    assert.equal(digest(text), hash, "frozen exact migration body");
    sources[name] = text;
  }
  assert.equal(Object.keys(sources).length, 27);
  const full = sources[sourceName];
  const streamed = migrationBody(full, migrationFiles[sourceName]);
  const declarations = [
    ...full.matchAll(
      /create(?: or replace)? function ([\w.]+)\(([\s\S]*?)\)\s+([\s\S]*?) as \$\$([\s\S]*?)\$\$;/g,
    ),
  ];
  assertExact(
    [...replacements, ...additions].sort(),
    declarations.map((m) => m[1]).sort(),
    ["source", "functions"],
  );
  const bodies = Object.fromEntries(declarations.map((m) => [m[1], m[4]]));
  const inventory = pinnedJSON(
    "agents/handoffs/TASK-021A1b3c-SOURCE-INVENTORY.json",
    "3e212c7c9716f8138e80a914e54259ae043b8611696d3c4f5e62e5fbc2102879",
  );
  const oldFunctions = pinnedJSON(
    inventory.catalog_source,
    inventory.catalog_sha256,
  );
  const oldShape = pinnedJSON(
    "agents/handoffs/TASK-021A1b3b-UPGRADE-EVIDENCE.json",
    "269f4782cde381aae32180ad5981d15f0a26bab33c582807c8895631e31c35ad",
  ).catalog;
  assert.equal(inventory.functions.length, 144);
  assert.equal(inventory.triggers.length, 34);
  assert.equal(inventory.direct_function_writers.length, 39);
  for (const f of inventory.functions) {
    const text = sources[f.final_source.split("/").at(-1)];
    const candidates = [
      ...text.matchAll(
        /create(?: or replace)? function ([\w.]+)\([\s\S]*?\)[\s\S]*? as \$\$([\s\S]*?)\$\$;/g,
      ),
    ].filter((m) => m[1] === f.name);
    assert.equal(
      digest(candidates.at(-1)[2]),
      f.body_sha256,
      "independent final26 source body",
    );
  }
  return { sources, full, streamed, bodies, inventory, oldFunctions, oldShape };
}
function fixedPriorReset() {
  localTarget("prior26-upgrade"); // Checks exact known26/27 and all frozen protections.
  try {
    execFileSync(supabaseBinary, resetArgs, {
      ...resetOptions,
      env: cliEnvironment(),
    });
  } catch (error) {
    // A sync normal return proves its directly owned child exited0 only.
    // Signal/timeout/overflow/spawn/null/noninteger/nonzero has no reset credit.
    const failure = new Error("Prior reset failed; settlement unproven");
    failure.cleanupIncomplete = true;
    failure.reset_forbidden = true;
    failure.resetOriginal = error; // Private only; never output.
    throw failure;
  }
  localTarget("prior26-upgrade");
  exactVersions(history(priorSQL), priorVersions);
}

// Captured in memory, compared raw. JSON casts prevent bigint precision loss.
// Every relevant relation's complete pg_class/pg_attribute records, including
// dropped-column slots and attacl, accompany human-readable type/default fields.
const relations =
  "(n.nspname in('public','private') or (n.nspname='storage' and c.relname='objects'))";
const catalogQuery = `with rel as(select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in('r','p') and ${relations})
select jsonb_build_object(
 'tables',(select coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'raw',to_jsonb(c),'owner',pg_get_userbyid(c.relowner),'acl',c.relacl,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,'columns',(select coalesce(jsonb_agg(jsonb_build_object('raw',to_jsonb(a),'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'acl',a.attacl,'default',pg_get_expr(d.adbin,d.adrelid),'default_raw',to_jsonb(d)) order by a.attnum),'[]') from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0)) order by n.nspname,c.relname),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid in(select oid from rel)),
 'policies',(select coalesce(jsonb_agg(jsonb_build_object('raw',to_jsonb(p),'table',p.polrelid::regclass::text,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polrelid,p.polname),'[]') from pg_policy p where p.polrelid in(select oid from rel)),
 'policy_views',(select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]') from pg_policies p where schemaname in('public','private') or (schemaname='storage' and tablename='objects')),
 'constraints',(select coalesce(jsonb_agg(jsonb_build_object('raw',to_jsonb(k),'table',k.conrelid::regclass::text,'name',k.conname,'definition',pg_get_constraintdef(k.oid)) order by k.conrelid,k.conname),'[]') from pg_constraint k where k.conrelid in(select oid from rel)),
 'indexes',(select coalesce(jsonb_agg(jsonb_build_object('raw',to_jsonb(i),'class',to_jsonb(c),'table',i.indrelid::regclass::text,'name',c.relname,'definition',pg_get_indexdef(i.indexrelid),'expression',pg_get_expr(i.indexprs,i.indrelid),'predicate',pg_get_expr(i.indpred,i.indrelid)) order by i.indrelid,c.relname),'[]') from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid in(select oid from rel)),
 'triggers',(select coalesce(jsonb_agg(jsonb_build_object('raw',to_jsonb(t),'table',t.tgrelid::regclass::text,'name',t.tgname,'function',t.tgfoid::regprocedure::text,'definition',pg_get_triggerdef(t.oid)) order by t.tgrelid,t.tgname),'[]') from pg_trigger t where t.tgrelid in(select oid from rel) or t.tgrelid='auth.users'::regclass),
 'sequences',(select coalesce(jsonb_agg(jsonb_build_object('raw',to_jsonb(s),'class',to_jsonb(c),'dependencies',(select coalesce(jsonb_agg(to_jsonb(d) order by d.refobjid,d.refobjsubid),'[]') from pg_depend d where d.objid=c.oid)) order by c.oid),'[]') from pg_sequence s join pg_class c on c.oid=s.seqrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') or exists(select 1 from pg_depend d where d.objid=c.oid and d.refobjid in(select oid from rel))),
 'types',(select coalesce(jsonb_agg(jsonb_build_object('raw',to_jsonb(t),'enum',(select coalesce(jsonb_agg(to_jsonb(e) order by enumsortorder),'[]') from pg_enum e where e.enumtypid=t.oid),'constraints',(select coalesce(jsonb_agg(to_jsonb(k) order by oid),'[]') from pg_constraint k where k.contypid=t.oid)) order by t.oid),'[]') from pg_type t where t.typtype in('e','d') and (t.oid in(select a.atttypid from pg_attribute a where a.attrelid in(select oid from rel)) or t.oid in(select b.typelem from pg_type b join pg_attribute a on a.atttypid=b.oid where a.attrelid in(select oid from rel)))),
 'schemas',(select jsonb_agg(to_jsonb(n) order by n.nspname) from pg_namespace n where n.nspname in('public','private','storage')),
 'default_acl',(select coalesce(jsonb_agg(to_jsonb(d) order by oid),'[]') from pg_default_acl d),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object('raw',to_jsonb(p),'oid',p.oid,'name',n.nspname||'.'||p.proname,'identity_args',pg_get_function_identity_arguments(p.oid),'arguments_with_defaults',pg_get_function_arguments(p.oid),'result',pg_get_function_result(p.oid),'acl',p.proacl,'owner',pg_get_userbyid(p.proowner),'volatility',p.provolatile,'security_definer',p.prosecdef,'config',p.proconfig,'language',l.lanname,'body',p.prosrc,'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'),'service_execute',has_function_privilege('service_role',p.oid,'execute'),'public_execute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE')) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname in('public','private'))
)`;
function catalog(query) {
  return JSON.parse(query(catalogQuery));
}
function functionKey(f) {
  return `${f.name}(${f.identity_args})`;
}
function legacyTable(t) {
  const { raw, columns, ...values } = t;
  void raw;
  return {
    ...values,
    columns: columns
      .filter((c) => !c.raw.attisdropped)
      .map(({ raw: r, default_raw, ...c }) => {
        void r;
        void default_raw;
        return c;
      }),
  };
}
function sortRecords(rows, keys) {
  return [...rows].sort((a, b) =>
    keys
      .map((k) => String(a[k]))
      .join("\0")
      .localeCompare(keys.map((k) => String(b[k])).join("\0")),
  );
}
function assertPriorCatalog(c, frozen) {
  assertExact(frozen.oldShape.tables, c.tables.map(legacyTable), [
    "catalog",
    "tables",
  ]);
  const relevant = (row) =>
    /^(public|private)\./.test(
      row.table ?? `${row.schemaname}.${row.tablename}`,
    ) ||
    row.table === "storage.objects" ||
    (row.schemaname === "storage" && row.tablename === "objects");
  assertExact(frozen.oldShape.policies.filter(relevant), c.policy_views, [
    "catalog",
    "policies",
  ]);
  for (const key of ["constraints", "triggers"]) {
    const project = ({ table, name, definition, function: fn }) => ({
      table,
      name,
      definition,
      ...(key === "triggers" ? { function: fn } : {}),
    });
    assertExact(
      sortRecords(frozen.oldShape[key].filter(relevant).map(project), [
        "table",
        "name",
      ]),
      sortRecords(
        c[key]
          .filter(
            (r) => relevant(r) && (key !== "triggers" || !r.raw.tgisinternal),
          )
          .map(project),
        ["table", "name"],
      ),
      ["catalog", key],
    );
  }
  // OIDs in historical defaultACL belong to a different reset. Independent
  // roles/schema/object-kind/ACL anchors are exact; live OIDs stay raw for27.
  const aclAnchor = ({ oid, ...row }) => {
    void oid;
    return row;
  };
  assertExact(
    frozen.oldShape.default_acl.map(aclAnchor),
    c.default_acl.map(aclAnchor),
    ["catalog", "default_acl"],
  );
  assert.equal(c.functions.length, 144);
  assert.equal(new Set(c.functions.map(functionKey)).size, 144);
  for (const expected of frozen.inventory.functions) {
    const installed = c.functions.filter((f) => f.name === expected.name);
    assert.equal(installed.length, 1, "exact final26 overload closure");
    for (const [key, value] of Object.entries(expected.catalog_inherited26))
      assertExact(value, installed[0][key], ["catalog", expected.name, key]);
    assert.equal(digest(installed[0].body), expected.body_sha256);
    const historical = frozen.oldFunctions.find(
      (f) => functionKey(f) === functionKey(installed[0]),
    );
    assert.ok(historical);
    assert.equal(
      installed[0].language,
      /LANGUAGE (\w+)/.exec(historical.definition)[1],
    );
    assert.equal(installed[0].public_execute, false);
  }
  const domain = c.triggers.filter(
    (t) => !t.raw.tgisinternal && t.function.startsWith("private."),
  );
  assert.equal(domain.length, 34);
  assertExact(
    frozen.inventory.triggers.map((t) => [t.table, t.name, t.function]).sort(),
    domain.map((t) => [t.table, t.name, t.function.split("(")[0]]).sort(),
    ["catalog", "source_trigger_closure"],
  );
  for (const t of domain)
    assert.equal(t.raw.tgenabled, "O", "source enabled trigger");
  // Every explicit source index plus every constraint-backed index is anchored.
  // Domain migration source has no sequence or enum/domain declaration.
  assert.equal(
    c.sequences.filter((s) =>
      ["public", "private"].includes(
        s.class.relnamespace ===
          c.schemas.find((n) => n.nspname === "public").oid
          ? "public"
          : s.class.relnamespace ===
              c.schemas.find((n) => n.nspname === "private").oid
            ? "private"
            : "storage",
      ),
    ).length,
    0,
  );
  assert.equal(c.types.length, 0);
  const sourceIndexes = [
    ...Object.values(frozen.sources)
      .slice(0, 26)
      .join("\n")
      .matchAll(
        /create (unique )?index (\w+) on ([\w.]+)\s*\(([^)]+)\)([\s\S]*?);/gi,
      ),
  ];
  const explicit = new Set();
  for (const m of sourceIndexes) {
    explicit.add(`${m[3]}:${m[2]}`);
    const index = c.indexes.find((i) => i.table === m[3] && i.name === m[2]);
    assert.ok(index);
    assert.equal(index.raw.indisunique, Boolean(m[1]));
    assert.equal(index.raw.indisvalid, true);
    assert.equal(index.raw.indisready, true);
    assert.equal(index.expression, null);
    const columns = index.definition.match(
      / USING btree \((.*?)\)(?: WHERE|$)/,
    )[1];
    assert.equal(
      columns.replaceAll(" ", "").toLowerCase(),
      m[4].replaceAll(/\s/g, "").toLowerCase(),
    );
    if (m[5].trim())
      assert.equal(
        index.predicate,
        "(state = ANY (ARRAY['pending'::text, 'accepted'::text]))",
      );
    else assert.equal(index.predicate, null);
  }
  for (const i of c.indexes.filter((i) => /^(public|private)\./.test(i.table)))
    assert.ok(
      explicit.has(`${i.table}:${i.name}`) ||
        c.constraints.some(
          (k) =>
            k.raw.conindid === i.raw.indexrelid &&
            k.raw.conrelid === i.raw.indrelid &&
            ["p", "u"].includes(k.raw.contype),
        ),
      "no unknown domain index",
    );
  for (const constraint of c.constraints.filter((k) =>
    ["p", "u"].includes(k.raw.contype),
  )) {
    const index = c.indexes.find(
      (i) =>
        i.raw.indexrelid === constraint.raw.conindid &&
        i.raw.indrelid === constraint.raw.conrelid,
    );
    assert.ok(index, "every primary/unique constraint index binding exists");
    assert.equal(index.raw.indisunique, true);
    assert.equal(index.raw.indisvalid, true);
    assert.equal(index.raw.indisready, true);
    assert.equal(index.expression, null);
    assert.equal(index.predicate, null);
  }
  const privateSchema = c.schemas.find((n) => n.nspname === "private");
  assert.deepEqual(privateSchema.nspacl, [
    "postgres=UC/postgres",
    "authenticated=U/postgres",
  ]);
}
function compareCatalog(before, after, frozen) {
  for (const key of Object.keys(before).filter((k) => k !== "functions"))
    assertExact(before[key], after[key], ["catalog", key]);
  assert.equal(after.functions.length, 146);
  assert.equal(new Set(after.functions.map(functionKey)).size, 146);
  for (const f of before.functions) {
    const next = after.functions.find((n) => functionKey(n) === functionKey(f));
    assert.ok(next, "all144 inherited overloads remain");
    const permitted = replacements.includes(f.name);
    assertExact(permitted ? frozen.bodies[f.name] : f.body, next.body, [
      "catalog",
      f.name,
      "body",
    ]);
    // CREATE OR REPLACE can change only source body, never the complete ABI,
    // ACL/default/language/owner/security/proconfig/OID/parallel attributes.
    const withoutBody = (row) => {
      const raw = { ...row.raw };
      delete raw.prosrc;
      const copy = { ...row, raw };
      delete copy.body;
      return copy;
    };
    assertExact(withoutBody(f), withoutBody(next), [
      "catalog",
      f.name,
      "attributes",
    ]);
  }
  const extra = after.functions.filter(
    (f) => !before.functions.some((b) => functionKey(b) === functionKey(f)),
  );
  assertExact(additions, extra.map((f) => f.name).sort(), [
    "catalog",
    "new_helpers",
  ]);
  for (const f of extra) {
    const lock = f.name.endsWith("pilot_lock_current_safety");
    assert.equal(
      f.identity_args,
      lock
        ? "p_operation text, p_target_id uuid"
        : "p_operation text, p_target_id uuid, p_bindings jsonb",
    );
    assert.equal(f.arguments_with_defaults, f.identity_args);
    assert.equal(
      f.result,
      lock
        ? "TABLE(actor_id uuid, peer_or_host_id uuid, campus_id uuid, source_id uuid, locked_subject_bindings jsonb)"
        : "void",
    );
    assert.equal(f.body, frozen.bodies[f.name]);
    assert.equal(f.owner, "postgres");
    assert.equal(f.language, "plpgsql");
    assert.equal(f.volatility, "v");
    assert.equal(f.security_definer, true);
    assert.deepEqual(f.config, ['search_path=""']);
    assert.deepEqual(f.acl, ["postgres=X/postgres"]);
    for (const key of [
      "public_execute",
      "anon_execute",
      "authenticated_execute",
      "service_execute",
    ])
      assert.equal(f[key], false);
    assert.equal(f.raw.prokind, "f");
    assert.equal(f.raw.proleakproof, false);
    assert.equal(f.raw.proparallel, "u");
    assert.equal(f.raw.proisstrict, false);
    assert.equal(f.raw.pronargdefaults, 0);
    assert.equal(f.raw.procost, 100);
    assert.equal(f.raw.prosupport, "-");
    assert.equal(f.raw.proretset, lock);
    assert.equal(f.raw.pronargs, lock ? 2 : 3);
  }
  for (const name of [...replacements, "public.set_people_block"]) {
    const f = after.functions.filter((f) => f.name === name);
    assert.equal(f.length, 1);
    assert.deepEqual(f[0].acl, [
      "postgres=X/postgres",
      "authenticated=X/postgres",
    ]);
    assert.equal(f[0].authenticated_execute, true);
    for (const k of ["public_execute", "anon_execute", "service_execute"])
      assert.equal(f[0][k], false);
  }
  // Lexical closure is reconciled against all live body values already bound to
  // exact source; no arbitrary new caller or overload can escape the inventory.
  for (const name of additions) {
    const callers = after.functions
      .filter((f) => f.body.includes(`${name}(`))
      .map((f) => f.name)
      .sort();
    assertExact(
      (name.endsWith("pilot_require_current_safety")
        ? [...replacements, "private.pilot_lock_current_safety"]
        : replacements
      )
        .slice()
        .sort(),
      callers,
      ["catalog", name, "callers"],
    );
  }
}

// Independent complete domain records. Privileged setup is preparation only;
// it does not exercise manager/student/operator permissions. Every field is
// specified here; no observed domain row is substituted as its expectation.
const uid = (n) => `c3a70000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const stamp = "2026-09-01T12:00:00+00:00";
const later = "2026-09-01T13:00:00+00:00";
const campus = "00000000-0000-4000-8000-000000000001";
const personEmail = (id) => `upgrade-${id}@unc.edu`;
const photo = (id) => `${id}/11111111.png`;
const md5 = (text) => createHash("md5").update(text).digest("hex");
function retainedPlan(backendPID) {
  const expected = Object.fromEntries(censusTables.map((t) => [t, []]));
  const add = (table, row) => {
    expected[table].push(row);
    return row;
  };
  add("public.universities", {
    id: campus,
    slug: "unc-chapel-hill",
    name: "University of North Carolina at Chapel Hill",
    active: true,
    allowed_email_domains: [
      "live.unc.edu",
      "unc.edu",
      "ad.unc.edu",
      "business.unc.edu",
      "kenan-flagler.unc.edu",
    ],
    created_at: stamp,
  });
  for (const n of [1, 2, 3, 4, 5]) {
    const id = uid(n);
    add("auth.users", {
      id,
      email: personEmail(id),
      email_confirmed_at: stamp,
      deleted_at: null,
      raw_user_meta_data: { synthetic: "private retained identity" },
      raw_app_meta_data: { provider: "email" },
    });
    add("public.accounts", {
      id,
      status: n === 5 ? "suspended" : "active",
      created_at: stamp,
    });
    add("public.university_memberships", {
      user_id: id,
      university_id: campus,
      verified_at: stamp,
      verification_email: personEmail(id),
      created_at: stamp,
    });
    add("public.profiles", {
      user_id: id,
      real_name: "Retained fixture",
      graduation_year: 2028,
      major: "Math",
      bio: "Retained private profile",
      primary_photo_path: photo(id),
      is_complete: true,
      created_at: stamp,
      interests: [],
      down_to_do: [],
      favorite_music: "Retained music",
      favorite_foods: null,
      weird_fact: null,
      prompts: [],
      instagram: null,
      additional_photo_paths: [],
      revision: 1,
    });
    // These seven independently specified domain fields are asserted before
    // treating remaining provider-specific fields as opaque preservation anchors.
    add("storage.objects", {
      id: uid(100 + n),
      bucket_id: "profile-photos",
      name: photo(id),
      owner_id: id,
      created_at: stamp,
      updated_at: stamp,
      last_accessed_at: stamp,
    });
    if (n < 4)
      add("private.pilot_account_admission", {
        account_id: id,
        state: "active",
        revision: 1,
        created_at: stamp,
        updated_at: stamp,
      });
  }
  add("public.platform_roles", {
    user_id: uid(4),
    role: "admin",
    created_at: stamp,
  });
  add("private.pilot_admission_managers", {
    account_id: uid(4),
    state: "active",
    revision: 1,
    created_at: stamp,
    updated_at: stamp,
  });
  add("private.pilot_manager_audit", {
    id: uid(210),
    account_id: uid(4),
    executor_session_user: "postgres",
    executor_original_role: "none",
    executor_backend_pid: backendPID,
    previous_state: null,
    new_state: "active",
    previous_revision: 0,
    new_revision: 1,
    reason: "Synthetic manager bootstrap",
    request_id: uid(211),
    occurred_at: stamp,
  });
  add("private.pilot_availability", {
    singleton: true,
    enabled: true,
    revision: 3,
    created_at: stamp,
    updated_at: stamp,
  });
  for (const key of capabilityKeys)
    add("private.pilot_capabilities", {
      key,
      enabled: ["hangouts", "people"].includes(key),
      revision: 2,
      created_at: stamp,
      updated_at: stamp,
    });
  add("private.pilot_management_audit", {
    id: uid(212),
    actor_id: uid(4),
    operation: "policy",
    target_id: null,
    policy_key: "availability",
    previous_value: false,
    new_value: true,
    previous_revision: 2,
    new_revision: 3,
    reason: "Synthetic retained policy",
    request_id: uid(213),
    occurred_at: stamp,
  });
  add("private.pilot_management_requests", {
    actor_id: uid(4),
    request_id: uid(213),
    fingerprint: [
      "policy",
      "availability",
      true,
      2,
      "Synthetic retained policy",
    ],
    result_value: true,
    result_revision: 3,
    audit_id: uid(212),
  });
  for (const t of censusTables.filter((t) => t.endsWith("_feature_gate")))
    add(t, {
      singleton: true,
      enabled: [
        "private.hangout_feature_gate",
        "private.people_feature_gate",
        "private.safety_feature_gate",
        "private.moderation_feature_gate",
      ].includes(t),
      ...(t === "private.large_hangout_feature_gate"
        ? { ranking_epoch: uid(214) }
        : {}),
    });
  add("private.people_preferences", { account_id: uid(2), opted_in: true });
  add("private.people_blocks", { blocker_id: uid(3), blocked_id: uid(5) });
  for (const n of [301, 302]) {
    add("public.hangouts", {
      id: uid(n),
      university_id: campus,
      host_id: uid(1),
      title:
        n === 301 ? "Current retained sentinel" : "Cancelled retained sentinel",
      description: "Retained source text",
      starts_at: later,
      ends_at: null,
      status: n === 301 ? "published" : "cancelled",
      joining_state: n === 301 ? "open" : "closed",
      visibility: "campus",
      public_place: "Approximate area",
      public_latitude: 35.91,
      public_longitude: -79.05,
      campus_zone: null,
      location_precision: "approximate_area",
      revision: 1,
      created_at: stamp,
      updated_at: stamp,
    });
    for (const account_id of [uid(1), uid(2)])
      add("public.hangout_participants", {
        hangout_id: uid(n),
        account_id,
        state: n === 302 && account_id === uid(2) ? "left" : "joined",
        joined_at: stamp,
        left_at: n === 302 && account_id === uid(2) ? later : null,
        removed_at: null,
        updated_at: stamp,
      });
    add("public.hangout_private_locations", {
      hangout_id: uid(n),
      instructions: "Retained private location",
      updated_at: stamp,
    });
    add("private.hangout_peer_provenance", {
      hangout_id: uid(n),
      low_id: uid(1),
      high_id: uid(2),
    });
  }
  add("private.hangout_create_requests", {
    host_id: uid(1),
    request_id: uid(303),
    hangout_id: uid(301),
    payload_fingerprint: digest(
      '["Current retained sentinel", 1788267600.000000, "Approximate area", 35.91, -79.05, "Retained source text", null, null, "Retained private location", "campus", "approximate_area", null]',
    ),
  });
  add("private.hangout_cohosts", {
    hangout_id: uid(301),
    account_id: uid(2),
    assigned_at: stamp,
  });
  add("private.hangout_conversations", {
    id: uid(304),
    hangout_id: uid(301),
    next_sequence: 2,
  });
  add("private.hangout_messages", {
    id: uid(305),
    conversation_id: uid(304),
    author_id: uid(2),
    sequence: 1,
    body: "Retained private chat",
    created_at: stamp,
  });
  add("private.hangout_message_requests", {
    hangout_id: uid(301),
    author_id: uid(2),
    request_id: uid(306),
    message_id: uid(305),
    payload_fingerprint: digest("Retained private chat"),
  });
  add("private.friendships", {
    low_id: uid(2),
    high_id: uid(3),
    requester_id: uid(2),
    campus_id: campus,
    generation_id: uid(401),
    state: "accepted",
  });
  add("private.friendship_create_requests", {
    actor_id: uid(2),
    request_id: uid(402),
    target_id: uid(3),
    generation_id: uid(401),
  });
  add("private.dm_pairs", {
    generation_id: uid(403),
    low_id: uid(2),
    high_id: uid(3),
    initiator_id: uid(2),
    campus_id: campus,
    state: "accepted",
    created_at: stamp,
    next_sequence: 2,
  });
  add("private.dm_messages", {
    id: uid(404),
    generation_id: uid(403),
    sequence: 1,
    author_id: uid(2),
    body: "Retained private DM",
    created_at: stamp,
  });
  add("private.dm_retries", {
    actor_id: uid(2),
    request_id: uid(405),
    kind: "send",
    target_id: uid(3),
    generation_id: uid(403),
    message_id: uid(404),
    fingerprint: digest("Retained private DM"),
  });
  for (const [n, type, target, provenance, ref] of [
    [501, "hangout", uid(302), "retained_hangout", uid(302)],
    [502, "user", uid(5), "owned_block", uid(5)],
  ]) {
    const reporter = n === 501 ? uid(2) : uid(3);
    add("private.safety_reports", {
      id: uid(n),
      submitted_at: stamp,
      reporter_id: reporter,
      target_type: type,
      target_id: target,
      category: "harassment",
      narrative: "Retained private allegation",
      provenance_kind: provenance,
      provenance_ref_id: ref,
    });
    add("private.safety_report_requests", {
      reporter_id: reporter,
      request_id: uid(n + 10),
      input_fingerprint: md5(
        JSON.stringify([
          type,
          target,
          "harassment",
          "Retained private allegation",
        ]).replaceAll(",", ", "),
      ),
      report_id: uid(n),
    });
  }
  add("private.account_sanctions", {
    id: uid(520),
    report_id: uid(502),
    subject_type: "user",
    subject_id: uid(5),
    operator_id: uid(4),
    request_id: uid(521),
    action: "suspend",
    previous_status: "active",
    new_status: "suspended",
    subject_campus_id: campus,
    reason: "Synthetic retained sanction",
    occurred_at: stamp,
  });
  add("private.hangout_disables", {
    id: uid(522),
    report_id: uid(501),
    subject_type: "hangout",
    hangout_id: uid(302),
    operator_id: uid(4),
    request_id: uid(523),
    previous_disabled: false,
    new_disabled: true,
    subject_campus_id: campus,
    reason: "Synthetic retained disable",
    occurred_at: stamp,
  });
  for (const n of [501, 502]) {
    add("private.moderation_cases", {
      report_id: uid(n),
      state: "closed",
      revision: 2,
      note:
        n === 501
          ? "Synthetic retained disable"
          : "Synthetic retained sanction",
      disposition: "action_taken",
      duplicate_report_id: null,
      sanction_id: n === 502 ? uid(520) : null,
      hangout_disable_id: n === 501 ? uid(522) : null,
    });
    add("private.moderation_requests", {
      operator_id: uid(4),
      request_id: uid(n === 501 ? 523 : 521),
      fingerprint:
        (n === 501 ? "hangout:" : "account:") +
        md5(
          JSON.stringify(
            n === 501
              ? [uid(n), 1, "Synthetic retained disable"]
              : [uid(n), 1, "suspend", "Synthetic retained sanction"],
          ).replaceAll(",", ", "),
        ),
      report_id: uid(n),
      result_state: "closed",
      result_revision: 2,
    });
    add("private.moderation_audit", {
      id: uid(n + 30),
      occurred_at: stamp,
      operator_id: uid(4),
      action: n === 501 ? "disable_hangout" : "suspend",
      report_id: uid(n),
      subject_target_type: n === 501 ? "hangout" : "user",
      subject_target_id: uid(n === 501 ? 302 : 5),
      subject_campus_id: campus,
      request_id: uid(n === 501 ? 523 : 521),
      previous_state: "in_review",
      new_state: "closed",
      previous_revision: 1,
      new_revision: 2,
      reason:
        n === 501
          ? "Synthetic retained disable"
          : "Synthetic retained sanction",
      duplicate_report_id: null,
      page_report_ids: null,
      page_count: null,
      sanction_id: n === 502 ? uid(520) : null,
      previous_account_status: n === 502 ? "active" : null,
      new_account_status: n === 502 ? "suspended" : null,
      hangout_disable_id: n === 501 ? uid(522) : null,
      previous_hangout_disabled: n === 501 ? false : null,
      new_hangout_disabled: n === 501 ? true : null,
    });
  }
  add("private.notification_preferences", {
    recipient_id: uid(1),
    category: "messages",
    enabled: false,
  });
  add("private.notification_items", {
    id: uid(601),
    recipient_id: uid(1),
    source_kind: "hangout_chat",
    source_id: uid(305),
    target_id: uid(301),
    event_code: "hangout_chat_message",
    actor_id: uid(2),
    created_at: stamp,
    read_at: null,
  });
  add("private.attendance_answers", {
    hangout_id: uid(302),
    account_id: uid(2),
    attended: false,
    revision: 1,
    answered_at: later,
  });
  return expected;
}
function literal(value) {
  return value === null
    ? "null"
    : typeof value === "boolean" || typeof value === "number"
      ? String(value)
      : Array.isArray(value)
        ? `array[${value.map(literal).join(",")}]`
        : quote(typeof value === "object" ? JSON.stringify(value) : value);
}
const jsonColumns = new Set([
  "fingerprint",
  "result_value",
  "previous_value",
  "new_value",
  "raw_user_meta_data",
  "raw_app_meta_data",
  "prompts",
]);
function insert(table, row) {
  const columns = Object.keys(row);
  return `insert into ${table}(${columns.join(",")}) values(${columns.map((key) => (jsonColumns.has(key) && (key !== "fingerprint" || typeof row[key] === "object") ? `${quote(JSON.stringify(row[key]))}::jsonb` : literal(row[key]))).join(",")});`;
}
function retainedSetup() {
  // The PID is an independently sampled scalar from this exact setup session,
  // never a row discovered after snapshot. Expected audit executor uses it.
  const plan = retainedPlan(0);
  let input = "begin;";
  for (const row of plan["auth.users"]) input += insert("auth.users", row);
  for (const row of plan["storage.objects"])
    input += insert("storage.objects", row);
  for (const row of plan["public.accounts"])
    input += `update public.accounts set status=${quote(row.status)},created_at=${quote(stamp)} where id=${quote(row.id)};`;
  input += `update public.universities set created_at=${quote(stamp)} where id=${quote(campus)};`;
  input += `update public.university_memberships set created_at=${quote(stamp)} where user_id in(${[1, 2, 3, 4, 5].map((n) => quote(uid(n))).join(",")});`;
  for (const row of plan["public.profiles"]) {
    const { user_id, is_complete, revision, ...values } = row;
    void is_complete;
    void revision;
    input += `update public.profiles set ${Object.entries(values)
      .map(
        ([k, v]) =>
          `${k}=${k === "prompts" ? quote(JSON.stringify(v)) + "::jsonb" : Array.isArray(v) && v.length === 0 ? "'{}'" : literal(v)}`,
      )
      .join(",")} where user_id=${quote(user_id)};`;
  }
  const normalized = [
    "private.pilot_availability",
    "private.pilot_capabilities",
    ...censusTables.filter((t) => t.endsWith("_feature_gate")),
  ];
  // Deletes only mutable synthetic policy/config rows, never audits/evidence.
  // A fresh reset's random epoch is replaced lawfully by INSERT (not a disabled
  // trigger or overwritten observed expectation). Its trigger stays enabled.
  for (const table of normalized) input += `delete from ${table};`;
  const ordered = [
    ...normalized,
    "public.platform_roles",
    "private.pilot_account_admission",
    "private.pilot_admission_managers",
    "private.pilot_manager_audit",
    "private.pilot_management_audit",
    "private.pilot_management_requests",
    "private.people_preferences",
    "private.people_blocks",
    "public.hangouts",
    "public.hangout_participants",
    "public.hangout_private_locations",
    "private.hangout_peer_provenance",
    "private.hangout_create_requests",
    "private.hangout_cohosts",
    "private.hangout_conversations",
    "private.hangout_messages",
    "private.hangout_message_requests",
    "private.friendships",
    "private.friendship_create_requests",
    "private.dm_pairs",
    "private.dm_messages",
    "private.dm_retries",
    "private.safety_reports",
    "private.safety_report_requests",
    "private.account_sanctions",
    "private.hangout_disables",
    "private.moderation_cases",
    "private.moderation_requests",
    "private.moderation_audit",
    "private.notification_preferences",
    "private.notification_items",
    "private.attendance_answers",
  ];
  for (const table of ordered)
    for (const row of plan[table])
      input +=
        table === "private.pilot_manager_audit"
          ? insert(table, row).replace(",0,", ",pg_backend_pid(),")
          : insert(table, row);
  input += "select pg_backend_pid();commit;";
  const pid = Number(priorSQL(input));
  assert.ok(
    Number.isSafeInteger(pid) && pid > 0,
    "independent setup-session executor receipt",
  );
  return retainedPlan(pid);
}
function assertRetained(expected, actual) {
  assertExact(censusTables.slice().sort(), Object.keys(expected).sort(), [
    "retained",
    "tables",
  ]);
  for (const table of censusTables) {
    if (table === "storage.objects") {
      assert.equal(actual[table].length, expected[table].length);
      for (const domain of expected[table]) {
        const row = actual[table].find((r) => r.id === domain.id);
        assert.ok(row);
        for (const [key, value] of Object.entries(domain))
          assertExact(value, row[key], [
            table,
            String(expected[table].indexOf(domain)),
            key,
          ]);
      }
    } else {
      const order = (rows) =>
        [...rows].sort((a, b) =>
          JSON.stringify(a, Object.keys(a).sort()).localeCompare(
            JSON.stringify(b, Object.keys(b).sort()),
          ),
        );
      assertExact(order(expected[table]), order(actual[table]), [table]);
    }
  }
}
function atomicUpgrade(frozen) {
  const receipt = `insert into supabase_migrations.schema_migrations(version,name,statements) values('20260928000100','pilot_current_safety',array[${quote(frozen.full)}]);`;
  return `begin;${frozen.streamed}\n${receipt}\ncommit;`;
}
function failureReceipt(error, baseline, lane) {
  const original = originalSuiteError(error);
  const match =
    /^Disposable SQL error: (42501|40P01|40001): (Safety report unavailable|Safety operation unavailable|operation failed)$/.exec(
      original.message ?? "",
    );
  const record = {
    error: original,
    reset_forbidden: true,
    cleanupIncomplete: original.cleanupIncomplete === true,
    successful_wait_order_credit: false,
    ...(match ? { diagnostic: { code: match[1], message: match[2] } } : {}),
  };
  // Evidence observation precedes any cleanup, even for apply failure. It does
  // not authorize reset or prove settlement of the failed transaction.
  try {
    const current = snapshot(lane);
    record.before = baseline ? sanitized(baseline) : undefined;
    record.after = sanitized(current);
    record.differences = baseline
      ? differences(baseline, current)
      : original.differences;
  } catch (observationError) {
    record.census_failure = observationError;
    record.differences = original.differences;
  }
  return emit("original-failure-before-cleanup", record);
}
async function upgradeFixtures() {
  requireUpgradeReview(); // Unconditional before even disk reads or guards.
  const records = [];
  let baseline = null,
    lane = "prior26-upgrade",
    first = null,
    succeeded = false;
  try {
    const frozen = sourceFreeze();
    fixedPriorReset();
    records.push(
      emit("prior-reset-complete", { successful_wait_order_credit: false }),
    );
    const priorHistory = history(priorSQL);
    exactVersions(priorHistory, priorVersions);
    const expected = retainedSetup();
    baseline = snapshot(lane);
    assertRetained(expected, baseline);
    const before = catalog(priorSQL);
    assertPriorCatalog(before, frozen);
    records.push(
      emit("prior-baseline-qualified", {
        before: sanitized(baseline),
        full54_values_verified: true,
      }),
    );
    // Failure of synchronous apply is conservatively reset-forbidden. No client
    // exit or error text alone establishes rollback/server settlement.
    try {
      priorSQL(atomicUpgrade(frozen));
    } catch (error) {
      error.cleanupIncomplete = true;
      error.reset_forbidden = true;
      throw error;
    }
    localTarget("current27");
    lane = "current27";
    const finalHistory = history(sql);
    exactVersions(finalHistory, expectedMigrationVersions);
    assertExact(priorHistory, finalHistory.slice(0, 26), [
      "history",
      "complete_prior26",
    ]);
    assertExact(
      {
        version: "20260928000100",
        name: "pilot_current_safety",
        statements: [frozen.full],
      },
      finalHistory[26],
      ["history", "receipt27"],
    );
    const after = snapshot(lane);
    assertExact(baseline, after, []);
    assertRetained(expected, after);
    compareCatalog(before, catalog(sql), frozen);
    records.push(
      emit("only27-preservation-verified", {
        before: sanitized(baseline),
        after: sanitized(after),
        full54_values_verified: true,
      }),
    );
    succeeded = true;
  } catch (error) {
    first = originalSuiteError(error);
    records.push(failureReceipt(first, baseline, lane));
    records.push(
      emit("cleanup-refused", {
        reset_forbidden: true,
        cleanupIncomplete: true,
        error: first,
      }),
    );
    // No arbitrary rollback/reset/recovery on failure. Fresh independent target
    // settlement/ownership review and coordinator direction remain mandatory.
  }
  if (succeeded) {
    try {
      resetDisposable("current27");
      assertClean();
      records.push(
        emit("full27-clean", {
          cleanupIncomplete: false,
          reset_forbidden: false,
        }),
      );
    } catch (error) {
      const cleanup = originalSuiteError(error);
      first ??= cleanup;
      records.push(
        emit("cleanup-failed", {
          error: cleanup,
          reset_forbidden: true,
          cleanupIncomplete: true,
        }),
      );
    }
  }
  if (first) {
    first.cleanupIncomplete = true;
    first.upgradeRecords = records;
    const safe = neutralSuiteError(first);
    safe.evidence.upgrade_records = records;
    throw safe;
  }
  return records;
}
export async function runUpgradeFixtures() {
  try {
    return await upgradeFixtures();
  } catch (error) {
    throw neutralSuiteError(error);
  }
}

// Explicit pure/mocked examples only. Production transport has no injection
// switch. Examples never call upgradeFixtures, a guard or a command.
export async function runUpgradeExamples() {
  let checks = 0;
  const ok = (fn) => {
    fn();
    checks++;
  };
  ok(() =>
    assert.deepEqual(resetArgs, [
      "db",
      "reset",
      "--local",
      "--network-id",
      "pals-local-network",
      "--version",
      "20260927000600",
    ]),
  );
  ok(() =>
    assert.equal(supabaseBinary, "/private/tmp/pals-runtime/bin/supabase"),
  );
  ok(() => assert.equal(resetOptions.timeout, 180_000));
  ok(() => assert.equal(resetOptions.maxBuffer, 20 * 1024 * 1024));
  ok(() => assert.equal(resetOptions.cwd, root));
  ok(() => assert.equal(acceptedResetExit({ status: 0, signal: null }), true));
  for (const r of [
    { status: 1 },
    { status: null },
    { status: undefined },
    { status: 0, signal: "SIGKILL" },
    { status: 0, error: new Error("private") },
    { status: 0, code: "ENOBUFS" },
    { status: 0.5 },
    { status: -1 },
  ])
    ok(() => assert.equal(acceptedResetExit(r), false));
  const frozen = sourceFreeze();
  ok(() => assert.equal(Object.keys(frozen.bodies).length, 4));
  ok(() => assert.equal(priorVersions.length, 26));
  ok(() => assert.equal(expectedMigrationVersions.length, 27));
  ok(() => assert.equal(censusTables.length, 54));
  ok(() =>
    assert.equal(frozen.streamed.includes("begin;\n\n-- A separate"), false),
  );
  ok(() => assert.equal(atomicUpgrade(frozen).endsWith("commit;"), true));
  ok(() =>
    assert.ok(atomicUpgrade(frozen).includes(`array[${quote(frozen.full)}]`)),
  );
  ok(() =>
    assert.equal(
      canonicalSQL("-- comment\nbegin;select 'private  text';commit;"),
      canonicalSQL("begin;\nselect 'private  text';\ncommit;"),
    ),
  );
  ok(() =>
    assert.notEqual(
      canonicalSQL("select 'private  text';"),
      canonicalSQL("select 'private text';"),
    ),
  );
  ok(() =>
    assert.throws(() =>
      migrationBody(frozen.full + " ", migrationFiles[sourceName]),
    ),
  );
  for (const changed of [
    frozen.full.replace("begin;", "BEGIN;"),
    frozen.full.replace("\ncommit;\n", "\nCOMMIT;\n"),
  ])
    ok(() => assert.throws(() => migrationBody(changed, digest(changed))));
  const oldHistory = Object.keys(frozen.sources)
    .slice(0, 26)
    .map((name) => ({
      version: name.slice(0, 14),
      name: name.slice(15, -4),
      statements: [frozen.sources[name]],
    }));
  ok(() => exactVersions(oldHistory, priorVersions));
  ok(() =>
    assert.throws(() => exactVersions(oldHistory, expectedMigrationVersions)),
  );
  ok(() =>
    assert.throws(() =>
      exactVersions([...oldHistory, { version: "unknown" }], priorVersions),
    ),
  );
  ok(() =>
    assert.throws(() =>
      exactVersions(
        oldHistory.map((r, i) => (i ? r : { ...r, name: "unknown" })),
        priorVersions,
      ),
    ),
  );
  ok(() =>
    assert.throws(() =>
      exactVersions(
        oldHistory.map((r, i) => (i ? r : { ...r, statements: ["select 1"] })),
        priorVersions,
      ),
    ),
  );
  ok(() =>
    assert.equal(
      insert("private.dm_retries", { fingerprint: "fixed-hash" }),
      "insert into private.dm_retries(fingerprint) values('fixed-hash');",
    ),
  );
  ok(() =>
    assert.equal(
      insert("private.moderation_requests", {
        fingerprint: "account:fixed-hash",
      }),
      "insert into private.moderation_requests(fingerprint) values('account:fixed-hash');",
    ),
  );
  ok(() =>
    assert.ok(
      insert("private.pilot_management_requests", {
        fingerprint: ["policy", "availability", true, 2, "reason"],
      }).includes("::jsonb"),
    ),
  );
  const plan = retainedPlan(123);
  ok(() => assertRetained(plan, structuredClone(plan)));
  for (const table of censusTables) {
    const changed = structuredClone(plan);
    if (changed[table].length) {
      const key = Object.keys(changed[table][0])[0];
      changed[table][0][key] = "private mismatch";
    } else changed[table].push({ private_unknown: "private mismatch" });
    ok(() => assert.throws(() => assertRetained(plan, changed)));
  }
  const privateMarker = "credential narrative provider-key";
  const error = new Error(privateMarker);
  error.actual = { email: privateMarker };
  const raw = {
    error,
    differences: differences(plan, {
      ...plan,
      "auth.users": [
        { id: uid(1), raw_user_meta_data: { email: privateMarker } },
      ],
    }),
    result: { [privateMarker]: privateMarker },
    catalog: { body: privateMarker },
  };
  const projected = emit("original-failure-before-cleanup", raw);
  ok(() => assert.ok(!JSON.stringify(projected).includes(privateMarker)));
  ok(() =>
    assert.ok(
      !JSON.stringify(
        emit("prior-baseline-qualified", { before: sanitized(plan) }),
      ).includes("Retained private"),
    ),
  );
  ok(() => assert.throws(() => emit(privateMarker, {})));
  const neutral = neutralSuiteError(error);
  ok(() => assert.equal(originalSuiteError(neutral), error));
  ok(() => assert.ok(!JSON.stringify(neutral).includes(privateMarker)));
  ok(() => assert.ok(!neutral.stack.includes(privateMarker)));
  const cleanup = new Error("private cleanup");
  const events = [];
  const first = error;
  events.push(emit("original-failure-before-cleanup", { error: first }));
  events.push(
    emit("cleanup-refused", { error: cleanup, reset_forbidden: true }),
  );
  ok(() => assert.equal(first, error));
  ok(() =>
    assert.deepEqual(
      events.map((r) => r.upgrade_phase),
      ["original-failure-before-cleanup", "cleanup-refused"],
    ),
  );
  ok(() => assert.equal(events[1].reset_forbidden, true));
  ok(() => assert.ok(!JSON.stringify(events).includes(privateMarker)));
  ok(() => assert.ok(outgoingValue(privateMarker).sha256));
  ok(() => assert.throws(requireUpgradeReview));
  await assert.rejects(
    runUpgradeFixtures(),
    (e) => e.message === "B3c fixture failed; projected evidence only",
  );
  checks++;
  // Complete inherited function/overload mocks exercise the actual comparator.
  // Raw PostgreSQL records are mocked, never claimed as fresh observations.
  const before = {
    tables: [],
    policies: [],
    policy_views: [],
    constraints: [],
    indexes: [],
    triggers: [],
    sequences: [],
    types: [],
    schemas: [],
    default_acl: [],
    functions: frozen.oldFunctions.map((f, i) => {
      const { definition, ...r } = f;
      void definition;
      return {
        ...r,
        public_execute: false,
        raw: { oid: i + 1, prosrc: f.body },
        oid: i + 1,
      };
    }),
  };
  const extra = additions.map((name, i) => {
    const lock = name.endsWith("pilot_lock_current_safety");
    const identity_args = lock
      ? "p_operation text, p_target_id uuid"
      : "p_operation text, p_target_id uuid, p_bindings jsonb";
    return {
      name,
      identity_args,
      arguments_with_defaults: identity_args,
      result: lock
        ? "TABLE(actor_id uuid, peer_or_host_id uuid, campus_id uuid, source_id uuid, locked_subject_bindings jsonb)"
        : "void",
      body: frozen.bodies[name],
      owner: "postgres",
      language: "plpgsql",
      volatility: "v",
      security_definer: true,
      config: ['search_path=""'],
      acl: ["postgres=X/postgres"],
      public_execute: false,
      anon_execute: false,
      authenticated_execute: false,
      service_execute: false,
      raw: {
        oid: 145 + i,
        prosrc: frozen.bodies[name],
        prokind: "f",
        proleakproof: false,
        proparallel: "u",
        proisstrict: false,
        pronargdefaults: 0,
        procost: 100,
        prosupport: "-",
        proretset: lock,
        pronargs: lock ? 2 : 3,
      },
    };
  });
  const after = structuredClone(before);
  for (const f of after.functions)
    if (replacements.includes(f.name)) {
      f.body = frozen.bodies[f.name];
      f.raw.prosrc = f.body;
    }
  after.functions.push(...extra);
  ok(() => compareCatalog(before, after, frozen));
  for (const key of Object.keys(before).filter((k) => k !== "functions")) {
    const changed = structuredClone(after);
    changed[key].push({ private_unknown: privateMarker });
    ok(() => assert.throws(() => compareCatalog(before, changed, frozen)));
  }
  for (const name of [
    replacements[0],
    "public.set_people_block",
    "private.safety_peer_evidence",
  ]) {
    for (const key of [
      "body",
      "acl",
      "oid",
      "identity_args",
      "arguments_with_defaults",
      "owner",
      "config",
      "volatility",
      "security_definer",
    ]) {
      const changed = structuredClone(after);
      changed.functions.find((f) => f.name === name)[key] = privateMarker;
      ok(() => assert.throws(() => compareCatalog(before, changed, frozen)));
    }
  }
  for (const key of [
    "public_execute",
    "anon_execute",
    "authenticated_execute",
    "service_execute",
  ]) {
    const changed = structuredClone(after);
    changed.functions.find((f) => f.name === additions[0])[key] = true;
    ok(() => assert.throws(() => compareCatalog(before, changed, frozen)));
  }
  for (const mutation of ["removed", "extra", "overload"]) {
    const changed = structuredClone(after);
    if (mutation === "removed") changed.functions.shift();
    else
      changed.functions.push({
        ...changed.functions[0],
        identity_args:
          mutation === "overload"
            ? "p_extra text"
            : changed.functions[0].identity_args,
      });
    ok(() => assert.throws(() => compareCatalog(before, changed, frozen)));
  }
  return {
    checks,
    target_contact_attempts: 0,
    classification: "static examples only; all runtime unexecuted",
  };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  test(
    "B3c true26 only27 preservation (unconditionally refused before contact)",
    { timeout: 900_000 },
    runUpgradeFixtures,
  );
