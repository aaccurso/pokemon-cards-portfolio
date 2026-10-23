import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOwnershipMap, computeStats } from "../lib/purchases.ts";
import type { Card } from "../lib/cards.ts";
import type { PurchaseData } from "../lib/purchases.ts";
import { card } from "./helpers.ts";

const binderMap = (cards: Card[]) => new Map(cards.map((c) => [c.id, c.binderId]));

test("min price across purchases wins and duplicates are counted", () => {
  const data: PurchaseData = { shipments: [
    { id: "a", seller: null, date: null, shipping: null, fees: null, total: 10, items: [{ cardId: "x", pricePaid: 6, condition: "NM" }] },
    { id: "b", seller: null, date: null, shipping: null, fees: null, total: 5, items: [{ cardId: "x", pricePaid: 4, condition: "NM" }] },
  ] };
  const o = buildOwnershipMap(data);
  assert.deepEqual(o.get("x"), { owned: true, pricePaid: 4, duplicateCount: 1, purchaseCount: 2 });
  const cards = [card({ id: "x", buyPrice: 5 }), card({ id: "y", buyPrice: 7 })];
  const s = computeStats(cards, o, data, "kanto-151", binderMap(cards));
  assert.equal(s.owned, 1); assert.equal(s.spentOnCards, 4); assert.equal(s.savings, 1);
  assert.equal(s.toComplete, 7); assert.equal(s.budget, 12); assert.equal(s.totalOutlay, 15);
});

test("pulled items own the card without a price and qty counts duplicates", () => {
  const data: PurchaseData = { shipments: [
    { id: "box", seller: null, date: null, shipping: 0, fees: 0, total: 120, product: "booster box",
      items: [{ cardId: "m1", pricePaid: null, condition: "NM", qty: 3 }, { cardId: "m2", pricePaid: null, condition: "NM" }] },
  ] };
  const o = buildOwnershipMap(data);
  assert.deepEqual(o.get("m1"), { owned: true, pricePaid: null, duplicateCount: 2, purchaseCount: 3 });
  assert.deepEqual(o.get("m2"), { owned: true, pricePaid: null, duplicateCount: 0, purchaseCount: 1 });
});

test("a priced purchase after a pull sets the price; a pull after a price keeps it", () => {
  const data: PurchaseData = { shipments: [
    { id: "a", seller: null, date: null, shipping: null, fees: null, total: 1, items: [{ cardId: "m1", pricePaid: null, condition: "NM" }] },
    { id: "b", seller: null, date: null, shipping: null, fees: null, total: 3, items: [{ cardId: "m1", pricePaid: 3, condition: "NM" }] },
    { id: "c", seller: null, date: null, shipping: null, fees: null, total: 1, items: [{ cardId: "m1", pricePaid: null, condition: "NM" }] },
  ] };
  assert.equal(buildOwnershipMap(data).get("m1")?.pricePaid, 3);
});

test("stats are scoped to a binder and outlay is split by item share", () => {
  const cards = [
    card({ id: "k1", binderId: "kanto-151", buyPrice: 10 }),
    card({ id: "m1", binderId: "m6a-30th", buyPrice: 2 }),
    card({ id: "m2", binderId: "m6a-30th", buyPrice: 4 }),
  ];
  const cardBinder = binderMap(cards);
  const data: PurchaseData = { shipments: [
    { id: "mixed", seller: null, date: null, shipping: null, fees: null, total: 40,
      items: [{ cardId: "k1", pricePaid: 8, condition: "NM" }, { cardId: "m1", pricePaid: null, condition: "NM", qty: 3 }] },
    { id: "box", seller: null, date: null, shipping: null, fees: null, total: 100,
      items: [{ cardId: "m1", pricePaid: null, condition: "NM" }] },
  ] };
  const o = buildOwnershipMap(data);
  const m6a = computeStats(cards.filter((c) => c.binderId === "m6a-30th"), o, data, "m6a-30th", cardBinder);
  assert.equal(m6a.total, 2); assert.equal(m6a.owned, 1);
  assert.equal(m6a.spentOnCards, 0);           // pulls carry no price
  assert.equal(m6a.totalOutlay, 30 + 100);     // 3 of 4 items of "mixed" plus all of "box"
  assert.equal(m6a.toComplete, 4); assert.equal(m6a.budget, 6); assert.equal(m6a.pricedCount, 2);
  assert.equal(m6a.duplicates, 3);             // qty 3 + 1 more pull = 4 copies, 3 extra
  assert.equal(m6a.savings, 0);                // no priced owned card
  const kanto = computeStats(cards.filter((c) => c.binderId === "kanto-151"), o, data, "kanto-151", cardBinder);
  assert.equal(kanto.spentOnCards, 8); assert.equal(kanto.totalOutlay, 10); assert.equal(kanto.savings, 2);
  assert.equal(kanto.totalOutlay + m6a.totalOutlay, 140);
});
