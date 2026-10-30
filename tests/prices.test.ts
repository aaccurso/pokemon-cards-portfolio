import { test } from "node:test";
import assert from "node:assert/strict";
import { seedManual, upsertCardmarket, nextBuyPrice, topMovers, formatPrices, formatMeta } from "../scripts/lib/prices.mjs";

test("formatMeta is the two-space JSON the hand-written data/meta.json uses, with a trailing newline", () => {
  assert.equal(formatMeta({ pricesRefreshed: "2026-10-29" }), '{\n  "pricesRefreshed": "2026-10-29"\n}\n');
});

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

test("nextBuyPrice treats a zero or negative trend as no price", () => {
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "master-set", 0), 5);
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "wants", 0), 5);
  assert.equal(nextBuyPrice({ buyPrice: null }, "master-set", 0), null);
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "master-set", -1), 5);
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "master-set", undefined), 5);
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "master-set", 0.004), 0, "a positive trend still rounds normally");
});

test("topMovers sorts by absolute change", () => {
  assert.deepEqual(
    topMovers([{ id: "a", from: 1, to: 2 }, { id: "b", from: 10, to: 5 }, { id: "c", from: 0, to: 3 }], 2).map((m: { id: string }) => m.id),
    ["b", "c"]
  );
});

const snap = (date: string, trend: number) => ({ date, source: "cardmarket", trend, avg7: trend, avg30: trend, low: trend });

test("formatPrices round-trips and puts one snapshot per line", () => {
  const prices = {
    abra: [snap("2026-10-23", 0.02)],
    alakazam: [{ date: "2026-10-23", source: "manual", price: 4 }, snap("2026-10-23", 2.86), snap("2026-10-30", 3.1)],
  };
  const out = formatPrices(prices);
  assert.deepEqual(JSON.parse(out), prices, "parses back to the same object");
  assert.ok(out.endsWith("}\n") && !out.endsWith("\n\n"), "ends with a single trailing newline");
  const lines = out.split("\n");
  const snapLines = lines.filter((l) => l.startsWith("    {"));
  assert.equal(snapLines.length, 4, "every snapshot is exactly one line");
  for (const l of snapLines) assert.match(l, /^    \{"date":"\d{4}-\d{2}-\d{2}","source":"[a-z]+",.*\},?$/);
  assert.equal(lines.filter((l) => /^  "[a-z-]+": \[$/.test(l)).length, 2, "one key line per card");
});

test("formatPrices turns a new snapshot into a one-line append", () => {
  const before = { abra: [snap("2026-10-23", 0.02)], mew: [snap("2026-10-23", 9)] };
  const after = { ...before, abra: [...before.abra, snap("2026-10-30", 0.03)] };
  const a = formatPrices(before).split("\n");
  const b = formatPrices(after).split("\n");
  assert.equal(b.length, a.length + 1);
  const strip = (l: string) => l.replace(/,$/, "");
  const bSet = new Set(b.map(strip));
  assert.ok(a.every((l) => bSet.has(strip(l))), "every old line survives, at most gaining a comma");
});

test("formatPrices handles empty input and empty histories", () => {
  assert.equal(formatPrices({}), "{}\n");
  assert.equal(formatPrices({ x: [] }), '{\n  "x": []\n}\n');
  assert.deepEqual(JSON.parse(formatPrices({ x: [], y: [snap("2026-10-23", 1)] })), { x: [], y: [snap("2026-10-23", 1)] });
});
