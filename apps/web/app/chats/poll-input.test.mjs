import assert from "node:assert/strict";
import test from "node:test";
import { normalizedPollDraft, voteConfirmation } from "./poll-input.ts";

test("poll draft trims labels and rejects duplicate, control, and out-of-bound input", () => {
  assert.deepEqual(normalizedPollDraft(" When? ", [" Today ", " Tomorrow "]), {
    question: "When?",
    options: ["Today", "Tomorrow"],
  });
  assert.equal(normalizedPollDraft("Question", [" Today ", "Today"]), null);
  assert.equal(
    normalizedPollDraft("Question", [
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
    ]),
    null,
  );
  assert.equal(normalizedPollDraft("Q\n?", ["One", "Two"]), null);
  assert.equal(normalizedPollDraft("Question", ["One", "Two\nlines"]), null);
  assert.equal(normalizedPollDraft(" ", ["One", "Two"]), null);
});

test("vote confirmation requires current authoritative choice", () => {
  const old = { poll_id: "poll", option_id: "new", applied: false };
  assert.equal(voteConfirmation(old, "poll", "old", "new"), "superseded");
  assert.equal(voteConfirmation(old, "poll", "old", null), "superseded");
  assert.equal(voteConfirmation(old, "poll", "old", undefined), "uncertain");
  assert.equal(
    voteConfirmation(
      { poll_id: "poll", option_id: "old", applied: true },
      "poll",
      "old",
      "old",
    ),
    "current",
  );
  assert.equal(
    voteConfirmation(
      { poll_id: "poll", option_id: "old", applied: true },
      "poll",
      "old",
      "new",
    ),
    "superseded",
  );
});
