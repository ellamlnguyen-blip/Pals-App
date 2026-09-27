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
  routes,
  setup,
  prepare,
  call,
  auth,
  census,
  censusQuery,
} from "./helpers/pilot-lifecycle-fixtures.mjs";
test(
  "B3a individual bilateral host/peer block and current joined authority races",
  { concurrency: false, timeout: 1200000 },
  async () => {
    localTarget();
    const records = [];
    try {
      for (const route of routes.filter((r) =>
        ["edit", "joining", "join", "noop", "leave"].includes(r.id),
      ))
        for (const direction of ["actor-to-host", "host-to-actor"])
          for (const order of ["loss-first", "mutation-first"]) {
            resetDisposable();
            setup();
            prepare(route);
            sql(`update private.safety_feature_gate set enabled=true;`);
            const query = call(route);
            sql(`begin;${query}rollback;`);
            const loss = `${auth(direction === "actor-to-host" ? actor : host)}select public.set_safety_block('${direction === "actor-to-host" ? host : actor}',true);reset role;`;
            const record = await race(
              `b3a_${route.id}_${direction}_${order}`,
              order === "loss-first" ? loss : query,
              order === "loss-first" ? query : loss,
              order === "loss-first" ? "Hangout operation not permitted" : null,
              order === "loss-first" ? censusQuery : null,
            );
            if (order === "loss-first")
              assert.deepEqual(
                JSON.parse(census()),
                record.holder_snapshot,
                "failed lifecycle adds no changes beyond public block reconciliation",
              );
            assert.throws(
              () => sql(`begin;${query}rollback;`),
              /42501:.*Hangout operation not permitted/,
            );
            records.push({
              ...record,
              route: route.id,
              direction,
              order,
              writer:
                "actual authenticated set_safety_block, retained evidence, existing reconciliation",
            });
          }
      for (const route of routes.filter((r) =>
        ["edit", "joining", "leave"].includes(r.id),
      ))
        for (const order of ["loss-first", "mutation-first"]) {
          resetDisposable();
          setup();
          prepare(route);
          const query = call(route);
          sql(`begin;${query}rollback;`);
          const loss = `select private.social_hangout_mutation_lock();select id from public.hangouts where id='${hangout}' for update;delete from public.hangout_participants where hangout_id='${hangout}' and account_id='${actor}';`;
          const record = await race(
            `b3a_${route.id}_joined_member_delete_${order}`,
            order === "loss-first" ? loss : query,
            order === "loss-first" ? query : loss,
            order === "loss-first" ? "Hangout operation not permitted" : null,
            order === "loss-first" ? censusQuery : null,
          );
          if (order === "loss-first")
            assert.deepEqual(JSON.parse(census()), record.holder_snapshot);
          assert.throws(
            () => sql(`begin;${query}rollback;`),
            /42501:.*Hangout operation not permitted/,
          );
          records.push({
            ...record,
            route: route.id,
            order,
            writer:
              "lawful privileged parent-bound participant deletion; FK cohost cascade; no retained attendance fixture",
          });
        }
      const peer = "b3a00000-0000-4000-8000-000000000004";
      for (const route of routes.filter((r) => ["join", "noop"].includes(r.id)))
        for (const direction of ["actor-to-peer", "peer-to-actor"])
          for (const order of ["loss-first", "mutation-first"]) {
            resetDisposable();
            setup();
            sql(
              `insert into auth.users(id,email,email_confirmed_at) values('${peer}','b3a-peer@unc.edu',now());insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${peer}/11111111.png','${peer}');update public.profiles set real_name='Peer fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path='${peer}/11111111.png' where user_id='${peer}';insert into private.pilot_account_admission(account_id,state,revision) values('${peer}','active',1);update private.safety_feature_gate set enabled=true;`,
            );
            prepare(route);
            // Actual public peer join both creates current source membership and retains
            // existing overlap provenance; actor may be left for genuine join case.
            sql(
              `begin;${auth(peer)}select public.join_hangout('${hangout}');commit;`,
            );
            if (route.id === "join") {
              sql(
                `begin;${auth(actor)}select public.join_hangout('${hangout}');select public.leave_hangout('${hangout}');commit;`,
              );
            }
            const query = call(route);
            sql(`begin;${query}rollback;`);
            const loss = `${auth(direction === "actor-to-peer" ? actor : peer)}select public.set_safety_block('${direction === "actor-to-peer" ? peer : actor}',true);reset role;`;
            // Reconciliation requires both subjects currently joined. Genuine join
            // leaves actor outside that pair: peer-first block leaves peer joined and
            // join denies. Mutation-first join creates the pair, so peer blocker leaves.
            // Joined no-op also has the pair; peer blocker leaves and no-op remains allowed.
            const expectedDenial =
              order === "loss-first" &&
              (direction === "actor-to-peer" || route.id === "join");
            const record = await race(
              `b3a_${route.id}_${direction}_${order}`,
              order === "loss-first" ? loss : query,
              order === "loss-first" ? query : loss,
              expectedDenial ? "Hangout operation not permitted" : null,
              expectedDenial ? censusQuery : null,
            );
            if (expectedDenial)
              assert.deepEqual(JSON.parse(census()), record.holder_snapshot);
            if (direction === "actor-to-peer" || expectedDenial)
              assert.throws(
                () => sql(`begin;${query}rollback;`),
                /42501:.*Hangout operation not permitted/,
              );
            else sql(`begin;${query}rollback;`);
            records.push({
              ...record,
              route: route.id,
              direction,
              order,
              classification:
                direction === "actor-to-peer" || expectedDenial
                  ? "joined blocked peer remains; actor join/noop denies (genuine join loss-first has no shared-current pair to reconcile)"
                  : "shared-current pair exists; peer blocker leaves itself, no joined blocked peer remains and actor join/noop is permitted",
            });
          }
      records.push({
        route: "create/retry/cancel",
        classification:
          "actor=immutable host; bilateral host-self block forbidden. Peer block may remove peer and does not prohibit ready host creation/exact retry/cancellation. No invented distinct host authority cell.",
      });
      writeFileSync(
        "agents/handoffs/TASK-021A1b3a-BLOCK-MEMBERSHIP-EVIDENCE.json",
        JSON.stringify(records, null, 2) + "\n",
      );
    } finally {
      resetDisposable();
    }
  },
);
