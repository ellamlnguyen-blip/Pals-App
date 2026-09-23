import assert from "node:assert/strict";

export async function peopleHttpChecks(owner, peer, a, b, sql, png, url, key) {
  const ownerApi = owner.auth;
  const peerApi = peer.auth;
  const peerPath = `${b.id}/${crypto.randomUUID()}.png`;
  try {
    assert.equal((await ownerApi.rpc("get_people_preference")).data, false);
    assert.equal((await ownerApi.rpc("set_people_preference", { p_opted_in: true })).error?.code, "42501");
    assert.equal((await ownerApi.rpc("set_people_preference", { p_opted_in: false })).data, false);
    assert.equal((await ownerApi.rpc("browse_people")).error?.code, "42501");
    assert.equal((await peerApi.storage.from("profile-photos").upload(peerPath, png, { contentType: "image/png" })).error, null);
    assert.equal((await peerApi.from("profiles").update({ real_name: "\u00a0Peer\u00a0", major: "Science", graduation_year: 2028, bio: "Local", primary_photo_path: peerPath }).eq("user_id", b.id)).error, null);
    assert.equal((await peerApi.rpc("get_access_state")).data, "ready");
    sql("update private.people_feature_gate set enabled=true");
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: true })).error, null);
    const card = await ownerApi.rpc("browse_people", { p_search: "peer" });
    assert.equal(card.error, null, card.error?.message);
    assert.deepEqual(card.data.map((row) => Object.keys(row).sort()), [
      ["account_id", "campus_name", "graduation_year", "major", "real_name"],
    ]);
    assert.equal(card.data[0].account_id, b.id);
    assert.equal(card.data[0].real_name, "\u00a0Peer\u00a0");
    const { data: { session } } = await ownerApi.auth.getSession();
    assert.ok(session?.access_token);
    const cursorResponse = await fetch(`${url}/rest/v1/rpc/browse_people`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
      body: JSON.stringify({ p_after_name: card.data[0].real_name, p_after_id: card.data[0].account_id, p_limit: 1 }),
    });
    const cursorBody = await cursorResponse.text();
    assert.equal(cursorResponse.status, 200, cursorBody);
    assert.deepEqual(JSON.parse(cursorBody), [], "raw NBSP cursor accepted by direct PostgREST RPC");
    const detail = await ownerApi.rpc("get_people_detail", { p_account_id: b.id });
    assert.equal(detail.error, null);
    assert.deepEqual(Object.keys(detail.data[0]).sort(), [
      "account_id", "bio", "campus_name", "down_to_do", "graduation_year", "interests", "major", "real_name",
    ]);
    assert.deepEqual((await ownerApi.from("profiles").select("user_id").eq("user_id", b.id)).data, []);
    assert.deepEqual((await ownerApi.from("profiles").select("user_id,accounts(id)").eq("user_id", b.id)).data, []);
    assert.deepEqual((await ownerApi.from("accounts").select("id,profiles(user_id)").eq("id", b.id)).data, []);
    assert.equal((await ownerApi.from("people_preferences").select("*")).error?.code, "PGRST205");
    assert.equal((await ownerApi.from("people_blocks").select("*")).error?.code, "PGRST205");
    assert.equal((await ownerApi.from("people_preferences").insert({ account_id: b.id, opted_in: true })).error?.code, "PGRST205");
    assert.equal((await ownerApi.from("people_blocks").insert({ blocker_id: a.id, blocked_id: b.id })).error?.code, "PGRST205");
    assert.equal((await ownerApi.rpc("browse_people", { p_limit: 25 })).error?.code, "22023");
    assert.equal((await ownerApi.rpc("browse_people", { p_after_name: "peer" })).error?.code, "22023");
    const anon = await fetch(`${url}/rest/v1/rpc/browse_people`, {
      method: "POST", headers: { apikey: key, "content-type": "application/json" }, body: "{}",
    });
    assert.ok(anon.status === 401 || anon.status === 403, "anonymous RPC denied");
    assert.equal((await ownerApi.rpc("set_people_preference", { p_opted_in: true })).data, true);
    assert.equal((await peerApi.rpc("get_people_detail", { p_account_id: a.id })).data?.[0]?.account_id, a.id);
    assert.equal((await ownerApi.rpc("set_people_block", { p_account_id: b.id, p_blocked: true })).data, true);
    assert.equal((await ownerApi.rpc("set_people_block", { p_account_id: b.id, p_blocked: true })).data, true);
    assert.deepEqual((await ownerApi.rpc("get_people_detail", { p_account_id: b.id })).data, []);
    assert.deepEqual((await peerApi.rpc("get_people_detail", { p_account_id: a.id })).data, []);
    assert.deepEqual((await peerApi.rpc("browse_people", { p_search: "Local Test Student" })).data, []);
    assert.deepEqual((await ownerApi.rpc("list_people_blocked_ids")).data, [{ account_id: b.id }]);
    assert.deepEqual((await peerApi.rpc("list_people_blocked_ids")).data, []);
    assert.equal((await ownerApi.rpc("set_people_block", { p_account_id: b.id, p_blocked: false })).data, false);
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: false })).data, false);
    assert.deepEqual((await ownerApi.rpc("get_people_detail", { p_account_id: b.id })).data, []);
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: true })).data, true);
    sql(`update auth.users set email='changed@example.invalid' where id='${b.id}'`);
    assert.deepEqual((await ownerApi.rpc("get_people_detail", { p_account_id: b.id })).data, []);
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: false })).data, false);
    sql("update private.people_feature_gate set enabled=false");
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: false })).data, false);
    assert.equal((await ownerApi.rpc("browse_people")).error?.code, "42501");
  } finally {
    sql(`update private.people_feature_gate set enabled=false;
      delete from private.people_blocks where blocker_id in ('${a.id}','${b.id}') or blocked_id in ('${a.id}','${b.id}');
      delete from private.people_preferences where account_id in ('${a.id}','${b.id}');
      update auth.users set email='${b.email}' where id='${b.id}';`);
    await peerApi.from("profiles").update({ primary_photo_path: null }).eq("user_id", b.id);
    await peerApi.storage.from("profile-photos").remove([peerPath]);
  }
}
