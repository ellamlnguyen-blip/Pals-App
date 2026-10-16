import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "./node_modules/.bin/supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const sql = (input) => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local",
  "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
{ input, encoding: "utf8" }).trim();
const q = (value) => `'${value.replaceAll("'", "''")}'`;
async function call(path, token, body) {
  const response = await fetch(`${status.API_URL}${path}`, {
    method: "POST", headers: { apikey: key, authorization: `Bearer ${token ?? key}`,
      "content-type": "application/json" }, body: JSON.stringify(body) });
  const raw = await response.text();
  return { status: response.status, body: raw ? JSON.parse(raw) : null };
}
const rpc = (name, token, body={}) => call(`/rest/v1/rpc/${name}`, token, body);
async function removeFactor(token,id) {
  const response=await fetch(`${status.API_URL}/auth/v1/factors/${id}`,
    {method:"DELETE",headers:{apikey:key,authorization:`Bearer ${token}`}});
  return {status:response.status,body:await response.json()};
}
async function deniedAll(token, cases) {
  for (const [name,args] of Object.entries(cases)) denied(await rpc(name,token,args));
}
async function sessionDowngradeDuringRequest(sessionId, token) {
  const child=spawn("docker",["exec","-i","supabase_db_pals-local",
    "psql","-X","-qAt","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1"],
    {stdio:["pipe","pipe","pipe"]});
  const finished=new Promise((resolve,reject)=>{
    let error="";
    child.stderr.on("data",(chunk)=>{error+=chunk.toString();});
    child.on("error",reject);
    child.on("close",(code)=>code===0?resolve():reject(new Error(error)));
  });
  const locked=new Promise((resolve,reject)=>{
    child.stdout.on("data",(chunk)=>{
      if(chunk.toString().includes("locked")) resolve();
    });
    child.on("error",reject);
  });
  child.stdin.end(`begin;
    update auth.sessions set aal='aal1' where id=${q(sessionId)};
    select 'locked';
    select pg_sleep(0.6);
    commit;
  `);
  await locked;
  const started=Date.now();
  denied(await rpc("list_moderation_reports",token));
  assert.ok(Date.now()-started>=300,"moderation request waited for session revocation");
  await finished;
}
function denied(result) {
  assert.ok([401,403].includes(result.status), JSON.stringify(result.body));
  assert.equal(result.body?.code, "42501");
  assert.equal(result.body?.message, "Moderation unavailable");
}
function ok(result) { assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body; }
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits=0, value=0; const bytes=[];
  for (const char of secret.replaceAll("=", "").toUpperCase()) {
    value=(value<<5)|alphabet.indexOf(char); bits+=5;
    if (bits>=8) { bits-=8; bytes.push((value>>bits)&255); }
  }
  const step=Math.floor(Date.now()/30000);
  const message=Buffer.alloc(8); message.writeBigUInt64BE(BigInt(step));
  const digest=createHmac("sha1",Buffer.from(bytes)).update(message).digest();
  const offset=digest[19]&15;
  return ((digest.readUInt32BE(offset)&0x7fffffff)%1_000_000).toString().padStart(6,"0");
}
async function signup() {
  const email=`mfa-${randomUUID()}@unc.edu`, password=`Local-only-${randomUUID()}`;
  const created=ok(await call("/auth/v1/signup",null,{email,password}));
  const id=created.user?.id ?? created.id;
  assert.ok(id);
  sql(`update auth.users set email_confirmed_at=now() where id=${q(id)}`);
  const login=ok(await call("/auth/v1/token?grant_type=password",null,{email,password}));
  return { id, aal1:login.access_token };
}
async function verifyTotp(token) {
  const enrolled=ok(await call("/auth/v1/factors",token,{factor_type:"totp"}));
  const challenge=ok(await call(`/auth/v1/factors/${enrolled.id}/challenge`,token,{}));
  const verified=ok(await call(`/auth/v1/factors/${enrolled.id}/verify`,token,
    {challenge_id:challenge.id,code:totp(enrolled.totp.secret)}));
  assert.equal(JSON.parse(Buffer.from(verified.access_token.split(".")[1],"base64url")).aal,"aal2");
  return {factorId:enrolled.id, token:verified.access_token};
}

