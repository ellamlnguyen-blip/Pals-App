import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  chmodSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOperation, buildPreflightSql } from "./run.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const runner = join(here, "run.mjs");
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const good = Object.freeze({
  PALS_CONTROL_PROJECT_REF: "ffabdrgsmtfylrehwmfo",
  PALS_CONTROL_SUBJECT_ID: "8ebd74bb-2a72-4689-9580-72268106d91b",
  PALS_CONTROL_OPERATION: "first_manager",
  PALS_CONTROL_REQUEST_ID: "97000000-0000-4000-8000-000000000100",
  PALS_CONTROL_REASON: "Reviewed staging authorization",
  PALS_CONTROL_AUTHORIZATION_REF: "TASK-027-2026-10-05",
  PALS_CONTROL_EXPECTED_REVISION: "0",
  PALS_CONTROL_REVIEWED_COMMIT: commit,
});

test("rejects wrong project, subject, gate and SQL delimiter before transport", () => {
  for (const change of [
    { PALS_CONTROL_PROJECT_REF: "production" },
    { PALS_CONTROL_SUBJECT_ID: "97000000-0000-4000-8000-000000000001" },
    { PALS_CONTROL_REASON: "x$control$y" },
    { PALS_CONTROL_REQUEST_ID: "bad" },
    {
      PALS_CONTROL_OPERATION: "source_gate",
      PALS_CONTROL_GATE: "large_hangout_safeguards",
      PALS_CONTROL_EXPECTED_ENABLED: "false",
      PALS_CONTROL_NEW_ENABLED: "true",
    },
  ])
    assert.throws(() => buildOperation({ ...good, ...change }));
});

