import assert from "node:assert/strict";
import test from "node:test";
import { validateSupabaseTarget } from "../packages/config/src/index.ts";

test("local backend targets cannot reach hosted or arbitrary network databases", () => {
  assert.equal(
    validateSupabaseTarget("local", "http://127.0.0.1:54321"),
    "http://127.0.0.1:54321",
  );
  for (const target of [
    "https://abcdefghijklmnopqrst.supabase.co",
    "http://192.168.1.1:54321",
    "http://localhost.evil.test:54321",
    "http://localhost:54322",
    "http://user:pass@localhost:54321",
    "http://localhost:54321/path",
    "http://localhost:54321?redirect=evil",
    "not-a-url",
  ]) {
    assert.throws(() => validateSupabaseTarget("local", target));
  }
});
test("hosted targets require an explicit matching environment project reference", () => {
  const ref = "abcdefghijklmnopqrst";
  for (const env of ["staging", "production"]) {
    assert.equal(
      validateSupabaseTarget(env, `https://${ref}.supabase.co`, ref),
      `https://${ref}.supabase.co`,
    );
    for (const [target, expected] of [
      [`https://${ref}.supabase.co`, undefined],
      [`https://${ref}.supabase.co`, "differentprojectrefxx"],
      [`http://${ref}.supabase.co`, ref],
      ["http://localhost:54321", ref],
    ]) {
      assert.throws(() => validateSupabaseTarget(env, target, expected));
    }
  }
});
