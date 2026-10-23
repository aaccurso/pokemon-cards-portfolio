import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBinderId, validateData, cardsForBinder, buildCardBinderMap } from "../lib/binders.ts";
import type { Binder } from "../lib/binders.ts";
import { card } from "./helpers.ts";

const binders: Binder[] = [
  { id: "kanto-151", name: "Kanto", description: "", kind: "wants", sort: "pokedexNumber" },
  { id: "kanto-evolutions", name: "Evo", description: "", kind: "wants", sort: "pokedexNumber" },
  { id: "eeveelutions", name: "Eevee", description: "", kind: "wants", sort: "pokedexNumber" },
  { id: "m6a-30th", name: "30th", description: "", kind: "master-set", sort: "setNumber", officialCount: 103 },
];

test("resolveBinderId falls back to the default", () => {
  assert.equal(resolveBinderId("typo", binders), "kanto-151");
  assert.equal(resolveBinderId(null, binders), "kanto-151");
  assert.equal(resolveBinderId("m6a-30th", binders), "m6a-30th");
});

test("validateData reports unknown binder ids and unknown purchase card ids", () => {
  const problems = validateData(
    [card({ id: "a", binderId: "nope" })],
    { shipments: [{ id: "s", seller: null, date: null, shipping: null, fees: null, total: null, items: [{ cardId: "ghost", pricePaid: 1, condition: "NM" }] }] },
    binders);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /a.*nope/); assert.match(problems[1], /ghost/);
});

test("cardsForBinder filters by binderId and buildCardBinderMap indexes every card", () => {
  const cards = [card({ id: "a" }), card({ id: "b", binderId: "m6a-30th" })];
  assert.deepEqual(cardsForBinder("m6a-30th", cards).map((c) => c.id), ["b"]);
  assert.deepEqual([...buildCardBinderMap(cards)], [["a", "kanto-151"], ["b", "m6a-30th"]]);
});
