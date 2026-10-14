import assert from "node:assert/strict";
import test from "node:test";
import {
  accountEmail,
  accountName,
  accountPassword,
  accountRevision,
} from "../apps/web/lib/account-input.ts";

test("account name accepts an independent, bounded owner name", () => {
  assert.equal(accountName("  Casey   Lee  "), "Casey Lee");
  assert.equal(accountName(" "), null);
  assert.equal(accountName("x".repeat(101)), null);
  assert.equal(accountName(null), null);
});

test("email accepts only current exact UNC allowlist domains", () => {
  for (const domain of [
    "live.unc.edu",
    "unc.edu",
    "ad.unc.edu",
    "business.unc.edu",
    "kenan-flagler.unc.edu",
  ])
    assert.equal(
      accountEmail(` Student@${domain.toUpperCase()} `),
      `student@${domain}`,
    );
  for (const email of [
    "student@other.edu",
    "student@unc.edu.evil.example",
    "student@sub.unc.edu",
    "student@fakeunc.edu",
  ])
    assert.equal(accountEmail(email), null);
});

test("revision and password inputs reject malformed or unbounded submissions", () => {
  assert.equal(accountRevision("0"), 0);
  assert.equal(accountRevision("42"), 42);
  assert.equal(accountRevision("1.0"), null);
  assert.equal(accountRevision("9007199254740992"), null);
  assert.equal(accountPassword("x".repeat(12)), "x".repeat(12));
  assert.equal(accountPassword("x".repeat(11)), null);
  assert.equal(accountPassword("x".repeat(129)), null);
});
