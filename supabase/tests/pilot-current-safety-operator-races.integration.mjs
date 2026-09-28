// Static authoring only; import is inert. The unconditional refusal is a release gate.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  quote,
  sql,
  localTarget,
  assertClean,
  resetDisposable,
  session,
  until,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  census,
  censusQuery,
  censusTables,
  caseIds,
  auth,
  campus,
  sanitized,
} from "./helpers/pilot-current-safety-fixtures.mjs";
export const operatorManifest = Object.freeze([
  {
    id: "M.list_moderation_reports.gate_delete_replace.loss-first",
    caller: "list_moderation_reports",
    loss: "gate_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.gate_delete_replace.operation-first",
    caller: "list_moderation_reports",
    loss: "gate_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.role_delete_replace.loss-first",
    caller: "list_moderation_reports",
    loss: "role_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.role_delete_replace.operation-first",
    caller: "list_moderation_reports",
    loss: "role_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.account_suspended.loss-first",
    caller: "list_moderation_reports",
    loss: "account_suspended",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.account_suspended.operation-first",
    caller: "list_moderation_reports",
    loss: "account_suspended",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.account_banned.loss-first",
    caller: "list_moderation_reports",
    loss: "account_banned",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.account_banned.operation-first",
    caller: "list_moderation_reports",
    loss: "account_banned",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.role_nonoperator.loss-first",
    caller: "list_moderation_reports",
    loss: "role_nonoperator",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.list_moderation_reports.role_nonoperator.operation-first",
    caller: "list_moderation_reports",
    loss: "role_nonoperator",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.gate_delete_replace.loss-first",
    caller: "get_moderation_report",
    loss: "gate_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.gate_delete_replace.operation-first",
    caller: "get_moderation_report",
    loss: "gate_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.role_delete_replace.loss-first",
    caller: "get_moderation_report",
    loss: "role_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.role_delete_replace.operation-first",
    caller: "get_moderation_report",
    loss: "role_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.account_suspended.loss-first",
    caller: "get_moderation_report",
    loss: "account_suspended",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.account_suspended.operation-first",
    caller: "get_moderation_report",
    loss: "account_suspended",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.account_banned.loss-first",
    caller: "get_moderation_report",
    loss: "account_banned",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.account_banned.operation-first",
    caller: "get_moderation_report",
    loss: "account_banned",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.role_nonoperator.loss-first",
    caller: "get_moderation_report",
    loss: "role_nonoperator",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.get_moderation_report.role_nonoperator.operation-first",
    caller: "get_moderation_report",
    loss: "role_nonoperator",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.gate_delete_replace.loss-first",
    caller: "transition_moderation_case",
    loss: "gate_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.gate_delete_replace.operation-first",
    caller: "transition_moderation_case",
    loss: "gate_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.role_delete_replace.loss-first",
    caller: "transition_moderation_case",
    loss: "role_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.role_delete_replace.operation-first",
    caller: "transition_moderation_case",
    loss: "role_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.account_suspended.loss-first",
    caller: "transition_moderation_case",
    loss: "account_suspended",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.account_suspended.operation-first",
    caller: "transition_moderation_case",
    loss: "account_suspended",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.account_banned.loss-first",
    caller: "transition_moderation_case",
    loss: "account_banned",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.account_banned.operation-first",
    caller: "transition_moderation_case",
    loss: "account_banned",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.role_nonoperator.loss-first",
    caller: "transition_moderation_case",
    loss: "role_nonoperator",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.transition_moderation_case.role_nonoperator.operation-first",
    caller: "transition_moderation_case",
    loss: "role_nonoperator",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.gate_delete_replace.loss-first",
    caller: "apply_account_moderation_action",
    loss: "gate_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.gate_delete_replace.operation-first",
    caller: "apply_account_moderation_action",
    loss: "gate_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.role_delete_replace.loss-first",
    caller: "apply_account_moderation_action",
    loss: "role_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.role_delete_replace.operation-first",
    caller: "apply_account_moderation_action",
    loss: "role_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.account_suspended.loss-first",
    caller: "apply_account_moderation_action",
    loss: "account_suspended",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.account_suspended.operation-first",
    caller: "apply_account_moderation_action",
    loss: "account_suspended",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.account_banned.loss-first",
    caller: "apply_account_moderation_action",
    loss: "account_banned",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.account_banned.operation-first",
    caller: "apply_account_moderation_action",
    loss: "account_banned",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.role_nonoperator.loss-first",
    caller: "apply_account_moderation_action",
    loss: "role_nonoperator",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_account_moderation_action.role_nonoperator.operation-first",
    caller: "apply_account_moderation_action",
    loss: "role_nonoperator",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.gate_delete_replace.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "gate_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.gate_delete_replace.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "gate_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.role_delete_replace.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "role_delete_replace",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.role_delete_replace.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "role_delete_replace",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.account_suspended.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "account_suspended",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.account_suspended.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "account_suspended",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.account_banned.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "account_banned",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.account_banned.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "account_banned",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.role_nonoperator.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "role_nonoperator",
    order: "loss-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.apply_hangout_moderation_action.role_nonoperator.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "role_nonoperator",
    order: "operation-first",
    partition: "actual-public-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.transition_moderation_case.gate_off.loss-first",
    caller: "transition_moderation_case",
    loss: "gate_off",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.transition_moderation_case.gate_off.operation-first",
    caller: "transition_moderation_case",
    loss: "gate_off",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.transition_moderation_case.account_suspended.loss-first",
    caller: "transition_moderation_case",
    loss: "account_suspended",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.transition_moderation_case.account_suspended.operation-first",
    caller: "transition_moderation_case",
    loss: "account_suspended",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.transition_moderation_case.role_missing.loss-first",
    caller: "transition_moderation_case",
    loss: "role_missing",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.transition_moderation_case.role_missing.operation-first",
    caller: "transition_moderation_case",
    loss: "role_missing",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_account_moderation_action.gate_off.loss-first",
    caller: "apply_account_moderation_action",
    loss: "gate_off",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_account_moderation_action.gate_off.operation-first",
    caller: "apply_account_moderation_action",
    loss: "gate_off",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_account_moderation_action.account_suspended.loss-first",
    caller: "apply_account_moderation_action",
    loss: "account_suspended",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_account_moderation_action.account_suspended.operation-first",
    caller: "apply_account_moderation_action",
    loss: "account_suspended",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_account_moderation_action.role_missing.loss-first",
    caller: "apply_account_moderation_action",
    loss: "role_missing",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_account_moderation_action.role_missing.operation-first",
    caller: "apply_account_moderation_action",
    loss: "role_missing",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_hangout_moderation_action.gate_off.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "gate_off",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_hangout_moderation_action.gate_off.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "gate_off",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_hangout_moderation_action.account_suspended.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "account_suspended",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_hangout_moderation_action.account_suspended.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "account_suspended",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_hangout_moderation_action.role_missing.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "role_missing",
    order: "loss-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_hangout_moderation_action.role_missing.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "role_missing",
    order: "operation-first",
    partition: "actual-exact-retry-wait",
    status: "unexecuted",
  },
  {
    id: "M.new.apply_account_moderation_action.admin_to_moderator.loss-first",
    caller: "apply_account_moderation_action",
    loss: "admin_to_moderator",
    order: "loss-first",
    expected:
      "account ban/reinstate deny; Hangout disable allowed under final26",
    partition: "actual-authority-specific-wait",
    status: "unexecuted",
  },
  {
    id: "M.new.apply_account_moderation_action.admin_to_moderator.operation-first",
    caller: "apply_account_moderation_action",
    loss: "admin_to_moderator",
    order: "operation-first",
    expected:
      "account ban/reinstate deny; Hangout disable allowed under final26",
    partition: "actual-authority-specific-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_account_moderation_action.admin_to_moderator.loss-first",
    caller: "apply_account_moderation_action",
    loss: "admin_to_moderator",
    order: "loss-first",
    expected:
      "account ban/reinstate deny; Hangout disable allowed under final26",
    partition: "actual-authority-specific-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_account_moderation_action.admin_to_moderator.operation-first",
    caller: "apply_account_moderation_action",
    loss: "admin_to_moderator",
    order: "operation-first",
    expected:
      "account ban/reinstate deny; Hangout disable allowed under final26",
    partition: "actual-authority-specific-wait",
    status: "unexecuted",
  },
  {
    id: "M.new.apply_hangout_moderation_action.admin_to_moderator.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "admin_to_moderator",
    order: "loss-first",
    expected:
      "account ban/reinstate deny; Hangout disable allowed under final26",
    partition: "actual-authority-specific-wait",
    status: "unexecuted",
  },
  {
    id: "M.new.apply_hangout_moderation_action.admin_to_moderator.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "admin_to_moderator",
    order: "operation-first",
    expected:
      "account ban/reinstate deny; Hangout disable allowed under final26",
    partition: "actual-authority-specific-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_hangout_moderation_action.admin_to_moderator.loss-first",
    caller: "apply_hangout_moderation_action",
    loss: "admin_to_moderator",
    order: "loss-first",
    expected:
      "account ban/reinstate deny; Hangout disable allowed under final26",
    partition: "actual-authority-specific-wait",
    status: "unexecuted",
  },
  {
    id: "M.retry.apply_hangout_moderation_action.admin_to_moderator.operation-first",
    caller: "apply_hangout_moderation_action",
    loss: "admin_to_moderator",
    order: "operation-first",
    expected:
      "account ban/reinstate deny; Hangout disable allowed under final26",
    partition: "actual-authority-specific-wait",
    status: "unexecuted",
  },
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let positiveSessionSequence = 0;
const bounds =
  "set statement_timeout='12s';set lock_timeout='10s';set idle_in_transaction_session_timeout='15s';";
const reason = "Operator fixture reason";
const protectedField =
  /password|secret|token|authorization|cookie|credential|api_key|apikey|access_key|email|meta_data|narrative|note|reason|title|description|instructions|body|real_name|bio|major|music|food|weird|instagram|prompts|public_place/i;
export function redacted(value, path = "$") {
  if (protectedField.test(path)) return "<redacted>";
  if (Array.isArray(value))
    return value.map((v, i) => redacted(v, `${path}.${i}`));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, redacted(v, `${path}.${k}`)]),
    );
  if (typeof value === "string")
    return value
      .replace(
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
        "<redacted-token>",
      )
      .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1<redacted>@");
  return value === undefined ? "<absent>" : value;
}
export function preciseDifferences(expected, actual, path = "$") {
  if (expected === actual) return [];
  if (
    expected &&
    actual &&
    typeof expected === "object" &&
    typeof actual === "object"
  )
    return [
      ...new Set([...Object.keys(expected), ...Object.keys(actual)]),
    ].flatMap((k) =>
      preciseDifferences(expected[k], actual[k], `${path}.${k}`),
    );
  return [
    {
      field: path,
      expected: redacted(expected, path),
      actual: redacted(actual, path),
    },
  ];
}
const canonical = (value) =>
  value && typeof value === "object"
    ? Array.isArray(value)
      ? value.map(canonical)
      : Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, canonical(value[k])]),
        )
    : value;
