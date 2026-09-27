import assert from "node:assert/strict";
import test from "node:test";
import {
  localTarget,
  sql,
  quote,
  ok,
  resetDisposable,
} from "./helpers/pilot-admission-source-safety.mjs";

test(
  "B2 real Auth source/retained/operator projections and old JWT denial",
  { concurrency: false, timeout: 120000 },
  async () => {
    const { request, rpc } = localTarget();
    const users = [];
    const evidence = { cases: [] };
    const allowed = async (name, user, args = {}) =>
      ok(await rpc(name, user.token, args));
    const denied = async (name, user, args, message) => {
      const r = await rpc(name, user.token, args);
      assert.equal(r.status, 403);
      assert.equal(r.body.code, "42501");
      assert.equal(r.body.message, message);
      evidence.cases.push({
        rpc: name,
        status: r.status,
        code: r.body.code,
        message: r.body.message,
      });
    };
    const signup = async () => {
      const email = `b2-${crypto.randomUUID()}@unc.edu`,
        password = `Local-only-${crypto.randomUUID()}`;
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
      return { id, token: login.access_token };
    };
    const ready = (u) =>
      sql(
        `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${u.id}/11111111.png','${u.id}');update public.profiles set real_name='Synthetic source',graduation_year=2028,major='Math',bio='Local',primary_photo_path='${u.id}/11111111.png' where user_id='${u.id}';insert into private.pilot_account_admission(account_id,state,revision) values('${u.id}','active',1);`,
      );
    const raw = async (u, path) =>
      ok(await request(`/rest/v1/${path}`, u.token));
    let hangout, report;
    try {
      const host = await signup(),
        caller = await signup(),
        former = await signup(),
        blocked = await signup(),
        unknown = await signup(),
        operator = await signup(),
        manager = await signup();
      sql(
        "update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=true where key in('onboarding','hangouts','hangout_chat');update private.hangout_feature_gate set enabled=true;update private.hangout_chat_feature_gate set enabled=true;update private.safety_feature_gate set enabled=true;update private.moderation_feature_gate set enabled=true;",
      );
      for (const u of [host, caller, former, blocked, unknown]) ready(u);
      hangout = await allowed("create_hangout", host, {
        p_request_id: crypto.randomUUID(),
        p_title: "Synthetic private title",
        p_starts_at: new Date(Date.now() + 86400000).toISOString(),
        p_public_place: "Approximate",
        p_public_latitude: 35.91,
        p_public_longitude: -79.05,
        p_private_instructions: "Secret exact instructions",
      });
      for (const u of [caller, former, blocked])
        await allowed("join_hangout", u, { p_hangout_id: hangout });
      await allowed("promote_hangout_cohost", host, {
        p_hangout_id: hangout,
        p_account_id: former.id,
        p_expected_revision: 1,
      });
      for (const [u, body] of [
        [former, "Stored former body"],
        [blocked, "Blocked body"],
        [caller, "Current body"],
      ])
        await allowed("send_hangout_message", u, {
          p_hangout_id: hangout,
          p_request_id: crypto.randomUUID(),
          p_body: body,
        });
      for (const isolation of ["repeatable read", "serializable"]) {
        const prefix = `begin isolation level ${isolation};set local role authenticated;set local request.jwt.claims='{"sub":"${caller.id}","role":"authenticated"}';`;
        assert.equal(
          sql(`${prefix}select count(*) from public.hangouts;rollback;`),
          "0",
          "source stable reader inherits false outside READ COMMITTED",
        );
        assert.equal(
          sql(`${prefix}select private.ready_campus() is null;rollback;`),
          "t",
          "caller source helper inherits false",
        );
        for (const [query, message] of [
          [
            `select public.read_hangout_messages('${hangout}')`,
            "Hangout chat unavailable",
          ],
          [
            `select public.list_hangout_roster_roles('${hangout}')`,
            "Hangout operation not permitted",
          ],
          [
            `select public.list_my_retained_hangout_ids()`,
            "People operation unavailable",
          ],
          [
            `select public.list_people_blocked_ids()`,
            "People operation unavailable",
          ],
          [
            `select public.get_hangout_participant_state('${hangout}','${caller.id}')`,
            "Hangout operation not permitted",
          ],
          [`select public.list_moderation_reports()`, "Moderation unavailable"],
        ]) {
          assert.throws(
            () => sql(`${prefix}${query};rollback;`),
            (e) =>
              e.message.includes(message) &&
              !/deadlock|serialize|timeout/i.test(e.message),
          );
          evidence.cases.push({
            isolation,
            message,
            kind: "actual authenticated SQL",
          });
        }
      }
      const detailPath = `hangouts?id=eq.${hangout}&select=*,hangout_participants(hangout_id,account_id),hangout_private_locations(instructions)`;
      let rows = await raw(caller, detailPath);
      assert.equal(rows.length, 1);
      assert.deepEqual(rows[0].hangout_private_locations, {
        instructions: "Secret exact instructions",
      });
      assert.deepEqual(await raw(caller, `profiles?user_id=eq.${host.id}`), []);
      sql(
        "update private.pilot_capabilities set enabled=false where key='onboarding'",
      );
      assert.equal(await allowed("get_access_state", caller), "ready");
      assert.deepEqual(
        await raw(caller, `profiles?user_id=eq.${caller.id}`),
        [],
      );
      assert.equal((await raw(caller, detailPath)).length, 1);
      sql(
        "update private.pilot_capabilities set enabled=false where key='hangout_chat'",
      );
      await denied(
        "read_hangout_messages",
        caller,
        { p_hangout_id: hangout },
        "Hangout chat unavailable",
      );
      assert.equal((await raw(caller, detailPath)).length, 1);
      sql(
        "update private.pilot_capabilities set enabled=true where key='hangout_chat';update private.pilot_capabilities set enabled=false where key='hangouts'",
      );
      assert.deepEqual(await raw(caller, detailPath), []);
      await denied(
        "read_hangout_messages",
        caller,
        { p_hangout_id: hangout },
        "Hangout chat unavailable",
      );
      sql(
        `update private.pilot_capabilities set enabled=true where key='hangouts';update private.pilot_account_admission set state='revoked' where account_id='${former.id}';`,
      );
      const roster = await allowed("list_hangout_roster_roles", caller, {
        p_hangout_id: hangout,
        p_limit: 24,
      });
      assert.ok(
        roster.every(
          (r) => Object.keys(r).sort().join() === "account_id,role_label",
        ),
      );
      assert.ok(!roster.some((r) => r.account_id === former.id));
      assert.equal(
        await allowed("get_hangout_participant_state", host, {
          p_hangout_id: hangout,
          p_account_id: former.id,
        }),
        "joined",
      );
      assert.deepEqual(
        await allowed("list_hangout_cohosts", host, {
          p_hangout_id: hangout,
          p_limit: 1,
        }),
        [{ account_id: former.id }],
      );
      let messages = await allowed("read_hangout_messages", caller, {
        p_hangout_id: hangout,
        p_limit: 1,
      });
      assert.equal(messages[0].body, "Stored former body");
      assert.equal(messages[0].author_id, null);
      assert.equal(messages[0].author_label, "Former participant");
      assert.deepEqual(Object.keys(messages[0]).sort(), [
        "author_id",
        "author_label",
        "body",
        "created_at",
        "message_id",
        "mine",
        "sequence",
      ]);
      sql(
        `insert into private.people_blocks(blocker_id,blocked_id) values('${blocked.id}','${caller.id}')`,
      );
      messages = await allowed("read_hangout_messages", caller, {
        p_hangout_id: hangout,
        p_after_sequence: 1,
        p_limit: 1,
      });
      assert.equal(messages.length, 1);
      assert.equal(messages[0].body, "Current body");
      assert.equal(messages[0].sequence, 3);
      const inverse = await raw(
        caller,
        `hangout_participants?hangout_id=eq.${hangout}&select=hangout_id,account_id,hangouts(title,hangout_private_locations(instructions))`,
      );
      assert.ok(
        !inverse.some(
          (r) => r.account_id === former.id || r.account_id === blocked.id,
        ),
      );
      sql(
        `update private.pilot_account_admission set state='revoked' where account_id='${host.id}'`,
      );
      assert.deepEqual(await raw(caller, detailPath), []);
      assert.deepEqual(
        await raw(
          caller,
          `hangout_participants?hangout_id=eq.${hangout}&select=hangout_id,account_id,hangouts(title)`,
        ),
        [],
      );
      assert.deepEqual(
        await raw(
          caller,
          `hangout_private_locations?hangout_id=eq.${hangout}&select=*,hangouts(title)`,
        ),
        [],
      );
      await denied(
        "read_hangout_messages",
        caller,
        { p_hangout_id: hangout },
        "Hangout chat unavailable",
      );
      await denied(
        "list_hangout_cohosts",
        host,
        { p_hangout_id: hangout },
        "Hangout operation not permitted",
      );
      assert.equal(
        await allowed("get_hangout_participant_state", caller, {
          p_hangout_id: hangout,
          p_account_id: caller.id,
        }),
        "joined",
      );
      sql(
        `update private.pilot_account_admission set state='active' where account_id='${host.id}';update private.pilot_availability set enabled=false`,
      );
      assert.deepEqual(await raw(caller, detailPath), []);
      const retained = await allowed("list_my_retained_hangout_ids", caller, {
        p_limit: 1,
      });
      assert.deepEqual(retained, [
        { hangout_id: hangout, own_state: "joined" },
      ]);
      const requestId = crypto.randomUUID(),
        args = {
          p_request_id: requestId,
          p_target_mode: "hangout_host",
          p_target_id: hangout,
          p_category: "other",
          p_narrative: "  Private allegation  ",
        };
      const receipt = await allowed("submit_safety_report", caller, args);
      assert.deepEqual(Object.keys(receipt[0]).sort(), [
        "receipt_id",
        "submitted_at",
      ]);
      report = receipt[0].receipt_id;
      assert.deepEqual(
        await allowed("submit_safety_report", caller, {
          ...args,
          p_narrative: "Private allegation",
        }),
        receipt,
      );
      await denied(
        "submit_safety_report",
        caller,
        { ...args, p_narrative: "Changed" },
        "Safety report unavailable",
      );
      await denied(
        "submit_safety_report",
        unknown,
        { ...args, p_request_id: crypto.randomUUID() },
        "Safety report unavailable",
      );
      await denied(
        "submit_safety_report",
        caller,
        {
          p_request_id: crypto.randomUUID(),
          p_target_mode: "user",
          p_target_id: manager.id,
          p_category: "harassment",
        },
        "Safety report unavailable",
      );
      sql(
        `insert into public.platform_roles(user_id,role) values('${operator.id}','moderator');insert into private.pilot_admission_managers(account_id,state,revision) values('${manager.id}','active',1)`,
      );
      const queue = await allowed("list_moderation_reports", operator, {
        p_limit: 1,
      });
      assert.equal(queue[0].report_id, report);
      assert.deepEqual(Object.keys(queue[0]).sort(), [
        "case_state",
        "category",
        "report_id",
        "reporter_id",
        "submitted_at",
        "target_id",
        "target_type",
      ]);
      const detail = await allowed("get_moderation_report", operator, {
        p_report_id: report,
      });
      assert.deepEqual(Object.keys(detail[0]).sort(), [
        "case_note",
        "case_revision",
        "case_state",
        "category",
        "disposition",
        "narrative",
        "provenance_kind",
        "provenance_ref_id",
        "report_id",
        "reporter_id",
        "submitted_at",
        "target_campus_id",
        "target_disabled",
        "target_id",
        "target_status",
        "target_type",
      ]);
      assert.equal(detail[0].narrative, "Private allegation");
      assert.equal(detail[0].provenance_kind, "retained_host");
      assert.deepEqual(await raw(operator, detailPath), []);
      assert.deepEqual(
        await raw(operator, `profiles?user_id=eq.${host.id}`),
        [],
      );
      await denied(
        "list_moderation_reports",
        manager,
        {},
        "Moderation unavailable",
      );
      await denied(
        "get_moderation_report",
        caller,
        { p_report_id: report },
        "Moderation unavailable",
      );
      const startArgs = {
        p_report_id: report,
        p_request_id: crypto.randomUUID(),
        p_expected_revision: 0,
        p_action: "start_review",
      };
      const started = await allowed(
        "transition_moderation_case",
        operator,
        startArgs,
      );
      assert.deepEqual(started, [{ case_state: "in_review", revision: 1 }]);
      assert.deepEqual(
        await allowed("transition_moderation_case", operator, startArgs),
        started,
      );
      const actionArgs = {
        p_report_id: report,
        p_request_id: crypto.randomUUID(),
        p_expected_case_revision: 1,
        p_action: "suspend",
        p_reason: "Local reviewed allegation",
      };
      const action = await allowed(
        "apply_account_moderation_action",
        operator,
        actionArgs,
      );
      assert.deepEqual(action, [
        { case_state: "closed", revision: 2, account_status: "suspended" },
      ]);
      assert.deepEqual(
        await allowed("apply_account_moderation_action", operator, actionArgs),
        action,
      );
      const hangoutReceipt = await allowed("submit_safety_report", caller, {
        p_request_id: crypto.randomUUID(),
        p_target_mode: "hangout",
        p_target_id: hangout,
        p_category: "safety concern",
      });
      const hangoutReport = hangoutReceipt[0].receipt_id;
      await allowed("transition_moderation_case", operator, {
        p_report_id: hangoutReport,
        p_request_id: crypto.randomUUID(),
        p_expected_revision: 0,
        p_action: "start_review",
      });
      const disableArgs = {
        p_report_id: hangoutReport,
        p_request_id: crypto.randomUUID(),
        p_expected_case_revision: 1,
        p_reason: "Local source enforcement",
      };
      const disabled = await allowed(
        "apply_hangout_moderation_action",
        operator,
        disableArgs,
      );
      assert.deepEqual(disabled, [
        { case_state: "closed", revision: 2, target_disabled: true },
      ]);
      assert.deepEqual(
        await allowed("apply_hangout_moderation_action", operator, disableArgs),
        disabled,
      );
      assert.equal(
        sql(
          `select count(*) from private.account_sanctions where report_id='${report}'`,
        ),
        "1",
      );
      assert.equal(
        sql(
          `select count(*) from private.hangout_disables where report_id='${hangoutReport}'`,
        ),
        "1",
      );
      sql(`delete from public.platform_roles where user_id='${operator.id}'`);
      await denied(
        "apply_hangout_moderation_action",
        operator,
        disableArgs,
        "Moderation unavailable",
      );
      sql(
        `insert into public.platform_roles(user_id,role) values('${operator.id}','moderator')`,
      );
      sql(
        `update public.accounts set status='suspended' where id='${caller.id}'`,
      );
      await denied(
        "submit_safety_report",
        caller,
        args,
        "Safety report unavailable",
      );
      await denied(
        "list_my_retained_hangout_ids",
        caller,
        {},
        "Safety operation unavailable",
      );
      sql(
        `update public.accounts set status='active' where id='${caller.id}';update private.safety_feature_gate set enabled=false`,
      );
      await denied(
        "submit_safety_report",
        caller,
        args,
        "Safety report unavailable",
      );
      evidence.cases.push({
        case: "source-and-retained-output",
        roster_keys: ["account_id", "role_label"],
        receipt_keys: ["receipt_id", "submitted_at"],
        former_body_retained: true,
        former_author_id: null,
        blocked_body_omitted_before_limit: true,
        operator_detail_keys: Object.keys(detail[0]).sort(),
        old_tokens_used: true,
      });
      console.log(JSON.stringify(evidence));
    } finally {
      // Immutable operator audit uses RESTRICT: cleanup requires the separately guarded full disposable reset.
      // Do not delete protected history or infer successful cleanup from a partial delete.
      resetDisposable();
    }
  },
);
