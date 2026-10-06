import assert from "node:assert/strict";
import test from "node:test";
import {
  localTarget,
  sql,
  quote,
  trusted,
  restoreDefaults,
  race,
} from "./helpers/pilot-admission-authority.mjs";
import { verifiedTotpToken } from "./helpers/local-totp.mjs";

test(
  "observed waits serialize admission authority, absent rows, policies and live account/Auth/campus evidence",
  { concurrency: false, timeout: 300_000 },
  async (t) => {
    const { request } = localTarget();
    const users = [];
    const claimsByActor = new Map();
    let sequence = 0;
    let observed = 0;
    const campus = "00000000-0000-4000-8000-000000000001";
    function targetAccount() {
      const id = crypto.randomUUID();
      users.push(id);
      sql(
        `insert into auth.users(id,email,email_confirmed_at) values('${id}','pilot-race-${id}@unc.edu',now());`,
      );
      return id;
    }
    async function managerAccount() {
      const email = `pilot-manager-race-${crypto.randomUUID()}@unc.edu`;
      const password = `Local-only-${crypto.randomUUID()}`;
      const created = await request("/auth/v1/signup", null, { email, password });
      assert.equal(created.status, 200, JSON.stringify(created.body));
      const id = created.body.user?.id ?? created.body.id;
      assert.match(id, /^[0-9a-f-]{36}$/i);
      users.push(id);
      sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)};`);
      const login = await request("/auth/v1/token?grant_type=password", null, {
        email,
        password,
      });
      assert.equal(login.status, 200, JSON.stringify(login.body));
      const token = await verifiedTotpToken(request, login.body.access_token);
      const verified = await request("/auth/v1/user", token);
      assert.equal(verified.status, 200, JSON.stringify(verified.body));
      assert.equal(verified.body.id, id);
      const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url"));
      assert.equal(claims.sub, id);
      assert.equal(claims.role, "authenticated");
      assert.equal(claims.aal, "aal2");
      assert.match(claims.session_id, /^[0-9a-f-]{36}$/i);
      claimsByActor.set(id, claims);
      return id;
    }
    function authFor(actor) {
      const claims = claimsByActor.get(actor);
      assert.ok(claims, "manager claims came from local Auth TOTP verification");
      return `set local role authenticated; set local request.jwt.claims=${quote(JSON.stringify(claims))};`;
    }
    function managerOperation(actor, target, state, expected, requestId = crypto.randomUUID()) {
      return `${authFor(actor)} select * from public.set_pilot_account_admission('${target}','${state}',${expected},'Local race','${requestId}');`;
    }
    async function pair(managerPresent = true) {
      const actor = await managerAccount();
      const target = targetAccount();
      if (managerPresent) sql(trusted(actor, "active", 0));
      return { actor, target };
    }
    async function run(first, second, rejection = false) {
      t.diagnostic(
        JSON.stringify(
          await race(`pilot_${++sequence}`, first, second, rejection),
        ),
      );
      observed++;
    }
    try {
      for (const retry of [false, true]) {
        for (const writerFirst of [true, false]) {
          const { actor, target } = await pair();
          const request = crypto.randomUUID();
          const operation = managerOperation(actor, target, "active", 0, request);
          if (retry) sql(`begin; ${operation} commit;`);
          const revoke = trusted(actor, "revoked", 1);
          if (writerFirst) await run(revoke, operation, true);
          else await run(operation, `reset role; ${revoke}`);
          assert.equal(
            sql(
              `select state from private.pilot_admission_managers where account_id='${actor}'`,
            ),
            "revoked",
          );
          assert.equal(
            sql(
              `select count(*) from private.pilot_management_audit where actor_id='${actor}'`,
            ),
            retry || !writerFirst ? "1" : "0",
          );
        }
      }
      for (const retry of [false, true]) {
        for (const writerFirst of [true, false]) {
          const { actor, target } = await pair();
          const request = crypto.randomUUID();
          const operation = managerOperation(actor, target, "active", 0, request);
          if (retry) sql(`begin; ${operation} commit;`);
          const loss = `update public.accounts set status='suspended' where id='${actor}';`;
          if (writerFirst) await run(loss, operation, true);
          else await run(operation, loss);
          assert.equal(
            sql(
              `select count(*) from private.pilot_management_audit where actor_id='${actor}'`,
            ),
            retry || !writerFirst ? "1" : "0",
          );
        }
      }
      for (const retry of [false, true]) {
        for (const writerFirst of [true, false]) {
          const { actor, target } = await pair();
          const request = crypto.randomUUID();
          const operation = managerOperation(actor, target, "active", 0, request);
          if (retry) sql(`begin; ${operation} commit;`);
          const loss = `delete from auth.users where id='${actor}';`;
          if (writerFirst) await run(loss, operation, true);
          else await run(operation, loss);
          assert.equal(
            sql(
              `select count(*) from private.pilot_admission_managers where account_id='${actor}'`,
            ),
            "0",
          );
          assert.equal(
            sql(
              `select count(*) from private.pilot_management_audit where actor_id='${actor}'`,
            ),
            retry || !writerFirst ? "1" : "0",
          );
          assert.equal(
            sql(
              `select count(*) from private.pilot_management_requests where actor_id='${actor}'`,
            ),
            retry || !writerFirst ? "1" : "0",
            "private historical receipt remains after deletion",
          );
        }
      }
      // Both writers use common keys even with no manager or roster tuple yet.
      {
        const { actor, target } = await pair(false);
        await run(
          trusted(actor, "active", 0),
          managerOperation(actor, target, "active", 0),
        );
        assert.equal(
          sql(
            `select state from private.pilot_account_admission where account_id='${target}'`,
          ),
          "active",
        );
      }
      {
        const { actor, target } = await pair(false);
        await run(
          trusted(actor, "revoked", 0),
          managerOperation(actor, target, "active", 0),
          true,
        );
        assert.equal(
          sql(
            `select count(*) from private.pilot_account_admission where account_id='${target}'`,
          ),
          "0",
        );
      }
      {
        const { actor, target } = await pair();
        await run(
          managerOperation(actor, target, "active", 0),
          managerOperation(actor, target, "revoked", 0),
          true,
        );
        assert.equal(
          sql(
            `select revision from private.pilot_account_admission where account_id='${target}'`,
          ),
          "1",
        );
      }
      {
        const { actor, target } = await pair();
        await run(
          managerOperation(actor, target, "revoked", 0),
          managerOperation(actor, target, "active", 0),
          true,
        );
        assert.equal(
          sql(
            `select state from private.pilot_account_admission where account_id='${target}'`,
          ),
          "revoked",
        );
      }
      // Auth and campus writers do not participate in advisory keys. Actual SHARE
      // evidence rows create these waits and fresh statements deny after commit.
      for (const kind of ["email", "campus", "target_status"]) {
        for (const writerFirst of [true, false]) {
          const { actor, target } = await pair();
          const operation = managerOperation(actor, target, "active", 0);
          const change =
            kind === "email"
              ? `update auth.users set email='lost-${target}@example.test' where id='${target}';`
              : kind === "campus"
                ? `update public.universities set active=false where id='${campus}';`
                : `update public.accounts set status='suspended' where id='${target}';`;
          if (writerFirst) await run(change, operation, true);
          else await run(operation, change);
          assert.equal(
            sql(
              `select count(*) from private.pilot_account_admission where account_id='${target}'`,
            ),
            writerFirst ? "0" : "1",
          );
          if (kind === "campus")
            sql(
              `update public.universities set active=true where id='${campus}';`,
            );
        }
      }
      for (const policyFirst of [true, false]) {
        const { actor, target } = await pair();
        const initialRevision = Number(
          sql(
            "select revision from private.pilot_availability where singleton",
          ),
        );
        sql(
          `begin; ${authFor(actor)} select * from public.set_pilot_policy('availability',true,${initialRevision},'Enable for shutdown race','${crypto.randomUUID()}'); commit;`,
        );
        const revision = Number(
          sql(
            "select revision from private.pilot_availability where singleton",
          ),
        );
        const policy = `${authFor(actor)} select * from public.set_pilot_policy('availability',false,${revision},'Local shutdown race','${crypto.randomUUID()}');`;
        const operation = managerOperation(actor, target, "active", 0);
        if (policyFirst) await run(policy, operation);
        else await run(operation, policy);
        assert.equal(
          sql(
            `select state from private.pilot_account_admission where account_id='${target}'`,
          ),
          "active",
          "manager authority independent of policy shutdown",
        );
      }
      // Exact competing policy CAS must not overwrite the winning revision.
      {
        const { actor } = await pair();
        const revision = Number(
          sql(
            "select revision from private.pilot_capabilities where key='hangouts'",
          ),
        );
        const write = (value) =>
          `${authFor(actor)} select * from public.set_pilot_policy('hangouts',${value},${revision},'Policy CAS','${crypto.randomUUID()}');`;
        await run(write(true), write(false), true);
        assert.equal(
          sql(
            "select enabled from private.pilot_capabilities where key='hangouts'",
          ),
          "t",
        );
      }
      assert.equal(observed, 25, "all planned lock waits observed");
      const isolationActor = (await pair()).actor;
      for (const isolation of ["repeatable read", "serializable"]) {
        assert.throws(
          () =>
            sql(
              `begin isolation level ${isolation}; ${authFor(isolationActor)} select * from public.set_pilot_policy('availability',false,1,'isolation','${crypto.randomUUID()}'); commit;`,
            ),
          /Safety operation unavailable/,
          "stronger isolation aborts before writes",
        );
      }
    } finally {
      sql(`update public.universities set active=true where id='${campus}';`);
      restoreDefaults();
      if (users.length)
        sql(
          `delete from auth.users where id in (${users.map((id) => `'${id}'`).join(",")});`,
        );
      // Runner must guarded-reset immutable audit/receipt fixtures afterwards.
    }
  },
);
