// Private, dormant compatibility boundary. Removing refusal requires a new review.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import * as core from "./pilot-admission-current-safety.mjs";
import {
  outgoingValue,
  projectCensusEvidence,
  projectOutgoingEvidence,
  originalSuiteError,
  neutralSuiteError,
} from "../pilot-admission-current-safety-concurrency.integration.mjs";

const refusal =
  "Reviewed legacy compatibility release required; task incomplete";
function requireReviewedLegacyRelease() {
  throw new Error(refusal);
}
const limit = 20 * 1024 * 1024;
const privateSessions = new WeakMap();
const privateFailures = new WeakMap();
const namespaces = [
  "authority",
  "owner",
  "sourceSafety",
  "lifecycle",
  "cohostChat",
];
const moduleNames = Object.freeze({
  authority: [
    "pilot-admission-authority-http",
    "pilot-admission-authority-concurrency",
  ],
  owner: ["pilot-admission-owner-http", "pilot-admission-owner-concurrency"],
  sourceSafety: [
    "pilot-admission-source-safety-http",
    "pilot-admission-source-safety-concurrency",
  ],
  lifecycle: [
    "pilot-admission-lifecycle-http",
    "pilot-admission-lifecycle-concurrency",
    "pilot-lifecycle-source-races",
    "pilot-lifecycle-block-membership-races",
    "pilot-lifecycle-crossings",
  ],
  cohostChat: [
    "pilot-admission-cohost-chat-http",
    "pilot-admission-cohost-chat-concurrency",
    "pilot-cohost-chat-identity-races",
    "pilot-cohost-chat-source-state-races",
    "pilot-cohost-chat-absence-retry",
    "pilot-cohost-chat-crossings",
  ],
});
// These are module coordinates, NOT invented domain/case expectations. No caller
// can register a plan. All 17 require independently reviewed case plans later.
const plans = Object.freeze(
  Object.fromEntries(
    namespaces.map((namespace) => [
      namespace,
      Object.freeze(
        moduleNames[namespace].map((module) =>
          Object.freeze({
            namespace,
            module,
            case: "unavailable",
            expectedDenial: null,
            expectedAbort: null,
            classification: "unavailable",
            expected54: null,
            holder: null,
            waiter: null,
            available: false,
          }),
        ),
      ),
    ]),
  ),
);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const auth = (id) =>
  `set local role authenticated; set local request.jwt.claims=${quote(JSON.stringify({ sub: id, role: "authenticated" }))};`;
function ownerAuth(id) {
  assert.equal(
    typeof id,
    "string",
    "auth fixture expects only an account UUID",
  );
  assert.match(id, /^[a-f0-9-]{36}$/, "auth fixture requires UUID");
  return auth(id);
}
const management = (
  actor,
  target,
  state,
  expected,
  request = crypto.randomUUID(),
) =>
  `${auth(actor)} select * from public.set_pilot_account_admission('${target}','${state}',${expected},'Local race','${request}');`;
const ownerManagement = (
  actor,
  target,
  state,
  expected,
  request = crypto.randomUUID(),
) =>
  `${ownerAuth(actor)} select * from public.set_pilot_account_admission('${target}','${state}',${expected},'Local race','${request}');`;
const trusted = (target, state, revision) =>
  `select private.set_pilot_manager_fixture('${target}','${state}',${revision},'Local executor fixture','${crypto.randomUUID()}');`;

