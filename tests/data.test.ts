import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateData, cardsForBinder, buildCardBinderMap } from "../lib/binders.ts";
import { buildOwnershipMap, computeStats } from "../lib/purchases.ts";
import { typeColors } from "../lib/cards.ts";
import type { Card } from "../lib/cards.ts";
import type { PurchaseData } from "../lib/purchases.ts";
import type { Binder } from "../lib/binders.ts";

const read = (p: string) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const cards: Card[] = read("data/cards.json");
const purchases: PurchaseData = read("data/purchases.json");
const binders: Binder[] = read("data/binders.json");

test("real data passes validateData and has unique card ids", () => {
  assert.deepEqual(validateData(cards, purchases, binders), []);
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
});

test("every price-history key is a current card id", () => {
  const prices: Record<string, unknown[]> = read("data/prices.json");
  const ids = new Set(cards.map((c) => c.id));
  assert.deepEqual(Object.keys(prices).filter((k) => !ids.has(k)), []);
});

test("the M6a binder holds exactly cards 001 to 165", () => {
  const m6a = cardsForBinder("m6a-30th", cards);
  assert.equal(m6a.length, 165);
  assert.deepEqual([...new Set(m6a.map((c) => c.setNumber))].sort((a, b) => a - b), Array.from({ length: 165 }, (_, i) => i + 1));
});

test("every Pokemon type uses the app's type vocabulary", () => {
  const unknown = cards.flatMap((c) => [c.type1, c.type2].filter((t): t is string => t != null && !(t in typeColors)).map((t) => `${c.id}: ${t}`));
  assert.deepEqual(unknown, []);
});

test("card names use canonical suffix casing and have no glued words", () => {
  const bad = cards.filter((c) => /\sEx$/.test(c.name) || /[a-z][A-Z][a-z]+ Team/.test(c.name)).map((c) => c.name);
  assert.deepEqual(bad, []);
});

test("per binder, market value of owned cards never exceeds the priced budget", () => {
  const ownership = buildOwnershipMap(purchases);
  const cardBinder = buildCardBinderMap(cards);
  for (const b of binders) {
    const s = computeStats(cardsForBinder(b.id, cards), ownership, purchases, b.id, cardBinder);
    assert.ok(s.marketValue <= s.budget + 1e-9, `${b.id}: marketValue ${s.marketValue} > budget ${s.budget}`);
    assert.ok(s.marketValueAllCopies >= s.marketValue, `${b.id}: all-copies value below distinct value`);
    assert.ok(s.unpricedOwned <= s.owned, `${b.id}: more unpriced owned than owned`);
  }
});

test("every shipment has a total, so outlay is not understated", () => {
  const missing = purchases.shipments.filter((sh) => sh.total == null).map((sh) => sh.id);
  assert.deepEqual(missing, []);
});

test("every ex/EX/GX card has a variant", () => {
  const missing = cards.filter((c) => /\s(ex|EX|GX|V|VMAX|VSTAR|BREAK|LEGEND)$/.test(c.name) && !c.variant).map((c) => c.id);
  assert.deepEqual(missing, []);
});
