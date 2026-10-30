import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { tableColumns } from "../lib/tableColumns.ts";
import { rarityLabel } from "../lib/cards.ts";
import type { Binder } from "../lib/binders.ts";
import { card } from "./helpers.ts";

// Design critique 2026-10-29, item 5: table columns that earn their place.
// The column model is pure (lib/tableColumns.ts) so the per-binder decisions
// are unit-tested; the header affordance, sentence case and the two-line phone
// rows are pinned the way tests/mobile.test.ts does it, by reading the
// component source and the stylesheet.

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const cardTable = read("components/CardTable.tsx");
const tracker = read("components/PortfolioTracker.tsx");

const wants: Binder = { id: "kanto-151", name: "Pokedex 151 full-art", description: "", kind: "wants", sort: "pokedexNumber" };
const master: Binder = { id: "m6a-30th", name: "30th CELEBRATION", description: "", kind: "master-set", sort: "setNumber", officialCount: 103 };

const labels = (cols: ReturnType<typeof tableColumns>) => cols.map((c) => c.label);

test("tableColumns always has Own, #, Name, Type, Code, Buy price and Paid, in that order, with sentence-case labels", () => {
  const cols = tableColumns([card({ id: "a" })], wants);
  assert.deepEqual(labels(cols), ["Own", "#", "Name", "Type", "Code", "Buy price", "Paid"]);
  // "#" or a capitalised first word followed by lower-case words: no "Buy Price", no "OWN".
  for (const l of labels(cols)) assert.match(l, /^(#|[A-Z][a-z]*( [a-z]+)*)$/, `${l} is not sentence case`);
});

test("tableColumns never offers Language or Variant", () => {
  const cols = tableColumns([card({ id: "a", variant: "ex", language: "Japanese" })], wants);
  // The TableColumnKey union has no such keys either; this pins the labels.
  assert.equal(cols.some((c) => /language|variant/i.test(c.label)), false);
});

test("tableColumns shows Set only when the binder spans more than one set", () => {
  const oneSet = [card({ id: "a", set: "30th CELEBRATION" }), card({ id: "b", set: "30th CELEBRATION" })];
  assert.equal(labels(tableColumns(oneSet, master)).includes("Set"), false);
  const twoSets = [card({ id: "a", set: "Pokemon Card 151" }), card({ id: "b", set: "Shiny Treasure ex" })];
  assert.deepEqual(labels(tableColumns(twoSets, wants)), ["Own", "#", "Name", "Type", "Code", "Set", "Buy price", "Paid"]);
  assert.equal(labels(tableColumns([], wants)).includes("Set"), false);
});

test("tableColumns adds Rarity after Type when any card has a rarity", () => {
  const mixed = [card({ id: "a" }), card({ id: "b", rarity: "Classic Collection" })];
  assert.deepEqual(labels(tableColumns(mixed, master)), ["Own", "#", "Name", "Type", "Rarity", "Code", "Buy price", "Paid"]);
  assert.equal(labels(tableColumns([card({ id: "a" })], master)).includes("Rarity"), false);
});

test("tableColumns wires the sort keys: # follows the binder sort, Type and Rarity do not sort", () => {
  const cols = tableColumns([card({ id: "a", rarity: "None" }), card({ id: "b", set: "Other" })], master);
  const byKey = Object.fromEntries(cols.map((c) => [c.key, c.sortKey]));
  assert.deepEqual(byKey, {
    own: "owned",
    number: "setNumber",
    name: "name",
    type: null,
    rarity: null,
    code: "code",
    set: "set",
    buyPrice: "buyPrice",
    pricePaid: "pricePaid",
  });
  assert.equal(tableColumns([card({ id: "a" })], wants).find((c) => c.key === "number")?.sortKey, "pokedexNumber");
});

test("rarityLabel maps tcgdex rarities to the short UI label and leaves unknown ones as is", () => {
  assert.equal(rarityLabel("None"), "Common / Uncommon");
  assert.equal(rarityLabel("Special illustration rare"), "SAR");
  assert.equal(rarityLabel("Classic Collection"), "Classic");
  assert.equal(rarityLabel("Hyper rare"), "Hyper rare");
});

test("PortfolioTracker derives the columns from the whole binder, not the filtered rows", () => {
  assert.match(tracker, /tableColumns\(binderCards, binder\)/);
  assert.match(tracker, /<CardTable[\s\S]*columns=\{columns\}/);
});

test("CardTable renders the columns it is given and no longer hard-codes Language or Variant", () => {
  assert.match(cardTable, /columns: TableColumn\[\]/);
  assert.doesNotMatch(cardTable, /languageFlags|card\.language|variant-badge/);
  assert.match(cardTable, /rarityLabel\(card\.rarity\)/);
});

test("every sortable header is a button with aria-sort and an always-visible indicator", () => {
  assert.match(cardTable, /<th[^>]*aria-sort=/);
  assert.match(cardTable, /<button type="button" className="th-sort"/);
  // Inactive sortable headers show a muted two-way glyph; the active one shows its direction.
  assert.match(cardTable, /sort-indicator idle/);
  assert.match(cardTable, /⇅/);
  assert.match(cardTable, /sortDir === "asc" \? "▲" : "▼"/);
});

// --- stylesheet contracts (same literal style as tests/mobile.test.ts) ---

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

test("the sort button hover and the type badge follow the accent discipline of item 9", () => {
  // Hover on a sortable header is an ink lift, like the tools row and the name cell,
  // not the accent (tests/accent.test.ts keeps the allowlist; this pins the intent here).
  const hover = declarations(base, ".th-sort:hover");
  assert.match(hover, /color:\s*var\(--text\)/);
  assert.doesNotMatch(hover, /accent|248,\s*208,\s*48|#f8d030/i);
  // The table badge paints its text with the badge ink so Electric, Ground, Ice,
  // Steel, Normal and Fairy keep dark text on their light fills.
  assert.match(cardTable, /style=\{\{\s*background:\s*b\.color,\s*color:\s*b\.ink\s*\}\}/);
});

test("table headers are 12px sentence case, and only the sort buttons take the pointer", () => {
  const th = declarations(base, ".card-table thead th");
  assert.doesNotMatch(th, /text-transform:\s*uppercase/);
  assert.doesNotMatch(th, /letter-spacing/);
  assert.match(th, /font-size:\s*0\.75rem/);
  assert.doesNotMatch(th, /cursor:\s*pointer/);
  assert.match(declarations(base, ".th-sort"), /cursor:\s*pointer/);
  assert.match(declarations(base, ".sort-indicator.idle"), /opacity:\s*0\.4/);
  assert.match(declarations(base, ".th-sort:focus-visible"), /box-shadow:\s*var\(--ring\)/);
});

test("phone rows are two lines: own, number, name and price first, metadata second, nothing wraps mid-value", () => {
  const row = declarations(phone, ".card-table tbody tr");
  assert.match(row, /display:\s*flex/);
  assert.match(row, /flex-wrap:\s*wrap/);
  // The pseudo-element is the line break between the two lines.
  assert.match(declarations(phone, ".card-table tbody tr::after"), /flex-basis:\s*100%/);
  assert.match(declarations(phone, ".card-table td.row-meta"), /order:\s*2/);
  assert.match(declarations(phone, ".card-table td"), /white-space:\s*nowrap/);
  assert.match(declarations(phone, ".card-table td.name-cell"), /flex:\s*1 1 0/);
  // Headers that do not sort disappear on the phone; the sortable ones become a "Sort by" row.
  assert.match(declarations(phone, ".card-table thead th:not(.sortable)"), /display:\s*none/);
  assert.match(declarations(phone, ".card-table thead tr::before"), /content:\s*"Sort by"/);
});

test("phone Paid cell keeps its 'paid' label: the dot separator is a DOM-sibling rule and Paid always follows the Buy price cell", () => {
  // `td.row-meta + td.row-meta::before` (0,3,3) outranks `td.paid::before` (0,2,2),
  // so the label survives only because the `+` combinator follows DOM order, not the
  // flex order: the Paid cell's DOM predecessor is the Buy price cell, which is not
  // row-meta. Pin all three facts so a column reorder cannot drop the label silently.
  assert.match(declarations(phone, ".card-table td.paid::before"), /content:\s*"· paid"/);
  assert.match(declarations(phone, ".card-table td.row-meta + td.row-meta::before"), /content:\s*"\\00b7"/);
  assert.match(cardTable, /case "buyPrice":\s*return <td key=\{col\.key\} className="price">/);
  assert.match(cardTable, /className=\{paid == null \? "price row-meta paid is-empty" : "price row-meta paid"\}/);
  const configs = [
    tableColumns([card({ id: "a" })], wants),
    tableColumns([card({ id: "a", set: "A" }), card({ id: "b", set: "B", rarity: "None" })], master),
    tableColumns([], wants),
  ];
  for (const cols of configs) {
    const keys = cols.map((c) => c.key);
    assert.equal(keys.indexOf("pricePaid"), keys.indexOf("buyPrice") + 1);
    assert.equal(keys.indexOf("pricePaid"), keys.length - 1);
  }
});
