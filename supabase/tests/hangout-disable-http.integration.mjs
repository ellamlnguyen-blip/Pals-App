import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase",
  ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const sql = (input) => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local",
  "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
{ input, encoding: "utf8" }).trim();
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
async function request(path, token, body) {
  const response = await fetch(`${status.API_URL}${path}`, { method: body ? "POST" : "GET",
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`,
      ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text();
  return { status: response.status, body: raw ? JSON.parse(raw) : null };
}
const rpc = (name, token, body = {}) => request(`/rest/v1/rpc/${name}`, token, body);
async function signup(data) {
  const email = `b2-http-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await request("/auth/v1/signup", null, { email, password, data });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)}`);
  const login = await request("/auth/v1/token?grant_type=password", null, { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, token: login.body.access_token };
}
const denied = (result) => {
  assert.ok([401, 403].includes(result.status), JSON.stringify(result));
  assert.equal(result.body?.code, "42501");
};

test("real Auth and PostgREST enforce disabled Hangout source boundaries", {
  concurrency: false, timeout: 120_000,
}, async () => {
  const [operator, host, attendee, forged] = await Promise.all([
    signup(), signup(), signup(), signup({ role: "admin" }),
  ]);
  try {
    sql(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text
      from public.accounts where id in (${[operator, host, attendee, forged]
        .map((u) => quote(u.id)).join(",")});
      update public.profiles set real_name='B2 HTTP',major='Science',graduation_year=2028,
        bio='Fixture',primary_photo_path=user_id::text||'/primary.png'
        where user_id in (${[operator, host, attendee, forged]
          .map((u) => quote(u.id)).join(",")});
      insert into public.platform_roles(user_id,role) values(${quote(operator.id)},'moderator');
      update private.hangout_feature_gate set enabled=true;
      update private.hangout_chat_feature_gate set enabled=true;
      update private.safety_feature_gate set enabled=true;
      update private.moderation_feature_gate set enabled=true;`);
    const made = await rpc("create_hangout", host.token, {
      p_request_id: crypto.randomUUID(), p_title: "B2 local fixture",
      p_starts_at: new Date(Date.now() + 3_600_000).toISOString(),
      p_public_place: "Approximate area", p_public_latitude: 35.91,
      p_public_longitude: -79.05, p_private_instructions: "Private meeting details",
    });
    assert.equal(made.status, 200, JSON.stringify(made));
    const hangout = made.body;
    assert.equal((await rpc("join_hangout", attendee.token,
      { p_hangout_id: hangout })).status, 204);
    const message = await rpc("send_hangout_message", host.token,
      { p_hangout_id: hangout, p_request_id: crypto.randomUUID(),
        p_body: "Earlier message" });
    assert.equal(message.status, 200, JSON.stringify(message));
    const report = crypto.randomUUID();
    sql(`insert into private.safety_reports(id,reporter_id,target_type,target_id,
      category,provenance_kind,provenance_ref_id) values
      (${quote(report)},${quote(attendee.id)},'hangout',${quote(hangout)},
       'harassment','retained_hangout',${quote(hangout)});`);
    denied(await rpc("apply_hangout_moderation_action", null,
      { p_report_id: report, p_request_id: crypto.randomUUID(),
        p_expected_case_revision: 1, p_reason: "Reason" }));
    denied(await rpc("apply_hangout_moderation_action", forged.token,
      { p_report_id: report, p_request_id: crypto.randomUUID(),
        p_expected_case_revision: 1, p_reason: "Reason" }));
    denied(await rpc("apply_hangout_moderation_action", attendee.token,
      { p_report_id: report, p_request_id: crypto.randomUUID(),
        p_expected_case_revision: 1, p_reason: "Reason" }));
    assert.deepEqual((await rpc("get_moderation_report", operator.token,
      { p_report_id: report })).body[0].target_disabled, false);
    const started = await rpc("transition_moderation_case", operator.token,
      { p_report_id: report, p_request_id: crypto.randomUUID(),
        p_expected_revision: 0, p_action: "start_review" });
    assert.deepEqual(started.body, [{ case_state: "in_review", revision: 1 }]);
    const requestId = crypto.randomUUID();
    const payload = { p_report_id: report, p_request_id: requestId,
      p_expected_case_revision: 1, p_reason: "  Local decision  " };
    const result = await rpc("apply_hangout_moderation_action", operator.token, payload);
    assert.deepEqual(result.body,
      [{ case_state: "closed", revision: 2, target_disabled: true }]);
    assert.deepEqual((await rpc("apply_hangout_moderation_action", operator.token,
      { ...payload, p_reason: "Local decision" })).body, result.body);
    denied(await rpc("apply_hangout_moderation_action", operator.token,
      { ...payload, p_reason: "Changed" }));
    assert.equal((await rpc("get_moderation_report", operator.token,
      { p_report_id: report })).body[0].target_disabled, true);
    for (const user of [host, attendee]) {
      const direct = await request(`/rest/v1/hangouts?select=id,title&id=eq.${hangout}`,
        user.token);
      assert.deepEqual(direct.body, []);
      assert.deepEqual((await request(`/rest/v1/hangout_participants?select=hangout_id&hangout_id=eq.${hangout}`,
        user.token)).body, []);
      assert.deepEqual((await request(`/rest/v1/hangout_private_locations?select=hangout_id&hangout_id=eq.${hangout}`,
        user.token)).body, []);
      denied(await rpc("read_hangout_messages", user.token,
        { p_hangout_id: hangout }));
      denied(await rpc("send_hangout_message", user.token,
        { p_hangout_id: hangout, p_request_id: crypto.randomUUID(),
          p_body: "After disable" }));
      assert.equal((await rpc("get_hangout_participant_state", user.token,
        { p_hangout_id: hangout, p_account_id: user.id })).body, "joined");
      assert.ok((await rpc("list_my_retained_hangout_ids", user.token)).body
        .some((row) => row.hangout_id === hangout));
    }
    for (const [name, params, token] of [
      ["join_hangout", { p_hangout_id: hangout }, attendee.token],
      ["leave_hangout", { p_hangout_id: hangout }, attendee.token],
      ["cancel_hangout", { p_hangout_id: hangout, p_expected_revision: 1 }, host.token],
      ["set_hangout_joining", { p_hangout_id: hangout,
        p_expected_revision: 1, p_joining_state: "closed" }, host.token],
    ]) denied(await rpc(name, token, params));
    assert.equal((await rpc("submit_safety_report", host.token,
      { p_request_id: crypto.randomUUID(), p_target_mode: "hangout",
        p_target_id: hangout, p_category: "harassment" })).status, 200);
    assert.equal((await request("/rest/v1/hangout_disables?select=*", operator.token)).status,
      404, "private disable table absent from REST");
    assert.equal(sql(`select count(*) from private.hangout_disables
      where hangout_id=${quote(hangout)}`), "1");
    assert.equal(sql(`select count(*) from private.moderation_audit
      where hangout_disable_id is not null and report_id=${quote(report)}`), "1");
    sql(`delete from public.platform_roles where user_id=${quote(operator.id)}`);
    denied(await rpc("apply_hangout_moderation_action", operator.token, payload));
  } finally {
    sql(`update private.moderation_feature_gate set enabled=false;
      update private.hangout_chat_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      update private.safety_feature_gate set enabled=false;
      -- Append-only moderation evidence and fixture users are removed by
      -- the final disposable database reset.`);
  }
});
