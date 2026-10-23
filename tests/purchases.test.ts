import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOwnershipMap, computeStats } from "../lib/purchases.ts";
import type { Card } from "../lib/cards.ts";
import type { PurchaseData } from "../lib/purchases.ts";

export const card = (over: Partial<Card>): Card => ({
  id: "x", name: "X", code: "sv2a 001", set: "S", qty: 1, language: "Japanese",
  condition: "NM", buyPrice: null, pokedexNumber: 1, type1: "Grass", type2: null,
  generation: 1, variant: null, binderId: "kanto-151", ...over,
});

test("min price across purchases wins and duplicates are counted", () => {
  const data: PurchaseData = { shipments: [
    { id: "a", seller: null, date: null, shipping: null, fees: null, total: 10, items: [{ cardId: "x", pricePaid: 6, condition: "NM" }] },
    { id: "b", seller: null, date: null, shipping: null, fees: null, total: 5, items: [{ cardId: "x", pricePaid: 4, condition: "NM" }] },
  ] };
  const o = buildOwnershipMap(data);
  assert.deepEqual(o.get("x"), { owned: true, pricePaid: 4, duplicateCount: 1, purchaseCount: 2 });
  const s = computeStats([card({ id: "x", buyPrice: 5 }), card({ id: "y", buyPrice: 7 })], o, data);
  assert.equal(s.owned, 1); assert.equal(s.spentOnCards, 4); assert.equal(s.savings, 1);
  assert.equal(s.toComplete, 7); assert.equal(s.budget, 12); assert.equal(s.totalOutlay, 15);
});
