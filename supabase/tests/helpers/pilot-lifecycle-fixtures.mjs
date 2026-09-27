import { sql, quote } from "./pilot-admission-lifecycle.mjs";
export const host = "b3a00000-0000-4000-8000-000000000001";
export const actor = "b3a00000-0000-4000-8000-000000000002";
export const campus = "00000000-0000-4000-8000-000000000001";
export const hangout = "b3a00000-0000-4000-8001-000000000001";
export const requestId = "b3a00000-0000-4000-8002-000000000001";
export const auth = (id) =>
  `set local role authenticated;set local request.jwt.claims=${quote(JSON.stringify({ sub: id, role: "authenticated" }))};`;
export const input = (id = requestId) => ({
  p_request_id: id,
  p_title: "Lifecycle source",
  p_starts_at: new Date(Date.now() + 86400000).toISOString(),
  p_public_place: "Approximate",
  p_public_latitude: 35.91,
  p_public_longitude: -79.05,
  p_private_instructions: "Private fixture",
});
export function setup() {
  sql(
    `insert into auth.users(id,email,email_confirmed_at) values('${host}','b3a-host@unc.edu',now()),('${actor}','b3a-actor@unc.edu',now());insert into storage.objects(bucket_id,name,owner_id) select 'profile-photos',id::text||'/11111111.png',id::text from public.accounts;update public.profiles set real_name='Lifecycle fixture',major='Math',bio='Local',graduation_year=2028,primary_photo_path=user_id::text||'/11111111.png';insert into private.pilot_account_admission(account_id,state,revision) values('${host}','active',1),('${actor}','active',1);update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=(key='hangouts');update private.hangout_feature_gate set enabled=true;insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude) values('${hangout}','${host}','${campus}','Lifecycle source',now()+interval '1 day','Approximate',35.91,-79.05);insert into public.hangout_participants(hangout_id,account_id,state) values('${hangout}','${host}','joined'),('${hangout}','${actor}','joined');insert into private.hangout_cohosts(hangout_id,account_id) values('${hangout}','${actor}');`,
  );
}
// Fresh isolated fixture source; never reverse a terminal lifecycle transition.
export function restoreSource() {
  sql(
    `delete from public.hangouts where id='${hangout}';insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude) values('${hangout}','${host}','${campus}','Lifecycle source',now()+interval '1 day','Approximate',35.91,-79.05);insert into public.hangout_participants(hangout_id,account_id,state) values('${hangout}','${host}','joined'),('${hangout}','${actor}','joined');insert into private.hangout_cohosts(hangout_id,account_id) values('${hangout}','${actor}');`,
  );
}

export function createQuery(id = requestId) {
  return `select public.create_hangout('${id}','Lifecycle source','2030-01-01T12:00:00Z','Approximate',35.91,-79.05);`;
}
// Current wall-clock fixture time is shared by exact retries; new create may not
// use a past/far-future time. The SQL text is frozen once for normalized retries.
export const createSql = `select public.create_hangout('${requestId}','Lifecycle source',${quote(new Date(Date.now() + 86400000).toISOString())},'Approximate',35.91,-79.05);`;
export const routes = [
  {
    id: "create",
    rpc: "create_hangout",
    subject: host,
    query: createSql,
    subjects: [host],
  },
  {
    id: "retry",
    rpc: "create_hangout",
    subject: host,
    query: createSql,
    subjects: [host],
    retry: true,
  },
  {
    id: "edit",
    rpc: "edit_hangout",
    subject: actor,
    query: `select public.edit_hangout('${hangout}',1,'Edited source',now()+interval '1 day','Approximate',35.91,-79.05);`,
    subjects: [actor, host],
  },
  {
    id: "cancel",
    rpc: "cancel_hangout",
    subject: host,
    query: `select public.cancel_hangout('${hangout}',1);`,
    subjects: [host],
  },
  {
    id: "join",
    rpc: "join_hangout",
    subject: actor,
    query: `select public.join_hangout('${hangout}');`,
    subjects: [actor, host],
  },
  {
    id: "noop",
    rpc: "join_hangout",
    subject: actor,
    query: `select public.join_hangout('${hangout}');`,
    subjects: [actor, host],
    noop: true,
  },
  {
    id: "leave",
    rpc: "leave_hangout",
    subject: actor,
    query: `select public.leave_hangout('${hangout}');`,
    subjects: [actor, host],
  },
  {
    id: "joining",
    rpc: "set_hangout_joining",
    subject: actor,
    query: `select public.set_hangout_joining('${hangout}',1,'closed');`,
    subjects: [actor, host],
  },
];
export function prepare(route) {
  restoreSource();
  if (route.id === "create")
    sql(
      `delete from private.hangout_create_requests where host_id='${host}' and request_id='${requestId}';`,
    );
  if (route.id === "retry") sql(`begin;${auth(host)}${createSql}commit;`);
  if (route.id === "join")
    sql(
      `update public.hangout_participants set state='left',left_at=now() where hangout_id='${hangout}' and account_id='${actor}';`,
    );
}
export const call = (route) => `${auth(route.subject)}${route.query}`;
export const censusQuery = `select jsonb_build_object('sources',(select jsonb_agg(h order by id) from public.hangouts h),'participants',(select jsonb_agg(p order by hangout_id,account_id) from public.hangout_participants p),'private',(select jsonb_agg(l order by hangout_id) from public.hangout_private_locations l),'ledger',(select jsonb_agg(r order by host_id,request_id) from private.hangout_create_requests r),'notifications',(select jsonb_agg(n order by n.id) from private.notification_items n),'cohosts',(select jsonb_agg(c order by c.hangout_id,c.account_id) from private.hangout_cohosts c),'provenance',(select jsonb_agg(v order by v::text) from (select to_jsonb(p) v from private.hangout_peer_provenance p) rows))`;
export const census = () => sql(censusQuery);
