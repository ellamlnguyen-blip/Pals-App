import assert from "node:assert/strict";
import test from "node:test";
import { parseAppEnvironment } from "../packages/config/src/index.ts";

test("an unconfigured environment defaults to local, even during a production build", () => {
  assert.equal(parseAppEnvironment(), "local");
  assert.equal(parseAppEnvironment(""), "local");
});
test("staging and production require explicit selection", () => {
  for (const environment of ["local", "staging", "production"]) {
    assert.equal(parseAppEnvironment(environment), environment);
  }
});
test("misspelled environments fail closed rather than selecting a backend", () => {
  for (const environment of ["prod", "development", "Production", " local "]) {
    assert.throws(() => parseAppEnvironment(environment), /APP_ENV/);
  }
});
