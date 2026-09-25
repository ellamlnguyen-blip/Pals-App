import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

test("a consented event reaches only the local sink with the reviewed envelope", async (context) => {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({ url: request.url, headers: request.headers, body });
    response.writeHead(200, { "content-type": "application/json" });
    response.end("{}");
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
  } catch (error) {
    if (error.code === "EPERM") {
      context.skip(
        "This sandbox blocks loopback listeners; run with local network permission.",
      );
      return;
    }
    throw error;
  }
  const address = server.address();
  const sink = `http://127.0.0.1:${address.port}/capture/`;
  const directory = await mkdtemp(join(tmpdir(), "pals-analytics-sink-"));
  const oldWindow = globalThis.window;
  const oldFetch = globalThis.fetch;
  const source = new URL("../apps/web/", import.meta.url);
  try {
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
    const { BrowserAnalytics } = await import(
      pathToFileURL(join(directory, "analytics.mjs"))
    );
    const actor = "1f11a3e3-a5c1-4ad1-a57a-3a72c432ad9e";
    const token = "local-test-palsanalytics";
    globalThis.window = new EventTarget();
    globalThis.fetch = (url, init) =>
      url === "/api/analytics/access"
        ? Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ kind: "ok", actor, sink, token }),
          })
        : oldFetch(url, init);
    const analytics = new BrowserAnalytics();
    await analytics.capture("hangout_left");
    assert.equal(requests.length, 0);
    await analytics.optIn();
    await analytics.capture("hangout_left");
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.url, "/capture/");
    assert.equal(request.headers["content-type"], "application/json");
    assert.equal(request.headers.referer, undefined);
    assert.equal(request.headers.authorization, undefined);
    const payload = JSON.parse(request.body);
    assert.deepEqual(Object.keys(payload).sort(), [
      "api_key",
      "distinct_id",
      "event",
      "properties",
    ]);
    assert.deepEqual(payload.properties, {
      schema_version: 1,
      $process_person_profile: false,
    });
    assert.equal(payload.event, "hangout_left");
    assert.equal(payload.api_key, token);
    assert.match(payload.distinct_id, /^[\da-f-]{36}$/i);
    assert.doesNotMatch(request.body, new RegExp(actor));
    analytics.optOut();
    await analytics.capture("hangout_left");
    assert.equal(requests.length, 1);
    analytics.dispose();
  } finally {
    globalThis.window = oldWindow;
    globalThis.fetch = oldFetch;
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
