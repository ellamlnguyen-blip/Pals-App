import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// SERIAL disposable-local real Auth/PostgREST check. SQL only prepares and
// clears fixtures; every client submission uses its real signed bearer token.
const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
assert.match(status.DB_URL, /^postgresql?:\/\/postgres:[^@]*@127\.0\.0\.1:54322\/postgres$/);
const base = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const db = (statement) => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local",
  "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
{ input: statement, encoding: "utf8" }).trim();
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
async function request(method, path, token, body) {
  const response = await fetch(`${base}${path}`, { method,
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  return { status: response.status, body: raw ? JSON.parse(raw) : null };
}
const rpc = (token, body) => request("POST", "/rest/v1/rpc/submit_safety_report", token, body);
const input = (requestId, mode, target, category = "harassment", narrative = null) => ({
  p_request_id: requestId, p_target_mode: mode, p_target_id: target,
  p_category: category, p_narrative: narrative,
});
const receipt = (result) => {
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.length, 1);
  assert.deepEqual(Object.keys(result.body[0]).sort(), ["receipt_id", "submitted_at"]);
  assert.match(result.body[0].receipt_id, /^[0-9a-f-]{36}$/);
  assert.ok(Number.isFinite(Date.parse(result.body[0].submitted_at)));
  return result.body[0];
};
const denied = (result) => {
  assert.ok([400, 401, 403].includes(result.status), JSON.stringify(result));
  assert.equal(result.body?.code, "42501", JSON.stringify(result));
  assert.equal(result.body?.message, "Safety report unavailable");
};
async function signup() {
  const email = `report-http-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await request("POST", "/auth/v1/signup", null, { email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  db(`update auth.users set email_confirmed_at=now() where id=${quote(id)}`);
  const login = await request("POST", "/auth/v1/token?grant_type=password", null,
    { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, token: login.body.access_token };
}

test("report RPC uses real caller authority, private receipt and retained sources", {
  concurrency: false, timeout: 120_000,
}, async () => {
  const users = [];
  const hangouts = [];
  try {
    users.push(await signup(), await signup(), await signup());
    const [host, attendee, stranger] = users;
    const ids = users.map((u) => quote(u.id)).join(",");
    db(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text
      from public.accounts where id in (${ids});
      update public.profiles set real_name='Report HTTP',major='Science',
        graduation_year=2028,bio='Source-only biography',
        primary_photo_path=user_id::text||'/primary.png' where user_id in (${ids});
      insert into private.people_preferences(account_id,opted_in)
        select id,true from public.accounts where id in (${ids});`);
    const key1 = crypto.randomUUID();
    denied(await rpc(attendee.token, input(key1, "user", host.id)));
    const anonymous = await rpc(null, input(key1, "user", host.id));
    assert.ok([401, 403].includes(anonymous.status));
    assert.equal(anonymous.body.code, "42501");
    for (const table of ["safety_reports", "safety_report_requests"]) {
      const direct = await request("GET", `/rest/v1/${table}?select=*`, attendee.token);
      assert.equal(direct.status, 404);
      const platform = await request("GET", `/rest/v1/${table}?select=*`, status.SERVICE_ROLE_KEY);
      assert.equal(platform.status, 404);
    }
    const platformSubmit = await rpc(status.SERVICE_ROLE_KEY,
      input(key1, "user", host.id));
    assert.equal(platformSubmit.body?.code, "42501", "service role cannot submit or read a receipt");
    const embedded = await request("GET",
      `/rest/v1/accounts?select=id,safety_reports(*)&id=eq.${attendee.id}`, attendee.token);
    assert.notEqual(embedded.status, 200, "private reports have no exposed embed");
    db(`update private.safety_feature_gate set enabled=true;
      update private.people_feature_gate set enabled=true;
      update private.hangout_feature_gate set enabled=true;
      update private.friendship_feature_gate set enabled=true;`);
    const current = receipt(await rpc(attendee.token,
      input(key1, "user", host.id, " HARASSMENT ", "  Plain allegation  ")));
    assert.deepEqual(receipt(await rpc(attendee.token,
      input(key1, "user", host.id, "harassment", "Plain allegation"))), current);
    denied(await rpc(attendee.token, input(key1, "user", stranger.id)));
    const sameKeyOtherCaller = receipt(await rpc(stranger.token,
      input(key1, "user", host.id)));
    assert.notEqual(sameKeyOtherCaller.receipt_id, current.receipt_id);

    const create = await request("POST", "/rest/v1/rpc/create_hangout", host.token, {
      p_request_id: crypto.randomUUID(), p_title: "Source-only title",
      p_starts_at: new Date(Date.now() + 3600_000).toISOString(),
      p_public_place: "Source-only place", p_public_latitude: 35,
      p_public_longitude: -79, p_private_instructions: "Source-only door code",
    });
    assert.equal(create.status, 200, JSON.stringify(create.body));
    const hangout = create.body;
    hangouts.push(hangout);
    receipt(await rpc(stranger.token, input(crypto.randomUUID(), "hangout", hangout)));
    assert.equal(db(`select provenance_kind from private.safety_reports
      where reporter_id=${quote(stranger.id)} and target_type='hangout'`),
    "current_hangout", "nonparticipant uses current Hangout read authority");
    assert.equal((await request("POST", "/rest/v1/rpc/join_hangout", attendee.token,
      { p_hangout_id: hangout })).status, 204);
    const hostKey = crypto.randomUUID();
    const hostReceipt = receipt(await rpc(attendee.token,
      input(hostKey, "hangout_host", hangout, "other", " Host issue ")));
    assert.notEqual(hostReceipt.receipt_id, current.receipt_id);
    denied(await rpc(host.token, input(crypto.randomUUID(), "hangout_host", hangout)));
    denied(await rpc(stranger.token, input(crypto.randomUUID(), "hangout_host", hangout)));
    const unknown = crypto.randomUUID();
    const unknownError = await rpc(stranger.token, input(crypto.randomUUID(), "hangout", unknown));
    const deniedPeer = await rpc(stranger.token, input(crypto.randomUUID(), "user", unknown));
    denied(unknownError); denied(deniedPeer);
    assert.equal(unknownError.body.message, deniedPeer.body.message);
    const forged = await rpc(attendee.token, { ...input(crypto.randomUUID(), "user", host.id),
      p_reporter_id: host.id, p_campus_id: stranger.id, p_role: "moderator" });
    assert.notEqual(forged.status, 200, "forged fields never enter the RPC");
    const friendship = await request("POST", "/rest/v1/rpc/create_friend_request",
      stranger.token, { p_target_id: host.id, p_request_id: crypto.randomUUID() });
    assert.equal(friendship.status, 200, JSON.stringify(friendship.body));
    db(`delete from private.friendships where low_id in (${quote(host.id)},${quote(stranger.id)})
      and high_id in (${quote(host.id)},${quote(stranger.id)})`);

    db(`update public.hangout_participants set state='removed',removed_at=clock_timestamp()
      where hangout_id=${quote(hangout)} and account_id=${quote(attendee.id)};
      update private.hangout_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      update private.friendship_feature_gate set enabled=false;
      update private.people_preferences set opted_in=false where account_id=${quote(host.id)};
      update public.profiles set primary_photo_path=null where user_id=${quote(attendee.id)};`);
    denied(await rpc(stranger.token, input(crypto.randomUUID(), "user", attendee.id)));
    receipt(await rpc(stranger.token, input(crypto.randomUUID(), "user", host.id)));
    assert.equal(db(`select provenance_kind from private.safety_reports
      where reporter_id=${quote(stranger.id)} and target_type='user' and target_id=${quote(host.id)}
      order by submitted_at desc limit 1`), "friend_request");
    assert.deepEqual(receipt(await rpc(attendee.token,
      input(hostKey, "hangout_host", hangout, "other", "Host issue"))), hostReceipt);
    receipt(await rpc(attendee.token, input(crypto.randomUUID(), "hangout", hangout)));
    receipt(await rpc(attendee.token, input(crypto.randomUUID(), "user", host.id)));
    db(`delete from private.hangout_create_requests where hangout_id=${quote(hangout)};
      delete from public.hangouts where id=${quote(hangout)};`);
    hangouts.length = 0;
    assert.deepEqual(receipt(await rpc(attendee.token,
      input(hostKey, "hangout_host", hangout, "other", "Host issue"))), hostReceipt,
    "same-key replay survives actual source deletion without host resolution");
    assert.equal(db(`select count(*) from private.notification_items where actor_id in (${ids})
      or recipient_id in (${ids})`), "0", "reports produced no notification");
    db(`update private.safety_feature_gate set enabled=false`);
    denied(await rpc(attendee.token, input(hostKey, "hangout_host", hangout,
      "other", "Host issue")));
    db(`update private.safety_feature_gate set enabled=true;
      update public.accounts set status='suspended' where id=${quote(attendee.id)}`);
    denied(await rpc(attendee.token, input(hostKey, "hangout_host", hangout,
      "other", "Host issue")));
    assert.equal(db(`select count(*) from private.safety_reports
      where reporter_id=${quote(attendee.id)}`), "4");
    assert.equal(db(`select count(*) from private.safety_reports where
      narrative like '%Source-only%'`), "0", "no source text was copied");
  } finally {
    const ids = users.map((u) => quote(u.id)).join(",") || "null";
    const hs = hangouts.map(quote).join(",") || "null";
    db(`update private.safety_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      update private.friendship_feature_gate set enabled=false;
      delete from private.safety_report_requests where reporter_id in (${ids});
      delete from private.safety_reports where reporter_id in (${ids});
      delete from private.friendship_create_requests where actor_id in (${ids})
        or target_id in (${ids});
      delete from private.friendships where low_id in (${ids}) or high_id in (${ids});
      delete from private.hangout_peer_provenance where hangout_id in (${hs});
      delete from private.hangout_create_requests where hangout_id in (${hs});
      delete from public.hangouts where id in (${hs});
      update public.profiles set primary_photo_path=null where user_id in (${ids});
      delete from private.people_preferences where account_id in (${ids});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${ids});
      delete from auth.users where id in (${ids});`);
  }
});
