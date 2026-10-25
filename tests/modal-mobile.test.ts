import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Static contract for roadmap item design-5: the card modal on small screens.
// There is no DOM test runner in this repo (zero dependencies), so this test
// pins the CSS and markup shape that the mobile layout relies on.

const readText = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = readText("app/globals.css");
const modalSrc = readText("components/CardModal.tsx");

const MOBILE = "@media (max-width: 768px)";

/** Index of the matching closing brace for the block opened at `open`. */
function closeOf(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return i;
  }
  return source.length;
}

/** Concatenated bodies of every mobile media block. */
function mobileBlocks(source: string): string {
  let out = "";
  let from = 0;
  for (;;) {
    const at = source.indexOf(MOBILE, from);
    if (at === -1) return out;
    const open = source.indexOf("{", at);
    const close = closeOf(source, open);
    out += source.slice(open + 1, close);
    from = close + 1;
  }
}

/** The stylesheet with every mobile media block removed. */
function withoutMobile(source: string): string {
  let out = source;
  for (;;) {
    const at = out.indexOf(MOBILE);
    if (at === -1) return out;
    const open = out.indexOf("{", at);
    const close = closeOf(out, open);
    out = out.slice(0, at) + out.slice(close + 1);
  }
}

/** Declaration block of the first rule whose selector list contains exactly `selector`, or null. */
function rule(source: string, selector: string): string | null {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of source.matchAll(re)) {
    const selectors = m[1].split(",").map((s) => s.trim());
    if (selectors.includes(selector)) return m[2];
  }
  return null;
}

const mobile = mobileBlocks(css);
const desktop = withoutMobile(css);

test("desktop keeps the nav buttons absolutely positioned via a display: contents wrapper", () => {
  const row = rule(desktop, ".modal-nav-row");
  assert.ok(row, ".modal-nav-row should have a desktop rule");
  assert.match(row, /display:\s*contents/);
  assert.match(rule(desktop, ".modal-nav") ?? "", /position:\s*absolute/);
});

test("mobile pins the nav row to the bottom of the scrolling modal", () => {
  const row = rule(mobile, ".modal-nav-row");
  assert.ok(row, ".modal-nav-row should have a mobile rule");
  assert.match(row, /display:\s*flex/);
  assert.match(row, /position:\s*sticky/);
  assert.match(row, /bottom:\s*0/);
  assert.match(row, /background:\s*var\(--surface\)/);

  const nav = rule(mobile, ".modal-nav-row .modal-nav");
  assert.ok(nav, "nav buttons should be reset inside the row on mobile");
  assert.match(nav, /position:\s*static/);
  assert.match(nav, /transform:\s*none/);
});

test("mobile modal uses the dynamic viewport unit with a vh fallback declared first", () => {
  const content = rule(mobile, ".modal-content");
  assert.ok(content, ".modal-content should have a mobile rule");
  const vh = content.indexOf("max-height: 90vh");
  const dvh = content.indexOf("max-height: 90dvh");
  assert.ok(vh !== -1, "90vh fallback present");
  assert.ok(dvh !== -1, "90dvh present");
  assert.ok(vh < dvh, "the vh fallback must come before dvh so old browsers keep a value");
  assert.match(content, /padding-bottom:\s*0/);
});

test("CardModal renders the nav buttons inside .modal-nav-row after .modal-info", () => {
  const info = modalSrc.indexOf('className="modal-info"');
  const row = modalSrc.indexOf('className="modal-nav-row"');
  const prev = modalSrc.indexOf("modal-nav-prev");
  const next = modalSrc.indexOf("modal-nav-next");
  assert.ok(info !== -1 && row !== -1 && prev !== -1 && next !== -1, "all markers present");
  assert.ok(row > info, "nav row comes after the info column");
  assert.ok(prev > row && next > row, "both nav buttons live inside the nav row");
});
