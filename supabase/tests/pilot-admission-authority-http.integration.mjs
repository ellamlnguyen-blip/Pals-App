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

test(
  "real Auth manager authority, neutral denials, old JWT revocation and immutable provenance",
  { concurrency: false, timeout: 120_000 },
  async () => {
    const { request, rpc } = localTarget();
    const users = [];
    async function signup() {
      const email = `pilot-authority-${crypto.randomUUID()}@unc.edu`;
      const password = `Local-only-${crypto.randomUUID()}`;
      const created = ok(
        await request("/auth/v1/signup", null, { email, password }),
      );
      const id = created.user?.id ?? created.id;
      users.push(id);
      sql(
        `update auth.users set email_confirmed_at=now() where id=${quote(id)};`,
      );
      const login = ok(
        await request("/auth/v1/token?grant_type=password", null, {
          email,
          password,
        }),
      );
      return { id, token: login.access_token };
    }
    try {
      const manager = await signup();
      const target = await signup();
      const admin = await signup();
      sql(
        `insert into public.platform_roles(user_id,role) values('${admin.id}','admin'); ${trusted(manager.id, "active", 0)}`,
      );
      const body = {
        p_account_id: target.id,
        p_state: "active",
        p_expected_revision: 0,
        p_reason: "Local invited incomplete account",
        p_request_id: crypto.randomUUID(),
      };
      denied(await rpc("set_pilot_account_admission", null, body));
      const ordinary = await rpc(
        "set_pilot_account_admission",
        target.token,
        body,
      );
      denied(ordinary);
      const platform = await rpc(
        "set_pilot_account_admission",
        admin.token,
        body,
      );
      denied(platform);
      assert.equal(ordinary.body.message, "Pilot management unavailable");
      assert.equal(platform.body.message, ordinary.body.message);
      const admitted = ok(
        await rpc("set_pilot_account_admission", manager.token, body),
      );
      assert.deepEqual(admitted, [{ state: "active", revision: 1 }]);
      assert.deepEqual(
        ok(await rpc("set_pilot_account_admission", manager.token, body)),
        admitted,
      );
      denied(
        await rpc("set_pilot_account_admission", manager.token, {
          ...body,
          p_actor_id: admin.id,
        }),
      );
      denied(
        await rpc("set_pilot_account_admission", manager.token, {
          ...body,
          p_reason: "changed",
        }),
      );
      assert.equal(
        sql(
          `select count(*) from private.pilot_management_audit where actor_id='${manager.id}'`,
        ),
        "1",
      );
      assert.equal(
        sql(
          `select count(*) from private.pilot_account_admission where account_id='${manager.id}'`,
        ),
        "0",
        "manager needs no student admission",
      );
      assert.equal(
        sql(
          `select is_complete from public.profiles where user_id='${target.id}'`,
        ),
        "f",
        "activation does not require readiness",
      );
      assert.deepEqual(
        ok(
          await request(
            `/rest/v1/profiles?user_id=eq.${target.id}&select=*`,
            manager.token,
          ),
        ),
        [],
      );
      denied(
        await request(
          "/rest/v1/pilot_account_admission?select=*",
          manager.token,
        ),
      );
      denied(await rpc("set_pilot_manager_fixture", manager.token, {}));
      const policy = {
        p_key: "availability",
        p_enabled: true,
        p_expected_revision: 1,
        p_reason: "Local policy",
        p_request_id: crypto.randomUUID(),
      };
      assert.deepEqual(
        ok(await rpc("set_pilot_policy", manager.token, policy)),
        [{ enabled: true, revision: 2 }],
      );
      sql(trusted(manager.id, "revoked", 1));
      const stale = await rpc(
        "set_pilot_account_admission",
        manager.token,
        body,
      );
      denied(stale);
      assert.equal(stale.body.message, ordinary.body.message);
      denied(await rpc("set_pilot_policy", manager.token, policy));
      assert.equal(
        sql(
          `select count(*) from private.pilot_management_audit where actor_id='${manager.id}'`,
        ),
        "2",
        "denied old-session retries append no audit",
      );
      assert.equal(
        sql(
          `select count(*) from private.pilot_manager_audit where account_id='${manager.id}' and executor_session_user='postgres' and executor_original_role in ('none','postgres')`,
        ),
        "2",
      );
    } finally {
      restoreDefaults();
      if (users.length)
        sql(
          `delete from auth.users where id in (${users.map(quote).join(",")});`,
        );
      // Immutable historical fixtures require the runner's guarded disposable reset.
    }
  },
);
