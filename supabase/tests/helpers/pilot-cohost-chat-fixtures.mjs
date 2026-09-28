import { randomUUID } from "node:crypto";
import { sql, quote } from "./pilot-admission-cohost-chat.mjs";
export const host = "b3b00000-0000-4000-8000-000000000001";
export const actor = "b3b00000-0000-4000-8000-000000000002";
export const target = "b3b00000-0000-4000-8000-000000000003";
export const manager = "b3b00000-0000-4000-8000-000000000004";
export const campus = "00000000-0000-4000-8000-000000000001";
export const otherCampus = "b3b00000-0000-4000-8000-000000000005";
export const photoPath = (id) => `${id}/11111111.png`;
export const email = (id) => `b3b-${id.slice(-1)}@unc.edu`;
export const auth = (id) =>
  `set local role authenticated;set local request.jwt.claims=${quote(JSON.stringify({ sub: id, role: "authenticated" }))};`;
export function setup() {
  sql(`begin;
    insert into auth.users(id,email,email_confirmed_at) values
    ('${host}','${email(host)}',now()),('${actor}','${email(actor)}',now()),('${target}','${email(target)}',now()),('${manager}','${email(manager)}',now());
    insert into storage.objects(bucket_id,name,owner_id) select 'profile-photos',id::text||'/11111111.png',id::text from public.accounts where id in ('${host}','${actor}','${target}');
    update public.profiles set real_name='Cohost chat fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path=user_id::text||'/11111111.png' where user_id in ('${host}','${actor}','${target}');
    insert into private.pilot_account_admission(account_id,state,revision) values('${host}','active',1),('${actor}','active',1),('${target}','active',1);
    select private.set_pilot_manager_fixture('${manager}','active',0,'B3b synthetic manager',gen_random_uuid());
    insert into public.universities(id,name,slug,allowed_email_domains,active) values('${otherCampus}','Other fixture','b3b-other',array['unc.edu'],true);
    update private.pilot_availability set enabled=true;
    update private.pilot_capabilities set enabled=(key in ('hangouts','hangout_chat'));
    update private.hangout_feature_gate set enabled=true;
    update private.hangout_chat_feature_gate set enabled=true;
    update private.safety_feature_gate set enabled=true;
    commit;`);
}
export const routes = [
  {
    id: "RH",
    rpc: "remove_hangout_participant",
    subject: host,
    subjects: { host_actor: host },
  },
  {
    id: "RC",
    rpc: "remove_hangout_participant",
    subject: actor,
    subjects: { actor, host, target },
  },
  {
    id: "P",
    rpc: "promote_hangout_cohost",
    subject: host,
    subjects: { host_actor: host, target },
  },
  {
    id: "D",
    rpc: "demote_hangout_cohost",
    subject: host,
    subjects: { host_actor: host },
  },
  {
    id: "SD",
    rpc: "step_down_hangout_cohost",
    subject: actor,
    subjects: { actor, host },
  },
  {
    id: "S",
    rpc: "send_hangout_message",
    subject: actor,
    subjects: { actor, host },
  },
  {
    id: "SR",
    rpc: "send_hangout_message",
    subject: actor,
    subjects: { actor, host },
    retry: true,
  },
];
// A new parent for every attempt avoids terminal reversal and immutable-message
// fixture deletion. Reset after each module clears retained sources/ledgers.
export function prepare(definition, options = {}) {
  const route = { ...definition, source: randomUUID(), request: randomUUID() };
  const targetState = options.targetState ?? "joined";
  sql(`begin;insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude)
    values('${route.source}','${host}','${campus}','Cohost chat source',now()+interval '1 day','Approximate',35.91,-79.05);
    insert into public.hangout_participants(hangout_id,account_id,state) values('${route.source}','${host}','joined'),('${route.source}','${actor}','joined'),('${route.source}','${target}','${targetState}');
    insert into public.hangout_private_locations(hangout_id,instructions) values('${route.source}','Private synthetic fixture');
    ${["RC", "SD", "E", "J"].includes(route.id) ? `insert into private.hangout_cohosts(hangout_id,account_id) values('${route.source}','${actor}');` : ""}
    ${route.id === "D" ? `insert into private.hangout_cohosts(hangout_id,account_id) values('${route.source}','${target}');` : ""}
    ${options.cancelled ? `update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1,updated_at=clock_timestamp() where id='${route.source}';` : ""}
    commit;`);
  if (["RH", "D"].includes(route.id) && options.inactiveTarget !== false)
    sql(
      `update public.accounts set status='suspended' where id='${target}';update private.pilot_account_admission set state='revoked' where account_id='${target}';`,
    );
  if (route.retry)
    sql(
      `begin;${auth(route.subject)}select * from public.send_hangout_message('${route.source}','${route.request}','Original fixture message');commit;`,
    );
  route.revision = Number(
    sql(`select revision from public.hangouts where id='${route.source}'`),
  );
  return route;
}
export function restoreTarget() {
  sql(
    `update public.accounts set status='active' where id='${target}';update private.pilot_account_admission set state='active' where account_id='${target}';`,
  );
}
export function query(
  route,
  {
    revision = route.revision,
    body = "Original fixture message",
    request = route.request,
  } = {},
) {
  const source = route.source === null ? "null" : quote(route.source);
  if (["S", "SR"].includes(route.id))
    return `select * from public.send_hangout_message(${source},${request === null ? "null" : quote(request)},${body === null ? "null" : quote(body)});`;
  if (route.id === "E")
    return `select public.edit_hangout(${source},${revision ?? "null"},'Edited fixture',now()+interval '1 day','Approximate',35.91,-79.05);`;
  if (route.id === "J")
    return `select public.set_hangout_joining(${source},${revision ?? "null"},'closed');`;
  if (route.id === "SD")
    return `select public.step_down_hangout_cohost(${source},${revision ?? "null"});`;
  return `select public.${route.rpc}(${source},${quote(route.target ?? target)},${revision ?? "null"});`;
}
export const call = (route, options) =>
  `${auth(route.subject)}${query(route, options)}`;
