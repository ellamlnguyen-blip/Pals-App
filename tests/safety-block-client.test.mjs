import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../apps/web/app/safety/safety-client.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const reply = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const actor = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";

function client() {
  const states = [];
  const refs = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const hooks = {
    useState(initial) {
      const slot = cursor++;
      if (!(slot in states)) states[slot] = initial;
      return [
        states[slot],
        (value) => {
          states[slot] =
            typeof value === "function" ? value(states[slot]) : value;
        },
      ];
    },
    useRef(initial) {
      const slot = cursor++;
      if (!(slot in refs)) refs[slot] = { current: initial };
      return refs[slot];
    },
    useEffect() {
      cursor++;
    },
    useCallback(callback) {
      cursor++;
      return callback;
    },
  };
  const loaded = { exports: {} };
  const context = {
    module: loaded,
    exports: loaded.exports,
    crypto: { randomUUID },
    BroadcastChannel: class {
      postMessage() {}
      close() {}
    },
    document: { hidden: false },
    require(name) {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime")
        return { jsx, jsxs: jsx, Fragment: Symbol.for("fragment") };
      if (name.endsWith("auth-transition"))
        return {
          AUTH_TRANSITION_CHANNEL: "auth",
          AUTH_TRANSITION_EVENT: "auth",
        };
      if (name.endsWith("safety-public"))
        return { globalConfirmationVersion: "test-confirmation" };
      if (name.endsWith(".css")) return {};
      throw Error(`Unexpected client dependency: ${name}`);
    },
  };
  vm.runInNewContext(
    `${compiled}\nmodule.exports.__testBlockDialog = BlockDialog;`,
    context,
  );
  return {
    render(props) {
      cursor = 0;
      return loaded.exports.__testBlockDialog(props);
    },
  };
}

function subscribedClient(fetchResponse) {
  const states = [];
  const refs = [];
  const memos = [];
  const effects = [];
  const listeners = new Map();
  const channels = new Map();
  let cursor = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const changed = (before, after) =>
    !before ||
    !after ||
    before.length !== after.length ||
    before.some((value, index) => !Object.is(value, after[index]));
  const hooks = {
    useState(initial) {
      const slot = cursor++;
      if (!(slot in states))
        states[slot] = typeof initial === "function" ? initial() : initial;
      return [
        states[slot],
        (value) => {
          states[slot] =
            typeof value === "function" ? value(states[slot]) : value;
        },
      ];
    },
    useRef(initial) {
      const slot = cursor++;
      if (!(slot in refs)) refs[slot] = { current: initial };
      return refs[slot];
    },
    useCallback(callback, deps) {
      const slot = cursor++;
      if (!memos[slot] || changed(memos[slot].deps, deps))
        memos[slot] = { value: callback, deps };
      return memos[slot].value;
    },
    useEffect(callback, deps) {
      const slot = cursor++;
      if (!effects[slot] || changed(effects[slot].deps, deps)) {
        effects[slot]?.cleanup?.();
        effects[slot] = { deps, callback, pending: true };
      }
    },
  };
  const events = (scope) => ({
    addEventListener(name, callback) {
      const key = `${scope}:${name}`;
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(callback);
    },
    removeEventListener(name, callback) {
      listeners.get(`${scope}:${name}`)?.delete(callback);
    },
  });
  const document = { hidden: false, ...events("document") };
  const window = events("window");
  class BroadcastChannel {
    constructor(name) {
      this.name = name;
      if (!channels.has(name)) channels.set(name, new Set());
      channels.get(name).add(this);
    }
    postMessage() {}
    close() {
      channels.get(this.name)?.delete(this);
    }
  }
  const loaded = { exports: {} };
  const context = {
    module: loaded,
    exports: loaded.exports,
    crypto: { randomUUID },
    BroadcastChannel,
    AbortController,
    document,
    window,
    fetch: fetchResponse,
    queueMicrotask,
    require(name) {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime")
        return { jsx, jsxs: jsx, Fragment: Symbol.for("fragment") };
      if (name.endsWith("auth-transition"))
        return {
          AUTH_TRANSITION_CHANNEL: "auth",
          AUTH_TRANSITION_EVENT: "auth",
        };
      if (name.endsWith("safety-public"))
        return { globalConfirmationVersion: "test-confirmation" };
      if (name.endsWith(".css")) return {};
      throw Error(`Unexpected client dependency: ${name}`);
    },
  };
  vm.runInNewContext(compiled, context);
  return {
    render() {
      cursor = 0;
      const tree = loaded.exports.SafetyDashboard({ actor });
      for (const effect of effects) {
        if (effect?.pending) {
          effect.pending = false;
          effect.cleanup = effect.callback();
        }
      }
      return tree;
    },
    emit(scope, name, detail) {
      for (const callback of listeners.get(`${scope}:${name}`) ?? [])
        callback({ type: name, detail });
    },
    broadcast(name, data) {
      for (const channel of channels.get(name) ?? [])
        channel.onmessage?.({ data });
    },
    document,
  };
}

