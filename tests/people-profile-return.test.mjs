import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../apps/web/app/people/[id]/profile-return.ts", import.meta.url),
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
  URLSearchParams,
});
const { profileReturn } = testModule.exports;

const current = "52030000-0000-4000-8001-000000000110";
const other = "52030000-0000-4000-8001-000000000111";
const hangout = "/hangouts/saved/01ccc564-0cc8-4196-bc0d-00b669cda352";

test("People return replaces an existing focus without duplicating it", () => {
  assert.equal(
    profileReturn(`/people?search=Taylor&focus=${other}`, current, current),
    `/people?search=Taylor&focus=${current}`,
  );
  assert.equal(
    profileReturn("/people", current, current),
    `/people?focus=${current}`,
  );
});

test("other context and saved Hangout returns stay unchanged", () => {
  assert.equal(
    profileReturn(`/people?focus=${other}`, other, current),
    `/people?focus=${other}`,
  );
  assert.equal(profileReturn(hangout, current, current), hangout);
  assert.equal(
    profileReturn(`${hangout}?focus=${other}`, current, current),
    `${hangout}?focus=${other}`,
  );
});
