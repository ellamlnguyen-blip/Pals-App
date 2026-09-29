// Static authoring only. Import is inert; the exported public suite refuses first.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  quote,
  sql,
  localTarget,
  session,
  until,
  migrationFiles,
  expectedMigrationVersions,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  census,
  censusQuery,
  censusTables,
  capabilityKeys,
  caseIds,
  campus,
  email,
  photoPath,
  auth,
  peerProofsQuery,
} from "./helpers/pilot-current-safety-fixtures.mjs";
import {
  assertCaseSetup,
  exactSnapshot,
  differences,
  projectOutgoingEvidence,
  projectFailureEvidence,
  outgoingValue,
  originalSuiteError,
  neutralSuiteError,
} from "./pilot-admission-current-safety-concurrency.integration.mjs";

export const edgeManifest = Object.freeze([
  Object.freeze({ id: "L1E.CH.exact_lower_edge", route: "CH", older: false }),
  Object.freeze({
    id: "L1E.CH.one_microsecond_older",
    route: "CH",
    older: true,
  }),
  Object.freeze({ id: "L1E.CP.exact_lower_edge", route: "CP", older: false }),
  Object.freeze({
    id: "L1E.CP.one_microsecond_older",
    route: "CP",
    older: true,
  }),
]);
export const edgePhases = Object.freeze([
  "edge-original-anchors",
  "edge-backend-binding",
  "edge-setup",
  "edge-positive-guard",
  "edge-guard-rollback",
  "edge-instrumentation",
  "edge-seed",
  "edge-public-predicate",
  "edge-case-rollback",
  "edge-precleanup-failure",
  "edge-owner-close",
  "edge-backend-settlement",
  "edge-restoration",
  "edge-restoration-failure",
  "edge-refusal",
]);
const suiteLabel = "B3c-instrumented-rate-edge";
const qualification = "instrumented-actual-public-predicate-only";
const sourceURL = new URL(
  "../migrations/20260928000100_pilot_current_safety.sql",
  import.meta.url,
);
const catalogURL = new URL(
  "../../agents/handoffs/TASK-021A1b3b-CATALOG.json",
  import.meta.url,
);
const clockExpression = "saved_at:=clock_timestamp();";
const reportName = "public.submit_safety_report";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ownedApplication = "b3c_exact_rate_edge_owner";
const digest = (value) => createHash("sha256").update(value).digest("hex");

// The shared projector runs once over original private input. Only these literal
// source-owned labels are then supplied separately; no private field bypasses it.
function edgeEnvelope(projected, caseID, phase) {
  return {
    suite: suiteLabel,
    qualification,
    case_id: edgeManifest.some((cell) => cell.id === caseID)
      ? caseID
      : outgoingValue(caseID),
    phase: edgePhases.includes(phase) ? phase : outgoingValue(phase),
    allocation_credit: 0,
    evidence: projected,
  };
}
export function projectEdgeEvidence(raw, caseID, phase) {
  return edgeEnvelope(projectOutgoingEvidence(raw), caseID, phase);
}
const edgeErrorContexts = new WeakMap();
function neutralEdgeError(error, context) {
  const original = originalSuiteError(error);
  edgeErrorContexts.set(original, { ...context });
  const safe = neutralSuiteError(original);
  safe.evidence = projectEdgeEvidence(
    {
      cleanupIncomplete: original.cleanupIncomplete === true,
      reset_forbidden: original.reset_forbidden === true,
      original_error_preserved: true,
      successful_wait_order_credit: false,
    },
    context.caseID,
    context.phase,
  );
  return safe;
}
function publish(raw, context) {
  console.log(
    JSON.stringify(projectEdgeEvidence(raw, context.caseID, context.phase)),
  );
}
export function microsecondAnchor(value) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+00:00$/);
  const millis = Date.parse(value.slice(0, 23) + "Z");
  assert.ok(Number.isFinite(millis));
  assert.equal(new Date(millis).toISOString().slice(0, 23), value.slice(0, 23));
  return BigInt(millis) * 1000n + BigInt(value.slice(23, 26));
}
function stamp(micros) {
  const seconds = micros / 1000000n;
  const fraction = micros % 1000000n;
  assert.ok(fraction >= 0n && seconds >= 0n);
  return (
    new Date(Number(seconds) * 1000).toISOString().slice(0, 19) +
    "." +
    fraction.toString().padStart(6, "0") +
    "+00:00"
  );
}
export function rateAnchors(T, older) {
  assert.equal(typeof older, "boolean");
  const micros = microsecondAnchor(T);
  return Object.freeze({
    T,
    recent: [10n, 20n, 30n, 40n].map((minutes) =>
      stamp(micros - minutes * 60000000n),
    ),
    boundary: stamp(micros - 3600000000n - (older ? 1n : 0n)),
  });
}
function frozenSource() {
  const source = readFileSync(sourceURL, "utf8");
  assert.equal(
    digest(source),
    migrationFiles["20260928000100_pilot_current_safety.sql"],
  );
  const names = [
    "private.pilot_require_current_safety",
    "private.pilot_lock_current_safety",
    "public.set_safety_block",
    reportName,
  ];
  return Object.fromEntries(
    names.map((name) => {
      const start = source.indexOf("function " + name + "(");
      assert.ok(start >= 0);
      const bodyStart = source.indexOf("as $$", start) + 5;
      const bodyEnd = source.indexOf("$$;", bodyStart);
      assert.ok(bodyStart > start && bodyEnd > bodyStart);
      return [name, source.slice(bodyStart, bodyEnd)];
    }),
  );
}
export function instrumentDefinition(definition, observedBody, frozenBody, T) {
  microsecondAnchor(T);
  assert.equal(observedBody, frozenBody, "exact frozen27 body required");
  assert.equal(
    frozenBody.split(clockExpression).length,
    2,
    "one clock expression required",
  );
  assert.equal(definition.split(clockExpression).length, 2);
  assert.ok(
    definition.startsWith(
      "CREATE OR REPLACE FUNCTION public.submit_safety_report(",
    ),
  );
  assert.ok(definition.includes("AS $function$" + frozenBody + "$function$"));
  const replacement = `saved_at:=${quote(T)}::timestamp with time zone;`;
  const changed = definition.replace(clockExpression, replacement);
  assert.equal(changed.replace(replacement, clockExpression), definition);
  return {
    definition: changed,
    body: frozenBody.replace(clockExpression, replacement),
  };
}