test("escapes reviewed text and binds exact target in prepared SQL", () => {
  const { sql } = buildOperation({
    ...good,
    PALS_CONTROL_REASON: "Ella's reviewed request",
  });
  assert.match(sql, /Ella''s reviewed request/);
  assert.match(sql, /8ebd74bb-2a72-4689-9580-72268106d91b/);
  assert.match(sql, /ella_nguyen@unc.edu/);
  assert.doesNotMatch(sql, /{{/);
});

test("admin operations are fixed Ella role transitions with distinct audit actions", () => {
  for (const [operation, previous, next] of [
    ["grant_admin", "moderator", "admin"],
    ["revoke_admin", "admin", "moderator"],
  ]) {
    const prepared = buildOperation({
      ...good,
      PALS_CONTROL_OPERATION: operation,
    });
    assert.equal(prepared.expected.subject_id, good.PALS_CONTROL_SUBJECT_ID);
    assert.equal(prepared.expected.previous_value, previous);
    assert.equal(prepared.expected.new_value, next);
    assert.match(prepared.sql, /8ebd74bb-2a72-4689-9580-72268106d91b/);
    assert.match(prepared.sql, /ella_nguyen@unc.edu/);
    assert.match(
      prepared.sql,
      new RegExp(`op constant text := '${operation}'`),
    );
  }
  assert.throws(() =>
    buildOperation({ ...good, PALS_CONTROL_OPERATION: "grant_role" }),
  );
});

test("preflight pins audit and current staging migrations", () => {
  const sql = buildPreflightSql();
  assert.match(sql, /version='20261005000100'/);
  assert.match(sql, /version='20261005000200'/);
  assert.match(sql, /version='20261005000300'/);
  assert.match(sql, /version='20261005000400'/);
  assert.match(sql, /version='20261005000500'/);
  assert.match(sql, /version='20261005000600'/);
  assert.match(sql, /version='20261005000700'/);
  assert.match(sql, /max\(version\).*'20261005000700'/);
  assert.match(sql, /to_regclass\('private.staging_control_audit'\)/);
});

test("emergency operation has only the fixed one-way availability target", () => {
  const emergency = {
    ...good,
    PALS_CONTROL_OPERATION: "emergency_availability_off",
    PALS_CONTROL_EXPECTED_REVISION: "2",
  };
  const prepared = buildOperation(emergency);
  assert.equal(prepared.expected.subject_id, null);
  assert.equal(prepared.expected.gate_key, null);
  assert.equal(prepared.expected.previous_value, true);
  assert.equal(prepared.expected.new_value, false);
  assert.equal(prepared.expected.previous_revision, "2");
  assert.equal(prepared.expected.new_revision, "3");
  assert.match(
    prepared.sql,
    /pilot_lock_management\(null,null,'availability'\)/,
  );
  assert.doesNotMatch(prepared.sql, /{{/);
  for (const change of [
    { PALS_CONTROL_EXPECTED_REVISION: "0" },
    { PALS_CONTROL_EXPECTED_REVISION: "-1" },
    { PALS_CONTROL_EXPECTED_REVISION: "9223372036854775807" },
    { PALS_CONTROL_GATE: "hangouts" },
    { PALS_CONTROL_NEW_ENABLED: "true" },
    { PALS_CONTROL_EXPECTED_ENABLED: "false" },
    { PALS_CONTROL_PROJECT_REF: "production" },
  ])
    assert.throws(() => buildOperation({ ...emergency, ...change }));
});

function fakeRun(mode, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pals-control-test-"));
  const fake = join(dir, "supabase");
  const log = join(dir, "calls.log");
  writeFileSync(
    fake,
    `#!/usr/bin/env node
const fs=require('fs'); const args=process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG,args.join(' ')+'\\n');
if(args.includes('--version')) console.log('2.119.0');
else if(args[0]==='projects') console.log(JSON.stringify(process.env.FAKE_MODE==='wrong-project'?[{id:'production',name:'Pals Production'}]:[{id:'ffabdrgsmtfylrehwmfo',name:'Pals Staging'}]));
else if(args[0]==='db') { const sql=fs.readFileSync(args[args.indexOf('--file')+1],'utf8');
 if(!args.includes('--linked') || !args.includes('--project-ref') || args[args.indexOf('--project-ref')+1]!=='ffabdrgsmtfylrehwmfo') process.exit(3);
 if(process.env.FAKE_MODE==='missing-migration' && sql.includes('$preflight$')) process.exit(5);
 if(sql.includes('select id, request_id')) console.log(JSON.stringify(process.env.FAKE_MODE==='bad-receipt'?{rows:[],error:'97000000-0000-4000-8000-000000000100 first_manager postgres'}:{rows:[{id:'97000000-0000-4000-8000-000000000101',request_id:'97000000-0000-4000-8000-000000000100',operation:process.env.PALS_CONTROL_OPERATION,subject_id:process.env.PALS_CONTROL_OPERATION==='emergency_availability_off'?null:'8ebd74bb-2a72-4689-9580-72268106d91b',gate_key:null,previous_value:process.env.PALS_CONTROL_OPERATION==='emergency_availability_off'?true:null,new_value:process.env.PALS_CONTROL_OPERATION==='emergency_availability_off'?false:'active',previous_revision:process.env.PALS_CONTROL_OPERATION==='emergency_availability_off'?2:0,new_revision:process.env.PALS_CONTROL_OPERATION==='emergency_availability_off'?3:1,reason:'Reviewed staging authorization',authorization_ref:'TASK-027-2026-10-05',credential_ref:'existing Supabase CLI session',executor_session_user:'postgres'}]}));
 else console.log(JSON.stringify({rows:[]}));
} else process.exit(4);
`,
  );
  chmodSync(fake, 0o700);
  const result = spawnSync(process.execPath, [runner], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...good,
      ...overrides,
      SUPABASE_CLI: fake,
      FAKE_LOG: log,
      FAKE_MODE: mode,
    },
  });
  const calls = readFileSync(log, "utf8");
  rmSync(dir, { recursive: true, force: true });
  return { result, calls };
}

test("CLI session uses fixed ref, checks project and database before operation", () => {
  const { result, calls } = fakeRun("good");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"operation":"first_manager"/);
  assert.match(calls, /projects list --output-format json/);
  assert.equal(
    (calls.match(/db query --linked --project-ref ffabdrgsmtfylrehwmfo/g) || [])
      .length,
    3,
  );
});

test("emergency runner validates fixed project and audit receipt", () => {
  const override = {
    PALS_CONTROL_OPERATION: "emergency_availability_off",
    PALS_CONTROL_EXPECTED_REVISION: "2",
  };
  const goodRun = fakeRun("good", override);
  assert.equal(goodRun.result.status, 0, goodRun.result.stderr);
  assert.match(
    goodRun.result.stdout,
    /"operation":"emergency_availability_off"/,
  );
  const wrongProject = fakeRun("wrong-project", override);
  assert.notEqual(wrongProject.result.status, 0);
  assert.doesNotMatch(wrongProject.calls, /db query/);
  const missing = fakeRun("missing-migration", override);
  assert.notEqual(missing.result.status, 0);
  assert.equal(
    (
      missing.calls.match(
        /db query --linked --project-ref ffabdrgsmtfylrehwmfo/g,
      ) || []
    ).length,
    1,
  );
});

test("wrong project and missing migration fail before control SQL; malformed receipt fails closed", () => {
  const wrong = fakeRun("wrong-project");
  assert.notEqual(wrong.result.status, 0);
  assert.doesNotMatch(wrong.calls, /db query/);
  const missing = fakeRun("missing-migration");
  assert.notEqual(missing.result.status, 0);
  assert.equal(
    (
      missing.calls.match(
        /db query --linked --project-ref ffabdrgsmtfylrehwmfo/g,
      ) || []
    ).length,
    1,
  );
  const malformed = fakeRun("bad-receipt");
  assert.notEqual(malformed.result.status, 0);
  assert.match(malformed.result.stderr, /Audit receipt mismatch/);
});
