import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Static contract for roadmap engineering item 2 (PR B) on the refresh script.
// The script is top-level code that talks to tcgdex, so this pins the three
// lines that matter instead of running it: a zero trend is "no price", both
// files go through writeAllAtomic, and prices.json keeps the one-snapshot-per-
// line format that tests/data.test.ts asserts on the committed file.

const src = fs.readFileSync(new URL("../scripts/refresh_prices.mjs", import.meta.url), "utf8");

test("refresh_prices skips a card whose trend is not a positive number", () => {
  assert.doesNotMatch(src, /cm\.trend == null/, "the null-only check is gone");
  assert.match(src, /if \(!cm \|\| !hasTrend\(cm\.trend\)\)/);
});

test("refresh_prices writes prices.json via formatPrices and all three files via writeAllAtomic", () => {
  assert.doesNotMatch(src, /JSON\.stringify\(prices/, "prices.json must not go back to the eight-lines-per-snapshot format");
  assert.doesNotMatch(src, /fs\.writeFileSync\((PRICES|CARDS|META)_FILE/, "no direct writes of the data files");
  assert.match(
    src,
    /writeAllAtomic\(\[\s*\[PRICES_FILE, formatPrices\(prices\)\],\s*\[CARDS_FILE, JSON\.stringify\(cards, null, 2\) \+ "\\n"\],\s*\[META_FILE, formatMeta\(\{[^}]*pricesRefreshed: today[^}]*\}\)\],?\s*\]\)/
  );
});

test("refresh_prices dates the prices in data/meta.json, the one freshness file the UI reads", () => {
  assert.match(src, /const META_FILE = "data\/meta\.json"/);
});