// Every catalogue original remains private. OID is captured in addition to the
// authoritative historical function fields. Full surrounding anchors are raw
// pg_catalog records, not name/count-only or body hashes.
const functionQuery = `select coalesce(jsonb_agg(jsonb_build_object(
 'oid',p.oid,'name',n.nspname||'.'||p.proname,
 'identity_args',pg_get_function_identity_arguments(p.oid),
 'arguments_with_defaults',pg_get_function_arguments(p.oid),
 'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),
 'acl',p.proacl,'config',p.proconfig,'volatility',p.provolatile,
 'security_definer',p.prosecdef,'body',p.prosrc,'definition',pg_get_functiondef(p.oid),
 'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
 'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE'))
 order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)), '[]')
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.prokind='f'`;
const catalogQuery = `select jsonb_build_object('functions',(${functionQuery}),
 'function_records',(select coalesce(jsonb_agg(to_jsonb(p) order by p.oid),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f'),
 'schemas',(select coalesce(jsonb_agg(to_jsonb(n) order by n.oid),'[]') from pg_namespace n where n.nspname in('public','private','auth','storage')),
 'types',(select coalesce(jsonb_agg(to_jsonb(t) order by t.oid),'[]') from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname in('public','private')),
 'classes',(select coalesce(jsonb_agg(to_jsonb(c) order by c.oid),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private')),
 'columns',(select coalesce(jsonb_agg(to_jsonb(a) order by a.attrelid,a.attnum),'[]') from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and a.attnum>0),
 'defaults',(select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('definition',pg_get_expr(d.adbin,d.adrelid)) order by d.oid),'[]') from pg_attrdef d join pg_class c on c.oid=d.adrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private')),
 'constraints',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('definition',pg_get_constraintdef(c.oid)) order by c.oid),'[]') from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in('public','private')),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by p.oid),'[]') from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private','storage')),
 'triggers',(select coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object('definition',pg_get_triggerdef(t.oid)) order by t.oid),'[]') from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private','storage','auth')),
 'indexes',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('definition',pg_get_indexdef(i.indexrelid)) order by i.indexrelid),'[]') from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private')),
 'default_acl',(select coalesce(jsonb_agg(to_jsonb(d) order by d.oid),'[]') from pg_default_acl d),
 'history',(select jsonb_agg(to_jsonb(m) order by version) from supabase_migrations.schema_migrations m))`;
