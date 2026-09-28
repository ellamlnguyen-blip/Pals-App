// Authoring only: inert imports and zero serial wait credit.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  sql,
  quote,
  localTarget,
  resetDisposable,
  assertClean,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  routes,
  prepare,
  caseIds,
  auth,
  census,
  assertOutcome,
  assertCurrentOnly,
} from "./helpers/pilot-current-safety-fixtures.mjs";
import {
  bounds,
  precheck,
  lossDefinition,
  assertLoss,
  assertDenied,
  executeSuccess,
  assertSuccess,
  exactSnapshot,
  dynamicTime,
  requireReviewedPolicyTransport,
} from "./pilot-admission-current-safety-concurrency.integration.mjs";
export const absenceManifest = Object.freeze([
  {
    id: "L4.CH.availability_missing.serial",
    route: "CH",
    loss: "availability_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CH.purpose_missing.serial",
    route: "CH",
    loss: "purpose_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CH.source_gate_missing.serial",
    route: "CH",
    loss: "source_gate_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CH.safety_gate_missing.serial",
    route: "CH",
    loss: "safety_gate_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CH.actor.roster_missing.serial",
    route: "CH",
    loss: "actor.roster_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CH.immutable_host.roster_missing.serial",
    route: "CH",
    loss: "immutable_host.roster_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CH.actor.activate_later",
    route: "CH",
    subject: "actor",
    partition: "serial-authorized-manager-activation-after-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CH.immutable_host.activate_later",
    route: "CH",
    subject: "immutable_host",
    partition: "serial-authorized-manager-activation-after-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CP.availability_missing.serial",
    route: "CP",
    loss: "availability_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CP.purpose_missing.serial",
    route: "CP",
    loss: "purpose_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CP.source_gate_missing.serial",
    route: "CP",
    loss: "source_gate_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CP.safety_gate_missing.serial",
    route: "CP",
    loss: "safety_gate_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CP.actor.roster_missing.serial",
    route: "CP",
    loss: "actor.roster_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CP.peer.roster_missing.serial",
    route: "CP",
    loss: "peer.roster_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CP.actor.activate_later",
    route: "CP",
    subject: "actor",
    partition: "serial-authorized-manager-activation-after-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CP.peer.activate_later",
    route: "CP",
    subject: "peer",
    partition: "serial-authorized-manager-activation-after-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CB.availability_missing.serial",
    route: "CB",
    loss: "availability_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CB.purpose_missing.serial",
    route: "CB",
    loss: "purpose_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CB.source_gate_missing.serial",
    route: "CB",
    loss: "source_gate_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CB.safety_gate_missing.serial",
    route: "CB",
    loss: "safety_gate_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CB.actor.roster_missing.serial",
    route: "CB",
    loss: "actor.roster_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CB.peer.roster_missing.serial",
    route: "CB",
    loss: "peer.roster_missing",
    partition: "serial-absence-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CB.actor.activate_later",
    route: "CB",
    subject: "actor",
    partition: "serial-authorized-manager-activation-after-denial",
    status: "unexecuted",
  },
  {
    id: "L4.CB.peer.activate_later",
    route: "CB",
    subject: "peer",
    partition: "serial-authorized-manager-activation-after-denial",
    status: "unexecuted",
  },
]);
const reason = "B3c later activation";
function activationExpectation(
  route,
  subject,
  before,
  after,
  result,
  request,
  window,
) {
  assert.deepEqual(result, { state: "active", revision: 1 });
  const row = after["private.pilot_account_admission"].find(
    (r) => r.account_id === subject,
  );
  assert.ok(row);
  dynamicTime(row.created_at, window);
  dynamicTime(row.updated_at, window);
  const audit = after["private.pilot_management_audit"].filter(
    (r) => r.actor_id === route.manager && r.request_id === request,
  );
  assert.equal(audit.length, 1);
  const a = audit[0];
  assert.match(a.id, /^[0-9a-f-]{36}$/);
  dynamicTime(a.occurred_at, window);
  const expected = {
    "private.pilot_account_admission": [
      ...before["private.pilot_account_admission"],
      {
        account_id: subject,
        state: "active",
        revision: 1,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    ],
    "private.pilot_management_audit": [
      ...before["private.pilot_management_audit"],
      {
        id: a.id,
        actor_id: route.manager,
        operation: "admission",
        target_id: subject,
        policy_key: null,
        previous_value: null,
        new_value: "active",
        previous_revision: 0,
        new_revision: 1,
        reason,
        request_id: request,
        occurred_at: a.occurred_at,
      },
    ],
    "private.pilot_management_requests": [
      ...before["private.pilot_management_requests"],
      {
        actor_id: route.manager,
        request_id: request,
        fingerprint: ["admission", subject, "active", 0, reason],
        result_value: "active",
        result_revision: 1,
        audit_id: a.id,
      },
    ],
  };
  return assertOutcome({
    result,
    expectedResult: { state: "active", revision: 1 },
    before,
    after,
    expectedAfter: exactSnapshot(before, after, expected),
  });
}
export async function runAbsenceFixtures() {
  requireReviewedPolicyTransport();
  const matrix = JSON.parse(
    readFileSync(
      new URL(
        "../../agents/handoffs/TASK-021A1b3c-MATRIX.json",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(absenceManifest, matrix.serial_cells);
  assert.equal(absenceManifest.length, 24);
  localTarget("current27");
  assertClean();
  let cleanupSafe = true;
  try {
    for (const cell of absenceManifest) {
      const route = prepare(
        routes.find((r) => r.id === cell.route),
        { caseKey: cell.id },
      );
      await precheck(route);
      const activation =
        cell.partition === "serial-authorized-manager-activation-after-denial";
      const subjectName = activation
        ? cell.subject
        : cell.loss.includes(".roster_missing")
          ? cell.loss.split(".")[0]
          : undefined;
      const loss = lossDefinition(
        {
          id: cell.id,
          loss: subjectName ? "roster_delete" : cell.loss,
          subject: subjectName,
        },
        route,
      );
      const before = census();
      sql(`${bounds}begin;${loss.sql}commit;`);
      const missing = census();
      assertLoss(before, missing, loss, route);
      assertCurrentOnly(route);
      assertDenied(route, missing, caseIds(cell.id + ".denied").request);
      if (activation) {
        // The absent-first call has completed and denied before activation starts.
        // Revision0 real manager activation admits a NEW call; no phantom wait.
        const subject = route.subjects[cell.subject],
          request = caseIds(cell.id + ".activate").request;
        const start = sql("select clock_timestamp()::text");
        const result = JSON.parse(
          sql(
            `${bounds}begin;${auth(route.manager)}select to_jsonb(q) from public.set_pilot_account_admission(${quote(subject)},'active',0,${quote(reason)},${quote(request)}) q;commit;`,
          ),
        );
        const admitted = census();
        activationExpectation(
          route,
          subject,
          missing,
          admitted,
          result,
          request,
          { start, end: sql("select clock_timestamp()::text") },
        );
        assertCurrentOnly(route);
        const freshRequest = caseIds(cell.id + ".fresh-eligible").request;
        const success = await executeSuccess(route, { request: freshRequest });
        assertSuccess(
          route,
          admitted,
          success.snapshot,
          success.result,
          freshRequest,
        );
        assertOutcome({
          result: "committed fresh call",
          expectedResult: "committed fresh call",
          before: success.snapshot,
          after: census(),
        });
        console.log(
          JSON.stringify({
            id: cell.id,
            writer:
              "authenticated set_pilot_account_admission expected revision0",
            result,
            absence_denial: {
              code: "42501",
              message:
                route.id === "CB"
                  ? "Safety operation unavailable"
                  : "Safety report unavailable",
            },
            later_call: "fresh eligible current success",
            full54_values_verified: true,
            observed_wait_credit: 0,
          }),
        );
      } else {
        if (
          loss.table === "private.pilot_availability" ||
          loss.table === "private.pilot_capabilities"
        ) {
          const key =
            loss.table === "private.pilot_availability"
              ? "availability"
              : route.purpose;
          assert.throws(
            () =>
              sql(
                `${bounds}begin;${auth(route.manager)}select * from public.set_pilot_policy(${quote(key)},true,0,${quote(reason)},${quote(caseIds(cell.id + ".cannot-recreate").request)});commit;`,
              ),
            (e) =>
              e.message ===
              "Disposable SQL error: 42501: Pilot management unavailable",
          );
          assertOutcome({
            result: "manager cannot recreate mandatory policy",
            expectedResult: "manager cannot recreate mandatory policy",
            before: missing,
            after: census(),
          });
        }
        // Restoration is privileged synthetic preparation; manager policy APIs
        // cannot recreate a missing singleton/capability. Restore exact old values.
        const original = before[loss.table].find((r) =>
          loss.table === "private.pilot_account_admission"
            ? r.account_id === loss.subject
            : loss.table === "private.pilot_capabilities"
              ? r.key === loss.key
              : r.singleton,
        );
        sql(
          `${bounds}begin;select private.pilot_evidence_write_lock();insert into ${loss.table} select * from jsonb_populate_record(null::${loss.table},${quote(JSON.stringify(original))}::jsonb);commit;`,
        );
        assertOutcome({
          result: "privileged exact fixture replacement",
          expectedResult: "privileged exact fixture replacement",
          before,
          after: census(),
        });
        assertCurrentOnly(route);
        const fresh = await executeSuccess(route, {
          rollback: true,
          request: caseIds(cell.id + ".replacement-fresh").request,
        });
        assertSuccess(
          route,
          before,
          fresh.snapshot,
          fresh.result,
          caseIds(cell.id + ".replacement-fresh").request,
        );
        assertOutcome({
          result: "replacement precheck rolled back",
          expectedResult: "replacement precheck rolled back",
          before,
          after: census(),
        });
        console.log(
          JSON.stringify({
            id: cell.id,
            writer: loss.writer,
            result: {
              code: "42501",
              message:
                route.id === "CB"
                  ? "Safety operation unavailable"
                  : "Safety report unavailable",
            },
            later_replacement:
              "privileged setup permits NEW rolled-back eligible call",
            full54_values_verified: true,
            observed_wait_credit: 0,
          }),
        );
      }
      resetDisposable("current27");
    }
  } catch (error) {
    if (error.cleanupIncomplete) cleanupSafe = false;
    throw error;
  } finally {
    if (cleanupSafe) {
      resetDisposable("current27");
      assertClean();
    }
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  test(
    "B3c exact24 serial absence/activation cells (requires separate serial release)",
    { timeout: 900_000 },
    runAbsenceFixtures,
  );
