import assert from "node:assert/strict";
export async function calendarHttpChecks(owner, peer, host, member, sql) {
  const origin = process.env.WEB_TEST_ORIGIN;
  const date = "2027-03-14";
  async function page(filter = "discoverable", cookie = peer.header(), extra = "") {
    const response = await fetch(`${origin}/calendar?date=${date}&view=day&filter=${filter}${extra}`, {headers: {Cookie: cookie}, redirect: "manual"});
    return {response, body: await response.text()};
  }
  const ids = Array.from({length: 107}, () => crypto.randomUUID());
  const quoted = ids.map(id => `'${id}'`).join(",");
  try {
    // All start together to test deterministic ID tie ordering. The peer's sole
    // joined plan sorts behind 100 unrelated campus records.
    const sorted = [...ids].sort();
    sql(`begin; insert into public.hangouts(id,university_id,host_id,title,starts_at,ends_at,public_place,public_latitude,public_longitude)
      select id,m.university_id,'${host.id}',case when id='${sorted[106]}' then 'Calendar late joined' else 'Calendar fixture '||id end,'2027-03-14 12:00:00-04',null,'Calendar public area',35.909,-79.049
      from unnest(array[${quoted}]::uuid[]) id cross join public.university_memberships m where m.user_id='${host.id}';
      insert into public.hangout_participants(hangout_id,account_id,state) select id,'${host.id}','joined' from public.hangouts where id in (${quoted});
      insert into public.hangout_private_locations(hangout_id,instructions) values('${sorted[106]}','CALENDAR_PRIVATE_SENTINEL'); commit;`);
    const campus = await page();
    assert.equal(campus.response.status, 200);
    assert.match(campus.body, /first 100 matching Hangouts/);
    assert.ok(!campus.body.includes("Calendar late joined"), "campus page really truncates before joined row");
    assert.ok(!campus.body.includes("CALENDAR_PRIVATE_SENTINEL"));
    assert.ok(!campus.body.includes(host.id), "Calendar omits host account ID");
    assert.equal((await peer.auth.rpc("join_hangout", {p_hangout_id: sorted[106]})).error,null);
    const joined = await page("joined");
    assert.match(joined.body,/Calendar late joined/);
    assert.ok(!joined.body.includes("first 100 matching Hangouts"), "filter applies before limit");
    assert.ok(!joined.body.includes("CALENDAR_PRIVATE_SENTINEL"), "joined Calendar remains public-only");
    assert.match((await page("hosting", owner.header())).body,/first 100 matching Hangouts/);
    assert.ok(!(await page("hosting")).body.includes("Calendar late joined"));
    assert.equal((await peer.auth.rpc("leave_hangout", {p_hangout_id: sorted[106]})).error,null);
    assert.ok(!(await page("joined")).body.includes("Calendar late joined"));
    assert.equal((await peer.auth.rpc("join_hangout", {p_hangout_id: sorted[106]})).error,null);
    assert.equal((await owner.auth.rpc("cancel_hangout",{p_hangout_id:sorted[106],p_expected_revision:1})).error,null);
    const cancelled = await page("joined");
    assert.match(cancelled.body,/Calendar late joined/);
    assert.match(cancelled.body,/Cancelled/);
    assert.ok(!(await page()).body.includes("Calendar late joined"));
    const removalId = sorted[0];
    sql(`update public.hangouts set title='Calendar removed plan',revision=revision+1 where id='${removalId}'`);
    assert.equal((await peer.auth.rpc("join_hangout", {p_hangout_id: removalId})).error, null);
    assert.equal((await owner.auth.rpc("remove_hangout_participant", {p_hangout_id: removalId, p_account_id: member.id, p_expected_revision: 2})).error, null);
    assert.ok(!(await page("joined")).body.includes("Calendar removed plan"), "removed is not joined");
    assert.match((await page()).body, /Calendar removed plan/, "removed still has campus discovery");
    assert.equal((await owner.auth.rpc("cancel_hangout", {p_hangout_id: removalId, p_expected_revision:3})).error, null);
    assert.ok(!(await page("joined")).body.includes("Calendar removed plan"), "removed cannot read cancellation");
    assert.match((await page("hosting", owner.header())).body, /Calendar removed plan/, "cancelled host remains in Hosting");
    const leftId = sorted[1];
    sql(`update public.hangouts set title='Calendar left cancellation',revision=revision+1 where id='${leftId}'`);
    assert.equal((await peer.auth.rpc("join_hangout", {p_hangout_id:leftId})).error,null);
    assert.equal((await peer.auth.rpc("leave_hangout", {p_hangout_id:leftId})).error,null);
    assert.equal((await owner.auth.rpc("cancel_hangout", {p_hangout_id:leftId,p_expected_revision:2})).error,null);
    assert.ok(!(await page("joined")).body.includes("Calendar left cancellation"), "left cannot read cancellation");
    const strangerId = sorted[2];
    sql(`update public.hangouts set title='Calendar unrelated cancellation',revision=revision+1 where id='${strangerId}'`);
    assert.equal((await owner.auth.rpc("cancel_hangout", {p_hangout_id:strangerId,p_expected_revision:2})).error,null);
    assert.ok(!(await page("joined")).body.includes("Calendar unrelated cancellation"), "nonmember cannot read cancellation");
    // Cross-midnight, exact end boundary, and unknown-end previous day.
    sql(`update public.hangouts set starts_at='2027-03-13 23:00:00-05',ends_at='2027-03-14 03:00:00-04', title='Calendar overlap',revision=revision+1 where id='${sorted[3]}';
      update public.hangouts set starts_at='2027-03-13 23:00:00-05',ends_at='2027-03-14 00:00:00-05',title='Calendar boundary excluded',revision=revision+1 where id='${sorted[4]}';
      update public.hangouts set starts_at='2027-03-13 23:00:00-05',title='Calendar noend excluded',revision=revision+1 where id='${sorted[5]}';`);
    const overlap = await page();
    assert.match(overlap.body,/Calendar overlap/);
    assert.ok(!overlap.body.includes("Calendar boundary excluded"));
    assert.ok(!overlap.body.includes("Calendar noend excluded"));
    const invalid = await page("friends");
    assert.match(invalid.body,/Choose a valid campus date/);
    assert.ok(!invalid.body.includes("Calendar overlap"));
    const anonymous = await page("discoverable", "");
    assert.ok(anonymous.response.headers.get("location")?.includes("signin") || anonymous.body.includes("url=/signin"));
    assert.ok(!anonymous.body.includes("Calendar overlap"));
    sql(`update public.accounts set status='suspended' where id='${member.id}'`);
    assert.ok(!(await page("joined")).body.includes("Calendar late joined"));
    sql(`update public.accounts set status='active' where id='${member.id}'; update private.hangout_feature_gate set enabled=false`);
    assert.ok(!(await page("joined")).body.includes("Calendar late joined"));
  } finally {
    sql(`update public.accounts set status='active' where id='${member.id}'; update private.hangout_feature_gate set enabled=true; delete from public.hangouts where id in (${quoted})`);
  }
}
