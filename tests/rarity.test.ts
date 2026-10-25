import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { rarityOrder } from "../lib/cards.ts";
import { buildOwnershipMap, rarityBreakdown } from "../lib/purchases.ts";
import type { Card } from "../lib/cards.ts";
import type { PurchaseData } from "../lib/purchases.ts";
import { card } from "./helpers.ts";

const own = (...ids: string[]) =>
  buildOwnershipMap({
    shipments: [
      {
        id: "box", seller: null, date: null, shipping: null, fees: null, total: 10,
        items: ids.map((cardId) => ({ cardId, pricePaid: null, condition: "NM" })),
      },
    ],
  });

test("rarityOrder maps every tcgdex label to a short display label in a fixed order", () => {
  assert.deepEqual(rarityOrder.map((r) => r.rarity), [
    "None", "Double rare", "Illustration rare", "Special illustration rare", "Futuristic Rare", "Classic Collection",
  ]);
  assert.deepEqual(rarityOrder.map((r) => r.label), ["Common / Uncommon", "RR", "AR", "SAR", "Futuristic", "Classic"]);
});

test("rarityBreakdown counts, values and to-go per rarity in display order", () => {
  const cards = [
    card({ id: "c1", rarity: "None", buyPrice: 0.1 }),
    card({ id: "c2", rarity: "None", buyPrice: 0.2 }),
    card({ id: "c3", rarity: "None", buyPrice: null }),
    card({ id: "cc1", rarity: "Classic Collection", buyPrice: 50 }),
    card({ id: "cc2", rarity: "Classic Collection", buyPrice: 20 }),
    card({ id: "ar1", rarity: "Illustration rare", buyPrice: 5 }),
  ];
  const rows = rarityBreakdown(cards, own("c1", "c3", "cc2"));
  assert.deepEqual(rows, [
    { rarity: "None", label: "Common / Uncommon", total: 3, owned: 2, value: 0.30000000000000004, toComplete: 0.2 },
    { rarity: "Illustration rare", label: "AR", total: 1, owned: 0, value: 5, toComplete: 5 },
    { rarity: "Classic Collection", label: "Classic", total: 2, owned: 1, value: 70, toComplete: 50 },
  ]);
});

test("rarityBreakdown skips cards without a rarity and puts unknown rarities last with their raw label", () => {
  const cards = [
    card({ id: "k", buyPrice: 10 }),
    card({ id: "z", rarity: "Zebra rare", buyPrice: 1 }),
    card({ id: "a", rarity: "Amazing rare", buyPrice: 2 }),
    card({ id: "cc", rarity: "Classic Collection", buyPrice: 3 }),
  ];
  const rows = rarityBreakdown(cards, own("z"));
  assert.deepEqual(rows.map((r) => [r.rarity, r.label, r.owned, r.toComplete]), [
    ["Classic Collection", "Classic", 0, 3],
    ["Zebra rare", "Zebra rare", 1, 0],
    ["Amazing rare", "Amazing rare", 0, 2],
  ]);
  assert.deepEqual(rarityBreakdown([card({ id: "k" })], own()), []);
});

test("real M6a data: six known rarities, totals sum to 165, values sum to the set value", () => {
  const read = (p: string) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
  const cards: Card[] = read("data/cards.json");
  const purchases: PurchaseData = read("data/purchases.json");
  const m6a = cards.filter((c) => c.binderId === "m6a-30th");
  const rows = rarityBreakdown(m6a, buildOwnershipMap(purchases));
  assert.deepEqual(rows.map((r) => r.rarity), rarityOrder.map((r) => r.rarity));
  assert.equal(rows.reduce((s, r) => s + r.total, 0), 165);
  const setValue = m6a.reduce((s, c) => s + (c.buyPrice ?? 0), 0);
  assert.ok(Math.abs(rows.reduce((s, r) => s + r.value, 0) - setValue) < 1e-9);
  for (const r of rows) assert.ok(r.owned <= r.total && r.toComplete <= r.value + 1e-9);
});
