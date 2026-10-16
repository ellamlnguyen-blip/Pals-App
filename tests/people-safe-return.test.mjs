import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// The route module imports Next server-only APIs. Exercise its real validator
// with those unrelated imports stubbed in the Node unit runner.
const source = readFileSync(
  new URL("../apps/web/lib/people.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, {
  module: testModule,
  exports: testModule.exports,
  URL,
  URLSearchParams,
  require(id) {
    if (id === "server-only") return {};
    if (id === "next/navigation") return { notFound() {} };
    if (id === "./feature-runtime")
      return { studentFeaturesAvailable: () => true };
    throw new Error(`Unexpected import: ${id}`);
  },
});
const { safeReturn } = testModule.exports;

const hangout = "/hangouts/saved/01ccc564-0cc8-4196-bc0d-00b669cda352";
const peer = "52030000-0000-4000-8001-000000000110";

test("safe return preserves only validated People filters and focus", () => {
  assert.equal(
    safeReturn("/people?search=Taylor&year=2028"),
    "/people?search=Taylor&year=2028",
  );
  assert.equal(safeReturn(`/people?focus=${peer}`), `/people?focus=${peer}`);
  for (const value of [
    "/people?afterId=bad",
    "/people?year=1800",
    "/people?search=a&search=b",
    "/people?from=%2Fhangouts",
    "/people?focus=bad",
  ])
    assert.equal(safeReturn(value), "/people");
});

test("safe return accepts only an exact saved Hangout UUID route", () => {
  assert.equal(safeReturn(hangout), hangout);
  assert.equal(
    safeReturn(`${hangout}?focus=${peer}`),
    `${hangout}?focus=${peer}`,
  );
  for (const value of [
    "/hangouts/saved/not-an-id",
    `${hangout}/extra`,
    `${hangout}?from=%2Fpeople`,
    `${hangout}?focus=bad`,
    `${hangout}?focus=${peer}&focus=${peer}`,
    `${hangout}#fragment`,
    "/hangouts%2Fsaved%2F01ccc564-0cc8-4196-bc0d-00b669cda352",
    "/hangouts/saved/..%2Fprofile",
    "//evil.example/hangouts/saved/01ccc564-0cc8-4196-bc0d-00b669cda352",
    "https://evil.example/hangouts/saved/01ccc564-0cc8-4196-bc0d-00b669cda352",
  ])
    assert.equal(safeReturn(value), "/people");
});
