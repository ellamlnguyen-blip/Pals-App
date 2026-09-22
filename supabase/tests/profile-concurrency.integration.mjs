import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
const args = [
  "exec",
  "-i",
  "supabase_db_pals-local",
  "psql",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-At",
];
function sql(query) {
  return execFileSync("docker", args, {
    input: query,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (v) => (output += v));
  child.stderr.on("data", (v) => (output += v));
  child.stdin.write(`set application_name='${name}';\n`);
  return {
    child,
    send: (q) => child.stdin.write(q + "\n"),
    output: () => output,
    done: once(child, "exit"),
  };
}
async function until(check) {
  for (let n = 0; n < 100; n++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error("Concurrency barrier timed out");
}
const id = "60000000-0000-4000-8000-000000000099";
const path = `${id}/aaaaaaaa.png`;
const auth = `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
const assign = `update public.profiles set additional_photo_paths=array['${path}'] where user_id='${id}';`;
const deletion = `set local storage.allow_delete_query='true'; delete from storage.objects where bucket_id='profile-photos' and name='${path}';`;
function reset() {
  sql(
    `update public.profiles set additional_photo_paths='{}' where user_id='${id}'; insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${path}','${id}') on conflict do nothing;`,
  );
}
// No HTTP credentials or hosted URL: all sessions target the named disposable local container.
test("assignment/delete serialization and stale revision compare-and-swap", async () => {
  sql(
    `insert into auth.users(id,email,email_confirmed_at) values('${id}','task006-concurrency@unc.edu',now());`,
  );
  try {
    for (const isolation of ["read committed", "repeatable read"]) {
      for (const first of ["assign", "delete"]) {
        reset();
        const a = session("task006_first"),
          b = session("task006_second");
        try {
          // Capture a snapshot in B before A changes the profile/object.
          b.send(
            `begin isolation level ${isolation}; ${auth} select count(*) from public.profiles; select 'snapshot_ready';`,
          );
          await until(() => b.output().includes("snapshot_ready"));
          a.send(
            `begin; ${auth} ${first === "assign" ? assign : deletion} select 'first_locked';`,
          );
          await until(() => a.output().includes("first_locked"));
          b.send(`${first === "assign" ? deletion : assign} commit;`);
          // Confirm real overlapping database transactions, not merely Promise timing.
          await until(
            () =>
              sql(
                "select count(*) from pg_stat_activity where application_name='task006_second' and wait_event_type='Lock';",
              ) === "1",
          );
          a.send("commit;");
          a.child.stdin.end();
          b.child.stdin.end();
          const [aCode] = await a.done;
          await b.done;
          assert.equal(aCode, 0, a.output());
          const unsafe = sql(
            `select count(*) from public.profiles p where '${path}'=any(p.additional_photo_paths) and not exists(select 1 from storage.objects where bucket_id='profile-photos' and name='${path}');`,
          );
          assert.equal(
            unsafe,
            "0",
            `${isolation}/${first}: never orphan a reference`,
          );
          if (first === "assign")
            assert.equal(
              sql(`select count(*) from storage.objects where name='${path}'`),
              "1",
              "assigned object survives concurrent delete",
            );
          else
            assert.equal(
              sql(
                `select cardinality(additional_photo_paths) from public.profiles where user_id='${id}'`,
              ),
              "0",
              "deleted object cannot be assigned",
            );
        } finally {
          a.child.kill();
          b.child.kill();
        }
      }
    }
    reset();
    sql(`begin;${auth}${assign}commit;`);
    const competingRevision = sql(
      `select revision from public.profiles where user_id='${id}'`,
    );
    const replace = session("task006_replace"),
      remove = session("task006_remove");
    try {
      replace.send(
        `begin;${auth} update public.profiles set additional_photo_paths='{}' where user_id='${id}' and revision=${competingRevision};select 'replacement_locked';`,
      );
      await until(() => replace.output().includes("replacement_locked"));
      remove.send(
        `begin;${auth} with changed as(update public.profiles set additional_photo_paths=array['${path}'] where user_id='${id}' and revision=${competingRevision} returning *) select 'changed='||count(*) from changed;commit;`,
      );
      await until(
        () =>
          sql(
            "select count(*) from pg_stat_activity where application_name='task006_remove' and wait_event_type='Lock';",
          ) === "1",
      );
      replace.send("commit;");
      replace.child.stdin.end();
      remove.child.stdin.end();
      await replace.done;
      await remove.done;
      assert.ok(
        remove.output().includes("changed=0"),
        "overlapping stale photo mutation cannot resurrect detached reference",
      );
    } finally {
      replace.child.kill();
      remove.child.kill();
    }
    reset();
    const version = sql(
      `select revision from public.profiles where user_id='${id}'`,
    );
    sql(`begin;${auth}${assign}commit;`);
    const changed = sql(
      `begin;${auth}with changed as(update public.profiles set additional_photo_paths='{}' where user_id='${id}' and revision=${version} returning *) select 'changed='||count(*) from changed;commit;`,
    );
    assert.ok(
      changed.includes("changed=0"),
      "stale editor cannot restore/remove references",
    );
  } finally {
    sql(
      `update public.profiles set additional_photo_paths='{}' where user_id='${id}';set storage.allow_delete_query='true';delete from storage.objects where owner_id='${id}';delete from auth.users where id='${id}';`,
    );
  }
});