function catalogue() {
  return JSON.parse(sql(catalogQuery));
}
function validateCatalog(anchor, bodies) {
  assert.equal(anchor.functions.length, 146);
  assert.deepEqual(
    anchor.history.map((row) => row.version),
    expectedMigrationVersions,
  );
  const inheritedText = readFileSync(catalogURL, "utf8");
  assert.equal(
    digest(inheritedText),
    "8e1404a086c9046501d9cd2ee379e8cce7396b6292770a70af03790b340f2efa",
  );
  const inherited = JSON.parse(inheritedText);
  assert.equal(inherited.length, 144);
  for (const prior of inherited) {
    const matches = anchor.functions.filter(
      (row) =>
        row.name === prior.name && row.identity_args === prior.identity_args,
    );
    assert.equal(matches.length, 1, "exact inherited overload");
    const { oid, ...actual } = matches[0];
    assert.ok(Number.isSafeInteger(oid) && oid > 0);
    if (Object.hasOwn(bodies, prior.name)) {
      assert.equal(
        actual.definition,
        prior.definition.replace(prior.body, bodies[prior.name]),
        "frozen complete public definition with original canonical header",
      );
      actual.body = prior.body;
      actual.definition = prior.definition;
    }
    assert.deepEqual(
      actual,
      prior,
      "142 unchanged inherited functions and replacement ABI",
    );
  }
  for (const [name, body] of Object.entries(bodies)) {
    const rows = anchor.functions.filter((row) => row.name === name);
    assert.equal(rows.length, 1, "frozen public/private overload set");
    const row = rows[0];
    assert.equal(row.body, body);
    assert.equal(row.owner, "postgres");
    assert.equal(row.volatility, "v");
    assert.equal(row.security_definer, true);
    assert.deepEqual(row.config, ['search_path=""']);
    assert.equal(row.anon_execute, false);
    assert.equal(row.service_execute, false);
    assert.equal(row.authenticated_execute, name.startsWith("public."));
    if (name.startsWith("private.")) {
      assert.deepEqual(row.acl, ["postgres=X/postgres"]);
      if (name === "private.pilot_lock_current_safety") {
        assert.equal(row.identity_args, "p_operation text, p_target_id uuid");
        assert.equal(
          row.arguments_with_defaults,
          "p_operation text, p_target_id uuid",
        );
        assert.equal(
          row.result,
          "TABLE(actor_id uuid, peer_or_host_id uuid, campus_id uuid, source_id uuid, locked_subject_bindings jsonb)",
        );
      } else {
        assert.equal(
          row.identity_args,
          "p_operation text, p_target_id uuid, p_bindings jsonb",
        );
        assert.equal(
          row.arguments_with_defaults,
          "p_operation text, p_target_id uuid, p_bindings jsonb",
        );
        assert.equal(row.result, "void");
      }
    }
  }
  const newNames = anchor.functions
    .filter(
      (row) =>
        !inherited.some(
          (prior) =>
            prior.name === row.name &&
            prior.identity_args === row.identity_args,
        ),
    )
    .map((row) => row.name)
    .sort();
  assert.deepEqual(newNames, [
    "private.pilot_lock_current_safety",
    "private.pilot_require_current_safety",
  ]);
}
function makeRoute(cell) {
  assert.ok(edgeManifest.includes(cell));
  const ids = caseIds(cell.id);
  return {
    ...ids,
    id: cell.route,
    mode: cell.route === "CH" ? "hangout" : "user",
    target: cell.route === "CH" ? ids.source : ids.peer,
    provenance: cell.route === "CH" ? "current_hangout" : "current_people",
  };
}
function setupSQL(route, preference) {
  const ready = [route.actor, route.host, route.peer];
  return `insert into auth.users(id,email,email_confirmed_at) values ${[...ready, route.manager].map((id) => `(${quote(id)},${quote(email(id))},now())`).join(",")};
 insert into storage.objects(bucket_id,name,owner_id) values ${ready.map((id) => `('profile-photos',${quote(photoPath(id))},${quote(id)})`).join(",")};
 update public.profiles set real_name='Current safety fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path=user_id::text||'/11111111.png' where user_id in (${ready.map(quote).join(",")});
 insert into private.pilot_account_admission(account_id,state,revision) values ${ready.map((id) => `(${quote(id)},'active',1)`).join(",")};
 select private.set_pilot_manager_fixture(${quote(route.manager)},'active',0,'B3c synthetic manager',${quote(route.managerRequest)});
 insert into public.universities(id,name,slug,allowed_email_domains,active) values(${quote(route.otherCampus)},'Other synthetic campus',${quote("b3c-" + route.otherCampus)},array['unc.edu'],true);
 update private.pilot_availability set enabled=true;
 update private.pilot_capabilities set enabled=key in('hangouts','people');
 update private.hangout_feature_gate set enabled=true;
 update private.people_feature_gate set enabled=true;
 update private.safety_feature_gate set enabled=true;
 insert into private.people_preferences(account_id,opted_in) values(${quote(route.peer)},true);
 ${preference === false ? `insert into private.people_preferences(account_id,opted_in) values(${quote(route.actor)},false);` : ""}
 ${
   route.id === "CH"
     ? `insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude) values(${quote(route.source)},${quote(route.host)},${quote(campus)},'Undisclosed fixture',now()+interval '1 day','Approximate',35.91,-79.05);
 insert into public.hangout_participants(hangout_id,account_id,state) values(${quote(route.source)},${quote(route.host)},'joined');
 insert into public.hangout_private_locations(hangout_id,instructions) values(${quote(route.source)},'Undisclosed synthetic instructions');`
     : ""
 }
 set constraints all immediate;`;
}
function reportSQL(route, request = route.request) {
  return `select * from public.submit_safety_report(${quote(request)},${quote(route.mode)},${quote(route.target)},'harassment',null)`;
}
function fingerprint(route) {
  // Independent exact JSONB scalar-array representation: text, UUID, text, null.
  return createHash("md5")
    .update(
      `[${JSON.stringify(route.mode)}, ${JSON.stringify(route.target)}, "harassment", null]`,
    )
    .digest("hex");
}
function fixedUUID(cellID, slot) {
  const h = digest(`TASK-021A1b3c-rate-edge:${cellID}:${slot}`);
  return (
    h.slice(0, 8) +
    "-" +
    h.slice(8, 12) +
    "-4" +
    h.slice(13, 16) +
    "-8" +
    h.slice(17, 20) +
    "-" +
    h.slice(20, 32)
  );
}
export function expectedReportRows(route, reportID, requestID, time) {
  assert.match(reportID, uuid);
  assert.match(requestID, uuid);
  return {
    report: {
      id: reportID,
      submitted_at: time,
      reporter_id: route.actor,
      target_type: route.mode,
      target_id: route.target,
      category: "harassment",
      narrative: null,
      provenance_kind: route.provenance,
      provenance_ref_id: route.target,
    },
    ledger: {
      reporter_id: route.actor,
      request_id: requestID,
      input_fingerprint: fingerprint(route),
      report_id: reportID,
    },
  };
}
function seedRows(cell, route, anchors) {
  return [...anchors.recent, anchors.boundary].map((time, index) =>
    expectedReportRows(
      route,
      fixedUUID(cell.id, `seed-report-${index}`),
      fixedUUID(cell.id, `seed-request-${index}`),
      time,
    ),
  );
}
function seedSQL(rows) {
  return rows
    .map(
      ({
        report: r,
        ledger: l,
      }) => `insert into private.safety_reports(id,submitted_at,reporter_id,target_type,target_id,category,narrative,provenance_kind,provenance_ref_id)
 values(${quote(r.id)},${quote(r.submitted_at)}::timestamptz,${quote(r.reporter_id)},${quote(r.target_type)},${quote(r.target_id)},'harassment',null,${quote(r.provenance_kind)},${quote(r.provenance_ref_id)});
 insert into private.safety_report_requests(reporter_id,request_id,input_fingerprint,report_id)
 values(${quote(l.reporter_id)},${quote(l.request_id)},${quote(l.input_fingerprint)},${quote(l.report_id)});`,
    )
    .join("\n");
}
function verifyFull(before, after, additions = []) {
  for (const snapshot of [before, after])
    assert.deepEqual(Object.keys(snapshot).sort(), censusTables.slice().sort());
  const replacements = {};
  for (const [table, key] of [
    ["private.safety_reports", "report"],
    ["private.safety_report_requests", "ledger"],
  ])
    replacements[table] = [
      ...before[table],
      ...additions.map((row) => row[key]),
    ];
  const expected = exactSnapshot(before, after, replacements);
  try {
    assert.deepEqual(after, expected);
  } catch (error) {
    error.preciseDifferences = differences(expected, after);
    throw error;
  }
}
function verifyReceipt(route, before, after, result, expectedTime = null) {
  assert.equal(result.length, 1);
  const receipt = result[0];
  assert.deepEqual(Object.keys(receipt).sort(), ["receipt_id", "submitted_at"]);
  assert.match(receipt.receipt_id, uuid);
  if (expectedTime !== null) {
    assert.equal(receipt.submitted_at, jsonTimestamp(expectedTime));
    assert.equal(
      microsecondAnchor(canonicalTimestamp(receipt.submitted_at)),
      microsecondAnchor(expectedTime),
    );
  } else assert.ok(Number.isFinite(Date.parse(receipt.submitted_at)));
  verifyFull(before, after, [
    expectedReportRows(
      route,
      receipt.receipt_id,
      route.request,
      expectedTime === null
        ? receipt.submitted_at
        : jsonTimestamp(expectedTime),
    ),
  ]);
}
function canonicalTimestamp(value) {
  assert.match(
    value,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?\+00:00$/,
  );
  const [base, zone] = value.split("+");
  const [seconds, fraction = ""] = base.split(".");
  return seconds + "." + fraction.padEnd(6, "0") + "+" + zone;
}
function allCurrentProofsSQL(route) {
  const peerRoute = {
    ...route,
    peer: route.id === "CH" ? route.host : route.peer,
  };
  return `select jsonb_build_object('proofs',(${peerProofsQuery(peerRoute)}),
 'source',${route.id === "CH" ? `(select jsonb_build_object('host_id',h.host_id,'status',h.status,'joined',exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=h.host_id and p.state='joined'),'actor_participates',exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=${quote(route.actor)})) from public.hangouts h where h.id=${quote(route.source)})` : "null"})`;
}
function assertProofs(route, observed) {
  assert.deepEqual(observed.proofs, {
    owned_block: false,
    friendship: false,
    request: false,
    dm_generation: false,
    hangout_host: false,
    immutable_overlap: false,
    positive_interval: false,
  });
  if (route.id === "CH")
    assert.deepEqual(observed.source, {
      host_id: route.host,
      status: "published",
      joined: true,
      actor_participates: false,
    });
  else assert.equal(observed.source, null);
}
const wallQuery = `select to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'+00:00'`;
const wrappedSnapshot = `select ${censusQuery.slice(7)}`;
function reader(owned) {
  let sequence = 0;
  return async function exchange(query) {
    const prefix = `EDGE_${++sequence}:`;
    owned.send(
      `select ${quote(prefix)}||coalesce(to_jsonb(edge_q)::text,'null') from (${query}) edge_q;`,
    );
    await until(() =>
      owned
        .output()
        .split("\n")
        .some((line) => line.startsWith(prefix)),
    );
    const lines = owned
      .output()
      .split("\n")
      .filter((line) => line.startsWith(prefix));
    assert.equal(lines.length, 1);
    return JSON.parse(lines[0].slice(prefix.length));
  };
}
// Wrapping any query result as an array permits exact result row count checking.
function valueQuery(query) {
  return `select coalesce(jsonb_agg(to_jsonb(q)),'[]') value from (${query}) q`;
}
async function snapshot(exchange) {
  const result = await exchange(wrappedSnapshot);
  assert.equal(Object.keys(result).length, 1);
  return Object.values(result)[0];
}
async function ownerCatalog(exchange) {
  const result = await exchange(catalogQuery);
  return Object.values(result)[0];
}
export function certifyDone(done) {
  assert.deepEqual(
    done,
    [0, null],
    "only exact clean own client completion accepted",
  );
  return true;
}
export function restorationFailure(first, error) {
  const original = first ?? error;
  forbidReset(original);
  original.edgeRestorationErrors ??= [];
  original.edgeRestorationErrors.push(error);
  return original;
}
function forbidReset(error) {
  error.cleanupIncomplete = true;
  error.reset_forbidden = true;
  return error;
}
async function closeOwner(owned, original) {
  let closeError = null;
  try {
    await owned.close();
    certifyDone(await owned.done);
  } catch (error) {
    closeError = error;
  }
  if (closeError) {
    const first = original ?? closeError;
    forbidReset(first);
    first.edgeRestorationErrors ??= [];
    first.edgeRestorationErrors.push(closeError);
    throw first;
  }
}
function backendSettlement(binding) {
  assert.ok(Number.isSafeInteger(binding.pid) && binding.pid > 0);
  assert.ok(
    typeof binding.backend_start === "string" &&
      Number.isFinite(Date.parse(binding.backend_start)),
  );
  assert.equal(binding.application_name, ownedApplication);
  const found = JSON.parse(
    sql(
      `select coalesce(jsonb_agg(jsonb_build_object('pid',pid,'backend_start',backend_start,'application_name',application_name)),'[]') from pg_stat_activity where pid=${binding.pid} or application_name=${quote(ownedApplication)}`,
    ),
  );
  assert.deepEqual(
    found,
    [],
    "fresh guarded observer requires backend/application disappearance",
  );
}
function restoration(original54, originalCatalog) {
  const restored = catalogue();
  assert.deepEqual(
    restored,
    originalCatalog,
    "byte exact full catalogue/body/OID/ABI/ACL/history restoration",
  );
  verifyFull(original54, census());
}
function captureOriginal(
  error,
  context,
  observed = null,
  observationError = null,
) {
  // Projection consumes original values once. Output failure cannot replace the
  // first private assertion/transport error or skip the finally rollback.
  try {
    const projected = projectFailureEvidence(
      error,
      {
        id: context.caseID,
        phase: context.phase,
        publicResult: context.publicResult ?? null,
        holderSnapshot: context.holderSnapshot ?? null,
        setupQualification: context.setupQualification ?? null,
      },
      observed,
      observationError,
    );
    console.log(
      JSON.stringify(edgeEnvelope(projected, context.caseID, context.phase)),
    );
  } catch (outputError) {
    error.edgeOutputErrors ??= [];
    error.edgeOutputErrors.push(outputError);
    forbidReset(error);
  }
}
export function requireReviewedEdgeTransport() {
  throw neutralSuiteError(
    new Error(
      "Rate edge fixture unavailable pending FULL instrumentation/privacy review, runner adoption and explicit exclusive release",
    ),
  );
}
function assertPristine54(snapshot) {
  assert.deepEqual(Object.keys(snapshot).sort(), censusTables.slice().sort());
  for (const [table, rows] of Object.entries(snapshot)) {
    if (table === "public.universities") {
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, campus);
      assert.equal(rows[0].slug, "unc-chapel-hill");
      assert.equal(rows[0].active, true);
      assert.deepEqual(rows[0].allowed_email_domains, [
        "live.unc.edu",
        "unc.edu",
        "ad.unc.edu",
        "business.unc.edu",
        "kenan-flagler.unc.edu",
      ]);
    } else if (table.endsWith("_feature_gate")) {
      assert.deepEqual(rows, [{ singleton: true, enabled: false }]);
    } else if (table === "private.pilot_availability") {
      assert.equal(rows.length, 1);
      assert.equal(rows[0].singleton, true);
      assert.equal(rows[0].enabled, false);
      assert.equal(rows[0].revision, 1);
    } else if (table === "private.pilot_capabilities") {
      assert.deepEqual(
        rows.map((row) => row.key).sort(),
        capabilityKeys.slice().sort(),
      );
      for (const row of rows) {
        assert.equal(row.enabled, false);
        assert.equal(row.revision, 1);
      }
    } else assert.deepEqual(rows, []);
  }
}
async function runEdgeInner() {
  requireReviewedEdgeTransport(); // Unconditional first statement: no target contact.
  localTarget("current27");
  let owned = null,
    exchange = null,
    binding = null,
    original = null;
  let initial54 = null,
    initialCatalog = null;
  const context = { caseID: null, phase: "edge-original-anchors" };
  try {
    initial54 = census();
    assertPristine54(initial54);
    initialCatalog = catalogue();
    const bodies = frozenSource();
    validateCatalog(initialCatalog, bodies);
    const report = initialCatalog.functions.find(
      (row) => row.name === reportName,
    );
    owned = session(ownedApplication);
    exchange = reader(owned);
    owned.send(
      "begin;set local timezone='UTC';set local client_min_messages='notice';set local statement_timeout='12s';set local lock_timeout='10s';set local idle_in_transaction_session_timeout='15s';",
    );
    context.phase = "edge-backend-binding";
    binding = await exchange(
      "select pg_backend_pid() pid,backend_start,application_name from pg_stat_activity where pid=pg_backend_pid()",
    );
    assert.equal(binding.application_name, ownedApplication);
    assert.deepEqual(await ownerCatalog(exchange), initialCatalog);
    verifyFull(initial54, await snapshot(exchange));
    // now() defaults belong to the owned transaction's earlier timestamp.
    // Independent setup windows include that lower bound and the actual end,
    // rather than incorrectly requiring all defaults to follow clock capture.
    const transactionStart = Object.values(
      await exchange(
        `select to_char(transaction_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'+00:00'`,
      ),
    )[0];
    microsecondAnchor(transactionStart);
    const observedT = await exchange(wallQuery);
    const T = Object.values(observedT)[0];
    const changed = instrumentDefinition(
      report.definition,
      report.body,
      bodies[reportName],
      T,
    );
    for (const cell of edgeManifest) {
      context.caseID = cell.id;
      context.phase = "edge-setup";
      const route = makeRoute(cell);
      const preference = cell.older ? false : "absent";
      owned.send("savepoint edge_case;");
      const start = transactionStart;
      owned.send(setupSQL(route, preference));
      const end = Object.values(await exchange(wallQuery))[0];
      const before = await snapshot(exchange);
      context.publicResult = null;
      context.holderSnapshot = before;
      context.setupQualification = assertCaseSetup(
        initial54,
        before,
        route,
        { start, end },
        preference,
      );
      assertProofs(
        route,
        Object.values(await exchange(allCurrentProofsSQL(route)))[0],
      );
      context.phase = "edge-positive-guard";
      // This case's actual authenticated call precedes its temporary DDL.
      assert.deepEqual(await ownerCatalog(exchange), initialCatalog);
      owned.send(`savepoint edge_guard;${auth(route.actor)}`);
      const guarded = await exchange(valueQuery(reportSQL(route)));
      owned.send("reset role;");
      verifyReceipt(route, before, await snapshot(exchange), guarded.value);
      context.phase = "edge-guard-rollback";
      owned.send("rollback to edge_guard;release edge_guard;reset role;");
      verifyFull(before, await snapshot(exchange));
      context.phase = "edge-instrumentation";
      owned.send(changed.definition + ";");
      const altered = await ownerCatalog(exchange);
      const expected = structuredClone(initialCatalog);
      const expectedReport = expected.functions.find(
        (row) => row.name === reportName,
      );
      expectedReport.definition = changed.definition;
      expectedReport.body = changed.body;
      const record = expected.function_records.find(
        (row) => row.oid === report.oid,
      );
      assert.ok(record, "complete exact public function catalogue record");
      record.prosrc = changed.body;
      assert.deepEqual(
        altered,
        expected,
        "sole clock expression difference; all OID/ACL/attributes retained",
      );
      context.phase = "edge-seed";
      const anchors = rateAnchors(T, cell.older);
      const seeds = seedRows(cell, route, anchors);
      owned.send(seedSQL(seeds));
      const seeded = await snapshot(exchange);
      context.holderSnapshot = seeded;
      // JSONB timestamps omit trailing zeroes. Canonicalize only independently
      // prescribed timestamp bindings, never observed field values as expected.
      const normalizedSeeds = seeds.map(({ report: r, ledger }) => ({
        report: { ...r, submitted_at: jsonTimestamp(r.submitted_at) },
        ledger,
      }));
      verifyFull(before, seeded, normalizedSeeds);
      assertProofs(
        route,
        Object.values(await exchange(allCurrentProofsSQL(route)))[0],
      );
      context.phase = "edge-public-predicate";
      owned.send(auth(route.actor));
      let result;
      if (cell.older)
        result = (await exchange(valueQuery(reportSQL(route)))).value;
      else {
        // The real caller's denial is caught and asserted inside this backend.
        // A neutral NOTICE carries the actual caught SQLSTATE/message; no extra
        // table, function, ACL or persistent diagnostic state is introduced.
        const prefix = `EDGE_DENIAL_${edgeManifest.indexOf(cell)}:`;
        owned.send(`do $edge$ begin
  perform * from public.submit_safety_report(${quote(route.request)},${quote(route.mode)},${quote(route.target)},'harassment',null);
  raise exception 'Expected denial absent';
 exception when sqlstate '42501' then
  if SQLERRM<>'Safety report unavailable' then raise; end if;
  raise notice '%', ${quote(prefix)}||jsonb_build_object('code',SQLSTATE,'message',SQLERRM)::text;
 end $edge$;reset role;`);
        assert.deepEqual(await exchange("select true denial_complete"), {
          denial_complete: true,
        });
        const notices = owned
          .output()
          .split("\n")
          .filter((line) => line.includes(prefix));
        assert.equal(notices.length, 1);
        assert.match(notices[0], /^NOTICE:\s+(?:00000:\s+)?EDGE_DENIAL_[02]:/);
        result = JSON.parse(
          notices[0].slice(notices[0].indexOf(prefix) + prefix.length),
        );
      }
      owned.send("reset role;");
      const after = await snapshot(exchange);
      context.publicResult = result;
      if (cell.older) verifyReceipt(route, seeded, after, result, T);
      else {
        assert.deepEqual(result, {
          code: "42501",
          message: "Safety report unavailable",
        });
        verifyFull(seeded, after);
      }
      publish(
        {
          full54_values_verified: true,
          committed_census: seeded,
          holder_snapshot: after,
          public_result: result,
        },
        context,
      );
      context.phase = "edge-case-rollback";
      owned.send("rollback to edge_case;release edge_case;reset role;");
      verifyFull(initial54, await snapshot(exchange));
      assert.deepEqual(await ownerCatalog(exchange), initialCatalog);
    }
  } catch (error) {
    original = originalSuiteError(error);
    original.sqlDiagnostics = [
      ...(owned?.output() ?? "").matchAll(
        /ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/g,
      ),
    ].map((row) => ({ code: row[1], message: row[2].trim() }));
    const failedContext = { ...context };
    let observed = null,
      observationError = null;
    if (exchange)
      try {
        owned.send("reset role;");
        observed = await snapshot(exchange);
      } catch (failure) {
        observationError = originalSuiteError(failure);
      }
    captureOriginal(original, failedContext, observed, observationError);
    context.phase = "edge-precleanup-failure";
  } finally {
    context.phase = "edge-owner-close";
    let closeCertified = false;
    if (owned) {
      try {
        await closeOwner(owned, original);
        closeCertified = true;
      } catch (error) {
        original = original ?? originalSuiteError(error);
        captureOriginal(original, context);
        publish(
          {
            original_error_preserved: true,
            cleanup_diagnostics: original.edgeRestorationErrors ?? [],
            reset_forbidden: true,
            cleanupIncomplete: true,
          },
          context,
        );
      }
    }
    if (owned && closeCertified && binding) {
      try {
        context.phase = "edge-backend-settlement";
        backendSettlement(binding);
        context.phase = "edge-restoration";
        restoration(initial54, initialCatalog);
        publish(
          { full54_values_verified: true, reset_forbidden: true },
          context,
        );
      } catch (error) {
        const restorationError = originalSuiteError(error);
        original = restorationFailure(original, restorationError);
        context.phase = "edge-restoration-failure";
        publish(
          {
            original_error: original,
            cleanup_error: restorationError,
            reset_forbidden: true,
          },
          context,
        );
      }
    } else if (owned) {
      original ??= new Error("Owned backend settlement unavailable");
      forbidReset(original);
    }
    if (original) throw neutralEdgeError(original, context);
  }
}
function jsonTimestamp(value) {
  return value
    .replace(/\.000000(?=\+)/, "")
    .replace(/(\.\d*?[1-9])0+(?=\+)/, "$1");
}
export async function runRateEdgeFixtures() {
  try {
    return await runEdgeInner();
  } catch (error) {
    const original = originalSuiteError(error);
    throw neutralEdgeError(
      original,
      edgeErrorContexts.get(original) ?? {
        caseID: null,
        phase: "edge-refusal",
      },
    );
  }
}

