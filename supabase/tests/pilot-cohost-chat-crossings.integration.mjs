import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import {
  localTarget,
  sql,
  session,
  until,
  quote,
  resetDisposable,
} from "./helpers/pilot-admission-cohost-chat.mjs";
import {
  host,
  actor,
  target,
  routes,
  auth,
  setup,
  prepare,
  call,
  restoreTarget,
  photoPath,
} from "./helpers/pilot-cohost-chat-fixtures.mjs";
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const stableRows = (rows) =>
  JSON.stringify(
    rows
      .map(canonical)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );
let censusTables;
function snapshot() {
  censusTables ??= JSON.parse(
    sql(
      "select jsonb_agg(table_schema||'.'||table_name order by table_schema,table_name) from information_schema.tables where table_type='BASE TABLE' and table_schema in('public','private')",
    ),
  );
  const parts = censusTables
    .concat("storage.objects")
    .map(
      (table) =>
        `select ${quote(table)} name,coalesce(jsonb_agg(to_jsonb(t)),'[]') rows from ${table} t`,
    );
  parts.push(
    "select 'auth.users' name,coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'email_confirmed_at',email_confirmed_at,'deleted_at',deleted_at,'raw_user_meta_data',raw_user_meta_data,'raw_app_meta_data',raw_app_meta_data)),'[]') rows from auth.users",
  );
  return JSON.parse(
    sql(
      `select jsonb_object_agg(name,rows) from (${parts.join(" union all ")}) census`,
    ),
  );
}
function exactCensus(after, expected) {
  assert.deepEqual(Object.keys(after).sort(), Object.keys(expected).sort());
  for (const table of Object.keys(expected))
    assert.ok(
      stableRows(after[table]) === stableRows(expected[table]),
      `exact complete expected rows: ${table}`,
    );
}
const censusDigest = (state) =>
  Object.fromEntries(
    Object.entries(state).map(([table, rows]) => [
      table,
      { rows: rows.length, sha256: digest(JSON.parse(stableRows(rows))) },
    ]),
  );
const clone = (value) => JSON.parse(JSON.stringify(value));
const findRow = (state, table, key, value) => {
  const rows = state[table].filter((row) => row[key] === value);
  assert.equal(rows.length, 1, table + " unique row");
  return rows[0];
};
const clock = () =>
  Number(sql("select extract(epoch from clock_timestamp())*1000"));
