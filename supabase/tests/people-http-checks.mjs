import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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
    const rawPeerName = `${" ".repeat(100)}\u00a0Peer\u00a0`;
    assert.equal((await peerApi.from("profiles").update({ real_name: rawPeerName, major: "Science", graduation_year: 2028, bio: "Local", primary_photo_path: peerPath }).eq("user_id", b.id)).error, null);
    assert.equal((await peerApi.rpc("get_access_state")).data, "ready");
    sql("update private.people_feature_gate set enabled=true; update private.safety_feature_gate set enabled=true");
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: true })).error, null);
    const card = await ownerApi.rpc("browse_people", { p_search: "peer" });
    assert.equal(card.error, null, card.error?.message);
    assert.deepEqual(card.data.map((row) => Object.keys(row).sort()), [
      ["account_id", "campus_name", "graduation_year", "major", "real_name"],
    ]);
    assert.equal(card.data[0].account_id, b.id);
    assert.equal(card.data[0].real_name, rawPeerName);
    const { data: { session } } = await ownerApi.auth.getSession();
    assert.ok(session?.access_token);
    const cursorResponse = await fetch(`${url}/rest/v1/rpc/browse_people`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
      body: JSON.stringify({ p_after_id: card.data[0].account_id, p_limit: 1 }),
    });
    const cursorBody = await cursorResponse.text();
    assert.equal(cursorResponse.status, 200, cursorBody);
    assert.deepEqual(JSON.parse(cursorBody), [], "ID-only cursor accepted for long raw name by direct PostgREST RPC");
    assert.equal((await ownerApi.rpc("browse_people", { p_after_name: rawPeerName, p_after_id: b.id })).error?.code, "22023");
    assert.equal((await ownerApi.rpc("browse_people", { p_after_id: "00000000-0000-4000-8000-000000000099" })).error?.code, "42501");
    const detail = await ownerApi.rpc("get_people_detail", { p_account_id: b.id });
    assert.equal(detail.error, null);
    assert.deepEqual(Object.keys(detail.data[0]).sort(), [
      "account_id", "bio", "campus_name", "down_to_do", "graduation_year", "interests", "major", "real_name",
    ]);
    sql("update private.people_feature_gate set enabled=false");
    assert.equal((await ownerApi.rpc("set_safety_block", { p_account_id: b.id, p_blocked: true })).error?.code, "42501",
      "People gate off cannot target a guessed peer without retained evidence");
    sql("update private.people_feature_gate set enabled=true");
    if (process.env.WEB_TEST_ORIGIN) {
      const web = process.env.WEB_TEST_ORIGIN;
      const headers = { Cookie: owner.header() };
      for (const path of [
        "/people",
        `/people/${b.id}`,
        "/people/privacy",
        "/people?search=x&search=y",
      ]) {
        const response = await fetch(`${web}${path}`, { headers });
        assert.equal(response.status, 200);
        assert.match(response.headers.get("cache-control") ?? "", /no-store/, `${path} is not cached`);
      }
      const malformedBack = await fetch(
        `${web}/people/${b.id}?from=%2Fpeople&from=%2Fcalendar`,
        { headers },
      );
      assert.match(await malformedBack.text(), /href="\/people"/, "duplicate return values fall back to People");
      const next = await fetch(`${web}/people?afterId=${b.id}`, { headers });
      assert.equal(next.status, 200);
      assert.doesNotMatch(await next.text(), /Check your People filters/, "UI accepts ID-only cursor");
      const legacy = await fetch(`${web}/people?afterName=${encodeURIComponent(rawPeerName)}&afterId=${b.id}`, { headers });
      assert.match(await legacy.text(), /Check your People filters/, "UI rejects old name cursor");
      const devManifest = new URL("../../apps/web/.next/dev/server/server-reference-manifest.json", import.meta.url);
      const productionManifest = new URL("../../apps/web/.next/server/server-reference-manifest.json", import.meta.url);
      const manifest = JSON.parse(readFileSync(existsSync(productionManifest) ? productionManifest : devManifest, "utf8"));
      const actionIds = Object.fromEntries(Object.entries(manifest.node).map(([id, entry]) => [entry.exportedName, id]));
      assert.ok(actionIds.setPeopleVisibility && actionIds.blockPerson);
      async function action(name, args, path, cookie) {
        const form = new FormData();
        form.set("0", JSON.stringify(args));
        const response = await fetch(`${web}${path}`, {
          method: "POST",
          headers: { Cookie: cookie, Origin: web, "Next-Action": actionIds[name] },
          body: form,
          redirect: "manual",
        });
        const body = await response.text();
        assert.equal(response.status, 200, body);
        assert.match(response.headers.get("cache-control") ?? "", /no-store/, `${name} action response is not cached`);
        return body;
      }
      assert.match(await action("setPeopleVisibility", [false], "/people/privacy", owner.header()), /sharing choice is off/);
      assert.match(await action("blockPerson", ["not-a-uuid"], `/people/${b.id}`, owner.header()), /person is unavailable/);
      assert.match(await action("setPeopleVisibility", [false], "/people/privacy", ""), /Account access is unavailable/);
      sql("update private.people_feature_gate set enabled=false");
      try {
        const uncertain = await action("blockPerson", [b.id], `/people/${b.id}`, owner.header());
        assert.match(uncertain, /temporarily unavailable/);
        assert.ok(!uncertain.includes(rawPeerName), "uncertain action does not return peer text");
      } finally {
        sql("update private.people_feature_gate set enabled=true");
      }
    }
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
    assert.equal((await ownerApi.rpc("browse_people", { p_after_id: b.id })).error?.code, "42501");
    assert.deepEqual((await ownerApi.rpc("get_people_detail", { p_account_id: b.id })).data, []);
    assert.deepEqual((await peerApi.rpc("get_people_detail", { p_account_id: a.id })).data, []);
    assert.deepEqual((await peerApi.rpc("browse_people", { p_search: "Local Test Student" })).data, []);
    assert.deepEqual((await ownerApi.rpc("list_people_blocked_ids")).data, [{ account_id: b.id }]);
    assert.deepEqual((await peerApi.rpc("list_people_blocked_ids")).data, []);
    assert.equal((await ownerApi.rpc("set_people_block", { p_account_id: b.id, p_blocked: false })).data, false);
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: false })).data, false);
    assert.deepEqual((await ownerApi.rpc("get_people_detail", { p_account_id: b.id })).data, []);
    assert.equal((await ownerApi.rpc("browse_people", { p_after_id: b.id })).error?.code, "42501");
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: true })).data, true);
    sql(`update auth.users set email='changed@example.invalid' where id='${b.id}'`);
    assert.deepEqual((await ownerApi.rpc("get_people_detail", { p_account_id: b.id })).data, []);
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: false })).data, false);
    sql("update private.people_feature_gate set enabled=false");
    assert.equal((await peerApi.rpc("set_people_preference", { p_opted_in: false })).data, false);
    assert.equal((await ownerApi.rpc("browse_people")).error?.code, "42501");
  } finally {
    sql(`update private.people_feature_gate set enabled=false;
      update private.safety_feature_gate set enabled=false;
      delete from private.people_blocks where blocker_id in ('${a.id}','${b.id}') or blocked_id in ('${a.id}','${b.id}');
      delete from private.people_preferences where account_id in ('${a.id}','${b.id}');
      update auth.users set email='${b.email}' where id='${b.id}';`);
    await peerApi.from("profiles").update({ primary_photo_path: null }).eq("user_id", b.id);
    await peerApi.storage.from("profile-photos").remove([peerPath]);
  }
}
