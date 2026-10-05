import assert from "node:assert/strict";
import test from "node:test";
import {
  localTarget,
  sql,
  quote,
  trusted,
  ok,
  denied,
  restoreDefaults,
} from "./helpers/pilot-admission-authority.mjs";
import { verifiedTotpToken } from "./helpers/local-totp.mjs";

test(
  "real Auth AAL2 manager CAS, receipt, privacy, revocation and failed-closed authority",
  { concurrency: false, timeout: 180_000 },
  async () => {
    const { request, rpc } = localTarget();
    const users = [];
    let hangoutId;
    async function signup() {
      const email = `pilot-authority-${crypto.randomUUID()}@unc.edu`;
      const password = `Local-only-${crypto.randomUUID()}`;
      const created = ok(await request("/auth/v1/signup", null, { email, password }));
      const id = created.user?.id ?? created.id;
      users.push(id);
      sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)};`);
      const login = ok(await request("/auth/v1/token?grant_type=password", null, { email, password }));
      return { id, token: login.access_token, email };
    }
    async function rejects(name, token, body) {
      const result = await rpc(name, token, body);
      denied(result);
      assert.equal(result.body.message, "Pilot management unavailable");
    }
    const count = (table, where = "true") =>
      Number(sql(`select count(*) from private.${table} where ${where}`));
    try {
      const manager = await signup();
      const target = await signup();
      const admin = await signup();
      const second = await signup();
      const otherTarget = await signup();
      const unconfirmed = await signup();
      const wrongDomain = await signup();
      const suspended = await signup();
      sql(`
        update auth.users set email_confirmed_at=null where id=${quote(unconfirmed.id)};
        update auth.users set email='wrong@example.test' where id=${quote(wrongDomain.id)};
        update public.accounts set status='suspended' where id=${quote(suspended.id)};
        insert into public.platform_roles(user_id,role) values(${quote(admin.id)},'admin');
        ${trusted(manager.id, "active", 0)}
        ${trusted(second.id, "active", 0)}
      `);
      const requestId = crypto.randomUUID();
      const body = {
        p_account_id: target.id,
        p_state: "active",
        p_expected_revision: 0,
        p_reason: "\u00a0Reason\u00a0",
        p_request_id: requestId,
      };
      denied(await rpc("set_pilot_account_admission", null, body));
      await rejects("set_pilot_account_admission", target.token, body);
      await rejects("set_pilot_account_admission", admin.token, body);
      await rejects("set_pilot_account_admission", manager.token, body);
      await rejects("set_pilot_policy", manager.token, {
        p_key: "availability", p_enabled: true, p_expected_revision: 1,
        p_reason: "AAL1", p_request_id: crypto.randomUUID(),
      });
      assert.equal(count("pilot_management_audit"), 0);
      manager.token = await verifiedTotpToken(request, manager.token);
      second.token = await verifiedTotpToken(request, second.token);
      admin.token = await verifiedTotpToken(request, admin.token);
      target.token = await verifiedTotpToken(request, target.token);
      await rejects("set_pilot_account_admission", admin.token, body);
      await rejects("set_pilot_account_admission", target.token, body);
      for (const token of [admin.token, target.token]) await rejects("set_pilot_policy", token, {
        p_key: "availability", p_enabled: true, p_expected_revision: 1,
        p_reason: "No manager grant", p_request_id: crypto.randomUUID(),
      });
      assert.equal(count("pilot_management_audit"), 0,
        "AAL2 without a manager grant creates no authority or audit");
      const admitted = [{ state: "active", revision: 1 }];
      assert.deepEqual(ok(await rpc("set_pilot_account_admission", manager.token, body)), admitted);
      assert.deepEqual(ok(await rpc("set_pilot_account_admission", manager.token, {
        ...body, p_reason: "Reason",
      })), admitted, "normalized exact retry returns original receipt");
      await rejects("set_pilot_account_admission", manager.token, {
        ...body, p_reason: "changed",
      });
      await rejects("set_pilot_policy", manager.token, {
        p_key: "availability", p_enabled: true, p_expected_revision: 1,
        p_reason: "Reason", p_request_id: requestId,
      });
      await rejects("set_pilot_account_admission", manager.token, {
        ...body, p_request_id: crypto.randomUUID(),
      });
      assert.deepEqual(ok(await rpc("set_pilot_account_admission", manager.token, {
        ...body, p_expected_revision: 1, p_reason: "Noop",
        p_request_id: crypto.randomUUID(),
      })), admitted, "same-state new request preserves revision");
      for (const id of [unconfirmed.id, wrongDomain.id, suspended.id]) {
        await rejects("set_pilot_account_admission", manager.token, {
          ...body, p_account_id: id, p_request_id: crypto.randomUUID(),
        });
      }
      await rejects("set_pilot_account_admission", manager.token, {
        ...body, p_state: "invalid", p_request_id: crypto.randomUUID(),
      });
      const policy = {
        p_key: "availability", p_enabled: true, p_expected_revision: 1,
        p_reason: "Local policy", p_request_id: crypto.randomUUID(),
      };
      for (const bad of [
        { p_key: "unknown" }, { p_expected_revision: null },
        { p_reason: "   " }, { p_reason: "x".repeat(2001) },
      ]) await rejects("set_pilot_policy", manager.token, {
        ...policy, ...bad, p_request_id: crypto.randomUUID(),
      });
      sql(`update auth.users set email='manager-not-student@example.test' where id=${quote(manager.id)};`);
      assert.deepEqual(ok(await rpc("set_pilot_policy", manager.token, policy)),
        [{ enabled: true, revision: 2 }],
        "AAL2 manager remains authorized after own UNC email loss under accepted policy");
      assert.deepEqual(ok(await rpc("set_pilot_policy", manager.token, policy)),
        [{ enabled: true, revision: 2 }], "policy exact retry is idempotent");
      assert.deepEqual(ok(await rpc("set_pilot_policy", manager.token, {
        ...policy, p_expected_revision: 2, p_reason: "Noop",
        p_request_id: crypto.randomUUID(),
      })), [{ enabled: true, revision: 2 }]);
      assert.deepEqual(ok(await rpc("set_pilot_policy", manager.token, {
        ...policy, p_key: "onboarding", p_request_id: crypto.randomUUID(),
      })), [{ enabled: true, revision: 2 }]);
      await rejects("set_pilot_policy", manager.token, {
        ...policy, p_key: "onboarding", p_enabled: false,
        p_request_id: crypto.randomUUID(),
      });
      assert.equal(count("pilot_management_audit"), 5,
        "two admissions and three policy operations audited; retries and denials do not append");
      assert.equal(count("pilot_management_requests"), 5);
      assert.equal(sql(`select reason from private.pilot_management_audit where request_id=${quote(requestId)}`), "Reason");
      assert.equal(count("pilot_management_audit", `actor_id=${quote(manager.id)}`), 5);
      for (const forbidden of [
        "update private.pilot_management_audit set reason='rewrite'",
        "delete from private.pilot_management_requests",
        "delete from private.pilot_manager_audit",
      ]) assert.throws(() => sql(forbidden), /Pilot evidence is immutable/,
        "trusted readback proves immutable management evidence");
      assert.equal(sql(`select count(*) from private.pilot_account_admission where account_id=${quote(manager.id)}`), "0",
        "manager needs no student admission");
      assert.equal(sql(`select is_complete from public.profiles where user_id=${quote(target.id)}`), "f",
        "activation does not require profile readiness");
      assert.deepEqual(ok(await request(`/rest/v1/profiles?user_id=eq.${target.id}&select=*`, manager.token)), []);
      denied(await request("/rest/v1/pilot_account_admission?select=*", manager.token));
      denied(await rpc("set_pilot_manager_fixture", manager.token, {}));
      sql(`insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',${quote(`${target.id}/private.png`)},${quote(target.id)});`);
      assert.deepEqual(ok(await request(`/storage/v1/object/list/profile-photos`, manager.token, {
        prefix: `${target.id}/`, limit: 100,
      })), [], "manager cannot list target private photo");
      hangoutId = crypto.randomUUID();
      sql(`
        begin;
        insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude)
        values(${quote(hangoutId)},'00000000-0000-4000-8000-000000000001',${quote(target.id)},'Private fixture',now()+interval '1 hour','Area',35,-79);
        insert into public.hangout_participants(hangout_id,account_id,state)
        values(${quote(hangoutId)},${quote(target.id)},'joined');
        insert into public.hangout_private_locations(hangout_id,instructions)
        values(${quote(hangoutId)},'Retained private instructions');
        commit;
        update private.hangout_feature_gate set enabled=true;
        update private.hangout_chat_feature_gate set enabled=true;
        update private.pilot_capabilities set enabled=true where key in ('hangouts','hangout_chat');
      `);
      assert.deepEqual(ok(await request(`/rest/v1/hangout_private_locations?hangout_id=eq.${hangoutId}&select=*`, manager.token)), [],
        "AAL2 manager cannot read target private place with source gates enabled");
      denied(await rpc("read_hangout_messages", manager.token, { p_hangout_id: hangoutId }));
      sql(`update auth.users set email='lost@example.test' where id=${quote(target.id)};`);
      assert.deepEqual(ok(await rpc("set_pilot_account_admission", manager.token, {
        ...body, p_state: "revoked", p_expected_revision: 1,
        p_reason: "Lost email", p_request_id: crypto.randomUUID(),
      })), [{ state: "revoked", revision: 2 }]);
      await rejects("set_pilot_account_admission", manager.token, {
        ...body, p_expected_revision: 2, p_request_id: crypto.randomUUID(),
      });
      sql(`update auth.users set email=${quote(target.email)} where id=${quote(target.id)};`);
      assert.deepEqual(ok(await rpc("set_pilot_account_admission", manager.token, {
        ...body, p_expected_revision: 2, p_request_id: crypto.randomUUID(),
      })), [{ state: "active", revision: 3 }]);
      sql(`update public.universities set active=false where slug='unc-chapel-hill';`);
      await rejects("set_pilot_account_admission", manager.token, {
        ...body, p_account_id: otherTarget.id, p_request_id: crypto.randomUUID(),
      });
      sql(`update public.universities set active=true where slug='unc-chapel-hill';`);
      const secondBody = {
        ...body, p_account_id: otherTarget.id, p_state: "revoked",
        p_reason: "Other actor", p_request_id: requestId,
      };
      assert.deepEqual(ok(await rpc("set_pilot_account_admission", second.token, secondBody)),
        [{ state: "revoked", revision: 1 }], "request UUID is scoped by actor");
      assert.equal(count("pilot_management_requests", `request_id=${quote(requestId)}`), 2);
      const auditBeforeDenial = count("pilot_management_audit");
      sql(trusted(manager.id, "revoked", 1));
      await rejects("set_pilot_account_admission", manager.token, body);
      await rejects("set_pilot_policy", manager.token, policy);
      assert.equal(count("pilot_management_audit"), auditBeforeDenial);
      assert.equal(count("pilot_manager_audit", `account_id=${quote(manager.id)} and executor_session_user='postgres' and executor_original_role in ('none','postgres')`), 2);
      sql(`delete from private.pilot_capabilities where key='onboarding';`);
      await rejects("set_pilot_policy", second.token, {
        ...policy, p_key: "onboarding", p_request_id: crypto.randomUUID(),
      });
      assert.equal(sql("select private.pilot_capability_enabled('onboarding')"), "f");
      sql(`delete from private.pilot_availability;`);
      await rejects("set_pilot_policy", second.token, {
        ...policy, p_request_id: crypto.randomUUID(),
      });
      assert.equal(sql("select private.pilot_is_available()"), "f");
      assert.equal(count("pilot_management_audit"), auditBeforeDenial);
      sql(`delete from auth.users where id=${quote(second.id)};`);
      assert.equal(count("pilot_admission_managers", `account_id=${quote(second.id)}`), 0,
        "deleting a real AAL2 actor cascades the live manager grant");
      assert.equal(count("pilot_management_requests", `actor_id=${quote(second.id)} and request_id=${quote(requestId)}`), 1,
        "deleting the actor preserves its historical request receipt");
      sql(`delete from auth.users where id=${quote(otherTarget.id)};`);
      assert.equal(count("pilot_account_admission", `account_id=${quote(otherTarget.id)}`), 0,
        "deleting the target cascades its live admission row");
    } finally {
      restoreDefaults();
      sql("update private.hangout_feature_gate set enabled=false; update private.hangout_chat_feature_gate set enabled=false;");
      if (hangoutId) sql(`delete from public.hangouts where id=${quote(hangoutId)};`);
      if (users.length) sql(`delete from auth.users where id in (${users.map(quote).join(",")});`);
      // Immutable receipts and removed singleton/capability require guarded local reset.
    }
  },
);
