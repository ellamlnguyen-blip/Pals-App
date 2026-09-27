import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import {
  localTarget,
  sql,
  quote,
  ok,
  resetDisposable,
  assertClean,
} from "./helpers/pilot-admission-lifecycle.mjs";

// Serial, exclusively owned disposable. SQL is synthetic setup/census only;
// every operation under test uses an actual Auth-issued bearer via PostgREST.
test(
  "B3a HTTP L1 and L2/L3 current-authority guard dominance",
  { concurrency: false, timeout: 600000 },
  async () => {
    const { request, rpc, status } = localTarget(); // Guard before any setup or Auth request.
    const evidence = [];
    const campus = "00000000-0000-4000-8000-000000000001";
    const names = [
      "create_hangout",
      "edit_hangout",
      "cancel_hangout",
      "join_hangout",
      "leave_hangout",
      "set_hangout_joining",
    ];
    let censusTables;
    const census = () => {
      // Full values, not counts: source/private/participant/ledger/notification/audit
      // rewrites as well as insertions must be absent after any failed request.
      const tables = (censusTables ??= JSON.parse(
        sql(
          "select jsonb_agg(table_schema||'.'||table_name order by table_schema,table_name) from information_schema.tables where table_type='BASE TABLE' and (table_schema='private' or (table_schema='public' and table_name in ('hangouts','hangout_private_locations','hangout_participants')))",
        ),
      ));
      return sql(
        `select jsonb_object_agg(name,rows) from (${tables.map((table) => `select ${quote(table)} name,coalesce(jsonb_agg(v order by v::text),'[]') rows from (select to_jsonb(t) v from ${table} t) s`).join(" union all ")}) census`,
      );
    };
    const allowed = async (id, name, user, args) => {
      const value = ok(await rpc(name, user.token, args));
      evidence.push({ id, rpc: name, result: value });
      return value;
    };
    const failure = async (
      id,
      name,
      user,
      args,
      status = 403,
      code = "42501",
      message = "Hangout operation not permitted",
    ) => {
      const before = census();
      const response = await rpc(name, user?.token ?? null, args);
      assert.equal(response.status, status, id);
      assert.equal(response.body.code, code, id);
      assert.equal(response.body.message, message, id);
      assert.deepEqual(census(), before, `${id}: zero full-row delta`);
      evidence.push({ id, rpc: name, status, code, message, zero_delta: true });
    };
    const signup = async () => {
      const email = `b3a-http-${crypto.randomUUID()}@unc.edu`;
      const password = `Local-only-${crypto.randomUUID()}`;
      const created = ok(
        await request("/auth/v1/signup", null, { email, password }),
      );
      const id = created.user?.id ?? created.id;
      assert.match(id, /^[0-9a-f-]{36}$/);
      sql(
        `update auth.users set email_confirmed_at=now() where id=${quote(id)}`,
      );
      const login = ok(
        await request("/auth/v1/token?grant_type=password", null, {
          email,
          password,
        }),
      );
      assert.equal(login.user.id, id);
      assert.ok(login.access_token);
      return { id, email, token: login.access_token };
    };
    const ready = (u) =>
      sql(
        `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${u.id}/b3a-http.png','${u.id}'); update public.profiles set real_name='Synthetic lifecycle',graduation_year=2028,major='Math',bio='Local',primary_photo_path='${u.id}/b3a-http.png' where user_id='${u.id}'; insert into private.pilot_account_admission(account_id,state,revision) values('${u.id}','active',1)`,
      );
    const payload = () => ({
      p_title: "Synthetic lifecycle",
      p_starts_at: new Date(Date.now() + 86400000).toISOString(),
      p_public_place: "Approximate area",
      p_public_latitude: 35.91,
      p_public_longitude: -79.05,
      p_private_instructions: "Private meeting instructions",
    });
    const row = (id) =>
      JSON.parse(
        sql(`select to_jsonb(h) from public.hangouts h where id=${quote(id)}`),
      );
    let host, actor, stranger;
    const scenario = async (name) => {
      const body = payload(),
        create = { ...body, p_request_id: crypto.randomUUID() };
      if (name === "create_hangout")
        return { name, user: actor, args: create, subject: actor, host: actor };
      const id = await allowed(`setup-${name}`, "create_hangout", host, create);
      await allowed(`setup-join-${name}`, "join_hangout", actor, {
        p_hangout_id: id,
      });
      if (["edit_hangout", "set_hangout_joining"].includes(name))
        sql(
          `insert into private.hangout_cohosts(hangout_id,account_id) values('${id}','${actor.id}')`,
        );
      const user = name === "cancel_hangout" ? host : actor;
      const args =
        name === "edit_hangout"
          ? { ...body, p_hangout_id: id, p_expected_revision: 1 }
          : name === "set_hangout_joining"
            ? {
                p_hangout_id: id,
                p_expected_revision: 1,
                p_joining_state: "closed",
              }
            : name === "cancel_hangout"
              ? { p_hangout_id: id, p_expected_revision: 1 }
              : { p_hangout_id: id };
      return { name, user, args, id, subject: user, host };
    };
    try {
      assertClean();
      host = await signup();
      actor = await signup();
      stranger = await signup();
      sql(
        "update private.pilot_availability set enabled=true; update private.pilot_capabilities set enabled=true where key='hangouts'; update private.hangout_feature_gate set enabled=true",
      );
      for (const u of [host, actor, stranger]) ready(u);
      assert.equal(
        sql(
          "select enabled from private.pilot_capabilities where key='onboarding'",
        ),
        "f",
      );
      for (const name of names) {
        const s = await scenario(name);
        if (name === "join_hangout")
          await allowed(
            "L1-join-transition-precondition",
            "leave_hangout",
            actor,
            s.args,
          );
        const value = await allowed(
          `L1-${name}-onboarding-off`,
          name,
          s.user,
          s.args,
        );
        if (name === "create_hangout") {
          assert.equal(row(value).host_id, actor.id);
          assert.equal(row(value).revision, 1);
          assert.equal(row(value).university_id, campus);
        } else if (
          ["edit_hangout", "set_hangout_joining", "cancel_hangout"].includes(
            name,
          )
        ) {
          assert.equal(value, 2);
          assert.equal(row(s.id).revision, 2);
          if (name === "cancel_hangout") {
            assert.equal(row(s.id).status, "cancelled");
            assert.equal(row(s.id).joining_state, "closed");
            assert.ok(row(s.id).updated_at);
          }
          if (name === "set_hangout_joining")
            assert.equal(row(s.id).joining_state, "closed");
          if (name === "edit_hangout")
            assert.equal(row(s.id).title, s.args.p_title);
        } else {
          assert.equal(value, null);
          assert.equal(
            sql(
              `select state from public.hangout_participants where hangout_id='${s.id}' and account_id='${actor.id}'`,
            ),
            name === "leave_hangout" ? "left" : "joined",
          );
        }
        // Anonymous lacks EXECUTE, so this is the preserved ABI permission error.
        await failure(
          `L1-${name}-anon`,
          name,
          null,
          s.args,
          401,
          "42501",
          `permission denied for function ${name}`,
        );
        const beforeForged = census();
        const forged = await rpc(name, s.user.token, {
          ...s.args,
          p_actor_id: stranger.id,
        });
        assert.equal(forged.status, 404);
        assert.equal(forged.body.code, "PGRST202");
        assert.deepEqual(census(), beforeForged);
        const service = status.SERVICE_ROLE_KEY;
        assert.ok(
          service,
          "Local service JWT required for actual HTTP EXECUTE denial",
        );
        await failure(
          `L1-${name}-service`,
          name,
          { token: service },
          s.args,
          403,
          "42501",
          `permission denied for function ${name}`,
        );
        evidence.push({
          id: `L1-${name}-forged-extra-argument`,
          status: forged.status,
          code: forged.body.code,
        });
      }
      const retryBody = { ...payload(), p_request_id: crypto.randomUUID() };
      const saved = await allowed(
        "L1-create-first",
        "create_hangout",
        host,
        retryBody,
      );
      const beforeExact = census();
      assert.equal(
        await allowed("L1-create-exact", "create_hangout", host, retryBody),
        saved,
      );
      assert.deepEqual(census(), beforeExact);
      await failure(
        "L1-create-mismatch",
        "create_hangout",
        host,
        { ...retryBody, p_title: "Changed" },
        409,
        "23505",
        "Creation request conflict",
      );
      const cross = await allowed(
        "L1-create-cross-actor",
        "create_hangout",
        actor,
        retryBody,
      );
      assert.notEqual(cross, saved);
      assert.equal(row(cross).host_id, actor.id);
      const edit = {
        ...payload(),
        p_hangout_id: saved,
        p_expected_revision: 1,
      };
      await failure(
        "L1-authorized-edit-input",
        "edit_hangout",
        host,
        { ...edit, p_title: "" },
        400,
        "22023",
        "Invalid Hangout input",
      );
      await failure(
        "L1-authorized-private-input",
        "edit_hangout",
        host,
        { ...edit, p_private_instructions: "x".repeat(2001) },
        400,
        "22023",
        "Invalid private meeting instructions",
      );
      await failure(
        "L1-authorized-stale",
        "edit_hangout",
        host,
        { ...edit, p_expected_revision: 0 },
        500,
        "40001",
        "Stale Hangout revision",
      );
      await failure(
        "L1-authorized-joining-input",
        "set_hangout_joining",
        host,
        {
          p_hangout_id: saved,
          p_expected_revision: 1,
          p_joining_state: "invalid",
        },
        400,
        "22023",
        "Invalid joining state",
      );
      await failure(
        "L1-authorized-create-input",
        "create_hangout",
        actor,
        { ...payload(), p_request_id: crypto.randomUUID(), p_title: "" },
        400,
        "22023",
        "Invalid Hangout input",
      );
      assert.deepEqual(
        ok(
          await request(
            `/rest/v1/hangout_private_locations?hangout_id=eq.${saved}`,
            stranger.token,
          ),
        ),
        [],
      );
      assert.equal(
        ok(
          await request(
            `/rest/v1/hangout_private_locations?hangout_id=eq.${saved}&select=instructions`,
            host.token,
          ),
        )[0].instructions,
        "Private meeting instructions",
      );

      for (const table of [
        "hangouts",
        "hangout_participants",
        "hangout_private_locations",
      ]) {
        const before = census();
        const denied = await request(`/rest/v1/${table}`, actor.token, {});
        assert.equal(denied.status, 403);
        assert.equal(denied.body.code, "42501");
        assert.equal(
          denied.body.message,
          `permission denied for table ${table}`,
        );
        assert.deepEqual(census(), before);
        evidence.push({
          id: `L1-raw-DML-${table}`,
          status: 403,
          code: "42501",
          zero_delta: true,
        });
      }
      const hiddenLedger = await request(
        "/rest/v1/hangout_create_requests",
        actor.token,
      );
      assert.equal(hiddenLedger.status, 404);
      assert.equal(hiddenLedger.body.code, "PGRST205");
      const hiddenHelper = await rpc(
        "pilot_lock_ordinary_lifecycle",
        actor.token,
        { p_operation: "create_hangout", p_hangout_id: null },
      );
      assert.equal(hiddenHelper.status, 404);
      assert.equal(hiddenHelper.body.code, "PGRST202");
      evidence.push({
        id: "L1-private-ledger-helper-unexposed",
        ledger_code: "PGRST205",
        helper_code: "PGRST202",
      });
      // Already joined is a complete no-op, including private optional records.
      const joined = await scenario("join_hangout"),
        beforeNoop = census();
      assert.equal(
        await allowed("L1-joined-noop", "join_hangout", actor, joined.args),
        null,
      );
      assert.deepEqual(census(), beforeNoop);
      await failure("L1-host-leave", "leave_hangout", host, joined.args);
      await failure(
        "L1-nonmember-leave",
        "leave_hangout",
        stranger,
        joined.args,
      );
      await allowed("L1-close-control", "set_hangout_joining", host, {
        p_hangout_id: joined.id,
        p_expected_revision: 1,
        p_joining_state: "closed",
      });
      await failure(
        "L1-closed-before-noop",
        "join_hangout",
        actor,
        joined.args,
      );
      const removed = await scenario("join_hangout");
      sql(
        `update public.hangout_participants set state='removed',removed_at=now() where hangout_id='${removed.id}' and account_id='${actor.id}'`,
      );
      await failure("L1-terminal-removed", "join_hangout", actor, removed.args);
      const blocked = await scenario("join_hangout");
      sql(
        `insert into private.people_blocks(blocker_id,blocked_id) values('${host.id}','${actor.id}')`,
      );
      try {
        await failure(
          "L1-blocked-before-noop",
          "join_hangout",
          actor,
          blocked.args,
        );
      } finally {
        sql(
          `delete from private.people_blocks where blocker_id='${host.id}' and blocked_id='${actor.id}'`,
        );
      }
      const cancelled = await scenario("leave_hangout");
      await allowed("L1-cancel-control", "cancel_hangout", host, {
        p_hangout_id: cancelled.id,
        p_expected_revision: 1,
      });
      await failure("L1-cancelled-join", "join_hangout", actor, cancelled.args);
      await failure("L1-cancelled-edit", "edit_hangout", host, {
        ...payload(),
        ...cancelled.args,
        p_expected_revision: 0,
      });
      await failure("L1-cancelled-cancel", "cancel_hangout", host, {
        ...cancelled.args,
        p_expected_revision: 0,
      });
      await failure("L1-cancelled-joining", "set_hangout_joining", host, {
        ...cancelled.args,
        p_expected_revision: 0,
        p_joining_state: "invalid",
      });
      assert.deepEqual(
        ok(
          await request(
            `/rest/v1/hangout_private_locations?hangout_id=eq.${cancelled.id}`,
            actor.token,
          ),
        ),
        [],
      );
      const cancelledTimestamp = row(cancelled.id).updated_at;
      await allowed(
        "L1-cancelled-leave-preserved",
        "leave_hangout",
        actor,
        cancelled.args,
      );
      assert.equal(row(cancelled.id).updated_at, cancelledTimestamp);
      // An actual report/operator path produces immutable disable evidence.
      const disabled = await scenario("join_hangout"),
        operator = await signup();
      sql(
        `insert into public.platform_roles(user_id,role) values('${operator.id}','moderator'); update private.safety_feature_gate set enabled=true; update private.moderation_feature_gate set enabled=true`,
      );
      const report = ok(
        await rpc("submit_safety_report", actor.token, {
          p_request_id: crypto.randomUUID(),
          p_target_mode: "hangout",
          p_target_id: disabled.id,
          p_category: "safety concern",
        }),
      )[0].receipt_id;
      ok(
        await rpc("transition_moderation_case", operator.token, {
          p_report_id: report,
          p_request_id: crypto.randomUUID(),
          p_expected_revision: 0,
          p_action: "start_review",
        }),
      );
      assert.deepEqual(
        ok(
          await rpc("apply_hangout_moderation_action", operator.token, {
            p_report_id: report,
            p_request_id: crypto.randomUUID(),
            p_expected_case_revision: 1,
            p_reason: "Synthetic lifecycle source enforcement",
          }),
        ),
        [{ case_state: "closed", revision: 2, target_disabled: true }],
      );
      for (const name of names.filter((n) => n !== "create_hangout")) {
        const args =
          name === "edit_hangout"
            ? {
                ...payload(),
                p_hangout_id: disabled.id,
                p_expected_revision: 0,
              }
            : name === "set_hangout_joining"
              ? {
                  p_hangout_id: disabled.id,
                  p_expected_revision: 0,
                  p_joining_state: "invalid",
                }
              : name === "cancel_hangout"
                ? { p_hangout_id: disabled.id, p_expected_revision: 0 }
                : { p_hangout_id: disabled.id };
        await failure(
          `L1-disabled-${name}`,
          name,
          ["edit_hangout", "cancel_hangout", "set_hangout_joining"].includes(
            name,
          )
            ? host
            : actor,
          args,
        );
      }

      // Serial guard-dominance cells, not concurrency/commit-order evidence.
      // The distinct-host cells use existing co-host edit/joining and participant join/leave;
      // create and cancel deduplicate the actor/host, as their authority requires.
      const losses = (u) => {
        const id = quote(u.id);
        const membership = sql(
          `select to_jsonb(m) from public.university_memberships m where user_id=${id}`,
        );
        return [
          [
            "roster-revoked",
            `update private.pilot_account_admission set state='revoked' where account_id=${id}`,
            `update private.pilot_account_admission set state='active' where account_id=${id}`,
          ],
          [
            "roster-missing",
            `delete from private.pilot_account_admission where account_id=${id}`,
            `insert into private.pilot_account_admission(account_id,state,revision) values(${id},'active',1)`,
          ],
          [
            "suspended",
            `update public.accounts set status='suspended' where id=${id}`,
            `update public.accounts set status='active' where id=${id}`,
          ],
          [
            "banned",
            `update public.accounts set status='banned' where id=${id}`,
            `update public.accounts set status='active' where id=${id}`,
          ],
          [
            "email-unconfirmed",
            `update auth.users set email_confirmed_at=null where id=${id}`,
            `update auth.users set email_confirmed_at=now() where id=${id}`,
          ],
          [
            "email-equality",
            `update public.university_memberships set verification_email='other@unc.edu' where user_id=${id}`,
            `update public.university_memberships set verification_email=${quote(u.email)} where user_id=${id}`,
          ],
          [
            "email-domain",
            `update auth.users set email='b3a-http-${u.id}@example.test' where id=${id}`,
            `update auth.users set email=${quote(u.email)} where id=${id}`,
          ],
          [
            "membership-unverified",
            `update public.university_memberships set verified_at=null,verification_email=null where user_id=${id}`,
            `update public.university_memberships set verified_at=now(),verification_email=${quote(u.email)} where user_id=${id}`,
          ],
          [
            "membership-missing",
            `delete from public.university_memberships where user_id=${id}`,
            `insert into public.university_memberships select * from jsonb_populate_record(null::public.university_memberships,${quote(membership)}::jsonb)`,
          ],
          [
            "profile-incomplete",
            `update public.profiles set bio=null where user_id=${id}`,
            `update public.profiles set bio='Local' where user_id=${id}`,
          ],
          [
            "owned-object-lawful-detach-delete",
            `begin;set local storage.allow_delete_query='true';update public.profiles set primary_photo_path=null where user_id=${id}; delete from storage.objects where bucket_id='profile-photos' and name='${u.id}/b3a-http.png';commit;`,
            `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${u.id}/b3a-http.png','${u.id}'); update public.profiles set primary_photo_path='${u.id}/b3a-http.png' where user_id=${id}`,
          ],
          [
            "primary-reference",
            `update public.profiles set primary_photo_path=null where user_id=${id}`,
            `update public.profiles set primary_photo_path='${u.id}/b3a-http.png' where user_id=${id}`,
          ],
        ];
      };
      for (const name of names) {
        const subjects = [actor];
        if (!["create_hangout", "cancel_hangout"].includes(name))
          subjects.push(host);
        if (name === "cancel_hangout") subjects[0] = host;
        for (const subject of subjects)
          for (const [loss, remove, restore] of losses(subject)) {
            const control = await scenario(name);
            await allowed(
              `L2L3-${name}-${subject === host ? "host" : "actor"}-${loss}-control`,
              name,
              control.user,
              control.args,
            );
            const s = await scenario(name);
            sql(remove);
            try {
              let args = s.args;
              if (name === "create_hangout") args = { ...args, p_title: "" };
              if (name === "edit_hangout")
                args = { ...args, p_title: "", p_expected_revision: 0 };
              if (name === "cancel_hangout")
                args = { ...args, p_expected_revision: 0 };
              if (name === "set_hangout_joining")
                args = {
                  ...args,
                  p_expected_revision: 0,
                  p_joining_state: "invalid",
                };
              await failure(
                `L2L3-${name}-${subject === host ? "host" : "actor"}-${loss}`,
                name,
                s.user,
                args,
              );
              if (name === "create_hangout") {
                await failure(
                  `L2L3-create-saved-${loss}`,
                  name,
                  actor,
                  retryBody,
                );
                await failure(`L2L3-create-conflict-${loss}`, name, actor, {
                  ...retryBody,
                  p_title: "Changed",
                });
              }
            } finally {
              sql(restore);
            }
          }
        for (const [loss, remove, restore] of [
          [
            "shutdown",
            "update private.pilot_availability set enabled=false",
            "update private.pilot_availability set enabled=true",
          ],
          [
            "hangouts-capability",
            "update private.pilot_capabilities set enabled=false where key='hangouts'",
            "update private.pilot_capabilities set enabled=true where key='hangouts'",
          ],
          [
            "availability-missing",
            "delete from private.pilot_availability",
            "insert into private.pilot_availability(singleton,enabled,revision) values(true,true,1)",
          ],
          [
            "capability-missing",
            "delete from private.pilot_capabilities where key='hangouts'",
            "insert into private.pilot_capabilities(key,enabled,revision) values('hangouts',true,1)",
          ],
          [
            "gate-missing",
            "delete from private.hangout_feature_gate",
            "insert into private.hangout_feature_gate(singleton,enabled) values(true,true)",
          ],
          [
            "hangout-gate",
            "update private.hangout_feature_gate set enabled=false",
            "update private.hangout_feature_gate set enabled=true",
          ],
          [
            "campus-inactive",
            `update public.universities set active=false where id='${campus}'`,
            `update public.universities set active=true where id='${campus}'`,
          ],
          [
            "campus-slug",
            `update public.universities set slug='synthetic-other' where id='${campus}'`,
            `update public.universities set slug='unc-chapel-hill' where id='${campus}'`,
          ],
          [
            "campus-allowlist",
            `update public.universities set allowed_email_domains='{}' where id='${campus}'`,
            `update public.universities set allowed_email_domains=array['unc.edu'] where id='${campus}'`,
          ],
        ]) {
          const control = await scenario(name);
          await allowed(
            `L2L3-${name}-${loss}-control`,
            name,
            control.user,
            control.args,
          );
          const s = await scenario(name);
          sql(remove);
          try {
            await failure(`L2L3-${name}-${loss}`, name, s.user, s.args);
            if (name === "create_hangout") {
              await failure(`L2L3-saved-${loss}`, name, actor, retryBody);
              await failure(`L2L3-conflict-${loss}`, name, actor, {
                ...retryBody,
                p_title: "Changed",
              });
            }
          } finally {
            sql(restore);
          }
        }
      }
      // Readmission never recreates a departed role or terminal participation.
      const departed = await scenario("edit_hangout");
      await allowed("L3-readmission-depart-control", "leave_hangout", actor, {
        p_hangout_id: departed.id,
      });
      sql(
        `update private.pilot_account_admission set state='revoked' where account_id='${actor.id}';update private.pilot_account_admission set state='active' where account_id='${actor.id}';`,
      );
      assert.equal(
        sql(
          `select state from public.hangout_participants where hangout_id='${departed.id}' and account_id='${actor.id}'`,
        ),
        "left",
      );
      assert.equal(
        sql(
          `select count(*) from private.hangout_cohosts where hangout_id='${departed.id}' and account_id='${actor.id}'`,
        ),
        "0",
      );
      await failure(
        "L3-readmission-no-role-restoration",
        "edit_hangout",
        actor,
        { ...departed.args, p_expected_revision: 0, p_title: "" },
      );
      await allowed("L3-readmission-explicit-rejoin", "join_hangout", actor, {
        p_hangout_id: departed.id,
      });
      assert.equal(
        sql(
          `select count(*) from private.hangout_cohosts where hangout_id='${departed.id}' and account_id='${actor.id}'`,
        ),
        "0",
      );
      const removedReadmission = await scenario("join_hangout");
      await allowed(
        "L3-readmission-removal-control",
        "remove_hangout_participant",
        host,
        {
          p_hangout_id: removedReadmission.id,
          p_account_id: actor.id,
          p_expected_revision: 1,
        },
      );
      sql(
        `update private.pilot_account_admission set state='revoked' where account_id='${actor.id}';update private.pilot_account_admission set state='active' where account_id='${actor.id}';`,
      );
      await failure(
        "L3-readmission-no-removed-restoration",
        "join_hangout",
        actor,
        { p_hangout_id: removedReadmission.id },
      );
      writeFileSync(
        "agents/handoffs/TASK-021A1b3a-HTTP-EVIDENCE.json",
        JSON.stringify(
          {
            fixture: "B3a HTTP",
            cases: evidence,
            concurrency_claimed: false,
            old_auth_tokens: true,
          },
          null,
          2,
        ) + "\n",
      );
      console.log(
        JSON.stringify({
          fixture: "B3a HTTP",
          verified_case_count: evidence.length,
          concurrency_claimed: false,
          old_auth_tokens: true,
        }),
      );
    } finally {
      // Immutable evidence is retained until this full, guarded current-25 reset.
      resetDisposable();
    }
  },
);
