import assert from "node:assert/strict";
import test from "node:test";
import {
  localTarget,
  sql,
  auth,
  management,
  trusted,
  restoreDefaults,
  race,
} from "./helpers/pilot-admission-authority.mjs";

test(
  "observed waits serialize admission authority, absent rows, policies and live account/Auth/campus evidence",
  { concurrency: false, timeout: 300_000 },
  async () => {
    localTarget();
    const users = [];
    let sequence = 0;
    let observed = 0;
    const campus = "00000000-0000-4000-8000-000000000001";
    function account() {
      const id = crypto.randomUUID();
      users.push(id);
      sql(
        `insert into auth.users(id,email,email_confirmed_at) values('${id}','pilot-race-${id}@unc.edu',now());`,
      );
      return id;
    }
    function pair(managerPresent = true) {
      const actor = account();
      const target = account();
      if (managerPresent) sql(trusted(actor, "active", 0));
      return { actor, target };
    }
    async function run(first, second, rejection = false) {
      await race(`pilot_${++sequence}`, first, second, rejection);
      observed++;
    }
    try {
      for (const retry of [false, true]) {
        for (const writerFirst of [true, false]) {
          const { actor, target } = pair();
          const request = crypto.randomUUID();
          const operation = management(actor, target, "active", 0, request);
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
          const { actor, target } = pair();
          const request = crypto.randomUUID();
          const operation = management(actor, target, "active", 0, request);
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
      for (const writerFirst of [true, false]) {
        const { actor, target } = pair();
        const operation = management(actor, target, "active", 0);
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
          writerFirst ? "0" : "1",
        );
      }
      // Both writers use common keys even with no manager or roster tuple yet.
      {
        const { actor, target } = pair(false);
        await run(
          trusted(actor, "active", 0),
          management(actor, target, "active", 0),
        );
        assert.equal(
          sql(
            `select state from private.pilot_account_admission where account_id='${target}'`,
          ),
          "active",
        );
      }
      {
        const { actor, target } = pair(false);
        await run(
          trusted(actor, "revoked", 0),
          management(actor, target, "active", 0),
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
        const { actor, target } = pair();
        await run(
          management(actor, target, "active", 0),
          management(actor, target, "revoked", 0),
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
        const { actor, target } = pair();
        await run(
          management(actor, target, "revoked", 0),
          management(actor, target, "active", 0),
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
          const { actor, target } = pair();
          const operation = management(actor, target, "active", 0);
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
        const { actor, target } = pair();
        const revision = Number(
          sql(
            "select revision from private.pilot_availability where singleton",
          ),
        );
        const desired =
          sql(
            "select enabled from private.pilot_availability where singleton",
          ) !== "t";
        const policy = `${auth(actor)} select * from public.set_pilot_policy('availability',${desired},${revision},'Local policy race','${crypto.randomUUID()}');`;
        const operation = management(actor, target, "active", 0);
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
        const { actor } = pair();
        const revision = Number(
          sql(
            "select revision from private.pilot_capabilities where key='hangouts'",
          ),
        );
        const write = (value) =>
          `${auth(actor)} select * from public.set_pilot_policy('hangouts',${value},${revision},'Policy CAS','${crypto.randomUUID()}');`;
        await run(write(true), write(false), true);
        assert.equal(
          sql(
            "select enabled from private.pilot_capabilities where key='hangouts'",
          ),
          "t",
        );
      }
      assert.equal(observed, 23, "all planned lock waits observed");
      const isolationActor = pair().actor;
      for (const isolation of ["repeatable read", "serializable"]) {
        assert.throws(
          () =>
            sql(
              `begin isolation level ${isolation}; ${auth(isolationActor)} select * from public.set_pilot_policy('availability',false,1,'isolation','${crypto.randomUUID()}'); commit;`,
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
