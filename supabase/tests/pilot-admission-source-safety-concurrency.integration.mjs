import assert from "node:assert/strict";
import test from "node:test";
import {
  localTarget,
  sql,
  quote,
  race,
  resetDisposable,
} from "./helpers/pilot-admission-source-safety.mjs";
const host = "b2400000-0000-4000-8000-000000000001",
  actor = "b2400000-0000-4000-8000-000000000002",
  operator = "b2400000-0000-4000-8000-000000000003",
  hangout = "b2400000-0000-4000-8001-000000000001",
  request = "b2400000-0000-4000-8002-000000000001";
const auth = (id) =>
  `set local role authenticated;set local request.jwt.claims=${quote(JSON.stringify({ sub: id, role: "authenticated" }))};`;
test(
  "B2 existing source/safety locks and repaired mandatory operator row locks",
  { concurrency: false, timeout: 120000 },
  async () => {
    localTarget();
    const records = [];
    try {
      sql(
        `begin;insert into auth.users(id,email,email_confirmed_at) values('${host}','b2-lock-host@unc.edu',now()),('${actor}','b2-lock-actor@unc.edu',now()),('${operator}','b2-lock-operator@unc.edu',now());insert into storage.objects(bucket_id,name,owner_id) select 'profile-photos',id::text||'/11111111.png',id::text from public.accounts;update public.profiles set real_name='Lock fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path=user_id::text||'/11111111.png';insert into private.pilot_account_admission(account_id,state,revision) values('${host}','active',1),('${actor}','active',1);insert into public.platform_roles(user_id,role) values('${operator}','moderator');update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=true where key in('hangouts','hangout_chat');update private.hangout_feature_gate set enabled=true;update private.safety_feature_gate set enabled=true;update private.moderation_feature_gate set enabled=true;insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude) values('${hangout}','${host}','00000000-0000-4000-8000-000000000001','Lock source',now()+interval '1 day','Approximate',35.91,-79.05);insert into public.hangout_participants(hangout_id,account_id,state) values('${hangout}','${host}','joined'),('${hangout}','${actor}','joined');commit;`,
      );
      const roster = `${auth(actor)}select * from public.list_hangout_roster_roles('${hangout}',null,1);`;
      records.push(
        await race(
          "b2_reader_account_loss_first",
          `update public.accounts set status='suspended' where id='${actor}';`,
          roster,
          "Hangout operation not permitted",
        ),
      );
      assert.equal(
        sql(`select status from public.accounts where id='${actor}'`),
        "suspended",
      );
      sql(`update public.accounts set status='active' where id='${actor}'`);
      records.push(
        await race(
          "b2_reader_first",
          roster,
          `update public.accounts set status='suspended' where id='${actor}';`,
        ),
      );
      assert.throws(
        () => sql(`begin;${roster}rollback;`),
        /Hangout operation not permitted/,
      );
      sql(
        `update public.accounts set status='active' where id='${actor}';update private.pilot_availability set enabled=false;`,
      );
      const submit = `${auth(actor)}select * from public.submit_safety_report('${request}','hangout_host','${hangout}','harassment');`;
      sql(`begin;${submit}commit;`);
      records.push(
        await race(
          "b2_retained_retry_gate_loss_first",
          "update private.safety_feature_gate set enabled=false;",
          submit,
          "Safety report unavailable",
        ),
      );
      sql("update private.safety_feature_gate set enabled=true;");
      records.push(
        await race(
          "b2_retained_retry_first",
          submit,
          "update private.safety_feature_gate set enabled=false;",
        ),
      );
      assert.equal(
        sql(
          `select count(*) from private.safety_report_requests where reporter_id='${actor}'`,
        ),
        "1",
      );
      const queue = `${auth(operator)}select * from public.list_moderation_reports(null,null,1);`;
      const operatorCensus = () =>
        sql(
          `select jsonb_build_object('cases',(select jsonb_agg(c order by report_id) from private.moderation_cases c),'reports',(select jsonb_agg(r order by id) from private.safety_reports r),'audit',(select count(*) from private.moderation_audit))`,
        );
      const beforeRoleLoss = operatorCensus();
      records.push(
        await race(
          "b2_operator_role_loss_first",
          `delete from public.platform_roles where user_id='${operator}';`,
          queue,
          "Moderation unavailable",
        ),
      );
      assert.equal(
        operatorCensus(),
        beforeRoleLoss,
        "missing role attempt changes no case/report/audit",
      );
      // Reinsertion follows completed denial; this is not a reproduction of the old replacement gap.
      sql(
        `insert into public.platform_roles(user_id,role) values('${operator}','moderator')`,
      );
      records.push(
        await race(
          "b2_operator_queue_first",
          queue,
          `delete from public.platform_roles where user_id='${operator}';`,
        ),
      );
      assert.throws(
        () => sql(`begin;${queue}rollback;`),
        /Moderation unavailable/,
      );
      sql(
        `insert into public.platform_roles(user_id,role) values('${operator}','moderator')`,
      );
      for (const [label, loss, restore] of [
        [
          "gate_delete",
          "delete from private.moderation_feature_gate where singleton;",
          "insert into private.moderation_feature_gate(singleton,enabled) values(true,true);",
        ],
        [
          "gate_disable",
          "update private.moderation_feature_gate set enabled=false where singleton;",
          "update private.moderation_feature_gate set enabled=true where singleton;",
        ],
        [
          "account_suspend",
          `update public.accounts set status='suspended' where id='${operator}';`,
          `update public.accounts set status='active' where id='${operator}';`,
        ],
      ]) {
        records.push(
          await race(
            `b2_operator_${label}_loss_first`,
            loss,
            queue,
            "Moderation unavailable",
          ),
        );
        assert.throws(
          () => sql(`begin;${queue}rollback;`),
          /42501:.*Moderation unavailable/,
        );
        sql(restore);
        records.push(
          await race(`b2_operator_${label}_operation_first`, queue, loss),
        );
        assert.throws(
          () => sql(`begin;${queue}rollback;`),
          /42501:.*Moderation unavailable/,
        );
        sql(restore);
      }
      // This operator has not reported or enforced: account DELETE is legal and cascades role.
      records.push(
        await race(
          "b2_operator_account_delete_loss_first",
          `delete from public.accounts where id='${operator}';`,
          queue,
          "Moderation unavailable",
        ),
      );
      assert.equal(
        sql(`select count(*) from auth.users where id='${operator}'`),
        "1",
      );
      assert.equal(
        sql(
          `select count(*) from public.platform_roles where user_id='${operator}'`,
        ),
        "0",
      );
      assert.throws(
        () =>
          sql(
            `insert into public.platform_roles(user_id,role) values('${operator}','moderator')`,
          ),
        /23503:/,
      );
      const recreateAccount = `insert into public.accounts(id) values('${operator}');insert into public.platform_roles(user_id,role) values('${operator}','moderator');`;
      sql(recreateAccount);
      records.push(
        await race(
          "b2_operator_account_delete_operation_first",
          queue,
          `delete from public.accounts where id='${operator}';`,
        ),
      );
      assert.throws(
        () => sql(`begin;${queue}rollback;`),
        /42501:.*Moderation unavailable/,
      );
      sql(recreateAccount);
      // Actual reporter FK is RESTRICT; its attempted deletion must fail, never count as a race.
      assert.throws(
        () => sql(`delete from public.accounts where id='${actor}'`),
        /23503:/,
      );
      assert.equal(
        sql(`select count(*) from public.accounts where id='${actor}'`),
        "1",
      );
      console.log(
        JSON.stringify({
          observed_lock_cases: records,
          new_pilot_locks: false,
          scope:
            "existing source actor, retained exact retry safety gate, unadmitted operator role; no B3 admission/write claim",
        }),
      );
    } finally {
      resetDisposable();
    }
  },
);
