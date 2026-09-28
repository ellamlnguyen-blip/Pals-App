// Authoring only. Importing this module never contacts a target or registers tests.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  quote,
  sql,
  localTarget,
  resetDisposable,
  assertClean,
  session,
  until,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  routes,
  prepare,
  caseIds,
  auth,
  query,
  denialFor,
  assertCurrentOnly,
  census,
  censusQuery,
  assertOutcome as rawAssertOutcome,
  censusTables,
  campus,
  email,
  photoPath,
  selectedLaterLane,
  sanitized,
} from "./helpers/pilot-current-safety-fixtures.mjs";
export const policyManifest = Object.freeze([
  {
    id: "L2.CH.availability_off.loss-first",
    route: "CH",
    loss: "availability_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.availability_off.operation-first",
    route: "CH",
    loss: "availability_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.availability_missing.loss-first",
    route: "CH",
    loss: "availability_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.availability_missing.operation-first",
    route: "CH",
    loss: "availability_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.purpose_off.loss-first",
    route: "CH",
    loss: "purpose_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.purpose_off.operation-first",
    route: "CH",
    loss: "purpose_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.purpose_missing.loss-first",
    route: "CH",
    loss: "purpose_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.purpose_missing.operation-first",
    route: "CH",
    loss: "purpose_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.source_gate_off.loss-first",
    route: "CH",
    loss: "source_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.source_gate_off.operation-first",
    route: "CH",
    loss: "source_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.source_gate_missing.loss-first",
    route: "CH",
    loss: "source_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.source_gate_missing.operation-first",
    route: "CH",
    loss: "source_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.safety_gate_off.loss-first",
    route: "CH",
    loss: "safety_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.safety_gate_off.operation-first",
    route: "CH",
    loss: "safety_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.safety_gate_missing.loss-first",
    route: "CH",
    loss: "safety_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.safety_gate_missing.operation-first",
    route: "CH",
    loss: "safety_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.actor.roster_revoke.loss-first",
    route: "CH",
    subject: "actor",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.actor.roster_revoke.operation-first",
    route: "CH",
    subject: "actor",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.actor.roster_delete.loss-first",
    route: "CH",
    subject: "actor",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.actor.roster_delete.operation-first",
    route: "CH",
    subject: "actor",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.immutable_host.roster_revoke.loss-first",
    route: "CH",
    subject: "immutable_host",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.immutable_host.roster_revoke.operation-first",
    route: "CH",
    subject: "immutable_host",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.immutable_host.roster_delete.loss-first",
    route: "CH",
    subject: "immutable_host",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CH.immutable_host.roster_delete.operation-first",
    route: "CH",
    subject: "immutable_host",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.availability_off.loss-first",
    route: "CP",
    loss: "availability_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.availability_off.operation-first",
    route: "CP",
    loss: "availability_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.availability_missing.loss-first",
    route: "CP",
    loss: "availability_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.availability_missing.operation-first",
    route: "CP",
    loss: "availability_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.purpose_off.loss-first",
    route: "CP",
    loss: "purpose_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.purpose_off.operation-first",
    route: "CP",
    loss: "purpose_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.purpose_missing.loss-first",
    route: "CP",
    loss: "purpose_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.purpose_missing.operation-first",
    route: "CP",
    loss: "purpose_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.source_gate_off.loss-first",
    route: "CP",
    loss: "source_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.source_gate_off.operation-first",
    route: "CP",
    loss: "source_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.source_gate_missing.loss-first",
    route: "CP",
    loss: "source_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.source_gate_missing.operation-first",
    route: "CP",
    loss: "source_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.safety_gate_off.loss-first",
    route: "CP",
    loss: "safety_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.safety_gate_off.operation-first",
    route: "CP",
    loss: "safety_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.safety_gate_missing.loss-first",
    route: "CP",
    loss: "safety_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.safety_gate_missing.operation-first",
    route: "CP",
    loss: "safety_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.actor.roster_revoke.loss-first",
    route: "CP",
    subject: "actor",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.actor.roster_revoke.operation-first",
    route: "CP",
    subject: "actor",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.actor.roster_delete.loss-first",
    route: "CP",
    subject: "actor",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.actor.roster_delete.operation-first",
    route: "CP",
    subject: "actor",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.peer.roster_revoke.loss-first",
    route: "CP",
    subject: "peer",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.peer.roster_revoke.operation-first",
    route: "CP",
    subject: "peer",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.peer.roster_delete.loss-first",
    route: "CP",
    subject: "peer",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CP.peer.roster_delete.operation-first",
    route: "CP",
    subject: "peer",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.availability_off.loss-first",
    route: "CB",
    loss: "availability_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.availability_off.operation-first",
    route: "CB",
    loss: "availability_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.availability_missing.loss-first",
    route: "CB",
    loss: "availability_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.availability_missing.operation-first",
    route: "CB",
    loss: "availability_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.purpose_off.loss-first",
    route: "CB",
    loss: "purpose_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.purpose_off.operation-first",
    route: "CB",
    loss: "purpose_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.purpose_missing.loss-first",
    route: "CB",
    loss: "purpose_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.purpose_missing.operation-first",
    route: "CB",
    loss: "purpose_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.source_gate_off.loss-first",
    route: "CB",
    loss: "source_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.source_gate_off.operation-first",
    route: "CB",
    loss: "source_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.source_gate_missing.loss-first",
    route: "CB",
    loss: "source_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.source_gate_missing.operation-first",
    route: "CB",
    loss: "source_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.safety_gate_off.loss-first",
    route: "CB",
    loss: "safety_gate_off",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.safety_gate_off.operation-first",
    route: "CB",
    loss: "safety_gate_off",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.safety_gate_missing.loss-first",
    route: "CB",
    loss: "safety_gate_missing",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.safety_gate_missing.operation-first",
    route: "CB",
    loss: "safety_gate_missing",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.actor.roster_revoke.loss-first",
    route: "CB",
    subject: "actor",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.actor.roster_revoke.operation-first",
    route: "CB",
    subject: "actor",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.actor.roster_delete.loss-first",
    route: "CB",
    subject: "actor",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.actor.roster_delete.operation-first",
    route: "CB",
    subject: "actor",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.peer.roster_revoke.loss-first",
    route: "CB",
    subject: "peer",
    loss: "roster_revoke",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.peer.roster_revoke.operation-first",
    route: "CB",
    subject: "peer",
    loss: "roster_revoke",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.peer.roster_delete.loss-first",
    route: "CB",
    subject: "peer",
    loss: "roster_delete",
    order: "loss-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
  {
    id: "L2.CB.peer.roster_delete.operation-first",
    route: "CB",
    subject: "peer",
    loss: "roster_delete",
    order: "operation-first",
    partition: "actual-observed-wait-required",
    status: "unexecuted",
  },
]);

// Structured comparisons preserve exact mismatching fields for failed-cell
// evidence. Credentials are never printed; whole session transcripts are withheld.
export function credentialFree(value) {
  if (Array.isArray(value)) return value.map(credentialFree);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        /password|secret|token|authorization|cookie|credential|api_key|apikey|access_key/i.test(
          key,
        )
          ? "<redacted>"
          : credentialFree(v),
      ]),
    );
  if (typeof value === "string")
    return value
      .replace(
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
        "<redacted-token>",
      )
      .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1<redacted>@");
  return value;
}
export function differences(expected, actual, path = "$") {
  if (expected === actual) return [];
  if (
    expected &&
    actual &&
    typeof expected === "object" &&
    typeof actual === "object"
  ) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    return [...keys].flatMap((k) =>
      differences(expected[k], actual[k], `${path}.${k}`),
    );
  }
  const sensitive =
    /password|secret|token|authorization|cookie|credential|api_key|apikey|access_key/i.test(
      path,
    );
  return [
    {
      field: path,
      expected: sensitive
        ? "<redacted>"
        : expected === undefined
          ? "<absent>"
          : credentialFree(expected),
      actual: sensitive
        ? "<redacted>"
        : actual === undefined
          ? "<absent>"
          : credentialFree(actual),
    },
  ];
}
export function verifiedOutcome(input) {
  const delta = differences(input.expectedAfter ?? input.before, input.after);
  if (delta.length) {
    const error = new Error("Exact full54 outcome mismatch");
    error.preciseDifferences = delta;
    throw error;
  }
  return rawAssertOutcome(input);
}
export function exactDiagnostic(output) {
  const rows = [...output.matchAll(/ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/g)];
  return rows.map((row) => ({
    code: row[1],
    message: credentialFree(row[2].trim()),
  }));
}
export function captureFailure(error, context) {
  if (error.failureRecorded) return;
  let snapshot = null,
    censusDiagnostic = null;
  try {
    snapshot = census();
  } catch (cause) {
    censusDiagnostic = credentialFree(cause.message);
  }
  const parsed = /^Disposable SQL error: ([A-Z0-9]{5}): (.*)$/.exec(
    error.message,
  );
  console.error(
    JSON.stringify({
      id: context?.id ?? "<suite>",
      phase: context?.phase ?? "<unknown>",
      partition: "failed-no-success-credit",
      successful_wait_order_credit: false,
      observed_wait_credit: 0,
      lock_observation: context?.observation ?? null,
      available_public_result: context?.publicResult ?? null,
      available_manager_result: context?.managerResult ?? null,
      setup_qualification: context?.setupQualification ?? null,
      diagnostics: [
        ...(context?.diagnostics ?? []),
        ...(error.sqlDiagnostics ?? []),
        ...(parsed
          ? [{ code: parsed[1], message: credentialFree(parsed[2]) }]
          : []),
      ],
      cleanup_diagnostics: error.cleanupDiagnostics ?? [],
      error: {
        name: error.name,
        message: error.preciseDifferences
          ? "Exact full54 outcome mismatch"
          : credentialFree(error.message),
      },
      differences: error.preciseDifferences ?? [],
      committed_census: snapshot ? credentialFree(snapshot) : null,
      committed_census_summary: snapshot ? sanitized(snapshot) : null,
      holder_snapshot: context?.holderSnapshot
        ? credentialFree(context.holderSnapshot)
        : null,
      census_failure: censusDiagnostic,
    }),
  );
  error.failureRecorded = true;
  error.failedCellID = context?.id ?? "<suite>";
}
export async function finishOwnedSessions(sessions, originalError = null) {
  const closed = await Promise.allSettled(
    sessions.filter(Boolean).map((s) => s.close()),
  );
  if (closed.some((r) => r.status === "rejected")) {
    const error =
      originalError ??
      new Error("owned child cleanup incomplete; no reset permission");
    error.cleanupIncomplete = true;
    error.cleanupDiagnostics = closed
      .filter((r) => r.status === "rejected")
      .map((r) => credentialFree(r.reason.message));
    console.error(
      JSON.stringify({
        id: error.failedCellID ?? "<owned-session>",
        partition: "owned-exit-unproven",
        cleanup_diagnostics: error.cleanupDiagnostics,
        reset_forbidden: true,
        original_error_preserved: originalError !== null,
        successful_wait_order_credit: false,
      }),
    );
    throw error;
  }
}
export function guardedFinalCleanup(cleanupSafe, originalError = null) {
  if (!cleanupSafe) return;
  try {
    resetDisposable("current27");
    assertClean();
  } catch (cleanup) {
    if (originalError) {
      originalError.cleanupDiagnostics = [
        ...(originalError.cleanupDiagnostics ?? []),
        credentialFree(cleanup.message),
      ];
      console.error(
        JSON.stringify({
          id: originalError.failedCellID ?? "<suite>",
          partition: "cleanup-failed",
          original_error_preserved: true,
          diagnostic: credentialFree(cleanup.message),
          successful_wait_order_credit: false,
        }),
      );
      throw originalError;
    }
    throw cleanup;
  }
}
export function assertCaseSetup(
  clean,
  after,
  route,
  window,
  actorPreference = "absent",
) {
  assert.deepEqual(Object.keys(after).sort(), censusTables.slice().sort());
  const expected = structuredClone(clean);
  const all = [route.actor, route.host, route.peer, route.manager],
    ready = all.slice(0, 3);
  const select = (table, key, id) => {
    const rows = after[table].filter((r) => r[key] === id);
    assert.equal(rows.length, 1, `${table} exact ${key} binding`);
    return rows[0];
  };
  const stamp = (table, key, id, field) =>
    dynamicTime(select(table, key, id)[field], window);
  const profile = (id, eligible) => ({
    user_id: id,
    real_name: eligible ? "Current safety fixture" : null,
    graduation_year: eligible ? 2028 : null,
    major: eligible ? "Math" : null,
    bio: eligible ? "Local" : null,
    primary_photo_path: eligible ? photoPath(id) : null,
    is_complete: eligible,
    created_at: stamp("public.profiles", "user_id", id, "created_at"),
    interests: [],
    down_to_do: [],
    favorite_music: null,
    favorite_foods: null,
    weird_fact: null,
    prompts: [],
    instagram: null,
    additional_photo_paths: [],
    revision: eligible ? 1 : 0,
  });
  expected["public.accounts"] = all.map((id) => ({
    id,
    status: "active",
    created_at: stamp("public.accounts", "id", id, "created_at"),
  }));
  expected["public.profiles"] = all.map((id) =>
    profile(id, id !== route.manager),
  );
  expected["auth.users"] = all.map((id) => ({
    id,
    email: email(id),
    email_confirmed_at: stamp("auth.users", "id", id, "email_confirmed_at"),
    deleted_at: null,
    raw_user_meta_data: null,
    raw_app_meta_data: null,
  }));
  expected["public.university_memberships"] = all.map((id) => ({
    user_id: id,
    university_id: campus,
    verified_at: select("auth.users", "id", id).email_confirmed_at,
    verification_email: email(id),
    created_at: stamp(
      "public.university_memberships",
      "user_id",
      id,
      "created_at",
    ),
  }));
  expected["private.pilot_account_admission"] = ready.map((id) => ({
    account_id: id,
    state: "active",
    revision: 1,
    created_at: stamp(
      "private.pilot_account_admission",
      "account_id",
      id,
      "created_at",
    ),
    updated_at: stamp(
      "private.pilot_account_admission",
      "account_id",
      id,
      "updated_at",
    ),
  }));
  expected["private.pilot_admission_managers"] = [
    {
      account_id: route.manager,
      state: "active",
      revision: 1,
      created_at: stamp(
        "private.pilot_admission_managers",
        "account_id",
        route.manager,
        "created_at",
      ),
      updated_at: stamp(
        "private.pilot_admission_managers",
        "account_id",
        route.manager,
        "updated_at",
      ),
    },
  ];
  const audits = after["private.pilot_manager_audit"];
  assert.equal(audits.length, 1);
  assert.match(audits[0].id, uuid);
  assert.ok(
    Number.isSafeInteger(audits[0].executor_backend_pid) &&
      audits[0].executor_backend_pid > 0,
  );
  expected["private.pilot_manager_audit"] = [
    {
      id: audits[0].id,
      account_id: route.manager,
      executor_session_user: "postgres",
      executor_original_role: "none",
      executor_backend_pid: audits[0].executor_backend_pid,
      previous_state: null,
      new_state: "active",
      previous_revision: 0,
      new_revision: 1,
      reason: "B3c synthetic manager",
      request_id: route.managerRequest,
      occurred_at: dynamicTime(audits[0].occurred_at, window),
    },
  ];
  expected["public.universities"] = [
    ...clean["public.universities"],
    {
      id: route.otherCampus,
      name: "Other synthetic campus",
      slug: "b3c-" + route.otherCampus,
      allowed_email_domains: ["unc.edu"],
      active: true,
      created_at: stamp(
        "public.universities",
        "id",
        route.otherCampus,
        "created_at",
      ),
    },
  ];
  expected["private.pilot_availability"] = clean[
    "private.pilot_availability"
  ].map((row) => ({ ...row, enabled: true }));
  expected["private.pilot_capabilities"] = clean[
    "private.pilot_capabilities"
  ].map((row) => ({
    ...row,
    enabled: ["hangouts", "people"].includes(row.key),
  }));
  for (const table of [
    "private.hangout_feature_gate",
    "private.people_feature_gate",
    "private.safety_feature_gate",
  ])
    expected[table] = [{ singleton: true, enabled: true }];
  expected["private.people_preferences"] = [
    { account_id: route.peer, opted_in: true },
    ...(actorPreference === false
      ? [{ account_id: route.actor, opted_in: false }]
      : []),
  ];
  // Provider defaults are opaque immutable before-value anchors only. This
  // assignment changes no Storage value after setup. Identity/owner/bucket/name
  // and generated UUID/times are independently constrained; no mutated delta
  // can use an opaque observed value as its expected authorization result.
  const storage = after["storage.objects"];
  assert.equal(storage.length, 3);
  assert.equal(
    new Set(storage.map((row) => row.id)).size,
    3,
    "three distinct generated object bindings",
  );
  const providerFields = new Set();
  expected["storage.objects"] = ready.map((id) => {
    const object = select("storage.objects", "name", photoPath(id));
    assert.match(object.id, uuid);
    assert.equal(object.bucket_id, "profile-photos");
    assert.equal(object.owner_id, id);
    const row = {
      id: object.id,
      bucket_id: "profile-photos",
      name: photoPath(id),
      owner_id: id,
    };
    for (const field of ["created_at", "updated_at", "last_accessed_at"])
      if (Object.hasOwn(object, field) && object[field] !== null) {
        row[field] = dynamicTime(object[field], window);
      }
    for (const field of Object.keys(object))
      if (!Object.hasOwn(row, field)) {
        providerFields.add(field);
        row[field] = structuredClone(object[field]);
      }
    return row;
  });
  if (route.id === "CH") {
    expected["public.hangouts"] = [
      {
        id: route.source,
        university_id: campus,
        host_id: route.host,
        title: "Undisclosed fixture",
        description: null,
        starts_at: dynamicTime(
          select("public.hangouts", "id", route.source).starts_at,
          {
            start: new Date(Date.parse(window.start) + 86400000).toISOString(),
            end: new Date(Date.parse(window.end) + 86400000).toISOString(),
          },
        ),
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
        created_at: stamp("public.hangouts", "id", route.source, "created_at"),
        updated_at: stamp("public.hangouts", "id", route.source, "updated_at"),
      },
    ];
    const participant = after["public.hangout_participants"];
    assert.equal(participant.length, 1);
    expected["public.hangout_participants"] = [
      {
        hangout_id: route.source,
        account_id: route.host,
        state: "joined",
        joined_at: dynamicTime(participant[0].joined_at, window),
        left_at: null,
        removed_at: null,
        updated_at: dynamicTime(participant[0].updated_at, window),
      },
    ];
    const place = after["public.hangout_private_locations"];
    assert.equal(place.length, 1);
    expected["public.hangout_private_locations"] = [
      {
        hangout_id: route.source,
        instructions: "Undisclosed synthetic instructions",
        updated_at: dynamicTime(place[0].updated_at, window),
      },
    ];
  }
  verifiedOutcome({
    result: "independent case setup with qualified provider anchors",
    expectedResult: "independent case setup with qualified provider anchors",
    before: clean,
    after,
    expectedAfter: exactSnapshot(clean, after, expected),
  });
  return {
    source_owned_rowsets_verified: true,
    provider_identity_and_time_fields_verified: true,
    provider_opaque_immutable_anchor_fields: [...providerFields].sort(),
    provider_defaults_source_verified: false,
    provider_anchor_classification_pending_review: true,
  };
}
export const bounds =
  "set statement_timeout='12s';set lock_timeout='10s';set idle_in_transaction_session_timeout='15s';";
