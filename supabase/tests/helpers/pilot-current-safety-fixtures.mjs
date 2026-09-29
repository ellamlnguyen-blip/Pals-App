import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sql } from "./pilot-admission-current-safety.mjs";
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
// Values stay in memory. Never serialize the raw Auth/provider credentials.
export const censusTables = Object.freeze([
  "private.account_sanctions",
  "private.attendance_answers",
  "private.attendance_feature_gate",
  "private.dm_feature_gate",
  "private.dm_messages",
  "private.dm_pairs",
  "private.dm_retries",
  "private.dm_suppression",
  "private.friendship_create_requests",
  "private.friendship_feature_gate",
  "private.friendship_suppression",
  "private.friendships",
  "private.hangout_chat_feature_gate",
  "private.hangout_cohosts",
  "private.hangout_conversations",
  "private.hangout_create_requests",
  "private.hangout_disables",
  "private.hangout_feature_gate",
  "private.hangout_message_requests",
  "private.hangout_messages",
  "private.hangout_peer_provenance",
  "private.large_hangout_feature_gate",
  "private.large_hangout_signals",
  "private.moderation_audit",
  "private.moderation_cases",
  "private.moderation_feature_gate",
  "private.moderation_requests",
  "private.notification_feature_gate",
  "private.notification_items",
  "private.notification_preferences",
  "private.people_blocks",
  "private.people_feature_gate",
  "private.people_preferences",
  "private.pilot_account_admission",
  "private.pilot_admission_managers",
  "private.pilot_availability",
  "private.pilot_capabilities",
  "private.pilot_management_audit",
  "private.pilot_management_requests",
  "private.pilot_manager_audit",
  "private.safety_feature_gate",
  "private.safety_reconciliation_effects",
  "private.safety_report_requests",
  "private.safety_reports",
  "public.accounts",
  "public.hangout_participants",
  "public.hangout_private_locations",
  "public.hangouts",
  "public.platform_roles",
  "public.profiles",
  "public.universities",
  "public.university_memberships",
  "storage.objects",
  "auth.users",
]);
export const capabilityKeys = Object.freeze([
  "onboarding",
  "hangouts",
  "hangout_chat",
  "calendar",
  "people",
  "friendship",
  "dm",
  "notifications",
  "attendance",
  "optional_profile",
  "extra_photos",
  "analytics",
  "large_hangout_safeguards",
]);
const censusParts = censusTables.map((table) =>
  table === "auth.users"
    ? "select 'auth.users' name,coalesce(jsonb_agg(v order by v::text),'[]') rows from (select jsonb_build_object('id',id,'email',email,'email_confirmed_at',email_confirmed_at,'deleted_at',deleted_at,'raw_user_meta_data',raw_user_meta_data,'raw_app_meta_data',raw_app_meta_data) v from auth.users) q"
    : `select ${quote(table)} name,coalesce(jsonb_agg(v order by v::text),'[]') rows from (select to_jsonb(t) v from ${table} t) q`,
);
export const censusQuery = `select jsonb_object_agg(name,rows) from (${censusParts.join(" union all ")}) q`;
export function census() {
  const actual = JSON.parse(
    sql(
      "select jsonb_agg(table_schema||'.'||table_name order by table_schema,table_name) from information_schema.tables where table_type='BASE TABLE' and table_schema in ('public','private')",
    ),
  );
  assert.deepEqual(
    actual,
    censusTables.filter(
      (t) => t.startsWith("public.") || t.startsWith("private."),
    ),
    "exact52 public/private base tables required",
  );
  const snapshot = JSON.parse(sql(censusQuery));
  assert.deepEqual(Object.keys(snapshot).sort(), censusTables.slice().sort());
  return snapshot;
}
export function sanitized(snapshot) {
  return Object.fromEntries(
    censusTables.map((name) => [
      name,
      {
        count: snapshot[name].length,
        sha256: createHash("sha256")
          .update(JSON.stringify(snapshot[name]))
          .digest("hex"),
      },
    ]),
  );
}
// Expected snapshot must include every field of every table, including intentional
// writes. No ignore-list, equality hash alone or automatic observed-row acceptance.
export function assertOutcome({
  result,
  expectedResult,
  before,
  after,
  expectedAfter = before,
}) {
  assert.deepEqual(result, expectedResult, "actual exact RPC result required");
  for (const snapshot of [before, after, expectedAfter])
    assert.deepEqual(Object.keys(snapshot).sort(), censusTables.slice().sort());
  assert.deepEqual(
    after,
    expectedAfter,
    "complete54-table precise expected outcome",
  );
  return {
    result_verified: true,
    before: sanitized(before),
    after: sanitized(after),
  };
}
export const campus = "00000000-0000-4000-8000-000000000001";
export const photoPath = (id) => `${id}/11111111.png`;
export const email = (id) => `b3c-${id}@unc.edu`;
export const auth = (id) =>
  `set local role authenticated;set local request.jwt.claims=${quote(JSON.stringify({ sub: id, role: "authenticated" }))};`;
