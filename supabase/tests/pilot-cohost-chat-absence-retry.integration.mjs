import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
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
  manager,
  routes,
  auth,
  setup,
  prepare,
  call,
  query,
  census,
  restoreTarget,
} from "./helpers/pilot-cohost-chat-fixtures.mjs";
test(
  "B3b L4 every actual route/subject missing admission plus actual manager activation, and immutable retry results",
  { concurrency: false, timeout: 120000 },
  async () => {
    localTarget();
    const records = [];
    try {
      setup();
      for (const d of routes)
        for (const [label, subject] of Object.entries(d.subjects)) {
          restoreTarget();
          const r = prepare(d);
          sql(`begin;${call(r)}rollback;`);
          sql(
            `begin;select private.social_hangout_mutation_lock();select private.pilot_evidence_write_lock();delete from private.pilot_account_admission where account_id='${subject}';commit;`,
          );
          const before = census();
          assert.throws(
            () => sql(`begin;${call(r)}rollback;`),
            /42501:.*Hangout operation not permitted/,
          );
          assert.equal(census(), before);
          sql(
            `begin;${auth(manager)}select public.set_pilot_account_admission('${subject}','active',0,'B3b absent-row activation','${randomUUID()}');commit;`,
          );
          sql(`begin;${call(r)}rollback;`);
          records.push({
            id: `L4.${d.id}.${label}`,
            classification:
              "fresh absence denies with no delta; actual manager revision0 activation permits later same action. Two activation wait orders are not claimed; roster-delete waiter is individually in L2.",
          });
        }
      for (const d of routes.filter((r) => ["S", "SR"].includes(r.id)))
        for (const sender of [actor, host]) {
          const r = prepare({ ...d, subject: sender });
          const response = JSON.parse(
            sql(
              `begin;${auth(sender)}select jsonb_agg(m) from public.send_hangout_message('${r.source}','${r.request}','Original fixture message') m;commit;`,
            ),
          );
          assert.equal(response.length, 1);
          assert.deepEqual(
            Object.keys(response[0]).sort(),
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
          assert.equal(response[0].mine, true);
          assert.equal(response[0].author_id, sender);
          assert.equal(response[0].author_label, null);
          const before = census();
          const retried = JSON.parse(
            sql(
              `begin;${auth(sender)}select jsonb_agg(m) from public.send_hangout_message('${r.source}','${r.request}',E'\\tOriginal fixture message\\n') m;commit;`,
            ),
          );
          assert.deepEqual(retried, response);
          assert.equal(census(), before);
          assert.throws(
            () => sql(`begin;${call(r, { body: "Mismatch" })}commit;`),
            /23505:.*Message request conflict/,
          );
          assert.equal(census(), before);
          const other = sender === host ? actor : host;
          sql(`begin;${auth(other)}${query(r)}commit;`);
          assert.equal(
            sql(
              `select count(*) from private.hangout_message_requests where hangout_id='${r.source}' and request_id='${r.request}'`,
            ),
            "2",
          );
          records.push({
            id: `L1.retry.${d.id}.${sender}`,
            classification:
              "exact normalized seven-field replay unchanged census; mismatched own key conflict; other actor same key creates own immutable message, never original sender replay",
          });
        }
      const r = prepare(routes.find((r) => r.id === "S"));
      sql(`begin;${call(r)}rollback;`);
      const duplicateSql = `${auth(actor)}select 'B3B_RECEIPT:'||jsonb_agg(m)::text from public.send_hangout_message('${r.source}','${r.request}','Original fixture message') m;`;
      const result = await race(
        "b3b_duplicate_send",
        duplicateSql,
        duplicateSql,
        null,
        null,
        "B3B_RECEIPT:",
      );
      assert.equal(
        sql(
          `select count(*) from private.hangout_message_requests where hangout_id='${r.source}' and author_id='${actor}' and request_id='${r.request}'`,
        ),
        "1",
      );
      assert.equal(
        sql(
          `select count(*) from private.hangout_messages m join private.hangout_conversations c on c.id=m.conversation_id where c.hangout_id='${r.source}'`,
        ),
        "1",
      );
      assert.equal(
        sql(
          `select next_sequence from private.hangout_conversations where hangout_id='${r.source}'`,
        ),
        "2",
      );
      records.push({
        id: "L5.concurrent_same_key",
        ...result,
        classification:
          "one immutable message/request/sequence; both authorized calls return same original key result (complete concurrent receipt equality asserted in held SQL sessions; HTTP permission separately actual)",
      });
      // Original notification hook is optional delivery, independent of chat
      // admission. Its late row lock remains real even when delivery is disabled.
      for (const order of ["gate-first", "message-first"]) {
        sql("update private.notification_feature_gate set enabled=true;");
        const notify = prepare(routes.find((r) => r.id === "S"));
        sql(`begin;${call(notify)}rollback;`);
        const off =
          "update private.notification_feature_gate set enabled=false;";
        const observation = await race(
          `b3b_notification_${order}`,
          order === "gate-first" ? off : call(notify),
          order === "gate-first" ? call(notify) : off,
        );
        assert.equal(
          sql(
            `select count(*) from private.notification_items where source_kind='hangout_chat' and target_id='${notify.source}'`,
          ),
          order === "gate-first" ? "0" : "2",
          "original late gate controls delivery only",
        );
        const snapshot = census();
        sql(`begin;${call(notify)}commit;`);
        assert.equal(
          census(),
          snapshot,
          "retry never emits notification or advances sequence",
        );
        records.push({
          id: `L5.optional_notification.${order}`,
          ...observation,
          classification:
            "real late notification-gate wait; authorized message stands, delivery suppressed or original2 recipients; exact retry no delta",
        });
      }
      writeFileSync(
        "agents/handoffs/TASK-021A1b3b-ABSENCE-RETRY-EVIDENCE.json",
        JSON.stringify(records, null, 2) + "\n",
      );
    } finally {
      resetDisposable();
    }
  },
);