export const censusQuery = `select jsonb_build_object(
  'sources',(select jsonb_agg(h order by id) from public.hangouts h),
  'participants',(select jsonb_agg(p order by hangout_id,account_id) from public.hangout_participants p),
  'private',(select jsonb_agg(l order by hangout_id) from public.hangout_private_locations l),
  'conversations',(select jsonb_agg(c order by hangout_id) from private.hangout_conversations c),
  'messages',(select jsonb_agg(m order by id) from private.hangout_messages m),
  'requests',(select jsonb_agg(r order by hangout_id,author_id,request_id) from private.hangout_message_requests r),
  'notifications',(select jsonb_agg(n order by id) from private.notification_items n),
  'cohosts',(select jsonb_agg(c order by hangout_id,account_id) from private.hangout_cohosts c),
  'provenance',(select jsonb_agg(v order by v::text) from (select to_jsonb(p) v from private.hangout_peer_provenance p) rows))`;
export const census = () => sql(censusQuery);
export const baseDenial = "Hangout operation not permitted";
export const denialFor = (route, extraChat = false) =>
  extraChat && ["S", "SR"].includes(route.id)
    ? "Hangout chat unavailable"
    : baseDenial;
export function identityLoss(id, subject) {
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
      `update public.universities set slug='b3b-nonunc' where id='${campus}';`,
      `update public.universities set slug='unc-chapel-hill' where id='${campus}';`,
    ],
    campus_allowlist: [
      `update public.universities set allowed_email_domains=array['example.invalid'] where id='${campus}';`,
      `update public.universities set allowed_email_domains=array['unc.edu','live.unc.edu'] where id='${campus}';`,
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
  return table[id];
}
