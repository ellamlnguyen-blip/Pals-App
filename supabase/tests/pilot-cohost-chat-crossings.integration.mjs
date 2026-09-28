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
  target,
  routes,
  auth,
  setup,
  prepare,
  call,
  restoreTarget,
  photoPath,
} from "./helpers/pilot-cohost-chat-fixtures.mjs";
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
          records.push({
            id: `L5.owner_primary.${d.id}.target.${order}`,
            ...(await race(
              `b3b_owner_${records.length}`,
              order === "owner-first" ? owner : call(r),
              order === "owner-first" ? call(r) : owner,
            )),
            writer:
              "actual authenticated B1 direct owner assignment, approved object locks",
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
          records.push({
            id: `L5.storage_delete.${d.id}.host.${order}`,
            ...(await race(
              `b3b_storage_${records.length}`,
              order === "delete-first" ? deletion : call(r),
              order === "delete-first" ? call(r) : deletion,
            )),
            writer:
              "actual authenticated detached-object DELETE, observed immutable-host profile-row wait; B1 real Storage final service-role HTTP is separate regression",
          });
          assert.equal(
            sql(
              `select count(*) from storage.objects where bucket_id='profile-photos' and name='${path}'`,
            ),
            "0",
          );
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
