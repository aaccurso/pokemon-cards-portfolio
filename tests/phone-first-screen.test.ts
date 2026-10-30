import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { tabStripFade } from "../lib/tabStrip.ts";
import { activeFilterCount } from "../lib/filters.ts";

// Contract tests for the phone first screen (design critique 2026-10-29, item 4).
// Goal: on a 390px wide phone the first card tile starts above 500px. The
// stylesheet and the components are read as text, the way mobile.test.ts does
// it, so a change that undoes one of these rules shows up here before it is
// looked at on a device. Desktop rules live in the base sheet and are pinned
// unchanged below.

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const filterBar = read("components/FilterBar.tsx");
const binderTabs = read("components/BinderTabs.tsx");

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

test("the title is 22px and left aligned on phones, the description hidden; desktop keeps 2rem centred", () => {
  assert.match(declarations(phone, "header h1"), /font-size:\s*22px/);
  assert.match(declarations(phone, "header h1"), /text-align:\s*left/);
  assert.match(declarations(phone, "header .binder-description"), /display:\s*none/);
  assert.match(declarations(base, "header h1"), /font-size:\s*2rem/);
  assert.match(declarations(base, "header"), /text-align:\s*center/);
});

test("the binder tab strip fades only the edge that overflows", () => {
  // The component measures the strip and writes the answer to a data attribute the CSS reads.
  assert.match(binderTabs, /tabStripFade/);
  assert.match(binderTabs, /data-fade=/);
  assert.match(declarations(phone, '.binder-tabs[data-fade="none"]'), /mask-image:\s*none/);
  assert.match(declarations(phone, '.binder-tabs[data-fade="start"]'), /mask-image:\s*linear-gradient\(to left/);
  assert.match(declarations(phone, '.binder-tabs[data-fade="both"]'), /mask-image:\s*linear-gradient\(to right,\s*transparent/);
});

test("tabStripFade names the overflowing edges", () => {
  assert.equal(tabStripFade({ scrollLeft: 0, scrollWidth: 700, clientWidth: 900 }), "none");
  assert.equal(tabStripFade({ scrollLeft: 0, scrollWidth: 764, clientWidth: 390 }), "end");
  assert.equal(tabStripFade({ scrollLeft: 374, scrollWidth: 764, clientWidth: 390 }), "start");
  assert.equal(tabStripFade({ scrollLeft: 120, scrollWidth: 764, clientWidth: 390 }), "both");
  // Sub-pixel scroll positions count as the edge.
  assert.equal(tabStripFade({ scrollLeft: 373.6, scrollWidth: 764, clientWidth: 390 }), "start");
  assert.equal(tabStripFade({ scrollLeft: 0.4, scrollWidth: 764, clientWidth: 390 }), "end");
});

test("the stats strip tightens its padding and line spacing on phones", () => {
  assert.match(declarations(phone, ".stats-strip"), /padding:\s*0\.\d+rem/);
  assert.match(declarations(phone, ".stat-leads"), /padding-bottom:\s*0\.\d+rem/);
  assert.match(declarations(phone, ".stat-lines"), /gap:\s*0\.\d+rem/);
  assert.match(declarations(phone, ".stat-lines"), /margin-top:\s*0\.\d+rem/);
  assert.match(declarations(phone, ".progress"), /margin-bottom:\s*1rem/);
  assert.match(declarations(phone, "header"), /margin-bottom:\s*0\.\d+rem/);
});

test("rarity rows become wrapping chips without bars on phones", () => {
  const breakdown = declarations(phone, ".rarity-breakdown");
  assert.match(breakdown, /flex-direction:\s*row/);
  assert.match(breakdown, /flex-wrap:\s*wrap/);
  assert.match(declarations(phone, ".rarity-bar"), /display:\s*none/);
  assert.match(declarations(phone, ".rarity-row"), /display:\s*inline-flex/);
  // Desktop keeps the four-column rows.
  assert.match(declarations(base, ".rarity-row"), /grid-template-columns:\s*9rem/);
});

test("the selects sit behind a Filters disclosure that is a plain row on desktop", () => {
  assert.match(filterBar, /className="filters-toggle"/);
  assert.match(filterBar, /aria-expanded=\{filtersOpen\}/);
  assert.match(filterBar, /aria-controls="filters-panel"/);
  // The panel holds every select and the Illustration toggle; the view toggle stays outside it.
  const panel = filterBar.match(/<div\s+id="filters-panel"[\s\S]*?<div className="view-toggle"/);
  assert.ok(panel, "filters-panel should precede the view toggle");
  assert.match(panel![0], /value=\{filters\.type\}/);
  assert.match(panel![0], /value=\{filters\.set\}/);
  assert.match(panel![0], /value=\{filters\.own\}/);
  assert.match(panel![0], /value=\{filters\.rarity\}/);
  assert.match(panel![0], /pill-toggle/);
  // Desktop: the toggle does not exist and the panel dissolves into the controls row.
  assert.match(declarations(base, ".filters-toggle"), /display:\s*none/);
  assert.match(declarations(base, ".filters-panel"), /display:\s*contents/);
  // Phone: one row of search, Filters and the view toggle; the panel opens below it.
  assert.doesNotMatch(declarations(phone, ".filters-toggle"), /display:\s*none/);
  assert.match(declarations(phone, ".filters-toggle"), /display:\s*inline-flex/);
  assert.match(declarations(phone, ".filters-panel"), /display:\s*none/);
  assert.match(declarations(phone, ".filters-panel.open"), /display:\s*flex/);
  assert.match(declarations(phone, ".filters-panel.open"), /flex-basis:\s*100%/);
  assert.match(declarations(phone, ".controls input"), /flex:\s*1 1 0/);
  assert.doesNotMatch(declarations(phone, ".controls input"), /flex-basis:\s*100%/);
});

test("the Filters button shows how many filters are set while the panel is closed", () => {
  assert.match(filterBar, /activeFilterCount\(/);
  assert.equal(activeFilterCount({ type: "all", set: "all", own: "all", illus: false, rarity: "all" }), 0);
  assert.equal(activeFilterCount({ type: "Fire", set: "all", own: "all", illus: false, rarity: "all" }), 1);
  assert.equal(
    activeFilterCount({ type: "Fire", set: "Pokemon Card 151", own: "wanted", illus: true, rarity: "SAR" }),
    5,
  );
  // The search box is its own control on the row, so it is never counted.
  const withSearch = { q: "pika", type: "all", set: "all", own: "all", illus: false, rarity: "all" };
  assert.equal(activeFilterCount(withSearch), 0);
});

test("the Filters badge and the open/active outlines are neutral, like .pill-toggle.active (accent discipline, item 9)", () => {
  // The count badge is a neutral chip: border fill with ink text, no accent and no stray hex.
  const badge = declarations(base, ".filters-count");
  assert.match(badge, /background:\s*var\(--border\)/);
  assert.match(badge, /color:\s*var\(--text\)/);
  assert.doesNotMatch(badge, /var\(--accent\)|#222|#f8d030/i);
  // An open Filters disclosure and an active rarity chip outline in muted ink, the same as .pill-toggle.active.
  assert.match(declarations(phone, '.filters-toggle[aria-expanded="true"]'), /border-color:\s*var\(--text-muted\)/);
  assert.match(declarations(phone, ".rarity-row.active"), /border-color:\s*var\(--text-muted\)/);
  assert.doesNotMatch(declarations(phone, '.filters-toggle[aria-expanded="true"]'), /var\(--accent\)/);
  assert.doesNotMatch(declarations(phone, ".rarity-row.active"), /var\(--accent\)/);
});
