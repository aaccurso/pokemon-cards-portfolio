import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { activeTabScrollLeft } from "../lib/tabStrip.ts";

// Contract tests for the mobile pass (roadmap design lane, item 1).
// Plain CSS has no unit-test surface of its own, so these read the stylesheet
// and check that the rules the phone layout depends on are present and live in
// the right breakpoint. They are deliberately literal: if one fails, the mobile
// layout changed and the change should be looked at on a real phone.

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
// The filter bar and the table were split out of PortfolioTracker into their own components.
const filterBar = read("components/FilterBar.tsx");
const cardTable = read("components/CardTable.tsx");

/** Concatenate the bodies of every `@media <query> { ... }` block in the sheet. */
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

/** Declarations of every rule whose selector list contains `selector` exactly, merged like the cascade. */
function declarations(block: string, selector: string): string {
  const rules = block.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  return rules
    .filter((rule) => rule.split("{")[0].split(",").map((s) => s.trim()).includes(selector))
    .map((rule) => rule.split("{")[1].replace("}", ""))
    .join("\n");
}

const base = css.replace(/@media[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, "");
const phone = mediaBlocks(css, "(max-width: 768px)");
const tablet = mediaBlocks(css, "(max-width: 1190px)");

test("the stats strip keeps two lead figures side by side and scales them through a variable on phones", () => {
  assert.match(declarations(base, ".stat-leads"), /grid-template-columns:\s*1fr 1fr/);
  // The lead size goes through a variable so the phone override is one line, not a restyle.
  assert.match(declarations(base, ".stat-lead .value"), /font-size:\s*var\(--stat-lead\)/);
  assert.match(declarations(phone, ".stats-strip"), /--stat-lead:/);
  // Values are ink, not accent: the accent is reserved for the active tab, the progress fill and actions.
  assert.match(declarations(base, ".stat-lead .value"), /color:\s*var\(--text\)/);
});

test("form fields are at least 16px on phones so iOS Safari does not zoom on focus", () => {
  assert.match(declarations(phone, ".controls input"), /font-size:\s*16px/);
  assert.match(declarations(phone, ".controls select"), /font-size:\s*16px/);
  assert.match(declarations(phone, ".controls input"), /flex-basis:\s*100%/);
  assert.match(declarations(phone, ".controls select"), /min-width:\s*0/);
});

test("the table scrolls inside a wrapper instead of pushing the page sideways", () => {
  // Phone only: an overflow container would become the sticky-header scroll root on desktop.
  assert.match(declarations(phone, ".table-wrap"), /overflow-x:\s*auto/);
  assert.match(cardTable, /<div className="table-wrap">\s*<table className="card-table">/);
  assert.match(declarations(phone, ".preview-icon"), /display:\s*none/);
});

test("binder tabs become a horizontal scroll strip on phones", () => {
  const tabs = declarations(phone, ".binder-tabs");
  assert.match(tabs, /flex-wrap:\s*nowrap/);
  assert.match(tabs, /overflow-x:\s*auto/);
  assert.match(declarations(phone, ".binder-tab"), /flex:\s*0 0 auto/);
});

test("Share lives in a secondary group, and CSV in the tools row, that both move below the results on phones", () => {
  assert.match(filterBar, /<div className="controls-secondary">[\s\S]*Share[\s\S]*<\/div>\s*\{\/\*/);
  assert.match(filterBar, /<nav className="tools-row"[\s\S]*CSV[\s\S]*<\/nav>/);
  assert.match(declarations(phone, ".controls-secondary"), /order:\s*\d+/);
  assert.match(declarations(phone, ".tools-row"), /order:\s*\d+/);
});

// Keeping the active tab visible must only move the strip's own horizontal
// axis. scrollIntoView also scrolls every ancestor, window included, so on a
// reload while scrolled down, a bfcache restore or a ?card= deep link the page
// jumped back to the top on hydration (desktop and /print too).
test("BinderTabs never calls scrollIntoView", () => {
  assert.doesNotMatch(read("components/BinderTabs.tsx"), /scrollIntoView/);
  assert.match(read("components/BinderTabs.tsx"), /activeTabScrollLeft/);
});

test("activeTabScrollLeft is null when the strip does not overflow (desktop wraps)", () => {
  assert.equal(
    activeTabScrollLeft({ navLeft: 0, navWidth: 900, navScrollLeft: 0, navScrollWidth: 900, elLeft: 600, elWidth: 120 }),
    null,
  );
  assert.equal(
    activeTabScrollLeft({ navLeft: 0, navWidth: 900, navScrollLeft: 0, navScrollWidth: 700, elLeft: 600, elWidth: 120 }),
    null,
  );
});

test("activeTabScrollLeft centres the active tab inside an overflowing strip", () => {
  // Strip 360 wide showing 0..360 of 900; tab sits at 600..720 in content space.
  const left = activeTabScrollLeft({
    navLeft: 16, navWidth: 360, navScrollLeft: 0, navScrollWidth: 900, elLeft: 616, elWidth: 120,
  });
  assert.equal(left, 600 - (360 - 120) / 2); // 480: tab centre 660 == 480 + 180
  // Already scrolled: the element's viewport position shifts but the answer is the same.
  assert.equal(
    activeTabScrollLeft({ navLeft: 16, navWidth: 360, navScrollLeft: 200, navScrollWidth: 900, elLeft: 416, elWidth: 120 }),
    480,
  );
});

test("activeTabScrollLeft clamps to the strip's scroll range", () => {
  assert.equal(
    activeTabScrollLeft({ navLeft: 0, navWidth: 360, navScrollLeft: 0, navScrollWidth: 900, elLeft: 10, elWidth: 120 }),
    0,
  );
  assert.equal(
    activeTabScrollLeft({ navLeft: 0, navWidth: 360, navScrollLeft: 0, navScrollWidth: 900, elLeft: 780, elWidth: 120 }),
    540,
  );
});