export function caseIds(caseKey) {
  assert.ok(
    typeof caseKey === "string" && caseKey.length > 0,
    "fresh literal case ID required",
  );
  const uuid = (slot) => {
    const h = createHash("sha256")
      .update(`TASK-021A1b3c:${caseKey}:${slot}`)
      .digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
  };
  return Object.freeze(
    Object.fromEntries(
      [
        "actor",
        "host",
        "peer",
        "manager",
        "source",
        "request",
        "managerRequest",
        "otherCampus",
      ].map((slot) => [slot, uuid(slot)]),
    ),
  );
}
export const routes = Object.freeze([
  Object.freeze({
    id: "CH",
    rpc: "submit_safety_report",
    mode: "hangout",
    purpose: "hangouts",
    provenance: "current_hangout",
  }),
  Object.freeze({
    id: "CP",
    rpc: "submit_safety_report",
    mode: "user",
    purpose: "people",
    provenance: "current_people",
  }),
  Object.freeze({
    id: "CB",
    rpc: "set_safety_block",
    purpose: "people",
    provenance: "current_visible_new_block",
  }),
]);
// Setup is privileged synthetic preparation, never a student permission proof.
export function setup(ids, { actorPreference = "absent" } = {}) {
  assert.ok(
    ["absent", false].includes(actorPreference),
    "actor opt-in not required",
  );
  assert.equal(
    new Set(Object.values(ids)).size,
    8,
    "independent deterministic fixture IDs",
  );
  const ready = [ids.actor, ids.host, ids.peer];
  sql(`begin;
    insert into auth.users(id,email,email_confirmed_at) values ${[...ready, ids.manager].map((id) => `(${quote(id)},${quote(email(id))},now())`).join(",")};
    insert into storage.objects(bucket_id,name,owner_id) values ${ready.map((id) => `('profile-photos',${quote(photoPath(id))},${quote(id)})`).join(",")};
    update public.profiles set real_name='Current safety fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path=user_id::text||'/11111111.png' where user_id in (${ready.map(quote).join(",")});
    insert into private.pilot_account_admission(account_id,state,revision) values ${ready.map((id) => `(${quote(id)},'active',1)`).join(",")};
    select private.set_pilot_manager_fixture(${quote(ids.manager)},'active',0,'B3c synthetic manager',${quote(ids.managerRequest)});
    insert into public.universities(id,name,slug,allowed_email_domains,active) values(${quote(ids.otherCampus)},'Other synthetic campus',${quote("b3c-" + ids.otherCampus)},array['unc.edu'],true);
    update private.pilot_availability set enabled=true;
    update private.pilot_capabilities set enabled=key in('hangouts','people');
    update private.hangout_feature_gate set enabled=true;
    update private.people_feature_gate set enabled=true;
    update private.safety_feature_gate set enabled=true;
    insert into private.people_preferences(account_id,opted_in) values(${quote(ids.peer)},true);
    ${actorPreference === false ? `insert into private.people_preferences(account_id,opted_in) values(${quote(ids.actor)},false);` : ""}
    commit;`);
}
export function prepare(
  definition,
  { caseKey, ids = caseIds(caseKey), actorPreference = "absent" } = {},
) {
  assert.ok(
    routes.some((r) => r.id === definition.id),
    "CH/CP/CB only",
  );
  setup(ids, { actorPreference });
  const route = {
    ...definition,
    ...ids,
    subject: ids.actor,
    target: definition.id === "CH" ? ids.source : ids.peer,
    subjects:
      definition.id === "CH"
        ? { actor: ids.actor, immutable_host: ids.host }
        : { actor: ids.actor, peer: ids.peer },
  };
  if (route.id === "CH")
    sql(`begin;
    insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude)
    values(${quote(ids.source)},${quote(ids.host)},${quote(campus)},'Undisclosed fixture',now()+interval '1 day','Approximate',35.91,-79.05);
    insert into public.hangout_participants(hangout_id,account_id,state) values(${quote(ids.source)},${quote(ids.host)},'joined');
    insert into public.hangout_private_locations(hangout_id,instructions) values(${quote(ids.source)},'Undisclosed synthetic instructions');commit;`);
  assertCurrentOnly(route);
  return route;
}
export function peerProofsQuery(route) {
  const a = quote(route.actor),
    p = quote(route.peer);
  return `select jsonb_build_object(
    'owned_block',exists(select 1 from private.people_blocks where blocker_id=${a} and blocked_id=${p}),
    'friendship',exists(select 1 from private.friendships where low_id=least(${a}::uuid,${p}::uuid) and high_id=greatest(${a}::uuid,${p}::uuid)),
    'request',exists(select 1 from private.friendship_create_requests where (actor_id=${a} and target_id=${p}) or (actor_id=${p} and target_id=${a})),
    'dm_generation',exists(select 1 from private.dm_pairs where low_id=least(${a}::uuid,${p}::uuid) and high_id=greatest(${a}::uuid,${p}::uuid)),
    'hangout_host',exists(select 1 from public.hangouts h join public.hangout_participants mine on mine.hangout_id=h.id and mine.account_id=${a} where h.host_id=${p}),
    'immutable_overlap',exists(select 1 from private.hangout_peer_provenance where low_id=least(${a}::uuid,${p}::uuid) and high_id=greatest(${a}::uuid,${p}::uuid)),
    'positive_interval',exists(select 1 from public.hangout_participants mine join public.hangout_participants peer on peer.hangout_id=mine.hangout_id where mine.account_id=${a} and peer.account_id=${p} and mine.joined_at<coalesce(peer.left_at,peer.removed_at,'infinity'::timestamptz) and peer.joined_at<coalesce(mine.left_at,mine.removed_at,'infinity'::timestamptz)))`;
}
export function assertCurrentOnly(route) {
  assert.notEqual(route.actor, route.host);
  if (route.id === "CH") {
    assert.equal(
      sql(
        `select count(*) from public.hangout_participants where hangout_id=${quote(route.source)} and account_id=${quote(route.actor)}`,
      ),
      "0",
      "no retained caller participant",
    );
    assert.equal(
      sql(
        `select count(*) from public.hangouts h join public.hangout_participants p on p.hangout_id=h.id and p.account_id=h.host_id and p.state='joined' where h.id=${quote(route.source)} and h.host_id=${quote(route.host)} and h.status='published'`,
      ),
      "1",
      "distinct immutable joined host/published nonparticipant source",
    );
  } else {
    const proofs = JSON.parse(sql(peerProofsQuery(route)));
    assert.equal(Object.keys(proofs).length, 7);
    assert.ok(
      Object.values(proofs).every((v) => v === false),
      "none of seven retained peer proofs",
    );
    assert.equal(
      sql(
        `select private.safety_peer_evidence(${quote(route.actor)},${quote(route.peer)})`,
      ),
      "f",
    );
    assert.equal(
      sql(
        `select count(*) from public.hangout_participants x join public.hangout_participants y on y.hangout_id=x.hangout_id where x.account_id=${quote(route.actor)} and y.account_id=${quote(route.peer)} and x.state='joined' and y.state='joined'`,
      ),
      "0",
      "current-only pair has no joined shared parent",
    );
  }
}
export function query(
  route,
  {
    request = route.request,
    category = "harassment",
    narrative = null,
    blocked = true,
  } = {},
) {
  if (route.id === "CB")
    return `select public.set_safety_block(${quote(route.target)},${blocked === null ? "null" : blocked ? "true" : "false"});`;
  return `select * from public.submit_safety_report(${request === null ? "null" : quote(request)},${quote(route.mode)},${quote(route.target)},${category === null ? "null" : quote(category)},${narrative === null ? "null" : quote(narrative)});`;
}
export const call = (route, options) =>
  `${auth(route.actor)}${query(route, options)}`;
