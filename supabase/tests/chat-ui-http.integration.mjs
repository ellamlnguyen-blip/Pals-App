import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";

const origin = process.env.WEB_TEST_ORIGIN;
assert.equal(origin, "http://127.0.0.1:3000");
const status = JSON.parse(execFileSync("pnpm", ["exec", "supabase", "status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { createServerClient } = require("@supabase/ssr");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
let hostCookie = "", peerCookie = "", hostId = "", peerId = "", discovererId = "";
function sql(statement) {
  return execFileSync("docker", ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: statement, encoding: "utf8" }).trim();
}
function client() {
  const jar = new Map();
  const auth = createServerClient(status.API_URL, key, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: values => { for (const {name,value} of values) jar.set(name,value); } } });
  return { auth, header: () => [...jar].map(([name,value]) => `${name}=${value}`).join("; ") };
}
async function signup() {
  const instance = client();
  const email = `chat-ui-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await instance.auth.auth.signUp({ email, password });
  assert.equal(created.error, null);
  const id = created.data.user.id;
  sql(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  assert.equal((await instance.auth.auth.signInWithPassword({ email, password })).error, null);
  return { ...instance, id };
}
async function page(path, cookie = "") {
  const response = await fetch(`${origin}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
  return { response, text: await response.text() };
}
async function api(id, cookie, method = "GET", payload, actor) {
  const response = await fetch(`${origin}/api/chat/${id}`, { method, headers: { Cookie: cookie, "x-pals-chat-actor": actor ?? (cookie === hostCookie ? hostId : cookie === peerCookie ? peerId : discovererId), ...(payload ? { "Content-Type": "application/json" } : {}) }, body: payload && JSON.stringify(payload), redirect: "manual" });
  return { response, data: await response.json() };
}