// DIAGNOSTIC GRAMMAR START — inserted byte-for-byte from reviewed 2fef core.
function completeSqlDiagnostic(stderr) {
  if (
    typeof stderr !== "string" ||
    Buffer.byteLength(stderr) > 64 * 1024 ||
    /\r(?!\n)/.test(stderr)
  )
    return null;
  const lines = stderr.replaceAll("\r\n", "\n").split("\n");
  if (lines.at(-1) === "") lines.pop(); // Exactly one optional terminating newline.
  if (
    !lines.length ||
    lines.length > 64 ||
    lines.some((line) => !line || Buffer.byteLength(line) > 4096)
  )
    return null;
  const main = /^ERROR: {2}([A-Z0-9]{5}): ([^\r\n]+)$/.exec(lines[0]);
  if (!main) return null;
  let current = null,
    previous = -1,
    continuations = 0,
    quotedContext = false,
    quotedContent = false;
  // PostgreSQL quotes the whole SQL statement, including physical SQL lines.
  // Quotes inside that opaque SQL are not parsed; only the final physical quote
  // closes a frame. Recognized diagnostic/stack records cannot occur while open.
  function sqlContextFrame(text) {
    if (!text.startsWith('SQL statement "')) return false;
    const content = text.slice(15);
    quotedContext = !content.endsWith('"');
    quotedContent =
      (quotedContext ? content : content.slice(0, -1)).trim().length > 0;
    return quotedContext || quotedContent;
  }
  const fields = ["DETAIL", "HINT", "CONTEXT", "LOCATION"];
  for (const line of lines.slice(1)) {
    // Even indented ERROR/unknown labeled records cannot masquerade as opaque continuation.
    const field = /^([A-Z]+): {2}(.+)$/.exec(line);
    if (field) {
      const order = fields.indexOf(field[1]);
      if (quotedContext || order < 0 || order <= previous) return null;
      current = field[1];
      previous = order;
      continuations = 0;
      if (
        current === "CONTEXT" &&
        /^SQL statement\b/.test(field[2]) &&
        !sqlContextFrame(field[2])
      )
        return null;
    } else {
      if (
        !current ||
        current === "LOCATION" ||
        ++continuations > 16 ||
        /^\s*[A-Za-z][A-Za-z0-9_ -]*:/.test(line)
      )
        return null;
      if (quotedContext) {
        if (/^(?:SQL statement\b|PL\/pgSQL function\b)/.test(line.trimStart()))
          return null;
        const closes = line.endsWith('"');
        quotedContent ||= (closes ? line.slice(0, -1) : line).trim().length > 0;
        if (closes && !quotedContent) return null;
        quotedContext = !closes;
      } else if (current === "CONTEXT" && /^SQL statement\b/.test(line)) {
        if (!sqlContextFrame(line)) return null;
      } else if (
        !/^[ \t]+\S/.test(line) &&
        !(
          current === "CONTEXT" &&
          /^PL\/pgSQL function [^\r\n]+ line [1-9][0-9]* at [^\r\n]+$/.test(
            line,
          )
        )
      )
        return null;
    }
  }
  if (quotedContext) return null;
  return { code: main[1], message: main[2] };
}
// DIAGNOSTIC GRAMMAR END
const knownPairs = new Set([
  "42501:Safety report unavailable",
  "42501:Safety operation unavailable",
  "42501:Hangout operation not permitted",
  "42501:Hangout chat unavailable",
  "42501:Moderation unavailable",
  "42501:Pilot management unavailable",
  "42501:Owner operation unavailable",
  "23514:Detach a profile photo before deleting it",
  "23514:Photos must be existing owned private objects",
  "40P01:deadlock detected",
  "40001:could not serialize access due to concurrent update",
  "40001:could not serialize access due to read/write dependencies among transactions",
  "57014:canceling statement due to statement timeout",
  "55P03:canceling statement due to lock timeout",
]);
const unavailable = () =>
  Object.freeze({
    code: "unavailable",
    detail: Object.freeze({ type: "string", available: false }),
  });
