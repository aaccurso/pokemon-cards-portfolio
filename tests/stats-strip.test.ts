import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOwnershipMap,
  computeStats,
  setValuePct,
  SINGLES_BAND_EUR,
} from "../lib/purchases.ts";
import type { PurchaseData } from "../lib/purchases.ts";
import { card } from "./helpers.ts";

const binderMap = (cards: { id: string; binderId: string }[]) =>
  new Map(cards.map((c) => [c.id, c.binderId]));

test("wanted cards split into priced and unpriced, and priced ones into singles bands", () => {
  const cards = [
    card({ id: "owned", buyPrice: 20 }),
    card({ id: "dear", buyPrice: 12 }),
    card({ id: "cheap", buyPrice: 4 }),
    card({ id: "edge", buyPrice: SINGLES_BAND_EUR }),
    card({ id: "unchosen", buyPrice: null }),
  ];
  const data: PurchaseData = {
    shipments: [
      { id: "s", seller: null, date: null, shipping: 0, fees: 0, total: 15, items: [{ cardId: "owned", pricePaid: 15, condition: "NM" }] },
    ],
  };
  const s = computeStats(cards, buildOwnershipMap(data), data, "kanto-151", binderMap(cards));
  assert.equal(s.wanted, 4);
  assert.equal(s.wantedPriced, 3);
  assert.equal(s.wantedUnpriced, 1);
  assert.deepEqual(s.toCompleteOver, { count: 2, total: 22 }); // 12 and the 10 EUR edge are "over"
  assert.deepEqual(s.toCompleteUnder, { count: 1, total: 4 });
  assert.equal(s.toComplete, 26);
});

test("a fully owned binder has nothing wanted in either band", () => {
  const cards = [card({ id: "a", buyPrice: 3 })];
  const data: PurchaseData = {
    shipments: [
      { id: "s", seller: null, date: null, shipping: 0, fees: 0, total: 3, items: [{ cardId: "a", pricePaid: 3, condition: "NM" }] },
    ],
  };
  const s = computeStats(cards, buildOwnershipMap(data), data, "kanto-151", binderMap(cards));
  assert.equal(s.wantedPriced, 0);
  assert.equal(s.wantedUnpriced, 0);
  assert.deepEqual(s.toCompleteOver, { count: 0, total: 0 });
  assert.deepEqual(s.toCompleteUnder, { count: 0, total: 0 });
});

test("setValuePct is the owned share of set value, null when nothing is priced", () => {
  assert.equal(setValuePct({ marketValue: 246, budget: 621 }), 40);
  assert.equal(setValuePct({ marketValue: 0, budget: 621 }), 0);
  assert.equal(setValuePct({ marketValue: 0, budget: 0 }), null);
});
