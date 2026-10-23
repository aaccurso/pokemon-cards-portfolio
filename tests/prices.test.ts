import { test } from "node:test";
import assert from "node:assert/strict";
import { seedManual, upsertCardmarket, nextBuyPrice, topMovers } from "../scripts/lib/prices.mjs";

test("seedManual only once and only for priced cards", () => {
  assert.deepEqual(seedManual(undefined, 32, "2026-10-23"), [{ date: "2026-10-23", source: "manual", price: 32 }]);
  assert.deepEqual(seedManual(undefined, null, "2026-10-23"), []);
  const h = [{ date: "2026-10-01", source: "manual", price: 30 }];
  assert.equal(seedManual(h, 32, "2026-10-23"), h);
});

test("upsertCardmarket replaces same-day and appends otherwise", () => {
  const a = upsertCardmarket([], { date: "2026-10-23", source: "cardmarket", trend: 1, avg7: 1, avg30: 1, low: 1 });
  const b = upsertCardmarket(a, { date: "2026-10-23", source: "cardmarket", trend: 2, avg7: 2, avg30: 2, low: 2 });
  assert.equal(b.length, 1);
  assert.equal(b[0].trend, 2);
  assert.equal(upsertCardmarket(b, { date: "2026-10-24", source: "cardmarket", trend: 3, avg7: 3, avg30: 3, low: 3 }).length, 2);
  assert.equal(a.length, 1, "inputs are not mutated");
});

test("nextBuyPrice respects the wants-null rule", () => {
  assert.equal(nextBuyPrice({ buyPrice: null }, "wants", 4.567), null);
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "wants", 4.567), 4.57);
  assert.equal(nextBuyPrice({ buyPrice: null }, "master-set", 4.567), 4.57);
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "master-set", null), 5);
});

test("topMovers sorts by absolute change", () => {
  assert.deepEqual(
    topMovers([{ id: "a", from: 1, to: 2 }, { id: "b", from: 10, to: 5 }, { id: "c", from: 0, to: 3 }], 2).map((m: { id: string }) => m.id),
    ["b", "c"]
  );
});
