import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { calendarHttpChecks } from "./calendar-http-checks.mjs";

// Real Next server actions over HTTP, with public session cookies only.
export async function hangoutActionChecks(owner, peer, host, member, png, sql) {
  if (!process.env.WEB_TEST_ORIGIN) return;
  const origin = process.env.WEB_TEST_ORIGIN;
  const headers = (cookie) => ({ Cookie: cookie, Origin: origin });
  const newPage = await fetch(`${origin}/hangouts/new`, {
    headers: headers(owner.header()),
  });
  assert.equal(newPage.status, 200);
  assert.match(await newPage.text(), /Make a plan/);
  const savedRoute = await fetch(`${origin}/hangouts/saved`, { headers: headers(owner.header()) });
  assert.equal(savedRoute.status, 200);
  const anonPage = await fetch(`${origin}/hangouts/new`, {
    redirect: "manual",
  });
  assert.equal(
    anonPage.headers.get("location")?.includes("/signin") ||
      (await anonPage.text()).includes("/signin"),
    true,
  );
  const devManifest = new URL("../../apps/web/.next/dev/server/server-reference-manifest.json", import.meta.url);
  const productionManifest = new URL("../../apps/web/.next/server/server-reference-manifest.json", import.meta.url);
  const manifest = JSON.parse(readFileSync(existsSync(productionManifest) ? productionManifest : devManifest, "utf8"));
  const ids = Object.fromEntries(
    Object.entries(manifest.node).map(([id, value]) => [
      value.exportedName,
      id,
    ]),
  );
  assert.ok(ids.createHangout && ids.editHangout && ids.searchSaved && ids.changeSavedMembership);
  async function action(
    name,
    payload,
    cookie = owner.header(),
    path = "/hangouts/new",
  ) {
    return actionArgs(name, [JSON.stringify(payload)], cookie, path);
  }
  async function actionArgs(name, args, cookie = owner.header(), path = "/hangouts/saved") {
    const form = new FormData();
    form.set("0", JSON.stringify(args));
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
  let peerPath;
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
    peerPath = `${member.id}/${crypto.randomUUID()}.png`;
    assert.equal((await peer.auth.storage.from("profile-photos").upload(peerPath, png, { contentType: "image/png" })).error, null);
    assert.equal((await peer.auth.from("profiles").update({ primary_photo_path: peerPath }).eq("user_id", member.id)).error, null);
    assert.equal((await peer.auth.rpc("get_access_state")).data, "ready");
    const restoredPrivate = await action("editHangout", {
      id, revision: 2,
      input: { ...input, title: "Updated tacos" },
    }, owner.header(), `/hangouts/owned/${id}?edit=1`);
    assert.equal(restoredPrivate.result?.kind, "saved", "owner restores private detail for read tests");
    // TASK-008: actual route/action privacy and membership checks.
    const bounds = { west: -79.13, south: 35.85, east: -78.98, north: 35.97 };
    const filters = { time: "all", joining: "any" };
    const search = await actionArgs("searchSaved", [bounds, filters], peer.header());
    assert.equal(search.result?.kind, "ok", search.body.slice(0, 300));
    assert.equal(search.result.items.some(item => item.id === id), true);
    assert.ok(!search.body.includes("Meet by the broad path"), "search action contains no private instructions");
    const badBounds = await actionArgs("searchSaved", [{ ...bounds, west: -100 }, filters], peer.header());
    assert.equal(badBounds.result?.kind, "invalid", "out-of-campus viewport is rejected");
    sql(`do $fixture$ declare plan_id uuid; begin for i in 1..101 loop
      insert into public.hangouts(university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude)
      select m.university_id,'${host.id}','Extra plan '||i,now()+interval '5 hours'+make_interval(mins=>i),'Around Polk Place',35.909,-79.049
      from public.university_memberships m where m.user_id='${host.id}' returning id into plan_id;
      insert into public.hangout_participants(hangout_id,account_id,state) values(plan_id,'${host.id}','joined');
    end loop; end $fixture$;`);
    const limited = await actionArgs("searchSaved", [bounds, filters], peer.header());
    assert.equal(limited.result?.items.length, 100, "viewport result is capped at 100");
    assert.equal(limited.result?.truncated, true, "limit is disclosed");
    await calendarHttpChecks(owner, peer, host, member, sql);
    const peerBefore = await fetch(`${origin}/hangouts/saved/${id}`, { headers: headers(peer.header()) });
    assert.equal(peerBefore.status, 200);
    assert.ok(!(await peerBefore.text()).includes("Meet by the broad path"), "nonmember detail is public only");
    const joined = await actionArgs("changeSavedMembership", [id, "join"], peer.header(), `/hangouts/saved/${id}`);
    assert.equal(joined.result?.kind, "saved", joined.body.slice(0, 300));
    assert.ok(!joined.body.includes("Meet by the broad path"), "join response contains no private instructions");
    const peerJoined = await fetch(`${origin}/hangouts/saved/${id}`, { headers: headers(peer.header()) });
    const peerJoinedBody = await peerJoined.text();
    assert.match(peerJoinedBody, /You&#x27;re joined|You’re joined|You're joined/);
    assert.ok(peerJoinedBody.includes("Meet by the broad path"), "joined member sees private instructions");
    const left = await actionArgs("changeSavedMembership", [id, "leave"], peer.header(), `/hangouts/saved/${id}`);
    assert.equal(left.result?.kind, "saved", left.body.slice(0, 300));
    const peerLeft = await fetch(`${origin}/hangouts/saved/${id}`, { headers: headers(peer.header()) });
    assert.ok(!(await peerLeft.text()).includes("Meet by the broad path"), "private instructions disappear after leave");
    const rejoined = await actionArgs("changeSavedMembership", [id, "join"], peer.header(), `/hangouts/saved/${id}`);
    assert.equal(rejoined.result?.kind, "saved", rejoined.body.slice(0, 300));
    const ownerLeave = await actionArgs("changeSavedMembership", [id, "leave"], owner.header(), `/hangouts/saved/${id}`);
    assert.equal(ownerLeave.result?.kind, "denied", "host cannot leave");
    const closed = await owner.auth.rpc("set_hangout_joining", { p_hangout_id: id, p_expected_revision: 3, p_joining_state: "closed" });
    assert.equal(closed.error, null, "host closes joining");
    const closedLeave = await actionArgs("changeSavedMembership", [id, "leave"], peer.header(), `/hangouts/saved/${id}`);
    assert.equal(closedLeave.result?.kind, "saved", "joined member can leave closed plan");
    const closedRejoin = await actionArgs("changeSavedMembership", [id, "join"], peer.header(), `/hangouts/saved/${id}`);
    assert.equal(closedRejoin.result?.kind, "denied", "closed plan rejects rejoin");
    const peerId = (await peer.auth.auth.getUser()).data.user.id;
    const removed = await owner.auth.rpc("remove_hangout_participant", { p_hangout_id: id, p_account_id: peerId });
    assert.equal(removed.error, null, "host removes left participant");
    const removedPage = await fetch(`${origin}/hangouts/saved/${id}`, { headers: headers(peer.header()) });
    assert.ok((await removedPage.text()).includes("You were removed"), "removed state is visible without instructions");
    const removedJoin = await actionArgs("changeSavedMembership", [id, "join"], peer.header(), `/hangouts/saved/${id}`);
    assert.equal(removedJoin.result?.kind, "denied", "removed participant cannot rejoin");
    const cancelled = await owner.auth.rpc("cancel_hangout", { p_hangout_id: id, p_expected_revision: 4 });
    assert.equal(cancelled.error, null, "host cancels plan");
    const cancelledPage = await fetch(`${origin}/hangouts/saved/${id}`, { headers: headers(owner.header()) });
    assert.ok(!(await cancelledPage.text()).includes("Meet by the broad path"), "cancellation revokes private instructions");
    sql(`update private.hangout_feature_gate set enabled=false`);
    const gated = await actionArgs("searchSaved", [bounds, filters], peer.header());
    assert.equal(gated.result?.items.length, 0, "gate hides saved discovery");
    const gatedPage = await fetch(`${origin}/hangouts/saved/${id}`, { headers: headers(peer.header()) });
    assert.ok(!(await gatedPage.text()).includes("Meet by the broad path"), "gate revocation hides private detail");
    const gatedJoin = await actionArgs("changeSavedMembership", [id, "join"], peer.header(), `/hangouts/saved/${id}`);
    assert.equal(gatedJoin.result?.kind, "denied", "gate blocks action");
  } finally {
    sql(
      `update public.accounts set status='active' where id='${host.id}'; update private.hangout_feature_gate set enabled=false; delete from private.hangout_create_requests where host_id='${host.id}'; delete from public.hangouts where host_id='${host.id}';`,
    );
    if (peerPath) {
      await peer.auth.from("profiles").update({ primary_photo_path: null }).eq("user_id", member.id);
      await peer.auth.storage.from("profile-photos").remove([peerPath]);
    }
  }
}