export const denialFor = (route) =>
  route.id === "CB"
    ? "Safety operation unavailable"
    : "Safety report unavailable";
export function assertStoredProvenance(route, receipt) {
  assert.notEqual(route.id, "CB");
  assert.deepEqual(Object.keys(receipt).sort(), ["receipt_id", "submitted_at"]);
  const stored = JSON.parse(
    sql(
      `select jsonb_build_object('reporter_id',r.reporter_id,'target_type',r.target_type,'target_id',r.target_id,'provenance_kind',r.provenance_kind,'provenance_ref_id',r.provenance_ref_id,'submitted_at',r.submitted_at,'request_id',q.request_id) from private.safety_reports r join private.safety_report_requests q on q.report_id=r.id where r.id=${quote(receipt.receipt_id)}`,
    ),
  );
  assert.deepEqual(stored, {
    reporter_id: route.actor,
    target_type: route.mode === "user" ? "user" : "hangout",
    target_id: route.target,
    provenance_kind: route.provenance,
    provenance_ref_id: route.target,
    submitted_at: receipt.submitted_at,
    request_id: route.request,
  });
}
export function selectedLaterLane(route) {
  if (route.id === "CH")
    return sql(
      `select exists(select 1 from public.hangout_participants where hangout_id=${quote(route.source)} and account_id=${quote(route.actor)})`,
    ) === "t"
      ? "retained"
      : "current";
  return sql(
    `select private.safety_peer_evidence(${quote(route.actor)},${quote(route.peer)})`,
  ) === "t"
    ? "retained"
    : "current";
}

