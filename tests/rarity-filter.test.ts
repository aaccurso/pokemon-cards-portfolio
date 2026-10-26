import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Contract test for the rarity filter (roadmap collector-insight item 2) after
// the eng-6 split: the filter must live in the shared `Filters` object that
// FilterBar owns, not in a standalone useState in PortfolioTracker. Otherwise
// `resetFilters` (binder switch, the empty state's "Clear filters") leaves the
// rarity filter behind while the breakdown row still reads active.

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const filterBar = read("components/FilterBar.tsx");
const tracker = read("components/PortfolioTracker.tsx");

test("Filters carries rarity and EMPTY_FILTERS resets it to \"all\"", () => {
  const typeBlock = filterBar.match(/export type Filters = \{([\s\S]*?)\n\};/);
  assert.ok(typeBlock, "FilterBar should export the Filters type");
  assert.match(typeBlock![1], /\brarity: string;/);
  const empty = filterBar.match(/export const EMPTY_FILTERS: Filters = \{([^}]*)\}/);
  assert.ok(empty, "FilterBar should export EMPTY_FILTERS");
  assert.match(empty![1], /\brarity: "all"/);
});

test("FilterBar renders the rarity select from the shared filters, only when the binder has rarities", () => {
  assert.match(filterBar, /rarities: RarityRow\[\]/, "FilterBar takes the breakdown rows as a prop");
  assert.match(filterBar, /rarities\.length > 0 && \(/, "select is hidden when no card has a rarity");
  assert.match(filterBar, /value=\{filters\.rarity\}/);
  assert.match(filterBar, /onChange\(\{ rarity: e\.target\.value \}\)/);
  assert.match(filterBar, /aria-label="Rarity"/);
});

test("PortfolioTracker reads, writes and applies rarity through Filters, with no standalone state", () => {
  const readFilters = tracker.match(/function readFilters\(params: URLSearchParams\): Filters \{([\s\S]*?)\n\}/);
  assert.ok(readFilters, "readFilters should exist");
  assert.match(readFilters![1], /rarity: params\.get\("rarity"\) \?\? "all"/);
  assert.match(tracker, /if \(filters\.rarity !== "all"\) p\.set\("rarity", filters\.rarity\);/);
  assert.match(tracker, /filters\.rarity !== "all"\) \{\s*list = list\.filter\(\(c\) => c\.rarity === filters\.rarity\)/);
  assert.match(tracker, /updateFilters\(\{ rarity: active \? "all" : r\.rarity \}\)/, "breakdown rows patch the shared filters");
  assert.doesNotMatch(tracker, /useState\([^)]*"rarity"/, "no separate useState for the rarity filter");
  assert.doesNotMatch(tracker, /\bsetRarityFilter\b|\brarityFilter\b/, "no standalone rarityFilter state");
});

test("PortfolioTracker uses fmt0 from lib/format instead of a local copy", () => {
  assert.doesNotMatch(tracker, /function fmt0\(/, "fmt0 belongs in lib/format.ts");
  assert.match(tracker, /import \{[^}]*\bfmt0\b[^}]*\} from "@\/lib\/format"/);
});
