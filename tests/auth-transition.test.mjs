import assert from "node:assert/strict";
import test from "node:test";
import {
  authTransitionDecision,
  beginAuthTransition,
  settleAuthTransition,
  announceCompletedAuthCallback,
} from "../apps/web/app/auth-transition.ts";

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

test("signout stays masked until its destination and matching completion", () => {
  const events = browser("/hangouts");
  beginAuthTransition("signout");
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
  assert.equal(authTransitionDecision(pending, events[1]), "reauthorize");
  assert.equal(pending.size, 0);
});

test("sign-in failure can settle on the same page; callback revalidates other tabs", () => {
  const events = browser("/signin");
  beginAuthTransition("signin");
  const pending = new Set();
  assert.equal(authTransitionDecision(pending, events[0]), "mask");
  assert.equal(settleAuthTransition(), false);
  assert.equal(
    settleAuthTransition(true),
    true,
    "failed action completed without navigation",
  );
  assert.equal(authTransitionDecision(pending, events[1]), "reauthorize");
  announceCompletedAuthCallback();
  assert.equal(authTransitionDecision(pending, events[2]), "reauthorize");
});
