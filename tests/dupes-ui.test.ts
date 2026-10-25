import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { emptyStateMessage } from "../lib/cards.ts";

// Contract test for the duplicates filter and trade list (collecting-workflow
// lane, item 3) after the filter bar and table were split out of the tracker.
// Reads the component sources and checks that the "dupes" ownership option,
// the URL parser, the filter branch, the xN copies badge and the trade-list
// disclosure each live in the component that now owns that concern.

const read = (rel: string) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

const filterBar = read("components/FilterBar.tsx");
const tracker = read("components/PortfolioTracker.tsx");
const table = read("components/CardTable.tsx");

test("FilterBar types and offers the dupes ownership option after Wanted", () => {
  assert.match(filterBar, /export type OwnFilter = "all" \| "owned" \| "wanted" \| "dupes";/);
  const wanted = filterBar.indexOf('<option value="wanted">Wanted Only</option>');
  const dupes = filterBar.indexOf('<option value="dupes">Duplicates Only</option>');
  assert.ok(wanted !== -1, "Wanted option should exist");
  assert.ok(dupes > wanted, "Duplicates option should follow the Wanted option");
});

test("the tracker reads own=dupes from the URL and filters to cards with extra copies", () => {
  assert.match(tracker, /own === "owned" \|\| own === "wanted" \|\| own === "dupes"/);
  assert.match(tracker, /filters\.own === "dupes"/);
  assert.match(tracker, /duplicateCount \?\? 0\) > 0/);
});

test("the trade list sits in the FilterBar beside the CSV button, hidden with no extra copies", () => {
  const csv = filterBar.indexOf("onClick={onCsv}");
  const trade = filterBar.indexOf('<details className="trade-menu">');
  assert.ok(csv !== -1, "CSV button should exist");
  assert.ok(trade > csv, "trade-menu disclosure should follow the CSV button");
  assert.match(filterBar, /tradeCount > 0 &&/);
  assert.match(filterBar, /onClick=\{onTradeText\}/);
  assert.match(filterBar, /onClick=\{onTradeCsv\}/);
  // The tracker owns the data and the handlers; the bar only renders them.
  assert.match(tracker, /tradeCount=\{tradeRows\.length\}/);
  assert.match(tracker, /buildTradeList\(binderCards, ownership\)/);
  assert.match(tracker, /tradeListText\(tradeRows\)/);
  assert.match(tracker, /tradeListCsv\(tradeRows\)/);
});

test("the copies badge is rendered by CardTable and passed to CardTile", () => {
  assert.match(table, /own\.purchaseCount > 1 &&/);
  assert.match(table, /className="copies-badge"/);
  assert.match(tracker, /copies=\{ownership\.get\(card\.id\)\?\.purchaseCount\}/);
});

test("emptyStateMessage names the dupes filter when a binder has no extra copies", () => {
  assert.equal(
    emptyStateMessage({ search: "", ownershipFilter: "dupes", binderOwned: 12 }),
    "No duplicates in this binder."
  );
  // Search text does not change the cause: clearing it would not create duplicates.
  assert.equal(
    emptyStateMessage({ search: "pikachu", ownershipFilter: "dupes", binderOwned: 12 }),
    "No duplicates in this binder."
  );
});
