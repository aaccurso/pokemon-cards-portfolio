import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Contract test for design critique item 8 (2026-10-29): the card modal as a
// buying surface. Like tests/modal-mobile.test.ts this pins source and CSS
// shape, since the repo has no DOM runner.
//
// - On a wanted card with a chosen print (buyPrice != null) the primary action
//   is a filled "Open on Cardmarket · <price>" button above the details, built
//   from lib/shortlist.ts. A wants-binder card with no print chosen yet keeps
//   the quiet Code-row link: its code is a default regular print the collector
//   has not picked, so a filled button would be a misleading buying prompt.
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

test("a wanted card with a chosen print gets a primary Cardmarket button with the price", () => {
  assert.match(modalSrc, /import \{ cardmarketSearchUrl, cardmarketButtonLabel \} from "@\/lib\/shortlist"/);
  const buy = modalSrc.indexOf('className="modal-buy"');
  assert.ok(buy !== -1, "the modal should render an a.modal-buy");
  const buyTag = modalSrc.slice(modalSrc.lastIndexOf("<a", buy), modalSrc.indexOf("</a>", buy));
  assert.match(buyTag, /href=\{cardmarketSearchUrl\(card\.code\)\}/);
  assert.match(buyTag, /target="_blank"/);
  assert.match(buyTag, /rel="noopener noreferrer"/);
  assert.match(buyTag, /\{cardmarketButtonLabel\(card\.buyPrice\)\}/);
  // Gated on the card being wanted AND having a chosen print (66 of the 69
  // wanted Kanto cards have buyPrice == null and must not get the button).
  assert.match(modalSrc, /\{!owned && card\.buyPrice != null && \(\s*<a\s+className="modal-buy"/);
  assert.ok(buy < modalSrc.indexOf('className="modal-details"'), "the button comes before the details list");
});

test("the quiet Code-row link stays whenever the primary button is absent", () => {
  // Owned cards (price checks) and wants-binder cards with no print chosen yet.
  assert.match(modalSrc, /\{\(owned \|\| card\.buyPrice == null\) && \(\s*<a\s+className="cardmarket-link"/);
  // Exactly one Cardmarket link is rendered in either state: the two gates are complements.
  const buyGate = modalSrc.indexOf("{!owned && card.buyPrice != null && (");
  const linkGate = modalSrc.indexOf("{(owned || card.buyPrice == null) && (");
  assert.ok(buyGate !== -1 && linkGate !== -1 && buyGate < linkGate, "button gate, then its complement on the link");
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
  // Text on an accent fill goes through the shared token (tests/accent.test.ts).
  assert.match(buy, /color:\s*var\(--accent-ink\)/);
  assert.doesNotMatch(buy, /color:\s*#222/);
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
