import assert from "node:assert/strict";
import test from "node:test";
import { recordThreadAttention } from "./thread-attention.ts";

const actor = "11111111-1111-4111-8111-111111111111";
const source = "22222222-2222-4222-8222-222222222222";

test("foreground attention touches before acknowledging only the supplied page end", async () => {
  const calls = [];
  const fetcher = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return { ok: true };
  };
  assert.equal(
    await recordThreadAttention(actor, "dm", source, 17, true, fetcher),
    true,
  );
  assert.deepEqual(calls, [
    { action: "touch", kind: "dm", sourceId: source },
    { action: "ack", sequence: 17, kind: "dm", sourceId: source },
  ]);
});

test("empty accepted thread touches without ack; pending page may ack without touch", async () => {
  const calls = [];
  const fetcher = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return { ok: true };
  };
  await recordThreadAttention(actor, "hangout", source, null, true, fetcher);
  await recordThreadAttention(actor, "dm", source, 3, false, fetcher);
  assert.deepEqual(
    calls.map((call) => call.action),
    ["touch", "ack"],
  );
});

test("denied touch does not continue to acknowledgment", async () => {
  const calls = [];
  const fetcher = async (_url, options) => {
    calls.push(JSON.parse(options.body).action);
    return { ok: false };
  };
  assert.equal(
    await recordThreadAttention(actor, "dm", source, 9, true, fetcher),
    false,
  );
  assert.deepEqual(calls, ["touch"]);
});
