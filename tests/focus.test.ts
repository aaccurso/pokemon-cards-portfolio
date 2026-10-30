import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Contract test for keyboard focus rings (roadmap design lane, item 2).
// Reads app/globals.css and checks that every interactive control the lane
// names owns a :focus-visible rule with a visible indicator, instead of
// falling back to the browser default ring (invisible on the yellow active
// pill in Chrome, clipped by border-radius: 999px in Safari).

const css = fs
  .readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

type Rule = { selectors: string[]; decls: string };

// Innermost `selector { declarations }` pairs; @media wrappers are skipped
// because their body contains braces and therefore never matches [^{}]*.
const rules: Rule[] = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selectorText = m[1].trim();
  if (selectorText.startsWith("@")) continue;
  rules.push({ selectors: selectorText.split(",").map((s) => s.trim()), decls: m[2] });
}

const rulesFor = (selector: string) => rules.filter((r) => r.selectors.includes(selector));

const declared = (decls: string, prop: string) =>
  [...decls.matchAll(/([a-z-]+)\s*:\s*([^;]+)/g)].filter((m) => m[1] === prop).map((m) => m[2].trim());

const visibleIndicator = (decls: string) =>
  declared(decls, "box-shadow").some((v) => v !== "none") ||
  declared(decls, "outline").some((v) => v !== "none" && v !== "0");

const rootDecls = rulesFor(":root").map((r) => r.decls).join("\n");

test("globals.css defines a shared --ring double ring (inner bg gap, outer accent)", () => {
  const m = rootDecls.match(/--ring\s*:\s*([^;]+);/);
  assert.ok(m, ":root should declare --ring");
  assert.match(m![1], /var\(--bg\)/, "inner ring should be the page background so it reads on yellow");
  assert.match(m![1], /var\(--accent\)/, "outer ring should be the accent colour");
});

test("every pill, tab, toggle, nav button and tile owns a visible :focus-visible rule", () => {
  const controls = [
    ".binder-tab",
    ".pill-toggle",
    ".view-toggle button",
    ".action-button",
    ".modal-nav",
    ".card-tile",
    ".card-name-cell",
    ".print-btn",
    ".th-sort",
  ];
  const missing = controls.filter((c) => !rulesFor(`${c}:focus-visible`).some((r) => visibleIndicator(r.decls)));
  assert.deepEqual(missing, [], `no visible :focus-visible indicator for: ${missing.join(", ")}`);
});

test("focused card tiles reuse the hover glow on the image frame", () => {
  const glow = rulesFor(".card-tile:focus-visible .card-tile-image");
  assert.ok(glow.length > 0, ".card-tile:focus-visible .card-tile-image should exist");
  assert.ok(glow.some((r) => /box-shadow\s*:/.test(r.decls) && /border-color\s*:/.test(r.decls)));
});

test("the light print page overrides --ring with its own blue so the ring reads on white", () => {
  const printDecls = rulesFor(".print-page").map((r) => r.decls).join("\n");
  const m = printDecls.match(/--ring\s*:\s*([^;]+);/);
  assert.ok(m, ".print-page should redeclare --ring");
  assert.match(m![1], /#2a6fdb/i);
  assert.doesNotMatch(m![1], /var\(--accent\)/);
});
