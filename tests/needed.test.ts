import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNeededBlocks, neededLabel, neededText } from "../lib/needed.ts";
import { buildOwnershipMap } from "../lib/purchases.ts";
import { card } from "./helpers.ts";

const wants = { kind: "wants" as const, sort: "pokedexNumber" as const };
const master = { kind: "master-set" as const, sort: "setNumber" as const, officialCount: 103 };
const masterNoCount = { kind: "master-set" as const, sort: "setNumber" as const };

const ownership = buildOwnershipMap({
  shipments: [{
    id: "s", seller: null, date: null, shipping: null, fees: null, total: null,
    items: [{ cardId: "b", pricePaid: 1, condition: "NM" }],
  }],
});

test("neededLabel is the padded set number in master-set binders and number plus name in wants binders", () => {
  assert.equal(neededLabel(card({ setNumber: 3, name: "Venusaur" }), master), "003");
  assert.equal(neededLabel(card({ setNumber: 126, name: "Pikachu" }), masterNoCount), "126");
  assert.equal(neededLabel(card({ pokedexNumber: 25, name: "Pikachu" }), wants), "#025 Pikachu");
  assert.equal(neededLabel(card({ pokedexNumber: null, setNumber: 101, name: "Switch", category: "Trainer", type1: null }), wants), "No. 101 Switch");
});

test("buildNeededBlocks sorts by the binder sort key and flags owned cards", () => {
  const cards = [
    card({ id: "c", pokedexNumber: 7, setNumber: 7 }),
    card({ id: "a", pokedexNumber: 1, setNumber: 1 }),
    card({ id: "b", pokedexNumber: 4, setNumber: 4 }),
  ];
  const blocks = buildNeededBlocks(cards, ownership, wants);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].title, null);
  assert.deepEqual(blocks[0].entries.map((e) => e.card.id), ["a", "b", "c"]);
  assert.deepEqual(blocks[0].entries.map((e) => e.owned), [false, true, false]);
  assert.equal(blocks[0].entries[1].label, "#004 X");
});

test("buildNeededBlocks puts cards without a sort value last", () => {
  const cards = [
    card({ id: "n", pokedexNumber: null, setNumber: 101 }),
    card({ id: "a", pokedexNumber: 151, setNumber: 1 }),
  ];
  const blocks = buildNeededBlocks(cards, ownership, wants);
  assert.deepEqual(blocks[0].entries.map((e) => e.card.id), ["a", "n"]);
});

test("buildNeededBlocks splits master-set secrets above officialCount into their own block", () => {
  const cards = [
    card({ id: "s1", setNumber: 104 }),
    card({ id: "o1", setNumber: 1 }),
    card({ id: "o103", setNumber: 103 }),
    card({ id: "s2", setNumber: 165 }),
  ];
  const blocks = buildNeededBlocks(cards, ownership, master);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].title, "Set 001 to 103");
  assert.deepEqual(blocks[0].entries.map((e) => e.card.id), ["o1", "o103"]);
  assert.equal(blocks[1].title, "Secret 104 to 165");
  assert.deepEqual(blocks[1].entries.map((e) => e.card.id), ["s1", "s2"]);
  assert.deepEqual(blocks[1].entries.map((e) => e.label), ["104", "165"]);
});

test("buildNeededBlocks keeps one untitled block when a master-set has no officialCount or no secrets", () => {
  const cards = [card({ id: "o1", setNumber: 1 }), card({ id: "o2", setNumber: 2 })];
  assert.equal(buildNeededBlocks(cards, ownership, masterNoCount).length, 1);
  assert.equal(buildNeededBlocks(cards, ownership, masterNoCount)[0].title, null);
  assert.equal(buildNeededBlocks(cards, ownership, master).length, 1);
  assert.equal(buildNeededBlocks(cards, ownership, master)[0].title, null);
});

test("neededText lists only missing cards, space separated for master sets", () => {
  const cards = [
    card({ id: "c", setNumber: 12 }),
    card({ id: "b", setNumber: 7 }),
    card({ id: "a", setNumber: 3 }),
    card({ id: "d", setNumber: 104 }),
  ];
  assert.equal(neededText(cards, ownership, master), "Need (3): 003 012 104");
});

test("neededText uses comma separated number plus name rows for wants binders", () => {
  const cards = [
    card({ id: "b", pokedexNumber: 25, name: "Pikachu" }),
    card({ id: "a", pokedexNumber: 4, name: "Charmander" }),
    card({ id: "c", pokedexNumber: 150, name: "Mewtwo" }),
  ];
  assert.equal(neededText(cards, ownership, wants), "Need (2): #004 Charmander, #150 Mewtwo");
});

test("neededText reports a complete binder", () => {
  assert.equal(neededText([card({ id: "b" })], ownership, wants), "Need (0): complete");
});
