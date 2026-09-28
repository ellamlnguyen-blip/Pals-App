// Static authoring only. Imports are inert; no tests are registered.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  quote,
  sql,
  localTarget,
  assertClean,
  resetDisposable,
  session,
  until,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  routes,
  prepare,
  caseIds,
  auth,
  query,
  denialFor,
  assertCurrentOnly,
  peerProofsQuery,
  census,
  censusQuery,
  censusTables,
  campus,
  sanitized,
} from "./helpers/pilot-current-safety-fixtures.mjs";
// Reuse reviewed setup/outcome/diagnostic/cleanup exports only. Never dispatch
// the policy suite. Retained deltas below are independent of current helpers.
import {
  assertCaseSetup,
  verifiedOutcome,
  exactSnapshot,
  differences,
  dynamicTime,
  exactDiagnostic,
  finishOwnedSessions,
  guardedFinalCleanup,
  bounds,
} from "./pilot-admission-current-safety-concurrency.integration.mjs";

export const retainedManifest = Object.freeze([
  Object.freeze({
    id: "RF.CH.current_late_proof.availability",
    route: "CH",
    family: "current_late_proof",
    wait: "availability",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CP.current_late_proof.availability",
    route: "CP",
    family: "current_late_proof",
    wait: "availability",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CB.current_late_proof.availability",
    route: "CB",
    family: "current_late_proof",
    wait: "availability",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CH.retained_proof_loss.safety_gate",
    route: "CH",
    family: "retained_proof_loss",
    wait: "safety_gate",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CH.retained_proof_loss.actor_account",
    route: "CH",
    family: "retained_proof_loss",
    wait: "actor_account",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CP.retained_proof_loss.safety_gate",
    route: "CP",
    family: "retained_proof_loss",
    wait: "safety_gate",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CP.retained_proof_loss.actor_account",
    route: "CP",
    family: "retained_proof_loss",
    wait: "actor_account",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CB.retained_proof_loss.safety_gate",
    route: "CB",
    family: "retained_proof_loss",
    wait: "safety_gate",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CB.retained_proof_loss.actor_account",
    route: "CB",
    family: "retained_proof_loss",
    wait: "actor_account",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CH.retained_unchanged.safety_gate",
    route: "CH",
    family: "retained_unchanged",
    wait: "safety_gate",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CH.retained_unchanged.actor_account",
    route: "CH",
    family: "retained_unchanged",
    wait: "actor_account",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CP.retained_unchanged.safety_gate",
    route: "CP",
    family: "retained_unchanged",
    wait: "safety_gate",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CP.retained_unchanged.actor_account",
    route: "CP",
    family: "retained_unchanged",
    wait: "actor_account",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CB.retained_unchanged.safety_gate",
    route: "CB",
    family: "retained_unchanged",
    wait: "safety_gate",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CB.retained_unchanged.actor_account",
    route: "CB",
    family: "retained_unchanged",
    wait: "actor_account",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CP.retained_reselect.safety_gate",
    route: "CP",
    family: "retained_reselect",
    wait: "safety_gate",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CP.retained_reselect.actor_account",
    route: "CP",
    family: "retained_reselect",
    wait: "actor_account",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CB.retained_reselect.safety_gate",
    route: "CB",
    family: "retained_reselect",
    wait: "safety_gate",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "RF.CB.retained_reselect.actor_account",
    route: "CB",
    family: "retained_reselect",
    wait: "actor_account",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.CH.current.repeatable_read",
    route: "CH",
    family: "CH.current",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.CH.current.serializable",
    route: "CH",
    family: "CH.current",
    isolation: "serializable",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.CP.current.repeatable_read",
    route: "CP",
    family: "CP.current",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.CP.current.serializable",
    route: "CP",
    family: "CP.current",
    isolation: "serializable",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.CB.current.repeatable_read",
    route: "CB",
    family: "CB.current",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.CB.current.serializable",
    route: "CB",
    family: "CB.current",
    isolation: "serializable",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.REPLAY.exact.repeatable_read",
    route: "CP",
    family: "REPLAY.exact",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.REPLAY.exact.serializable",
    route: "CP",
    family: "REPLAY.exact",
    isolation: "serializable",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.RU.retained_user.repeatable_read",
    route: "CP",
    family: "RU.retained_user",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.RU.retained_user.serializable",
    route: "CP",
    family: "RU.retained_user",
    isolation: "serializable",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.RH.retained_hangout.repeatable_read",
    route: "CH",
    family: "RH.retained_hangout",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.RH.retained_hangout.serializable",
    route: "CH",
    family: "RH.retained_hangout",
    isolation: "serializable",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.RHOST.retained_host.repeatable_read",
    route: "CH",
    family: "RHOST.retained_host",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.RHOST.retained_host.serializable",
    route: "CH",
    family: "RHOST.retained_host",
    isolation: "serializable",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.BLOCK.retained_true.repeatable_read",
    route: "CB",
    family: "BLOCK.retained_true",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.BLOCK.retained_true.serializable",
    route: "CB",
    family: "BLOCK.retained_true",
    isolation: "serializable",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.UNBLOCK.outbound_false.repeatable_read",
    route: "CB",
    family: "UNBLOCK.outbound_false",
    isolation: "repeatable_read",
    status: "unexecuted",
  }),
  Object.freeze({
    id: "SI.UNBLOCK.outbound_false.serializable",
    route: "CB",
    family: "UNBLOCK.outbound_false",
    isolation: "serializable",
    status: "unexecuted",
  }),
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const joinedAt = "2026-01-01T00:00:00+00:00";
const leftAt = "2026-01-01T00:01:00+00:00";
const updatedAt = "2026-01-01T00:02:00+00:00";
const safeSQLStates = new Set(["42501", "40P01", "40001", "57014", "55P03"]);
const safeFields = new Set([
  ...censusTables.flatMap((t) => t.split(".")),
  ..."id account_id user_id actor_id reporter_id blocker_id blocked_id low_id high_id requester_id recipient_id target_id host_id hangout_id university_id campus_id source_id request_id report_id generation_id state status singleton enabled revision key name slug allowed_email_domains active created_at updated_at occurred_at submitted_at email email_confirmed_at deleted_at verified_at verification_email raw_user_meta_data raw_app_meta_data real_name graduation_year major bio primary_photo_path is_complete interests down_to_do favorite_music favorite_foods weird_fact prompts instagram additional_photo_paths executor_session_user executor_original_role executor_backend_pid previous_state new_state previous_revision new_revision reason title description starts_at ends_at joining_state visibility public_place public_latitude public_longitude campus_zone location_precision instructions joined_at left_at removed_at opted_in bucket_id owner_id owner metadata version path_tokens level last_accessed_at input_fingerprint category narrative provenance_kind provenance_ref_id length target_type".split(
    " ",
  ),
]);
export function safeFieldPath(path) {
  return String(path)
    .split(".")
    .map((part) => {
      if (part === "$" || /^\d+$/.test(part)) return part;
      const m = /^([a-z_]+)((?:\[\d+\])*)$/.exec(part);
      if (m && safeFields.has(m[1])) return part;
      return (
        "<field-sha256:" + createHash("sha256").update(part).digest("hex") + ">"
      );
    })
    .join(".");
}
const neutralMessages = new Set([
  "Safety report unavailable",
  "Safety operation unavailable",
]);
function extraId(cell, slot) {
  const h = createHash("sha256")
    .update(`TASK-021A1b3c-retained:${cell.id}:${slot}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function anchors(cell) {
  return Object.freeze({
    generation: extraId(cell, "friendship-generation"),
    requestGeneration: extraId(cell, "surviving-request-generation"),
    friendRequest: extraId(cell, "surviving-request-key"),
    laterRequest: extraId(cell, "fresh-later-report"),
  });
}
export function applicationNames(cell) {
  const digest = createHash("sha256")
    .update(cell.id)
    .digest("hex")
    .slice(0, 32);
  const names = {
    holder: `b3crf_${digest}_h`,
    waiter: `b3crf_${digest}_w`,
    serial: `b3crf_${digest}_s`,
  };
  for (const name of Object.values(names))
    assert.ok(Buffer.byteLength(name, "utf8") < 63);
  return names;
}
function marked(output, prefix) {
  const lines = output.split("\n").filter((v) => v.startsWith(prefix));
  assert.equal(lines.length, 1, `exact one ${prefix} marker`);
  return JSON.parse(lines[0].slice(prefix.length));
}
function compare(before, after, replacements = {}, result = "exact delta") {
  assert.equal(censusTables.length, 54);
  const expectedAfter = exactSnapshot(before, after, replacements);
  verifiedOutcome({
    before,
    after,
    expectedAfter,
    result,
    expectedResult: result,
  });
  return expectedAfter;
}
function fingerprint(route) {
  // PostgreSQL jsonb_build_array text for these fixed ASCII inputs preserves
  // comma-space separators. The input mode/UUID is never resolved-host identity.
  return createHash("md5")
    .update(
      `[${JSON.stringify(route.mode)}, ${JSON.stringify(route.target)}, "harassment", null]`,
    )
    .digest("hex");
}
function participant(route) {
  return {
    hangout_id: route.source,
    account_id: route.actor,
    state: "left",
    joined_at: joinedAt,
    left_at: leftAt,
    removed_at: null,
    updated_at: updatedAt,
  };
}
function friendship(route, a) {
  return {
    low_id: [route.actor, route.peer].sort()[0],
    high_id: [route.actor, route.peer].sort()[1],
    requester_id: route.actor,
    campus_id: campus,
    generation_id: a.generation,
    state: "accepted",
  };
}
function requestProof(route, a) {
  return {
    actor_id: route.actor,
    request_id: a.friendRequest,
    target_id: route.peer,
    generation_id: a.requestGeneration,
  };
}
function insertProofSQL(route, a, { request = false, outbound = false } = {}) {
  if (outbound)
    return `insert into private.people_blocks(blocker_id,blocked_id) values(${quote(route.actor)},${quote(route.peer)});`;
  if (route.id === "CH")
    return `insert into public.hangout_participants(hangout_id,account_id,state,joined_at,left_at,removed_at,updated_at) values(${quote(route.source)},${quote(route.actor)},'left',${quote(joinedAt)},${quote(leftAt)},null,${quote(updatedAt)});`;
  const f = friendship(route, a);
  return `insert into private.friendships(low_id,high_id,requester_id,campus_id,generation_id,state) values(${quote(f.low_id)},${quote(f.high_id)},${quote(f.requester_id)},${quote(campus)},${quote(a.generation)},'accepted');${request ? `insert into private.friendship_create_requests(actor_id,request_id,target_id,generation_id) values(${quote(route.actor)},${quote(a.friendRequest)},${quote(route.peer)},${quote(a.requestGeneration)});` : ""}`;
}
function proofReplacements(
  before,
  route,
  a,
  { request = false, outbound = false } = {},
) {
  if (outbound)
    return {
      "private.people_blocks": [
        ...before["private.people_blocks"],
        { blocker_id: route.actor, blocked_id: route.peer },
      ],
    };
  if (route.id === "CH")
    return {
      "public.hangout_participants": [
        ...before["public.hangout_participants"],
        participant(route),
      ],
    };
  return {
    "private.friendships": [
      ...before["private.friendships"],
      friendship(route, a),
    ],
    ...(request
      ? {
          "private.friendship_create_requests": [
            ...before["private.friendship_create_requests"],
            requestProof(route, a),
          ],
        }
      : {}),
  };
}
function deleteProofSQL(route) {
  return route.id === "CH"
    ? `delete from public.hangout_participants where hangout_id=${quote(route.source)} and account_id=${quote(route.actor)};`
    : `delete from private.friendships where low_id=least(${quote(route.actor)}::uuid,${quote(route.peer)}::uuid) and high_id=greatest(${quote(route.actor)}::uuid,${quote(route.peer)}::uuid);`;
}
function deletedProof(before, route) {
  return route.id === "CH"
    ? {
        "public.hangout_participants": before[
          "public.hangout_participants"
        ].filter(
          (r) =>
            !(r.hangout_id === route.source && r.account_id === route.actor),
        ),
      }
    : {
        "private.friendships": before["private.friendships"].filter(
          (r) =>
            !(
              r.low_id === [route.actor, route.peer].sort()[0] &&
              r.high_id === [route.actor, route.peer].sort()[1]
            ),
        ),
      };
}
function assertProof(
  route,
  a,
  { request = false, outbound = false, friendshipPresent = true } = {},
) {
  const current = census();
  if (route.id === "CH") {
    assert.deepEqual(
      current["public.hangout_participants"].filter(
        (r) => r.account_id === route.actor,
      ),
      [participant(route)],
    );
    assert.equal(
      current["public.hangout_participants"].filter(
        (r) =>
          r.account_id === route.host &&
          r.hangout_id === route.source &&
          r.state === "joined",
      ).length,
      1,
    );
    assert.deepEqual(current["private.attendance_answers"], []);
    assert.deepEqual(current["private.hangout_cohosts"], []);
    return;
  }
  assert.deepEqual(JSON.parse(sql(peerProofsQuery(route))), {
    owned_block: outbound,
    friendship: !outbound && friendshipPresent,
    request,
    dm_generation: false,
    hangout_host: false,
    immutable_overlap: false,
    positive_interval: false,
  });
  assert.equal(
    sql(
      `select private.safety_peer_evidence(${quote(route.actor)},${quote(route.peer)})`,
    ),
    "t",
  );
  if (!outbound) {
    assert.deepEqual(
      current["private.friendships"],
      friendshipPresent ? [friendship(route, a)] : [],
    );
    assert.deepEqual(
      current["private.friendship_create_requests"],
      request ? [requestProof(route, a)] : [],
    );
    const expected = {
      kind: friendshipPresent ? "friendship" : "friend_request",
      ref_id: friendshipPresent ? a.generation : a.requestGeneration,
    };
    assert.deepEqual(
      JSON.parse(
        sql(
          `select to_jsonb(s) from private.safety_report_peer_source(${quote(route.actor)},${quote(route.peer)}) s`,
        ),
      ),
      expected,
    );
  }
  assert.deepEqual(current["public.hangout_participants"], []);
}
function outcomeSpec(
  route,
  a,
  { current = false, request = false, unblock = false, replay = null } = {},
) {
  if (replay) return { replay };
  if (route.id === "CB") return { unblock };
  return {
    targetType: route.mode === "hangout_host" ? "user" : route.mode,
    targetId: route.mode === "hangout_host" ? route.host : route.target,
    provenance: current
      ? route.provenance
      : route.id === "CH"
        ? route.mode === "hangout_host"
          ? "retained_host"
          : "retained_hangout"
        : request
          ? "friend_request"
          : "friendship",
    ref: current
      ? route.target
      : route.id === "CH"
        ? route.source
        : request
          ? a.requestGeneration
          : a.generation,
  };
}
export function assertPublicDelta(
  route,
  before,
  after,
  result,
  spec,
  window,
  request = route.request,
) {
  if (spec.replay) {
    assert.deepEqual(result, spec.replay);
    return compare(before, after, {}, result);
  }
  if (route.id === "CB") {
    assert.equal(result, !spec.unblock);
    const blocks = spec.unblock
      ? before["private.people_blocks"].filter(
          (r) => !(r.blocker_id === route.actor && r.blocked_id === route.peer),
        )
      : [
          ...before["private.people_blocks"],
          { blocker_id: route.actor, blocked_id: route.peer },
        ];
    const replacements = { "private.people_blocks": blocks };
    // Every true route runs friendship teardown even when its feature is off.
    // Preserve standalone request evidence and every other table explicitly.
    if (!spec.unblock)
      Object.assign(replacements, deletedProof(before, { ...route, id: "CP" }));
    return compare(before, after, replacements, result);
  }
  assert.deepEqual(Object.keys(result).sort(), ["receipt_id", "submitted_at"]);
  assert.match(result.receipt_id, uuid);
  assert.equal(
    before["private.safety_reports"].some((r) => r.id === result.receipt_id),
    false,
  );
  dynamicTime(result.submitted_at, window);
  const report = {
    id: result.receipt_id,
    submitted_at: result.submitted_at,
    reporter_id: route.actor,
    target_type: spec.targetType,
    target_id: spec.targetId,
    category: "harassment",
    narrative: null,
    provenance_kind: spec.provenance,
    provenance_ref_id: spec.ref,
  };
  const ledger = {
    reporter_id: route.actor,
    request_id: request,
    input_fingerprint: fingerprint(route),
    report_id: result.receipt_id,
  };
  return compare(
    before,
    after,
    {
      "private.safety_reports": [...before["private.safety_reports"], report],
      "private.safety_report_requests": [
        ...before["private.safety_report_requests"],
        ledger,
      ],
    },
    result,
  );
}
function publicSQL(route, { request = route.request, unblock = false } = {}) {
  const q = query(route, {
    request,
    blocked: !unblock,
    category: " Harassment ",
    narrative: "   ",
  })
    .trim()
    .replace(/;$/, "");
  return `${auth(route.actor)}${route.id === "CB" ? `select 'RESULT:'||to_jsonb(v)::text from (${q}) q(v);` : `select 'RESULT:'||to_jsonb(q)::text from (${q}) q;`}reset role;select 'SNAPSHOT:'||(${censusQuery})::text;`;
}
async function serial(
  cell,
  route,
  {
    rollback = false,
    unblock = false,
    isolation = null,
    request = route.request,
    context,
  } = {},
) {
  let owned, original;
  const start = sql("select clock_timestamp()::text");
  try {
    owned = session(applicationNames(cell).serial);
    owned.send(
      `${bounds}begin${isolation ? ` isolation level ${isolation.replaceAll("_", " ")}` : " isolation level read committed"};${publicSQL(route, { request, unblock })}select 'COMPLETED';${rollback ? "rollback" : "commit"};`,
    );
    owned.child.stdin.end();
    const done = await owned.done;
    const diagnostics = exactDiagnostic(owned.output());
    if (context) context.diagnostics = diagnostics;
    if (isolation) {
      assert.notEqual(done[0], 0);
      assert.deepEqual(diagnostics, [
        { code: "42501", message: "Safety operation unavailable" },
      ]);
      assert.doesNotMatch(
        owned.output(),
        /RESULT:|SNAPSHOT:|COMPLETED|40P01|40001|57014|55P03/,
      );
      return {
        denial: { code: "42501", message: "Safety operation unavailable" },
      };
    }
    assert.equal(done[0], 0);
    assert.deepEqual(diagnostics, []);
    assert.match(owned.output(), /COMPLETED/);
    return {
      result: marked(owned.output(), "RESULT:"),
      snapshot: marked(owned.output(), "SNAPSHOT:"),
      window: { start, end: sql("select clock_timestamp()::text") },
    };
  } catch (error) {
    original = error;
    error.sqlDiagnostics = exactDiagnostic(owned?.output() ?? "");
    if (context) captureRetainedFailure(error, context);
    throw error;
  } finally {
    await finishOwnedSessions([owned], original);
  }
}
async function positiveControl(cell, route, spec, context, options = {}) {
  const before = census();
  const observed = await serial(cell, route, {
    ...options,
    rollback: true,
    context,
  });
  assertPublicDelta(
    route,
    before,
    observed.snapshot,
    observed.result,
    spec,
    observed.window,
    options.request ?? route.request,
  );
  compare(before, census(), {}, "rollback positive control");
  return observed.result;
}
function lowerLock(cell, route) {
  const table =
    cell.wait === "availability"
      ? "private.pilot_availability"
      : cell.wait === "safety_gate"
        ? "private.safety_feature_gate"
        : "public.accounts";
  const subject =
    cell.wait === "actor_account" ? route.actor : "singleton:true";
  const where =
    cell.wait === "actor_account" ? `id=${quote(route.actor)}` : "singleton";
  return {
    table,
    subject,
    where,
    sql: `select 'LOCKED_ROW:'||jsonb_build_object('relation',${quote(table)},'subject',${quote(subject)},'ctid',ctid::text)::text from ${table} where ${where} for update;`,
  };
}
function holderExpected(cell, route, a, before) {
  if (cell.family === "current_late_proof")
    return {
      ...proofReplacements(before, route, a),
      "private.pilot_availability": before["private.pilot_availability"].map(
        (r) => ({ ...r, enabled: false }),
      ),
    };
  if (
    cell.family === "retained_proof_loss" ||
    cell.family === "retained_reselect"
  )
    return deletedProof(before, route);
  return {};
}
async function lowerRace(cell, route, a, before, context) {
  let holder, waiter, original;
  const name = applicationNames(cell),
    lock = lowerLock(cell, route),
    start = sql("select clock_timestamp()::text");
  const denial =
    cell.family === "current_late_proof" ||
    cell.family === "retained_proof_loss";
  try {
    context.phase = "hold-actual-lower-row";
    holder = session(name.holder);
    waiter = session(name.waiter);
    holder.send(
      `${bounds}begin isolation level read committed;${lock.sql}select 'HELD';`,
    );
    await until(() => holder.output().includes("HELD"));
    assert.deepEqual(exactDiagnostic(holder.output()), []);
    const locked = marked(holder.output(), "LOCKED_ROW:");
    assert.equal(locked.relation, lock.table);
    assert.equal(locked.subject, lock.subject);
    assert.match(locked.ctid, /^\(\d+,\d+\)$/);
    context.phase = "start-authenticated-public-waiter";
    waiter.send(
      `${bounds}begin isolation level read committed;${publicSQL(route)}select 'COMPLETED';commit;`,
    );
    // Only this holder's exact row SELECT exists before observation. Match its
    // granted relation and exclusive XID to the waiter's ungranted SHARE XID.
    // Social/pilot advisory-only contention never earns lower wait credit.
    const probe = `select jsonb_build_object('relation',${quote(lock.table)},'subject',${quote(lock.subject)},'ctid',${quote(locked.ctid)},'holder_pid',h.pid,'waiter_pid',w.pid,'blocking_pids',pg_blocking_pids(w.pid),'ungranted_locks',(select jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,'relation',l.relation::regclass::text,'transactionid',l.transactionid)) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity h join pg_stat_activity w on w.application_name=${quote(name.waiter)} where h.application_name=${quote(name.holder)} and h.pid<>w.pid and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks hl where hl.pid=h.pid and hl.granted and hl.locktype='relation' and hl.mode='RowShareLock' and hl.relation=${quote(lock.table)}::regclass) and exists(select 1 from pg_locks wl join pg_locks hl on hl.transactionid=wl.transactionid and hl.locktype='transactionid' and hl.mode='ExclusiveLock' and hl.granted and hl.pid=h.pid where wl.pid=w.pid and not wl.granted and wl.locktype='transactionid' and wl.mode='ShareLock') and not exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted and l.locktype='advisory')`;
    context.phase = "observe-required-lower-share-wait";
    await until(() => {
      const raw = sql(probe);
      if (!raw) return false;
      context.observation = JSON.parse(raw);
      return true;
    });
    assert.ok(
      context.observation.blocking_pids.includes(
        context.observation.holder_pid,
      ),
    );
    context.phase = "post-observation-holder-change";
    const mutation =
      cell.family === "current_late_proof"
        ? `update private.pilot_availability set enabled=false where singleton;${insertProofSQL(route, a)}`
        : cell.family === "retained_unchanged"
          ? ""
          : deleteProofSQL(route);
    holder.send(
      `${mutation}select 'HOLDER_SNAPSHOT:'||(${censusQuery})::text;commit;`,
    );
    holder.child.stdin.end();
    waiter.child.stdin.end();
    const [h, w] = await Promise.all([holder.done, waiter.done]);
    context.diagnostics = [
      ...exactDiagnostic(holder.output()),
      ...exactDiagnostic(waiter.output()),
    ];
    assert.equal(h[0], 0);
    assert.deepEqual(exactDiagnostic(holder.output()), []);
    const held = marked(holder.output(), "HOLDER_SNAPSHOT:");
    context.holderSnapshot = held;
    compare(
      before,
      held,
      holderExpected(cell, route, a, before),
      "exact committed holder delta",
    );
    context.expectedSnapshot = held;
    context.phase = "original-public-outcome";
    if (denial) {
      assert.notEqual(w[0], 0);
      assert.deepEqual(exactDiagnostic(waiter.output()), [
        { code: "42501", message: denialFor(route) },
      ]);
      assert.doesNotMatch(
        waiter.output(),
        /RESULT:|SNAPSHOT:|COMPLETED|40P01|40001|57014|55P03/,
      );
      compare(held, census(), {}, "original denial adds zero full54 delta");
      context.publicResult = { code: "42501", message: denialFor(route) };
    } else {
      assert.equal(w[0], 0);
      assert.deepEqual(exactDiagnostic(waiter.output()), []);
      assert.match(waiter.output(), /COMPLETED/);
      const result = marked(waiter.output(), "RESULT:");
      context.publicResult = result;
      const after = census();
      assertPublicDelta(
        route,
        held,
        after,
        result,
        outcomeSpec(route, a, { request: cell.family === "retained_reselect" }),
        { start, end: sql("select clock_timestamp()::text") },
      );
      compare(
        after,
        marked(waiter.output(), "SNAPSHOT:"),
        {},
        "committed public snapshot",
      );
    }
    return held;
  } catch (error) {
    original = error;
    error.sqlDiagnostics = [
      ...exactDiagnostic(holder?.output() ?? ""),
      ...exactDiagnostic(waiter?.output() ?? ""),
    ];
    captureRetainedFailure(error, context); // before owned rollback/closure
    throw error;
  } finally {
    await finishOwnedSessions([holder, waiter], original);
  }
}
function publicSummary(value) {
  if (value === true || value === false || value?.code === "42501")
    return value;
  if (!value) return null;
  return {
    fields: Object.keys(value).sort(),
    receipt_sha256: createHash("sha256")
      .update(JSON.stringify(value))
      .digest("hex"),
  };
}
function redactedValue(value) {
  if (value === undefined) return "<absent>";
  if (value === null || typeof value === "boolean" || typeof value === "number")
    return value;
  return {
    sha256: createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  };
}
function projectRetainedDifferences(delta) {
  return delta.map((d) => ({
    field: safeFieldPath(d.field),
    expected: redactedValue(d.expected),
    actual: redactedValue(d.actual),
  }));
}
function projectRetainedDiagnostics(error, context) {
  // Synchronous guarded SQL has no session transcript. Accept only its exact
  // wrapper, never a substring or a raw arbitrary Error/AssertionError payload.
  const wrapped =
    typeof error.message === "string"
      ? /^Disposable SQL error: ([A-Z0-9]{5}): ([^\r\n]*)$/.exec(error.message)
      : null;
  const strictWrapper = wrapped && wrapped[0] === error.message;
  return [
    ...(context?.diagnostics ?? []),
    ...(error.sqlDiagnostics ?? []),
    ...(strictWrapper ? [{ code: wrapped[1], message: wrapped[2] }] : []),
  ].map((r) => ({
    code: safeSQLStates.has(r.code) ? r.code : "<withheld unexpected code>",
    message:
      safeSQLStates.has(r.code) && neutralMessages.has(r.message)
        ? r.message
        : "<withheld nonneutral diagnostic>",
  }));
}
// Committed pure examples: dormant on import/direct entry; no target function,
// suite, process, filesystem, census or cleanup dependency is invoked here.
export function verifyRetainedProjectionExamples() {
  const privateUUID = "deadcafe-1234-4567-89ab-0123456789ab";
  const privateKey = "provider-private-key";
  const differences = [
    {
      field: "$.private.safety_reports.0.narrative",
      expected: privateUUID,
      actual: privateUUID,
    },
    {
      field: "$.auth.users.0.raw_user_meta_data",
      expected: { identity: privateUUID },
      actual: privateUUID,
    },
    {
      field: "$.storage.objects.0.metadata." + privateKey,
      expected: privateUUID,
      actual: { [privateKey]: privateUUID },
    },
  ];
  const projection = JSON.stringify(projectRetainedDifferences(differences));
  assert.ok(!projection.includes(privateUUID));
  assert.ok(!projection.includes(privateKey));
  for (const row of projectRetainedDifferences(differences)) {
    assert.match(row.expected.sha256, /^[0-9a-f]{64}$/);
    assert.match(row.actual.sha256, /^[0-9a-f]{64}$/);
  }
  assert.deepEqual(
    projectRetainedDiagnostics({
      message: "Disposable SQL error: 42501: Safety report unavailable",
    }),
    [{ code: "42501", message: "Safety report unavailable" }],
  );
  assert.deepEqual(
    projectRetainedDiagnostics({
      message: "Disposable SQL error: 42501: Safety operation unavailable",
    }),
    [{ code: "42501", message: "Safety operation unavailable" }],
  );
  assert.deepEqual(
    projectRetainedDiagnostics({
      message: "Disposable SQL error: 40P01: operation failed",
    }),
    [{ code: "40P01", message: "<withheld nonneutral diagnostic>" }],
  );
  assert.deepEqual(
    projectRetainedDiagnostics({
      message: "Disposable SQL error: 42501: " + privateUUID,
    }),
    [{ code: "42501", message: "<withheld nonneutral diagnostic>" }],
  );
  const unexpected = projectRetainedDiagnostics({
    message: "Disposable SQL error: ABCDE: " + privateUUID,
    actual: [{ message: privateUUID }],
    expected: [{ [privateKey]: privateUUID }],
  });
  assert.deepEqual(unexpected, [
    {
      code: "<withheld unexpected code>",
      message: "<withheld nonneutral diagnostic>",
    },
  ]);
  const arbitrary = projectRetainedDiagnostics(
    {
      message: privateUUID,
      actual: [{ message: privateUUID }],
      expected: [{ [privateKey]: privateUUID }],
    },
    { diagnostics: [{ code: "ABCDE", message: privateUUID }] },
  );
  assert.ok(!JSON.stringify(arbitrary).includes(privateUUID));
  assert.ok(!JSON.stringify(arbitrary).includes(privateKey));
  const malformed = [
    "prefix Disposable SQL error: 42501: Safety report unavailable",
    "Disposable SQL error: 42501: Safety report unavailable\n",
    "Disposable SQL error: 42501: Safety report unavailable\nprivate payload",
    "Disposable SQL error: 42501:Safety report unavailable",
    "Disposable SQL error: abcde: Safety report unavailable",
    "Disposable SQL error: 4250: Safety report unavailable",
    "ERROR: 42501: Safety report unavailable",
  ];
  for (const message of malformed)
    assert.deepEqual(projectRetainedDiagnostics({ message }), []);
  return {
    uuid_private_projection_examples: 3,
    diagnostic_projection_examples: 6,
    malformed_wrappers_rejected: 7,
    target_attempts: 0,
  };
}
export function captureRetainedFailure(error, context) {
  if (error.failureRecorded) return;
  let snapshot = null,
    censusUnavailable = false;
  try {
    snapshot = census();
  } catch {
    censusUnavailable = true;
  }
  const expected =
    context?.expectedSnapshot ?? context?.holderSnapshot ?? context?.before;
  const delta =
    error.preciseDifferences ??
    (expected && snapshot ? differences(expected, snapshot) : []);
  const diagnostics = projectRetainedDiagnostics(error, context);
  console.error(
    JSON.stringify({
      id: context?.id ?? "<suite>",
      phase: context?.phase ?? "<unknown>",
      partition: "failed-uncredited",
      observed_wait_credit: 0,
      successful_wait_order_credit: false,
      lock_observation: context?.observation ?? null,
      diagnostics,
      setup_qualification: context?.setupQualification ?? null,
      available_public_result:
        context?.publicResult === true || context?.publicResult === false
          ? context.publicResult
          : context?.publicResult
            ? redactedValue(context.publicResult)
            : null,
      differences: projectRetainedDifferences(delta),
      full54_census_summary: snapshot ? sanitized(snapshot) : null,
      holder_summary: context?.holderSnapshot
        ? sanitized(context.holderSnapshot)
        : null,
      census_unavailable: censusUnavailable,
      error_kind: [
        "Error",
        "AssertionError",
        "TypeError",
        "RangeError",
      ].includes(error.name)
        ? error.name
        : "Error",
      cleanup_diagnostics: [],
      original_error_preserved: true,
    }),
  );
  error.failureRecorded = true;
  error.failedCellID = context?.id ?? "<suite>";
}
async function setupCell(cell, context) {
  const clean = census(),
    start = sql("select clock_timestamp()::text");
  context.before = clean;
  context.expectedSnapshot = clean;
  const actorPreference =
    cell.wait === "actor_account" || cell.isolation === "serializable"
      ? false
      : "absent";
  const route = prepare(
    routes.find((r) => r.id === cell.route),
    { caseKey: cell.id, actorPreference },
  );
  context.setupQualification = assertCaseSetup(
    clean,
    census(),
    route,
    { start, end: sql("select clock_timestamp()::text") },
    actorPreference,
  );
  context.phase = "route-only-purpose-setup";
  const sharedSetup = census(),
    irrelevantGate =
      route.id === "CH"
        ? "private.people_feature_gate"
        : "private.hangout_feature_gate";
  sql(
    `begin;update private.pilot_capabilities set enabled=key=${quote(route.purpose)};update ${irrelevantGate} set enabled=false where singleton;commit;`,
  );
  compare(
    sharedSetup,
    census(),
    {
      "private.pilot_capabilities": sharedSetup[
        "private.pilot_capabilities"
      ].map((r) => ({ ...r, enabled: r.key === route.purpose })),
      [irrelevantGate]: [{ singleton: true, enabled: false }],
    },
    "only actual purpose and source gate enabled",
  );
  const a = anchors(cell);
  assert.equal(
    new Set([...Object.values(caseIds(cell.id)), ...Object.values(a)]).size,
    12,
  );
  context.phase = "committed-retained-proof-setup";
  const baseline = census();
  const retained =
    cell.family.startsWith("retained_") ||
    [
      "RU.retained_user",
      "RH.retained_hangout",
      "RHOST.retained_host",
      "BLOCK.retained_true",
    ].includes(cell.family);
  const outbound = cell.family === "UNBLOCK.outbound_false";
  const request = cell.family === "retained_reselect";
  if (retained || outbound) {
    sql(`begin;${insertProofSQL(route, a, { request, outbound })}commit;`);
    compare(
      baseline,
      census(),
      proofReplacements(baseline, route, a, { request, outbound }),
      "independent committed proof setup",
    );
    assertProof(route, a, { request, outbound });
  } else assertCurrentOnly(route);
  if (cell.family === "RHOST.retained_host") route.mode = "hangout_host";
  let spec = outcomeSpec(route, a, {
    current: !retained && !outbound,
    unblock: outbound,
  });
  if (cell.family === "REPLAY.exact") {
    const before = census(),
      original = await serial(cell, route, { context });
    assertPublicDelta(
      route,
      before,
      census(),
      original.result,
      spec,
      original.window,
    );
    compare(census(), original.snapshot, {}, "original committed replay setup");
    spec = outcomeSpec(route, a, { replay: original.result });
  }
  context.before = census();
  context.expectedSnapshot = context.before;
  return { route, a, spec };
}
async function runCell(cell, context) {
  const { route, a, spec } = await setupCell(cell, context);
  context.phase = "read-committed-actual-public-rollback-positive";
  await positiveControl(cell, route, spec, context, {
    unblock: cell.family === "UNBLOCK.outbound_false",
  });
  const before = census();
  context.before = before;
  context.expectedSnapshot = before;
  if (cell.isolation) {
    context.phase = "actual-stronger-isolation-public-denial";
    const observed = await serial(cell, route, {
      isolation: cell.isolation,
      unblock: cell.family === "UNBLOCK.outbound_false",
      context,
    });
    context.publicResult = observed.denial;
    compare(before, census(), {}, observed.denial);
    return {
      id: cell.id,
      partition: "serial-isolation-denial",
      observed_wait_credit: 0,
      code: "42501",
      message: "Safety operation unavailable",
      full54_values_verified: true,
    };
  }
  const held = await lowerRace(cell, route, a, before, context);
  context.expectedSnapshot = census();
  if (
    cell.family === "retained_proof_loss" ||
    cell.family === "current_late_proof"
  ) {
    context.phase = "fresh-later-lane-proof";
    if (cell.family === "retained_proof_loss") assertCurrentOnly(route);
    else {
      assert.equal(census()["private.pilot_availability"][0].enabled, false);
      assertProof(route, a);
    }
    const laterBefore = census();
    context.phase = "fresh-later-actual-public-positive";
    const later = await serial(cell, route, {
      request: a.laterRequest,
      context,
    });
    assertPublicDelta(
      route,
      laterBefore,
      census(),
      later.result,
      outcomeSpec(route, a, { current: cell.family === "retained_proof_loss" }),
      later.window,
      a.laterRequest,
    );
    compare(census(), later.snapshot, {}, "fresh later committed snapshot");
    context.laterResult = later.result;
  } else if (cell.family === "retained_reselect") {
    // CB's intentional outbound block becomes the highest later proof. The
    // original CP report must select the surviving request generation; CB
    // preserves that exact request while inserting block and removing friendship.
    assert.deepEqual(census()["private.friendship_create_requests"], [
      requestProof(route, a),
    ]);
    assert.deepEqual(held["private.friendships"], []);
  }
  return {
    id: cell.id,
    partition: "actual-lower-wait",
    observed_wait_credit: 1,
    observation: context.observation,
    writer:
      "privileged synthetic lower-row/proof preparation; not public manager permission",
    actual_public_result: publicSummary(context.publicResult),
    fresh_later_result: publicSummary(context.laterResult),
    before: sanitized(before),
    after: sanitized(census()),
    full54_values_verified: true,
    setup_qualification: context.setupQualification,
  };
}
export function requireReviewedRetainedRelease() {
  throw new Error(
    "B3c retained fixtures blocked before target contact: require separately reviewed runner allowlist, failure delivery, whole-module bounds/adoption, combined fixture and ownership review, fresh ownership preflight and explicit exclusive serial release",
  );
}
export async function runRetainedFixtures() {
  requireReviewedRetainedRelease(); // unconditional; no argument/env bypass
  assert.equal(retainedManifest.length, 37);
  assert.equal(retainedManifest.filter((c) => c.wait).length, 19);
  assert.equal(retainedManifest.filter((c) => c.isolation).length, 18);
  assert.equal(new Set(retainedManifest.map((c) => c.id)).size, 37);
  localTarget("current27");
  assertClean();
  let context,
    original,
    cleanupSafe = true;
  try {
    for (const cell of retainedManifest) {
      context = { id: cell.id, phase: "independent-case-setup" };
      const evidence = await runCell(cell, context);
      console.log(JSON.stringify(evidence));
      context.phase = "guarded-case-reset";
      resetDisposable("current27");
      assertClean();
    }
  } catch (error) {
    original = error;
    if (error.cleanupIncomplete) cleanupSafe = false;
    captureRetainedFailure(error, context);
    throw error;
  } finally {
    guardedFinalCleanup(cleanupSafe, original);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // Refuse synchronously before test registration, any guard, or target contact.
  requireReviewedRetainedRelease();
}
