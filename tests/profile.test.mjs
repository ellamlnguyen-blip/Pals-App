import assert from "node:assert/strict";
import test from "node:test";
import { optionalProfileFields } from "../packages/validation/src/index.ts";
function fields(values = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(values)) form.set(k, v);
  return optionalProfileFields(form);
}
test("optional profile normalization, clearing and ordered values", () => {
  assert.deepEqual(fields(), {
    interests: [],
    down_to_do: [],
    favorite_music: null,
    favorite_foods: null,
    weird_fact: null,
    instagram: null,
    prompts: [],
  });
  const value = fields({
    interests: " Hiking \n\n Music ",
    instagram: " @my.handle ",
    question_0: " Q ",
    answer_0: " A ",
  });
  assert.deepEqual(value.interests, ["Hiking", "Music"]);
  assert.equal(value.instagram, "my.handle");
  assert.deepEqual(value.prompts, [{ question: "Q", answer: "A" }]);
});
test("optional bounds, duplicates and prompt pairs fail before write", () => {
  for (const values of [
    { interests: "A\nA" },
    { down_to_do: Array.from({ length: 11 }, (_, i) => String(i)).join("\n") },
    { favorite_music: "x".repeat(501) },
    { instagram: "https://instagram.com/a" },
    { instagram: "@@name" },
    { question_0: "Unanswered" },
    { answer_0: "No question" },
    { question_0: "x".repeat(121), answer_0: "a" },
  ])
    assert.equal(fields(values), null);
  assert.equal(
    fields({ favorite_music: "🎵".repeat(500) }).favorite_music.length,
    1000,
  );
});