test("genuine Auth TOTP gates all five RPCs and live revocations", {timeout:120_000}, async()=>{
  const operator=await signup(), reporter=await signup(), target=await signup();
  const report=randomUUID(), hangoutReport=randomUUID(), hangout=randomUUID();
  const readCases={
    list_moderation_reports:{}, get_moderation_report:{p_report_id:report},
    transition_moderation_case:{p_report_id:report,p_request_id:randomUUID(),
      p_expected_revision:0,p_action:"start_review"},
    apply_account_moderation_action:{p_report_id:report,p_request_id:randomUUID(),
      p_expected_case_revision:1,p_action:"suspend",p_reason:"Local evidence"},
    apply_hangout_moderation_action:{p_report_id:hangoutReport,p_request_id:randomUUID(),
      p_expected_case_revision:1,p_reason:"Local evidence"},
  };
  try {
    sql(`begin;
      insert into public.platform_roles(user_id,role) values(${q(operator.id)},'moderator');
      insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,
        public_latitude,public_longitude) values(${q(hangout)},
        (select id from public.universities where slug='unc-chapel-hill'),
        ${q(target.id)},'Local MFA fixture',now()+interval '1 hour','Approximate',35,-79);
      insert into public.hangout_participants(hangout_id,account_id,state)
        values(${q(hangout)},${q(target.id)},'joined');
      commit;
      insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
        provenance_kind,provenance_ref_id) values
        (${q(report)},${q(reporter.id)},'user',${q(target.id)},'harassment',
          'current_people',${q(target.id)}),
        (${q(hangoutReport)},${q(reporter.id)},'hangout',${q(hangout)},'harassment',
          'current_hangout',${q(hangout)});
      update private.moderation_feature_gate set enabled=true;
      update private.pilot_availability set enabled=true;
      update private.pilot_capabilities set enabled=true where key='onboarding';`);
    assert.equal(ok(await rpc("get_access_state",reporter.aal1)),"ready",
      "ordinary confirmed UNC account remains AAL1 and needs no operator approval");
    await deniedAll(operator.aal1,readCases);
    let mfa=await verifyTotp(operator.aal1);
    const claims=JSON.parse(Buffer.from(mfa.token.split(".")[1],"base64url"));
    assert.equal(claims.sub,operator.id);
    assert.ok(ok(await rpc("list_moderation_reports",mfa.token)).some((item)=>item.report_id===report));
    assert.equal(ok(await rpc("get_moderation_report",mfa.token,readCases.get_moderation_report))[0].report_id,report);
    assert.equal(ok(await rpc("transition_moderation_case",mfa.token,readCases.transition_moderation_case))[0].revision,1);
    assert.equal(ok(await rpc("apply_account_moderation_action",mfa.token,readCases.apply_account_moderation_action))[0].account_status,"suspended");
    assert.equal(ok(await rpc("transition_moderation_case",mfa.token,
      {p_report_id:hangoutReport,p_request_id:randomUUID(),p_expected_revision:0,
        p_action:"start_review"}))[0].revision,1);
    assert.equal(ok(await rpc("apply_hangout_moderation_action",mfa.token,readCases.apply_hangout_moderation_action))[0].target_disabled,true);
    assert.equal(Number(sql("select count(*) from private.moderation_audit where operator_id="+q(operator.id))),6);

    await sessionDowngradeDuringRequest(claims.session_id,mfa.token);
    await deniedAll(mfa.token,readCases);
    sql(`update auth.sessions set aal='aal2' where id=${q(claims.session_id)}`);

    sql(`delete from public.platform_roles where user_id=${q(operator.id)}`);
    await deniedAll(mfa.token,readCases);
    sql(`insert into public.platform_roles(user_id,role) values(${q(operator.id)},'admin')`);
    sql(`update public.accounts set status='suspended' where id=${q(operator.id)}`);
    await deniedAll(mfa.token,readCases);
    sql(`update public.accounts set status='active' where id=${q(operator.id)}`);
    sql(`update auth.sessions set aal='aal1' where id=${q(claims.session_id)}`);
    await deniedAll(mfa.token,readCases);
    sql(`update auth.sessions set aal='aal2',not_after=now()-interval '1 second' where id=${q(claims.session_id)}`);
    await deniedAll(mfa.token,readCases);
    sql(`update auth.sessions set not_after=null where id=${q(claims.session_id)}`);
    assert.ok(ok(await rpc("list_moderation_reports",mfa.token)).some((item)=>item.report_id===report),
      "admin role retains moderator queue authority");
    assert.equal(ok(await rpc("get_moderation_report",mfa.token,
      readCases.get_moderation_report))[0].report_id,report,
      "admin role retains moderator detail authority");
    sql(`update auth.mfa_factors set status='unverified' where id=${q(mfa.factorId)}`);
    await deniedAll(mfa.token,readCases);
    sql(`update auth.mfa_factors set status='verified',user_id=${q(reporter.id)} where id=${q(mfa.factorId)}`);
    await deniedAll(mfa.token,readCases);
    sql(`update auth.mfa_factors set user_id=${q(operator.id)} where id=${q(mfa.factorId)}`);
    ok(await removeFactor(mfa.token,mfa.factorId));
    await deniedAll(mfa.token,readCases);
    sql(`delete from auth.sessions where id=${q(claims.session_id)}`);
    await deniedAll(mfa.token,readCases);
  } finally {
    sql("update private.moderation_feature_gate set enabled=false; update private.pilot_availability set enabled=false; update private.pilot_capabilities set enabled=false where key='onboarding'");
  }
});
