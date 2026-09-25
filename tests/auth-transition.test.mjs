import assert from "node:assert/strict";
import test from "node:test";
import {
  authTransitionDecision,
  authVerificationDecision,
  beginAuthTransition,
  settleAuthTransition,
  announceCompletedAuthCallback,
} from "../apps/web/app/auth-transition.ts";
import { createDmAuthVerifier } from "../apps/web/app/chats/dm-auth-verifier.ts";

function browser(pathname, search = "") {
  const data = new Map();
  const events = [];
  globalThis.location = { pathname, search };
  globalThis.sessionStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  globalThis.CustomEvent = class {
    constructor(type, init) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  globalThis.window = {
    dispatchEvent: (event) => {
      events.push(event.detail);
    },
  };
  globalThis.BroadcastChannel = class {
    postMessage() {}
    close() {}
  };
  return events;
}

test("signout marker only starts a probe; the old account stays masked", () => {
  const events = browser("/hangouts");
  beginAuthTransition("signout");
  assert.equal(events[0].intent, "signout");
  const pending = new Set();
  assert.equal(authTransitionDecision(pending, events[0]), "mask");
  assert.equal(settleAuthTransition(), false, "button event is not completion");
  assert.equal(
    authTransitionDecision(pending, { phase: "revalidate" }),
    "wait",
  );
  assert.equal(
    authTransitionDecision(pending, { phase: "settled", token: "different" }),
    "wait",
  );
  globalThis.location.pathname = "/signin";
  assert.equal(settleAuthTransition(), false, "path alone is not completion");
  globalThis.location.search = "?pals_auth_done=signin";
  assert.equal(settleAuthTransition(), false, "wrong intent cannot settle");
  globalThis.location.search = "?pals_auth_done=signout";
  assert.equal(settleAuthTransition(), true);
  assert.equal(authTransitionDecision(pending, events[1]), "verify");
  assert.equal(
    authVerificationDecision(pending, events[1], 200),
    "wait",
    "a spoofed or early marker cannot reveal old-account text",
  );
  assert.equal(pending.size, 1);
  assert.equal(
    authVerificationDecision(pending, events[1], 503),
    "wait",
    "an uncertain probe remains masked",
  );
  assert.equal(
    authVerificationDecision(pending, events[1], 403),
    "deny",
    "server rejection denies the stale thread",
  );
  assert.equal(pending.size, 0, "a terminal denial stops transition probes");
});

test("sign-in failure can settle on the same page; callback revalidates other tabs", () => {
  const events = browser("/signin");
  beginAuthTransition("signin");
  assert.equal(events[0].intent, "signin");
  const pending = new Set();
  assert.equal(authTransitionDecision(pending, events[0]), "mask");
  assert.equal(settleAuthTransition(), false);
  assert.equal(
    settleAuthTransition(true),
    true,
    "failed action completed without navigation",
  );
  assert.equal(authTransitionDecision(pending, events[1]), "verify");
  assert.equal(
    authVerificationDecision(pending, events[1], 200),
    "reauthorize",
    "a failed sign-in may restore the old account only after a fresh server read",
  );
  announceCompletedAuthCallback();
  assert.equal(authTransitionDecision(pending, events[2]), "reauthorize");
});

test("overlapping account transitions keep inbox text masked until every token is verified", () => {
  const pending = new Set();
  const first = { phase: "begin", token: "first" };
  const second = { phase: "begin", token: "second" };
  assert.equal(authTransitionDecision(pending, first), "mask");
  assert.equal(authTransitionDecision(pending, second), "mask");
  assert.equal(pending.size, 2);
  const firstCancelled = { phase: "cancelled", token: "first" };
  assert.equal(authTransitionDecision(pending, firstCancelled), "verify");
  assert.equal(authVerificationDecision(pending, firstCancelled, 200), "wait");
  assert.deepEqual([...pending], ["second"]);
  assert.equal(
    authTransitionDecision(pending, { phase: "revalidate" }),
    "wait",
  );
  assert.equal(
    authTransitionDecision(pending, { phase: "settled", token: "stale" }),
    "wait",
  );
  const secondCancelled = { phase: "cancelled", token: "second" };
  assert.equal(authTransitionDecision(pending, secondCancelled), "verify");
  assert.equal(authVerificationDecision(pending, secondCancelled, 503), "wait");
  assert.equal(pending.size, 1);
  assert.equal(
    authVerificationDecision(pending, secondCancelled, 200),
    "reauthorize",
  );
  assert.equal(pending.size, 0);
});

test("overlapping completion re-probes an invalidated settled token before revealing requests", async () => {
  const pending = new Set(["first", "second"]);
  const settled = new Map([["first", "cancelled"]]);
  const probes = [];
  let revision = 1;
  let reveals = 0;
  const verify = createDmAuthVerifier({
    pending,
    settled,
    revision: () => revision,
    active: (startedAt) => startedAt === revision,
    probe: () => new Promise((resolve) => probes.push(resolve)),
    deny: () => assert.fail("account remained authorized"),
    reauthorize: () => reveals++,
  });
  const first = verify({ phase: "cancelled", token: "first" });
  assert.equal(probes.length, 1);
  revision++;
  settled.set("second", "cancelled");
  const second = verify({ phase: "cancelled", token: "second" });
  assert.equal(probes.length, 2);
  probes[0](200);
  await first;
  assert.deepEqual([...pending], ["first", "second"]);
  probes[1](200);
  await second;
  assert.deepEqual([...pending], ["first"]);
  assert.equal(probes.length, 3, "settled first token gets a fresh probe");
  assert.equal(reveals, 0, "requests remain masked between probes");
  probes[2](200);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pending.size, 0);
  assert.equal(reveals, 1);
});

test("direct thread re-probes an invalidated cancelled token before reloading bodies", async () => {
  const pending = new Set(["first", "second"]);
  const settled = new Map([["first", "cancelled"]]);
  const probes = [];
  let ticket = 1;
  let reloads = 0;
  const verify = createDmAuthVerifier({
    pending,
    settled,
    revision: () => ticket,
    active: (startedAt) => startedAt === ticket,
    probe: () => new Promise((resolve) => probes.push(resolve)),
    deny: () => assert.fail("account remained authorized"),
    reauthorize: () => {
      ticket++;
      reloads++;
    },
  });
  const first = verify({ phase: "cancelled", token: "first" });
  ticket++; // A second begin masks the direct thread and invalidates the first probe.
  settled.set("second", "cancelled");
  const second = verify({ phase: "cancelled", token: "second" });
  probes[1](200);
  await second;
  assert.equal(probes.length, 3, "first token is re-probed");
  assert.equal(
    reloads,
    0,
    "no direct bodies are requested while one token remains",
  );
  probes[0](200);
  await first;
  assert.deepEqual([...pending], ["first"]);
  probes[2](200);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pending.size, 0);
  assert.equal(reloads, 1);
});
