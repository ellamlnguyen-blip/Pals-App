import assert from "node:assert/strict";
export async function profileChecks(owner, peer, a, sql, png) {
  const api = owner.auth,
    bucket = api.storage.from("profile-photos");
  const read = async () => {
    const result = await api
      .from("profiles")
      .select("*")
      .eq("user_id", a.id)
      .single();
    assert.equal(result.error, null);
    return result.data;
  };
  const extras = [];
  for (let i = 0; i < 5; i++) {
    const path = `${a.id}/${crypto.randomUUID()}.png`;
    assert.equal(
      (await bucket.upload(path, png, { contentType: "image/png" })).error,
      null,
    );
    extras.push(path);
  }
  const details = {
    interests: ["Walking", "Cooking"],
    down_to_do: ["Tacos"],
    favorite_music: "Jazz",
    favorite_foods: "Noodles",
    weird_fact: "I collect maps",
    instagram: "local.test",
    prompts: [{ question: "A good afternoon?", answer: "A walk with friends" }],
    additional_photo_paths: extras.slice(0, 4),
  };
  assert.equal(
    (await api.from("profiles").update(details).eq("user_id", a.id)).error,
    null,
  );
  let profile = await read();
  for (const [key, value] of Object.entries(details))
    assert.deepEqual(profile[key], value);
  for (const invalid of [
    { additional_photo_paths: extras },
    { additional_photo_paths: [extras[0], extras[0]] },
    { interests: [" A "] },
    { favorite_music: "\t" },
    { prompts: [{ question: "Q", answer: "A", extra: true }] },
    { instagram: "@bad" },
  ])
    assert.ok(
      (await api.from("profiles").update(invalid).eq("user_id", a.id)).error,
      "direct malformed write denied",
    );
  assert.deepEqual(
    (await peer.auth.from("profiles").select("interests").eq("user_id", a.id))
      .data,
    [],
    "peer cannot read optional data",
  );
  for (const path of profile.additional_photo_paths) {
    await bucket.remove([path]);
    assert.equal(
      (await bucket.download(path)).error,
      null,
      "referenced extra cannot be deleted",
    );
  }
  const stale = profile.revision;
  assert.equal(
    (
      await api
        .from("profiles")
        .update({ additional_photo_paths: extras.slice(1, 4) })
        .eq("user_id", a.id)
        .eq("revision", stale)
    ).error,
    null,
  );
  assert.deepEqual(
    (
      await api
        .from("profiles")
        .update({ additional_photo_paths: extras.slice(0, 4) })
        .eq("user_id", a.id)
        .eq("revision", stale)
        .select("revision")
    ).data,
    [],
    "stale client cannot restore removed reference",
  );
  assert.equal((await bucket.remove([extras[0]])).error, null);
  assert.ok((await bucket.download(extras[0])).error);
  if (process.env.WEB_TEST_ORIGIN) {
    const origin = process.env.WEB_TEST_ORIGIN;
    const page = await fetch(`${origin}/profile`, {
      headers: { Cookie: owner.header() },
    });
    assert.ok((await page.text()).includes("Only you can see your profile"));
    for (const [slot, expected] of [
      ["primary", 200],
      ["0", 200],
      ["3", 404],
      ["4", 400],
      ["../foreign", 400],
    ]) {
      const response = await fetch(
        `${origin}/profile/photo?slot=${encodeURIComponent(slot)}`,
        { headers: { Cookie: owner.header() } },
      );
      assert.equal(response.status, expected);
      assert.match(response.headers.get("cache-control"), /no-store/);
    }
    const anon = await fetch(`${origin}/profile/photo?slot=0`);
    assert.equal(anon.status, 403);
    assert.match(anon.headers.get("cache-control"), /no-store/);
    // Live revocation with a still-valid session: draft reads remain separate.
    for (const change of [
      {
        set: `update public.accounts set status='banned' where id='${a.id}'`,
        restore: `update public.accounts set status='active' where id='${a.id}'`,
        gate: "restricted",
      },
      {
        set: "update public.universities set active=false where slug='unc-chapel-hill'",
        restore:
          "update public.universities set active=true where slug='unc-chapel-hill'",
        gate: "unverified",
      },
      {
        set: `update auth.users set email='changed@example.invalid' where id='${a.id}'`,
        restore: `update auth.users set email='${a.email}' where id='${a.id}'`,
        gate: "unverified",
      },
      {
        set: `update auth.users set email_confirmed_at=null where id='${a.id}'`,
        restore: `update auth.users set email_confirmed_at=now() where id='${a.id}'`,
        gate: "unverified",
      },
    ]) {
      try {
        sql(change.set);
        assert.equal((await api.rpc("get_access_state")).data, change.gate);
        const response = await fetch(`${origin}/profile/photo?slot=0`, {
          headers: { Cookie: owner.header() },
        });
        assert.equal(response.status, 403);
        assert.match(response.headers.get("cache-control"), /no-store/);
        assert.ok(
          (await bucket.download(extras[1])).error,
          "live status revokes direct Storage",
        );
        const denied = await fetch(`${origin}/profile`, {
          headers: { Cookie: owner.header() },
          redirect: "manual",
        });
        const body = await denied.text();
        assert.ok(
          !body.includes("Only you can see your profile"),
          "profile editor gated",
        );
      } finally {
        sql(change.restore);
      }
    }
  }
  // Privileged physical metadata loss still revokes readiness; no client delete bypass.
  profile = await read();
  const original = profile.primary_photo_path;
  try {
    sql(
      `update storage.objects set name=name||'.lost' where bucket_id='profile-photos' and name='${original}'`,
    );
    assert.equal(
      (await api.rpc("get_access_state")).data,
      "onboarding",
      "missing primary revokes ready",
    );
  } finally {
    sql(
      `update storage.objects set name='${original}' where bucket_id='profile-photos' and name='${original}.lost'`,
    );
  }
  const cleared = {
    interests: [],
    down_to_do: [],
    favorite_music: null,
    favorite_foods: null,
    weird_fact: null,
    instagram: null,
    prompts: [],
    additional_photo_paths: [],
  };
  assert.equal(
    (await api.from("profiles").update(cleared).eq("user_id", a.id)).error,
    null,
  );
  profile = await read();
  for (const [key, value] of Object.entries(cleared))
    assert.deepEqual(profile[key], value);
  assert.equal((await api.rpc("get_access_state")).data, "ready");
  await bucket.remove(extras.slice(1));
}
