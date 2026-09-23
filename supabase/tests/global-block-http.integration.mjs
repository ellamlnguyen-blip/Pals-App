import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// SERIAL, DISPOSABLE-LOCAL integration test. Uses real GoTrue tokens and the
// exposed PostgREST surface; privileged SQL only prepares and clears fixtures.
const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
assert.equal(status.API_URL, "http://127.0.0.1:54321", "loopback local API required");
assert.match(status.DB_URL, /^postgresql?:\/\/postgres:[^@]*@127\.0\.0\.1:54322\/postgres$/,
  "loopback local database required");
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
assert.ok(key, "local publishable key required");
const db = (statement) => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local",
  "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
{ input: statement, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).trim();
assert.equal(db("select current_database()"), "postgres");
assert.equal(db("select count(*) from public.universities where id='00000000-0000-4000-8000-000000000001'"), "1");

async function request(method, path, token, body) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${token ?? key}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
const rpc = (name, token, body = {}) => request("POST", `/rest/v1/rpc/${name}`, token, body);
function rest(table, token, query = {}) {
  const params = new URLSearchParams(query);
  return request("GET", `/rest/v1/${table}?${params}`, token);
}
function expect(result, statusCode = 200) {
  assert.equal(result.status, statusCode, JSON.stringify(result.body));
  return result.body;
}
async function signup() {
  const email = `global-block-http-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = expect(await request("POST", "/auth/v1/signup", null, { email, password }));
  const id = created.user?.id ?? created.id;
  assert.match(id, /^[0-9a-f-]{36}$/);
  db(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  const login = expect(await request("POST", "/auth/v1/token?grant_type=password", null,
    { email, password }));
  return { id, token: login.access_token };
}
const neutral = (item) => item.source_kind === null && item.source_id === null
  && item.event_code === null && item.actor_id === null && item.target_id === null
  && item.label === "Unavailable" && Boolean(item.notification_id && item.created_at);

test("global blocks govern real Auth and PostgREST reads, writes and recovery", {
  concurrency: false, timeout: 120_000,
}, async () => {
  const users = [];
  const hangouts = [];
  try {
    users.push(await signup(), await signup(), await signup(), await signup());
    const [host, peer, thirdHost, otherAttendee] = users;
    const ids = users.map((u) => `'${u.id}'`).join(",");
    db(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in (${ids});
      update public.profiles set real_name='Global Block HTTP',major='Science',
        graduation_year=2028,bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
        where user_id in (${ids});
      insert into private.people_preferences(account_id,opted_in)
        select id,true from public.accounts where id in (${ids});`);

    assert.equal((await rpc("set_safety_block", host.token,
      { p_account_id: peer.id, p_blocked: true })).body.code, "42501",
    "new safety gate defaults off");
    assert.equal((await rpc("set_people_block", host.token,
      { p_account_id: peer.id, p_blocked: true })).body.code, "42501",
    "legacy write cannot bypass default-off gate");
    assert.equal((await rpc("list_my_retained_hangout_ids", host.token)).body.code, "42501");
    assert.ok([401, 403].includes((await rpc("set_safety_block", null,
      { p_account_id: peer.id, p_blocked: true })).status), "anon cannot write block");
    for (const table of ["people_blocks", "safety_feature_gate", "hangout_peer_provenance"])
      assert.equal((await rest(table, host.token, { select: "*" })).status, 404,
        `${table} cannot be read through exposed REST`);

    db(`update private.hangout_feature_gate set enabled=true;
      update private.hangout_chat_feature_gate set enabled=true;
      update private.notification_feature_gate set enabled=true;`);
    const start = new Date(Date.now() + 3600_000).toISOString();
    const create = (title, privateText) => ({ p_request_id: crypto.randomUUID(), p_title: title,
      p_starts_at: start, p_public_place: "Campus area", p_public_latitude: 35.913,
      p_public_longitude: -79.055, p_private_instructions: privateText });
    const first = expect(await rpc("create_hangout", host.token, create("Host Hangout", "Door 111")));
    hangouts.push(first);
    const second = expect(await rpc("create_hangout", thirdHost.token,
      create("Other Hangout", "Door 222")));
    hangouts.push(second);
    expect(await rpc("join_hangout", peer.token, { p_hangout_id: first }), 204);
    expect(await rpc("join_hangout", peer.token, { p_hangout_id: second }), 204);
    expect(await rpc("join_hangout", otherAttendee.token, { p_hangout_id: second }), 204);
    expect(await rpc("send_hangout_message", peer.token, { p_hangout_id: first,
      p_request_id: crypto.randomUUID(), p_body: "Blocked peer text" }));
    assert.equal(expect(await rest("hangouts", peer.token,
      { select: "id,hangout_private_locations(instructions)", id: `eq.${first}` }))[0]
      .hangout_private_locations.instructions, "Door 111");

    db("update private.safety_feature_gate set enabled=true");
    assert.equal(expect(await rpc("set_people_block", host.token,
      { p_account_id: peer.id, p_blocked: true })), true,
    "legacy RPC delegates to global block policy");
    assert.equal(expect(await rpc("set_safety_block", host.token,
      { p_account_id: peer.id, p_blocked: true })), true,
    "duplicate desired-state write is stable");
    assert.deepEqual(expect(await rest("hangouts", peer.token,
      { select: "id,title", id: `eq.${first}` })), [], "host block hides direct public row");
    assert.deepEqual(expect(await rest("hangouts", peer.token,
      { select: "id,hangout_participants(account_id),hangout_private_locations(instructions)",
        id: `eq.${first}` })), [], "host block hides embedded roster and private details");
    assert.deepEqual(expect(await rest("hangout_private_locations", peer.token,
      { select: "hangout_id,instructions", hangout_id: `eq.${first}` })), [],
    "host block hides direct private row");
    assert.deepEqual(expect(await rest("hangout_participants", peer.token,
      { select: "hangout_id,account_id", hangout_id: `eq.${first}` })), [],
    "host block hides direct roster");
    assert.equal((await rpc("read_hangout_messages", peer.token,
      { p_hangout_id: first })).body.code, "42501", "blocked peer cannot read chat");
    assert.equal((await rpc("join_hangout", peer.token,
      { p_hangout_id: first })).body.code, "42501", "blocked peer cannot rejoin");
    assert.deepEqual(expect(await rpc("read_hangout_messages", host.token,
      { p_hangout_id: first })), [], "blocked author history is omitted");
    assert.ok(expect(await rpc("list_notifications", host.token)).some(neutral),
      "blocked actor's old notifications become neutral");
    assert.equal(expect(await rpc("get_hangout_participant_state", host.token,
      { p_hangout_id: first, p_account_id: peer.id })), null,
    "host cannot recover blocked peer's state");
    assert.deepEqual(expect(await rpc("list_people_blocked_ids", host.token)),
      [{ account_id: peer.id }], "owner sees only outbound opaque ID");
    assert.deepEqual(expect(await rpc("list_people_blocked_ids", peer.token)), [],
      "peer gets no incoming-block list");
    assert.deepEqual(expect(await rpc("list_my_retained_hangout_ids", peer.token)),
      [{ hangout_id: first, own_state: "removed" },
        { hangout_id: second, own_state: "joined" }].sort((a, b) =>
        a.hangout_id.localeCompare(b.hangout_id)),
      "removed owner recovers only own retained IDs and states");
    assert.deepEqual(expect(await rpc("list_my_retained_hangout_ids", peer.token,
      { p_after_id: first, p_limit: 1 })),
      second > first ? [{ hangout_id: second, own_state: "joined" }] : [],
      "retained projection uses strict keyset cursor");
    assert.equal((await rpc("list_my_retained_hangout_ids", peer.token,
      { p_limit: 25 })).body.code, "22023", "recovery page is capped");
    assert.deepEqual(expect(await rest("hangouts", peer.token,
      { select: "id,title", id: `eq.${second}` })).map((r) => r.id), [second],
    "host block leaves unrelated Hangout available");

    assert.equal(expect(await rpc("set_safety_block", otherAttendee.token,
      { p_account_id: peer.id, p_blocked: true })), true,
    "nonhost blocks a current attendee");
    assert.deepEqual(expect(await rest("hangouts", otherAttendee.token,
      { select: "id,title", id: `eq.${second}` })).map((r) => r.id), [second],
    "attendee block preserves third-party public row");
    assert.equal(expect(await rest("hangout_participants", otherAttendee.token,
      { select: "account_id", hangout_id: `eq.${second}` }))
      .some((row) => row.account_id === peer.id), false,
    "attendee block hides blocked peer from direct roster");
  } finally {
    const ids = users.map((u) => `'${u.id}'`).join(",") || "null";
    const hs = hangouts.map((id) => `'${id}'`).join(",") || "null";
    db(`update private.safety_feature_gate set enabled=false;
      update private.notification_feature_gate set enabled=false;
      update private.hangout_chat_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      delete from private.notification_items where recipient_id in (${ids}) or actor_id in (${ids});
      delete from private.notification_preferences where recipient_id in (${ids});
      delete from private.people_blocks where blocker_id in (${ids}) or blocked_id in (${ids});
      set chat.allow_fixture_cleanup='true';
      delete from private.hangout_message_requests where hangout_id in (${hs});
      delete from private.hangout_messages where conversation_id in
        (select id from private.hangout_conversations where hangout_id in (${hs}));
      delete from private.hangout_conversations where hangout_id in (${hs});
      delete from private.hangout_create_requests where hangout_id in (${hs});
      delete from public.hangouts where id in (${hs});
      update public.profiles set primary_photo_path=null where user_id in (${ids});
      delete from private.people_preferences where account_id in (${ids});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${ids});
      delete from auth.users where id in (${ids});`);
  }
});
