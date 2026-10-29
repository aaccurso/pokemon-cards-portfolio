import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Contract test for design critique item 8 (2026-10-29): the card modal as a
// buying surface. Like tests/modal-mobile.test.ts this pins source and CSS
// shape, since the repo has no DOM runner.
//
// - On a wanted card the primary action is a filled "Open on Cardmarket · <price>"
//   button above the details, built from lib/shortlist.ts.
// - The price facts (status, trend, paid) come first in the details list so they
//   are on the first screen of a phone.
// - On phones the card image is capped at 45dvh (45vh fallback first).

const readText = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const css = stripComments(readText("app/globals.css"));
const modalSrc = readText("components/CardModal.tsx");

const MOBILE = "@media (max-width: 768px)";

function closeOf(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return i;
  }
  return source.length;
}

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

test("a wanted card gets a primary Cardmarket button with the price, owned cards keep the Code-row link", () => {
  assert.match(modalSrc, /import \{ cardmarketSearchUrl, cardmarketButtonLabel \} from "@\/lib\/shortlist"/);
  const buy = modalSrc.indexOf('className="modal-buy"');
  assert.ok(buy !== -1, "the modal should render an a.modal-buy");
  const buyTag = modalSrc.slice(modalSrc.lastIndexOf("<a", buy), modalSrc.indexOf("</a>", buy));
  assert.match(buyTag, /href=\{cardmarketSearchUrl\(card\.code\)\}/);
  assert.match(buyTag, /target="_blank"/);
  assert.match(buyTag, /rel="noopener noreferrer"/);
  assert.match(buyTag, /\{cardmarketButtonLabel\(card\.buyPrice\)\}/);
  // Gated on the card being wanted, placed before the details list.
  assert.match(modalSrc, /\{!owned && \(\s*<a\s+className="modal-buy"/);
  assert.ok(buy < modalSrc.indexOf('className="modal-details"'), "the button comes before the details list");
  // The quiet Code-row link stays for owned cards only (price checks), not as the wanted card's call to action.
  assert.match(modalSrc, /\{owned && \(\s*<a\s+className="cardmarket-link"/);
});

test("price facts lead the details list: Status, then price rows, before Set and Code", () => {
  const status = modalSrc.indexOf("<dt>Status</dt>");
  const trend = modalSrc.indexOf("<dt>Trend price</dt>");
  const paid = modalSrc.indexOf("<dt>Paid</dt>");
  const set = modalSrc.indexOf("<dt>Set</dt>");
  const code = modalSrc.indexOf("<dt>Code</dt>");
  assert.ok(status !== -1 && trend !== -1 && paid !== -1 && set !== -1 && code !== -1, "all rows present");
  assert.ok(status < trend && trend < paid, "status, trend, paid in that order");
  assert.ok(paid < set && set < code, "the identity rows follow the price facts");
  assert.doesNotMatch(modalSrc, /<dt>Buy Price<\/dt>/, "the price row is named for what it is: the Cardmarket trend price");
});

test(".modal-buy is the one filled button in the modal and reuses the shared focus ring", () => {
  const buy = rule(desktop, ".modal-buy");
  assert.ok(buy, ".modal-buy should have a rule");
  assert.match(buy, /background:\s*var\(--accent\)/);
  assert.match(buy, /color:\s*#222/);
  assert.match(buy, /text-decoration:\s*none/);
  const focus = rule(desktop, ".modal-buy:focus-visible");
  assert.ok(focus, ".modal-buy:focus-visible should have a rule");
  assert.match(focus, /box-shadow:\s*var\(--ring\)/);
});

test("phones cap the modal image at 45dvh with the vh fallback declared first", () => {
  const img = rule(mobile, ".modal-image");
  assert.ok(img, ".modal-image should have a mobile rule");
  const vh = img.indexOf("max-height: 45vh");
  const dvh = img.indexOf("max-height: 45dvh");
  assert.ok(vh !== -1, "45vh fallback present");
  assert.ok(dvh !== -1, "45dvh present");
  assert.ok(vh < dvh, "the vh fallback must come before dvh so old browsers keep a value");
  assert.match(img, /width:\s*auto/, "the image shrinks to its capped height instead of filling the column");
  const clip = rule(mobile, ".modal-image-clip");
  assert.ok(clip, ".modal-image-clip should have a mobile rule");
  assert.match(clip, /width:\s*auto/, "the rounded clip hugs the capped image");
});
