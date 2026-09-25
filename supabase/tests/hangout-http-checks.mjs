import assert from "node:assert/strict";

export async function hangoutHttpChecks(owner, peer, host, member, sql, png, url, key) {
  const api = owner.auth;
  const requestId = crypto.randomUUID();
  const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const create = {
    p_request_id: requestId,
    p_title: " Tacos ",
    p_starts_at: start,
    p_public_place: "Campus area",
    p_public_latitude: 35.913,
    p_public_longitude: -79.055,
    p_private_instructions: "Room 123",
  };
  let id;
  let peerPath;
  try {
    assert.deepEqual((await api.from("hangouts").select("id")).data, [], "default gate hides rows over HTTP");
    assert.ok((await api.rpc("create_hangout", create)).error, "default gate denies HTTP create");
    sql("update private.hangout_feature_gate set enabled=true");
    const created = await api.rpc("create_hangout", create);
    assert.equal(created.error, null, created.error?.message);
    id = created.data;
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.equal((await api.rpc("create_hangout", { ...create, p_title: "Tacos" })).data, id, "HTTP retry returns same ID");
    assert.equal((await api.rpc("create_hangout", { ...create, p_title: "Changed" })).error?.code, "23505");
    assert.equal((await api.rpc("create_hangout", { ...create, p_request_id: crypto.randomUUID(), p_visibility: "invite_only" })).error?.code, "22023");
    assert.equal((await api.rpc("create_hangout", { ...create, p_request_id: crypto.randomUUID(), p_eligibility: {} })).error?.code, "22023");
    const publicRow = await api.from("hangouts").select("*").eq("id", id).single();
    assert.equal(publicRow.error, null);
    assert.equal(publicRow.data.revision, 1);
    assert.ok(!JSON.stringify(publicRow.data).includes("Room 123"), "public representation omits exact location");
    for (const [table, insert, update, key] of [
      ["hangouts", { title: "Forged" }, { title: "Forged" }, "id"],
      ["hangout_participants", { hangout_id: id, account_id: host.id, state: "joined" }, { state: "left" }, "hangout_id"],
      ["hangout_private_locations", { hangout_id: id, instructions: "Leak" }, { instructions: "Leak" }, "hangout_id"],
    ]) {
      assert.equal((await api.from(table).insert(insert)).error?.code, "42501", `${table} direct insert denied by grant`);
      assert.equal((await api.from(table).update(update).eq(key, id)).error?.code, "42501", `${table} direct update denied by grant`);
      assert.equal((await api.from(table).delete().eq(key, id)).error?.code, "42501", `${table} direct delete denied by grant`);
    }
    assert.equal((await api.from("hangout_private_locations").select("instructions").eq("hangout_id", id).single()).data?.instructions, "Room 123");
    assert.ok((await api.from("hangouts").select("*,hangout_private_locations(instructions)").eq("id", id)).data?.[0]?.hangout_private_locations, "host embed is allowed");
    const anon = await fetch(`${url}/rest/v1/hangouts?select=id`, { headers: { apikey: key } });
    assert.equal(anon.status, 401, "anonymous table read lacks grant");
    assert.equal((await peer.auth.from("hangouts").select("id")).data.length, 0, "incomplete peer cannot read");
    assert.ok((await peer.auth.rpc("join_hangout", { p_hangout_id: id })).error, "incomplete peer cannot join");
    peerPath = `${member.id}/${crypto.randomUUID()}.png`;
    assert.equal((await peer.auth.storage.from("profile-photos").upload(peerPath, png, { contentType: "image/png" })).error, null);
    assert.equal((await peer.auth.from("profiles").update({ real_name: "Peer", major: "Science", graduation_year: 2028, bio: "Local", primary_photo_path: peerPath }).eq("user_id", member.id)).error, null);
    assert.equal((await peer.auth.rpc("get_access_state")).data, "ready");
    assert.equal((await peer.auth.from("hangouts").select("id")).data.length, 1);
    assert.deepEqual((await peer.auth.from("hangout_private_locations").select("instructions")).data, [], "ready nonmember cannot read private");
    assert.equal((await peer.auth.from("hangouts").select("id,hangout_private_locations(instructions)").eq("id", id)).data?.[0]?.hangout_private_locations, null, "embed hides private");
    assert.equal((await peer.auth.rpc("join_hangout", { p_hangout_id: id })).error, null);
    assert.equal((await peer.auth.from("hangout_private_locations").select("instructions").eq("hangout_id", id).single()).data?.instructions, "Room 123");
    sql(`update auth.users set email='changed@example.invalid' where id='${member.id}'`);
    assert.deepEqual((await peer.auth.from("hangouts").select("id")).data, [], "stale email revokes HTTP reads");
    assert.deepEqual((await api.from("hangout_participants").select("account_id").eq("hangout_id", id)).data.map((r) => r.account_id), [host.id], "stale member disappears from current-ready roster");
    sql(`update auth.users set email='${member.email}' where id='${member.id}'`);
    assert.equal((await peer.auth.rpc("leave_hangout", { p_hangout_id: id })).error, null);
    assert.deepEqual((await peer.auth.from("hangout_private_locations").select("instructions")).data, [], "leave revokes private");
    assert.equal((await peer.auth.rpc("join_hangout", { p_hangout_id: id })).error, null);
    assert.equal((await api.rpc("remove_hangout_participant", { p_hangout_id: id, p_account_id: member.id, p_expected_revision: 1 })).error, null);
    assert.deepEqual((await peer.auth.from("hangout_private_locations").select("instructions")).data, [], "removal revokes private");
    assert.ok((await peer.auth.rpc("join_hangout", { p_hangout_id: id })).error, "removed peer cannot rejoin");
    assert.equal((await api.rpc("cancel_hangout", { p_hangout_id: id, p_expected_revision: 2 })).data, 3);
    assert.deepEqual((await api.from("hangout_private_locations").select("instructions")).data, [], "cancel hides exact details from host");
    assert.deepEqual((await peer.auth.from("hangouts").select("id")).data, [], "cancel hides public row from removed peer");
    sql("update private.hangout_feature_gate set enabled=false");
    assert.deepEqual((await api.from("hangouts").select("id")).data, [], "gate revokes existing HTTP row");
    assert.ok((await api.rpc("create_hangout", { ...create, p_request_id: crypto.randomUUID() })).error, "gate denies further HTTP calls");
  } finally {
    sql(`update private.hangout_feature_gate set enabled=false; delete from private.hangout_create_requests where host_id='${host.id}'; delete from public.hangouts where host_id='${host.id}';`);
    if (peerPath) {
      await peer.auth.from("profiles").update({ primary_photo_path: null }).eq("user_id", member.id);
      await peer.auth.storage.from("profile-photos").remove([peerPath]);
    }
  }
}
