import assert from "node:assert/strict";
import test from "node:test";
import { peopleUrl, readSelection, safeReturn } from "./people-selection.ts";

const peer = "11111111-1111-4111-8111-111111111111";

test("Pals selection accepts only major, year and opaque cursor", () => {
  const selection = readSelection({
    year: "2028",
    major: "Biology",
    cursor: peer,
  });
  assert.deepEqual(selection, {
    year: "2028",
    major: "Biology",
    cursor: peer,
  });
  assert.equal(
    peopleUrl(selection),
    `/people?year=2028&major=Biology&cursor=${peer}`,
  );
  assert.equal(readSelection({ afterId: peer }), null);
  assert.equal(readSelection({ cursor: "arbitrary-offset" }), null);
  assert.equal(readSelection({ search: "Maya" }), null);
  assert.equal(readSelection({ year: "1800" }), null);
  assert.equal(readSelection({ major: "x".repeat(201) }), null);
});

test("Pals return URLs preserve only valid current filter and focus links", () => {
  assert.equal(
    safeReturn(`/people?major=Biology&focus=${peer}`),
    `/people?major=Biology&focus=${peer}`,
  );
  assert.equal(safeReturn("/people?search=Maya"), "/people");
  assert.equal(safeReturn("/people?major=A&major=B"), "/people");
  assert.equal(safeReturn("//elsewhere.example"), "/people");
});
