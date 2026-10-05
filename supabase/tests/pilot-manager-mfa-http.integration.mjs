import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { localTarget, sql, quote, trusted, restoreDefaults, ok, denied } from "./helpers/pilot-admission-authority.mjs";
import { verifiedTotpToken } from "./helpers/local-totp.mjs";

test("live Auth TOTP is required for both pilot management RPCs", { concurrency: false, timeout: 180_000 }, async () => {
  const { request, rpc } = localTarget();
  const users = [];
  async function signup() {
    const email = `pilot-mfa-${randomUUID()}@unc.edu`;
    const password = `Local-only-${randomUUID()}`;
    const created = ok(await request("/auth/v1/signup", null, { email, password }));
    const id = created.user?.id ?? created.id;
    users.push(id);
    sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)};`);
    const aal1 = ok(await request("/auth/v1/token?grant_type=password", null, { email, password })).access_token;
    return { id, aal1 };
  }
  function policy(revision, key = "hangouts") {
    return { p_key: key, p_enabled: true, p_expected_revision: revision,
      p_reason: "Local MFA policy check", p_request_id: randomUUID() };
  }
  function admission(target) {
    return { p_account_id: target, p_state: "active", p_expected_revision: 0,
      p_reason: "Local MFA admission check", p_request_id: randomUUID() };
  }
  async function assertDenied(token, name, body) {
    const result = await rpc(name, token, body);
    denied(result);
    assert.equal(result.body.message, "Pilot management unavailable");
  }
  try {
    const manager = await signup();
    const target = await signup();
    sql(trusted(manager.id, "active", 0));
    const policyBody = policy(1);
    const admissionBody = admission(target.id);
    await assertDenied(manager.aal1, "set_pilot_policy", policyBody);
    await assertDenied(manager.aal1, "set_pilot_account_admission", admissionBody);
    assert.equal(sql("select count(*) from private.pilot_management_audit"), "0");

    const aal2 = await verifiedTotpToken(request, manager.aal1);
    assert.deepEqual(ok(await rpc("set_pilot_policy", aal2, policyBody)), [{ enabled: true, revision: 2 }]);
    assert.deepEqual(ok(await rpc("set_pilot_account_admission", aal2, admissionBody)), [{ state: "active", revision: 1 }]);
    assert.equal(sql(`select count(*) from private.pilot_management_audit where actor_id=${quote(manager.id)}`), "2");
    await assertDenied(aal2, "set_pilot_policy", policy(1));
    assert.equal(sql(`select count(*) from private.pilot_management_audit where actor_id=${quote(manager.id)}`), "2");

    const session = JSON.parse(Buffer.from(aal2.split(".")[1], "base64url")).session_id;
    assert.ok(session);
    sql(`update auth.sessions set aal='aal1' where id=${quote(session)};`);
    await assertDenied(aal2, "set_pilot_policy", policy(2));
    await assertDenied(aal2, "set_pilot_account_admission", admissionBody);
    assert.equal(sql(`select count(*) from private.pilot_management_audit where actor_id=${quote(manager.id)}`), "2");

    const cases = ["expired", "factor", "deleted", "manager", "account"];
    for (const kind of cases) {
      const subject = await signup();
      sql(trusted(subject.id, "active", 0));
      const token = await verifiedTotpToken(request, subject.aal1);
      const sid = JSON.parse(Buffer.from(token.split(".")[1], "base64url")).session_id;
      if (kind === "expired") sql(`update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${quote(sid)};`);
      if (kind === "factor") sql(`update auth.mfa_factors set status='unverified' where id=(select factor_id from auth.sessions where id=${quote(sid)});`);
      if (kind === "deleted") sql(`delete from auth.sessions where id=${quote(sid)};`);
      if (kind === "manager") sql(trusted(subject.id, "revoked", 1));
      if (kind === "account") sql(`update public.accounts set status='suspended' where id=${quote(subject.id)};`);
      await assertDenied(token, "set_pilot_policy", policy(2));
      await assertDenied(token, "set_pilot_account_admission", admission(target.id));
      assert.equal(sql(`select count(*) from private.pilot_management_audit where actor_id=${quote(subject.id)}`), "0", `${kind} denial leaves no audit`);
    }
    assert.equal(sql("select enabled from private.pilot_availability"), "f");
  } finally {
    restoreDefaults();
    if (users.length) sql(`delete from auth.users where id in (${users.map(quote).join(",")});`);
  }
});