export function identityLoss(id, subject, route) {
  assert.ok(
    Object.values(route.subjects).includes(subject),
    "independently bound route subject required",
  );
  const otherCampus = route.otherCampus;
  const member = `insert into public.university_memberships(user_id,university_id,verified_at,verification_email) values('${subject}','${campus}',now(),'${email(subject)}');`;
  const profile = `insert into public.profiles(user_id,real_name,major,bio,graduation_year,primary_photo_path) values('${subject}','Restored fixture','Math','Local',2028,'${photoPath(subject)}');`;
  const table = {
    suspended: [
      `update public.accounts set status='suspended' where id='${subject}';`,
      `update public.accounts set status='active' where id='${subject}';`,
    ],
    banned: [
      `update public.accounts set status='banned' where id='${subject}';`,
      `update public.accounts set status='active' where id='${subject}';`,
    ],
    email_confirmation: [
      `update auth.users set email_confirmed_at=null where id='${subject}';`,
      `update auth.users set email_confirmed_at=now() where id='${subject}';`,
    ],
    email_domain: [
      `update auth.users set email='${subject}@example.invalid' where id='${subject}';`,
      `update auth.users set email='${email(subject)}',email_confirmed_at=now() where id='${subject}';`,
    ],
    email_equality: [
      `update public.university_memberships set verification_email='mismatch@unc.edu' where user_id='${subject}';`,
      `update public.university_memberships set verification_email='${email(subject)}' where user_id='${subject}';`,
    ],
    membership_verification: [
      `update public.university_memberships set verified_at=null,verification_email=null where user_id='${subject}';`,
      `update public.university_memberships set verified_at=now(),verification_email='${email(subject)}' where user_id='${subject}';`,
    ],
    membership_delete: [
      `delete from public.university_memberships where user_id='${subject}';`,
      member,
    ],
    membership_campus: [
      `update public.university_memberships set university_id='${otherCampus}' where user_id='${subject}';`,
      `update public.university_memberships set university_id='${campus}' where user_id='${subject}';`,
    ],
    campus_active: [
      `update public.universities set active=false where id='${campus}';`,
      `update public.universities set active=true where id='${campus}';`,
    ],
    campus_unc: [
      `update public.universities set slug='b3c-nonunc' where id='${campus}';`,
      `update public.universities set slug='unc-chapel-hill' where id='${campus}';`,
    ],
    campus_allowlist: [
      `update public.universities set allowed_email_domains=array['example.invalid'] where id='${campus}';`,
      `update public.universities set allowed_email_domains=array['live.unc.edu','unc.edu','ad.unc.edu','business.unc.edu','kenan-flagler.unc.edu'] where id='${campus}';`,
    ],
    profile_missing: [
      `delete from public.profiles where user_id='${subject}';`,
      profile,
    ],
    profile_required: [
      `update public.profiles set bio=null where user_id='${subject}';`,
      `update public.profiles set bio='Local' where user_id='${subject}';`,
    ],
    profile_primary: [
      `update public.profiles set primary_photo_path=null where user_id='${subject}';`,
      `update public.profiles set primary_photo_path='${photoPath(subject)}' where user_id='${subject}';`,
    ],
    object_detach_delete: [
      `set local storage.allow_delete_query='true';update public.profiles set primary_photo_path=null where user_id='${subject}';delete from storage.objects where bucket_id='profile-photos' and name='${photoPath(subject)}';`,
      `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${photoPath(subject)}','${subject}');update public.profiles set primary_photo_path='${photoPath(subject)}' where user_id='${subject}';`,
    ],
    membership_delete_replace: [
      `delete from public.university_memberships where user_id='${subject}';${member}`,
      "",
    ],
    profile_delete_replace: [
      `delete from public.profiles where user_id='${subject}';${profile}`,
      "",
    ],
  };
  assert.ok(Object.hasOwn(table, id), "exact17 identity dimension required");
  const [loss, restore] = table[id];
  return {
    loss,
    restore,
    contention:
      id === "object_detach_delete"
        ? "profile UPDATE; formerly referenced DELETE after detach"
        : id.startsWith("campus_")
          ? "campus"
          : id.startsWith("email_") && id !== "email_equality"
            ? "Auth"
            : id.startsWith("membership_") || id === "email_equality"
              ? "membership"
              : id.startsWith("profile_")
                ? "profile"
                : "account",
    replacement: id.endsWith("delete_replace"),
    writer:
      "privileged synthetic identity preparation; not permission evidence",
  };
}

