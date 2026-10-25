import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Contract test for the finish-as-singles shortlist UI (collecting-workflow lane, item 5).
// The components are client-only React, so this reads their source the way
// tests/focus.test.ts reads globals.css: it pins the shape of the port after
// stats and filter controls moved into StatsGrid.tsx and FilterBar.tsx, so a
// stale inline insertion into PortfolioTracker.tsx cannot pass by accident.

const root = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

const statsGrid = read("components/StatsGrid.tsx");
const filterBar = read("components/FilterBar.tsx");
const tracker = read("components/PortfolioTracker.tsx");
const modal = read("components/CardModal.tsx");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

test("StatsGrid takes an optional onBuySingles and renders the stat-link button only for a master set with wanted cards", () => {
  assert.match(statsGrid, /onBuySingles\?: \(\) => void/, "StatsGrid should declare onBuySingles as optional");
  assert.match(statsGrid, /className="stat-link"/, "StatsGrid should render the .stat-link button");
  assert.match(
    statsGrid,
    /isMasterSet && stats\.wanted > 0 && onBuySingles && \(/,
    "the button must be gated on master-set, wanted > 0 and the handler being passed"
  );
  assert.match(statsGrid, /onClick=\{onBuySingles\}/);
  assert.match(statsGrid, /Buy as singles/);
});

test("FilterBar takes onCopyNeeded and copiedNeeded and shows Copy as text only on the Wanted filter", () => {
  assert.match(filterBar, /onCopyNeeded: \(\) => void/);
  assert.match(filterBar, /copiedNeeded: boolean/);
  assert.match(filterBar, /filters\.own === "wanted" && \(/, "button must be gated on the wanted filter");
  assert.match(filterBar, /onClick=\{onCopyNeeded\}/);
  assert.match(filterBar, /Copy as text/);
});

test("Copy as text reuses item 2's neededText; lib/shortlist.ts keeps only the Cardmarket URL", () => {
  // The lane says item 5 reuses item 2's text formatter rather than carrying a second one.
  assert.match(tracker, /import \{ neededText \} from "@\/lib\/needed"/);
  assert.doesNotMatch(tracker, /from "@\/lib\/shortlist"/, "PortfolioTracker has no reason to import lib/shortlist");
  const shortlist = read("lib/shortlist.ts");
  assert.doesNotMatch(shortlist, /neededText/, "lib/shortlist.ts must not duplicate lib/needed.ts");
  assert.match(shortlist, /export function cardmarketSearchUrl/);
});

test("PortfolioTracker builds the shortlist from the shared filter state and sort module, not legacy setters", () => {
  assert.match(tracker, /function showSinglesShortlist\(\)/);
  assert.match(tracker, /setFilters\(\{ \.\.\.EMPTY_FILTERS, own: "wanted" \}\)/);
  assert.match(tracker, /setViewMode\("table"\)/);
  assert.match(tracker, /setSortKey\("buyPrice"\)/);
  assert.match(tracker, /setSortDir\("desc"\)/);
  assert.doesNotMatch(tracker, /setOwnershipFilter/, "ownership filter lives in Filters now");
  assert.doesNotMatch(tracker, /ownershipFilter === "wanted"/, "the Copy button belongs to FilterBar");
  assert.match(tracker, /onBuySingles=\{showSinglesShortlist\}/);
  assert.match(tracker, /onCopyNeeded=\{handleCopyNeeded\}/);
  assert.match(tracker, /copiedNeeded=\{copiedNeeded\}/);
  assert.match(tracker, /neededText\(filtered, ownership, binder\)/);
});

test("CardModal links the set code to a Cardmarket search", () => {
  assert.match(modal, /import \{ cardmarketSearchUrl \} from "@\/lib\/shortlist"/);
  assert.match(modal, /href=\{cardmarketSearchUrl\(card\.code\)\}/);
  assert.match(modal, /rel="noopener noreferrer"/);
});

test("the new link controls reuse the shared --ring focus indicator", () => {
  for (const sel of [".stat-link", ".cardmarket-link"]) {
    const re = new RegExp(`${sel.replace(".", "\\.")}:focus-visible[^{]*\\{[^}]*box-shadow:\\s*var\\(--ring\\)`);
    assert.match(css, re, `${sel}:focus-visible should use var(--ring)`);
  }
});