test("local chat UI routes use caller authorization, no-store and stable send keys", async () => {
  const users = [];
  let hangout;
  const extraHangouts = [];
  try {
    users.push(await signup(), await signup(), await signup());
    const [host, peer, discoverer] = users;
    hostCookie = host.header(); peerCookie = peer.header(); hostId = host.id; peerId = peer.id; discovererId = discoverer.id;
    sql(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts
      where id in ('${host.id}','${peer.id}','${discoverer.id}');
      update public.profiles set real_name='Chat UI',major='Science',graduation_year=2028,
        bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
        where user_id in ('${host.id}','${peer.id}','${discoverer.id}');
      update private.hangout_feature_gate set enabled=true; update private.hangout_chat_feature_gate set enabled=false;`);
    const made = await host.auth.rpc("create_hangout", { p_request_id: crypto.randomUUID(), p_title: "UI chat fixture", p_starts_at: new Date(Date.now() + 3600000).toISOString(), p_public_place: "Campus area", p_public_latitude: 35.913, p_public_longitude: -79.055 });
    assert.equal(made.error, null, made.error?.message);
    hangout = made.data;
    const off = await page("/chats", host.header());
    assert.equal(off.response.status, 200);
    assert.match(off.text, /Chat unavailable/);
    assert.doesNotMatch(off.text, new RegExp(`/chats/hangouts/${hangout}`));
    sql("update private.hangout_chat_feature_gate set enabled=true;");
    const list = await page("/chats", host.header());
    assert.equal(list.response.status, 200);
    assert.match(list.text, new RegExp(`/chats/hangouts/${hangout}`));
    extraHangouts.push(...Array.from({length: 25}, () => crypto.randomUUID()));
    const extraIds = extraHangouts.map(value => `'${value}'`).join(",");
    sql(`begin; insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude)
      select id,m.university_id,'${host.id}','UI list '||id,now()+interval '1 hour','Campus area',35.913,-79.055
      from unnest(array[${extraIds}]::uuid[]) id cross join public.university_memberships m where m.user_id='${host.id}';
      insert into public.hangout_participants(hangout_id,account_id,state)
      select id,'${host.id}','joined' from public.hangouts where id in (${extraIds}); commit;`);
    const all = [hangout, ...extraHangouts].sort();
    const listFirst = await page("/chats", host.header());
    const linked = [...new Set([...listFirst.text.matchAll(/href="\/chats\/hangouts\/([\da-f-]{36})"/g)].map(match => match[1]))];
    assert.equal(linked.length, 24, "at most 24 chat candidates are linked on one page");
    assert.match(listFirst.text, /Load more Hangouts/);
    assert.equal(linked.includes(all[24]), false);
    const listSecond = await page(`/chats?after=${all[23]}`, host.header());
    assert.match(listSecond.text, new RegExp(`/chats/hangouts/${all[24]}`));
    const detail = await page(`/hangouts/saved/${hangout}`, host.header());
    assert.match(detail.text, /Open Hangout chat/);
    const directDenied = await page(`/chats/hangouts/${hangout}`, discoverer.header());
    assert.doesNotMatch(directDenied.text, /chat-message/);
    assert.equal((await api(hangout, "")).response.status, 403);
    assert.equal((await api(hangout, discoverer.header())).response.status, 403);
    const empty = await api(hangout, host.header());
    assert.equal(empty.response.status, 200);
    assert.match(empty.response.headers.get("cache-control"), /no-store/);
    assert.deepEqual(empty.data.messages, []);
    assert.equal((await api(hangout, host.header(), "GET", undefined, peer.id)).response.status, 403);
    assert.equal((await api(hangout, host.header(), "POST", { key: crypto.randomUUID(), body: "Wrong account" }, peer.id)).response.status, 403);
    const keyId = crypto.randomUUID();
    const first = await api(hangout, host.header(), "POST", { key: keyId, body: "Hello <script>alert(1)</script>\nTonight?" });
    assert.equal(first.data.kind, "ok", JSON.stringify(first.data));
    const retry = await api(hangout, host.header(), "POST", { key: keyId, body: "Hello <script>alert(1)</script>\nTonight?" });
    assert.equal(retry.data.message.message_id, first.data.message.message_id);
    assert.equal((await api(hangout, host.header(), "POST", { key: keyId, body: "Changed" })).data.kind, "conflict");
    const thread = await page(`/chats/hangouts/${hangout}`, host.header());
    assert.equal(thread.response.status, 200);
    assert.doesNotMatch(thread.text, /Hello <script>/, "body is loaded only by guarded client API");
    assert.equal((await peer.auth.rpc("join_hangout", { p_hangout_id: hangout })).error, null);
    const peerRead = await api(hangout, peer.header());
    assert.equal(peerRead.data.messages[0].author_id, host.id);
    const peerPost = await api(hangout, peer.header(), "POST", { key: crypto.randomUUID(), body: "Peer message" });
    assert.equal(peerPost.data.kind, "ok");
    assert.equal((await peer.auth.rpc("leave_hangout", { p_hangout_id: hangout })).error, null);
    const redacted = await api(hangout, host.header());
    assert.equal(redacted.data.messages[1].author_id, null);
    assert.equal(redacted.data.messages[1].author_label, "Former participant");
    for (let i = 0; i < 49; i++) {
      const send = await host.auth.rpc("send_hangout_message", { p_hangout_id: hangout, p_request_id: crypto.randomUUID(), p_body: `Page ${i}` });
      assert.equal(send.error, null, send.error?.message);
    }
    const firstPage = await api(hangout, host.header());
    assert.equal(firstPage.data.messages.length, 50);
    const nextPage = await fetch(`${origin}/api/chat/${hangout}?after=${firstPage.data.messages.at(-1).sequence}`, { headers: { Cookie: host.header(), "x-pals-chat-actor": host.id } });
    assert.equal((await nextPage.json()).messages.length, 1);
    assert.equal((await api(hangout, peer.header())).response.status, 403);
    const leftPage = await page(`/chats/hangouts/${hangout}`, peer.header());
    assert.doesNotMatch(leftPage.text, /chat-message/);
    assert.equal((await peer.auth.rpc("join_hangout", { p_hangout_id: hangout })).error, null);
    assert.equal((await host.auth.rpc("remove_hangout_participant", { p_hangout_id: hangout, p_account_id: peer.id })).error, null);
    assert.equal((await api(hangout, peer.header())).response.status, 403);
    sql(`update public.accounts set status='suspended' where id='${host.id}';`);
    assert.equal((await api(hangout, host.header())).response.status, 403);
    sql(`update public.accounts set status='active' where id='${host.id}';`);
    assert.equal((await host.auth.rpc("cancel_hangout", { p_hangout_id: hangout, p_expected_revision: 1 })).error, null);
    assert.equal((await api(hangout, host.header())).response.status, 403);
    const cancelledPage = await page(`/chats/hangouts/${hangout}`, host.header());
    assert.doesNotMatch(cancelledPage.text, /chat-message/);
    sql("update private.hangout_chat_feature_gate set enabled=false;");
    assert.equal((await api(hangout, host.header())).response.status, 403);
    assert.equal((await api(hangout, host.header(), "POST", { key: crypto.randomUUID(), body: "Denied" })).response.status, 403);
  } finally {
    sql(`update private.hangout_chat_feature_gate set enabled=false; update private.hangout_feature_gate set enabled=false;
      set chat.allow_fixture_cleanup='true';
      delete from private.hangout_message_requests where hangout_id='${hangout ?? "00000000-0000-0000-0000-000000000000"}';
      delete from private.hangout_messages where conversation_id in (select id from private.hangout_conversations where hangout_id='${hangout ?? "00000000-0000-0000-0000-000000000000"}');
      delete from private.hangout_conversations where hangout_id='${hangout ?? "00000000-0000-0000-0000-000000000000"}';
      delete from private.hangout_create_requests where hangout_id='${hangout ?? "00000000-0000-0000-0000-000000000000"}';
      delete from public.hangouts where id in ('${hangout ?? "00000000-0000-0000-0000-000000000000"}'${extraHangouts.map(id => `,'${id}'`).join('')});
      update public.profiles set primary_photo_path=null where user_id in (${users.map(u => `'${u.id}'`).join(",") || "null"});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${users.map(u => `'${u.id}'`).join(",") || "null"});
      delete from auth.users where id in (${users.map(u => `'${u.id}'`).join(",") || "null"});`);
  }
});
