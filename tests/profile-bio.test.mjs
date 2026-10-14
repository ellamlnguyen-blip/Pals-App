import assert from "node:assert/strict";
import test from "node:test";
import {
  profileFields,
  validShortBio,
} from "../packages/validation/src/index.ts";

function formWithBio(bio) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    real_name: "Test Student",
    major: "History",
    graduation_year: "2028",
    bio,
  }))
    form.set(key, value);
  return form;
}

test("bio counts sentence stops while allowing an unfinished final sentence", () => {
  for (const value of [
    "I like tacos",
    "I like tacos. Let's go!",
    "Dr. Pepper is great. I like example.com too.",
    "I'm from the U.S. Let's meet.",
    "I live in the U.S. and like games, e.g. soccer. Let's meet.",
  ])
    assert.equal(validShortBio(value), true, value);
  for (const value of [
    "First. Second. Third.",
    "First! Second? Third",
    " ",
    "x".repeat(2001),
  ])
    assert.equal(validShortBio(value), false, value.slice(0, 30));
});

test("changed bio is limited; unchanged legacy bio survives unrelated edits", () => {
  const legacy = "First. Second. Third.";
  assert.equal(profileFields(formWithBio(legacy)), null);
  assert.equal(profileFields(formWithBio(legacy), legacy)?.bio, legacy);
  assert.equal(profileFields(formWithBio("First. Second. New."), legacy), null);
  assert.equal(
    profileFields(formWithBio("First. Second."), legacy)?.bio,
    "First. Second.",
  );
});