const ordered = (rows) =>
  rows
    .map(canonical)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
export function exact54(expected, actual) {
  assert.deepEqual(Object.keys(expected).sort(), censusTables.slice().sort());
  assert.deepEqual(Object.keys(actual).sort(), censusTables.slice().sort());
  const e = Object.fromEntries(
      censusTables.map((t) => [t, ordered(expected[t])]),
    ),
    a = Object.fromEntries(censusTables.map((t) => [t, ordered(actual[t])]));
  const differences = preciseDifferences(e, a);
  if (differences.length) {
    const error = new Error("Full54 exact values differ");
    error.preciseDifferences = differences;
    throw error;
  }
  return true;
}
const one = (rows, predicate) => {
  const found = rows.filter(predicate);
  assert.equal(found.length, 1, "exact one prescribed row");
  return found[0];
};
const stamp = (value, window) => {
  assert.ok(typeof value === "string" && Number.isFinite(Date.parse(value)));
  assert.ok(
    Date.parse(value) >= Date.parse(window.start) &&
      Date.parse(value) <= Date.parse(window.end),
    "independent server time window",
  );
  return value;
};
const generated = (value) => {
  assert.match(value, uuid);
  return value;
};
export function configuration(cell, variant = null) {
  const ids = caseIds(cell.id + (variant ? `:${variant}` : ""));
  const actor = ids.actor,
    reporter = ids.peer,
    target = ids.host,
    source = ids.source,
    report = ids.manager,
    request = ids.request;
  const hangout = cell.caller === "apply_hangout_moderation_action";
  const action =
    variant ??
    (cell.loss === "admin_to_moderator" && !hangout ? "ban" : "suspend");
  const retry = cell.id.startsWith("M.retry.");
  return {
    ...ids,
    actor,
    reporter,
    target,
    source,
    report,
    request,
    hangout,
    action,
    retry,
    caller: cell.caller,
    initialRole: cell.loss === "admin_to_moderator" ? "admin" : "moderator",
  };
}
export function publicQuery(f) {
  const r = quote(f.report),
    q = quote(f.request);
  switch (f.caller) {
    case "list_moderation_reports":
      return "select * from public.list_moderation_reports(null,null,1)";
    case "get_moderation_report":
      return `select * from public.get_moderation_report(${r})`;
    case "transition_moderation_case":
      return `select * from public.transition_moderation_case(${r},${q},0,'start_review',null,null)`;
    case "apply_account_moderation_action":
      return `select * from public.apply_account_moderation_action(${r},${q},1,${quote(f.action)},${quote(reason)})`;
    case "apply_hangout_moderation_action":
      return `select * from public.apply_hangout_moderation_action(${r},${q},1,${quote(reason)})`;
    default:
      throw new Error("Unsupported caller");
  }
}
const resultSQL = (f) =>
  `select 'RESULT:'||coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb)::text from (${publicQuery(f)}) v;`;