function streamDiagnostic(stderr) {
  const parsed = completeSqlDiagnostic(stderr);
  if (!parsed) return unavailable();
  if (parsed.code === "23503")
    return Object.freeze({ code: "23503", message: "unavailable" });
  if (knownPairs.has(`${parsed.code}:${parsed.message}`))
    return Object.freeze(parsed);
  return Object.freeze({ code: "unavailable", detail: outgoingValue(parsed) });
}
function exactSqlDiagnostic(error) {
  // Never match public neutral text, copied errors, stack/cause or nested fields.
  return core.originalSqlDiagnostic(originalSuiteError(error));
}
function rejectionFor(namespace, rejection) {
  if (namespace === "authority" || namespace === "owner") {
    assert.equal(
      typeof rejection,
      "boolean",
      "original boolean rejection required",
    );
    return rejection
      ? namespace === "authority"
        ? ["42501:Pilot management unavailable"]
        : [
            "42501:Owner operation unavailable",
            "23514:Detach a profile photo before deleting it",
            "23514:Photos must be existing owned private objects",
          ]
      : [];
  }
  if (rejection === null) return [];
  const literals =
    namespace === "sourceSafety"
      ? [
          "Hangout operation not permitted",
          "Safety report unavailable",
          "Moderation unavailable",
        ]
      : namespace === "lifecycle"
        ? ["Hangout operation not permitted"]
        : ["Hangout operation not permitted", "Hangout chat unavailable"];
  assert.ok(
    literals.includes(rejection),
    "frozen original rejection literal required",
  );
  return [`42501:${rejection}`];
}
function attachPrivateCapture(owned) {
  // core.session initial input is ONLY application_name. Caller queries follow
  // attachment. No core combined/redacted output is authority for these values.
  const state = {
    stdout: [],
    stderr: [],
    bytes: 0,
    failure: null,
    listeners: [],
    close: null,
    done: null,
  };
  privateSessions.set(owned, state); // retain even a partially attached session
  for (const [key, stream] of [
    ["stdout", owned.child.stdout],
    ["stderr", owned.child.stderr],
  ]) {
    const data = (chunk) => {
      try {
        assert.ok(Buffer.isBuffer(chunk) || typeof chunk === "string");
        const bytes = Buffer.from(chunk);
        if (state.bytes + bytes.length > limit) {
          state.failure ??= new Error("Private SQL capture unavailable");
          return;
        }
        state.bytes += bytes.length;
        state[key].push(bytes);
      } catch (error) {
        state.failure ??= error;
      }
    };
    const error = () => {
      state.failure ??= new Error("Private SQL capture unavailable");
    };
    try {
      stream.on("data", data);
      state.listeners.push([stream, "data", data]);
      stream.on("error", error);
      state.listeners.push([stream, "error", error]);
    } catch (failure) {
      state.failure ??= failure;
    }
  }
  return owned;
}
function raw(owned, key) {
  const state = privateSessions.get(owned);
  assert.ok(state && !state.failure, "private original stream unavailable");
  return Buffer.concat(state[key]).toString("utf8");
}
function sessionState(owned) {
  const state = privateSessions.get(owned);
  if (!state || state.failure || state.done?.status !== "fulfilled")
    return { kind: "unavailable" };
  const exit = state.done.value;
  if (
    !Array.isArray(exit) ||
    exit.length !== 2 ||
    !Number.isSafeInteger(exit[0]) ||
    exit[0] < 0 ||
    exit[1] !== null
  )
    return { kind: "unavailable" };
  const stdout = raw(owned, "stdout"),
    stderr = raw(owned, "stderr");
  const completed = stdout.split(/\r?\n/).includes("COMPLETED");
  if (exit[0] === 0 && !/ERROR:/.test(stdout + stderr) && completed)
    return { kind: "ordinary", exit };
  const diagnostic = streamDiagnostic(stderr);
  if (exit[0] !== 0 && !completed && diagnostic.code !== "unavailable")
    return {
      kind: ["40P01", "40001", "57014", "55P03"].includes(diagnostic.code)
        ? "safe-abort"
        : "known-diagnostic",
      diagnostic,
      exit,
    };
  return { kind: "unavailable" };
}
function bindingObserved(plan, observation) {
  if (!plan.available || !plan.holder || !plan.waiter) return false;
  const h = plan.holder,
    w = plan.waiter;
  return (
    Number.isSafeInteger(h.pid) &&
    h.pid > 0 &&
    Number.isSafeInteger(w.pid) &&
    w.pid > 0 &&
    h.pid !== w.pid &&
    h.name !== w.name &&
    observation.holder_pid === h.pid &&
    observation.waiter_pid === w.pid &&
    observation.holder_name === h.name &&
    observation.waiter_name === w.name &&
    observation.holder_count === 1 &&
    observation.waiter_count === 1 &&
    observation.blockers.includes(h.pid) &&
    observation.ungranted === true
  );
}
function acceptance(plan, outcome, observed, expected54Matched) {
  const binding = bindingObserved(plan, observed);
  const ownedPlan =
    namespaces.includes(plan.namespace) && plans[plan.namespace].includes(plan);
  const independent =
    ownedPlan &&
    plan.available &&
    plan.expected54 !== null &&
    expected54Matched === true;
  const pair =
    outcome.diagnostic &&
    `${outcome.diagnostic.code}:${outcome.diagnostic.message}`;
  const accepted =
    binding &&
    independent &&
    ((plan.classification === "ordinary" && outcome.kind === "ordinary") ||
      (plan.classification === "denial" &&
        outcome.kind === "known-diagnostic" &&
        pair === plan.expectedDenial));
  // Planned aborts need their own reviewed qualified survivor; never order credit.
  return Object.freeze({
    accepted,
    permissionCredit: accepted && plan.classification === "denial",
    orderCredit: accepted ? 1 : 0,
    resetCredit: false,
  });
}
async function settleSessions(ownedSessions) {
  // close undefined/nonzero is not acceptance; retain independent actual done.
  const results = await Promise.allSettled(
    ownedSessions.map(async (owned) => {
      const state = privateSessions.get(owned);
      const [closed, done] = await Promise.allSettled([
        Promise.resolve().then(() => owned.close()),
        owned.done,
      ]);
      if (!state) return false;
      state.close = closed;
      state.done = done;
      if (closed.status === "fulfilled" && done.status === "fulfilled") {
        for (const [stream, event, listener] of state.listeners) {
          try {
            stream.removeListener(event, listener);
          } catch (error) {
            state.failure ??= error;
          }
        }
      }
      const value = done.status === "fulfilled" ? done.value : null;
      return (
        closed.status === "fulfilled" &&
        !state.failure &&
        Array.isArray(value) &&
        value.length === 2 &&
        Number.isSafeInteger(value[0]) &&
        value[0] >= 0 &&
        value[1] === null
      );
    }),
  );
  for (let index = 0; index < results.length; index++) {
    if (results[index].status === "rejected") {
      const state = privateSessions.get(ownedSessions[index]);
      if (state) state.failure ??= results[index].reason;
    }
  }
  return results.every(
    (result) => result.status === "fulfilled" && result.value === true,
  );
}
function absenceBound(plan, observation) {
  return (
    plan.available &&
    plan.holder !== null &&
    plan.waiter !== null &&
    observation.holder_pid_absent === true &&
    observation.waiter_pid_absent === true &&
    observation.leader_absent === true &&
    observation.holder_name_absent === true &&
    observation.waiter_name_absent === true
  );
}
function requestQuiescent(receipt) {
  const keys = [
    "available",
    "quiescent",
    "started",
    "settled",
    "pending",
    "failed",
    "uncertain",
  ];
  if (
    !receipt ||
    Object.keys(receipt).sort().join(",") !== keys.sort().join(",")
  )
    return false;
  return (
    receipt.available === true &&
    receipt.quiescent === true &&
    [
      receipt.started,
      receipt.settled,
      receipt.pending,
      receipt.failed,
      receipt.uncertain,
    ].every((value) => Number.isSafeInteger(value) && value >= 0) &&
    receipt.started === receipt.settled &&
    receipt.pending === 0 &&
    receipt.failed === 0 &&
    receipt.uncertain === 0
  );
}
function safeAbortPartition(plan, aborted, survivor, independentRollback) {
  const pair =
    aborted.diagnostic &&
    `${aborted.diagnostic.code}:${aborted.diagnostic.message}`;
  const ownedPlan =
    namespaces.includes(plan.namespace) && plans[plan.namespace].includes(plan);
  return Object.freeze({
    classified: aborted.kind === "safe-abort",
    qualified:
      ownedPlan &&
      plan.available &&
      plan.expected54 !== null &&
      plan.expectedAbort === pair &&
      survivor.kind === "ordinary" &&
      independentRollback === true,
    permissionCredit: 0,
    completedOrderCredit: 0,
    resetCredit: 0,
  });
}
function resetPermitted(
  plan,
  accepted,
  settled,
  absent,
  requestsQuiet,
  failedSuite,
) {
  const ownedPlan =
    namespaces.includes(plan.namespace) && plans[plan.namespace].includes(plan);
  return (
    ownedPlan &&
    plan.available &&
    plan.expected54 !== null &&
    accepted &&
    settled &&
    absent &&
    requestsQuiet &&
    !failedSuite
  );
}
function originalRow(owned, prefix) {
  const lines = raw(owned, "stdout")
    .split("\n")
    .filter((line) => line.startsWith(prefix));
  assert.equal(lines.length, 1, "one actual original row required");
  return JSON.parse(lines[0].slice(prefix.length));
}
function originalEvidence(
  namespace,
  holder,
  waiter,
  holderSnapshotSQL,
  receiptPrefix,
) {
  const result = {};
  if (holderSnapshotSQL !== null) {
    assert.ok(namespace === "lifecycle" || namespace === "cohostChat");
    result.holder_snapshot = originalRow(
      holder,
      namespace === "lifecycle" ? "B3A_CENSUS:" : "B3B_CENSUS:",
    );
    // Observed survivor only: never fed to acceptance as independent expected54.
  }
  if (receiptPrefix !== null) {
    assert.equal(namespace, "cohostChat");
    assert.equal(receiptPrefix, "B3B_RECEIPT:");
    const first = originalRow(holder, receiptPrefix),
      second = originalRow(waiter, receiptPrefix);
    assert.deepEqual(
      first,
      second,
      "concurrent same key returns exact original7fields",
    );
    assert.deepEqual(Object.keys(first[0]).sort(), [
      "author_id",
      "author_label",
      "body",
      "created_at",
      "message_id",
      "mine",
      "sequence",
    ]);
    result.receipts_equal = true;
    result.receipt_sha256 = createHash("sha256")
      .update(JSON.stringify(first))
      .digest("hex");
    result.receipt_fields = Object.keys(first[0]).sort();
  }
  return result; // private original assertion result; never outgoing evidence
}
function safeReceipt(plan, error, supplements) {
  const contextKnown =
    namespaces.includes(plan?.namespace) &&
    plans[plan.namespace].includes(plan);
  return Object.freeze({
    namespace: contextKnown ? plan.namespace : "unavailable",
    module: contextKnown ? plan.module : "unavailable",
    case: "unavailable",
    kind: "legacy-failure-no-credit",
    reset_forbidden: true,
    permission_credit: 0,
    completed_order_credit: 0,
    original: outgoingValue(originalSuiteError(error)),
    supplemental: supplements.map((value) => outgoingValue(value)),
    projection: projectOutgoingEvidence({
      error: originalSuiteError(error),
      observed_wait_credit: 0,
      successful_wait_order_credit: false,
      reset_forbidden: true,
    }),
  });
}
async function deliverLocal(receipt, emitter) {
  let timer;
  try {
    const delivered = await Promise.race([
      Promise.resolve()
        .then(() => emitter(receipt))
        .then(
          (value) => value === true,
          () => false,
        ),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), 2000);
      }),
    ]);
    return delivered === true;
  } finally {
    clearTimeout(timer);
  }
}
// Local, dormant receipt sink. This has no fd3/runner/channel/files adoption.
const localReceipts = new WeakMap();
async function captureFirst(error, plan) {
  const original = originalSuiteError(error);
  let state = privateFailures.get(original);
  if (!state) {
    state = {
      original,
      supplements: [],
      supplementalReceipts: [],
      delivered: false,
    };
    privateFailures.set(original, state);
    state.delivered = await deliverLocal(
      safeReceipt(plan, original, []),
      (receipt) => {
        localReceipts.set(original, receipt);
        return true;
      },
    );
  }
  return state;
}
function supplement(state, error) {
  state.supplements.push(originalSuiteError(error));
  const receipt = safeReceipt(null, state.original, [error]);
  state.supplementalReceipts.push(receipt);
  return receipt;
}
function fixedNamespace(namespace) {
  function sql(input) {
    requireReviewedLegacyRelease();
    try {
      return core.sql(input, { lane: "current27" });
    } catch (error) {
      // Synchronous assert.throws semantics retained. Exact diagnostics are
      // privately keyed; outer module catch-before-finally remains mandatory.
      exactSqlDiagnostic(error);
      throw error;
    }
  }
  function localTarget(lane = "current27") {
    requireReviewedLegacyRelease();
    assert.equal(lane, "current27", "only literal current27 permitted");
    const target = core.localTarget("current27");
    return {
      status: target.status,
      key: target.key,
      request(path, token, body, options = {}) {
        requireReviewedLegacyRelease();
        return target.request(path, token, body, options);
      },
      rpc(name, token, body, options = {}) {
        requireReviewedLegacyRelease();
        return target.rpc(name, token, body, options);
      },
      storage(path, token, body, options = {}) {
        requireReviewedLegacyRelease();
        return target.storage(path, token, body, options);
      },
      signedGet(url, options = {}) {
        requireReviewedLegacyRelease();
        return target.signedGet(url, options);
      },
      quiescence() {
        requireReviewedLegacyRelease();
        return target.quiescence();
      },
    };
  }
  function session(name) {
    requireReviewedLegacyRelease();
    const owned = attachPrivateCapture(core.session(name));
    return {
      child: owned.child,
      done: owned.done,
      output: owned.output,
      send(query) {
        requireReviewedLegacyRelease();
        return owned.send(query);
      },
      close() {
        requireReviewedLegacyRelease();
        return owned.close();
      },
    };
  }
  async function until(check) {
    requireReviewedLegacyRelease();
    return core.until(check);
  }
  function restoreDefaults() {
    requireReviewedLegacyRelease();
    throw new Error(
      "Independent legacy full54 plan unavailable; reset forbidden",
    );
  }
  function resetDisposable(lane = "current27") {
    requireReviewedLegacyRelease();
    assert.equal(lane, "current27");
    throw new Error(
      "Independent legacy full54 plan unavailable; reset forbidden",
    );
  }
  function assertClean() {
    requireReviewedLegacyRelease();
    return core.assertClean();
  }
  async function raceBody(
    name,
    firstQuery,
    secondQuery,
    rejection,
    holderSnapshotSQL,
    receiptPrefix,
  ) {
    requireReviewedLegacyRelease();
    const sessions = [];
    let firstError = null,
      failure = null;
    const plan = plans[namespace][1];
    try {
      rejectionFor(namespace, rejection);
      // No SQL inference, arbitrary case binding or expectation fabrication.
      assert.ok(
        plan.available && plan.expected54 !== null,
        "Independent legacy full54 plan unavailable",
      );
      const first = core.session(`${name}_leader`);
      sessions.push(first);
      attachPrivateCapture(first);
      const second = core.session(`${name}_waiter`);
      sessions.push(second);
      attachPrivateCapture(second);
      first.send(
        `begin; ${firstQuery} ${holderSnapshotSQL ? `select '${namespace === "lifecycle" ? "B3A" : "B3B"}_CENSUS:'||(${holderSnapshotSQL})::text;` : ""} select 'HELD';`,
      );
      second.send(`begin; ${secondQuery} select 'COMPLETED'; commit;`);
      // Deliberately no live commit/lock/acceptance driver before concrete plans.
      originalEvidence(
        namespace,
        first,
        second,
        holderSnapshotSQL,
        receiptPrefix,
      );
      throw new Error("Legacy live driver unavailable; task incomplete");
    } catch (error) {
      firstError = originalSuiteError(error);
      failure = await captureFirst(firstError, plan); // BEFORE this function's OWN finally
      const neutral = neutralSuiteError(firstError);
      neutral.evidence = projectOutgoingEvidence({
        reset_forbidden: true,
        successful_wait_order_credit: false,
        observed_wait_credit: 0,
      });
      throw neutral;
    } finally {
      const settled = await settleSessions(sessions);
      if (!settled && failure)
        supplement(failure, new Error("Legacy settlement incomplete"));
      // Unknown/failure: no census, observation, reset, restore or retry.
      if (firstError)
        assert.equal(privateFailures.get(firstError).original, firstError);
    }
  }
  async function booleanRace(name, firstQuery, secondQuery, rejection = false) {
    requireReviewedLegacyRelease();
    return raceBody(name, firstQuery, secondQuery, rejection, null, null);
  }
  async function sourceRace(name, firstQuery, secondQuery, rejection = null) {
    requireReviewedLegacyRelease();
    return raceBody(name, firstQuery, secondQuery, rejection, null, null);
  }
  async function lifecycleRace(
    name,
    firstQuery,
    secondQuery,
    rejection = null,
    holderSnapshotSQL = null,
  ) {
    requireReviewedLegacyRelease();
    return raceBody(
      name,
      firstQuery,
      secondQuery,
      rejection,
      holderSnapshotSQL,
      null,
    );
  }
  async function cohostRace(
    name,
    firstQuery,
    secondQuery,
    rejection = null,
    holderSnapshotSQL = null,
    receiptPrefix = null,
  ) {
    requireReviewedLegacyRelease();
    return raceBody(
      name,
      firstQuery,
      secondQuery,
      rejection,
      holderSnapshotSQL,
      receiptPrefix,
    );
  }
  const common = {
    quote,
    sql,
    localTarget,
    ok: core.ok,
    session,
    race:
      namespace === "authority" || namespace === "owner"
        ? booleanRace
        : namespace === "sourceSafety"
          ? sourceRace
          : namespace === "lifecycle"
            ? lifecycleRace
            : cohostRace,
  };
  if (namespace === "authority" || namespace === "owner")
    Object.assign(common, {
      auth: namespace === "owner" ? ownerAuth : auth,
      management: namespace === "owner" ? ownerManagement : management,
      trusted,
      restoreDefaults,
      denied(result) {
        assert.ok(
          [400, 401, 403, 404].includes(result.status),
          `Unexpected allowed response status ${result.status}`,
        );
      },
    });
  else Object.assign(common, { until, resetDisposable, assertClean });
  return Object.freeze(common);
}
export const authority = fixedNamespace("authority");
export const owner = fixedNamespace("owner");
export const sourceSafety = fixedNamespace("sourceSafety");
export const lifecycle = fixedNamespace("lifecycle");
export const cohostChat = fixedNamespace("cohostChat");
export function createLegacyCompatibility() {
  requireReviewedLegacyRelease();
  return Object.freeze({
    authority,
    owner,
    sourceSafety,
    lifecycle,
    cohostChat,
  });
}