function boundedTime(value, lower, upper, label) {
  const time = Date.parse(value);
  assert.ok(
    Number.isFinite(time) &&
      time >= Math.floor(lower) &&
      time <= Math.ceil(upper),
    label + " server-generated time within observed transaction window",
  );
}
function receiptQuery(r) {
  return call(r)
    .replace(
      "select * from public.send_hangout_message",
      "select 'B3B_RECEIPT:'||jsonb_agg(m)::text from public.send_hangout_message",
    )
    .replace(/;$/, " m;");
}
// All crossings expect commits. Capture the one operation-side actual return;
// both sessions still use the frozen full26 guard and shared wait bound.
async function crossingWait(name, r, writer, writerFirst) {
  const leader = session(name + "_leader"),
    waiter = session(name + "_waiter");
  const sending = ["S", "SR"].includes(r.id);
  const operation = sending
    ? receiptQuery(r)
    : call(r).replace("select public.", "select 'B3B_RESULT:'||public.");
  try {
    leader.send(`begin;${writerFirst ? writer : operation}select 'HELD';`);
    await until(() => leader.output().includes("HELD"));
    waiter.send(
      `begin;${writerFirst ? operation : writer}select 'COMPLETED';commit;`,
    );
    await until(
      () =>
        sql(
          `select count(*) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(name + "_leader")} where w.application_name=${quote(name + "_waiter")} and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`,
        ) === "1",
    );
    const wait = JSON.parse(
      sql(
        `select jsonb_build_object('race',${quote(name)},'holder_pid',h.pid,'waiter_pid',w.pid,'waiting_lock_types',(select jsonb_agg(distinct l.locktype) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(name + "_leader")} where w.application_name=${quote(name + "_waiter")} and h.pid=any(pg_blocking_pids(w.pid))`,
      ),
    );
    assert.notEqual(wait.holder_pid, wait.waiter_pid);
    assert.ok(wait.waiting_lock_types.length > 0);
    leader.send("commit;");
    leader.child.stdin.end();
    waiter.child.stdin.end();
    const results = await Promise.all([leader.done, waiter.done]);
    for (const result of results) {
      assert.equal(result[0], 0);
      assert.equal(result[1], null);
    }
    for (const held of [leader, waiter])
      assert.doesNotMatch(
        held.output(),
        /ERROR:|deadlock|serialize|timeout|40P01|40001|57014|55P03/i,
      );
    assert.match(waiter.output(), /COMPLETED/);
    const output = (writerFirst ? waiter : leader).output();
    const prefix = sending ? "B3B_RECEIPT:" : "B3B_RESULT:";
    const rows = output.split("\n").filter((row) => row.startsWith(prefix));
    assert.equal(rows.length, 1, "one actual operation return");
    return {
      wait,
      receipt: sending
        ? JSON.parse(rows[0].slice(prefix.length))
        : Number(rows[0].slice(prefix.length)),
    };
  } finally {
    leader.child.kill();
    waiter.child.kill();
  }
}
function checkReceipt(receipt) {
  assert.equal(receipt.length, 1);
  const row = receipt[0];
  assert.deepEqual(
    Object.keys(row).sort(),
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
  assert.match(row.message_id, /^[a-f0-9-]{36}$/);
  assert.equal(row.body, "Original fixture message");
  assert.equal(row.mine, true);
  assert.equal(row.author_id, actor);
  assert.equal(row.author_label, null);
}
test(
  "B3b actual eligible-target owner assignment and immutable-host detached Storage DELETE crossings",
  { concurrency: false, timeout: 120000 },
  async () => {
    localTarget();
    const records = [];
    try {
      setup();
      sql(
        "update private.pilot_capabilities set enabled=true where key='onboarding';",
      );
      for (const id of [host, target])
        sql(
          `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${id}/22222222.png','${id}');`,
        );
      for (const d of routes.filter((r) => ["P", "RC"].includes(r.id)))
        for (const order of ["owner-first", "operation-first"]) {
          restoreTarget();
          const r = prepare(d);
          const owner = `${auth(target)}update public.profiles set primary_photo_path='${target}/22222222.png' where user_id='${target}';`;
          sql(`begin;${call(r)}rollback;`);
          const before = snapshot(),
            lower = clock();
          const observed = await crossingWait(
            `b3b_owner_${records.length}`,
            r,
            owner,
            order === "owner-first",
          );
          const upper = clock(),
            after = snapshot(),
            expected = clone(before);
          assert.equal(
            observed.receipt,
            r.revision + 1,
            "actual management revision result",
          );
          const profile = findRow(
            expected,
            "public.profiles",
            "user_id",
            target,
          );
          assert.equal(profile.is_complete, true);
          profile.primary_photo_path = `${target}/22222222.png`;
          profile.revision += 1;
          // Accepted profile enrichment has revision bump only; no profile
          // timestamp/generation columns or additional mutating owner hooks.
          const owned = after["storage.objects"].filter(
            (o) =>
              o.bucket_id === "profile-photos" &&
              o.name === profile.primary_photo_path,
          );
          assert.equal(owned.length, 1);
          assert.equal(owned[0].owner_id, target);
          assert.match(
            owned[0].name,
            new RegExp(`^${target}/[a-f0-9-]+\\.png$`),
          );
          const parent = findRow(expected, "public.hangouts", "id", r.source),
            actualParent = findRow(after, "public.hangouts", "id", r.source);
          parent.revision += 1;
          boundedTime(
            actualParent.updated_at,
            lower,
            upper,
            "published management parent",
          );
          assert.notEqual(
            actualParent.updated_at,
            parent.updated_at,
            "published parent timestamp changes",
          );
          assert.ok(
            Date.parse(actualParent.updated_at) >=
              Date.parse(parent.updated_at),
          );
          parent.updated_at = actualParent.updated_at;
          if (r.id === "P") {
            const added = after["private.hangout_cohosts"].filter(
              (c) => c.hangout_id === r.source && c.account_id === target,
            );
            assert.equal(added.length, 1);
            boundedTime(
              added[0].assigned_at,
              lower,
              upper,
              "promotion assignment",
            );
            expected["private.hangout_cohosts"].push({
              hangout_id: r.source,
              account_id: target,
              assigned_at: added[0].assigned_at,
            });
          } else {
            const participant = expected["public.hangout_participants"].find(
                (p) => p.hangout_id === r.source && p.account_id === target,
              ),
              actual = after["public.hangout_participants"].find(
                (p) => p.hangout_id === r.source && p.account_id === target,
              );
            assert.equal(participant.state, "joined");
            participant.state = "removed";
            for (const field of ["removed_at", "updated_at"]) {
              boundedTime(
                actual[field],
                lower,
                upper,
                "RC participant " + field,
              );
              participant[field] = actual[field];
            }
            for (const peer of [host, actor])
              expected["private.hangout_peer_provenance"].push({
                hangout_id: r.source,
                low_id: [peer, target].sort()[0],
                high_id: [peer, target].sort()[1],
              });
          }
          exactCensus(after, expected);
          records.push({
            id: `L5.owner_primary.${d.id}.target.${order}`,
            ...observed.wait,
            writer:
              "actual authenticated B1 direct owner assignment, approved object locks",
            actual_revision: observed.receipt,
            complete_expected_census_equal: true,
            before: censusDigest(before),
            after: censusDigest(after),
            expected_changes:
              r.id === "P"
                ? [
                    "profile primary path/revision",
                    "parent revision/server timestamp",
                    "exact target assignment",
                  ]
                : [
                    "profile primary path/revision",
                    "parent revision/server timestamp",
                    "target removed state/server timestamps",
                    "exact two departing-target peer provenance pairs",
                  ],
            unrelated_rows_fields_unchanged: true,
          });
          sql(
            `update public.profiles set primary_photo_path='${photoPath(target)}' where user_id='${target}';`,
          );
        }
      for (const d of routes.filter((r) => ["S", "SR"].includes(r.id)))
        for (const order of ["delete-first", "operation-first"]) {
          const r = prepare(d);
          const path = `${host}/${records.length}3333333.png`;
          sql(
            `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${path}','${host}');`,
          );
          const deletion = `set local storage.allow_delete_query='true';${auth(host)}delete from storage.objects where bucket_id='profile-photos' and name='${path}';`;
          sql(`begin;${call(r)}rollback;`);
          const original =
            r.id === "SR"
              ? JSON.parse(
                  sql(
                    `begin;${auth(actor)}select jsonb_agg(m) from public.send_hangout_message('${r.source}','${r.request}','Original fixture message') m;rollback;`,
                  ),
                )
              : null;
          const before = snapshot(),
            lower = clock();
          const observed = await crossingWait(
            `b3b_storage_${records.length}`,
            r,
            deletion,
            order === "delete-first",
          );
          const upper = clock(),
            after = snapshot(),
            expected = clone(before);
          checkReceipt(observed.receipt);
          const detached = expected["storage.objects"].filter(
            (o) => o.bucket_id === "profile-photos" && o.name === path,
          );
          assert.equal(detached.length, 1);
          assert.equal(detached[0].owner_id, host);
          assert.notEqual(
            findRow(before, "public.profiles", "user_id", host)
              .primary_photo_path,
            path,
          );
          expected["storage.objects"] = expected["storage.objects"].filter(
            (o) => o.id !== detached[0].id,
          );
          if (r.id === "SR") {
            assert.ok(
              JSON.stringify(observed.receipt) === JSON.stringify(original),
              "actual crossing retry returns exact original seven fields",
            );
          } else {
            const receipt = observed.receipt[0];
            assert.equal(receipt.sequence, 1);
            boundedTime(
              receipt.created_at,
              lower,
              upper,
              "new message timestamp",
            );
            const conversation = after["private.hangout_conversations"].filter(
              (c) => c.hangout_id === r.source,
            );
            assert.equal(conversation.length, 1);
            assert.match(conversation[0].id, /^[a-f0-9-]{36}$/);
            expected["private.hangout_conversations"].push({
              id: conversation[0].id,
              hangout_id: r.source,
              next_sequence: 2,
            });
            expected["private.hangout_messages"].push({
              id: receipt.message_id,
              conversation_id: conversation[0].id,
              author_id: actor,
              sequence: 1,
              body: "Original fixture message",
              created_at: receipt.created_at,
            });
            expected["private.hangout_message_requests"].push({
              hangout_id: r.source,
              author_id: actor,
              request_id: r.request,
              message_id: receipt.message_id,
              payload_fingerprint: createHash("sha256")
                .update("Original fixture message", "utf8")
                .digest("hex"),
            });
          }
          exactCensus(after, expected);
          records.push({
            id: `L5.storage_delete.${d.id}.host.${order}`,
            ...observed.wait,
            writer:
              "actual authenticated detached-object DELETE; actual operation-side receipt captured; B1 real Storage final service-role HTTP remains separate regression",
            complete_expected_census_equal: true,
            before: censusDigest(before),
            after: censusDigest(after),
            receipt_fields: Object.keys(observed.receipt[0]).sort(),
            receipt_sha256: digest(observed.receipt),
            original_retry_equal: r.id === "SR" ? true : null,
            expected_changes:
              r.id === "SR"
                ? [
                    "one exact detached Storage row removed; every other row/field unchanged",
                  ]
                : [
                    "one exact detached Storage row removed",
                    "one exact conversation next_sequence2",
                    "one exact sequence1 message",
                    "one exact scoped request/fingerprint; gate-off inbox unchanged",
                  ],
            unrelated_rows_fields_unchanged: true,
          });
        }
      records.push(
        {
          id: "L5.profile_storage_inversion",
          classification:
            "actual profile/object row inversion remains possible; inherited fresh B1/B3a modules cover safe abort. No abort counted as successful order.",
        },
        {
          id: "L5.source_bound_auth_account_delete",
          classification:
            "live source/participant FK forbids successful source-bound account/Auth deletion; inherited B3a unsourced Auth safe abort stays separately scoped",
        },
      );
      writeFileSync(
        "agents/handoffs/TASK-021A1b3b-CROSSING-EVIDENCE.json",
        JSON.stringify(records, null, 2) + "\n",
      );
    } finally {
      resetDisposable();
    }
  },
);
