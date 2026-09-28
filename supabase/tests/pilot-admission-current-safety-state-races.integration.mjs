// Static authoring only: imports are inert; the suite refuses before target contact.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
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
  census,
  censusQuery,
  campus,
  assertCurrentOnly,
  selectedLaterLane,
  peerProofsQuery,
  denialFor,
  sanitized,
} from "./helpers/pilot-current-safety-fixtures.mjs";
import {
  assertCaseSetup,
  exactSnapshot,
  verifiedOutcome,
  dynamicTime,
  assertSuccess,
  executeSuccess,
  successSQL,
  exactDiagnostic,
  credentialFree,
  captureFailure,
  finishOwnedSessions,
  guardedFinalCleanup,
  removeOwnBlock,
  bounds,
} from "./pilot-admission-current-safety-concurrency.integration.mjs";

// Literal canonical allocations, not computed mappings or execution receipts.
export const stateManifest = Object.freeze([
  {
    id: "L5.CH.source_disable.loss-first",
    route: "CH",
    loss: "source_disable",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CH.source_disable.operation-first",
    route: "CH",
    loss: "source_disable",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CH.source_cancel.loss-first",
    route: "CH",
    loss: "source_cancel",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CH.source_cancel.operation-first",
    route: "CH",
    loss: "source_cancel",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CH.actor_host_block_outbound.loss-first",
    route: "CH",
    loss: "actor_host_block_outbound",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CH.actor_host_block_outbound.operation-first",
    route: "CH",
    loss: "actor_host_block_outbound",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CH.actor_host_block_inbound.loss-first",
    route: "CH",
    loss: "actor_host_block_inbound",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CH.actor_host_block_inbound.operation-first",
    route: "CH",
    loss: "actor_host_block_inbound",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CP.peer_opt_out.loss-first",
    route: "CP",
    loss: "peer_opt_out",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CP.peer_opt_out.operation-first",
    route: "CP",
    loss: "peer_opt_out",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CP.peer_preference_delete.loss-first",
    route: "CP",
    loss: "peer_preference_delete",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CP.peer_preference_delete.operation-first",
    route: "CP",
    loss: "peer_preference_delete",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CP.actor_peer_block_outbound.loss-first",
    route: "CP",
    loss: "actor_peer_block_outbound",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CP.actor_peer_block_outbound.operation-first",
    route: "CP",
    loss: "actor_peer_block_outbound",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CP.actor_peer_block_inbound.loss-first",
    route: "CP",
    loss: "actor_peer_block_inbound",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CP.actor_peer_block_inbound.operation-first",
    route: "CP",
    loss: "actor_peer_block_inbound",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CB.peer_opt_out.loss-first",
    route: "CB",
    loss: "peer_opt_out",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CB.peer_opt_out.operation-first",
    route: "CB",
    loss: "peer_opt_out",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CB.peer_preference_delete.loss-first",
    route: "CB",
    loss: "peer_preference_delete",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CB.peer_preference_delete.operation-first",
    route: "CB",
    loss: "peer_preference_delete",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CB.actor_peer_block_outbound.loss-first",
    route: "CB",
    loss: "actor_peer_block_outbound",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CB.actor_peer_block_outbound.operation-first",
    route: "CB",
    loss: "actor_peer_block_outbound",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CB.actor_peer_block_inbound.loss-first",
    route: "CB",
    loss: "actor_peer_block_inbound",
    order: "loss-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
  {
    id: "L5.CB.actor_peer_block_inbound.operation-first",
    route: "CB",
    loss: "actor_peer_block_inbound",
    order: "operation-first",
    partition: "actual-state-wait-required",
    status: "unexecuted",
    outcome_classification:
      "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
  },
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const reason = "B3c state disable";
const one = (snapshot, table, key, id) => {
  const rows = snapshot[table].filter((row) => row[key] === id);
  assert.equal(rows.length, 1, `${table} exact ${key} binding`);
  return rows[0];
};
const marker = (output, prefix) => {
  const lines = output.split("\n").filter((line) => line.startsWith(prefix));
  assert.equal(lines.length, 1, `one actual ${prefix} required`);
  return JSON.parse(lines[0].slice(prefix.length));
};
const windowStart = () => sql("select clock_timestamp()::text");
const endWindow = (start) => ({ start, end: windowStart() });
function exactDelta(before, after, replacements, label) {
  return verifiedOutcome({
    result: label,
    expectedResult: label,
    before,
    after,
    expectedAfter: exactSnapshot(before, after, replacements),
  });
}
export function verifyStateManifest() {
  const matrix = JSON.parse(
    readFileSync(
      new URL(
        "../../agents/handoffs/TASK-021A1b3c-MATRIX.json",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(
    stateManifest,
    matrix.cells.filter((cell) => cell.id.startsWith("L5.")),
  );
  assert.equal(stateManifest.length, 24);
  assert.equal(new Set(stateManifest.map((cell) => cell.id)).size, 24);
  assert.ok(stateManifest.every((cell) => cell.status === "unexecuted"));
  return { literal_allocations: 24, execution_credit: 0 };
}

// Reviewed policy setup independently specifies all54 rowsets and qualified
// opaque provider fields. Narrow it to the actual route before the positive
// absent/false rollback control. Every narrowing delta is separately specified.
export function narrowPurpose(route) {
  const before = census();
  sql(`begin;update private.pilot_capabilities set enabled=key=${quote(route.purpose)};
    update private.hangout_feature_gate set enabled=${route.id === "CH"};
    update private.people_feature_gate set enabled=${route.id !== "CH"};commit;`);
  const after = census();
  exactDelta(
    before,
    after,
    {
      "private.pilot_capabilities": before["private.pilot_capabilities"].map(
        (row) => ({ ...row, enabled: row.key === route.purpose }),
      ),
      "private.hangout_feature_gate": [
        { singleton: true, enabled: route.id === "CH" },
      ],
      "private.people_feature_gate": [
        { singleton: true, enabled: route.id !== "CH" },
      ],
    },
    "sole tested purpose setup",
  );
}

export function stateWriter(cell, route) {
  const ids = caseIds(cell.id + ".operator");
  if (cell.loss === "source_disable")
    return {
      kind: "disable",
      actor: route.manager,
      report: ids.request,
      request: ids.managerRequest,
      public: true,
      sql: `${auth(route.manager)}select 'WRITER_RESULT:'||to_jsonb(v)::text from public.apply_hangout_moderation_action(${quote(ids.request)},${quote(ids.managerRequest)},1,${quote(reason)}) v;reset role;`,
      result: { case_state: "closed", revision: 2, target_disabled: true },
      wait: "social (16016,1) exclusive before moderation/pilot/lane selection; no lower current tuple credit",
      relation: null,
    };
  if (cell.loss === "source_cancel")
    return {
      kind: "cancel",
      actor: route.host,
      public: true,
      sql: `${auth(route.host)}select 'WRITER_RESULT:'||to_jsonb(public.cancel_hangout(${quote(route.source)},1))::text;reset role;`,
      result: 2,
      wait: "social (16016,1) exclusive before shared pilot/lifecycle and current lane selection; no lower tuple credit",
      relation: null,
    };
  if (cell.loss === "peer_opt_out")
    return {
      kind: "optout",
      actor: route.peer,
      public: true,
      sql: `${auth(route.peer)}select 'WRITER_RESULT:'||to_jsonb(public.set_people_preference(false))::text;reset role;`,
      result: false,
      wait:
        cell.order === "operation-first"
          ? "public opt-out account UPDATE waits on current peer account SHARE, before preference UPSERT"
          : "current peer account SHARE waits on public opt-out account UPDATE, before required preference lookup",
      relation: "public.accounts",
    };
  if (cell.loss === "peer_preference_delete")
    return {
      kind: "delete",
      actor: null,
      public: false,
      sql: `with d as (delete from private.people_preferences where account_id=${quote(route.peer)} returning account_id) select 'WRITER_RESULT:'||count(*)::text from d;`,
      result: 1,
      wait: "required peer preference SHARE versus actual preference DELETE tuple/transaction wait; privileged synthetic maintenance only",
      relation: "private.people_preferences",
    };
  assert.match(cell.loss, /^actor_(host|peer)_block_(outbound|inbound)$/);
  const other = route.id === "CH" ? route.host : route.peer;
  const inbound = cell.loss.endsWith("inbound");
  return {
    kind: "block",
    actor: inbound ? other : route.actor,
    target: inbound ? route.actor : other,
    public: true,
    sql: `${auth(inbound ? other : route.actor)}select 'WRITER_RESULT:'||to_jsonb(public.set_safety_block(${quote(inbound ? route.actor : other)},true))::text;reset role;`,
    result: true,
    wait: "social (16016,1) exclusive before shared pilot/current-or-retained lane selection; no lower tuple/no-upgrade/no-fallback credit",
    relation: null,
  };
}

// Separate synthetic writer preparation, after the tested absent/false current
// rollback control. This never manufactures retained evidence or bypasses People.
export function prepareCompanion(cell, route, writer) {
  const before = census(),
    start = windowStart();
  if (writer.kind === "block") {
    sql(`begin;
      ${route.id === "CH" ? "update private.pilot_capabilities set enabled=true where key='people';update private.people_feature_gate set enabled=true;" : ""}
      ${writer.target === route.actor || route.id === "CH" ? `insert into private.people_preferences(account_id,opted_in) values(${quote(writer.target)},true) on conflict(account_id) do update set opted_in=true;` : ""}
      commit;`);
    const after = census();
    const preferences = before["private.people_preferences"].filter(
      (row) => row.account_id !== writer.target,
    );
    preferences.push({ account_id: writer.target, opted_in: true });
    exactDelta(
      before,
      after,
      {
        "private.people_preferences": preferences,
        "private.pilot_capabilities": before["private.pilot_capabilities"].map(
          (row) => ({
            ...row,
            enabled: row.enabled || (route.id === "CH" && row.key === "people"),
          }),
        ),
        "private.people_feature_gate":
          route.id === "CH"
            ? [{ singleton: true, enabled: true }]
            : before["private.people_feature_gate"],
      },
      "separate block writer prerequisites",
    );
  } else if (writer.kind === "disable") {
    // Operator independent of pilot readiness: active manager account with
    // incomplete profile/unadmitted roster, distinct reporter and immutable host.
    sql(`begin;update private.moderation_feature_gate set enabled=true;
      insert into public.platform_roles(user_id,role) values(${quote(route.manager)},'admin');
      insert into private.safety_reports(id,reporter_id,target_type,target_id,category,narrative,provenance_kind,provenance_ref_id)
      values(${quote(writer.report)},${quote(route.peer)},'hangout',${quote(route.source)},'harassment',null,'current_hangout',${quote(route.source)});
      insert into private.moderation_cases(report_id,state,revision) values(${quote(writer.report)},'in_review',1);commit;`);
    const after = census(),
      window = endWindow(start);
    exactDelta(
      before,
      after,
      {
        "private.moderation_feature_gate": [{ singleton: true, enabled: true }],
        "public.platform_roles": [
          {
            user_id: route.manager,
            role: "admin",
            created_at: dynamicTime(
              one(after, "public.platform_roles", "user_id", route.manager)
                .created_at,
              window,
            ),
          },
        ],
        "private.safety_reports": [
          ...before["private.safety_reports"],
          {
            id: writer.report,
            submitted_at: dynamicTime(
              one(after, "private.safety_reports", "id", writer.report)
                .submitted_at,
              window,
            ),
            reporter_id: route.peer,
            target_type: "hangout",
            target_id: route.source,
            category: "harassment",
            narrative: null,
            provenance_kind: "current_hangout",
            provenance_ref_id: route.source,
          },
        ],
        "private.moderation_cases": [
          {
            report_id: writer.report,
            state: "in_review",
            revision: 1,
            note: null,
            disposition: null,
            duplicate_report_id: null,
            sanction_id: null,
            hangout_disable_id: null,
          },
        ],
      },
      "synthetic report-bound operator preparation; no operator regression credit",
    );
  } else exactDelta(before, census(), {}, "no companion prerequisite delta");
  assertCurrentOnly(route);
  // Source24 real authority is subsequently exercised only by its public writer.
  assert.equal(selectedLaterLane(route), "current");
  return {
    separate_full54_setup_delta_verified: true,
    initial_actor_preference_control:
      cell.order === "operation-first" ? false : "absent",
    companion_actor_opt_in:
      writer.kind === "block" && writer.target === route.actor,
    synthetic_operator_setup: writer.kind === "disable",
    writer_permission_regression_credit: 0,
  };
}

export function assertWriterDelta(
  before,
  after,
  writer,
  route,
  result,
  window,
) {
  assert.deepEqual(
    result,
    writer.result,
    "exact public writer ABI result / synthetic DELETE count",
  );
  let replacements;
  if (writer.kind === "block") {
    const exists = before["private.people_blocks"].some(
      (row) =>
        row.blocker_id === writer.actor && row.blocked_id === writer.target,
    );
    replacements = {
      "private.people_blocks": [
        ...before["private.people_blocks"],
        ...(exists
          ? []
          : [{ blocker_id: writer.actor, blocked_id: writer.target }]),
      ],
    };
  } else if (writer.kind === "optout" || writer.kind === "delete") {
    replacements = {
      "private.people_preferences": before["private.people_preferences"].filter(
        (row) => row.account_id !== route.peer,
      ),
    };
    if (writer.kind === "optout")
      replacements["private.people_preferences"].push({
        account_id: route.peer,
        opted_in: false,
      });
  } else if (writer.kind === "cancel") {
    const old = one(before, "public.hangouts", "id", route.source),
      current = one(after, "public.hangouts", "id", route.source);
    const updated = dynamicTime(current.updated_at, window);
    assert.notEqual(updated, old.updated_at);
    replacements = {
      "public.hangouts": before["public.hangouts"].map((row) =>
        row.id === route.source
          ? {
              ...row,
              status: "cancelled",
              joining_state: "closed",
              revision: 2,
              updated_at: updated,
            }
          : row,
      ),
    };
  } else {
    assert.equal(writer.kind, "disable");
    const disable = one(
      after,
      "private.hangout_disables",
      "report_id",
      writer.report,
    );
    const audit = one(
      after,
      "private.moderation_audit",
      "report_id",
      writer.report,
    );
    assert.match(disable.id, uuid);
    assert.match(audit.id, uuid);
    assert.notEqual(disable.id, audit.id);
    const fingerprint = sql(
      `select 'hangout:'||md5(jsonb_build_array(${quote(writer.report)}::uuid,1::bigint,${quote(reason)})::text)`,
    );
    replacements = {
      "private.hangout_disables": [
        {
          id: disable.id,
          report_id: writer.report,
          subject_type: "hangout",
          hangout_id: route.source,
          operator_id: route.manager,
          request_id: writer.request,
          previous_disabled: false,
          new_disabled: true,
          subject_campus_id: campus,
          reason,
          occurred_at: dynamicTime(disable.occurred_at, window),
        },
      ],
      "private.moderation_cases": [
        {
          report_id: writer.report,
          state: "closed",
          revision: 2,
          note: reason,
          disposition: "action_taken",
          duplicate_report_id: null,
          sanction_id: null,
          hangout_disable_id: disable.id,
        },
      ],
      "private.moderation_requests": [
        {
          operator_id: route.manager,
          request_id: writer.request,
          fingerprint,
          report_id: writer.report,
          result_state: "closed",
          result_revision: 2,
        },
      ],
      "private.moderation_audit": [
        {
          id: audit.id,
          occurred_at: dynamicTime(audit.occurred_at, window),
          operator_id: route.manager,
          action: "disable_hangout",
          report_id: writer.report,
          subject_target_type: "hangout",
          subject_target_id: route.source,
          subject_campus_id: campus,
          request_id: writer.request,
          previous_state: "in_review",
          new_state: "closed",
          previous_revision: 1,
          new_revision: 2,
          reason,
          duplicate_report_id: null,
          page_report_ids: null,
          page_count: null,
          sanction_id: null,
          previous_account_status: null,
          new_account_status: null,
          hangout_disable_id: disable.id,
          previous_hangout_disabled: false,
          new_hangout_disabled: true,
        },
      ],
    };
  }
  return exactDelta(before, after, replacements, "exact actual writer effects");
}

// A later outbound block is legitimate retained authority. It never proves a
// selected-current upgrade. CB repair may already have its intentional block.
export function assertOperation(
  route,
  before,
  after,
  result,
  request,
  window,
  lane,
) {
  assert.ok(["current", "retained"].includes(lane));
  if (route.id !== "CB") dynamicTime(result.submitted_at, window);
  if (route.id === "CB" && lane === "retained") {
    assert.ok(
      before["private.people_blocks"].some(
        (row) =>
          row.blocker_id === route.actor && row.blocked_id === route.peer,
      ),
    );
    return verifiedOutcome({ result, expectedResult: true, before, after });
  }
  return assertSuccess(
    lane === "retained" ? { ...route, provenance: "owned_block" } : route,
    before,
    after,
    result,
    request,
  );
}
export async function statePrecheck(route) {
  assertCurrentOnly(route);
  const before = census(),
    start = windowStart();
  assert.equal(
    one(before, "private.pilot_capabilities", "key", "onboarding").enabled,
    false,
  );
  assert.equal(selectedLaterLane(route), "current");
  const observed = await executeSuccess(route, { rollback: true });
  assertOperation(
    route,
    before,
    observed.snapshot,
    observed.result,
    route.request,
    endWindow(start),
    "current",
  );
  exactDelta(before, census(), {}, "positive current rollback");
  assertCurrentOnly(route);
}
export async function stateDenied(route, before, request) {
  let owned, originalError;
  try {
    owned = session(
      "b3c_state_denied_" + request.replaceAll("-", "").slice(0, 16),
    );
    owned.send(`${bounds}begin;${successSQL(route, { request })}commit;`);
    owned.child.stdin.end();
    assert.deepEqual(await owned.done, [3, null]);
    const diagnostics = exactDiagnostic(owned.output());
    assert.deepEqual(diagnostics, [
      { code: "42501", message: denialFor(route) },
    ]);
    assert.doesNotMatch(
      owned.output(),
      /40P01|40001|57014|55P03|RESULT:|SNAPSHOT:/,
    );
    return verifiedOutcome({
      result: diagnostics,
      expectedResult: [{ code: "42501", message: denialFor(route) }],
      before,
      after: census(),
    });
  } catch (error) {
    originalError = error;
    error.sqlDiagnostics = exactDiagnostic(owned?.output() ?? "");
    throw error;
  } finally {
    await finishOwnedSessions([owned], originalError);
  }
}
export function expectedLaterLane(route, writer, operationFirst) {
  return route.id !== "CH" &&
    ((writer.kind === "block" && writer.actor === route.actor) ||
      (route.id === "CB" && operationFirst))
    ? "retained"
    : "current";
}
function verifyLaterLane(route, expected) {
  assert.equal(selectedLaterLane(route), expected);
  if (expected === "retained") {
    assert.equal(route.id === "CH", false);
    const proofs = JSON.parse(sql(peerProofsQuery(route)));
    assert.deepEqual(proofs, {
      owned_block: true,
      friendship: false,
      request: false,
      dm_generation: false,
      hangout_host: false,
      immutable_overlap: false,
      positive_interval: false,
    });
    assert.deepEqual(
      JSON.parse(
        sql(
          `select to_jsonb(v) from private.safety_report_peer_source(${quote(route.actor)},${quote(route.peer)}) v`,
        ),
      ),
      { kind: "owned_block", ref_id: route.peer },
    );
  } else assertCurrentOnlyAfterLoss(route);
}
function assertCurrentOnlyAfterLoss(route) {
  if (route.id !== "CH") assertCurrentOnly(route);
  else {
    assert.equal(
      sql(
        `select count(*) from public.hangout_participants where hangout_id=${quote(route.source)} and account_id=${quote(route.actor)}`,
      ),
      "0",
    );
    assert.equal(
      sql(
        `select count(*) from public.hangouts h join public.hangout_participants p on p.hangout_id=h.id and p.account_id=h.host_id and p.state='joined' where h.id=${quote(route.source)} and h.host_id=${quote(route.host)}`,
      ),
      "1",
    );
  }
}
export async function postLoss(cell, route, writer, context) {
  const lane = expectedLaterLane(
    route,
    writer,
    cell.order === "operation-first",
  );
  verifyLaterLane(route, lane);
  const request = caseIds(cell.id + ".post-loss").request,
    before = census();
  if (lane === "current") {
    await stateDenied(route, before, request);
    return {
      selected_lane: lane,
      outcome: { code: "42501", message: denialFor(route) },
      full54_verified: true,
    };
  }
  const start = windowStart(),
    observed = await executeSuccess(route, { request });
  assertOperation(
    route,
    before,
    observed.snapshot,
    observed.result,
    request,
    endWindow(start),
    lane,
  );
  exactDelta(
    observed.snapshot,
    census(),
    {},
    "retained post-loss transaction commit",
  );
  // When loss survives removal of CB's intentional block, separately prove a
  // fresh current denial. No synthetic retained proof or source reversal.
  let currentDenial = null;
  if (
    route.id === "CB" &&
    !(writer.kind === "block" && writer.actor === route.actor)
  ) {
    context.phase = "authorized-unblock-for-separate-current-denial";
    await removeOwnBlock(route);
    verifyLaterLane(route, "current");
    await stateDenied(
      route,
      census(),
      caseIds(cell.id + ".fresh-current-denial").request,
    );
    currentDenial = {
      selected_lane: "current",
      code: "42501",
      message: denialFor(route),
      explicit_authorized_unblock: true,
      seven_absent_proofs: true,
    };
  }
  return {
    selected_lane: lane,
    provenance:
      route.id === "CB" ? "owned outbound block repair" : "owned_block",
    outcome:
      route.id === "CB"
        ? true
        : { fields: Object.keys(observed.result).sort() },
    full54_verified: true,
    separate_current_denial: currentDenial,
  };
}

export function stateEffectClassification(cell) {
  if (cell.id === "L5.CB.actor_peer_block_inbound.operation-first")
    return "public-writer-denial-no-committed-loss-order";
  if (cell.id === "L5.CB.actor_peer_block_outbound.operation-first")
    return "retained-repair-no-new-loss";
  return "planned-committed-state-loss";
}
export async function observeStateRace(cell, route, writer, before, context) {
  let holder, waiter, originalError;
  const operationFirst = cell.order === "operation-first",
    start = windowStart();
  const name = "b3c_state_" + route.request.replaceAll("-", "").slice(0, 20);
  const writerSQL = writer.sql + `select 'SNAPSHOT:'||(${censusQuery})::text;`;
  try {
    holder = session(name + "_h");
    waiter = session(name + "_w");
    context.phase = "holder-execution";
    holder.send(
      `${bounds}begin;${operationFirst ? successSQL(route) : writerSQL}select 'HELD';`,
    );
    await until(() => holder.output().split("\n").includes("HELD"));
    assert.deepEqual(exactDiagnostic(holder.output()), []);
    context.holderSnapshot = marker(holder.output(), "SNAPSHOT:");
    context.phase = "waiter-execution";
    waiter.send(
      `${bounds}begin;${operationFirst ? writerSQL : successSQL(route)}select 'COMPLETED';commit;select 'WAITER_COMMITTED';`,
    );
    context.phase = "actual-lock-observation";
    const observationSQL = `select jsonb_build_object('holder_pid',h.pid,'waiter_pid',w.pid,'blocking_pids',pg_blocking_pids(w.pid),
      'ungranted_locks',(select jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,'relation',(select n.nspname||'.'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=l.relation),'transactionid',l.transactionid,'classid',l.classid,'objid',l.objid,'objsubid',l.objsubid)) from pg_locks l where l.pid=w.pid and not l.granted),
      'holder_relation_locks',(select coalesce(jsonb_agg(jsonb_build_object('relation',(select n.nspname||'.'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=l.relation),'mode',l.mode)),'[]') from pg_locks l where l.pid=h.pid and l.granted and l.locktype='relation'))
      from pg_stat_activity h join pg_stat_activity w on w.application_name=${quote(name + "_w")} where h.application_name=${quote(name + "_h")} and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`;
    await until(() => {
      const raw = sql(observationSQL);
      if (!raw) return false;
      context.observation = JSON.parse(raw);
      return true;
    });
    const observation = context.observation;
    assert.ok(
      Number.isInteger(observation.holder_pid) &&
        Number.isInteger(observation.waiter_pid),
    );
    assert.notEqual(observation.holder_pid, observation.waiter_pid);
    assert.ok(observation.blocking_pids.includes(observation.holder_pid));
    assert.ok(observation.ungranted_locks.length > 0);
    if (writer.relation === null)
      assert.ok(
        observation.ungranted_locks.some(
          (lock) =>
            lock.locktype === "advisory" &&
            lock.classid === 16016 &&
            lock.objid === 1 &&
            lock.objsubid === 2 &&
            lock.mode === "ExclusiveLock",
        ),
        "exact public social boundary wait required",
      );
    else {
      assert.ok(
        observation.ungranted_locks.some((lock) =>
          ["tuple", "transactionid"].includes(lock.locktype),
        ),
        "actual tuple/transaction wait, no advisory credit",
      );
      assert.ok(
        observation.holder_relation_locks.some(
          (lock) => lock.relation === writer.relation,
        ),
        "known writer/current holder relation required",
      );
      for (const lock of observation.ungranted_locks.filter(
        (lock) => lock.locktype === "tuple",
      ))
        assert.equal(lock.relation, writer.relation);
    }
    context.phase = "release-and-exact-outcome";
    holder.send("commit;select 'HOLDER_COMMITTED';");
    holder.child.stdin.end();
    waiter.child.stdin.end();
    const [h, w] = await Promise.all([holder.done, waiter.done]);
    context.diagnostics = [
      ...exactDiagnostic(holder.output()),
      ...exactDiagnostic(waiter.output()),
    ];
    assert.deepEqual(h, [0, null]);
    assert.ok(holder.output().split("\n").includes("HOLDER_COMMITTED"));
    assert.deepEqual(exactDiagnostic(holder.output()), []);
    const held = context.holderSnapshot,
      window = endWindow(start);
    if (
      stateEffectClassification(cell) ===
      "public-writer-denial-no-committed-loss-order"
    ) {
      // The current CB inserts actor→peer. For peer→actor that is only inbound
      // evidence, never peer-owned retained authority. Bilateral block masks
      // current People even though actor companion opt-in is true. Real public
      // writer denial is lawful and cannot count as a committed state loss.
      assert.deepEqual(w, [3, null]);
      assert.deepEqual(exactDiagnostic(waiter.output()), [
        { code: "42501", message: "Safety operation unavailable" },
      ]);
      assert.doesNotMatch(
        waiter.output(),
        /40P01|40001|57014|55P03|COMPLETED|WRITER_RESULT:|SNAPSHOT:|WAITER_COMMITTED/,
      );
      const initialResult = marker(holder.output(), "RESULT:");
      assertOperation(
        route,
        before,
        held,
        initialResult,
        route.request,
        window,
        "current",
      );
      exactDelta(
        held,
        census(),
        {},
        "lawful denied inbound writer exact rollback; no committed loss",
      );
      context.managerResult = {
        code: "42501",
        message: "Safety operation unavailable",
      };
      context.publicResult = initialResult;
      verifyLaterLane(route, "retained");
      const recoveryBefore = census(),
        recoveryStart = windowStart(),
        recoveryRequest = caseIds(
          cell.id + ".feasibility-retained-recovery",
        ).request;
      const recovered = await executeSuccess(route, {
        request: recoveryRequest,
      });
      assertOperation(
        route,
        recoveryBefore,
        recovered.snapshot,
        recovered.result,
        recoveryRequest,
        endWindow(recoveryStart),
        "retained",
      );
      exactDelta(
        recovered.snapshot,
        census(),
        {},
        "retained recovery after lawful failed inbound writer",
      );
      const recovery = {
        selected_lane: "retained",
        provenance: "owned outbound block repair",
        outcome: true,
        full54_verified: true,
        separate_current_denial: null,
        no_inbound_loss_committed: true,
      };
      console.error(
        JSON.stringify({
          id: cell.id,
          partition: "source-feasibility-contract-gap",
          classification: stateEffectClassification(cell),
          observed_boundary: context.observation,
          original_current_success: true,
          actual_writer_result: context.managerResult,
          writer_full54_rollback_verified: true,
          post_loss: recovery,
          successful_wait_order_credit: false,
          committed_loss_order_credit: 0,
        }),
      );
      throw new Error(
        "Uncredited L5.CB.actor_peer_block_inbound.operation-first: peer public block lawfully denies bilateral visibility after current actor block; no peer-owned retained proof, so committed-loss contract requires reconciliation",
      );
    }
    const result = marker(
      (operationFirst ? waiter : holder).output(),
      "WRITER_RESULT:",
    );
    context.managerResult = result;
    const lossLane = expectedLaterLane(route, writer, false);
    let currentResult = null;
    if (operationFirst) {
      assert.deepEqual(w, [0, null]);
      assert.ok(waiter.output().split("\n").includes("WAITER_COMMITTED"));
      assert.deepEqual(exactDiagnostic(waiter.output()), []);
      currentResult = marker(holder.output(), "RESULT:");
      context.publicResult =
        route.id === "CB"
          ? currentResult
          : { fields: Object.keys(currentResult).sort() };
      assertOperation(
        route,
        before,
        held,
        currentResult,
        route.request,
        window,
        "current",
      );
      assertWriterDelta(
        held,
        marker(waiter.output(), "SNAPSHOT:"),
        writer,
        route,
        result,
        window,
      );
      exactDelta(
        marker(waiter.output(), "SNAPSHOT:"),
        census(),
        {},
        "writer commit after successful current operation",
      );
    } else {
      assertWriterDelta(before, held, writer, route, result, window);
      // Advisory wait precedes selection: outbound actor block may supply a
      // legitimately retained lane only in this new call after holder commit.
      verifyLaterLane(route, lossLane);
      if (lossLane === "retained") {
        assert.deepEqual(w, [0, null]);
        assert.ok(waiter.output().split("\n").includes("WAITER_COMMITTED"));
        assert.deepEqual(exactDiagnostic(waiter.output()), []);
        currentResult = marker(waiter.output(), "RESULT:");
        context.publicResult =
          route.id === "CB"
            ? currentResult
            : { fields: Object.keys(currentResult).sort() };
        const snapshot = marker(waiter.output(), "SNAPSHOT:");
        assertOperation(
          route,
          held,
          snapshot,
          currentResult,
          route.request,
          window,
          "retained",
        );
        exactDelta(snapshot, census(), {}, "lawful retained waiter commit");
      } else {
        assert.deepEqual(w, [3, null]);
        assert.deepEqual(exactDiagnostic(waiter.output()), [
          { code: "42501", message: denialFor(route) },
        ]);
        assert.doesNotMatch(
          waiter.output(),
          /40P01|40001|57014|55P03|COMPLETED|RESULT:|SNAPSHOT:/,
        );
        exactDelta(held, census(), {}, "exact denied waiter rollback");
      }
    }
    return {
      id: cell.id,
      order: cell.order,
      writer_public: writer.public,
      writer_actor: writer.actor,
      actual_writer_result: result,
      wait_location: writer.wait,
      ...observation,
      holder_loss_snapshot: operationFirst
        ? sanitized(marker(waiter.output(), "SNAPSHOT:"))
        : sanitized(held),
      operation_selected_lane: operationFirst ? "current" : lossLane,
      operation_result:
        currentResult === null
          ? { code: "42501", message: denialFor(route) }
          : route.id === "CB"
            ? currentResult
            : {
                fields: Object.keys(currentResult).sort(),
                provenance: operationFirst ? route.provenance : "owned_block",
              },
      lower_current_tuple_wait_credit: writer.relation !== null,
      frozen_lane_upgrade_or_fallback_credit: 0,
      full54_values_verified: true,
      writer_effect_classification: stateEffectClassification(cell),
      committed_loss_order_credit:
        stateEffectClassification(cell) === "retained-repair-no-new-loss"
          ? 0
          : 1,
    };
  } catch (error) {
    originalError = error;
    context.diagnostics = [
      ...exactDiagnostic(holder?.output() ?? ""),
      ...exactDiagnostic(waiter?.output() ?? ""),
    ];
    for (const owned of [holder, waiter].filter(Boolean)) {
      for (const [prefix, key] of [
        ["SNAPSHOT:", "holderSnapshot"],
        ["WRITER_RESULT:", "managerResult"],
        ["RESULT:", "publicResult"],
      ]) {
        if (
          owned
            .output()
            .split("\n")
            .some((line) => line.startsWith(prefix))
        ) {
          try {
            const value = marker(owned.output(), prefix);
            context[key] =
              key === "publicResult" && typeof value !== "boolean"
                ? { fields: Object.keys(value).sort() }
                : value;
          } catch {
            /* available malformed output cannot become evidence */
          }
        }
      }
    }
    if (!context.observation && (holder || waiter)) {
      try {
        context.observation = JSON.parse(
          sql(
            `select coalesce(jsonb_agg(jsonb_build_object('pid',a.pid,'application_name',a.application_name,'blocking_pids',pg_blocking_pids(a.pid),'locks',(select coalesce(jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,'granted',l.granted,'relation',(select n.nspname||'.'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=l.relation),'classid',l.classid,'objid',l.objid,'objsubid',l.objsubid,'transactionid',l.transactionid)),'[]') from pg_locks l where l.pid=a.pid))),'[]') from pg_stat_activity a where a.application_name in (${quote(name + "_h")},${quote(name + "_w")})`,
          ),
        );
      } catch (cause) {
        context.observation = { unavailable: credentialFree(cause.message) };
      }
    }
    captureFailure(error, context);
    throw error;
  } finally {
    await finishOwnedSessions([holder, waiter], originalError);
    if (
      originalError &&
      context.diagnostics.some((d) =>
        ["40P01", "40001", "57014", "55P03"].includes(d.code),
      )
    ) {
      // This is failed/abort rollback evidence only. A lawful holder commit may
      // survive; the failed waiter must leave exactly that committed snapshot.
      const holderCommitted = holder
        ?.output()
        .split("\n")
        .includes("HOLDER_COMMITTED");
      const waiterCommitted = waiter
        ?.output()
        .split("\n")
        .includes("WAITER_COMMITTED");
      if (!waiterCommitted) {
        try {
          exactDelta(
            holderCommitted ? context.holderSnapshot : before,
            census(),
            {},
            "failed/abort waiter exact rollback; zero order credit",
          );
          console.error(
            JSON.stringify({
              id: cell.id,
              partition: "failed-abort-exact-rollback",
              full54_verified: true,
              successful_wait_order_credit: false,
              holder_commit_preserved: holderCommitted,
            }),
          );
        } catch (rollback) {
          originalError.rollbackDifferences = rollback.preciseDifferences ?? [];
          console.error(
            JSON.stringify(
              credentialFree({
                id: cell.id,
                partition: "failed-abort-rollback-mismatch",
                differences: originalError.rollbackDifferences,
                diagnostic: rollback.message,
                successful_wait_order_credit: false,
              }),
            ),
          );
        }
      }
    }
  }
}

export function requireReviewedStateRelease() {
  throw new Error(
    "B3c state fixtures refuse before target contact: state is not runner allowlisted; separately reviewed bounded failure delivery/adoption, combined fixture/ownership review and explicit exclusive serial release remain required",
  );
}
export async function runStateFixtures() {
  requireReviewedStateRelease(); // unconditional; no environment/argument bypass
  verifyStateManifest();
  localTarget("current27");
  assertClean();
  let cleanupSafe = true,
    originalError,
    context;
  try {
    for (const cell of stateManifest) {
      context = { id: cell.id, phase: "independent-case-setup" };
      const clean = census(),
        start = windowStart(),
        actorPreference = cell.order === "operation-first" ? false : "absent";
      const route = prepare(
        routes.find((route) => route.id === cell.route),
        { caseKey: cell.id, actorPreference },
      );
      context.setupQualification = assertCaseSetup(
        clean,
        census(),
        route,
        endWindow(start),
        actorPreference,
      );
      narrowPurpose(route);
      context.phase = "absent-or-false-current-rollback-positive";
      await statePrecheck(route);
      const writer = stateWriter(cell, route);
      context.phase = "separate-companion-writer-preparation";
      context.setupQualification.companion = prepareCompanion(
        cell,
        route,
        writer,
      );
      context.phase = "current-provenance-and-no-retained-recheck";
      await statePrecheck(route);
      context.phase = "actual-state-race";
      const evidence = await observeStateRace(
        cell,
        route,
        writer,
        census(),
        context,
      );
      context.phase = "fresh-post-loss-lane-and-outcome";
      evidence.post_loss = await postLoss(cell, route, writer, context);
      evidence.setup_qualification = context.setupQualification;
      // Successful ordered evidence is emitted only after all post-loss checks.
      console.log(JSON.stringify(credentialFree(evidence)));
      context.phase = "guarded-case-reset";
      resetDisposable("current27");
      assertClean();
    }
  } catch (error) {
    originalError = error;
    if (error.cleanupIncomplete) cleanupSafe = false;
    captureFailure(error, context);
    throw error;
  } finally {
    guardedFinalCleanup(cleanupSafe, originalError);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  test(
    "B3c literal24 state cells (unconditionally blocked before contact)",
    { timeout: 1800000 },
    runStateFixtures,
  );
