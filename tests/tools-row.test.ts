import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Design critique 2026-10-29, item 7: link the tools and date the prices.
// /print had no link from the dashboard and /needed hid behind an export
// button, and nothing on screen said how old the Cardmarket prices were.
// Plain markup and CSS have no unit-test surface, so these read the sources
// and pin the row, the stamp and the phone ordering the item depends on.

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const filterBar = read("components/FilterBar.tsx");
const tracker = read("components/PortfolioTracker.tsx");

function mediaBlocks(sheet: string, query: string): string {
  const out: string[] = [];
  const marker = `@media ${query}`;
  let from = 0;
  for (;;) {
    const at = sheet.indexOf(marker, from);
    if (at === -1) break;
    const open = sheet.indexOf("{", at);
    let depth = 0;
    let i = open;
    for (; i < sheet.length; i++) {
      if (sheet[i] === "{") depth++;
      else if (sheet[i] === "}" && --depth === 0) break;
    }
    out.push(sheet.slice(open + 1, i));
    from = i;
  }
  return out.join("\n");
}

function declarations(block: string, selector: string): string {
  const rules = block.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  return rules
    .filter((rule) => rule.split("{")[0].split(",").map((s) => s.trim()).includes(selector))
    .map((rule) => rule.split("{")[1].replace("}", ""))
    .join("\n");
}

const base = css.replace(/@media[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, "");
const phone = mediaBlocks(css, "(max-width: 768px)");

test("the FilterBar renders one Tools row: Needed list, Placeholder sheets, CSV, Trade list", () => {
  const row = filterBar.match(/<nav className="tools-row"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(row, 'FilterBar should render <nav className="tools-row">');
  assert.match(row!, /aria-label="Tools"/);
  const needed = row!.indexOf("Needed list");
  const sheets = row!.indexOf("Placeholder sheets");
  const csv = row!.indexOf("onClick={onCsv}");
  const trade = row!.indexOf('<details className="trade-menu">');
  assert.ok(needed !== -1 && sheets !== -1 && csv !== -1 && trade !== -1, "all four tools live in the row");
  assert.ok(needed < sheets && sheets < csv && csv < trade, "order: Needed list, Placeholder sheets, CSV, Trade list");
  assert.match(row!, /href=\{neededHref\}/);
  assert.match(row!, /href=\{printHref\}/, "the placeholder sheets link is the /print page for the active binder");
  assert.doesNotMatch(filterBar, /☐ Needed/, "the old Needed export button is gone");
});

test("the tracker builds the print link with printHref and passes it to the FilterBar", () => {
  assert.match(tracker, /import \{ printHref \} from "@\/lib\/print"/);
  assert.match(tracker, /printHref=\{printHref\("\/print", binderId, false\)\}/);
});

test("the progress row carries a Prices refreshed stamp read from data/meta.json", () => {
  assert.match(tracker, /import \{ cards as allCards, purchases, binders, meta \} from "@\/lib\/data"/);
  assert.match(tracker, /import \{ fmtRefreshed \} from "@\/lib\/meta"/);
  const progress = tracker.match(/<div className="progress">[\s\S]*?<\/div>\s*\n\s*\n/)?.[0];
  assert.ok(progress, "the progress block should exist");
  assert.match(progress!, /<span\s+className="prices-stamp"[^>]*>\s*Prices refreshed \{fmtRefreshed\(meta\.pricesRefreshed\)\}/);
});

test("tools row and stamp are quiet: small muted text, links in ink, no buttons", () => {
  assert.match(declarations(base, ".tools-row"), /font-size:\s*0\.8rem/);
  assert.match(declarations(base, ".tools-row"), /color:\s*var\(--text-muted\)/);
  assert.match(declarations(base, ".tool-link"), /color:\s*var\(--text\)/);
  assert.match(declarations(base, ".tool-link"), /background:\s*none/);
  assert.match(declarations(base, ".prices-stamp"), /font-size:\s*0\.8rem/);
  assert.match(declarations(base, ".prices-stamp"), /color:\s*var\(--text-muted\)/);
  // Keyboard users get the same ring as every other control.
  assert.match(declarations(base, ".tool-link:focus-visible"), /box-shadow:\s*var\(--ring\)/);
});

test("on phones the tools row follows the secondary controls below the results and the stamp wraps under the bar", () => {
  assert.match(declarations(phone, ".tools-row"), /order:\s*\d+/);
  assert.match(declarations(phone, ".progress"), /flex-wrap:\s*wrap/);
  assert.match(declarations(phone, ".prices-stamp"), /flex-basis:\s*100%/);
});
