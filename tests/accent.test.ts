import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { typeBadges, typeColors } from "../lib/cards.ts";
import { card } from "./helpers.ts";

// Contract tests for design critique item 9: accent discipline and a neutral dark.
// The accent (#f8d030) is spent on three things only: the active binder tab, the
// one primary action on a screen, and the progress fill. Everything else is ink
// on a neutral ground. Like tests/mobile.test.ts and tests/focus.test.ts, these
// read the stylesheet and pin the rules, because plain CSS has no other seam.

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

type Rule = { selectors: string[]; decls: string };

// Innermost `selector { declarations }` pairs, @media wrappers skipped.
const rules: Rule[] = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selectorText = m[1].trim();
  if (selectorText.startsWith("@")) continue;
  rules.push({ selectors: selectorText.split(",").map((s) => s.trim()), decls: m[2] });
}

const declsFor = (selector: string) =>
  rules.filter((r) => r.selectors.includes(selector)).map((r) => r.decls).join("\n");

const root = declsFor(":root");

test("the ground and surface are a neutral dark, not navy", () => {
  assert.match(root, /--bg:\s*#141416/i);
  assert.match(root, /--surface:\s*#1d1d21/i);
  assert.match(root, /--text:\s*#f2f2f2/i);
  assert.match(root, /--accent:\s*#f8d030/i);
  // Text that sits on the accent fill goes through one token.
  assert.match(root, /--accent-ink:\s*#1a1a1a/i);
  assert.doesNotMatch(css, /#1a1a2e|#16213e|#2a3a5c/i, "no navy hex left in the sheet");
});

test("the h1, the modal title and the stat values are ink, not accent", () => {
  assert.match(declsFor("header h1"), /color:\s*var\(--text\)/);
  assert.match(declsFor(".modal-info h2"), /color:\s*var\(--text\)/);
  assert.match(declsFor(".stat-lead .value"), /color:\s*var\(--text\)/);
});

test("the accent appears only on the active tab, primary actions and the progress fill", () => {
  const allowed = new Set([
    ":root",
    ".binder-tab.active",
    ".progress-bar-fill",
    ".action-button.primary",
    ".importer-actions button.primary",
    // "Buy as singles" is the one primary action on the master-set dashboard.
    ".stat-link",
    // "Open on Cardmarket · <price>" is the one primary action in the card modal.
    ".modal-buy",
    // Semantic status colour, not decoration.
    ".tag-warn",
  ]);
  // The token, the hex, or a literal rgba tint of the same yellow all count.
  const offenders = rules
    .filter((r) => /var\(--accent\)|#f8d030|248,\s*208,\s*48/i.test(r.decls))
    .flatMap((r) => r.selectors)
    // Keyboard focus rings keep the accent: they are an indicator, not decoration.
    .filter((s) => !/:focus/.test(s) && !allowed.has(s));
  assert.deepEqual([...new Set(offenders)], []);
});

test("hover states and the alt-image notice are a neutral lift, not a yellow halo", () => {
  const tileHover = declsFor(".card-tile:hover .card-tile-image");
  assert.match(tileHover, /border-color:\s*var\(--text-muted\)/);
  assert.match(tileHover, /rgba\(255,\s*255,\s*255,/);
  assert.match(declsFor(".card-name-cell:hover"), /background:\s*var\(--surface-hover\)/);
  const notice = declsFor(".modal-alt-notice");
  assert.match(notice, /background:\s*rgba\(255,\s*255,\s*255,/);
  assert.match(notice, /border:\s*1px solid var\(--border\)/);
  // The focused tile keeps the accent frame: it is the focus indicator.
  assert.match(declsFor(".card-tile:focus-visible .card-tile-image"), /248,\s*208,\s*48/);
});

test("the progress fill is one flat accent, and the rarity bars are neutral", () => {
  const fill = declsFor(".progress-bar-fill");
  assert.match(fill, /background:\s*var\(--accent\)/);
  assert.doesNotMatch(fill, /gradient/);
  const rarity = declsFor(".rarity-bar-fill");
  assert.doesNotMatch(rarity, /gradient|accent|#f8d030/i);
});

test("accent fills use the ink token for their text", () => {
  for (const sel of [".binder-tab.active", ".action-button.primary", ".view-toggle button.active", ".pill-toggle.active", ".modal-buy"]) {
    assert.doesNotMatch(declsFor(sel), /color:\s*#222/, `${sel} still uses the old #222`);
  }
  assert.match(declsFor(".binder-tab.active"), /color:\s*var\(--accent-ink\)/);
  assert.match(declsFor(".action-button.primary"), /color:\s*var\(--accent-ink\)/);
  assert.match(declsFor(".modal-buy"), /color:\s*var\(--accent-ink\)/);
});

test("type badges drop the text-shadow and the variant badge is neutral", () => {
  assert.doesNotMatch(declsFor(".type-badge"), /text-shadow/);
  assert.doesNotMatch(declsFor(".variant-badge"), /248,\s*208,\s*48|accent/);
  // The copies badge is ink too.
  assert.doesNotMatch(declsFor(".copies-badge"), /accent/);
});

test("typeBadges carries dark ink for the light type fills and white for the rest", () => {
  const light = ["Electric", "Ground", "Ice", "Steel", "Normal", "Fairy"];
  for (const t of light) {
    assert.equal(typeBadges(card({ type1: t }))[0].ink, "#1a1a1a", `${t} should get dark text`);
  }
  for (const t of Object.keys(typeColors).filter((t) => !light.includes(t))) {
    assert.equal(typeBadges(card({ type1: t }))[0].ink, "#fff", `${t} should keep white text`);
  }
  assert.equal(typeBadges(card({ type1: "Water", type2: "Ice" }))[1].ink, "#1a1a1a");
  assert.equal(typeBadges(card({ pokedexNumber: null, type1: null, category: "Trainer" }))[0].ink, "#fff");
  assert.equal(typeBadges(card({ type1: "Mystery" }))[0].ink, "#fff");
});

test("every on-screen type badge paints its text with the badge ink", () => {
  for (const file of ["components/CardTile.tsx", "components/CardTable.tsx", "components/CardModal.tsx"]) {
    const src = read(file);
    assert.match(src, /className=\{`type-badge[^`]*`\}\s*style=\{\{\s*background:\s*b\.color,\s*color:\s*b\.ink\s*\}\}/, file);
  }
});

test("the print placeholder badge is unchanged", () => {
  const ph = declsFor(".ph-type-badge");
  assert.match(ph, /color:\s*#fff/);
  assert.match(read("components/PlaceholderCard.tsx"), /background:\s*"var\(--badge\)"/);
});

test("the OG image uses the new ground and surface", () => {
  const og = read("app/opengraph-image.tsx");
  assert.match(og, /#141416/);
  assert.match(og, /#1d1d21/);
  assert.doesNotMatch(og, /#1a1a2e|#16213e|#8892a4|#e0e0e0/i);
});
