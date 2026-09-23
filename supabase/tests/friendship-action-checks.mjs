import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// Public caller cookies and the real Next action transport. Only disposable local fixtures.
export async function friendshipActionChecks(owner, peer, a, b, png, sql) {
  if (!process.env.WEB_TEST_ORIGIN) return;
  const origin = process.env.WEB_TEST_ORIGIN;
  assert.equal(origin, "http://127.0.0.1:3000");
  const peerPath = `${b.id}/${crypto.randomUUID()}.png`;
  const ownerPhoto = (await owner.auth.from("profiles").select("primary_photo_path").eq("user_id", a.id).single()).data?.primary_photo_path;
  assert.ok(ownerPhoto && ownerPhoto.startsWith(`${a.id}/`));
  try {
    assert.equal((await peer.auth.storage.from("profile-photos").upload(peerPath, png, { contentType: "image/png" })).error, null);
    assert.equal((await peer.auth.from("profiles").update({ real_name: "Local friend peer", major: "Science", graduation_year: 2028, bio: "Local fixture", primary_photo_path: peerPath }).eq("user_id", b.id)).error, null);
    sql("update private.people_feature_gate set enabled=true; update private.friendship_feature_gate set enabled=true");
    assert.equal((await owner.auth.rpc("set_people_preference", { p_opted_in: true })).error, null);
    assert.equal((await peer.auth.rpc("set_people_preference", { p_opted_in: true })).error, null);
    const prod = new URL("../../apps/web/.next/server/server-reference-manifest.json", import.meta.url);
    const dev = new URL("../../apps/web/.next/dev/server/server-reference-manifest.json", import.meta.url);
    const manifest = JSON.parse(readFileSync(existsSync(prod) ? prod : dev, "utf8"));
    const ids = Object.fromEntries(Object.entries(manifest.node).map(([id, value]) => [value.exportedName, id]));
    for (const name of ["readFriendship", "createFriendRequest", "changeFriendship", "blockPerson"]) assert.ok(ids[name], name);
    async function action(name, args, cookie = owner.header(), path = `/people/${b.id}`) {
      const form = new FormData(); form.set("0", JSON.stringify(args));
      const response = await fetch(`${origin}${path}`, { method: "POST", headers: { Cookie: cookie, Origin: origin, "Next-Action": ids[name] }, body: form, redirect: "manual" });
      const body = await response.text();
      assert.equal(response.status, 200, body);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/, `${name} action response`);
      return body;
    }
    const anon = await fetch(`${origin}/people/friends`, { redirect: "manual" });
    assert.ok(anon.headers.get("location")?.includes("/signin") || (await anon.text()).includes("/signin"));
    const page = await fetch(`${origin}/people/friends`, { headers: { Cookie: owner.header() } });
    assert.equal(page.status, 200); assert.match(page.headers.get("cache-control") ?? "", /no-store/);
    assert.match(await page.text(), /Your friendships/);
    const invalid = await fetch(`${origin}/people/friends?after=bad`, { headers: { Cookie: owner.header() } });
    assert.match(await invalid.text(), /Invalid page/);
    assert.match(await action("createFriendRequest", [b.id, crypto.randomUUID()], ""), /Friendship is unavailable/);
    const key1 = crypto.randomUUID();
    assert.match(await action("createFriendRequest", [b.id, key1]), /Current request status is shown/);
    const outgoing = await owner.auth.rpc("get_friendship", { p_peer_id: b.id });
    assert.equal(outgoing.data?.[0]?.direction, "outgoing");
    const generation = outgoing.data[0].generation_id;
    assert.match(await action("changeFriendship", [a.id, generation, "accept"], peer.header(), `/people/friends`), /Current relationship status is shown/);
    assert.equal((await owner.auth.rpc("get_friendship", { p_peer_id: b.id })).data?.[0]?.state, "accepted");
    assert.match(await action("changeFriendship", [b.id, crypto.randomUUID(), "unfriend"]), /This request changed/);
    assert.equal((await owner.auth.from("profiles").update({ primary_photo_path: null }).eq("user_id", a.id)).error, null);
    assert.equal((await owner.auth.rpc("get_access_state")).data, "onboarding");
    const idOnly = await fetch(`${origin}/people/friends`, { headers: { Cookie: owner.header() } });
    assert.equal(idOnly.status, 200);
    const idOnlyHtml = await idOnly.text();
    assert.match(idOnlyHtml, new RegExp(b.id));
    assert.doesNotMatch(idOnlyHtml, /Local friend peer/);
    assert.match(await action("changeFriendship", [b.id, generation, "unfriend"], owner.header(), "/people/friends"), /Current relationship status is shown/);
    assert.equal((await owner.auth.from("profiles").update({ primary_photo_path: ownerPhoto }).eq("user_id", a.id)).error, null);
    assert.deepEqual((await owner.auth.rpc("get_friendship", { p_peer_id: b.id })).data, []);
    assert.match(await action("createFriendRequest", [b.id, key1]), /The request was unavailable/);
    const key2 = crypto.randomUUID();
    assert.match(await action("createFriendRequest", [b.id, key2]), /Current request status is shown/);
    const second = (await owner.auth.rpc("get_friendship", { p_peer_id: b.id })).data[0].generation_id;
    assert.match(await action("changeFriendship", [b.id, second, "cancel"]), /Current relationship status is shown/);
    assert.match(await action("createFriendRequest", [b.id, crypto.randomUUID()]), /The request was unavailable/);
    assert.match(await action("createFriendRequest", [a.id, crypto.randomUUID()], peer.header(), `/people/${a.id}`), /Current request status is shown/);
    assert.equal((await peer.auth.rpc("set_people_preference", { p_opted_in: false })).error, null);
    assert.match(await action("createFriendRequest", [b.id, crypto.randomUUID()]), /Friendship is unavailable/);
    const hiddenFriend = await fetch(`${origin}/people/friends`, { headers: { Cookie: owner.header() } });
    assert.doesNotMatch(await hiddenFriend.text(), /Local friend peer/);
    sql("update private.people_feature_gate set enabled=false");
    assert.match(await action("blockPerson", [b.id]), /could not confirm the block/);
    sql("update private.people_feature_gate set enabled=true; update private.friendship_feature_gate set enabled=false");
    assert.match(await action("readFriendship", [b.id]), /Friendship is unavailable/);
    assert.match(await action("blockPerson", [b.id]), /outbound block list/);
    assert.deepEqual((await owner.auth.rpc("list_people_blocked_ids")).data, [{ account_id: b.id }]);
    sql("update private.friendship_feature_gate set enabled=true");
    assert.deepEqual((await owner.auth.rpc("get_friendship", { p_peer_id: b.id })).data, []);
    const hidden = await fetch(`${origin}/people/${b.id}`, { headers: { Cookie: owner.header() } });
    assert.doesNotMatch(await hidden.text(), /Local friend peer/);
    sql("update public.accounts set status='suspended' where id='" + a.id + "'");
    const denied = await fetch(`${origin}/people/friends`, { headers: { Cookie: owner.header() }, redirect: "manual" });
    assert.ok(denied.headers.get("location")?.includes("/restricted") || (await denied.text()).includes("/restricted"));
    sql("update public.accounts set status='active' where id='" + a.id + "'");
  } finally {
    sql(`update public.accounts set status='active' where id='${a.id}'`);
    await owner.auth.from("profiles").update({ primary_photo_path: ownerPhoto }).eq("user_id", a.id);
    sql(`update private.friendship_feature_gate set enabled=false; update private.people_feature_gate set enabled=false;
      delete from private.people_blocks where blocker_id in ('${a.id}','${b.id}') or blocked_id in ('${a.id}','${b.id}');`);
    await peer.auth.from("profiles").update({ primary_photo_path: null }).eq("user_id", b.id);
    await peer.auth.storage.from("profile-photos").remove([peerPath]);
  }
}
