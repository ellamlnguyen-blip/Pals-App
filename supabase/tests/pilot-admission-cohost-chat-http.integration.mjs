import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { localTarget, sql, quote, ok, resetDisposable, assertClean } from "./helpers/pilot-admission-cohost-chat.mjs";

// SOURCE AUTHORING ONLY until the coordinator releases the exclusively owned26
// disposable. SQL below is privileged synthetic setup/observation, never RLS proof.
// All operation/permission assertions use real Auth bearers through PostgREST.
const actions = { RH: "remove_hangout_participant", RC: "remove_hangout_participant", P: "promote_hangout_cohost", D: "demote_hangout_cohost", SD: "step_down_hangout_cohost", S: "send_hangout_message", SR: "send_hangout_message" };
const baseError = "Hangout operation not permitted";
const chatError = "Hangout chat unavailable";
const same = (a, b, label) => assert.ok(JSON.stringify(a) === JSON.stringify(b), label);
const digest = (value) => createHash("sha256").update(value).digest("hex");

test("B3b real Auth HTTP ABI, guards, roles, targets and retry controls", { concurrency: false, timeout: 1200000 }, async () => {
  const { request, rpc, status } = localTarget("current26"); // Must precede SQL/Auth.
  const evidence = [];
  const campus = "00000000-0000-4000-8000-000000000001";
  const otherCampus = "00000000-0000-4000-8000-000000000099";
  let censusTables, profileColumns;
  const census = () => {
    // Complete values of every relevant public/private/Storage row, retained only
    // in memory. Auth census projects current authorization evidence, excludes
    // encrypted passwords/tokens. Only per-table hashes/counts are persisted.
    censusTables ??= JSON.parse(sql("select jsonb_agg(table_schema||'.'||table_name order by table_schema,table_name) from information_schema.tables where table_type='BASE TABLE' and (table_schema='private' or table_schema='public')"));
    const parts = censusTables.concat("storage.objects").map((table) => `select ${quote(table)} name,coalesce(jsonb_agg(v order by v::text),'[]') rows from (select to_jsonb(t) v from ${table} t) q`);
    parts.push("select 'auth.users' name,coalesce(jsonb_agg(v order by v::text),'[]') rows from (select jsonb_build_object('id',id,'email',email,'email_confirmed_at',email_confirmed_at,'deleted_at',deleted_at,'raw_user_meta_data',raw_user_meta_data,'raw_app_meta_data',raw_app_meta_data) v from auth.users) q");
    return sql(`select jsonb_object_agg(name,rows) from (${parts.join(" union all ")}) q`);
  };
  const sanitized = (snapshot) => Object.fromEntries(Object.entries(JSON.parse(snapshot)).map(([name, rows]) => [name, { rows: rows.length, sha256: digest(JSON.stringify(rows)) }]));
  const observed = async (id, name, user, args) => {
    const value = ok(await rpc(name, user.token, args));
    evidence.push({ id, rpc: name, outcome: "allowed", observation: "real-Auth-HTTP", result_shape: Array.isArray(value) ? Object.keys(value[0] ?? {}).sort() : typeof value });
    return value;
  };
  const allowed = (id, s, args = s.args) => observed(id, actions[s.action], s.user, args);
  const denied = async (id, s, args = s.args, message = baseError, http = 403, code = "42501", token = s.user?.token ?? null) => {
    const before = census();
    const response = await rpc(actions[s.action], token, args);
    assert.equal(response.status, http, id);
    assert.equal(response.body?.code, code, id);
    assert.equal(response.body?.message, message, id);
    assert.ok(!["message_id", "sequence", "created_at", "author_id", "author_label", "revision", "title", "instructions"].some((key) => Object.hasOwn(response.body ?? {}, key)), `${id}: no source/receipt/revision projection`);
    const after = census();
    assert.ok(after === before, `${id}: full-row zero delta`);
    evidence.push({ id, rpc: actions[s.action], observation: "real-Auth-HTTP", http, code, message, before: sanitized(before), after: sanitized(after), zero_delta: true });
  };
  const transportDenied = async (id, invoke, http, code) => {
    const before = census(), response = await invoke();
    assert.equal(response.status, http, id);
    assert.equal(response.body?.code, code, id);
    assert.ok(census() === before, `${id}: zero delta`);
    evidence.push({ id, observation: "real-HTTP-transport-or-ACL", http, code, before: sanitized(before), after: sanitized(before), zero_delta: true });
  };
  const signup = async (metadata = {}) => {
    const email = `b3b-http-${randomUUID()}@unc.edu`, password = `Local-only-${randomUUID()}`;
    const created = ok(await request("/auth/v1/signup", null, { email, password, data: metadata }));
    const id = created.user?.id ?? created.id;
    assert.match(id, /^[0-9a-f-]{36}$/);
    sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)}`);
    const login = ok(await request("/auth/v1/token?grant_type=password", null, { email, password }));
    assert.equal(login.user.id, id); assert.ok(login.access_token);
    return { id, email, token: login.access_token, path: `${id}/b3b-http.png` };
  };
  const ready = (u) => sql(`insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',${quote(u.path)},${quote(u.id)}); update public.profiles set real_name='Synthetic cohost chat',graduation_year=2028,major='Math',bio='Local',primary_photo_path=${quote(u.path)} where user_id=${quote(u.id)}; insert into private.pilot_account_admission(account_id,state,revision) values(${quote(u.id)},'active',1)`);
  const row = (id) => JSON.parse(sql(`select to_jsonb(h) from public.hangouts h where id=${quote(id)}`));
  const state = (id, u) => sql(`select state from public.hangout_participants where hangout_id=${quote(id)} and account_id=${quote(u.id)}`);
  const assignment = (id, u) => sql(`select count(*) from private.hangout_cohosts where hangout_id=${quote(id)} and account_id=${quote(u.id)}`);
  let host, actor, target, stranger, forgery;
  const create = async () => observed("SETUP.create", "create_hangout", host, { p_request_id: randomUUID(), p_title: "Synthetic cohost chat", p_starts_at: new Date(Date.now() + 86400000).toISOString(), p_public_place: "Approximate area", p_public_latitude: 35.91, p_public_longitude: -79.05, p_private_instructions: "Synthetic private instructions" });
  const scenario = async (action) => {
    const id = await create();
    for (const u of [actor, target]) await observed("SETUP.join", "join_hangout", u, { p_hangout_id: id });
    if (["RC", "SD"].includes(action)) await observed("SETUP.actor-promote", actions.P, host, { p_hangout_id: id, p_account_id: actor.id, p_expected_revision: row(id).revision });
    if (action === "D") await observed("SETUP.target-promote", actions.P, host, { p_hangout_id: id, p_account_id: target.id, p_expected_revision: row(id).revision });
    const user = ["RH", "P", "D"].includes(action) ? host : actor;
    const args = ["S", "SR"].includes(action) ? { p_hangout_id: id, p_request_id: randomUUID(), p_body: "Synthetic message" } : { p_hangout_id: id, ...(["RH", "RC", "P", "D"].includes(action) ? { p_account_id: target.id } : {}), p_expected_revision: row(id).revision };
    const s = { action, id, user, args };
    if (action === "SR") s.saved = await allowed("SETUP.saved-message", s);
    return s;
  };
  const subjects = (action) => ["RH", "D"].includes(action) ? [["host_actor", host]] : action === "P" ? [["host_actor", host], ["target", target]] : action === "RC" ? [["actor", actor], ["host", host], ["target", target]] : [["actor", actor], ["host", host]];
  const hostilePayload = (s) => ["S", "SR"].includes(s.action) ? { ...s.args, p_body: "" } : { ...s.args, p_expected_revision: 0 };
  const guardLoss = async (s, id, remove, restore, message = baseError) => {
    sql(remove);
    try {
      await denied(id, s, hostilePayload(s), message);
      if (s.action === "SR") {
        await denied(`${id}.exact`, s, s.args, message);
        await denied(`${id}.mismatch`, s, { ...s.args, p_body: "Changed saved request" }, message);
      }
    } finally { sql(restore); }
  };
  const identityLosses = (u) => {
    const id = quote(u.id), path = quote(u.path);
    const member = sql(`select to_jsonb(m) from public.university_memberships m where user_id=${id}`);
    const profile = sql(`select to_jsonb(p) from public.profiles p where user_id=${id}`);
    const restoreMember = `insert into public.university_memberships select * from jsonb_populate_record(null::public.university_memberships,${quote(member)}::jsonb)`;
    profileColumns ??= sql("select string_agg(column_name,',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='profiles' and is_generated='NEVER'");
    assert.match(profileColumns, /^[a-z_]+(?:,[a-z_]+)*$/);
    const restoreProfile = `insert into public.profiles(${profileColumns}) select ${profileColumns} from jsonb_populate_record(null::public.profiles,${quote(profile)}::jsonb)`;
    return [
      ["roster-revoked", `update private.pilot_account_admission set state='revoked' where account_id=${id}`, `update private.pilot_account_admission set state='active' where account_id=${id}`],
      ["roster-missing", `delete from private.pilot_account_admission where account_id=${id}`, `insert into private.pilot_account_admission(account_id,state,revision) values(${id},'active',1)`],
      ["suspended", `update public.accounts set status='suspended' where id=${id}`, `update public.accounts set status='active' where id=${id}`],
      ["banned", `update public.accounts set status='banned' where id=${id}`, `update public.accounts set status='active' where id=${id}`],
      ["email_confirmation", `update auth.users set email_confirmed_at=null where id=${id}`, `update auth.users set email_confirmed_at=now() where id=${id}`],
      ["email_domain", `update auth.users set email='b3b-${u.id}@example.test' where id=${id}`, `update auth.users set email=${quote(u.email)} where id=${id}`],
      ["email_equality", `update public.university_memberships set verification_email='other@unc.edu' where user_id=${id}`, `update public.university_memberships set verification_email=${quote(u.email)} where user_id=${id}`],
      ["membership_verification", `update public.university_memberships set verified_at=null,verification_email=null where user_id=${id}`, `update public.university_memberships set verified_at=now(),verification_email=${quote(u.email)} where user_id=${id}`],
      ["membership_delete", `delete from public.university_memberships where user_id=${id}`, restoreMember],
      ["membership_campus", `update public.university_memberships set university_id=${quote(otherCampus)} where user_id=${id}`, `update public.university_memberships set university_id=${quote(campus)} where user_id=${id}`],
      ["campus_active", `update public.universities set active=false where id=${quote(campus)}`, `update public.universities set active=true where id=${quote(campus)}`],
      ["campus_unc", `update public.universities set slug='synthetic-other' where id=${quote(campus)}`, `update public.universities set slug='unc-chapel-hill' where id=${quote(campus)}`],
      ["campus_allowlist", `update public.universities set allowed_email_domains='{}' where id=${quote(campus)}`, `update public.universities set allowed_email_domains=array['unc.edu'] where id=${quote(campus)}`],
      ["profile_missing", `delete from public.profiles where user_id=${id}`, restoreProfile],
      ["profile_required", `update public.profiles set bio=null where user_id=${id}`, `update public.profiles set bio='Local' where user_id=${id}`],
      ["profile_primary", `update public.profiles set primary_photo_path=null where user_id=${id}`, `update public.profiles set primary_photo_path=${path} where user_id=${id}`],
      ["object_detach_delete", `begin;set local storage.allow_delete_query='true';update public.profiles set primary_photo_path=null where user_id=${id};delete from storage.objects where bucket_id='profile-photos' and name=${path};commit`, `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos',${path},${id});update public.profiles set primary_photo_path=${path} where user_id=${id}`],
      // Invalid replacements remain invalid; serial controls cannot prove missing-
      // lookup wait behavior. That distinct obligation belongs to race fixtures.
      ["membership_delete_replace", `delete from public.university_memberships where user_id=${id};${restoreMember};update public.university_memberships set verified_at=null,verification_email=null where user_id=${id}`, `delete from public.university_memberships where user_id=${id};${restoreMember}`],
      ["profile_delete_replace", `delete from public.profiles where user_id=${id};${restoreProfile};update public.profiles set bio=null where user_id=${id}`, `delete from public.profiles where user_id=${id};${restoreProfile}`],
    ];
  };
  const policyLosses = (action) => {
    const cells = [["availability.off", "update private.pilot_availability set enabled=false", "update private.pilot_availability set enabled=true", baseError], ["availability.missing", "delete from private.pilot_availability", "insert into private.pilot_availability(singleton,enabled,revision) values(true,true,1)", baseError]];
    for (const key of ["hangouts", ...(["S", "SR"].includes(action) ? ["hangout_chat"] : [])]) {
      const error = key === "hangouts" ? baseError : chatError;
      cells.push([`${key}.off`, `update private.pilot_capabilities set enabled=false where key=${quote(key)}`, `update private.pilot_capabilities set enabled=true where key=${quote(key)}`, error], [`${key}.missing`, `delete from private.pilot_capabilities where key=${quote(key)}`, `insert into private.pilot_capabilities(key,enabled,revision) values(${quote(key)},true,1)`, error]);
    }
    for (const table of ["hangout_feature_gate", ...(["S", "SR"].includes(action) ? ["hangout_chat_feature_gate"] : [])]) {
      const error = table === "hangout_feature_gate" ? baseError : chatError;
      cells.push([`${table}.off`, `update private.${table} set enabled=false`, `update private.${table} set enabled=true`, error], [`${table}.missing`, `delete from private.${table}`, `insert into private.${table}(singleton,enabled) values(true,true)`, error]);
    }
    return cells;
  };
  try {
    assertClean();
    [host, actor, target, stranger] = await Promise.all([signup(), signup(), signup(), signup()]);
    forgery = await signup({ actor_id: host.id, role: "admin", pilot_manager: true, admitted: true, ready: true });
    sql("update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=true where key in ('hangouts','hangout_chat');update private.hangout_feature_gate set enabled=true;update private.hangout_chat_feature_gate set enabled=true");
    for (const u of [host, actor, target, stranger]) ready(u);
    sql(`insert into public.universities(id,name,slug,allowed_email_domains,active) values(${quote(otherCampus)},'Synthetic other','synthetic-campus',array['unc.edu'],true);insert into public.platform_roles(user_id,role) values(${quote(forgery.id)},'admin')`);
    assert.equal(sql("select count(*) from private.pilot_capabilities where enabled and key not in ('hangouts','hangout_chat')"), "0");
    assert.equal(sql("select enabled from private.pilot_capabilities where key='onboarding'"), "f");

    for (const action of Object.keys(actions)) {
      const s = await scenario(action), before = row(s.id), result = await allowed(`L1.${action}.success.onboarding-off`, s);
      if (["S", "SR"].includes(action)) {
        assert.equal(result.length, 1); same(Object.keys(result[0]).sort(), ["message_id", "sequence", "body", "created_at", "mine", "author_id", "author_label"].sort(), "seven-field ABI");
        assert.equal(result[0].mine, true); assert.equal(result[0].author_id, actor.id); assert.equal(result[0].author_label, null);
        if (action === "SR") same(result, s.saved, "exact original result");
      } else { assert.equal(result, before.revision + 1); assert.equal(row(s.id).revision, result); }
      await denied(`L1.${action}.anonymous`, s, s.args, `permission denied for function ${actions[action]}`, 401, "42501", null);
      assert.ok(status.SERVICE_ROLE_KEY, "in-memory local service JWT required");
      await denied(`L1.${action}.service-ACL`, s, s.args, `permission denied for function ${actions[action]}`, 403, "42501", status.SERVICE_ROLE_KEY);
      await transportDenied(`L1.${action}.forged-actor-argument`, () => rpc(actions[action], s.user.token, { ...s.args, p_actor_id: stranger.id }), 404, "PGRST202");
      await denied(`L1.${action}.metadata-platform-role-no-admission`, { ...s, user: forgery }, hostilePayload(s));
      await denied(`L1.${action}.source-null`, s, { ...hostilePayload(s), p_hangout_id: null });
      await denied(`L1.${action}.source-absent`, s, { ...hostilePayload(s), p_hangout_id: randomUUID() });
      await transportDenied(`L1.${action}.bad-UUID-transport`, () => rpc(actions[action], s.user.token, { ...s.args, p_hangout_id: "not-a-uuid" }), 400, "22P02");
      const signature = s.user.token.split('.'); signature[2] = `${signature[2][0] === 'a' ? 'b' : 'a'}${signature[2].slice(1)}`;
      const forgedBefore = census(), invalidBearer = await rpc(actions[action], signature.join('.'), s.args);
      assert.equal(invalidBearer.status, 401); assert.ok(census() === forgedBefore, "invalid signature zero delta");
      evidence.push({ id: `L1.${action}.forged-JWT-signature`, http: 401, zero_delta: true });
      // Every route and every actual ready subject gets all19 serial losses,
      // including the five paths conditionally mapped only for L3 races.
      const guard = await scenario(action);
      for (const [label, u] of subjects(action)) for (const [loss, remove, restore] of identityLosses(u)) await guardLoss(guard, `HTTP.guard.${action}.${label}.${loss}`, remove, restore);
      for (const [loss, remove, restore, message] of policyLosses(action)) await guardLoss(guard, `HTTP.guard.${action}.${loss}`, remove, restore, message);
      if (!["S", "SR"].includes(action)) {
        await denied(`L1.${action}.authorized-null-revision`, guard, { ...guard.args, p_expected_revision: null }, "Stale Hangout revision", 500, "40001");
        await denied(`L1.${action}.authorized-stale-revision`, guard, hostilePayload(guard), "Stale Hangout revision", 500, "40001");
      }
    }
    // Private objects/helpers are absent from exposed API; direct public DML
    // denies under authenticated table ACLs. No private-schema SQL role claim.
    for (const table of ["hangouts", "hangout_participants", "hangout_private_locations"]) await transportDenied(`L1.raw-DML.${table}`, () => request(`/rest/v1/${table}`, actor.token, {}), 403, "42501");
    for (const table of ["hangout_cohosts", "hangout_conversations", "hangout_messages", "hangout_message_requests", "pilot_account_admission"]) await transportDenied(`L1.private-table.${table}`, () => request(`/rest/v1/${table}`, actor.token), 404, "PGRST205");
    for (const name of ["pilot_lock_cohost_chat", "pilot_require_cohost_chat"]) await transportDenied(`L1.private-helper.${name}`, () => rpc(name, actor.token, { p_operation: actions.S, p_hangout_id: randomUUID(), p_account_id: null }), 404, "PGRST202");
    const overload = await scenario("RH");
    await transportDenied("L1.remove-two-argument-overload-absent", () => rpc(actions.RH, host.token, { p_hangout_id: overload.id, p_account_id: target.id }), 404, "PGRST202");
    const source = await scenario("S");
    same(ok(await request(`/rest/v1/hangout_private_locations?hangout_id=eq.${source.id}`, stranger.token)), [], "stranger private place hidden");
    assert.equal(ok(await request(`/rest/v1/hangout_private_locations?hangout_id=eq.${source.id}&select=instructions`, host.token))[0].instructions, "Synthetic private instructions");

    // Exact sender payload, normalization, fingerprint, seven fields and all
    // retained side effects. Same request key belongs to actor+source, not UUID.
    const send = await scenario("S");
    send.args.p_body = "\u00a0\u2003 Synthetic normalized message \ufeff\n";
    const first = await allowed("L1.S.payload.unicode-first", send);
    assert.equal(first[0].body, "Synthetic normalized message");
    assert.equal(sql(`select payload_fingerprint from private.hangout_message_requests where hangout_id=${quote(send.id)} and author_id=${quote(actor.id)} and request_id=${quote(send.args.p_request_id)}`), digest("Synthetic normalized message"));
    const retryBefore = census();
    same(await allowed("L1.SR.payload.normalized-exact", send, { ...send.args, p_body: "Synthetic normalized message" }), first, "all seven original fields");
    assert.ok(census() === retryBefore, "exact retry no conversation/sequence/message/ledger/inbox delta");
    evidence.push({ id: "L1.SR.payload.complete-retry-census", before: sanitized(retryBefore), after: sanitized(retryBefore), zero_delta: true });
    await denied("L1.SR.payload.mismatch", send, { ...send.args, p_body: "Changed" }, "Message request conflict", 409, "23505");
    for (const [label, overrides] of [["null-request", { p_request_id: null }], ["null-body", { p_body: null }], ["empty", { p_body: "\u00a0\ufeff\n" }], ["2001", { p_body: "x".repeat(2001) }]]) await denied(`L1.S.payload.${label}`, send, { ...send.args, ...overrides }, "Invalid Hangout message", 400, "22023");
    for (const size of [1, 2000]) { const value = await allowed(`L1.S.payload.${size}`, send, { ...send.args, p_request_id: randomUUID(), p_body: "x".repeat(size) }); assert.equal(value[0].body.length, size); }
    const crossActor = await observed("L1.S.payload.cross-actor-key", actions.S, target, { ...send.args, p_body: "Cross actor" });
    assert.notEqual(crossActor[0].message_id, first[0].message_id); assert.equal(crossActor[0].author_id, target.id); assert.equal(crossActor[0].body, "Cross actor");
    const crossSource = await scenario("S");
    const crossResult = await allowed("L1.S.payload.cross-source-key", crossSource, { ...crossSource.args, p_request_id: send.args.p_request_id, p_body: "Cross source" });
    assert.notEqual(crossResult[0].message_id, first[0].message_id);
    const hostSend = { ...await scenario("S"), user: host };
    const hostResult = await allowed("L1.S.host-sender-dedup", hostSend);
    const hostBefore = census(); same(await allowed("L1.SR.host-sender-dedup", hostSend), hostResult, "host exact seven-field return"); assert.ok(census() === hostBefore, "host retry no delta");

    // Target shape and actual retained state dominate stale revision, never
    // reveal revision for an unauthorized target/role.
    for (const action of ["RH", "RC", "P", "D"]) {
      const s = await scenario(action);
      for (const [label, account] of [["null", null], ["self", s.user.id], ["immutable-host", host.id], ["absent", randomUUID()], ["nonmember", stranger.id]]) await denied(`L1.${action}.target.${label}`, s, { ...hostilePayload(s), p_account_id: account });
      await transportDenied(`L1.${action}.target.bad-UUID`, () => rpc(actions[action], s.user.token, { ...s.args, p_account_id: "malformed" }), 400, "22P02");
    }
    for (const action of ["P", "D"]) {
      const s = await scenario(action); await observed("SETUP.unauthorized-cohost-role", actions.P, host, { p_hangout_id: s.id, p_account_id: actor.id, p_expected_revision: row(s.id).revision });
      await denied(`L1.${action}.cohost-has-no-host-authority`, { ...s, user: actor }, hostilePayload(s));
      const before = census(), cancel = await rpc("cancel_hangout", actor.token, { p_hangout_id: s.id, p_expected_revision: 0 });
      assert.equal(cancel.status, 403); assert.equal(cancel.body.code, "42501"); assert.equal(cancel.body.message, baseError); assert.ok(census() === before, "cohost cannot cancel");
      evidence.push({ id: `L1.${action}.cohost-cannot-cancel`, http: 403, code: "42501", zero_delta: true });
    }
    const noncohostRemoval = await scenario("RH"); await denied("L1.RH.noncohost-has-no-removal-authority", { ...noncohostRemoval, user: actor }, hostilePayload(noncohostRemoval));
    const hostStepdown = await scenario("SD"); await denied("L1.SD.host-cannot-stepdown", { ...hostStepdown, user: host }, hostilePayload(hostStepdown));
    for (const action of ["RC", "P"]) {
      const left = await scenario(action); await observed("SETUP.target-left", "leave_hangout", target, { p_hangout_id: left.id }); await denied(`L1.${action}.target.left-before-stale`, left, hostilePayload(left));
      const cohost = await scenario(action); await observed("SETUP.target-cohost", actions.P, host, { p_hangout_id: cohost.id, p_account_id: target.id, p_expected_revision: row(cohost.id).revision }); await denied(`L1.${action}.target.already-cohost`, cohost, hostilePayload(cohost));
    }
    for (const action of ["RH", "RC", "P"]) {
      const s = await scenario(action); await observed("SETUP.target-removed", actions.RH, host, { p_hangout_id: s.id, p_account_id: target.id, p_expected_revision: row(s.id).revision }); await denied(`L1.${action}.target.removed-terminal`, s, hostilePayload(s));
    }
    for (const action of ["RH", "D"]) for (const [loss, remove, restore] of identityLosses(target).filter(([loss]) => !loss.startsWith("campus_"))) {
      const s = await scenario(action); sql(remove);
      try { assert.equal(await allowed(`L1.${action}.unready-target.${loss}`, s), s.args.p_expected_revision + 1); }
      finally { sql(restore); }
    }
    for (const cancelled of [false, true]) for (const left of [false, true]) {
      const s = await scenario("RH");
      await observed("SETUP.retained-target-cohost", actions.P, host, { p_hangout_id: s.id, p_account_id: target.id, p_expected_revision: row(s.id).revision });
      if (left) await observed("SETUP.retained-target-left", "leave_hangout", target, { p_hangout_id: s.id });
      if (cancelled) await observed("SETUP.cancelled-host-removal", "cancel_hangout", host, { p_hangout_id: s.id, p_expected_revision: row(s.id).revision });
      const before = row(s.id); s.args.p_expected_revision = before.revision;
      sql(`update private.pilot_account_admission set state='revoked' where account_id=${quote(target.id)};update public.accounts set status='suspended' where id=${quote(target.id)}`);
      try {
        assert.equal(await allowed(`L1.RH.retained.${cancelled ? "cancelled" : "published"}.${left ? "left" : "joined"}.inactive`, s), before.revision + 1);
        assert.equal(state(s.id, target), "removed"); assert.equal(assignment(s.id, target), "0");
        if (cancelled) { const after = row(s.id); assert.equal(after.updated_at, before.updated_at); same({ ...after, revision: before.revision }, before, "cancelled parent revision-only"); }
      } finally { sql(`update private.pilot_account_admission set state='active' where account_id=${quote(target.id)};update public.accounts set status='active' where id=${quote(target.id)}`); }
    }

    // Published status and actual membership/role loss use actual student RPCs.
    // Cancellation is terminal; no fabricated restoration is attempted.
    for (const action of ["RC", "P", "D", "SD", "S", "SR"]) {
      const s = await scenario(action); await observed("SETUP.cancel", "cancel_hangout", host, { p_hangout_id: s.id, p_expected_revision: row(s.id).revision });
      await denied(`L1.${action}.source.cancelled`, s, hostilePayload(s), ["S", "SR"].includes(action) ? chatError : baseError);
      if (action === "SR") await denied("L1.SR.cancelled.saved-body-denied", s, s.args, chatError);
    }
    for (const action of ["RC", "SD", "S", "SR"]) for (const departure of ["leave", "remove", "demote", "stepdown"]) {
      const s = await scenario(action);
      if (["S", "SR"].includes(action)) await observed("SETUP.send-role", actions.P, host, { p_hangout_id: s.id, p_account_id: actor.id, p_expected_revision: row(s.id).revision });
      const retainedChat = action === "SR" ? Object.fromEntries(Object.entries(JSON.parse(census())).filter(([name]) => ["private.hangout_conversations", "private.hangout_messages", "private.hangout_message_requests", "private.notification_items"].includes(name))) : null;
      if (departure === "leave") await observed("SETUP.actor-leave", "leave_hangout", actor, { p_hangout_id: s.id });
      else if (departure === "stepdown") await observed("SETUP.actor-stepdown", actions.SD, actor, { p_hangout_id: s.id, p_expected_revision: row(s.id).revision });
      else await observed(`SETUP.actor-${departure}`, departure === "remove" ? actions.RH : actions.D, host, { p_hangout_id: s.id, p_account_id: actor.id, p_expected_revision: row(s.id).revision });
      assert.equal(assignment(s.id, actor), "0");
      if (["demote", "stepdown"].includes(departure) && ["S", "SR"].includes(action)) {
        assert.equal(state(s.id, actor), "joined");
        const before = census();
        const receipt = await allowed(`L1.${action}.${departure}.role-only-loss-still-joined`, s);
        assert.equal(receipt.length, 1);
        assert.deepEqual(Object.keys(receipt[0]).sort(), ["message_id", "sequence", "body", "created_at", "mine", "author_id", "author_label"].sort());
        assert.equal(receipt[0].body, s.args.p_body); assert.equal(receipt[0].mine, true); assert.equal(receipt[0].author_id, actor.id); assert.equal(receipt[0].author_label, null);
        if (action === "SR") {
          same(receipt, s.saved, "role-only loss preserves exact original seven fields"); assert.ok(census() === before, "role-only loss exact retry changes no complete census");
          same(Object.fromEntries(Object.entries(JSON.parse(census())).filter(([name]) => Object.hasOwn(retainedChat, name))), retainedChat, "role-only public writer/retry retains chat/sequence/ledger/inbox values");
        }
      }
      else await denied(`L1.${action}.actor.${departure}`, s, hostilePayload(s), ["S", "SR"].includes(action) ? chatError : baseError);
      if (["RC", "SD"].includes(action)) {
        const before = census(); const acceptedEdit = await rpc("set_hangout_joining", actor.token, { p_hangout_id: s.id, p_expected_revision: 0, p_joining_state: "invalid" });
        assert.equal(acceptedEdit.status, 403); assert.equal(acceptedEdit.body.code, "42501"); assert.equal(acceptedEdit.body.message, baseError); assert.ok(census() === before, "inherited cohost joining role denial zero delta");
        evidence.push({ id: `L1.inherited-joining.${action}.${departure}`, http: 403, code: "42501", zero_delta: true });
      }
    }

    const missingDemotion = await scenario("D"); await allowed("SETUP.assignment-demoted", missingDemotion); await denied("L1.D.required-assignment-missing", missingDemotion, hostilePayload(missingDemotion));
    for (const action of ["RH", "RC", "P", "SD", "S", "SR"]) {
      const s = await scenario(action), subject = ["RH", "RC", "P"].includes(action) ? target : actor;
      sql(`delete from public.hangout_participants where hangout_id=${quote(s.id)} and account_id=${quote(subject.id)}`);
      await denied(`L1.${action}.required-participant-missing`, s, hostilePayload(s), ["S", "SR"].includes(action) ? chatError : baseError);
      if (action === "SR") await denied("L1.SR.missing-participant-saved-body-denied", s, s.args, chatError);
    }
    for (const action of ["S", "SR"]) { const s = await scenario(action); await denied(`L1.${action}.ready-nonmember`, { ...s, user: stranger }, hostilePayload(s), chatError); }

    // Synthetic bilateral rows isolate inherited block predicates without
    // pretending that privileged inserts are public block-teardown evidence.
    for (const action of ["RC", "SD", "S", "SR"]) for (const direction of ["actor-host", "host-actor"]) {
      const s = await scenario(action), [a, b] = direction === "actor-host" ? [actor, host] : [host, actor];
      await guardLoss(s, `L1.${action}.block.${direction}`, `insert into private.people_blocks(blocker_id,blocked_id) values(${quote(a.id)},${quote(b.id)})`, `delete from private.people_blocks where blocker_id=${quote(a.id)} and blocked_id=${quote(b.id)}`, ["S", "SR"].includes(action) ? chatError : baseError);
    }
    for (const action of ["RC", "P", "RH", "D"]) for (const reverse of [false, true]) {
      const s = await scenario(action), principal = action === "RC" ? actor : host, [a, b] = reverse ? [target, principal] : [principal, target];
      sql(`insert into private.people_blocks(blocker_id,blocked_id) values(${quote(a.id)},${quote(b.id)})`);
      try { if (["RH", "D"].includes(action)) await allowed(`L1.${action}.retained-target-block.${reverse}`, s); else await denied(`L1.${action}.target-block.${reverse}`, s, hostilePayload(s)); }
      finally { sql(`delete from private.people_blocks where blocker_id=${quote(a.id)} and blocked_id=${quote(b.id)}`); }
    }

    // Real public block transitions prove departure/role teardown and the lack
    // of automatic restoration after unblocking; these are actual HTTP evidence.
    sql("update private.safety_feature_gate set enabled=true");
    for (const action of ["RC", "SD", "S", "SR"]) for (const reverse of [false, true]) {
      const s = await scenario(action);
      if (["S", "SR"].includes(action)) await observed("SETUP.block-send-role", actions.P, host, { p_hangout_id: s.id, p_account_id: actor.id, p_expected_revision: row(s.id).revision });
      const blocker = reverse ? host : actor, peer = reverse ? actor : host;
      assert.equal(await observed("SETUP.actual-block", "set_safety_block", blocker, { p_account_id: peer.id, p_blocked: true }), true);
      assert.equal(state(s.id, actor), reverse ? "removed" : "left"); assert.equal(assignment(s.id, actor), "0");
      await denied(`L1.${action}.actual-block-teardown.${reverse}`, s, hostilePayload(s), ["S", "SR"].includes(action) ? chatError : baseError);
      assert.equal(await observed("SETUP.actual-unblock", "set_safety_block", blocker, { p_account_id: peer.id, p_blocked: false }), false);
      assert.equal(state(s.id, actor), reverse ? "removed" : "left"); assert.equal(assignment(s.id, actor), "0");
      await denied(`L1.${action}.unblock-no-restoration.${reverse}`, s, hostilePayload(s), ["S", "SR"].includes(action) ? chatError : baseError);
    }
    sql("update private.safety_feature_gate set enabled=false");

    // Actual report/operator disable; separate from synthetic identity setup.
    const operator = await signup(); sql(`insert into public.platform_roles(user_id,role) values(${quote(operator.id)},'moderator');update private.safety_feature_gate set enabled=true;update private.moderation_feature_gate set enabled=true`);
    let reportIndex = 0;
    for (const action of Object.keys(actions)) {
      const s = await scenario(action), reporter = reportIndex++ % 2 ? actor : target;
      const receipt = (await observed("SETUP.disable-report", "submit_safety_report", reporter, { p_request_id: randomUUID(), p_target_mode: "hangout", p_target_id: s.id, p_category: "safety concern" }))[0].receipt_id;
      await observed("SETUP.disable-review", "transition_moderation_case", operator, { p_report_id: receipt, p_request_id: randomUUID(), p_expected_revision: 0, p_action: "start_review" });
      await observed("SETUP.disable-apply", "apply_hangout_moderation_action", operator, { p_report_id: receipt, p_request_id: randomUUID(), p_expected_case_revision: 1, p_reason: "Synthetic cohost chat disable" });
      await denied(`L1.${action}.source.disabled`, s, hostilePayload(s));
      if (action === "SR") await denied("L1.SR.disabled.saved-body-denied", s, s.args);
      same(ok(await request(`/rest/v1/hangouts?id=eq.${s.id}`, actor.token)), [], "disabled source RLS hidden");
      same(ok(await request(`/rest/v1/hangout_private_locations?hangout_id=eq.${s.id}`, actor.token)), [], "disabled instructions RLS hidden");
    }
    sql("update private.safety_feature_gate set enabled=false;update private.moderation_feature_gate set enabled=false");

    // Readmission and gate re-enable never restore terminal membership or roles.
    const departed = await scenario("SD"); await observed("SETUP.readmission-departure", "leave_hangout", actor, { p_hangout_id: departed.id });
    sql(`update private.pilot_account_admission set state='revoked' where account_id=${quote(actor.id)};update private.pilot_account_admission set state='active' where account_id=${quote(actor.id)};update private.pilot_availability set enabled=false;update private.pilot_availability set enabled=true`);
    assert.equal(state(departed.id, actor), "left"); assert.equal(assignment(departed.id, actor), "0"); await denied("L1.SD.readmission-no-role-restore", departed, hostilePayload(departed));
    await observed("SETUP.explicit-rejoin", "join_hangout", actor, { p_hangout_id: departed.id }); assert.equal(assignment(departed.id, actor), "0"); await denied("L1.SD.rejoin-no-role-restore", departed, hostilePayload(departed));
    const terminal = await scenario("RH"); await allowed("SETUP.terminal-remove", terminal);
    sql(`update private.pilot_account_admission set state='revoked' where account_id=${quote(target.id)};update private.pilot_account_admission set state='active' where account_id=${quote(target.id)}`);
    const beforeTerminal = census(), rejoin = await rpc("join_hangout", target.token, { p_hangout_id: terminal.id }); assert.equal(rejoin.status, 403); assert.equal(rejoin.body.code, "42501"); assert.equal(state(terminal.id, target), "removed"); assert.ok(census() === beforeTerminal, "terminal rejoin zero delta");
    assert.equal(sql("select count(*) from private.pilot_capabilities where enabled and key not in ('hangouts','hangout_chat')"), "0");
    assert.equal(sql("select enabled from private.notification_feature_gate"), "f");
    assert.equal(sql("select enabled from private.large_hangout_feature_gate"), "f");
    sql("do $$declare t record;live boolean;begin for t in select table_name from information_schema.tables where table_schema='private' and table_name like '%feature_gate' and table_name not in ('hangout_feature_gate','hangout_chat_feature_gate') loop execute format('select coalesce(bool_or(enabled),false) from private.%I',t.table_name) into live;if live then raise exception 'Deferred fixture gate unexpectedly enabled';end if;end loop;end;$$");
    evidence.push({ id: "L1.deferred-gates-remain-off", onboarding_dependency: false, deferred_exposure_revived: false });
    writeFileSync("agents/handoffs/TASK-021A1b3b-HTTP-EVIDENCE.json", JSON.stringify({ fixture: "B3b real Auth HTTP", lane: "current26", cases: evidence, case_count: evidence.length, count_meaning: "individual recorded serial controls, including SETUP; not concurrency matrix coverage", privileged_setup_census: true, auth_bearers_retained_only_in_memory: true, concurrency_claimed: false, conditional_L3_substitution_in_HTTP: false }, null, 2) + "\n");
    console.log(JSON.stringify({ fixture: "B3b HTTP", recorded_case_count: evidence.length, concurrency_claimed: false }));
  } finally {
    // Required even on assertion/Auth/setup failure. Helper rechecks exact owner,
    // socket/telemetry/current26 before resetting; guard failure must stop, never
    // fall back to an unguarded reset or erase another runtime owner's data.
    resetDisposable(); assertClean();
  }
});
