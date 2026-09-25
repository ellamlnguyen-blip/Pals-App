import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = new URL("../apps/web/", import.meta.url);
const sink = "http://127.0.0.1:4019/capture/";
const token = "local-test-palsanalytics";
const accountA = "1f11a3e3-a5c1-4ad1-a57a-3a72c432ad9e";
const accountB = "2f11a3e3-a5c1-4ad1-a57a-3a72c432ad9e";

async function loadBrowserAnalytics() {
  const directory = await mkdtemp(join(tmpdir(), "pals-analytics-test-"));
  for (const [from, to] of [
    ["app/auth-transition.ts", "auth-transition.mjs"],
    ["lib/analytics-core.ts", "analytics-core.mjs"],
    ["lib/analytics.ts", "analytics.mjs"],
  ]) {
    let code = ts.transpileModule(
      await readFile(new URL(from, source), "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      },
    ).outputText;
    code = code
      .replace('"../app/auth-transition"', '"./auth-transition.mjs"')
      .replace('"./analytics-core"', '"./analytics-core.mjs"');
    await writeFile(join(directory, to), code);
  }
  const importedModule = await import(
    pathToFileURL(join(directory, "analytics.mjs"))
  );
  return {
    BrowserAnalytics: importedModule.BrowserAnalytics,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

test("browser adapter stays off, rechecks identity, and revokes across tabs", async () => {
  const oldWindow = globalThis.window;
  const oldFetch = globalThis.fetch;
  globalThis.window = new EventTarget();
  let actor = accountA;
  let accessStatus = 200;
  const captures = [];
  let accessCount = 0;
  globalThis.fetch = async (url, init) => {
    if (url === "/api/analytics/access") {
      accessCount++;
      return {
        ok: accessStatus === 200,
        status: accessStatus,
        json: async () => ({ kind: "ok", actor, sink, token }),
      };
    }
    captures.push({ url, init });
    return { ok: true };
  };
  const { BrowserAnalytics, cleanup } = await loadBrowserAnalytics();
  const first = new BrowserAnalytics();
  const second = new BrowserAnalytics();
  try {
    await first.capture("hangout_created");
    assert.equal(accessCount, 0);
    assert.equal(captures.length, 0);
    await first.optIn();
    assert.equal(first.getSnapshot(), "on");
    assert.equal(second.getSnapshot(), "off");
    await first.capture("hangout_created");
    assert.equal(captures.length, 1);
    const firstVisit = JSON.parse(captures[0].init.body).distinct_id;
    assert.equal(captures[0].url, sink);
    assert.equal(new URL(captures[0].url).search, "");
    assert.deepEqual(captures[0].init.headers, {
      "content-type": "application/json",
    });
    assert.equal(captures[0].init.credentials, "omit");
    assert.equal(captures[0].init.redirect, "error");
    assert.equal(captures[0].init.referrerPolicy, "no-referrer");
    assert.deepEqual(JSON.parse(captures[0].init.body), {
      api_key: token,
      event: "hangout_created",
      distinct_id: firstVisit,
      properties: { schema_version: 1, $process_person_profile: false },
    });
    assert.doesNotMatch(JSON.stringify(captures), new RegExp(accountA));
    await first.capture("hangout_created", { account: accountA });
    await first.capture("unknown-event");
    assert.equal(captures.length, 1);
    await second.optIn();
    assert.equal(second.getSnapshot(), "on");
    first.optOut();
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(first.getSnapshot(), "off");
    assert.equal(second.getSnapshot(), "off");
    await second.capture("hangout_created");
    assert.equal(captures.length, 1);

    await first.optIn();
    actor = accountB; // Cookie changed without any cross-tab signal.
    await first.capture("hangout_created");
    assert.equal(first.getSnapshot(), "off");
    assert.equal(captures.length, 1);

    actor = accountA;
    await first.optIn();
    await first.capture("calendar_viewed");
    const resumedVisit = JSON.parse(captures.at(-1).init.body).distinct_id;
    assert.notEqual(resumedVisit, firstVisit);
    window.dispatchEvent(new Event("focus"));
    assert.equal(first.getSnapshot(), "checking");
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(first.getSnapshot(), "on");
    await first.capture("notifications_viewed");
    assert.equal(
      JSON.parse(captures.at(-1).init.body).distinct_id,
      resumedVisit,
    );
    const sentBeforeDenial = captures.length;
    accessStatus = 403;
    window.dispatchEvent(new Event("pageshow"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(first.getSnapshot(), "off");
    await first.capture("hangout_created");
    assert.equal(captures.length, sentBeforeDenial);

    accessStatus = 200;
    await first.optIn();
    window.dispatchEvent(
      new CustomEvent("pals-auth-transition-local", {
        detail: { phase: "begin", token: "transition-one" },
      }),
    );
    assert.equal(first.getSnapshot(), "checking");
    await first.capture("hangout_created");
    assert.equal(captures.length, sentBeforeDenial);
    window.dispatchEvent(
      new CustomEvent("pals-auth-transition-local", {
        detail: { phase: "cancelled", token: "transition-one" },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(first.getSnapshot(), "on");
    accessStatus = 503;
    await first.capture("hangout_created");
    assert.equal(first.getSnapshot(), "error");
    assert.equal(captures.length, sentBeforeDenial);
    await first.capture("hangout_created");
    assert.equal(captures.length, sentBeforeDenial);
  } finally {
    first.dispose();
    second.dispose();
    globalThis.fetch = oldFetch;
    globalThis.window = oldWindow;
    await cleanup();
  }
});

test("stale access, transport failure and reload never backfill", async () => {
  const oldWindow = globalThis.window;
  const oldFetch = globalThis.fetch;
  globalThis.window = new EventTarget();
  let releaseAccess;
  let sent = 0;
  globalThis.fetch = async (url) => {
    if (url === "/api/analytics/access")
      return await new Promise((resolve) => {
        releaseAccess = resolve;
      });
    sent++;
    throw Error("blocked sink");
  };
  const { BrowserAnalytics, cleanup } = await loadBrowserAnalytics();
  const tab = new BrowserAnalytics();
  try {
    const pending = tab.optIn();
    tab.optOut();
    releaseAccess({
      ok: true,
      json: async () => ({ kind: "ok", actor: accountA, sink, token }),
    });
    await pending;
    assert.equal(tab.getSnapshot(), "off");
    await tab.capture("hangout_created");
    assert.equal(sent, 0);
    const reloadedTab = new BrowserAnalytics();
    assert.equal(reloadedTab.getSnapshot(), "off");
    await reloadedTab.capture("hangout_created");
    assert.equal(sent, 0);
    reloadedTab.dispose();

    globalThis.fetch = async (url) => {
      if (url === "/api/analytics/access")
        return {
          ok: true,
          json: async () => ({ kind: "ok", actor: accountA, sink, token }),
        };
      sent++;
      throw Error("blocked sink");
    };
    await tab.optIn();
    await tab.capture("hangout_created");
    assert.equal(sent, 1);
    assert.equal(tab.getSnapshot(), "on");
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(sent, 1);
  } finally {
    tab.dispose();
    globalThis.fetch = oldFetch;
    globalThis.window = oldWindow;
    await cleanup();
  }
});
