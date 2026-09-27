import assert from "node:assert/strict";
import test from "node:test";
import {
  localTarget,
  sql,
  quote,
  ok,
  restoreDefaults,
  session,
  trusted,
  auth,
} from "./helpers/pilot-admission-owner.mjs";

test(
  "real Auth/PostgREST/Storage owner lifecycle and stale JWT loss",
  { concurrency: false, timeout: 120000 },
  async () => {
    const { request, rpc, status, key } = localTarget();
    const users = [];
    const objects = [];
    const signup = async (
      email = `pilot-owner-${crypto.randomUUID()}@unc.edu`,
    ) => {
      const password = `Local-only-${crypto.randomUUID()}`;
      const created = ok(
        await request("/auth/v1/signup", null, { email, password }),
      );
      const id = created.user?.id ?? created.id;
      users.push(id);
      sql(
        `update auth.users set email_confirmed_at=now() where id=${quote(id)}`,
      );
      const login = ok(
        await request("/auth/v1/token?grant_type=password", null, {
          email,
          password,
        }),
      );
      return { id, token: login.access_token, email };
    };
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
      "base64",
    );
    const api = async (
      path,
      user,
      method = "GET",
      body,
      content = "application/json",
    ) => {
      const r = await fetch(`${status.API_URL}${path}`, {
        method,
        headers: {
          apikey: key,
          authorization: `Bearer ${user.token}`,
          "content-type": content,
        },
        ...(body === undefined
          ? {}
          : { body: content === "image/png" ? body : JSON.stringify(body) }),
      });
      const raw = await r.text();
      return { status: r.status, body: raw ? JSON.parse(raw) : null };
    };
    const denied = (r) =>
      assert.ok(r.status >= 400, `expected denied, got ${r.status}`);
    const patch = async (user, path) =>
      api(
        `/rest/v1/profiles?user_id=eq.${user.id}&revision=eq.${sql(`select revision from public.profiles where user_id='${user.id}'`)}`,
        user,
        "PATCH",
        {
          real_name: "Synthetic Owner",
          major: "Math",
          bio: "Local",
          graduation_year: 2028,
          primary_photo_path: path,
        },
      );
    try {
      sql(
        `create table private.pilot_owner_http_guard_probe(original_role text,subject uuid,executor text,operation text);revoke all on private.pilot_owner_http_guard_probe from public,anon,authenticated,service_role;create function private.pilot_owner_http_guard_probe() returns trigger language plpgsql security definer set search_path='' as $$begin insert into private.pilot_owner_http_guard_probe values(current_setting('role',true),auth.uid(),session_user,tg_op);if tg_op='DELETE' then return old;end if;return new;end;$$;revoke all on function private.pilot_owner_http_guard_probe() from public,anon,authenticated,service_role;create trigger pals_owner_http_guard_probe before insert or delete on storage.objects for each row execute function private.pilot_owner_http_guard_probe();`,
      );
      const owner = await signup();
      const peer = await signup();
      const manager = await signup();
      sql(trusted(manager.id, "active", 0));
      assert.equal(
        ok(await rpc("get_access_state", owner.token, {})),
        "pilot_unavailable",
      );
      assert.deepEqual(
        ok(
          await request(
            `/rest/v1/profiles?user_id=eq.${owner.id}`,
            owner.token,
          ),
        ),
        [],
      );
      sql(
        `begin;select private.pilot_evidence_write_lock();update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=true where key='onboarding';insert into private.pilot_account_admission(account_id,state,revision) values('${owner.id}','active',1);commit`,
      );
      assert.equal(
        ok(await rpc("get_access_state", owner.token, {})),
        "onboarding",
      );
      const first = `${owner.id}/${crypto.randomUUID()}.png`,
        second = `${owner.id}/${crypto.randomUUID()}.png`;
      objects.push(first, second);
      const upload = (path) =>
        api(
          `/storage/v1/object/profile-photos/${path}`,
          owner,
          "POST",
          png,
          "image/png",
        );
      assert.equal((await upload(first)).status, 200);
      assert.equal(
        sql(
          `select count(*) from private.pilot_owner_http_guard_probe where original_role='service_role' and executor='supabase_storage_admin' and subject is null`,
        ),
        "1",
        "real final Storage service role probe: " +
          sql(
            `select jsonb_build_object('original_role',original_role,'executor',executor,'subject_match',subject='${owner.id}','subject_present',subject is not null) from private.pilot_owner_http_guard_probe`,
          ),
      );
      denied(await upload(first));
      denied(
        await api(
          `/storage/v1/object/profile-photos/${first}`,
          peer,
          "POST",
          png,
          "image/png",
        ),
      );
      assert.equal((await patch(owner, first)).status, 204);
      assert.equal(ok(await rpc("get_access_state", owner.token, {})), "ready");
      const sign = ok(
        await api(
          `/storage/v1/object/sign/profile-photos/${first}`,
          owner,
          "POST",
          { expiresIn: 3 },
        ),
      );
      assert.ok(sign.signedURL);
      assert.deepEqual(
        ok(
          await api(`/storage/v1/object/profile-photos`, owner, "DELETE", {
            prefixes: [first],
          }),
        ),
        [],
      );
      assert.equal(
        sql(`select count(*) from storage.objects where name='${first}'`),
        "1",
        "referenced deletion changes no row",
      );
      assert.equal((await upload(second)).status, 200);
      assert.equal((await patch(owner, second)).status, 204);
      assert.equal(
        (
          await api("/storage/v1/object/profile-photos", owner, "DELETE", {
            prefixes: [first],
          })
        ).status,
        200,
      );
      assert.equal(
        sql(`select count(*) from storage.objects where name='${first}'`),
        "0",
      );
      assert.equal(
        sql(
          `select count(*) from private.pilot_owner_http_guard_probe where operation='DELETE' and original_role='authenticated' and executor='supabase_storage_admin' and subject='${owner.id}'`,
        ),
        "1",
        "real final Storage DELETE has authenticated owner context",
      );
      sql(
        `create function private.pilot_owner_http_barrier() returns trigger language plpgsql security definer set search_path='' as $$begin if (tg_op='INSERT' and current_setting('role',true)='service_role') or (tg_op='DELETE' and current_setting('role',true)='authenticated') then perform pg_advisory_xact_lock(16028,1);end if;if tg_op='DELETE' then return old;end if;return new;end;$$;revoke all on function private.pilot_owner_http_barrier() from public,anon,authenticated,service_role;create trigger aaaa_pilot_owner_http_barrier before insert or delete on storage.objects for each row execute function private.pilot_owner_http_barrier();`,
      );
      const waitEvidence = [];
      for (const operation of ["INSERT", "DELETE"])
        for (const loss of ["revoke", "shutdown", "email"]) {
          sql(
            `begin;select private.pilot_evidence_write_lock();update private.pilot_availability set enabled=true;update private.pilot_account_admission set state='active' where account_id='${owner.id}';update auth.users set email=${quote(owner.email)},email_confirmed_at=now() where id='${owner.id}';commit`,
          );
          const racePath = `${owner.id}/${crypto.randomUUID()}.png`;
          if (operation === "DELETE")
            assert.equal((await upload(racePath)).status, 200);
          const holder = session(`http_storage_${operation}_${loss}`);
          let pending;
          try {
            holder.send(
              "begin;select pg_advisory_xact_lock(16028,1);select 'HELD';",
            );
            for (let n = 0; n < 200 && !holder.output().includes("HELD"); n++)
              await new Promise((r) => setTimeout(r, 10));
            assert.match(holder.output(), /HELD/);
            pending =
              operation === "INSERT"
                ? upload(racePath)
                : api("/storage/v1/object/profile-photos", owner, "DELETE", {
                    prefixes: [racePath],
                  });
            let proof = "";
            for (let n = 0; n < 200 && !proof; n++) {
              proof = sql(
                `select jsonb_build_object('operation','${operation}','loss','${loss}','holder_pid',h.pid,'waiter_pid',w.pid,'lock','advisory') from pg_stat_activity w join pg_stat_activity h on h.application_name='http_storage_${operation}_${loss}' where h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted and l.locktype='advisory' and l.classid=16028 and l.objid=1)`,
              );
              if (!proof) await new Promise((r) => setTimeout(r, 10));
            }
            assert.ok(
              proof,
              "real Storage final write reached barrier after permission check",
            );
            waitEvidence.push(JSON.parse(proof));
            if (loss === "revoke")
              ok(
                await rpc("set_pilot_account_admission", manager.token, {
                  p_account_id: owner.id,
                  p_state: "revoked",
                  p_expected_revision: Number(
                    sql(
                      `select revision from private.pilot_account_admission where account_id='${owner.id}'`,
                    ),
                  ),
                  p_reason: "Real local Storage race",
                  p_request_id: crypto.randomUUID(),
                }),
              );
            if (loss === "shutdown")
              ok(
                await rpc("set_pilot_policy", manager.token, {
                  p_key: "availability",
                  p_enabled: false,
                  p_expected_revision: Number(
                    sql("select revision from private.pilot_availability"),
                  ),
                  p_reason: "Real local Storage race",
                  p_request_id: crypto.randomUUID(),
                }),
              );
            if (loss === "email")
              sql(
                `update auth.users set email='local-${crypto.randomUUID()}@example.com' where id='${owner.id}'`,
              );
            holder.send("commit;");
            holder.child.stdin.end();
            assert.equal((await holder.done)[0], 0);
            const denial = await pending;
            denied(denial);
            assert.equal(
              denial.body?.message,
              "Owner operation unavailable",
              "final write failed authorization, not an unrelated failure",
            );
            assert.doesNotMatch(
              JSON.stringify(denial.body),
              /deadlock|40P01|serialization|40001|timeout|timed out|57014|55P03/i,
            );
            Object.assign(waitEvidence.at(-1), {
              response_status: denial.status,
              response_message: denial.body.message,
            });
            assert.equal(
              sql(
                `select count(*) from storage.objects where name='${racePath}'`,
              ),
              operation === "INSERT" ? "0" : "1",
              "final row mutation denied after post-precheck evidence loss",
            );
          } finally {
            holder.child.kill();
            if (pending) await pending;
          }
        }
      sql(
        `begin;select private.pilot_evidence_write_lock();update private.pilot_availability set enabled=true;update private.pilot_account_admission set state='active' where account_id='${owner.id}';update auth.users set email=${quote(owner.email)},email_confirmed_at=now() where id='${owner.id}';commit`,
      );
      const duplicatePath = `${owner.id}/${crypto.randomUUID()}.png`,
        duplicateHolder = session("http_storage_duplicate");
      let firstUpload, secondUpload;
      try {
        duplicateHolder.send(
          "begin;select pg_advisory_xact_lock(16028,1);select 'HELD';",
        );
        for (
          let n = 0;
          n < 200 && !duplicateHolder.output().includes("HELD");
          n++
        )
          await new Promise((r) => setTimeout(r, 10));
        assert.match(duplicateHolder.output(), /HELD/);
        firstUpload = upload(duplicatePath);
        let firstPid = "";
        for (let n = 0; n < 200 && !firstPid; n++) {
          firstPid = sql(
            "select w.pid from pg_stat_activity w join pg_stat_activity h on h.application_name='http_storage_duplicate' where h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted and l.classid=16028 and l.objid=1)",
          );
          if (!firstPid) await new Promise((r) => setTimeout(r, 10));
        }
        assert.ok(firstPid);
        secondUpload = upload(duplicatePath);
        let duplicateProof = "";
        for (let n = 0; n < 200 && !duplicateProof; n++) {
          duplicateProof = sql(
            `select jsonb_build_object('holder_pid',${firstPid},'waiter_pid',w.pid,'lock',(select jsonb_agg(locktype) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity w where ${firstPid}=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`,
          );
          if (!duplicateProof) await new Promise((r) => setTimeout(r, 10));
        }
        assert.ok(
          duplicateProof,
          "second real upload passed permission precheck and waits on final object serialization",
        );
        duplicateHolder.send("commit;");
        duplicateHolder.child.stdin.end();
        assert.equal((await duplicateHolder.done)[0], 0);
        const results = await Promise.all([firstUpload, secondUpload]);
        assert.equal(results.filter((r) => r.status === 200).length, 1);
        assert.equal(results.filter((r) => r.status >= 400).length, 1);
        assert.equal(
          sql(
            `select count(*) from storage.objects where name='${duplicatePath}'`,
          ),
          "1",
        );
        console.log(
          JSON.stringify({
            real_duplicate_final_wait: JSON.parse(duplicateProof),
          }),
        );
      } finally {
        duplicateHolder.child.kill();
        await Promise.all([firstUpload, secondUpload].filter(Boolean));
      }
      console.log(JSON.stringify({ real_storage_final_waits: waitEvidence }));
      sql(
        "drop trigger aaaa_pilot_owner_http_barrier on storage.objects;drop function private.pilot_owner_http_barrier();",
      );
      sql(
        `begin;select private.pilot_evidence_write_lock();update private.pilot_availability set enabled=true;update private.pilot_account_admission set state='active' where account_id='${owner.id}';update auth.users set email=${quote(owner.email)},email_confirmed_at=now() where id='${owner.id}';commit`,
      );
      sql(
        `create function private.pilot_owner_raw_conflict_barrier() returns trigger language plpgsql security definer set search_path='' as $$begin if current_setting('role',true)='service_role' then perform pg_advisory_xact_lock(16029,1);end if;return new;end;$$;revoke all on function private.pilot_owner_raw_conflict_barrier() from public,anon,authenticated,service_role;create trigger zzzzz_pilot_owner_raw_conflict_barrier before insert on storage.objects for each row execute function private.pilot_owner_raw_conflict_barrier();`,
      );
      const rawPath = `${owner.id}/${crypto.randomUUID()}.png`,
        rawHolder = session("http_storage_raw_conflict");
      let rawPending;
      try {
        rawHolder.send(
          "begin;select pg_advisory_xact_lock(16029,1);select 'HELD';",
        );
        for (let n = 0; n < 200 && !rawHolder.output().includes("HELD"); n++)
          await new Promise((r) => setTimeout(r, 10));
        assert.match(rawHolder.output(), /HELD/);
        rawPending = upload(rawPath);
        let proof = "";
        for (let n = 0; n < 200 && !proof; n++) {
          proof = sql(
            "select jsonb_build_object('holder_pid',h.pid,'waiter_pid',w.pid,'lock','advisory') from pg_stat_activity w join pg_stat_activity h on h.application_name='http_storage_raw_conflict' where h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted and l.classid=16029 and l.objid=1)",
          );
          if (!proof) await new Promise((r) => setTimeout(r, 10));
        }
        assert.ok(
          proof,
          "real final INSERT passed admission/name check and reached later barrier",
        );
        sql(
          `begin;${auth(owner.id)}insert into storage.objects(bucket_id,name,owner_id,version) values('profile-photos','${rawPath}','${owner.id}','raw-owner-winner');commit;`,
        );
        rawHolder.send("commit;");
        rawHolder.child.stdin.end();
        assert.equal((await rawHolder.done)[0], 0);
        const rejected = await rawPending;
        denied(rejected);
        assert.match(
          JSON.stringify(rejected.body),
          /Profile photos are immutable/,
        );
        assert.equal(
          sql(`select version from storage.objects where name='${rawPath}'`),
          "raw-owner-winner",
          "privileged ON CONFLICT cannot overwrite committed raw owner INSERT",
        );
        console.log(
          JSON.stringify({ raw_insert_final_upsert_wait: JSON.parse(proof) }),
        );
      } finally {
        rawHolder.child.kill();
        if (rawPending) await rawPending;
        sql(
          "drop trigger zzzzz_pilot_owner_raw_conflict_barrier on storage.objects;drop function private.pilot_owner_raw_conflict_barrier();",
        );
      }
      const service = { token: status.SERVICE_ROLE_KEY };
      denied(
        await api(
          `/storage/v1/object/profile-photos/${owner.id}/${crypto.randomUUID()}.png`,
          service,
          "POST",
          png,
          "image/png",
        ),
      );
      denied(
        await api("/storage/v1/object/profile-photos", service, "DELETE", {
          prefixes: [
            sql(
              `select name from storage.objects where owner_id='${owner.id}' and name<>'${second}' limit 1`,
            ),
          ],
        }),
      );
      // Sign the current object; prior deleted object URL cannot establish bearer lifetime.
      const current = ok(
        await api(
          `/storage/v1/object/sign/profile-photos/${second}`,
          owner,
          "POST",
          { expiresIn: 3 },
        ),
      );
      const bearer = new URL(
        current.signedURL.startsWith("/object/")
          ? `/storage/v1${current.signedURL}`
          : current.signedURL,
        status.API_URL,
      );
      sql(
        `begin;select private.pilot_evidence_write_lock();update private.pilot_account_admission set state='revoked' where account_id='${owner.id}';commit`,
      );
      assert.equal(
        ok(await rpc("get_access_state", owner.token, {})),
        "pilot_unavailable",
      );
      denied(
        await api(
          `/storage/v1/object/authenticated/profile-photos/${second}`,
          owner,
        ),
      );
      denied(
        await api(
          `/storage/v1/object/sign/profile-photos/${second}`,
          owner,
          "POST",
          { expiresIn: 3 },
        ),
      );
      denied(await upload(`${owner.id}/${crypto.randomUUID()}.png`));
      assert.deepEqual(
        ok(
          await request(
            `/rest/v1/profiles?user_id=eq.${owner.id}`,
            owner.token,
          ),
        ),
        [],
      );
      assert.equal(
        (await fetch(bearer)).status,
        200,
        "preissued bearer survives committed revoke within expiry",
      );
      await new Promise((r) => setTimeout(r, 4200));
      assert.ok(
        (await fetch(bearer)).status >= 400,
        "preissued bearer eventually expires",
      );
      sql(
        `begin;select private.pilot_evidence_write_lock();update private.pilot_account_admission set state='active' where account_id='${owner.id}';update private.pilot_availability set enabled=false;commit`,
      );
      assert.equal(
        ok(await rpc("get_access_state", owner.token, {})),
        "pilot_unavailable",
      );
      denied(
        await api(
          `/storage/v1/object/sign/profile-photos/${second}`,
          owner,
          "POST",
          { expiresIn: 3 },
        ),
      );
      sql(
        `update private.pilot_availability set enabled=true;update auth.users set email='synthetic-${crypto.randomUUID()}@example.com' where id='${owner.id}'`,
      );
      assert.equal(
        ok(await rpc("get_access_state", owner.token, {})),
        "unverified",
      );
      denied(
        await api(
          `/storage/v1/object/sign/profile-photos/${second}`,
          owner,
          "POST",
          { expiresIn: 3 },
        ),
      );
      sql(
        `update public.profiles set primary_photo_path=null where user_id='${owner.id}';set storage.allow_delete_query='true';delete from storage.objects where owner_id='${owner.id}';delete from auth.users where id='${owner.id}'`,
      );
      const replacement = await signup(owner.email);
      assert.notEqual(replacement.id, owner.id);
      assert.equal(
        ok(await rpc("get_access_state", replacement.token, {})),
        "pilot_unavailable",
        "same email never transfers UUID admission",
      );
    } finally {
      sql(
        "drop trigger if exists zzzzz_pilot_owner_raw_conflict_barrier on storage.objects;drop function if exists private.pilot_owner_raw_conflict_barrier();",
      );
      sql(
        "drop trigger if exists aaaa_pilot_owner_http_barrier on storage.objects;drop function if exists private.pilot_owner_http_barrier();",
      );
      sql(
        "drop trigger if exists pals_owner_http_guard_probe on storage.objects;drop function if exists private.pilot_owner_http_guard_probe();drop table if exists private.pilot_owner_http_guard_probe;",
      );
      restoreDefaults();
      if (users.length) {
        const ids = users.map(quote).join(",");
        sql(
          `update public.profiles set primary_photo_path=null,additional_photo_paths='{}' where user_id in (${ids});set storage.allow_delete_query='true';delete from storage.objects where owner_id in (${ids});delete from auth.users where id in (${ids})`,
        );
      }
    }
  },
);
