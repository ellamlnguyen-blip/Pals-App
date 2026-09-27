import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import {
  localTarget,
  sql,
  quote,
  race,
  session,
  until,
  resetDisposable,
} from "./helpers/pilot-admission-lifecycle.mjs";
import {
  host,
  actor,
  routes,
  auth,
  setup,
  prepare,
  call,
} from "./helpers/pilot-lifecycle-fixtures.mjs";
test(
  "B3a L5 actual owner assignment crossing and external Auth/account safe abort",
  { concurrency: false, timeout: 120000 },
  async () => {
    localTarget();
    const records = [];
    try {
      setup();
      sql(
        `update private.pilot_capabilities set enabled=true where key='onboarding';insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${actor}/22222222.png','${actor}');`,
      );
      const edit = routes.find((r) => r.id === "edit");
      const assign = `${auth(actor)}update public.profiles set primary_photo_path='${actor}/22222222.png' where user_id='${actor}';`;
      prepare(edit);
      records.push(
        await race("b3a_owner_assignment_first", assign, call(edit)),
      );
      sql(
        `update public.profiles set primary_photo_path='${actor}/11111111.png' where user_id='${actor}';`,
      );
      prepare(edit);
      records.push(
        await race("b3a_ordinary_before_owner_assignment", call(edit), assign),
      );
      const old = "b3a00000-0000-4000-8000-000000000088",
        replacement = "b3a00000-0000-4000-8000-000000000089";
      sql(
        `insert into auth.users(id,email,email_confirmed_at) values('${old}','b3a-replaced@unc.edu',now());insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${old}/11111111.png','${old}');update public.profiles set real_name='Old fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path='${old}/11111111.png' where user_id='${old}';insert into private.pilot_account_admission(account_id,state,revision) values('${old}','active',1);`,
      );
      const oldCreate = `${auth(old)}select public.create_hangout(gen_random_uuid(),'Deleted account',now()+interval '1 day','Approximate',35.91,-79.05);`;
      sql(`begin;${oldCreate}rollback;`);
      records.push(
        await race(
          "b3a_new_create_auth_delete_first",
          `delete from auth.users where id='${old}';`,
          oldCreate,
          "Hangout operation not permitted",
        ),
      );
      sql(
        `insert into auth.users(id,email,email_confirmed_at) values('${replacement}','b3a-replaced@unc.edu',now());`,
      );
      assert.equal(
        sql(
          `select count(*) from private.pilot_account_admission where account_id in ('${old}','${replacement}')`,
        ),
        "0",
      );
      assert.throws(
        () => sql(`begin;${oldCreate}rollback;`),
        /42501:.*Hangout operation not permitted/,
      );
      assert.throws(
        () =>
          sql(
            `begin;${auth(replacement)}select public.create_hangout(gen_random_uuid(),'Replacement',now()+interval '1 day','Approximate',35.91,-79.05);rollback;`,
          ),
        /42501:.*Hangout operation not permitted/,
      );
      records.push({
        cell: "new-create Auth/account deletion",
        classification:
          "delete-first observed; mutation-first creates retained FK and makes Auth/account deletion unlawful, so no fabricated successful delete order; different UUID/same email inherits no admission",
      });
      const id = "b3a00000-0000-4000-8000-000000000099";
      sql(
        `insert into auth.users(id,email,email_confirmed_at) values('${id}','b3a-external-auth@unc.edu',now());insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${id}/11111111.png','${id}');update public.profiles set real_name='External fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path='${id}/11111111.png' where user_id='${id}';insert into private.pilot_account_admission(account_id,state,revision) values('${id}','active',1);`,
      );
      const provider = session("b3a_cycle_auth");
      const ordinary = session("b3a_cycle_ordinary");
      try {
        provider.send(
          `begin;set local deadlock_timeout='2s';select id from auth.users where id='${id}' for update;select 'HELD';`,
        );
        await until(() => provider.output().includes("HELD"));
        ordinary.send(
          `begin;set local deadlock_timeout='2s';${auth(id)}select public.create_hangout(gen_random_uuid(),'External crossing',now()+interval '1 day','Approximate',35.91,-79.05);commit;`,
        );
        const blocked = (waiter, holder) =>
          sql(
            `select count(*) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(holder)} where w.application_name=${quote(waiter)} and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`,
          ) === "1";
        await until(() => blocked("b3a_cycle_ordinary", "b3a_cycle_auth"));
        provider.send(`delete from auth.users where id='${id}';commit;`);
        await until(() => blocked("b3a_cycle_auth", "b3a_cycle_ordinary"));
        const observed = JSON.parse(
          sql(
            `select jsonb_agg(jsonb_build_object('pid',a.pid,'name',a.application_name,'blocked_by',pg_blocking_pids(a.pid),'ungranted',(select jsonb_agg(l.locktype) from pg_locks l where l.pid=a.pid and not l.granted))) from pg_stat_activity a where application_name in('b3a_cycle_auth','b3a_cycle_ordinary')`,
          ),
        );
        ordinary.child.stdin.end();
        provider.child.stdin.end();
        const results = await Promise.all([ordinary.done, provider.done]);
        assert.equal(
          results.filter((r) => r[0] !== 0).length,
          1,
          "one actual PostgreSQL abort and one survivor",
        );
        assert.match(ordinary.output() + provider.output(), /40P01:/);
        assert.doesNotMatch(
          ordinary.output() + provider.output(),
          /timeout|57014|55P03/i,
        );
        const sourceCount = Number(
          sql(`select count(*) from public.hangouts where host_id='${id}'`),
        );
        assert.equal(
          sourceCount,
          results[0][0] === 0 ? 1 : 0,
          "aborted ordinary create writes no partial parent",
        );
        assert.equal(
          Number(
            sql(
              `select count(*) from private.hangout_create_requests where host_id='${id}'`,
            ),
          ),
          sourceCount,
          "ledger atomic with survivor source",
        );
        assert.equal(
          Number(
            sql(
              `select count(*) from public.hangout_participants p join public.hangouts h on h.id=p.hangout_id where h.host_id='${id}'`,
            ),
          ),
          sourceCount,
          "host participant atomic",
        );
        records.push({
          classification: "40P01 safe abort, not successful commit order",
          observed,
          ordinary_committed: results[0][0] === 0,
        });
      } finally {
        ordinary.child.kill();
        provider.child.kill();
      }
      writeFileSync(
        "agents/handoffs/TASK-021A1b3a-CROSSING-EVIDENCE.json",
        JSON.stringify(records, null, 2) + "\n",
      );
    } finally {
      resetDisposable();
    }
  },
);
