import test from "node:test";
import assert from "node:assert/strict";
import { ELLA_POLICY_OWNER_ID, parsePolicyIntent, policyAuthStatus, policyOperatorAllowed, policyRpcStatus, policyTarget } from "../lib/policy.ts";

const payload = {
  key: "hangouts", enabled: true, revision: 2, reason: "Staging smoke test",
  requestId: "00000000-0000-4000-8000-000000000001", confirmTarget: "hangouts:on",
};

test("policy key, revision, reason, UUID and exact target are required", () => {
  assert.deepEqual(parsePolicyIntent(payload), payload);
  for (const changed of [
    { key: "analytics" }, { key: "large_hangout_safeguards" }, { key: "other" },
    { revision: 0 }, { revision: 1.2 }, { reason: " " }, { reason: "x".repeat(2001) },
    { requestId: "wrong" }, { confirmTarget: "hangouts:off" },
  ]) assert.equal(parsePolicyIntent({ ...payload, ...changed }), null);
  assert.equal(parsePolicyIntent({ ...payload, extra: "field" }), null);
});

test("exact-payload retry keeps the request identity and target", () => {
  const saved = structuredClone(payload);
  assert.deepEqual(parsePolicyIntent(saved), payload);
  assert.equal(policyTarget(saved.key, saved.enabled), saved.confirmTarget);
  assert.equal(saved.requestId, payload.requestId);
});

test("fixed Ella, active account and AAL2 factor pass route preflight", () => {
  const allowed = (id, status, aal, factor) =>
    policyOperatorAllowed(id, status, aal, factor);
  assert.equal(allowed(ELLA_POLICY_OWNER_ID, "active", "aal2", true), true);
  assert.equal(allowed("00000000-0000-4000-8000-000000000002", "active", "aal2", true), false);
  assert.equal(allowed(ELLA_POLICY_OWNER_ID, "suspended", "aal2", true), false);
  assert.equal(allowed(ELLA_POLICY_OWNER_ID, "active", "aal1", true), false);
  assert.equal(allowed(ELLA_POLICY_OWNER_ID, "active", "aal2", false), false);
});

test("only definite database permission denial clears authority; uncertain outcomes retain retry", () => {
  assert.equal(policyRpcStatus({ code: "42501" }, false), 403);
  assert.equal(policyRpcStatus({ code: "PGRST301" }, false), 503);
  assert.equal(policyRpcStatus({ code: "XX000" }, false), 503);
  assert.equal(policyRpcStatus(null, false), 503);
  assert.equal(policyRpcStatus(null, true), 200);
  assert.equal(policyAuthStatus({ status: 401 }, undefined), 403);
  assert.equal(policyAuthStatus({ status: 500 }, undefined), 503);
  assert.equal(policyAuthStatus(null, ELLA_POLICY_OWNER_ID), 200);
});
