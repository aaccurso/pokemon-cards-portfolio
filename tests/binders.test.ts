import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBinderId, validateData, cardsForBinder, buildCardBinderMap } from "../lib/binders.ts";
import type { Binder } from "../lib/binders.ts";
import type { Shipment } from "../lib/purchases.ts";
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
    { shipments: [{ id: "s", seller: null, date: null, shipping: null, fees: null, total: 1, items: [{ cardId: "ghost", pricePaid: 1, condition: "NM" }] }] },
    binders);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /a.*nope/); assert.match(problems[1], /ghost/);
});

test("cardsForBinder filters by binderId and buildCardBinderMap indexes every card", () => {
  const cards = [card({ id: "a" }), card({ id: "b", binderId: "m6a-30th" })];
  assert.deepEqual(cardsForBinder("m6a-30th", cards).map((c) => c.id), ["b"]);
  assert.deepEqual([...buildCardBinderMap(cards)], [["a", "kanto-151"], ["b", "m6a-30th"]]);
});

const okShipment = (over: Partial<Shipment>): Shipment => ({
  id: "s1", seller: null, date: null, shipping: null, fees: null, total: 1,
  items: [{ cardId: "a", pricePaid: 1, condition: "NM" }], ...over,
});

test("validateData accepts a consistent minimal data set", () => {
  assert.deepEqual(validateData([card({ id: "a" })], { shipments: [okShipment({})] }, binders), []);
});

test("validateData reports duplicate card ids", () => {
  const problems = validateData([card({ id: "a" }), card({ id: "a" })], { shipments: [] }, binders);
  assert.deepEqual(problems, ["duplicate card id a"]);
});

test("validateData reports shipment problems: no items, qty < 1, negative price, null total, duplicate id", () => {
  const cards = [card({ id: "a" })];
  const data = { shipments: [
    okShipment({ id: "empty", items: [] }),
    okShipment({ id: "qty", items: [{ cardId: "a", pricePaid: 1, condition: "NM", qty: 0 }] }),
    okShipment({ id: "neg", items: [{ cardId: "a", pricePaid: -0.5, condition: "NM" }] }),
    okShipment({ id: "nototal", total: null }),
    okShipment({ id: "dup" }),
    okShipment({ id: "dup" }),
  ] };
  assert.deepEqual(validateData(cards, data, binders), [
    "shipment empty has no items",
    "shipment qty item a has qty 0",
    "shipment neg item a has negative pricePaid -0.5",
    "shipment nototal has no total",
    "duplicate shipment id dup",
  ]);
});

test("validateData reports binder problems: duplicate id, master-set without officialCount", () => {
  const bad: Binder[] = [
    ...binders,
    { id: "kanto-151", name: "Again", description: "", kind: "wants", sort: "pokedexNumber" },
    { id: "ms", name: "MS", description: "", kind: "master-set", sort: "setNumber" },
  ];
  assert.deepEqual(validateData([], { shipments: [] }, bad), [
    "duplicate binder id kanto-151",
    "master-set binder ms has no officialCount",
  ]);
});
