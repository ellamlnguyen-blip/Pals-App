// Disposable negative control only: never installs/replaces a database function or grants EXECUTE.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  localTarget,
  sql,
  quote,
  session,
  until,
  resetDisposable,
} from "./helpers/pilot-admission-source-safety.mjs";
const operator = "b2600000-0000-4000-8000-000000000001";
function blocked(name, holder) {
  return sql(
    `select jsonb_build_object('holder_pid',h.pid,'waiter_pid',w.pid,'ungranted_lock_types',(select jsonb_agg(distinct locktype) from pg_locks where pid=w.pid and not granted)) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(holder)} where w.application_name=${quote(name)} and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks where pid=w.pid and not granted)`,
  );
}
test(
  "disposable pre-repair anonymous-body barrier negative control",
  { concurrency: false, timeout: 120000 },
  async () => {
    localTarget();
    const deletion = session("b2_diagnostic_delete");
    const barrier = session("b2_diagnostic_barrier");
    const diagnostic = session("b2_diagnostic_body");
    try {
      sql(
        `insert into auth.users(id,email,email_confirmed_at) values('${operator}','negative-control@unc.edu',now());insert into public.platform_roles(user_id,role) values('${operator}','moderator');update private.moderation_feature_gate set enabled=true;`,
      );
      // Trusted postgres runs only the extracted historical body as an anonymous DO.
      // Its auth.uid() is synthetic. This is not authenticated RPC or HTTP evidence.
      const original = readFileSync(
        "supabase/migrations/20260924000100_local_moderation_review.sql",
        "utf8",
      );
      let body = original.slice(
        original.indexOf("declare actor uuid:=auth.uid();"),
        original.indexOf(
          "end; $$;",
          original.indexOf("declare actor uuid:=auth.uid();"),
        ) + 4,
      );
      assert.ok(!body.includes("if not found"));
      body = body.replace(
        "perform 1 from public.platform_roles where user_id=actor for share;",
        "perform 1 from public.platform_roles where user_id=actor for share;\n  raise notice 'ROLE_LOCK_FOUND=%',found;\n  perform pg_advisory_xact_lock(19121,1);",
      );
      body = body.replace(
        "return actor;",
        "raise notice 'PRE_REPAIR_AUTHORIZED';",
      );
      barrier.send(
        "begin;select pg_advisory_xact_lock(19121,1);select 'BARRIER_HELD';",
      );
      deletion.send(
        `begin;delete from public.platform_roles where user_id='${operator}';select 'DELETE_HELD';`,
      );
      await until(
        () =>
          barrier.output().includes("BARRIER_HELD") &&
          deletion.output().includes("DELETE_HELD"),
      );
      diagnostic.send(
        `begin;set local request.jwt.claims=${quote(JSON.stringify({ sub: operator, role: "authenticated" }))};do $diagnostic$${body}$diagnostic$;select 'DIAGNOSTIC_HELD';`,
      );
      await until(
        () => blocked("b2_diagnostic_body", "b2_diagnostic_delete") !== "",
      );
      const deleteWait = JSON.parse(
        blocked("b2_diagnostic_body", "b2_diagnostic_delete"),
      );
      deletion.send("commit;");
      deletion.child.stdin.end();
      assert.equal((await deletion.done)[0], 0);
      await until(
        () =>
          diagnostic.output().includes("ROLE_LOCK_FOUND=f") &&
          blocked("b2_diagnostic_body", "b2_diagnostic_barrier") !== "",
      );
      const barrierWait = JSON.parse(
        blocked("b2_diagnostic_body", "b2_diagnostic_barrier"),
      );
      sql(
        `insert into public.platform_roles(user_id,role) values('${operator}','moderator');`,
      );
      barrier.send("commit;");
      barrier.child.stdin.end();
      assert.equal((await barrier.done)[0], 0);
      await until(() => diagnostic.output().includes("DIAGNOSTIC_HELD"));
      assert.match(diagnostic.output(), /PRE_REPAIR_AUTHORIZED/);
      // Bounded timeout here fails the negative control if replacement is unexpectedly locked.
      sql(
        `begin;set local lock_timeout='1s';delete from public.platform_roles where user_id='${operator}';commit;`,
      );
      assert.equal(
        sql(
          `select count(*) from public.platform_roles where user_id='${operator}'`,
        ),
        "0",
      );
      assert.equal(
        sql(
          "select state from pg_stat_activity where application_name='b2_diagnostic_body'",
        ),
        "idle in transaction",
      );
      diagnostic.send("rollback;");
      diagnostic.child.stdin.end();
      assert.equal((await diagnostic.done)[0], 0);
      assert.doesNotMatch(diagnostic.output(), /ERROR:/);
      console.log(
        JSON.stringify({
          negative_control_only: true,
          original_source: "20260924000100_local_moderation_review.sql",
          actual_sql_role: "postgres",
          synthetic_auth_uid: operator,
          missing_role_lock_result: false,
          delete_wait: deleteWait,
          explicit_barrier_wait: barrierWait,
          replacement_delete_committed_while_diagnostic_transaction_open: true,
          shipped_function_changed: false,
          grants_added: false,
        }),
      );
    } finally {
      deletion.child.kill();
      barrier.child.kill();
      diagnostic.child.kill();
      resetDisposable();
    }
  },
);
