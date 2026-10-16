import assert from "node:assert/strict";
import test from "node:test";
import { parseSimilarPalsPage } from "./similar-pals-page.ts";

const card = {
  account_id: "11111111-1111-4111-8111-111111111111",
  real_name: "Alex Rivera",
  campus_name: "UNC",
  graduation_year: 2028,
  major: "Biology",
};
const cursor = "22222222-2222-4222-8222-222222222222";

test("similar Pals parser keeps only card allowlist and an issued next cursor", () => {
  assert.deepEqual(
    parseSimilarPalsPage({
      items: [{ ...card, score: 13, hometown: "private" }],
      next_cursor: cursor,
      has_more: true,
      private_count: 57,
    }),
    { items: [card], next_cursor: cursor, has_more: true },
  );
  assert.deepEqual(
    parseSimilarPalsPage({ items: [], next_cursor: null, has_more: false }),
    { items: [], next_cursor: null, has_more: false },
  );
});

test("similar Pals parser fails closed on malformed pages", () => {
  const valid = { items: [card], next_cursor: null, has_more: false };
  assert.equal(parseSimilarPalsPage(null), null);
  assert.equal(parseSimilarPalsPage({ ...valid, items: [card, card] }), null);
  assert.equal(
    parseSimilarPalsPage({ ...valid, items: Array(25).fill(card) }),
    null,
  );
  assert.equal(parseSimilarPalsPage({ ...valid, has_more: true }), null);
  assert.equal(
    parseSimilarPalsPage({ ...valid, has_more: true, next_cursor: "1" }),
    null,
  );
  assert.equal(
    parseSimilarPalsPage({ ...valid, items: [{ ...card, account_id: "bad" }] }),
    null,
  );
});