export function assertReportOutcome(
  route,
  { before, after, receipt, expectedReport, expectedLedger },
) {
  assert.notEqual(route.id, "CB");
  assert.deepEqual(Object.keys(receipt).sort(), ["receipt_id", "submitted_at"]);
  assert.equal(expectedReport.id, receipt.receipt_id);
  assert.equal(expectedReport.submitted_at, receipt.submitted_at);
  assert.equal(expectedReport.reporter_id, route.actor);
  assert.equal(
    expectedReport.target_type,
    route.mode === "user" ? "user" : "hangout",
  );
  assert.equal(expectedReport.target_id, route.target);
  assert.equal(expectedReport.provenance_kind, route.provenance);
  assert.equal(expectedReport.provenance_ref_id, route.target);
  assert.equal(expectedLedger.reporter_id, route.actor);
  assert.equal(expectedLedger.request_id, route.request);
  assert.equal(expectedLedger.report_id, receipt.receipt_id);
  const expectedAfter = structuredClone(before);
  for (const [table, row] of [
    ["private.safety_reports", expectedReport],
    ["private.safety_report_requests", expectedLedger],
  ]) {
    const added = after[table].filter(
      (r) =>
        !before[table].some((old) => JSON.stringify(old) === JSON.stringify(r)),
    );
    assert.deepEqual(
      added,
      [row],
      "exact one immutable report/ledger with independently expected payload",
    );
    assert.equal(after[table].length, before[table].length + 1);
    // Preserve server JSONB ordering without copying unrelated observed fields.
    expectedAfter[table] = after[table].map((r) =>
      (r.id === row.id && table.endsWith("safety_reports")) ||
      (table.endsWith("safety_report_requests") &&
        r.reporter_id === row.reporter_id &&
        r.request_id === row.request_id)
        ? row
        : before[table].find(
            (old) => JSON.stringify(old) === JSON.stringify(r),
          ),
    );
  }
  return assertOutcome({
    result: receipt,
    expectedResult: {
      receipt_id: expectedReport.id,
      submitted_at: expectedReport.submitted_at,
    },
    before,
    after,
    expectedAfter,
  });
}
export function assertCurrentBlockOutcome(
  route,
  { before, after, result, expectedBlock },
) {
  assert.equal(route.id, "CB");
  assert.equal(expectedBlock.blocker_id, route.actor);
  assert.equal(expectedBlock.blocked_id, route.peer);
  assert.equal(
    before["private.people_blocks"].some(
      (r) => r.blocker_id === route.actor && r.blocked_id === route.peer,
    ),
    false,
  );
  const expectedAfter = structuredClone(before);
  const added = after["private.people_blocks"].filter(
    (r) =>
      !before["private.people_blocks"].some(
        (old) => JSON.stringify(old) === JSON.stringify(r),
      ),
  );
  assert.deepEqual(added, [expectedBlock]);
  assert.equal(
    after["private.people_blocks"].length,
    before["private.people_blocks"].length + 1,
  );
  expectedAfter["private.people_blocks"] = after["private.people_blocks"].map(
    (r) =>
      r.blocker_id === route.actor && r.blocked_id === route.peer
        ? expectedBlock
        : before["private.people_blocks"].find(
            (old) => JSON.stringify(old) === JSON.stringify(r),
          ),
  );
  const evidence = assertOutcome({
    result,
    expectedResult: true,
    before,
    after,
    expectedAfter,
  });
  assert.equal(
    selectedLaterLane(route),
    "retained",
    "committed own block supplies lawful retained authority on later calls",
  );
  return { ...evidence, later_lane: "retained", current_denial_credit: false };
}
export function assertSafeAbort({ code, before, after }) {
  for (const snapshot of [before, after])
    assert.deepEqual(Object.keys(snapshot).sort(), censusTables.slice().sort());
  assert.ok(
    ["40P01", "40001"].includes(code),
    "exact transaction abort partition",
  );
  assert.deepEqual(after, before, "abort full54-table rollback");
  return {
    partition: "safe-abort",
    code,
    successful_wait_order_credit: false,
    census: sanitized(after),
  };
}
