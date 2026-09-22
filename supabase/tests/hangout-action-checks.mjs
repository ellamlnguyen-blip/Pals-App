import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Real Next server actions over HTTP, with public session cookies only.
export async function hangoutActionChecks(owner, peer, host, sql) {
  if (!process.env.WEB_TEST_ORIGIN) return;
  const origin = process.env.WEB_TEST_ORIGIN;
  const headers = (cookie) => ({ Cookie: cookie, Origin: origin });
  const newPage = await fetch(`${origin}/hangouts/new`, {
    headers: headers(owner.header()),
  });
  assert.equal(newPage.status, 200);
  assert.match(await newPage.text(), /Make a plan/);
  const anonPage = await fetch(`${origin}/hangouts/new`, {
    redirect: "manual",
  });
  assert.equal(
    anonPage.headers.get("location")?.includes("/signin") ||
      (await anonPage.text()).includes("/signin"),
    true,
  );
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        "../../apps/web/.next/dev/server/server-reference-manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const ids = Object.fromEntries(
    Object.entries(manifest.node).map(([id, value]) => [
      value.exportedName,
      id,
    ]),
  );
  assert.ok(ids.createHangout && ids.editHangout);
  async function action(
    name,
    payload,
    cookie = owner.header(),
    path = "/hangouts/new",
  ) {
    const form = new FormData();
    form.set("0", JSON.stringify([JSON.stringify(payload)]));
    const response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { ...headers(cookie), "Next-Action": ids[name] },
      body: form,
      redirect: "manual",
    });
    const body = await response.text();
    const line = body
      .split("\n")
      .find((value) => /^[a-f0-9]+:\{\"kind\":/.test(value));
    return {
      response,
      body,
      result: line ? JSON.parse(line.slice(line.indexOf(":") + 1)) : null,
    };
  }
  const start = new Date(Date.now() + 3 * 3600000);
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(start)
    .replace(" ", "T");
  const input = {
    title: "Local action tacos",
    description: "A quick break",
    startsLocal: local,
    endsLocal: "",
    publicPlace: "Around Polk Place",
    latitude: "35.90912345",
    longitude: "-79.04987654",
    campusZone: "Central campus",
    privateInstructions: "Meet by the broad path",
  };
  const request = crypto.randomUUID();
  let id;
  try {
    const denied = await action("createHangout", {
      requestId: request,
      input,
      replay: false,
    });
    assert.equal(denied.result?.kind, "denied", JSON.stringify(denied.result));
    const anonymous = await action(
      "createHangout",
      { requestId: request, input, replay: false },
      "",
    );
    assert.equal(anonymous.result?.kind, "denied", "anonymous action denied");
    sql("update private.hangout_feature_gate set enabled=true");
    const created = await action("createHangout", {
      requestId: request,
      input,
      replay: false,
    });
    assert.equal(created.result?.kind, "saved", created.body.slice(0, 300));
    id = created.result.id;
    assert.equal(
      (
        await owner.auth
          .from("hangouts")
          .select("public_latitude,public_longitude")
          .eq("id", id)
          .single()
      ).data.public_latitude,
      35.909,
      "manual coordinates rounded",
    );
    assert.equal(
      (
        await action("createHangout", {
          requestId: request,
          input,
          replay: true,
        })
      ).result?.id,
      id,
      "same request replay returns same row",
    );
    const changed = await action("createHangout", {
      requestId: request,
      input: { ...input, title: "Changed" },
      replay: true,
    });
    assert.equal(
      changed.result?.kind,
      "uncertain",
      "changed replay does not claim success",
    );
    const peerRead = await fetch(`${origin}/hangouts/owned/${id}`, {
      headers: headers(peer.header()),
    });
    assert.ok(
      peerRead.status !== 200 ||
        !(await peerRead.text()).includes("Meet by the broad path"),
      "peer owner route does not reveal private detail",
    );
    const edit = await action(
      "editHangout",
      {
        id,
        revision: 1,
        input: { ...input, title: "Updated tacos", privateInstructions: "" },
      },
      owner.header(),
      `/hangouts/owned/${id}?edit=1`,
    );
    assert.equal(edit.result?.kind, "saved", edit.body.slice(0, 300));
    assert.equal(
      (
        await owner.auth
          .from("hangout_private_locations")
          .select("instructions")
          .eq("hangout_id", id)
      ).data.length,
      0,
      "blank private instructions clear",
    );
    assert.equal(
      (
        await action(
          "editHangout",
          { id, revision: 1, input },
          owner.header(),
          `/hangouts/owned/${id}?edit=1`,
        )
      ).result?.kind,
      "conflict",
      "stale action rejected",
    );
    assert.equal(
      (
        await action(
          "editHangout",
          { id, revision: 2, input },
          peer.header(),
          `/hangouts/owned/${id}?edit=1`,
        )
      ).result?.kind,
      "denied",
      "peer action cannot edit owner row",
    );
    assert.equal(
      (
        await action(
          "editHangout",
          { id: crypto.randomUUID(), revision: 2, input },
          owner.header(),
          `/hangouts/owned/${id}?edit=1`,
        )
      ).result?.kind,
      "denied",
      "forged record ID denied",
    );
    sql(`update public.accounts set status='suspended' where id='${host.id}'`);
    assert.equal(
      (
        await action("createHangout", {
          requestId: request,
          input,
          replay: true,
        })
      ).result?.kind,
      "uncertain",
      "revoked readiness retains original request",
    );
    assert.equal(
      (
        await action(
          "editHangout",
          { id, revision: 2, input },
          owner.header(),
          `/hangouts/owned/${id}?edit=1`,
        )
      ).result?.kind,
      "denied",
      "revoked readiness denies edit",
    );
    sql(`update public.accounts set status='active' where id='${host.id}'`);
    sql("update private.hangout_feature_gate set enabled=false");
    assert.equal(
      (
        await action("createHangout", {
          requestId: request,
          input,
          replay: true,
        })
      ).result?.kind,
      "uncertain",
      "gate revocation preserves retry identity",
    );
    sql("update private.hangout_feature_gate set enabled=true");
    assert.equal(
      (
        await action("createHangout", {
          requestId: request,
          input,
          replay: true,
        })
      ).result?.id,
      id,
      "restored access resolves original request",
    );
    assert.equal(
      (await owner.auth.from("hangouts").select("id").eq("host_id", host.id))
        .data.length,
      1,
      "retries did not duplicate",
    );
  } finally {
    sql(
      `update public.accounts set status='active' where id='${host.id}'; update private.hangout_feature_gate set enabled=false; delete from private.hangout_create_requests where host_id='${host.id}'; delete from public.hangouts where host_id='${host.id}';`,
    );
  }
}
