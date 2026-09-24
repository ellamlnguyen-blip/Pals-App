import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// Disposable local Auth/PostgREST exercise. SQL is fixture setup/cleanup only.
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
  const email = `moderation-http-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await request("/auth/v1/signup", null, { email, password, data });
  assert.equal(created.status, 200);
  const id = created.body.user?.id ?? created.body.id;
  sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)}`);
  const login = await request("/auth/v1/token?grant_type=password", null,
    { email, password });
  assert.equal(login.status, 200);
  return { id, token: login.body.access_token };
}
function denied(result) {
  assert.ok([401, 403].includes(result.status), JSON.stringify(result.body));
  assert.equal(result.body?.code, "42501");
  assert.equal(result.body?.message, "Moderation unavailable");
}
function sourceDenied(result) {
  assert.ok([401, 403].includes(result.status), JSON.stringify(result.body));
  assert.equal(result.body?.code, "42501");
}

test("moderation RPCs use live role/gate checks and allowlisted audited projections", {
  concurrency: false, timeout: 120_000,
}, async () => {
  const users = [];
  let report;
  let selfFiledReport;
  let selfTargetReport;
  let ownHangoutReport;
  let hangout;
  try {
    users.push(await signup(), await signup({ role: "admin" }), await signup(),
      await signup());
    const [operator, reporter, target, secondOperator] = users;
    const claims = JSON.parse(Buffer.from(reporter.token.split(".")[1], "base64url"));
    assert.equal(claims.user_metadata.role, "admin");
    assert.equal(claims.role, "authenticated");
    report = crypto.randomUUID();
    selfFiledReport = crypto.randomUUID();
    selfTargetReport = crypto.randomUUID();
    ownHangoutReport = crypto.randomUUID();
    hangout = crypto.randomUUID();
    sql(`insert into public.platform_roles(user_id,role)
      values (${quote(operator.id)},'moderator'),
        (${quote(secondOperator.id)},'admin');
      insert into private.safety_reports(id,reporter_id,target_type,target_id,
        category,narrative,provenance_kind,provenance_ref_id)
      values (${quote(report)},${quote(reporter.id)},'user',${quote(target.id)},
        'other','Local allegation','current_people',${quote(target.id)}),
        (${quote(selfFiledReport)},${quote(operator.id)},'user',${quote(target.id)},
        'harassment',null,'current_people',${quote(target.id)}),
        (${quote(selfTargetReport)},${quote(reporter.id)},'user',${quote(operator.id)},
        'harassment',null,'current_people',${quote(operator.id)});
      begin;
      insert into public.hangouts(id,university_id,host_id,title,starts_at,
        public_place,public_latitude,public_longitude) values
        (${quote(hangout)},(select id from public.universities
          where slug='unc-chapel-hill'),${quote(operator.id)},'Local fixture',
          now()+interval '1 hour','Approximate place',35,-79);
      insert into public.hangout_participants(hangout_id,account_id,state)
        values (${quote(hangout)},${quote(operator.id)},'joined');
      commit;
      insert into private.safety_reports(id,reporter_id,target_type,target_id,
        category,provenance_kind,provenance_ref_id)
        values (${quote(ownHangoutReport)},${quote(reporter.id)},'hangout',
          ${quote(hangout)},'harassment','current_hangout',${quote(hangout)});`);
    denied(await rpc("list_moderation_reports", operator.token));
    denied(await rpc("get_moderation_report", reporter.token,
      { p_report_id: report }));
    denied(await rpc("list_moderation_reports", reporter.token));
    const anon = await rpc("list_moderation_reports", null);
    assert.ok([401, 403, 404].includes(anon.status));
    for (const table of ["moderation_cases", "moderation_audit", "safety_reports"]) {
      const direct = await request(`/rest/v1/${table}?select=*`, operator.token);
      assert.equal(direct.status, 404);
    }
    sql(`update private.moderation_feature_gate set enabled=true;
      update private.people_feature_gate set enabled=true;
      update private.friendship_feature_gate set enabled=true;
      update private.dm_feature_gate set enabled=true;
      update private.notification_feature_gate set enabled=true;
      update private.safety_feature_gate set enabled=true;
      update private.hangout_feature_gate set enabled=true;`);
    denied(await rpc("get_moderation_report", reporter.token,
      { p_report_id: report }));
    denied(await rpc("list_moderation_reports", reporter.token));
    const page = await rpc("list_moderation_reports", operator.token);
    assert.equal(page.status, 200, JSON.stringify(page.body));
    assert.equal(page.body.length, 1);
    assert.deepEqual(Object.keys(page.body[0]).sort(),
      ["case_state", "category", "report_id", "reporter_id", "submitted_at",
        "target_id", "target_type"]);
    assert.equal(page.body[0].report_id, report);
    const beforeConflictAudit = Number(sql("select count(*) from private.moderation_audit"));
    for (const conflicted of [selfFiledReport, selfTargetReport, ownHangoutReport]) {
      denied(await rpc("get_moderation_report", operator.token,
        { p_report_id: conflicted }));
      denied(await rpc("transition_moderation_case", operator.token,
        { p_report_id: conflicted, p_request_id: crypto.randomUUID(),
          p_expected_revision: 0, p_action: "start_review" }));
    }
    assert.equal(Number(sql("select count(*) from private.moderation_audit")),
      beforeConflictAudit, "conflict denial does not append audit");
    const detail = await rpc("get_moderation_report", operator.token,
      { p_report_id: report });
    assert.equal(detail.status, 200, JSON.stringify(detail.body));
    assert.deepEqual(Object.keys(detail.body[0]).sort(),
      ["case_note", "case_revision", "case_state", "category", "disposition", "narrative",
        "provenance_kind", "provenance_ref_id", "report_id", "reporter_id",
        "submitted_at", "target_campus_id", "target_disabled", "target_id", "target_status", "target_type"]);
    assert.equal(detail.body[0].narrative, "Local allegation");
    assert.equal(detail.body[0].case_revision, 0);
    const requestId = crypto.randomUUID();
    const input = { p_report_id: report, p_request_id: requestId,
      p_expected_revision: 0, p_action: "start_review" };
    const first = await rpc("transition_moderation_case", operator.token, input);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.deepEqual(first.body, [{ case_state: "in_review", revision: 1 }]);
    assert.deepEqual((await rpc("transition_moderation_case", operator.token, input)).body,
      first.body);
    const secondDetail = await rpc("get_moderation_report", secondOperator.token,
      { p_report_id: report });
    assert.equal(secondDetail.status, 200, JSON.stringify(secondDetail.body));
    assert.equal(secondDetail.body[0].case_revision, 1,
      "second operator learns current revision through audited detail");
    const annotate = await rpc("transition_moderation_case", operator.token,
      { p_report_id: report, p_request_id: crypto.randomUUID(),
        p_expected_revision: 1, p_action: "annotate", p_note: "Reviewed evidence" });
    assert.deepEqual(annotate.body, [{ case_state: "in_review", revision: 2 }]);
    const beforeStaleAudit = Number(sql("select count(*) from private.moderation_audit"));
    denied(await rpc("transition_moderation_case", secondOperator.token,
      { p_report_id: report, p_request_id: crypto.randomUUID(),
        p_expected_revision: secondDetail.body[0].case_revision,
        p_action: "annotate", p_note: "Stale second review" }));
    assert.equal(Number(sql("select count(*) from private.moderation_audit")),
      beforeStaleAudit, "stale second-operator action writes no audit");
    const refreshed = await rpc("get_moderation_report", secondOperator.token,
      { p_report_id: report });
    assert.equal(refreshed.body[0].case_revision, 2);
    assert.equal(sql(`select count(*) from private.moderation_audit
      where report_id=${quote(report)} and action='start_review'`), "1");
    assert.equal(sql(`select count(*) from private.moderation_audit
      where action='queue_read' and ${quote(report)}::uuid=any(page_report_ids)`), "1");
    const beforeRestrictedAudit = Number(sql("select count(*) from private.moderation_audit"));
    sql(`update public.accounts set status='suspended' where id=${quote(operator.id)}`);
    denied(await rpc("transition_moderation_case", operator.token, input));
    sql(`update public.accounts set status='banned' where id=${quote(operator.id)}`);
    denied(await rpc("get_moderation_report", operator.token,
      { p_report_id: report }));
    denied(await rpc("transition_moderation_case", operator.token, input));
    sql(`update public.accounts set status='active' where id=${quote(operator.id)};
      update private.moderation_feature_gate set enabled=false`);
    denied(await rpc("transition_moderation_case", operator.token, input));
    assert.equal(Number(sql("select count(*) from private.moderation_audit")),
      beforeRestrictedAudit, "status and gate denials do not append audit");
    const photoPath = `${target.id}/${crypto.randomUUID()}.png`;
    const targetEmail = sql(`select email from auth.users where id=${quote(target.id)}`);
    sql(`update public.universities set allowed_email_domains=array['unc.edu']
      where slug='unc-chapel-hill';
      insert into public.university_memberships(user_id,university_id,verified_at,
      verification_email) values (${quote(target.id)},
      (select id from public.universities where slug='unc-chapel-hill'),
      now(),${quote(targetEmail)}) on conflict (user_id) do update
      set university_id=excluded.university_id,verified_at=excluded.verified_at,
        verification_email=excluded.verification_email;`);
    const photoHeaders = { apikey: key, authorization: `Bearer ${target.token}` };
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");
    const upload = await fetch(`${status.API_URL}/storage/v1/object/profile-photos/${photoPath}`,
      { method: "POST", headers: { ...photoHeaders, "content-type": "image/png" },
        body: png });
    assert.equal(upload.status, 200, await upload.text());
    const sign = await fetch(`${status.API_URL}/storage/v1/object/sign/profile-photos/${photoPath}`,
      { method: "POST", headers: { ...photoHeaders, "content-type": "application/json" },
        body: JSON.stringify({ expiresIn: 8 }) });
    assert.equal(sign.status, 200);
    const signedPath = (await sign.json()).signedURL;
    assert.ok(signedPath);
    sql("update private.moderation_feature_gate set enabled=true");
    const sanctionRequest = crypto.randomUUID();
    const sanctionInput = { p_report_id: report, p_request_id: sanctionRequest,
      p_expected_case_revision: 2, p_action: "suspend", p_reason: "  Local decision  " };
    denied(await rpc("apply_account_moderation_action", reporter.token, sanctionInput));
    denied(await rpc("apply_account_moderation_action", operator.token,
      { ...sanctionInput, p_action: "ban" }));
    const sanctioned = await rpc("apply_account_moderation_action", operator.token,
      sanctionInput);
    assert.deepEqual(sanctioned.body,
      [{ case_state: "closed", revision: 3, account_status: "suspended" }]);
    assert.deepEqual((await rpc("apply_account_moderation_action", operator.token,
      { ...sanctionInput, p_reason: "Local decision" })).body, sanctioned.body);
    denied(await rpc("apply_account_moderation_action", operator.token,
      { ...sanctionInput, p_reason: "Changed" }));
    assert.equal((await rpc("get_access_state", target.token)).body, "restricted");
    const ownStatus = await request(`/rest/v1/accounts?select=status&id=eq.${target.id}`,
      target.token);
    assert.deepEqual(ownStatus.body, [{ status: "suspended" }]);
    assert.deepEqual((await request(`/rest/v1/profiles?select=user_id&user_id=eq.${target.id}`,
      target.token)).body, []);
    assert.deepEqual((await request("/rest/v1/hangouts?select=id", target.token)).body,
      [], "direct Hangout and Calendar source reads deny restricted actor");
    for (const [name, args] of [
      ["get_people_preference", {}], ["list_friendships", {}],
      ["list_dm_inbox", {}], ["get_notification_preferences", {}],
      ["list_my_retained_hangout_ids", {}],
      ["submit_safety_report", { p_request_id: crypto.randomUUID(),
        p_target_mode: "user", p_target_id: reporter.id, p_category: "harassment" }],
    ]) sourceDenied(await rpc(name, target.token, args));
    const afterPhoto = await fetch(`${status.API_URL}/storage/v1/object/authenticated/profile-photos/${photoPath}`,
      { headers: photoHeaders });
    assert.ok(afterPhoto.status >= 400, "new authenticated photo read denied");
    const afterSign = await fetch(`${status.API_URL}/storage/v1/object/sign/profile-photos/${photoPath}`,
      { method: "POST", headers: { ...photoHeaders, "content-type": "application/json" },
        body: JSON.stringify({ expiresIn: 8 }) });
    assert.ok(afterSign.status >= 400, "new signed URL issuance denied");
    const bearerUrl = new URL(signedPath.startsWith("/object/")
      ? `/storage/v1${signedPath}` : signedPath, status.API_URL);
    assert.equal(bearerUrl.origin, status.API_URL);
    assert.equal((await fetch(bearerUrl)).status, 200,
      "preissued bearer URL still works immediately after sanction");
    await new Promise((resolve) => setTimeout(resolve, 8500));
    assert.ok((await fetch(bearerUrl)).status >= 400,
      "local signed URL expires");
    assert.equal((await request("/rest/v1/account_sanctions?select=*", operator.token)).status,
      404, "private sanction table has no REST reader");
    const reopened = await rpc("transition_moderation_case", secondOperator.token,
      { p_report_id: report, p_request_id: crypto.randomUUID(),
        p_expected_revision: 3, p_action: "reopen", p_note: "Further review" });
    assert.equal(reopened.body?.[0]?.revision, 4);
    const banRequest = crypto.randomUUID();
    const banInput = { p_report_id: report, p_request_id: banRequest,
      p_expected_case_revision: 4, p_action: "ban", p_reason: "Decision" };
    assert.equal((await rpc("apply_account_moderation_action", secondOperator.token,
      banInput)).body?.[0]?.account_status, "banned");
    sql(`update public.platform_roles set role='moderator'
      where user_id=${quote(secondOperator.id)}`);
    denied(await rpc("apply_account_moderation_action", secondOperator.token, banInput));
    assert.equal(sql(`select count(*) from private.moderation_audit
      where report_id=${quote(report)} and action='ban'`), "1");
  } finally {
    sql(`update private.moderation_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      update private.friendship_feature_gate set enabled=false;
      update private.dm_feature_gate set enabled=false;
      update private.notification_feature_gate set enabled=false;
      update private.safety_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      -- Moderation evidence is append-only. The final disposable database
      -- reset clears all test users, reports, sanctions and audit entries.`);
  }
});