// Dormant pure examples only. No tests register and no target function is called.
export async function runRateEdgeExamples() {
  let checks = 0;
  const check = (fn) => {
    fn();
    checks++;
  };
  const bodies = frozenSource();
  const body = bodies[reportName];
  const definition =
    "CREATE OR REPLACE FUNCTION public.submit_safety_report(p_request_id uuid)\nAS $function$" +
    body +
    "$function$\n";
  const T = "2026-09-29T13:14:15.123456+00:00";
  const changed = instrumentDefinition(definition, body, body, T);
  check(() =>
    assert.equal(
      changed.definition.replace(
        `saved_at:=${quote(T)}::timestamp with time zone;`,
        clockExpression,
      ),
      definition,
    ),
  );
  for (const [observed, frozen, def] of [
    [body + " ", body, definition],
    [body, body + clockExpression, definition],
    [body, body, definition + clockExpression],
    [
      body.replace(clockExpression, ""),
      body.replace(clockExpression, ""),
      definition,
    ],
  ])
    check(() =>
      assert.throws(() => instrumentDefinition(def, observed, frozen, T)),
    );
  for (const value of [
    "2026-09-29T13:14:15.123+00:00",
    "2026-02-31T13:14:15.123456+00:00",
    "x",
    T + "'",
  ])
    check(() => assert.throws(() => microsecondAnchor(value)));
  check(() =>
    assert.equal(
      microsecondAnchor(rateAnchors(T, false).boundary) -
        microsecondAnchor(rateAnchors(T, true).boundary),
      1n,
    ),
  );
  check(() =>
    assert.equal(
      microsecondAnchor(T) - microsecondAnchor(rateAnchors(T, false).boundary),
      3600000000n,
    ),
  );
  check(() =>
    assert.deepEqual(
      edgeManifest.map((cell) => cell.id),
      [
        "L1E.CH.exact_lower_edge",
        "L1E.CH.one_microsecond_older",
        "L1E.CP.exact_lower_edge",
        "L1E.CP.one_microsecond_older",
      ],
    ),
  );
  for (const cell of edgeManifest) {
    const route = makeRoute(cell);
    const rows = seedRows(cell, route, rateAnchors(T, cell.older));
    check(() =>
      assert.equal(new Set(rows.map((row) => row.report.id)).size, 5),
    );
    check(() =>
      assert.equal(new Set(rows.map((row) => row.ledger.request_id)).size, 5),
    );
    check(() =>
      assert.deepEqual(
        Object.keys(rows[0].report).sort(),
        [
          "id",
          "submitted_at",
          "reporter_id",
          "target_type",
          "target_id",
          "category",
          "narrative",
          "provenance_kind",
          "provenance_ref_id",
        ].sort(),
      ),
    );
    check(() =>
      assert.deepEqual(
        Object.keys(rows[0].ledger).sort(),
        ["reporter_id", "request_id", "input_fingerprint", "report_id"].sort(),
      ),
    );
    const blank = Object.fromEntries(censusTables.map((table) => [table, []]));
    const after = structuredClone(blank);
    after["private.safety_reports"] = rows.map((row) => row.report);
    after["private.safety_report_requests"] = rows.map((row) => row.ledger);
    check(() => verifyFull(blank, after, rows));
    check(() => verifyFull(after, structuredClone(after)));
    const mutation = structuredClone(after);
    mutation["private.safety_reports"][0].narrative = "secret";
    check(() => assert.throws(() => verifyFull(after, mutation)));
    const next = expectedReportRows(
      route,
      fixedUUID(cell.id, "result"),
      route.request,
      T,
    );
    const success = structuredClone(after);
    success["private.safety_reports"].push(next.report);
    success["private.safety_report_requests"].push(next.ledger);
    check(() =>
      verifyReceipt(
        route,
        after,
        success,
        [{ receipt_id: next.report.id, submitted_at: T }],
        T,
      ),
    );
    check(() =>
      assert.throws(() =>
        verifyReceipt(
          route,
          after,
          success,
          [
            {
              receipt_id: next.report.id,
              submitted_at: rateAnchors(T, true).boundary,
            },
          ],
          T,
        ),
      ),
    );
    for (const phase of edgePhases)
      check(() => {
        const out = projectEdgeEvidence(
          {
            privateKey: "secret",
            public_result: {
              code: "42501",
              message: "Safety report unavailable",
            },
          },
          cell.id,
          phase,
        );
        assert.equal(out.case_id, cell.id);
        assert.equal(out.phase, phase);
        assert.equal(out.allocation_credit, 0);
        assert.deepEqual(out.evidence.public_result, {
          code: "42501",
          message: "Safety report unavailable",
        });
        assert.doesNotMatch(JSON.stringify(out), /secret|privateKey/);
      });
  }
  check(() => {
    const out = projectEdgeEvidence(
      { narrative: "Safety report unavailable" },
      "L1E.CH.exact_lower_edge.x",
      "edge-setup.x",
    );
    assert.equal(typeof out.case_id, "object");
    assert.equal(typeof out.phase, "object");
    assert.doesNotMatch(
      JSON.stringify(out),
      /edge-setup.x|exact_lower_edge.x|Safety report unavailable/,
    );
  });
  for (const done of [
    [null, null],
    [0, "SIGTERM"],
    [1, null],
    ["0", null],
    [0, null, "extra"],
  ])
    check(() => assert.throws(() => certifyDone(done)));
  check(() => assert.equal(certifyDone([0, null]), true));
  for (const done of [
    [null, null],
    [0, "SIGTERM"],
    [1, null],
    ["0", null],
  ]) {
    const first = new Error("private first error");
    try {
      await closeOwner(
        { close: async () => {}, done: Promise.resolve(done) },
        first,
      );
    } catch (error) {
      check(() => {
        assert.equal(error, first);
        assert.equal(error.reset_forbidden, true);
        assert.equal(error.cleanupIncomplete, true);
      });
    }
  }

  const original = new Error("private original assertion");
  try {
    await closeOwner(
      {
        close: async () => {
          throw new Error("private restoration");
        },
      },
      original,
    );
  } catch (error) {
    check(() => {
      assert.equal(error, original);
      assert.equal(error.reset_forbidden, true);
      assert.equal(error.cleanupIncomplete, true);
    });
  }
  check(() => {
    const neutral = neutralSuiteError(original);
    assert.equal(originalSuiteError(neutral), original);
    assert.doesNotMatch(
      JSON.stringify(neutral) + neutral.stack,
      /private original|private restoration/,
    );
  });
  const private54 = Object.fromEntries(
    censusTables.map((table) => [table, []]),
  );
  private54["auth.users"] = [
    {
      id: "12345678-1234-4234-8234-123456789abc",
      email: "private-email@unc.edu",
      raw_user_meta_data: { "private-provider-key": "private-metadata" },
    },
  ];
  private54["public.hangouts"] = [
    { title: "private-title", description: "private-description" },
  ];
  private54["private.safety_reports"] = [
    { narrative: "Safety report unavailable" },
  ];
  check(() => {
    const projected = projectEdgeEvidence(
      {
        committed_census: private54,
        holder_snapshot: private54,
        public_result: [
          {
            receipt_id: "12345678-1234-4234-8234-123456789abc",
            submitted_at: T,
          },
        ],
        error: Object.assign(new Error("private-error"), {
          cause: new Error("private-cause"),
          actual: private54,
        }),
      },
      edgeManifest[0].id,
      "edge-precleanup-failure",
    );
    assert.equal(Object.keys(projected.evidence.committed_census).length, 54);
    assert.equal(projected.evidence.committed_census["auth.users"].count, 1);
    assert.doesNotMatch(
      JSON.stringify(projected),
      /private-email|private-provider-key|private-metadata|private-title|private-description|Safety report unavailable|private-error|private-cause|12345678-1234-4234-8234-123456789abc/,
    );
  });
  check(() => {
    const first = new Error("private-original-error");
    const later = new Error("private-restoration-error");
    assert.equal(restorationFailure(first, later), first);
    assert.deepEqual(first.edgeRestorationErrors, [later]);
    assert.equal(first.reset_forbidden, true);
    const safe = neutralEdgeError(first, {
      caseID: edgeManifest[0].id,
      phase: "edge-restoration-failure",
    });
    assert.equal(originalSuiteError(safe), first);
    assert.equal(safe.evidence.case_id, edgeManifest[0].id);
    assert.equal(safe.evidence.phase, "edge-restoration-failure");
    assert.doesNotMatch(
      safe.stack + JSON.stringify(safe),
      /private-original-error|private-restoration-error/,
    );
  });
  check(() => assert.throws(requireReviewedEdgeTransport));
  return { checks, target_contacts: 0, status: "pure-static-examples-only" };
}
