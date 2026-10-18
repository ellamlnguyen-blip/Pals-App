import test from "node:test";
import assert from "node:assert/strict";
import {
  adminOrigin,
  cookiePolicy,
  enrollmentWindow,
  factorMayChallenge,
  originMatches,
} from "../lib/security.ts";

const ella = "8ebd74bb-2a72-4689-9580-72268106d91b";
const now = Date.parse("2026-10-05T12:00:00Z");
const expires = "2026-10-05T13:00:00Z";

test("operator enrollment is exact-subject, explicit and time limited", () => {
  assert.equal(enrollmentWindow("true", ella, expires, ella, now), true);
  assert.equal(enrollmentWindow(undefined, ella, expires, ella, now), false);
  assert.equal(enrollmentWindow("true", "other", expires, ella, now), false);
  assert.equal(
    enrollmentWindow("true", ella, expires, ella, now + 3600000),
    false,
  );
  assert.equal(
    enrollmentWindow("true", ella, "2026-10-07T13:00:00Z", ella, now),
    false,
  );
  assert.equal(enrollmentWindow("true", ella, "invalid", ella, now), false);
});

test("unverified factor cannot finish enrollment after window closure", () => {
  assert.equal(factorMayChallenge("unverified", true), true);
  assert.equal(factorMayChallenge("unverified", false), false);
  assert.equal(factorMayChallenge("verified", false), true);
});

test("hosted Origin and HTTPS are exact; local loopback remains supported", () => {
  const origin = "https://admin-staging.example.com";
  assert.equal(originMatches(origin, origin, "https:", true), true);
  assert.equal(originMatches(origin + ".evil", origin, "https:", true), false);
  assert.equal(originMatches(null, origin, "https:", true), false);
  assert.equal(originMatches(origin, origin, "http:", true), false);
  assert.equal(
    originMatches(
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3001",
      "http:",
      false,
    ),
    true,
  );
});

test("admin configuration accepts explicit HTTPS staging and rejects production or ambiguous origins", () => {
  assert.equal(
    adminOrigin("staging", "https://admin.example.com"),
    "https://admin.example.com",
  );
  assert.equal(adminOrigin("local", undefined), "http://127.0.0.1:3001");
  assert.throws(() => adminOrigin("staging", undefined));
  assert.throws(() => adminOrigin("staging", "http://admin.example.com"));
  assert.throws(() => adminOrigin("staging", "https://admin.example.com/path"));
  assert.throws(() => adminOrigin("production", "https://admin.example.com"));
});

test("hosted cookies are HttpOnly, Secure and SameSite Lax", () => {
  assert.deepEqual(cookiePolicy(true), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  assert.equal(cookiePolicy(false).secure, false);
});
