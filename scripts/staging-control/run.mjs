#!/usr/bin/env node
// Reviewed administrative SQL for Pals Staging only. No application credential is used.
import { readFileSync } from 'node:fs';
import { writeFileSync, unlinkSync, mkdtempSync, rmdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const REF = 'ffabdrgsmtfylrehwmfo';
const SUBJECT = '8ebd74bb-2a72-4689-9580-72268106d91b';
const EMAIL = 'ella_nguyen@unc.edu';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GATES = Object.freeze({
  hangouts: 'private.hangout_feature_gate',
  hangout_chat: 'private.hangout_chat_feature_gate',
  people: 'private.people_feature_gate',
  friendship: 'private.friendship_feature_gate',
  dm: 'private.dm_feature_gate',
  notifications: 'private.notification_feature_gate',
  attendance: 'private.attendance_feature_gate',
  safety: 'private.safety_feature_gate',
  moderation: 'private.moderation_feature_gate',
});
const operations = new Set(['first_manager','revoke_manager','grant_moderator','revoke_moderator','source_gate']);
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const required = (env, name, max = 200) => {
  const value = env[name];
  if (!value || value.trim() !== value || value.length > max || value.includes('$control$') || value.includes('\0')) throw new Error(`Missing or invalid ${name}`);
  return value;
};
const uuid = (env, name) => { const value = required(env, name, 36); if (!UUID.test(value)) throw new Error(`Invalid ${name}`); return value.toLowerCase(); };
const bool = (env, name) => { const value = required(env, name, 5); if (!['true','false'].includes(value)) throw new Error(`Invalid ${name}`); return value; };
const cli = process.env.SUPABASE_CLI || 'supabase';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cliEnv = { ...process.env, DO_NOT_TRACK: '1', SUPABASE_TELEMETRY_DISABLED: '1' };
delete cliEnv.SUPABASE_ACCESS_TOKEN;
delete cliEnv.SUPABASE_PROFILE;
const call = (args) => execFileSync(cli, args, {
  encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  env: cliEnv,
  stdio: ['ignore','pipe','pipe'],
});
const query = (sql) => {
  const dir = mkdtempSync(join(tmpdir(), 'pals-control-'));
  const path = join(dir, 'query.sql');
  try {
    writeFileSync(path, sql, { mode: 0o600 });
    return call(['db','query','--project-ref',REF,'--file',path,'--output-format','json']);
  } finally {
    try { unlinkSync(path); } catch {}
    try { rmdirSync(dir); } catch {}
  }
};

export function buildOperation(env = process.env) {
  const operation = env.PALS_CONTROL_OPERATION;
  if (!operations.has(operation)) throw new Error('Unsupported operation');
  if (env.PALS_CONTROL_PROJECT_REF !== REF) throw new Error('Exact staging project ref required');
  if (env.PALS_CONTROL_SUBJECT_ID !== SUBJECT) throw new Error('Exact Ella subject UUID required');
  const request = uuid(env, 'PALS_CONTROL_REQUEST_ID');
  const reason = required(env, 'PALS_CONTROL_REASON', 2000);
  const authorization = required(env, 'PALS_CONTROL_AUTHORIZATION_REF');
  const credential = 'existing Supabase CLI session';
  const replacements = {
    REQUEST_ID: literal(request), SUBJECT_ID: literal(SUBJECT), EXPECTED_EMAIL: literal(EMAIL),
    REASON: literal(reason), AUTHORIZATION_REF: literal(authorization), CREDENTIAL_REF: literal(credential),
    OPERATION: literal(operation),
  };
  const expected = { operation, request, subject_id: operation === 'source_gate' ? null : SUBJECT,
    gate_key: null, reason, authorization_ref: authorization, credential_ref: credential };
  let file;
  if (operation === 'first_manager' || operation === 'revoke_manager') {
    file = 'manager.sql';
    const revision = env.PALS_CONTROL_EXPECTED_REVISION;
    if (!/^(0|[1-9][0-9]*)$/.test(revision ?? '')) throw new Error('Expected manager revision required');
    if (operation === 'first_manager' && revision !== '0') throw new Error('First manager requires revision zero');
    replacements.EXPECTED_REVISION = revision;
    replacements.NEW_STATE = literal(operation === 'first_manager' ? 'active' : 'revoked');
    expected.previous_value = operation === 'first_manager' ? null : 'active';
    expected.new_value = operation === 'first_manager' ? 'active' : 'revoked';
    expected.previous_revision = revision;
    expected.new_revision = String(BigInt(revision) + 1n);
  } else if (operation === 'source_gate') {
    file = 'gate.sql';
    const gate = required(env, 'PALS_CONTROL_GATE', 40);
    if (!Object.hasOwn(GATES, gate)) throw new Error('Gate is outside reviewed allowlist');
    replacements.GATE_KEY = literal(gate);
    replacements.GATE_TABLE = GATES[gate];
    replacements.EXPECTED_ENABLED = bool(env, 'PALS_CONTROL_EXPECTED_ENABLED');
    replacements.NEW_ENABLED = bool(env, 'PALS_CONTROL_NEW_ENABLED');
    expected.gate_key = gate;
    expected.previous_value = replacements.EXPECTED_ENABLED === 'true';
    expected.new_value = replacements.NEW_ENABLED === 'true';
  } else {
    file = 'moderator.sql';
    replacements.NEW_ROLE = operation === 'grant_moderator' ? literal('moderator') : 'null';
    replacements.EXPECTED_ROLE = operation === 'grant_moderator' ? 'null' : literal('moderator');
    expected.previous_value = operation === 'grant_moderator' ? null : 'moderator';
    expected.new_value = operation === 'grant_moderator' ? 'moderator' : null;
  }
  const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), file), 'utf8');
  const sql = template.replace(/{{([A-Z_]+)}}/g, (_, key) => {
    if (!Object.hasOwn(replacements, key)) throw new Error(`Missing SQL value ${key}`);
    return replacements[key];
  });
  if (sql.includes('{{')) throw new Error('Unresolved SQL placeholder');
  return { operation, request, sql, expected };
}

