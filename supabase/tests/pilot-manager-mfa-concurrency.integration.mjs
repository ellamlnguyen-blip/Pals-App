import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { localTarget, sql, quote, trusted, restoreDefaults, ok, race } from "./helpers/pilot-admission-authority.mjs";
import { verifiedTotpToken } from "./helpers/local-totp.mjs";

test("manager policy waits for live factor, session and authority revocation", { concurrency: false, timeout: 180_000 }, async (t) => {
  const { request } = localTarget();
  const users = [];
  try {
    for (const kind of ["factor", "session", "manager", "account"]) {
      const email = `pilot-manager-race-${randomUUID()}@unc.edu`;
      const password = `Local-only-${randomUUID()}`;
      const created = ok(await request("/auth/v1/signup", null, { email, password }));
      const id = created.user?.id ?? created.id;
      users.push(id);
      sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)};`);
      const aal1 = ok(await request("/auth/v1/token?grant_type=password", null, { email, password })).access_token;
      const aal2 = await verifiedTotpToken(request, aal1);
      const claims = JSON.parse(Buffer.from(aal2.split(".")[1], "base64url"));
      sql(trusted(id, "active", 0));
      const sid = claims.session_id;
      const factor = sql(`select factor_id from auth.sessions where id=${quote(sid)};`);
      const writer = kind === "factor"
        ? `update auth.mfa_factors set status='unverified' where id=${quote(factor)};`
        : kind === "session"
          ? `update auth.sessions set aal='aal1' where id=${quote(sid)};`
          : kind === "manager"
            ? trusted(id, "revoked", 1)
            : `update public.accounts set status='suspended' where id=${quote(id)};`;
      const caller = `set local role authenticated; set local request.jwt.claims=${quote(JSON.stringify(claims))}; select * from public.set_pilot_policy('availability',true,1,'Concurrent MFA loss','${randomUUID()}');`;
      const evidence = await race(`pilot_manager_mfa_${kind}`, writer, caller, true);
      t.diagnostic(JSON.stringify({ kind, waiting_lock_types: evidence.waiting_lock_types }));
      assert.equal(sql(`select count(*) from private.pilot_management_audit where actor_id=${quote(id)};`), "0");
      assert.equal(sql("select enabled from private.pilot_availability;"), "f");
    }
  } finally {
    restoreDefaults();
    if (users.length) sql(`delete from auth.users where id in (${users.map(quote).join(",")});`);
  }
});
