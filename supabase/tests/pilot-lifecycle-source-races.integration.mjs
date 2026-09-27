import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import {
  localTarget,
  sql,
  race,
  resetDisposable,
} from "./helpers/pilot-admission-lifecycle.mjs";
import {
  host,
  actor,
  hangout,
  campus,
  requestId,
  routes,
  setup,
  prepare,
  call,
  census,
} from "./helpers/pilot-lifecycle-fixtures.mjs";
test(
  "B3a L2 source disable/state authority per actual existing-source public route",
  { concurrency: false, timeout: 600000 },
  async () => {
    localTarget();
    const records = [];
    try {
      for (const route of routes.filter((r) => r.id !== "create"))
        for (const order of ["loss-first", "mutation-first"]) {
          resetDisposable();
          setup();
          prepare(route);
          const query = call(route);
          sql(`begin;${query}rollback;`);
          const source =
            route.id === "retry"
              ? sql(
                  `select hangout_id from private.hangout_create_requests where host_id='${host}' and request_id='${requestId}'`,
                )
              : hangout;
          // Privileged synthetic evidence is lawful and immutable; no DELETE/UPDATE
          // restoration. Real report/operator authority is separately HTTP/regressed.
          const loss = `select private.social_hangout_mutation_lock();select id from public.hangouts where id='${source}' for update;with report as(insert into private.safety_reports(reporter_id,target_type,target_id,category,provenance_kind,provenance_ref_id) values('${actor}','hangout','${source}','harassment','current_hangout','${source}') returning id) insert into private.hangout_disables(report_id,hangout_id,operator_id,request_id,subject_campus_id,reason) select id,'${source}','${host}',gen_random_uuid(),'${campus}','Local disable crossing' from report;`;
          const before = census();
          records.push({
            ...(await race(
              `b3a_${route.id}_disable_${order}`,
              order === "loss-first" ? loss : query,
              order === "loss-first" ? query : loss,
              order === "loss-first" ? "Hangout operation not permitted" : null,
            )),
            route: route.id,
            order,
            writer:
              "privileged synthetic immutable evidence; operator authority separately covered",
          });
          if (order === "loss-first") assert.equal(census(), before);
          assert.throws(
            () => sql(`begin;${query}rollback;`),
            /42501:.*Hangout operation not permitted/,
          );
        }
      for (const route of routes.filter((r) =>
        ["edit", "cancel", "join", "noop", "joining"].includes(r.id),
      ))
        for (const order of ["loss-first", "mutation-first"]) {
          // Cancel itself is terminal. A second cancellation cannot be a successful
          // source-state writer after its commit; disable above supplies that route's
          // independently applicable revocation race.
          if (route.id === "cancel" && order === "mutation-first") {
            records.push({
              route: "cancel",
              order,
              classification:
                "terminal cancel cannot be cancelled a second time; applicable disable writer both orders observed separately",
            });
            continue;
          }
          resetDisposable();
          setup();
          prepare(route);
          const query = call(route);
          const loss = `select private.social_hangout_mutation_lock();update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1,updated_at=clock_timestamp() where id='${hangout}';`;
          const before = census();
          records.push({
            ...(await race(
              `b3a_${route.id}_cancelled_${order}`,
              order === "loss-first" ? loss : query,
              order === "loss-first" ? query : loss,
              order === "loss-first" ? "Hangout operation not permitted" : null,
            )),
            route: route.id,
            order,
          });
          if (order === "loss-first")
            assert.equal(
              sql(
                `select count(*) from public.hangout_participants where hangout_id='${hangout}' and state='joined'`,
              ),
              route.id === "join" ? "1" : "2",
            );
          assert.throws(
            () => sql(`begin;${query}rollback;`),
            /42501:.*Hangout operation not permitted/,
          );
        }
      records.push(
        {
          route: "create",
          classification:
            "new source has no existing parent/immutable second host; no fabricated source-state or disable race",
        },
        {
          route: "retry",
          classification:
            "cancelled source remains readable to its host; exact retry is allowed by inherited source rules; disable still denies",
        },
        {
          route: "leave",
          classification:
            "cancelled source still permits currently joined nonhost leave; disable denies",
        },
      );
      writeFileSync(
        "agents/handoffs/TASK-021A1b3a-SOURCE-RACE-EVIDENCE.json",
        JSON.stringify(records, null, 2) + "\n",
      );
    } finally {
      resetDisposable();
    }
  },
);
