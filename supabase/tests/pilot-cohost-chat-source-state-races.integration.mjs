import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import {
  localTarget,
  sql,
  race,
  resetDisposable,
} from "./helpers/pilot-admission-cohost-chat.mjs";
import {
  host,
  actor,
  target,
  campus,
  routes,
  auth,
  setup,
  prepare,
  call,
  census,
  censusQuery,
  restoreTarget,
  denialFor,
} from "./helpers/pilot-cohost-chat-fixtures.mjs";
const currentRevision = (r) =>
  `(select revision from public.hangouts where id='${r.source}')`;
// Separate privileged serialization statement precedes argument evaluation.
// The actual writer RPC still runs as its authenticated subject, using a fresh
// READ COMMITTED statement snapshot after the public social prefix is held.
const wrapped = (id, body) =>
  `select private.social_hangout_mutation_lock();${auth(id)}${body}reset role;`;
test(
  "B3b actual source, role, participant, assignment and bilateral-block transitions",
  { concurrency: false, timeout: 600000 },
  async () => {
    localTarget();
    const records = [];
    try {
      setup();
      function clearBlocks() {
        restoreTarget(); // Ready cleanup caller before actual public unblocks.
        for (const [from, to] of [
          [actor, host],
          [host, actor],
          [actor, target],
          [target, actor],
          [host, target],
          [target, host],
        ])
          sql(
            `begin;${auth(from)}select public.set_safety_block('${to}',false);commit;`,
          );
      }
      const receipt = (r) =>
        JSON.parse(
          sql(
            `begin;${call(r).replace("select * from public.send_hangout_message", "select jsonb_agg(m) from public.send_hangout_message").replace(/;$/, " m;")}rollback;`,
          ),
        );
      const chatCensus = () => {
        const state = JSON.parse(census());
        return JSON.stringify(
          Object.fromEntries(
            ["conversations", "messages", "requests", "notifications"].map(
              (key) => [key, state[key]],
            ),
          ),
        );
      };
      function retainedSendPositive(r, original, chatBefore) {
        assert.equal(
          sql(
            `select state from public.hangout_participants where hangout_id='${r.source}' and account_id='${actor}'`,
          ),
          "joined",
        );
        assert.equal(
          sql(
            `select count(*) from private.hangout_cohosts where hangout_id='${r.source}' and account_id='${actor}'`,
          ),
          "0",
        );
        const before = census(),
          result = receipt(r);
        assert.equal(result.length, 1);
        assert.deepEqual(
          Object.keys(result[0]).sort(),
          [
            "message_id",
            "sequence",
            "body",
            "created_at",
            "mine",
            "author_id",
            "author_label",
          ].sort(),
        );
        assert.equal(result[0].body, "Original fixture message");
        assert.equal(result[0].mine, true);
        assert.equal(result[0].author_id, actor);
        assert.equal(result[0].author_label, null);
        assert.ok(
          census() === before,
          "positive fresh rollback receipt changes no census",
        );
        if (r.id === "SR") {
          assert.ok(
            JSON.stringify(result) === JSON.stringify(original),
            "exact original seven-field retry after role-only loss",
          );
          assert.ok(
            chatCensus() === chatBefore,
            "retry and role-only writer change no chat/ledger/sequence/inbox state",
          );
        }
      }
      async function cell(
        definition,
        label,
        writer,
        { extra = false, terminal = false, survives = false } = {},
      ) {
        for (const order of ["loss-first", "operation-first"]) {
          clearBlocks();
          restoreTarget();
          const r = prepare(definition, { inactiveTarget: false });
          if (survives && ["S", "SR"].includes(r.id))
            sql(
              `insert into private.hangout_cohosts(hangout_id,account_id) values('${r.source}','${actor}');`,
            );
          const original = survives && r.id === "SR" ? receipt(r) : null;
          const chatBefore = survives ? chatCensus() : null;
          const operation = call(r);
          sql(`begin;${operation}rollback;`);
          const loss = writer(r);
          const lossFirst = order === "loss-first";
          const denial = denialFor(r, extra);
          const result = await race(
            `b3b_state_${records.length}`,
            lossFirst ? loss : operation,
            lossFirst ? operation : loss,
            lossFirst && !survives
              ? denial
              : !lossFirst && terminal
                ? "Hangout operation not permitted"
                : null,
            lossFirst && !survives ? censusQuery : null,
          );
          if (lossFirst && !survives)
            assert.deepEqual(
              JSON.parse(census()),
              result.holder_snapshot,
              label + " denial changes no retained records",
            );
          if (survives) retainedSendPositive(r, original, chatBefore);
          records.push({
            id: `L3.state.${label}.${r.id}.${order}`,
            action: r.id,
            order,
            ...result,
            classification:
              !lossFirst && terminal
                ? "first operation committed; terminal competing writer lawfully denied/rolled back, not successful committed-loss credit"
                : survives
                  ? "role-only loss preserves still-joined send authority"
                  : !lossFirst &&
                      label === "required_assignment_delete" &&
                      r.id === "SD"
                    ? "step-down already consumed assignment; later privileged DELETE affects zero rows, not fresh committed-loss credit"
                    : "actual observed wait and expected commit/denial",
            writer:
              label.startsWith("disable") || label.includes("delete")
                ? "privileged synthetic maintenance; actual role/report regressions separate"
                : "actual authenticated public lifecycle/management/block writer",
          });
          if (
            label.includes("departure") ||
            label.includes("target_leave") ||
            label.includes("target_remove")
          ) {
            const subject = label.includes("target") ? target : actor;
            assert.equal(
              sql(
                `select count(*) from private.hangout_cohosts where hangout_id='${r.source}' and account_id='${subject}'`,
              ),
              "0",
              "departure atomically tears down assignment",
            );
          }
        }
      }
      for (const d of routes) {
        clearBlocks();
        await cell(
          d,
          "disable",
          (r) =>
            `select private.social_hangout_mutation_lock();select id from public.hangouts where id='${r.source}' for update;with report as(insert into private.safety_reports(reporter_id,target_type,target_id,category,provenance_kind,provenance_ref_id) values('${actor}','hangout','${r.source}','harassment','current_hangout','${r.source}') returning id) insert into private.hangout_disables(report_id,hangout_id,operator_id,request_id,subject_campus_id,reason) select id,'${r.source}','${host}',gen_random_uuid(),'${campus}','B3b synthetic disable' from report;`,
        );
        if (d.id !== "RH")
          await cell(
            d,
            "cancel",
            (r) =>
              wrapped(
                host,
                `select public.cancel_hangout('${r.source}',${currentRevision(r)});`,
              ),
            { extra: true },
          );
        for (const isolation of ["repeatable read", "serializable"]) {
          restoreTarget();
          const r = prepare(d);
          const before = census();
          assert.throws(
            () => sql(`begin isolation level ${isolation};${call(r)}commit;`),
            /42501:.*Safety operation unavailable/,
          );
          assert.equal(census(), before);
          records.push({
            id: `L1.${d.id}.${isolation}`,
            classification: "social-first exact denial, no state/body delta",
          });
        }
      }
      await cell(
        routes.find((r) => r.id === "D"),
        "required_assignment_demote",
        (r) =>
          wrapped(
            host,
            `select public.demote_hangout_cohost('${r.source}','${target}',${currentRevision(r)});`,
          ),
        { terminal: true },
      );
      for (const d of routes.filter((r) => ["P", "RC"].includes(r.id))) {
        await cell(
          d,
          "target_leave",
          (r) => wrapped(target, `select public.leave_hangout('${r.source}');`),
          { terminal: d.id === "RC" },
        );
        await cell(
          d,
          "target_remove",
          (r) =>
            wrapped(
              host,
              `select public.remove_hangout_participant('${r.source}','${target}',${currentRevision(r)});`,
            ),
          { terminal: d.id === "RC" },
        );
        await cell(
          d,
          "assignment_insert",
          (r) =>
            wrapped(
              host,
              `select public.promote_hangout_cohost('${r.source}','${target}',${currentRevision(r)});`,
            ),
          { terminal: true },
        );
      }
      const roleRoutes = routes
        .filter((r) => ["RC", "SD", "S", "SR"].includes(r.id))
        .concat([
          {
            ...routes.find((r) => r.id === "SD"),
            id: "E",
            rpc: "edit_hangout",
          },
          {
            ...routes.find((r) => r.id === "SD"),
            id: "J",
            rpc: "set_hangout_joining",
          },
        ]);
      for (const d of roleRoutes) {
        clearBlocks();
        // S/SR start with a retained designation solely for role-only positive controls.
        const decorated = { ...d };
        for (const order of ["loss-first", "operation-first"]) {
          restoreTarget();
          const r = prepare(decorated);
          if (["S", "SR"].includes(d.id))
            sql(
              `insert into private.hangout_cohosts(hangout_id,account_id) values('${r.source}','${actor}');`,
            );
          sql(`begin;${call(r)}rollback;`);
          const original = d.id === "SR" ? receipt(r) : null;
          const chatBefore = ["S", "SR"].includes(d.id) ? chatCensus() : null;
          const loss = wrapped(
            host,
            `select public.demote_hangout_cohost('${r.source}','${actor}',${currentRevision(r)});`,
          );
          const first = order === "loss-first";
          const survives = ["S", "SR"].includes(d.id);
          const result = await race(
            `b3b_role_${records.length}`,
            first ? loss : call(r),
            first ? call(r) : loss,
            first && !survives
              ? "Hangout operation not permitted"
              : !first && d.id === "SD"
                ? "Hangout operation not permitted"
                : null,
          );
          if (survives) retainedSendPositive(r, original, chatBefore);
          records.push({
            id: `L3.state.public_demote.${d.id}.${order}`,
            ...result,
            classification:
              !first && d.id === "SD"
                ? "step-down committed; demotion terminal denial, no committed-loss credit"
                : survives
                  ? "joined send/retry remains authorized after designation loss"
                  : "effective role revocation enforced",
          });
        }
        await cell(
          d,
          "public_step_down",
          (r) =>
            wrapped(
              actor,
              `select public.step_down_hangout_cohost('${r.source}',${currentRevision(r)});`,
            ),
          { terminal: d.id === "SD", survives: ["S", "SR"].includes(d.id) },
        );
        if (!["S", "SR"].includes(d.id)) {
          await cell(
            d,
            "required_assignment_delete",
            (r) =>
              `delete from private.hangout_cohosts where hangout_id='${r.source}' and account_id='${actor}';`,
          );
        }
        await cell(
          d,
          "actor_leave_departure",
          (r) => wrapped(actor, `select public.leave_hangout('${r.source}');`),
          { extra: true },
        );
        await cell(
          d,
          "actor_remove_departure",
          (r) =>
            wrapped(
              host,
              `select public.remove_hangout_participant('${r.source}','${actor}',${currentRevision(r)});`,
            ),
          { extra: true },
        );
        for (const reverse of [false, true])
          await cell(
            d,
            `actor_host_block_${reverse ? "reverse" : "forward"}_departure`,
            () =>
              wrapped(
                reverse ? host : actor,
                `select public.set_safety_block('${reverse ? actor : host}',true);`,
              ),
            { extra: true },
          );
      }
      for (const d of routes.filter((r) => ["RC", "P"].includes(r.id)))
        for (const reverse of [false, true])
          await cell(
            d,
            `actor_target_block_${reverse ? "reverse" : "forward"}`,
            () =>
              wrapped(
                reverse ? target : d.id === "P" ? host : actor,
                `select public.set_safety_block('${reverse ? (d.id === "P" ? host : actor) : target}',true);`,
              ),
          );
      // Required acquired-row deletion must fail the original waiting lookup.
      // A later separately inserted fresh tuple never rescues that failed call.
      // Same-transaction INSERT would hold parent FK KEY SHARE and test an
      // earlier parent wait, so it is not mislabeled an old lower-row lookup.
      clearBlocks();
      for (const d of routes.filter((r) =>
        ["RH", "RC", "P", "SD", "S", "SR"].includes(r.id),
      )) {
        for (const subject of ["RH", "P"].includes(d.id)
          ? [target]
          : d.id === "RC"
            ? [actor, target]
            : [actor]) {
          for (const order of ["loss-first", "operation-first"]) {
            restoreTarget();
            const r = prepare(d, { inactiveTarget: false });
            sql(`begin;${call(r)}rollback;`);
            const replacement = `delete from public.hangout_participants where hangout_id='${r.source}' and account_id='${subject}';`;
            const first = order === "loss-first";
            const result = await race(
              `b3b_tuple_${records.length}`,
              first ? replacement : call(r),
              first ? call(r) : replacement,
              first ? denialFor(r, true) : null,
              first ? censusQuery : null,
            );
            if (first)
              assert.deepEqual(JSON.parse(census()), result.holder_snapshot);
            records.push({
              id: `L3.state.participant_delete_replace.${d.id}.${subject}.${order}`,
              ...result,
              classification: first
                ? "required old lookup absent; FK assignment cascade; immediate denial before separate fresh replacement"
                : "operation commits before trusted row deletion; no client role/participation restoration claim",
            });
            sql(
              `insert into public.hangout_participants(hangout_id,account_id,state) values('${r.source}','${subject}','joined');`,
            );
            assert.equal(
              sql(
                `select count(*) from private.hangout_cohosts where hangout_id='${r.source}' and account_id='${subject}'`,
              ),
              "0",
              "fresh privileged replacement never restores cascaded assignment",
            );
          }
        }
      }
      writeFileSync(
        "agents/handoffs/TASK-021A1b3b-SOURCE-STATE-EVIDENCE.json",
        JSON.stringify(records, null, 2) + "\n",
      );
    } finally {
      resetDisposable();
    }
  },
);
