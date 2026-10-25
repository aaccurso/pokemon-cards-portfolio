import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOwnershipMap, computeStats, buildCsv, progressLabel } from "../lib/purchases.ts";
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

test("buildCsv includes the new columns and renders a pulled Trainer row", () => {
  const cards = [card({
    id: "t", name: "N", code: "M6a 153", set: "30th CELEBRATION", pokedexNumber: null, type1: null,
    generation: null, category: "Trainer", setNumber: 153, nameJa: "N", rarity: "Classic Collection", binderId: "m6a-30th",
  })];
  const o = buildOwnershipMap({ shipments: [
    { id: "box", seller: null, date: null, shipping: null, fees: null, total: 50, items: [{ cardId: "t", pricePaid: null, condition: "NM", qty: 2 }] },
  ] });
  const [header, row] = buildCsv(cards, o).trim().split("\n");
  assert.equal(header, "Card Name,Card Code,Set,Qty,Language,Condition,Buy Price (EUR),Price Paid (EUR),Owned,Pokedex #,Type 1,Type 2,Generation,Card Variant,Binder,Category,Set Number,Japanese Name,Rarity,Qty Owned");
  assert.equal(row, "N,M6a 153,30th CELEBRATION,1,Japanese,NM,,,true,,,,,,m6a-30th,Trainer,153,N,Classic Collection,2");
});

test("progressLabel renders owned / total and a rounded percent, guarding an empty binder", () => {
  assert.equal(progressLabel({ owned: 97, total: 165 }), "97 / 165 · 59%");
  assert.equal(progressLabel({ owned: 0, total: 40 }), "0 / 40 · 0%");
  assert.equal(progressLabel({ owned: 151, total: 151 }), "151 / 151 · 100%");
  assert.equal(progressLabel({ owned: 0, total: 0 }), "0 / 0 · 0%");
});