// Explicit dormant mock invocation only; no injected public core/contact bypass.
export async function runLegacyCompatibilityExamples() {
  let checks = 0;
  function check(value) {
    assert.ok(value);
    checks++;
  }
  function mock(
    stdout = "",
    stderr = "",
    exit = [0, null],
    close = async () => undefined,
  ) {
    const child = { stdout: new EventEmitter(), stderr: new EventEmitter() };
    const owned = { child, done: Promise.resolve(exit), close };
    attachPrivateCapture(owned);
    child.stdout.emit("data", Buffer.from(stdout));
    child.stderr.emit("data", Buffer.from(stderr));
    return owned;
  }
  check(
    Object.values(plans).flat().length === 17 &&
      Object.values(plans)
        .flat()
        .every((plan) => !plan.available && plan.expected54 === null),
  );
  for (const namespace of [
    authority,
    owner,
    sourceSafety,
    lifecycle,
    cohostChat,
  ]) {
    check(
      namespace.sql.length === 1 &&
        namespace.session.length === 1 &&
        namespace.race.length === 3,
    );
    check(
      namespace.ok({ status: 200, body: { original: "private" } }).original ===
        "private",
    );
  }
  check(
    rejectionFor("authority", true)[0] === "42501:Pilot management unavailable",
  );
  const id = "b1000000-0000-4000-8000-000000000001";
  const request = "b1000000-0000-4000-8000-000000000002";
  const expectedAuth = `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
  check(authority.quote("a'b") === "'a''b'");
  check(authority.auth(id) === expectedAuth && owner.auth(id) === expectedAuth);
  const expectedManagement = `${expectedAuth} select * from public.set_pilot_account_admission('${id}','active',0,'Local race','${request}');`;
  check(
    authority.management(id, id, "active", 0, request) === expectedManagement,
  );
  check(owner.management(id, id, "active", 0, request) === expectedManagement);
  assert.throws(() => owner.auth({ id }));
  checks++;
  assert.throws(() => owner.auth("malformed"));
  checks++;
  check(rejectionFor("owner", true).length === 3);
  for (const [namespace, value] of [
    ["authority", null],
    ["owner", "Owner operation unavailable"],
    ["sourceSafety", false],
    ["lifecycle", "Hangout chat unavailable"],
    ["cohostChat", "arbitrary"],
  ]) {
    assert.throws(() => rejectionFor(namespace, value));
    checks++;
  }
  check(rejectionFor("sourceSafety", null).length === 0);
  for (const pair of knownPairs) {
    const colon = pair.indexOf(":"),
      code = pair.slice(0, colon),
      message = pair.slice(colon + 1);
    check(
      streamDiagnostic(`ERROR:  ${code}: ${message}\n`).message === message,
    );
  }
  check(
    streamDiagnostic(
      "ERROR:  23503: private foreign key value\nDETAIL:  private key\n",
    ).code === "23503",
  );
  check(
    streamDiagnostic(
      "ERROR:  42501: Owner operation unavailable\nCONTEXT:  SQL statement \"select\nprivate nested 'data'\nfrom private.synthetic\"\nPL/pgSQL function private.synthetic() line 1 at SQL statement\nSQL statement \"select 'nested'\"\nLOCATION:  opaque\n",
    ).message === "Owner operation unavailable",
  );
  for (const text of [
    "ERROR: 42501: Owner operation unavailable\n",
    "ERROR:  42501: Owner operation unavailable\nERROR:  42501: Owner operation unavailable\n",
    "ERROR:  42501: Owner operation unavailable\ntrailing",
    'ERROR:  42501: Owner operation unavailable\nCONTEXT:  SQL statement "open\n',
    "ERROR:  42501: Owner operation unavailable\nUNKNOWN:  value\n",
    "ERROR:  42501: Owner operation unavailable\n\n",
    "ERROR:  42501: Owner operation unavailable\nDETAIL:  opaque\nHINT:  hint\nDETAIL:  repeated\n",
  ]) {
    check(streamDiagnostic(text).code === "unavailable");
  }
  check(
    streamDiagnostic("ERROR:  42501: Owner operation unavailable suffix\n")
      .code === "unavailable",
  );
  const good = mock("COMPLETED\n");
  check(await settleSessions([good]));
  check(sessionState(good).kind === "ordinary");
  const denied = mock("", "ERROR:  42501: Owner operation unavailable\n", [
    1,
    null,
  ]);
  check(await settleSessions([denied]));
  check(sessionState(denied).kind === "known-diagnostic");
  const aborted = mock("", "ERROR:  40P01: deadlock detected\n", [1, null]);
  await settleSessions([aborted]);
  check(sessionState(aborted).kind === "safe-abort");
  for (const [out, err, exit] of [
    ["COMPLETED\n", "", [1, null]],
    ["", "", [1, null]],
    ["COMPLETED\n", "", [0, "SIGTERM"]],
    ["", "", undefined],
    ["COMPLETED\n", "ERROR:  42501: Owner operation unavailable\n", [0, null]],
    ["COMPLETED\nERROR: synthetic stdout error\n", "", [0, null]],
  ]) {
    const owned = mock(out, err, exit);
    if (exit === undefined) owned.done = Promise.resolve(undefined);
    await settleSessions([owned]);
    check(sessionState(owned).kind === "unavailable");
  }
  const bound = {
    available: true,
    expected54: null,
    classification: "denial",
    expectedDenial: "42501:Owner operation unavailable",
    holder: { pid: 11, name: "owned_leader" },
    waiter: { pid: 12, name: "owned_waiter" },
  };
  const observed = {
    holder_pid: 11,
    waiter_pid: 12,
    holder_name: "owned_leader",
    waiter_name: "owned_waiter",
    holder_count: 1,
    waiter_count: 1,
    blockers: [11],
    ungranted: true,
  };
  check(bindingObserved(bound, observed));
  for (const change of [
    { holder_pid: 12 },
    { waiter_count: 2 },
    { blockers: [13] },
    { ungranted: false },
    { holder_name: "wrong" },
  ])
    check(!bindingObserved(bound, { ...observed, ...change }));
  check(!acceptance(bound, sessionState(denied), observed, true).accepted);
  check(
    !acceptance(
      { ...bound, expected54: {} },
      sessionState(aborted),
      observed,
      true,
    ).accepted,
  );
  check(
    safeAbortPartition(
      plans.owner[1],
      sessionState(aborted),
      sessionState(good),
      true,
    ).classified &&
      !safeAbortPartition(
        plans.owner[1],
        sessionState(aborted),
        sessionState(good),
        true,
      ).qualified,
  );
  const absent = {
    holder_pid_absent: true,
    waiter_pid_absent: true,
    leader_absent: true,
    holder_name_absent: true,
    waiter_name_absent: true,
  };
  check(absenceBound(bound, absent));
  check(!absenceBound(bound, { ...absent, leader_absent: false }));
  check(!resetPermitted(bound, true, true, true, true, false));
  check(
    !resetPermitted(
      { ...bound, expected54: {} },
      true,
      true,
      true,
      false,
      false,
    ),
  );
  check(
    !resetPermitted({ ...bound, expected54: {} }, true, true, true, true, true),
  );
  const quiet = {
    available: true,
    quiescent: true,
    started: 2,
    settled: 2,
    pending: 0,
    failed: 0,
    uncertain: 0,
  };
  check(requestQuiescent(quiet));
  for (const change of [
    { settled: 1 },
    { pending: 1 },
    { failed: 1 },
    { uncertain: 1 },
    { quiescent: false },
    { available: false },
    { extra: "private" },
  ])
    check(!requestQuiescent({ ...quiet, ...change }));
  const partial = mock();
  partial.child.stderr.emit("error", new Error("private listener failure"));
  check(!(await settleSessions([partial])));
  const full = mock();
  full.child.stdout.emit("data", Buffer.alloc(limit));
  full.child.stderr.emit("data", Buffer.from("x"));
  check(
    privateSessions.get(full).bytes === limit &&
      privateSessions.get(full).failure !== null,
  );
  check(!(await settleSessions([full])));
  const attachment = {
    child: {
      stdout: new EventEmitter(),
      stderr: {
        on() {
          throw new Error("private attach failure");
        },
      },
    },
    close: async () => undefined,
    done: Promise.resolve([0, null]),
  };
  attachPrivateCapture(attachment);
  check(
    !(await settleSessions([attachment])) && privateSessions.has(attachment),
  );
  const closeOrder = [];
  const a = mock("", "", [0, null], async () => {
    closeOrder.push("a");
    throw new Error("private close");
  });
  const b = mock("", "", [0, null], async () => {
    closeOrder.push("b");
  });
  check(
    !(await settleSessions([a, b])) &&
      closeOrder.length === 2 &&
      privateSessions.get(a).done.status === "fulfilled",
  );
  const receipt = [
    {
      message_id: "b3b00000-0000-4000-8002-000000000001",
      sequence: 7,
      body: "private original body",
      created_at: "2026-09-29T00:00:00Z",
      mine: true,
      author_id: "private actual UUID",
      author_label: null,
    },
  ];
  const encoded = `B3B_RECEIPT:${JSON.stringify(receipt)}\n`;
  const holder = mock(
      `B3B_CENSUS:${JSON.stringify({ messages: receipt })}\n${encoded}`,
    ),
    waiter = mock(encoded);
  const evidence = originalEvidence(
    "cohostChat",
    holder,
    waiter,
    "private original SQL",
    "B3B_RECEIPT:",
  );
  check(
    evidence.holder_snapshot.messages[0].body === receipt[0].body &&
      evidence.receipts_equal,
  );
  const changed = mock(
    `B3B_RECEIPT:${JSON.stringify([{ ...receipt[0], created_at: "different original time" }])}\n`,
  );
  assert.throws(() =>
    originalEvidence("cohostChat", holder, changed, null, "B3B_RECEIPT:"),
  );
  checks++;
  const old = mock(
    `B3A_CENSUS:${JSON.stringify({ sources: [{ id: "private UUID" }] })}\n`,
  );
  check(
    originalEvidence("lifecycle", old, mock(), "original SQL", null)
      .holder_snapshot.sources[0].id === "private UUID",
  );
  const first = new Error("private SQL token narrative UUID");
  const neutral = neutralSuiteError(first);
  check(
    originalSuiteError(neutral) === first &&
      exactSqlDiagnostic(neutral).code === "unavailable",
  );
  const trace = [];
  try {
    try {
      throw first;
    } catch (error) {
      await captureFirst(error, plans.owner[1]);
      trace.push("first receipt");
      throw error;
    } finally {
      trace.push("own finally");
    }
  } catch (error) {
    check(error === first);
  }
  check(trace.join(",") === "first receipt,own finally");
  const state = privateFailures.get(first);
  const second = new Error("private supplemental provider");
  const supplemental = supplement(state, second);
  check(
    state.original === first &&
      state.supplements[0] === second &&
      supplemental.completed_order_credit === 0,
  );
  const safe = JSON.stringify(localReceipts.get(first));
  check(
    !safe.includes(first.message) &&
      !JSON.stringify(supplemental).includes(second.message),
  );
  check(!(await deliverLocal(safeReceipt(null, first, []), () => false)));
  check(
    !(await deliverLocal(safeReceipt(null, first, []), () => {
      throw second;
    })),
  );
  check(
    !(await deliverLocal(
      safeReceipt(null, first, []),
      () => new Promise(() => {}),
    )),
  );
  check(
    projectCensusEvidence({ private: receipt })["auth.users"].available ===
      false,
  );
  return Object.freeze({
    checks,
    targetContacts: 0,
    permissionCredit: 0,
    resetCredit: 0,
  });
}
