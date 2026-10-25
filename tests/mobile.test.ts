import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Contract tests for the mobile pass (roadmap design lane, item 1).
// Plain CSS has no unit-test surface of its own, so these read the stylesheet
// and check that the rules the phone layout depends on are present and live in
// the right breakpoint. They are deliberately literal: if one fails, the mobile
// layout changed and the change should be looked at on a real phone.

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("app/globals.css");
const tracker = read("components/PortfolioTracker.tsx");

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

/** Declarations of the first rule whose selector list contains `selector` exactly. */
function declarations(block: string, selector: string): string {
  const rules = block.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  for (const rule of rules) {
    const [sel, body] = rule.split("{");
    const parts = sel.split(",").map((s) => s.trim());
    if (parts.includes(selector)) return body.replace("}", "");
  }
  return "";
}

const base = css.replace(/@media[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, "");
const phone = mediaBlocks(css, "(max-width: 768px)");
const tablet = mediaBlocks(css, "(max-width: 1190px)");

test("stat cards fall to 3 columns on tablets and 2 on phones", () => {
  assert.match(declarations(tablet, ".stats-grid"), /grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  assert.match(declarations(phone, ".stats-grid"), /grid-template-columns:\s*repeat\(2,\s*1fr\)/);
  // The card scales through variables so the phone override is two lines, not a restyle.
  assert.match(declarations(base, ".stat-card"), /padding:\s*var\(--stat-pad\)/);
  assert.match(declarations(base, ".stat-card .value"), /font-size:\s*var\(--stat-value\)/);
  assert.match(declarations(phone, ".stat-card"), /--stat-value:/);
});

test("form fields are at least 16px on phones so iOS Safari does not zoom on focus", () => {
  const decl = declarations(phone, ".controls input") || declarations(phone, ".controls select");
  assert.match(decl, /font-size:\s*16px/);
  assert.match(declarations(phone, ".controls input"), /flex-basis:\s*100%/);
  assert.match(declarations(phone, ".controls select"), /min-width:\s*0/);
});

test("the table scrolls inside a wrapper instead of pushing the page sideways", () => {
  // Phone only: an overflow container would become the sticky-header scroll root on desktop.
  assert.match(declarations(phone, ".table-wrap"), /overflow-x:\s*auto/);
  assert.match(tracker, /<div className="table-wrap">\s*<table className="card-table">/);
  assert.match(declarations(phone, ".preview-icon"), /display:\s*none/);
});

test("binder tabs become a horizontal scroll strip on phones", () => {
  const tabs = declarations(phone, ".binder-tabs");
  assert.match(tabs, /flex-wrap:\s*nowrap/);
  assert.match(tabs, /overflow-x:\s*auto/);
  assert.match(declarations(phone, ".binder-tab"), /flex:\s*0 0 auto/);
});

test("Share and CSV live in a secondary group that moves below the results on phones", () => {
  assert.match(tracker, /<div className="controls-secondary">[\s\S]*Share[\s\S]*CSV[\s\S]*<\/div>/);
  assert.match(declarations(phone, ".controls-secondary"), /order:\s*\d+/);
});