const reason = "B3c policy fixture";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function valueSQL(route, options = {}) {
  const q = query(route, options).trim().replace(/;$/, "");
  return route.id === "CB"
    ? `select 'RESULT:'||to_jsonb(v)::text from (${q}) q(v);`
    : `select 'RESULT:'||to_jsonb(q)::text from (${q}) q;`;
}
function marker(output, prefix) {
  const line = output.split("\n").find((v) => v.startsWith(prefix));
  assert.ok(line, `actual ${prefix} observation required`);
  return JSON.parse(line.slice(prefix.length));
}
export function successSQL(route, options = {}) {
  return `${auth(route.actor)}${valueSQL(route, options)}reset role;select 'SNAPSHOT:'||(${censusQuery})::text;`;
}
export function exactSnapshot(before, after, replacements) {
  const expected = structuredClone(before);
  for (const [table, rows] of Object.entries(replacements)) {
    // Ordering alone follows server JSONB sort. Each value comes from the explicit
    // expectation, never an automatically accepted observed row.
    if (rows.length !== after[table].length) {
      const error = new Error(`Exact row count mismatch in ${table}`);
      error.preciseDifferences = [
        {
          field: `${table}.length`,
          expected: rows.length,
          actual: after[table].length,
        },
      ];
      throw error;
    }
    const used = new Set();
    expected[table] = after[table].map((actual) => {
      const index = rows.findIndex(
        (row, i) =>
          !used.has(i) && JSON.stringify(row) === JSON.stringify(actual),
      );
      // Compare fields independently of JSON object key insertion order.
      const fallback =
        index < 0
          ? rows.findIndex((row, i) => {
              if (used.has(i)) return false;
              try {
                assert.deepEqual(row, actual);
                return true;
              } catch {
                return false;
              }
            })
          : index;
      if (fallback < 0) {
        const error = new Error(`Exact row fields mismatch in ${table}`);
        const candidate = rows.findIndex((row, i) => !used.has(i));
        error.preciseDifferences = differences(
          rows[candidate],
          actual,
          `${table}[${candidate}]`,
        );
        throw error;
      }
      used.add(fallback);
      return rows[fallback];
    });
  }
  return expected;
}
export function dynamicTime(value, window = null) {
  assert.ok(
    typeof value === "string" && Number.isFinite(Date.parse(value)),
    "actual server timestamp required",
  );
  if (window) {
    assert.ok(
      Date.parse(value) >= Date.parse(window.start) &&
        Date.parse(value) <= Date.parse(window.end),
      "server field lies inside independently observed operation window",
    );
  }
  return value;
}
export function assertSuccess(
  route,
  before,
  after,
  result,
  request = route.request,
) {
  let replacements;
  if (route.id === "CB") {
    assert.equal(result, true);
    replacements = {
      "private.people_blocks": [
        ...before["private.people_blocks"],
        { blocker_id: route.actor, blocked_id: route.peer },
      ],
    };
  } else {
    assert.deepEqual(Object.keys(result).sort(), [
      "receipt_id",
      "submitted_at",
    ]);
    assert.match(result.receipt_id, uuid);
    dynamicTime(result.submitted_at);
    const fingerprint = sql(
      `select md5(jsonb_build_array(${quote(route.mode)},${quote(route.target)}::uuid,'harassment',null)::text)`,
    );
    replacements = {
      "private.safety_reports": [
        ...before["private.safety_reports"],
        {
          id: result.receipt_id,
          submitted_at: result.submitted_at,
          reporter_id: route.actor,
          target_type: route.mode,
          target_id: route.target,
          category: "harassment",
          narrative: null,
          provenance_kind: route.provenance,
          provenance_ref_id: route.target,
        },
      ],
      "private.safety_report_requests": [
        ...before["private.safety_report_requests"],
        {
          reporter_id: route.actor,
          request_id: request,
          input_fingerprint: fingerprint,
          report_id: result.receipt_id,
        },
      ],
    };
  }
  return verifiedOutcome({
    result,
    expectedResult:
      route.id === "CB"
        ? true
        : { receipt_id: result.receipt_id, submitted_at: result.submitted_at },
    before,
    after,
    expectedAfter: exactSnapshot(before, after, replacements),
  });
}
export async function executeSuccess(
  route,
  { rollback = false, request = route.request } = {},
) {
  let owned, originalError;
  try {
    owned = session(`b3c_serial_${request.replaceAll("-", "").slice(0, 16)}`);
    owned.send(
      `${bounds}begin;${successSQL(route, { request })}${rollback ? "rollback" : "commit"};`,
    );
    owned.child.stdin.end();
    const done = await owned.done;
    assert.equal(done[0], 0);
    assert.doesNotMatch(owned.output(), /ERROR:/);
    return {
      result: marker(owned.output(), "RESULT:"),
      snapshot: marker(owned.output(), "SNAPSHOT:"),
    };
  } catch (error) {
    originalError = error;
    error.sqlDiagnostics = exactDiagnostic(owned?.output() ?? "");
    throw error;
  } finally {
    await finishOwnedSessions([owned], originalError);
  }
}
export function assertDenied(route, before, request) {
  assert.throws(
    () =>
      sql(
        `${bounds}begin;${auth(route.actor)}${query(route, { request })}commit;`,
      ),
    (error) =>
      error.message === `Disposable SQL error: 42501: ${denialFor(route)}`,
  );
  const after = census();
  return verifiedOutcome({
    result: { code: "42501", message: denialFor(route) },
    expectedResult: { code: "42501", message: denialFor(route) },
    before,
    after,
  });
}
export async function precheck(route) {
  assertCurrentOnly(route);
  const before = census();
  assert.equal(
    before["private.pilot_capabilities"].find((r) => r.key === "onboarding")
      .enabled,
    false,
    "onboarding-off positive",
  );
  const observed = await executeSuccess(route, { rollback: true });
  assertSuccess(route, before, observed.snapshot, observed.result);
  verifiedOutcome({
    result: "rollback",
    expectedResult: "rollback",
    before,
    after: census(),
  });
  assertCurrentOnly(route);
}
export function lossDefinition(cell, route) {
  const subject = cell.subject && route.subjects[cell.subject];
  const key = cell.loss.startsWith("availability")
    ? "availability"
    : route.purpose;
  const policyTable =
    key === "availability"
      ? "private.pilot_availability"
      : "private.pilot_capabilities";
  const policyWhere =
    key === "availability" ? "singleton" : `key=${quote(key)}`;
  const gateTable = cell.loss.startsWith("safety")
    ? "private.safety_feature_gate"
    : route.id === "CH"
      ? "private.hangout_feature_gate"
      : "private.people_feature_gate";
  const managerRequest = caseIds(`${cell.id}.manager-change`).request;
  if (
    cell.loss === "roster_revoke" ||
    cell.loss === "availability_off" ||
    cell.loss === "purpose_off"
  ) {
    const admission = cell.loss === "roster_revoke";
    const managerCall = admission
      ? `select * from public.set_pilot_account_admission(${quote(subject)},'revoked',1,${quote(reason)},${quote(managerRequest)});`
      : `select * from public.set_pilot_policy(${quote(key)},false,1,${quote(reason)},${quote(managerRequest)});`;
    return {
      sql: `${auth(route.manager)}select 'MANAGER_RESULT:'||to_jsonb(q)::text from (${managerCall.trim().replace(/;$/, "")}) q;reset role;`,
      manager: true,
      subject,
      key,
      request: managerRequest,
      admission,
      table: admission ? "private.pilot_account_admission" : policyTable,
      where: admission ? `account_id=${quote(subject)}` : policyWhere,
      writer: "authenticated approved manager RPC",
      wait: "social advisory serialization before pilot; NOT lower required lookup",
      missing: false,
    };
  }
  const roster = cell.loss === "roster_delete";
  const policy =
    cell.loss === "availability_missing" || cell.loss === "purpose_missing";
  const table = roster
    ? "private.pilot_account_admission"
    : policy
      ? policyTable
      : gateTable;
  const where = roster
    ? `account_id=${quote(subject)}`
    : policy
      ? policyWhere
      : "singleton";
  const missing = cell.loss.endsWith("missing") || roster;
  // Missing policy/roster maintenance uses the accepted exact prefix and gets
  // boundary credit only. Source/safety direct row writers get actual tuple
  // credit. Never manufacture a lower lookup wait with a common lock preamble.
  return {
    sql: `${roster || policy ? "select private.pilot_evidence_write_lock();" : ""}${missing ? "delete from" : "update"} ${table} ${missing ? "" : "set enabled=false"} where ${where};`,
    manager: false,
    boundary: roster || policy,
    subject,
    key,
    table,
    where,
    missing,
    writer:
      roster || policy
        ? "privileged synthetic exact-prefix missing-row maintenance; NOT manager delete permission"
        : "privileged synthetic source/safety direct row maintenance; NOT manager permission",
    wait:
      roster || policy
        ? "exact-prefix social/exclusive pilot boundary serialization; NOT lower lookup/absence proof"
        : `required ${table} tuple lookup/SHARE conflicts with actual UPDATE/DELETE`,
  };
}
function one(rows, predicate) {
  const found = rows.filter(predicate);
  assert.equal(found.length, 1);
  return found[0];
}
export function assertLoss(before, after, loss, route, window = null) {
  const predicate =
    loss.table === "private.pilot_account_admission"
      ? (r) => r.account_id === loss.subject
      : loss.table === "private.pilot_capabilities"
        ? (r) => r.key === loss.key
        : (r) => r.singleton === true;
  const old = one(before[loss.table], predicate),
    rows = before[loss.table].filter((r) => !predicate(r));
  const replacements = {};
  if (!loss.missing) {
    const actual = one(after[loss.table], predicate);
    const expected = {
      ...old,
      ...(loss.admission ? { state: "revoked" } : { enabled: false }),
    };
    if (loss.manager) {
      expected.revision = 2;
      expected.updated_at = dynamicTime(actual.updated_at, window);
      assert.notEqual(expected.updated_at, old.updated_at);
    }
    rows.push(expected);
  }
  replacements[loss.table] = rows;
  if (loss.manager) {
    const added = after["private.pilot_management_audit"].filter(
      (r) => r.actor_id === route.manager && r.request_id === loss.request,
    );
    assert.equal(added.length, 1);
    const a = added[0];
    assert.match(a.id, uuid);
    dynamicTime(a.occurred_at, window);
    const value = loss.admission ? "revoked" : false;
    const audit = {
      id: a.id,
      actor_id: route.manager,
      operation: loss.admission ? "admission" : "policy",
      target_id: loss.admission ? loss.subject : null,
      policy_key: loss.admission ? null : loss.key,
      previous_value: loss.admission ? "active" : true,
      new_value: value,
      previous_revision: 1,
      new_revision: 2,
      reason,
      request_id: loss.request,
      occurred_at: a.occurred_at,
    };
    const ledger = {
      actor_id: route.manager,
      request_id: loss.request,
      fingerprint: loss.admission
        ? ["admission", loss.subject, "revoked", 1, reason]
        : ["policy", loss.key, false, 1, reason],
      result_value: value,
      result_revision: 2,
      audit_id: a.id,
    };
    replacements["private.pilot_management_audit"] = [
      ...before["private.pilot_management_audit"],
      audit,
    ];
    replacements["private.pilot_management_requests"] = [
      ...before["private.pilot_management_requests"],
      ledger,
    ];
  }
  const expectedAfter = exactSnapshot(before, after, replacements);
  return verifiedOutcome({
    result: "loss committed",
    expectedResult: "loss committed",
    before,
    after,
    expectedAfter,
  });
}
async function observeRace(cell, route, loss, before, context) {
  let holder, waiter, originalError;
  const start = sql("select clock_timestamp()::text");
  const name =
    "b3c_" + caseIds(cell.id).request.replaceAll("-", "").slice(0, 24);
  try {
    holder = session(name + "_h");
    waiter = session(name + "_w");
    const operationFirst = cell.order === "operation-first";
    const lossSQL = `${loss.sql}select 'SNAPSHOT:'||(${censusQuery})::text;`;
    context.phase = "holder-execution";
    holder.send(
      `${bounds}begin;${operationFirst ? successSQL(route) : lossSQL}select 'HELD';`,
    );
    await until(() => holder.output().includes("HELD"));
    assert.doesNotMatch(
      holder.output(),
      /ERROR:/,
      "failed holder is not coverage",
    );
    context.phase = "waiter-execution";
    waiter.send(
      `${bounds}begin;${operationFirst ? lossSQL : successSQL(route)}select 'COMPLETED';commit;`,
    );
    const observationsSQL = `select jsonb_build_object('holder_pid',h.pid,'waiter_pid',w.pid,'blocking_pids',pg_blocking_pids(w.pid),'ungranted_locks',(select jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,'relation',l.relation::regclass::text,'transactionid',l.transactionid,'classid',l.classid,'objid',l.objid,'objsubid',l.objsubid)) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity h join pg_stat_activity w on w.application_name=${quote(name + "_w")} where h.application_name=${quote(name + "_h")} and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`;
    let observation;
    context.phase = "observe-required-wait";
    await until(() => {
      const raw = sql(observationsSQL);
      if (!raw) return false;
      observation = JSON.parse(raw);
      context.observation = observation;
      return true;
    });
    assert.notEqual(observation.holder_pid, observation.waiter_pid);
    assert.ok(observation.blocking_pids.includes(observation.holder_pid));
    assert.ok(observation.ungranted_locks.length > 0);
    if (loss.manager || loss.boundary)
      assert.ok(
        observation.ungranted_locks.some(
          (l) =>
            l.locktype === "advisory" && l.classid === 16016 && l.objid === 1,
        ),
        "actual approved/exact-prefix social boundary contention",
      );
    else
      assert.ok(
        observation.ungranted_locks.some((l) =>
          ["transactionid", "tuple"].includes(l.locktype),
        ),
        "actual required tuple contention; advisory-only wait forbidden",
      );
    context.phase = "release-and-assert-outcome";
    holder.send("commit;");
    holder.child.stdin.end();
    waiter.child.stdin.end();
    const [h, w] = await Promise.all([holder.done, waiter.done]);
    context.diagnostics = [
      ...exactDiagnostic(holder.output()),
      ...exactDiagnostic(waiter.output()),
    ];
    assert.equal(h[0], 0);
    assert.doesNotMatch(holder.output(), /ERROR:/);
    const held = marker(holder.output(), "SNAPSHOT:");
    context.holderSnapshot = held;
    const window = { start, end: sql("select clock_timestamp()::text") };
    if (loss.manager) {
      const actual = marker(
        (operationFirst ? waiter : holder).output(),
        "MANAGER_RESULT:",
      );
      assert.deepEqual(
        actual,
        loss.admission
          ? { state: "revoked", revision: 2 }
          : { enabled: false, revision: 2 },
      );
    }
    if (operationFirst) {
      assert.equal(w[0], 0);
      assert.doesNotMatch(waiter.output(), /ERROR:/);
      assert.match(waiter.output(), /COMPLETED/);
      assertSuccess(route, before, held, marker(holder.output(), "RESULT:"));
      assertLoss(held, census(), loss, route, window);
    } else {
      assert.notEqual(w[0], 0);
      assert.deepEqual(
        exactDiagnostic(waiter.output()),
        [{ code: "42501", message: denialFor(route) }],
        "exact neutral SQL diagnostic only",
      );
      assert.doesNotMatch(
        waiter.output(),
        /40P01|40001|57014|55P03|COMPLETED|RESULT:|SNAPSHOT:/,
      );
      assertLoss(before, held, loss, route, window);
      verifiedOutcome({
        result: { code: "42501", message: denialFor(route) },
        expectedResult: { code: "42501", message: denialFor(route) },
        before: held,
        after: census(),
      });
    }
    const currentResult = operationFirst
      ? marker(holder.output(), "RESULT:")
      : null;
    return {
      id: cell.id,
      setup_qualification: context.setupQualification,
      ...observation,
      before: sanitized(before),
      after: sanitized(census()),
      actual_public_result: operationFirst
        ? route.id === "CB"
          ? currentResult
          : {
              fields: Object.keys(currentResult).sort(),
              receipt_sha256: createHash("sha256")
                .update(JSON.stringify(currentResult))
                .digest("hex"),
            }
        : { code: "42501", message: denialFor(route) },
      actual_manager_result: loss.manager
        ? marker((operationFirst ? waiter : holder).output(), "MANAGER_RESULT:")
        : null,
      writer: loss.writer,
      wait_location: loss.wait,
      result: operationFirst
        ? "success committed before loss"
        : { code: "42501", message: denialFor(route) },
      full54_values_verified: true,
    };
  } catch (error) {
    originalError = error;
    if (
      holder
        ?.output()
        .split("\n")
        .some((v) => v.startsWith("SNAPSHOT:"))
    ) {
      try {
        context.holderSnapshot = marker(holder.output(), "SNAPSHOT:");
      } catch {
        /* malformed snapshot remains unavailable */
      }
    }
    for (const owned of [holder, waiter].filter(Boolean)) {
      if (
        owned
          .output()
          .split("\n")
          .some((v) => v.startsWith("RESULT:"))
      ) {
        try {
          const result = marker(owned.output(), "RESULT:");
          context.publicResult =
            typeof result === "boolean"
              ? result
              : {
                  fields: Object.keys(result).sort(),
                  receipt_sha256: createHash("sha256")
                    .update(JSON.stringify(result))
                    .digest("hex"),
                };
        } catch {
          /* malformed result remains unavailable */
        }
      }
      if (
        owned
          .output()
          .split("\n")
          .some((v) => v.startsWith("MANAGER_RESULT:"))
      ) {
        try {
          context.managerResult = marker(owned.output(), "MANAGER_RESULT:");
        } catch {
          /* malformed manager result remains unavailable */
        }
      }
    }
    context.diagnostics = [
      ...exactDiagnostic(holder?.output() ?? ""),
      ...exactDiagnostic(waiter?.output() ?? ""),
    ];
    captureFailure(error, context);
    throw error;
  } finally {
    await finishOwnedSessions([holder, waiter], originalError);
  }
}
export async function removeOwnBlock(route) {
  const before = census();
  assert.equal(
    selectedLaterLane(route),
    "retained",
    "own committed block is lawful retained authority",
  );
  const result = JSON.parse(
    sql(
      `begin;${auth(route.actor)}select to_jsonb(public.set_safety_block(${quote(route.peer)},false));commit;`,
    ),
  );
  assert.equal(result, false);
  const after = census(),
    rows = before["private.people_blocks"].filter(
      (r) => !(r.blocker_id === route.actor && r.blocked_id === route.peer),
    );
  verifiedOutcome({
    result,
    expectedResult: false,
    before,
    after,
    expectedAfter: exactSnapshot(before, after, {
      "private.people_blocks": rows,
    }),
  });
  assertCurrentOnly(route);
}
export function requireReviewedPolicyTransport() {
  throw new Error(
    "B3c policy fixtures runtime blocked: frozen synchronous transport is unbounded; require reviewed transport amendment, gate follow-up, combined fixture/ownership review and explicit serial release before target contact",
  );
}
export async function runPolicyFixtures() {
  requireReviewedPolicyTransport();
  const matrix = JSON.parse(
    readFileSync(
      new URL(
        "../../agents/handoffs/TASK-021A1b3c-MATRIX.json",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(
    policyManifest,
    matrix.cells.filter((c) => c.id.startsWith("L2.")),
  );
  assert.equal(policyManifest.length, 72);
  localTarget("current27");
  assertClean();
  let cleanupSafe = true,
    originalError,
    context;
  try {
    for (const cell of policyManifest) {
      context = { id: cell.id, phase: "independent-case-setup" };
      const clean = census(),
        setupStart = sql("select clock_timestamp()::text");
      const actorPreference = cell.id.includes("operation-first")
        ? false
        : "absent";
      const route = prepare(
        routes.find((r) => r.id === cell.route),
        {
          caseKey: cell.id,
          actorPreference: cell.id.includes("operation-first")
            ? false
            : "absent",
        },
      );
      context.setupQualification = assertCaseSetup(
        clean,
        census(),
        route,
        { start: setupStart, end: sql("select clock_timestamp()::text") },
        actorPreference,
      );
      context.phase = "eligible-current-precheck";
      await precheck(route);
      context.phase = "race";
      const before = census(),
        loss = lossDefinition(cell, route);
      const evidence = await observeRace(cell, route, loss, before, context);
      context.phase = "post-loss-current-control";
      if (cell.order === "operation-first") {
        if (route.id === "CB") {
          // A missing/off safety gate forbids an authorized unblock. Restore only
          // that independent safety fixture gate, checking its separate delta.
          if (loss.table === "private.safety_feature_gate") {
            const b = census();
            sql(
              `begin;${loss.missing ? "insert into private.safety_feature_gate(singleton,enabled) values(true,true)" : "update private.safety_feature_gate set enabled=true where singleton"};commit;`,
            );
            const a = census();
            verifiedOutcome({
              result: "synthetic safety restore",
              expectedResult: "synthetic safety restore",
              before: b,
              after: a,
              expectedAfter: exactSnapshot(b, a, {
                "private.safety_feature_gate": [
                  { enabled: true, singleton: true },
                ],
              }),
            });
          }
          await removeOwnBlock(route);
          if (loss.table === "private.safety_feature_gate") {
            const b = census();
            sql(`begin;${loss.sql}commit;`);
            assertLoss(b, census(), loss, route);
          }
        }
        assertCurrentOnly(route);
        assertDenied(route, census(), caseIds(cell.id + ".post-loss").request);
      }
      context.phase = "success-evidence";
      console.log(JSON.stringify(evidence));
      context.phase = "guarded-case-reset";
      resetDisposable("current27");
    }
  } catch (error) {
    originalError = error;
    if (error.cleanupIncomplete) cleanupSafe = false;
    captureFailure(error, context);
    throw error;
  } finally {
    guardedFinalCleanup(cleanupSafe, originalError);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  test(
    "B3c exact72 policy/admission waits (requires separate serial release)",
    { timeout: 1_800_000 },
    runPolicyFixtures,
  );
