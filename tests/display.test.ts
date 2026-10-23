import { test } from "node:test";
import assert from "node:assert/strict";
import { numberLabel, typeBadges } from "../lib/cards.ts";
import { card } from "./helpers.ts";

test("numberLabel pads Pokedex numbers and uses set numbers for Trainers", () => {
  assert.equal(numberLabel(card({ pokedexNumber: 25 })), "#025");
  assert.equal(numberLabel(card({ pokedexNumber: null, type1: null, category: "Trainer", setNumber: 101 }), 103), "No. 101 / 103");
  assert.equal(numberLabel(card({ pokedexNumber: null, type1: null, category: "Trainer", setNumber: 101 })), "No. 101");
});

test("typeBadges lists Pokemon types and a single neutral badge for Trainers", () => {
  assert.deepEqual(typeBadges(card({ type1: "Grass", type2: "Poison" })).map((b) => b.label), ["Grass", "Poison"]);
  assert.equal(typeBadges(card({ type1: "Grass" }))[0].color, "#78C850");
  assert.equal(typeBadges(card({ type1: "Mystery" }))[0].color, "#888");
  assert.deepEqual(typeBadges(card({ pokedexNumber: null, type1: null, category: "Trainer" })), [{ label: "Trainer", color: "#777" }]);
});
