import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyStateMessage, numberLabel, typeBadges } from "../lib/cards.ts";
import { card } from "./helpers.ts";

const wants = { kind: "wants" as const };
const master = { kind: "master-set" as const, officialCount: 103 };

test("numberLabel shows padded Pokedex numbers in wants binders", () => {
  assert.equal(numberLabel(card({ pokedexNumber: 25 }), wants), "#025");
  assert.equal(numberLabel(card({ pokedexNumber: null, type1: null, category: "Trainer", setNumber: 101 }), wants), "No. 101");
});

test("numberLabel shows the set index as printed on the card in master-set binders", () => {
  assert.equal(numberLabel(card({ pokedexNumber: 25, setNumber: 126 }), master), "126/103");
  assert.equal(numberLabel(card({ pokedexNumber: 102, setNumber: 1 }), master), "001/103");
  assert.equal(numberLabel(card({ pokedexNumber: null, type1: null, category: "Trainer", setNumber: 101 }), master), "101/103");
  assert.equal(numberLabel(card({ pokedexNumber: 25, setNumber: 126 }), { kind: "master-set" }), "126");
});

test("typeBadges lists Pokemon types and a single neutral badge for Trainers", () => {
  assert.deepEqual(typeBadges(card({ type1: "Grass", type2: "Poison" })).map((b) => b.label), ["Grass", "Poison"]);
  assert.equal(typeBadges(card({ type1: "Grass" }))[0].color, "#78C850");
  assert.equal(typeBadges(card({ type1: "Mystery" }))[0].color, "#888");
  assert.deepEqual(typeBadges(card({ pokedexNumber: null, type1: null, category: "Trainer" })), [{ label: "Trainer", color: "#777" }]);
});

test("emptyStateMessage names the cause: owned-only on an empty binder, then search text, then generic", () => {
  assert.equal(
    emptyStateMessage({ search: "", ownershipFilter: "owned", binderOwned: 0 }),
    "Nothing owned yet in this binder."
  );
  // An empty binder beats search text: clearing the search would not help.
  assert.equal(
    emptyStateMessage({ search: "pikachu", ownershipFilter: "owned", binderOwned: 0 }),
    "Nothing owned yet in this binder."
  );
  assert.equal(
    emptyStateMessage({ search: "  pikachu ", ownershipFilter: "all", binderOwned: 12 }),
    'No cards match "pikachu".'
  );
  assert.equal(
    emptyStateMessage({ search: "", ownershipFilter: "owned", binderOwned: 12 }),
    "No cards match these filters."
  );
  assert.equal(
    emptyStateMessage({ search: "", ownershipFilter: "all", binderOwned: 0 }),
    "No cards match these filters."
  );
});