const operationSQL = (f) =>
  `${auth(f.actor)}${resultSQL(f)}reset role;select 'SNAPSHOT:'||(${censusQuery})::text;`;
const readMarker = (output, prefix) => {
  const lines = output.split("\n").filter((v) => v.startsWith(prefix));
  assert.equal(lines.length, 1, "exact marker cardinality");
  return JSON.parse(lines[0].slice(prefix.length));
};
export function diagnostics(output) {
  return [...output.matchAll(/ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/g)].map(
    (m) => ({ code: m[1], message: m[2].trim() }),
  );
}
export function setupSQL(f, t) {
  const ids = [f.actor, f.reporter, f.target],
    qt = quote(t),
    target = f.hangout ? f.source : f.target;
  return `begin;
    insert into auth.users(id,email,email_confirmed_at) values ${ids.map((id) => `(${quote(id)},${quote(`operator-${id}@unc.edu`)},null)`).join(",")};
    update public.accounts set created_at=${qt} where id in (${ids.map(quote).join(",")});
    update public.profiles set created_at=${qt} where user_id in (${ids.map(quote).join(",")});
    insert into public.platform_roles(user_id,role,created_at) values(${quote(f.actor)},${quote(f.initialRole)},${qt});
    ${f.action === "reinstate" ? `update public.accounts set status='banned' where id=${quote(f.target)};` : ""}
    update private.moderation_feature_gate set enabled=true;
    ${
      f.hangout
        ? `insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude,created_at,updated_at) values(${quote(f.source)},${quote(f.target)},${quote(campus)},'Undisclosed operator fixture',${qt}::timestamptz+interval '1 day','Approximate',35.91,-79.05,${qt},${qt});
    insert into public.hangout_participants(hangout_id,account_id,state,joined_at,updated_at) values(${quote(f.source)},${quote(f.target)},'joined',${qt},${qt});
    insert into public.hangout_private_locations(hangout_id,instructions,updated_at) values(${quote(f.source)},'Undisclosed operator instructions',${qt});`
        : ""
    }
    insert into private.safety_reports(id,submitted_at,reporter_id,target_type,target_id,category,narrative,provenance_kind,provenance_ref_id) values(${quote(f.report)},${qt},${quote(f.reporter)},${quote(f.hangout ? "hangout" : "user")},${quote(target)},'harassment','Undisclosed operator narrative',${quote(f.hangout ? "current_hangout" : "current_people")},${quote(target)});
    insert into private.safety_report_requests(reporter_id,request_id,input_fingerprint,report_id) values(${quote(f.reporter)},${quote(f.managerRequest)},md5(jsonb_build_array(${quote(f.hangout ? "hangout" : "user")},${quote(target)}::uuid,'harassment','Undisclosed operator narrative')::text),${quote(f.report)});
    ${["apply_account_moderation_action", "apply_hangout_moderation_action"].includes(f.caller) ? `insert into private.moderation_cases(report_id,state,revision) values(${quote(f.report)},'in_review',1);` : ""}
    commit;`;
}
// Historical report rows are privileged synthetic preparation, not intake/real-Auth proof.
// Unconfirmed accounts intentionally create no memberships/roster/photo readiness.
export function setupExpected(clean, f, t, after) {
  const expected = structuredClone(clean),
    ids = [f.actor, f.reporter, f.target];
  expected["auth.users"] = ids.map((id) => ({
    id,
    email: `operator-${id}@unc.edu`,
    email_confirmed_at: null,
    deleted_at: null,
    raw_user_meta_data: null,
    raw_app_meta_data: null,
  }));
  expected["public.accounts"] = ids.map((id) => ({
    id,
    status: id === f.target && f.action === "reinstate" ? "banned" : "active",
    created_at: t,
  }));
  expected["public.profiles"] = ids.map((user_id) => ({
    user_id,
    real_name: null,
    graduation_year: null,
    major: null,
    bio: null,
    primary_photo_path: null,
    is_complete: false,
    created_at: t,
    interests: [],
    down_to_do: [],
    favorite_music: null,
    favorite_foods: null,
    weird_fact: null,
    prompts: [],
    instagram: null,
    additional_photo_paths: [],
    revision: 1,
  }));
  expected["public.platform_roles"] = [
    { user_id: f.actor, role: f.initialRole, created_at: t },
  ];
  expected["private.moderation_feature_gate"] = [
    { singleton: true, enabled: true },
  ];
  const target = f.hangout ? f.source : f.target;
  expected["private.safety_reports"] = [
    {
      id: f.report,
      submitted_at: t,
      reporter_id: f.reporter,
      target_type: f.hangout ? "hangout" : "user",
      target_id: target,
      category: "harassment",
      narrative: "Undisclosed operator narrative",
      provenance_kind: f.hangout ? "current_hangout" : "current_people",
      provenance_ref_id: target,
    },
  ];
  // Derive the PostgreSQL jsonb serialization fingerprint independently in SQL;
  // the input expression is prescribed, not adopted from the observed ledger.
  const fingerprint = sql(
    `select md5(jsonb_build_array(${quote(f.hangout ? "hangout" : "user")},${quote(target)}::uuid,'harassment','Undisclosed operator narrative')::text)`,
  );
  expected["private.safety_report_requests"] = [
    {
      reporter_id: f.reporter,
      request_id: f.managerRequest,
      input_fingerprint: fingerprint,
      report_id: f.report,
    },
  ];
  if (
    [
      "apply_account_moderation_action",
      "apply_hangout_moderation_action",
    ].includes(f.caller)
  )
    expected["private.moderation_cases"] = [
      {
        report_id: f.report,
        state: "in_review",
        revision: 1,
        note: null,
        disposition: null,
        duplicate_report_id: null,
        sanction_id: null,
        hangout_disable_id: null,
      },
    ];
  if (f.hangout) {
    expected["public.hangouts"] = [
      {
        id: f.source,
        university_id: campus,
        host_id: f.target,
        title: "Undisclosed operator fixture",
        description: null,
        starts_at:
          new Date(Date.parse(t) + 86400000).toISOString().slice(0, 10) +
          t.slice(10),
        ends_at: null,
        status: "published",
        joining_state: "open",
        visibility: "campus",
        public_place: "Approximate",
        public_latitude: 35.91,
        public_longitude: -79.05,
        campus_zone: null,
        location_precision: "approximate_area",
        revision: 1,
        created_at: t,
        updated_at: t,
      },
    ];
    expected["public.hangout_participants"] = [
      {
        hangout_id: f.source,
        account_id: f.target,
        state: "joined",
        joined_at: t,
        left_at: null,
        removed_at: null,
        updated_at: t,
      },
    ];
    expected["public.hangout_private_locations"] = [
      {
        hangout_id: f.source,
        instructions: "Undisclosed operator instructions",
        updated_at: t,
      },
    ];
  }
  // Canonical sampled PostgreSQL JSON timestamps retain their exact microseconds.
  for (const table of [
    "public.accounts",
    "public.profiles",
    "public.platform_roles",
    "private.safety_reports",
    "public.hangouts",
    "public.hangout_participants",
    "public.hangout_private_locations",
  ]) {
    for (const row of expected[table])
      for (const key of Object.keys(row))
        if (/_at$/.test(key) && row[key] !== null) {
          const binding = one(after[table], (v) =>
            table === "public.platform_roles" || table === "public.profiles"
              ? v.user_id === row.user_id
              : table === "public.hangout_participants"
                ? v.account_id === row.account_id
                : table === "public.hangout_private_locations"
                  ? v.hangout_id === row.hangout_id
                  : v.id === row.id,
          );
          assert.equal(
            binding[key],
            row[key],
            "prescribed setup timestamp including exact microseconds",
          );
        }
  }
  exact54(expected, after);
  assert.deepEqual(after["private.pilot_account_admission"], []);
  assert.equal(after["private.pilot_availability"][0].enabled, false);
  assert.ok(
    after["private.pilot_capabilities"].every((r) => r.enabled === false),
  );
  assert.deepEqual(after["storage.objects"], []);
  return expected;
}
export function expectedResult(f, before) {
  const r = one(before["private.safety_reports"], (r) => r.id === f.report);
  const base = {
    report_id: f.report,
    submitted_at: r.submitted_at,
    target_type: r.target_type,
    target_id: r.target_id,
    reporter_id: f.reporter,
    category: "harassment",
    case_state: [
      "apply_account_moderation_action",
      "apply_hangout_moderation_action",
    ].includes(f.caller)
      ? "in_review"
      : "open",
  };
  if (f.caller === "list_moderation_reports") return [base];
  if (f.caller === "get_moderation_report")
    return [
      {
        ...base,
        case_revision: 0,
        narrative: r.narrative,
        provenance_kind: r.provenance_kind,
        provenance_ref_id: r.provenance_ref_id,
        case_note: null,
        disposition: null,
        target_status: "active",
        target_campus_id: null,
        target_disabled: null,
      },
    ];
  if (f.caller === "transition_moderation_case")
    return [{ case_state: "in_review", revision: 1 }];
  if (f.caller === "apply_account_moderation_action")
    return [
      {
        case_state: "closed",
        revision: 2,
        account_status:
          f.action === "ban"
            ? "banned"
            : f.action === "reinstate"
              ? "active"
              : "suspended",
      },
    ];
  return [{ case_state: "closed", revision: 2, target_disabled: true }];
}
const auditBlank = () => ({
  id: null,
  occurred_at: null,
  operator_id: null,
  action: null,
  report_id: null,
  subject_target_type: null,
  subject_target_id: null,
  subject_campus_id: null,
  request_id: null,
  previous_state: null,
  new_state: null,
  previous_revision: null,
  new_revision: null,
  reason: null,
  duplicate_report_id: null,
  page_report_ids: null,
  page_count: null,
  sanction_id: null,
  previous_account_status: null,
  new_account_status: null,
  hangout_disable_id: null,
  previous_hangout_disabled: null,
  new_hangout_disabled: null,
});
export function successExpected(
  before,
  after,
  f,
  result,
  window,
  { retry = false } = {},
) {
  assert.deepEqual(
    result,
    expectedResult(f, before),
    "full actual public result",
  );
  if (retry) {
    exact54(before, after);
    return structuredClone(before);
  }
  const expected = structuredClone(before),
    auditRows = after["private.moderation_audit"].filter(
      (r) => !before["private.moderation_audit"].some((v) => v.id === r.id),
    );
  assert.equal(auditRows.length, 1, "one prescribed audit");
  const a = auditRows[0],
    audit = {
      ...auditBlank(),
      id: generated(a.id),
      occurred_at: stamp(a.occurred_at, window),
      operator_id: f.actor,
    };
  if (f.caller === "list_moderation_reports")
    Object.assign(audit, {
      action: "queue_read",
      request_id: generated(a.request_id),
      page_report_ids: [f.report],
      page_count: 1,
    });
  else if (f.caller === "get_moderation_report")
    Object.assign(audit, {
      action: "detail_read",
      report_id: f.report,
      request_id: generated(a.request_id),
    });
  else {
    const transition = f.caller === "transition_moderation_case",
      next = f.hangout ? null : result[0].account_status;
    Object.assign(audit, {
      action: transition
        ? "start_review"
        : f.hangout
          ? "disable_hangout"
          : f.action,
      report_id: f.report,
      subject_target_type: f.hangout ? "hangout" : "user",
      subject_target_id: f.hangout ? f.source : f.target,
      subject_campus_id: f.hangout ? campus : null,
      request_id: f.request,
      previous_state: transition ? "open" : "in_review",
      new_state: result[0].case_state,
      previous_revision: transition ? 0 : 1,
      new_revision: result[0].revision,
      reason: transition ? null : reason,
    });
    const fingerprint = sql(
      `select ${transition ? "" : "'" + (f.hangout ? "hangout:" : "account:") + "'||"}md5(jsonb_build_array(${quote(f.report)}::uuid,${transition ? 0 : 1},${transition ? "'start_review',null,null" : f.hangout ? quote(reason) : `${quote(f.action)},${quote(reason)}`})::text)`,
    );
    expected["private.moderation_requests"] = [
      ...before["private.moderation_requests"],
      {
        operator_id: f.actor,
        request_id: f.request,
        fingerprint,
        report_id: f.report,
        result_state: result[0].case_state,
        result_revision: result[0].revision,
      },
    ];
    const c = {
      report_id: f.report,
      state: result[0].case_state,
      revision: result[0].revision,
      note: transition ? null : reason,
      disposition: transition ? null : "action_taken",
      duplicate_report_id: null,
      sanction_id: null,
      hangout_disable_id: null,
    };
    if (!transition) {
      if (f.hangout) {
        const d = one(
          after["private.hangout_disables"],
          (r) => r.operator_id === f.actor && r.request_id === f.request,
        );
        const id = generated(d.id);
        expected["private.hangout_disables"] = [
          ...before["private.hangout_disables"],
          {
            id,
            report_id: f.report,
            subject_type: "hangout",
            hangout_id: f.source,
            operator_id: f.actor,
            request_id: f.request,
            previous_disabled: false,
            new_disabled: true,
            subject_campus_id: campus,
            reason,
            occurred_at: stamp(d.occurred_at, window),
          },
        ];
        c.hangout_disable_id = id;
        Object.assign(audit, {
          hangout_disable_id: id,
          previous_hangout_disabled: false,
          new_hangout_disabled: true,
        });
      } else {
        const s = one(
            after["private.account_sanctions"],
            (r) => r.operator_id === f.actor && r.request_id === f.request,
          ),
          id = generated(s.id),
          old = f.action === "reinstate" ? "banned" : "active";
        expected["private.account_sanctions"] = [
          ...before["private.account_sanctions"],
          {
            id,
            report_id: f.report,
            subject_type: "user",
            subject_id: f.target,
            operator_id: f.actor,
            request_id: f.request,
            action: f.action,
            previous_status: old,
            new_status: next,
            subject_campus_id: null,
            reason,
            occurred_at: stamp(s.occurred_at, window),
          },
        ];
        c.sanction_id = id;
        Object.assign(audit, {
          sanction_id: id,
          previous_account_status: old,
          new_account_status: next,
        });
        expected["public.accounts"] = before["public.accounts"].map((r) =>
          r.id === f.target ? { ...r, status: next } : r,
        );
      }
    }
    expected["private.moderation_cases"] = [
      ...before["private.moderation_cases"].filter(
        (r) => r.report_id !== f.report,
      ),
      c,
    ];
  }
  expected["private.moderation_audit"] = [
    ...before["private.moderation_audit"],
    audit,
  ];
  exact54(expected, after);
  return expected;
}
export function lossDefinition(cell, f) {
  const actor = quote(f.actor);
  switch (cell.loss) {
    case "gate_delete_replace":
      return {
        sql: "delete from private.moderation_feature_gate where singleton;insert into private.moderation_feature_gate(singleton,enabled) values(true,true);",
        table: "private.moderation_feature_gate",
        replacement: true,
      };
    case "role_delete_replace":
      return {
        sql: `delete from public.platform_roles where user_id=${actor};insert into public.platform_roles(user_id,role,created_at) values(${actor},${quote(f.initialRole)},${quote(f.roleCreated)});`,
        table: "public.platform_roles",
        replacement: true,
      };
    case "gate_off":
      return {
        sql: "update private.moderation_feature_gate set enabled=false where singleton;",
        table: "private.moderation_feature_gate",
      };
    case "account_suspended":
    case "account_banned":
      return {
        sql: `update public.accounts set status=${quote(cell.loss === "account_banned" ? "banned" : "suspended")} where id=${actor};`,
        table: "public.accounts",
        status: cell.loss === "account_banned" ? "banned" : "suspended",
      };
    case "role_missing":
    case "role_nonoperator":
      return {
        sql: `delete from public.platform_roles where user_id=${actor};`,
        table: "public.platform_roles",
        remove: true,
      };
    case "admin_to_moderator":
      return {
        sql: `update public.platform_roles set role='moderator' where user_id=${actor};`,
        table: "public.platform_roles",
        downgrade: true,
      };
    default:
      throw new Error("Unsupported loss");
  }
}
export function lossExpected(before, after, loss, f) {
  const e = structuredClone(before);
  if (loss.status)
    e[loss.table] = before[loss.table].map((r) =>
      r.id === f.actor ? { ...r, status: loss.status } : r,
    );
  else if (loss.remove)
    e[loss.table] = before[loss.table].filter((r) => r.user_id !== f.actor);
  else if (loss.downgrade)
    e[loss.table] = before[loss.table].map((r) =>
      r.user_id === f.actor ? { ...r, role: "moderator" } : r,
    );
  else if (!loss.replacement)
    e[loss.table] = [{ singleton: true, enabled: false }];
  exact54(e, after);
  return e;
}
// Arbitrary AssertionError values are not trusted field-level census differences.
// They may include SQL message strings or private values under arbitrary keys.
// Preserve only a finite type and digest; never serialize their keys or values.
export function assertionProjection(value) {
  const type =
    value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  const safeType = [
    "null",
    "array",
    "object",
    "string",
    "number",
    "boolean",
    "undefined",
    "bigint",
    "symbol",
    "function",
  ].includes(type)
    ? type
    : "unknown";
  let digest = "<unavailable>";
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized === "string")
      digest = createHash("sha256").update(serialized).digest("hex");
  } catch {
    /* Cyclic/nonserializable values remain withheld. */
  }
  return { type: safeType, sha256: digest };
}
export function safeDiagnostic(diagnostic) {
  // SQLSTATE parser output may contain arbitrary five-character private text.
  // Only the existing finite business/abort/timeout classes leave memory.
  const categories = {
    42501: "authority-denial",
    "40P01": "deadlock-abort",
    40001: "serialization-abort",
    57014: "query-cancellation",
    "55P03": "lock-timeout-or-unavailable",
  };
  const code = Object.hasOwn(categories, diagnostic?.code)
    ? diagnostic.code
    : "<withheld>";
  return {
    code,
    classification:
      code === "<withheld>" ? "unclassified-withheld" : categories[code],
    message:
      code === "42501" && diagnostic?.message === "Moderation unavailable"
        ? "Moderation unavailable"
        : "<withheld diagnostic>",
  };
}
export function assertionEvidence(error) {
  return Object.hasOwn(error, "expected") || Object.hasOwn(error, "actual")
    ? [
        {
          field: "$.assertion",
          expected: assertionProjection(error.expected),
          actual: assertionProjection(error.actual),
        },
      ]
    : [];
}
// Explicit pure offline examples. Importing the module does not execute them,
// register target tests, invoke preserveFailure/census, or contact any transport.
export function verifyFailureProjectionOffline() {
  const privateMessage =
    "silver private narrative person@unc.edu eyJabcdefgh.abcdefgh.abcdefgh";
  const unexpected = diagnostics(`ERROR:  ABCDE: ${privateMessage}\n`);
  const examples = [
    { expected: [], actual: unexpected },
    { expected: [], actual: [{ code: "40P01", message: privateMessage }] },
    { expected: "expected-neutral", actual: "silver" },
    { expected: {}, actual: { silver: "ABCDE" } },
    { expected: { silver: privateMessage }, actual: { silver: "silver" } },
    {
      expected: undefined,
      actual: {
        anotherArbitraryKey: [{ code: "ABCDE", message: privateMessage }],
      },
    },
  ];
  for (const example of examples) {
    const evidence = {
      differences: assertionEvidence(example),
      diagnostics: [
        ...unexpected,
        { code: "42501", message: "Moderation unavailable" },
        { code: "40P01", message: privateMessage },
      ].map(safeDiagnostic),
    };
    const output = JSON.stringify(evidence);
    for (const secret of [
      "silver",
      "ABCDE",
      "person@unc.edu",
      "eyJabcdefgh",
      "anotherArbitraryKey",
    ])
      assert.ok(
        !output.includes(secret),
        "private assertion/diagnostic text must stay withheld",
      );
    assert.equal(evidence.diagnostics[1].code, "42501");
    assert.equal(evidence.diagnostics[1].message, "Moderation unavailable");
    assert.equal(evidence.diagnostics[2].code, "40P01");
    assert.equal(evidence.diagnostics[2].classification, "deadlock-abort");
    for (const side of ["expected", "actual"])
      assert.deepEqual(Object.keys(evidence.differences[0][side]).sort(), [
        "sha256",
        "type",
      ]);
  }
  const cyclic = {};
  cyclic.self = cyclic;
  assert.deepEqual(assertionProjection(cyclic), {
    type: "object",
    sha256: "<unavailable>",
  });
  assert.equal(
    safeDiagnostic({
      code: "42501",
      message: "Moderation unavailable " + privateMessage,
    }).message,
    "<withheld diagnostic>",
  );
  return {
    examples: examples.length,
    cyclic_projection_finite: true,
    known_diagnostic_classes_preserved: true,
  };
}
export function preserveFailure(error, context) {
  if (error.failureRecorded) return;
  let snapshot = null,
    censusFailure = null;
  if (error.resetInterrupted)
    censusFailure =
      "Guarded reset failed; subsequent census forbidden pending fresh recovery review";
  else
    try {
      snapshot = census();
    } catch {
      censusFailure = "Full54 census unavailable";
    }
  const safeDiagnostics = (context.diagnostics ?? []).map(safeDiagnostic);
  console.error(
    JSON.stringify({
      id: context.id,
      phase: context.phase,
      partition: context.abortRollbackVerified
        ? "abort-rollback-no-credit"
        : "failed-no-credit",
      exact_abort_rollback_verified: context.abortRollbackVerified ?? false,
      successful_wait_order_credit: false,
      lock_observation: context.observation ?? null,
      diagnostics: safeDiagnostics,
      cleanup_exit_proof_pending: true,
      result_fields: context.result
        ? Object.keys(context.result[0] ?? {}).sort()
        : null,
      differences: error.preciseDifferences ?? assertionEvidence(error),
      committed_census: snapshot ? redacted(snapshot) : null,
      committed_summary: snapshot ? sanitized(snapshot) : null,
      holder_snapshot: context.held ? redacted(context.held) : null,
      census_failure: censusFailure,
      error: "Operator fixture failed; raw message/transcripts withheld",
      cleanup_diagnostics: error.cleanupDiagnostics ?? [],
    }),
  );
  error.failureRecorded = true;
  error.failedCellID = context.id;
}
export async function closeOwned(sessions, originalError = null) {
  const closed = await Promise.allSettled(
    sessions.filter(Boolean).map((s) => s.close()),
  );
  const failed = closed.filter((r) => r.status === "rejected");
  if (failed.length) {
    const error = originalError ?? new Error("Owned exit unproven");
    error.cleanupIncomplete = true;
    error.cleanupDiagnostics = failed.map(
      () => "Owned SQL close/exit incomplete",
    );
    console.error(
      JSON.stringify({
        id: error.failedCellID ?? "<session>",
        partition: "cleanup-failed",
        reset_forbidden: true,
        original_error_preserved: !!originalError,
        cleanup_diagnostics: error.cleanupDiagnostics,
      }),
    );
    throw error;
  }
}
async function positive(f, { rollback = false, retry = false } = {}) {
  const before = census(),
    start = JSON.parse(sql("select to_jsonb(clock_timestamp())::text"));
  let owned, originalError;
  const context = {
    id: f.cellID ?? f.caller,
    phase: "eligible-public-precheck",
  };
  try {
    const positiveName =
      "mo_" + f.request.replaceAll("-", "") + "_p" + ++positiveSessionSequence;
    assert.ok(Buffer.byteLength(positiveName) < 63);
    owned = session(positiveName);
    owned.send(`${bounds}begin;${operationSQL(f)}select 'HELD';`);
    await until(() => owned.output().includes("HELD"));
    assert.deepEqual(diagnostics(owned.output()), []);
    const result = readMarker(owned.output(), "RESULT:"),
      after = readMarker(owned.output(), "SNAPSHOT:");
    context.result = result;
    context.held = after;
    const expected = successExpected(
      before,
      after,
      f,
      result,
      { start, end: sql("select clock_timestamp()::text") },
      { retry },
    );
    owned.send(rollback ? "rollback;" : "commit;");
    owned.child.stdin.end();
    const [code, signal] = await owned.done;
    assert.equal(code, 0);
    assert.equal(signal, null);
    exact54(rollback ? before : expected, census());
    return { result, expected };
  } catch (error) {
    originalError = error;
    preserveFailure(error, context);
    throw error;
  } finally {
    await closeOwned([owned], originalError);
  }
}
async function denied(f, before, context) {
  let originalError;
  try {
    sql(`begin;${auth(f.actor)}${publicQuery(f)};commit;`);
    assert.fail("Denied caller unexpectedly returned");
  } catch (error) {
    originalError = error;
    assert.equal(
      error.message,
      "Disposable SQL error: 42501: Moderation unavailable",
    );
    exact54(before, census());
    context.denialVerified = true;
  }
  assert.ok(originalError);
}
export async function observeOperatorRace(cell, f, before, context) {
  const loss = lossDefinition(cell, f),
    operationFirst = cell.order === "operation-first",
    allowDowngrade = loss.downgrade && f.hangout;
  let holder, waiter, originalError;
  const start = JSON.parse(sql("select to_jsonb(clock_timestamp())::text"));
  const name =
    "mo_" +
    createHash("sha256")
      .update(cell.id + ":" + f.action)
      .digest("hex")
      .slice(0, 32);
  assert.ok(
    Buffer.byteLength(name + "_h") < 63 && Buffer.byteLength(name + "_w") < 63,
  );
  try {
    holder = session(name + "_h");
    waiter = session(name + "_w");
    const change = `${loss.sql}select 'SNAPSHOT:'||(${censusQuery})::text;`;
    context.phase = "holder";
    holder.send(
      `${bounds}begin;${operationFirst ? operationSQL(f) : change}select 'HELD';`,
    );
    await until(() => holder.output().includes("HELD"));
    assert.deepEqual(diagnostics(holder.output()), []);
    context.phase = "waiter";
    waiter.send(
      `${bounds}begin;${operationFirst ? change : operationSQL(f)}select 'COMPLETED';commit;`,
    );
    const observe = `select jsonb_build_object('holder_pid',h.pid,'waiter_pid',w.pid,'blocking_pids',pg_blocking_pids(w.pid),'ungranted_locks',(select jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,'relation',l.relation::regclass::text,'transactionid',l.transactionid)) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity h join pg_stat_activity w on w.application_name=${quote(name + "_w")} where h.application_name=${quote(name + "_h")} and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted and l.locktype in('tuple','transactionid'))`;
    context.phase = "required-tuple-wait";
    await until(() => {
      const raw = sql(observe);
      if (!raw) return false;
      context.observation = JSON.parse(raw);
      return true;
    });
    assert.notEqual(
      context.observation.holder_pid,
      context.observation.waiter_pid,
    );
    assert.ok(
      context.observation.blocking_pids.includes(
        context.observation.holder_pid,
      ),
    );
    assert.ok(
      context.observation.ungranted_locks.some((l) =>
        ["tuple", "transactionid"].includes(l.locktype),
      ),
    );
    context.held = readMarker(holder.output(), "SNAPSHOT:");
    context.phase = "release";
    holder.send("commit;");
    holder.child.stdin.end();
    waiter.child.stdin.end();
    const [h, w] = await Promise.all([holder.done, waiter.done]);
    context.diagnostics = [
      ...diagnostics(holder.output()),
      ...diagnostics(waiter.output()),
    ];
    const window = { start, end: sql("select clock_timestamp()::text") };
    if (
      context.diagnostics.some((d) =>
        ["40P01", "40001", "57014", "55P03"].includes(d.code),
      )
    ) {
      context.phase = "abort-rollback-partition";
      const committed = census();
      if (h[0] === 0 && w[0] !== 0) {
        if (operationFirst)
          successExpected(
            before,
            context.held,
            f,
            readMarker(holder.output(), "RESULT:"),
            window,
            { retry: f.retry },
          );
        else lossExpected(before, context.held, loss, f);
        exact54(context.held, committed);
      } else if (h[0] !== 0 && w[0] === 0) {
        if (operationFirst) lossExpected(before, committed, loss, f);
        else
          successExpected(
            before,
            committed,
            f,
            readMarker(waiter.output(), "RESULT:"),
            window,
            { retry: f.retry },
          );
      } else exact54(before, committed);
      context.abortRollbackVerified = true;
      throw new Error(
        "Transaction abort/timeout; exact rollback verified; no successful wait-order credit",
      );
    }
    assert.deepEqual(h, [0, null]);
    assert.deepEqual(diagnostics(holder.output()), []);
    if (operationFirst) {
      assert.deepEqual(w, [0, null]);
      assert.deepEqual(diagnostics(waiter.output()), []);
      context.result = readMarker(holder.output(), "RESULT:");
      successExpected(before, context.held, f, context.result, window, {
        retry: f.retry,
      });
      lossExpected(context.held, census(), loss, f);
    } else {
      lossExpected(before, context.held, loss, f);
      if (allowDowngrade) {
        assert.deepEqual(w, [0, null]);
        assert.deepEqual(diagnostics(waiter.output()), []);
        context.result = readMarker(waiter.output(), "RESULT:");
        successExpected(context.held, census(), f, context.result, window, {
          retry: f.retry,
        });
      } else {
        assert.ok(Number.isInteger(w[0]) && w[0] !== 0);
        assert.equal(w[1], null);
        assert.deepEqual(diagnostics(waiter.output()), [
          { code: "42501", message: "Moderation unavailable" },
        ]);
        assert.doesNotMatch(
          waiter.output(),
          /RESULT:|SNAPSHOT:|COMPLETED|40P01|40001|57014|55P03/,
        );
        exact54(context.held, census());
      }
    }
    // A fresh replacement is separately invoked under rollback, never rescues the old lookup.
    context.phase = "later-public-control";
    if (loss.replacement || allowDowngrade)
      await positive(f, {
        rollback: true,
        retry:
          f.retry ||
          (operationFirst &&
            !["list_moderation_reports", "get_moderation_report"].includes(
              f.caller,
            )),
      });
    else {
      await denied(f, census(), context);
      context.phase = "independent-authority-restoration";
      const prior = census(),
        restored = structuredClone(prior);
      let restore;
      if (loss.status) {
        restore = `update public.accounts set status='active' where id=${quote(f.actor)};`;
        restored["public.accounts"] = prior["public.accounts"].map((r) =>
          r.id === f.actor ? { ...r, status: "active" } : r,
        );
      } else if (loss.remove) {
        restore = `insert into public.platform_roles(user_id,role,created_at) values(${quote(f.actor)},${quote(f.initialRole)},${quote(f.roleCreated)});`;
        restored["public.platform_roles"] = [
          ...prior["public.platform_roles"],
          { user_id: f.actor, role: f.initialRole, created_at: f.roleCreated },
        ];
      } else if (loss.downgrade) {
        restore = `update public.platform_roles set role='admin' where user_id=${quote(f.actor)};`;
        restored["public.platform_roles"] = prior["public.platform_roles"].map(
          (r) => (r.user_id === f.actor ? { ...r, role: "admin" } : r),
        );
      } else {
        restore =
          "update private.moderation_feature_gate set enabled=true where singleton;";
        restored["private.moderation_feature_gate"] = [
          { singleton: true, enabled: true },
        ];
      }
      sql(`begin;${restore}commit;`);
      exact54(restored, census());
      await positive(f, {
        rollback: true,
        retry:
          f.retry ||
          (operationFirst &&
            !["list_moderation_reports", "get_moderation_report"].includes(
              f.caller,
            )),
      });
    }
    return {
      id: cell.id,
      variant: f.action,
      ...context.observation,
      wait_location: loss.table,
      writer: "privileged exact synthetic tuple maintenance",
      full54_values_verified: true,
      original_receipt_retained: f.retry,
      lookup_replacement_rescue: false,
      successful_wait_order_credit: true,
      allocation_credit: f.action === "reinstate" ? 0 : 1,
      result: context.result
        ? {
            fields: Object.keys(context.result[0]).sort(),
            sha256: createHash("sha256")
              .update(JSON.stringify(context.result))
              .digest("hex"),
          }
        : { code: "42501", message: "Moderation unavailable" },
    };
  } catch (error) {
    originalError = error;
    for (const owned of [holder, waiter].filter(Boolean)) {
      const output = owned.output();
      if (
        !context.held &&
        output.split("\n").some((v) => v.startsWith("SNAPSHOT:"))
      ) {
        try {
          context.held = readMarker(output, "SNAPSHOT:");
        } catch {
          /* unavailable */
        }
      }
      if (
        !context.result &&
        output.split("\n").some((v) => v.startsWith("RESULT:"))
      ) {
        try {
          context.result = readMarker(output, "RESULT:");
        } catch {
          /* unavailable */
        }
      }
    }
    context.diagnostics = [
      ...diagnostics(holder?.output() ?? ""),
      ...diagnostics(waiter?.output() ?? ""),
    ];
    preserveFailure(error, context);
    throw error;
  } finally {
    await closeOwned([holder, waiter], originalError);
  }
}
export function requireOperatorRelease() {
  throw new Error(
    "Operator fixture runtime refused before target contact: exact runner/SQL adoption, combined fixture and ownership review, and explicit serial release remain required",
  );
}
export async function runOperatorFixtures(parentTest = null) {
  requireOperatorRelease();
  const matrix = JSON.parse(
    readFileSync(
      new URL(
        "../../agents/handoffs/TASK-021A1b3c-MATRIX.json",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(
    operatorManifest,
    matrix.operator_cells.filter((c) => c.partition !== "actual-public-serial"),
  );
  assert.equal(operatorManifest.length, 76);
  localTarget("current27");
  assertClean();
  let originalError,
    context,
    cleanupSafe = true;
  const results = [];
  try {
    for (const cell of operatorManifest) {
      // Both admin-only account actions require independently prepared cases.
      const variants =
        cell.loss === "admin_to_moderator" &&
        cell.caller === "apply_account_moderation_action"
          ? ["ban", "reinstate"]
          : [null];
      const executeCell = async () => {
        for (const variant of variants) {
          context = { id: cell.id, phase: "independent-setup" };
          const clean = census(),
            f = configuration(cell, variant),
            t = JSON.parse(sql("select to_jsonb(clock_timestamp())::text"));
          f.cellID = cell.id;
          sql(setupSQL(f, t));
          const baseline = setupExpected(clean, f, t, census());
          f.roleCreated = baseline["public.platform_roles"][0].created_at;
          await positive(f, { rollback: true });
          if (f.retry) {
            context.phase = "save-original-receipt";
            await positive(f);
            await positive(f, { rollback: true, retry: true });
            context.phase = "saved-receipt-payload-conflict";
            const beforeConflict = census();
            const conflictQuery = publicQuery(f)
              .replace("'start_review',null,null", "'annotate','Conflict',null")
              .replace(quote(reason), quote("Conflict reason"));
            let conflictError;
            try {
              sql(`begin;${auth(f.actor)}${conflictQuery};commit;`);
            } catch (error) {
              conflictError = error;
            }
            assert.equal(
              conflictError?.message,
              "Disposable SQL error: 42501: Moderation unavailable",
            );
            exact54(beforeConflict, census());
          }
          results.push(await observeOperatorRace(cell, f, census(), context));
          context.phase = "guarded-case-cleanup";
          try {
            resetDisposable("current27");
            assertClean();
          } catch (error) {
            error.cleanupIncomplete = true;
            error.resetInterrupted = true;
            throw error;
          }
        }
      };
      if (parentTest) {
        let cellError;
        await parentTest.test(cell.id, async () => {
          try {
            await executeCell();
          } catch (error) {
            cellError = error;
            throw new Error(
              "Operator cell failed; private diagnostic detail withheld",
            );
          }
        });
        if (cellError) throw cellError;
      } else await executeCell();
    }
    assert.equal(new Set(results.map((r) => r.id)).size, 76);
    assert.equal(
      results.reduce((n, r) => n + r.allocation_credit, 0),
      76,
    );
    return results;
  } catch (error) {
    originalError = error;
    // A failed synchronous Docker-exec may leave server/descendant work alive.
    // A client timeout/signal is never converted into permission to reset.
    if (
      /cleanup unverified|cleanup incomplete|unobserved|interrupted|transport failed/i.test(
        error.message,
      )
    )
      error.cleanupIncomplete = true;
    cleanupSafe = !error.cleanupIncomplete;
    preserveFailure(error, context ?? { id: "<suite>", phase: "unknown" });
    throw error;
  } finally {
    if (cleanupSafe) {
      try {
        resetDisposable("current27");
        assertClean();
      } catch {
        if (originalError) {
          originalError.cleanupDiagnostics = [
            ...(originalError.cleanupDiagnostics ?? []),
            "Guarded reset/census failed",
          ];
          console.error(
            JSON.stringify({
              id: originalError.failedCellID,
              partition: "cleanup-failed",
              original_error_preserved: true,
            }),
          );
          throw originalError;
        }
        throw new Error("Guarded reset/census failed");
      }
    }
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  test("76 allocated operator wait IDs; runtime release required", async (t) => {
    try {
      const results = await runOperatorFixtures(t);
      assert.equal(new Set(results.map((r) => r.id)).size, 76);
    } catch {
      throw new Error(
        "Operator fixture refused or failed; no runtime credit; diagnostic detail is limited to redacted evidence",
      );
    }
  });