export async function main() {
  const { operation, request, sql, expected } = buildOperation();
  const reviewedCommit = required(process.env, 'PALS_CONTROL_REVIEWED_COMMIT', 40);
  if (!/^[0-9a-f]{40}$/.test(reviewedCommit) || call(['--version']).length === 0) throw new Error('Reviewed commit or CLI unavailable');
  const actualCommit = execFileSync('git',['-C',repoRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if (actualCommit !== reviewedCommit) throw new Error('Checkout differs from reviewed commit');
  if (execFileSync('git',['-C',repoRoot,'status','--porcelain','--untracked-files=all'],{encoding:'utf8'}).trim())
    throw new Error('Checkout has unreviewed tracked or untracked changes');
  const listed = JSON.parse(call(['projects','list','--output-format','json']));
  const projects = Array.isArray(listed) ? listed : listed.projects;
  if (!Array.isArray(projects) || !projects.some((p) => p.id === REF && p.name === 'Pals Staging')) throw new Error('CLI project identity mismatch');
  // The CLI's --project-ref queries use the existing logged-in credential manager.
  // All checks are SQL errors, so a malformed/empty JSON result cannot approve a write.
  query(`do $preflight$ begin
    if current_database()<>'postgres' or session_user<>'postgres'
      or current_setting('role',true) not in ('none','postgres')
      or not exists(select 1 from supabase_migrations.schema_migrations where version='20261005000100')
      or not exists(select 1 from supabase_migrations.schema_migrations where version='20261004000100')
      or (select max(version) from supabase_migrations.schema_migrations)<>'20261005000100'
      or to_regclass('private.staging_control_audit') is null then
      raise exception 'Wrong staging database or migration state' using errcode='42501';
    end if;
  end $preflight$;`);
  // A failed/uncertain write is never automatically retried. Reconcile by request UUID.
  try { query(sql); }
  catch { throw new Error(`Operation result uncertain. Read-only reconcile request ${request}; do not generate a new request ID or retry blindly.`); }
  const response = JSON.parse(query(`select id, request_id, operation, subject_id, gate_key, previous_value, new_value, previous_revision, new_revision, reason, authorization_ref, credential_ref, executor_session_user, executor_backend_pid, occurred_at from private.staging_control_audit where request_id=${literal(request)}::uuid`));
  const rows = Array.isArray(response) ? response : response.rows;
  const receipt = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  if (!receipt || receipt.executor_session_user !== 'postgres' || !UUID.test(receipt.id) ||
    Object.entries(expected).some(([key,value]) => key.endsWith('revision')
      ? String(receipt[key]) !== String(value)
      : JSON.stringify(receipt[key]) !== JSON.stringify(value)))
    throw new Error('Audit receipt mismatch; stop and reconcile');
  process.stdout.write(JSON.stringify(receipt) + '\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