function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== "object") return [];
  return [node, ...descendants(node.props.children)];
}
function label(node) {
  const value = node.props.children;
  return Array.isArray(value)
    ? value.map((x) => (typeof x === "string" ? x : "")).join("")
    : value;
}
function button(tree, name) {
  const result = descendants(tree).find(
    (x) => x.type === "button" && label(x) === name,
  );
  assert.ok(result, `button ${name} exists`);
  return result;
}
function text(tree) {
  return descendants(tree)
    .flatMap((x) => {
      const value = x.props.children;
      return Array.isArray(value)
        ? value.filter((v) => typeof v === "string")
        : typeof value === "string"
          ? [value]
          : [];
    })
    .join(" ");
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

function dialog(blocked, fetchSafety, onConfirmed = () => {}) {
  const mounted = client();
  const generation = { current: 0 };
  let authorized = true;
  const safety = {
    phase: "ready",
    generation,
    sender: randomUUID(),
    valid: (ticket) => authorized && ticket === generation.current,
    fetchSafety,
    deny: () => {
      authorized = false;
      generation.current++;
    },
  };
  const props = { actor, id, blocked, safety, onClose() {}, onConfirmed };
  return {
    render: () => mounted.render(props),
    mask: () => {
      authorized = false;
      generation.current++;
    },
  };
}

for (const order of [
  {
    name: "block then unblock",
    start: false,
    commits: [true, false],
    final: false,
  },
  {
    name: "unblock then block",
    start: true,
    commits: [false, true],
    final: true,
  },
]) {
  test(`contrary requests committed ${order.name} show final exact state`, async () => {
    let database = order.start;
    const mutations = [];
    const exacts = [];
    let confirmed = 0;
    const fetchSafety = (path, init) => {
      if (init?.method === "POST") {
        const call = deferred();
        mutations.push({ requested: JSON.parse(init.body).blocked, ...call });
        return call.promise;
      }
      assert.equal(path, `?view=exact&id=${id}`);
      const call = deferred();
      exacts.push(call);
      return call.promise;
    };
    const block = dialog(true, fetchSafety, () => confirmed++);
    const unblock = dialog(false, fetchSafety, () => confirmed++);
    button(block.render(), "Block this account").props.onClick();
    button(unblock.render(), "Unblock this ID").props.onClick();
    assert.equal(mutations.length, 2);
    assert.equal(
      button(block.render(), "Check blocked IDs").props.disabled,
      true,
    );
    assert.equal(
      button(unblock.render(), "Check blocked IDs").props.disabled,
      true,
    );
    for (const requested of order.commits) {
      const call = mutations.find((item) => item.requested === requested);
      database = requested;
      call.resolve(reply({ kind: "ok" }));
      await flush();
    }
    assert.equal(exacts.length, 2, "each response causes one exact read");
    for (const exact of exacts)
      exact.resolve(reply({ kind: "ok", actor, blocked: database }));
    await flush();
    assert.equal(database, order.final);
    assert.match(
      text(block.render()),
      new RegExp(
        `Observed exact outbound state:\\s+${database ? "Blocked" : "Not blocked"}`,
      ),
    );
    assert.match(
      text(unblock.render()),
      new RegExp(
        `Observed exact outbound state:\\s+${database ? "Blocked" : "Not blocked"}`,
      ),
    );
    assert.equal(
      confirmed,
      1,
      "only the action matching the observed state confirms",
    );
    assert.equal(
      mutations.length,
      2,
      "the client never replays a contrary request",
    );
  });
}

test("unknown response checks exact ID only on user action; an old response cannot unmask", async () => {
  let posts = 0,
    exacts = 0;
  const pending = deferred();
  const surface = dialog(true, (path, init) => {
    if (init?.method === "POST") {
      posts++;
      return pending.promise;
    }
    exacts++;
    return Promise.resolve(reply({ kind: "ok", actor, blocked: false }));
  });
  button(surface.render(), "Block this account").props.onClick();
  pending.reject(Error("response lost"));
  await flush();
  assert.equal(posts, 1);
  assert.equal(
    exacts,
    0,
    "unknown outcome does not trigger an automatic read or resend",
  );
  assert.match(text(surface.render()), /could not confirm the block/);
  await button(surface.render(), "Check blocked IDs").props.onClick();
  await flush();
  assert.equal(posts, 1);
  assert.equal(exacts, 1);
  assert.match(
    text(surface.render()),
    /Observed exact outbound state:\s+Not blocked/,
  );

  const late = deferred();
  const stale = dialog(true, () => late.promise);
  button(stale.render(), "Block this account").props.onClick();
  stale.mask();
  late.resolve(reply({ kind: "ok" }));
  await flush();
  assert.doesNotMatch(
    text(stale.render()),
    /Block confirmed|Observed exact outbound state/,
  );
});

test("an exact-ID response for another actor cannot confirm or reveal block state", async () => {
  let calls = 0;
  let confirmed = 0;
  const surface = dialog(
    true,
    (path, init) => {
      calls++;
      return Promise.resolve(
        init?.method === "POST"
          ? reply({ kind: "ok" })
          : reply({
              kind: "ok",
              actor: "33333333-3333-4333-8333-333333333333",
              blocked: true,
            }),
      );
    },
    () => confirmed++,
  );
  button(surface.render(), "Block this account").props.onClick();
  await flush();
  assert.equal(calls, 2);
  assert.equal(confirmed, 0);
  assert.match(text(surface.render()), /could not confirm the block/);
  assert.doesNotMatch(text(surface.render()), /Observed exact outbound state/);
});

test("same-actor mutation start and finish mask owner IDs and recheck after a contrary commit", async () => {
  let database = true;
  const probes = [];
  const surface = subscribedClient((url, init) => {
    const view = new URL(url, "https://pals.invalid").searchParams.get("view");
    if (view === "probe") {
      const pending = deferred();
      probes.push({ ...pending, signal: init.signal });
      return pending.promise;
    }
    if (view === "blocked")
      return Promise.resolve(
        reply({
          kind: "ok",
          actor,
          rows: database ? [{ account_id: id }] : [],
        }),
      );
    if (view === "retained")
      return Promise.resolve(reply({ kind: "ok", actor, rows: [] }));
    assert.fail(`unexpected safety request: ${url}`);
  });
  surface.render();
  await flush();
  assert.equal(probes.length, 1);
  probes[0].resolve(reply({ kind: "ok", actor }));
  await flush();
  surface.render();
  await flush();
  assert.match(text(surface.render()), new RegExp(id));

  surface.broadcast("pals-safety-mutation", {
    actor,
    sender: "another-tab",
    phase: "start",
  });
  assert.doesNotMatch(
    text(surface.render()),
    new RegExp(id),
    "start masks confirmed owner IDs",
  );
  await flush();
  assert.equal(probes.length, 2);
  database = false; // A contrary unblock commits after this tab's earlier block confirmation.
  surface.broadcast("pals-safety-mutation", {
    actor,
    sender: "another-tab",
    phase: "finish",
  });
  assert.doesNotMatch(
    text(surface.render()),
    new RegExp(id),
    "finish remains masked pending recheck",
  );
  assert.equal(
    probes[1].signal.aborted,
    true,
    "finish invalidates the earlier probe",
  );
  await flush();
  assert.equal(probes.length, 3);
  probes[1].resolve(reply({ kind: "ok", actor }));
  await flush();
  assert.doesNotMatch(
    text(surface.render()),
    new RegExp(id),
    "stale probe cannot reveal IDs",
  );
  probes[2].resolve(reply({ kind: "ok", actor }));
  await flush();
  surface.render();
  await flush();
  assert.doesNotMatch(text(surface.render()), new RegExp(id));
  assert.match(text(surface.render()), /no outbound blocked IDs on this page/i);
});

test("pagehide and visibility changes abort a slow probe and reject its stale completion", async () => {
  const probes = [];
  const surface = subscribedClient((url, init) => {
    const view = new URL(url, "https://pals.invalid").searchParams.get("view");
    if (view === "probe") {
      const pending = deferred();
      probes.push({ ...pending, signal: init.signal });
      return pending.promise;
    }
    return Promise.resolve(reply({ kind: "ok", actor, rows: [] }));
  });
  surface.render();
  await flush();
  assert.equal(probes.length, 1);
  surface.emit("window", "pagehide");
  surface.document.hidden = true;
  surface.emit("document", "visibilitychange");
  assert.equal(probes[0].signal.aborted, true);
  probes[0].resolve(reply({ kind: "ok", actor }));
  await flush();
  assert.match(text(surface.render()), /Checking account access/);
  assert.doesNotMatch(text(surface.render()), /Block someone/);
  surface.document.hidden = false;
  surface.emit("document", "visibilitychange");
  await flush();
  assert.equal(probes.length, 2);
  probes[1].resolve(reply({ kind: "ok", actor }));
  await flush();
  assert.match(text(surface.render()), /Block someone/);
});
