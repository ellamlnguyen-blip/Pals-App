import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  localTarget,
  sql,
  race,
  resetDisposable,
} from "./pilot-admission-cohost-chat.mjs";
import {
  routes,
  manager,
  auth,
  setup,
  prepare,
  call,
  census,
  censusQuery,
  identityLoss,
  restoreTarget,
  denialFor,
} from "./pilot-cohost-chat-fixtures.mjs";
const matrix = JSON.parse(
  readFileSync("agents/handoffs/TASK-021A1b3b-MATRIX.json", "utf8"),
);
function policyLoss(cell, route) {
  const subject = route.subjects[cell.subject];
  const prefix =
    "select private.social_hangout_mutation_lock();select private.pilot_evidence_write_lock();";
  if (cell.loss === "roster_revoke") {
    const revision = sql(
      `select revision from private.pilot_account_admission where account_id='${subject}'`,
    );
    return [
      `${auth(manager)}select public.set_pilot_account_admission('${subject}','revoked',${revision},'B3b observed manager revoke','${randomUUID()}');reset role;`,
      `update private.pilot_account_admission set state='active' where account_id='${subject}';`,
      "actual authenticated approved manager RPC",
    ];
  }
  if (cell.loss === "roster_delete")
    return [
      `${prefix}delete from private.pilot_account_admission where account_id='${subject}';`,
      `insert into private.pilot_account_admission(account_id,state,revision) values('${subject}','active',1);`,
      "privileged missing-row maintenance using approved exclusive prefix; not manager deletion permission",
    ];
  const dimensions = {
    availability: [
      "private.pilot_availability",
      "singleton",
      "insert into private.pilot_availability(singleton,enabled,revision) values(true,true,1);",
    ],
    hangouts_capability: [
      "private.pilot_capabilities",
      "key='hangouts'",
      "insert into private.pilot_capabilities(key,enabled,revision) values('hangouts',true,1);",
    ],
    chat_capability: [
      "private.pilot_capabilities",
      "key='hangout_chat'",
      "insert into private.pilot_capabilities(key,enabled,revision) values('hangout_chat',true,1);",
    ],
    hangout_gate: [
      "private.hangout_feature_gate",
      "singleton",
      "insert into private.hangout_feature_gate(singleton,enabled) values(true,true);",
    ],
    chat_gate: [
      "private.hangout_chat_feature_gate",
      "singleton",
      "insert into private.hangout_chat_feature_gate(singleton,enabled) values(true,true);",
    ],
  };
  const dimension = cell.loss.replace(/_(off|missing)$/, "");
  const [table, where, insert] = dimensions[dimension];
  const missing = cell.loss.endsWith("missing");
  return [
    `${dimension.includes("gate") ? "" : prefix}${missing ? `delete from ${table} where ${where};` : `update ${table} set enabled=false where ${where};`}`,
    missing ? insert : `update ${table} set enabled=true where ${where};`,
    "privileged exact-row policy/gate maintenance; actual manager policy regression separate",
  ];
}
export async function runMatrix(tier) {
  localTarget();
  const cells = matrix.cells.filter(
    (c) => c.id.startsWith(`${tier}.`) && c.partition === "actual",
  );
  assert.equal(cells.length, tier === "L2" ? 152 : 272);
  const observed = [];
  try {
    setup();
    for (const cell of cells) {
      restoreTarget();
      const route = prepare(routes.find((r) => r.id === cell.action));
      const [loss, restore, writer] =
        tier === "L2"
          ? policyLoss(cell, route)
          : [
              ...identityLoss(cell.loss, route.subjects[cell.subject]),
              "privileged direct evidence-row writer",
            ];
      assert.ok(loss, cell.id + " concrete writer required");
      const action = call(route);
      sql(`begin;${action}rollback;`); // independently eligible same-action control
      const replacement = cell.loss.endsWith("delete_replace");
      const deny = denialFor(route, cell.loss.startsWith("chat_"));
      const lossFirst = cell.order === "loss-first";
      const record = await race(
        `b3b_${observed.length}_${tier}`,
        lossFirst ? loss : action,
        lossFirst ? action : loss,
        lossFirst ? deny : null,
        lossFirst ? censusQuery : null,
      );
      if (lossFirst)
        assert.deepEqual(
          JSON.parse(census()),
          record.holder_snapshot,
          cell.id + " no denied message/revision/assignment/ledger/event delta",
        );
      if (replacement) {
        // A fresh statement may see the lawful replacement, but the waiting
        // required-row lookup must deny rather than authorize unlocked substitution.
        if (lossFirst) sql(`begin;${action}rollback;`);
      } else {
        assert.throws(
          () => sql(`begin;${action}rollback;`),
          new RegExp(`42501:.*${deny}`),
          cell.id + " fresh authority denial",
        );
      }
      observed.push({
        id: cell.id,
        action: cell.action,
        subject: cell.subject ?? null,
        loss: cell.loss,
        order: cell.order,
        writer,
        ...record,
        observation: "observed",
        evidence: "actual wait and successful expected outcome",
        post_loss_serial_control_limit:
          !lossFirst && !["S", "SR"].includes(route.id)
            ? "management may have consumed target/role/revision; serial denial is not independent identity attribution (route SQL/HTTP guards separately actual)"
            : null,
        replacement_poststate: replacement
          ? "fresh replacement eligible; operation-first may have consumed role/revision"
          : null,
      });
      if (restore) sql(restore);
      restoreTarget();
    }
    assert.equal(new Set(observed.map((r) => r.id)).size, cells.length);
    const mappings =
      tier === "L3"
        ? matrix.cells
            .filter((c) => c.partition !== "actual")
            .map((c) => ({
              ...c,
              evidence:
                "source-cleared common mapping; runtime representative must independently pass",
              observation: observed.some((r) => r.id === c.mapping_id)
                ? "actual representative observed"
                : "unobserved",
            }))
        : [];
    for (const c of mappings)
      assert.ok(
        observed.some((r) => r.id === c.mapping_id),
        c.id + " representative observed",
      );
    writeFileSync(
      `agents/handoffs/TASK-021A1b3b-${tier}-EVIDENCE.json`,
      JSON.stringify(
        {
          actual: observed,
          common_equivalent: mappings,
          evidence_limits:
            "No failed/timeout/abort receives successful-order credit; retained-state/source/crossing/HTTP/catalog/regression obligations separate",
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    resetDisposable();
  }
}
