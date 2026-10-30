import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cardmarketSearchUrl, cardmarketButtonLabel } from "../lib/shortlist.ts";

// The "Need (N): ..." text export lives in lib/needed.ts (collecting-workflow
// item 2) and is covered by tests/needed.test.ts; item 5 only adds the link.

test("cardmarketSearchUrl searches Cardmarket by the printed set code", () => {
  assert.equal(
    cardmarketSearchUrl("M6a 001"),
    "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=M6a%20001"
  );
  assert.equal(
    cardmarketSearchUrl("sv2a 063"),
    "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=sv2a%20063"
  );
});

// Design critique item 8: the wanted-card modal leads with one filled button
// that carries the trend price, so the collector sees the ask before clicking.
test("cardmarketButtonLabel carries the trend price when there is one", () => {
  assert.equal(cardmarketButtonLabel(78.72), "Open on Cardmarket · 78,72 €");
  assert.equal(cardmarketButtonLabel(0.31), "Open on Cardmarket · 0,31 €");
});

test("cardmarketButtonLabel always carries a price: the modal never shows the button for an unpriced card", () => {
  // The button is gated on buyPrice != null in CardModal, so the helper takes a
  // number, not number | null; pin the signature so the null branch cannot creep back.
  const src = fs.readFileSync(new URL("../lib/shortlist.ts", import.meta.url), "utf8");
  assert.match(src, /export function cardmarketButtonLabel\(buyPrice: number\): string/);
  assert.doesNotMatch(src, /buyPrice == null \? "Open on Cardmarket"/);
});

test("cardmarketSearchUrl escapes characters that would break the query string", () => {
  assert.equal(
    cardmarketSearchUrl("s12a 100&x=1"),
    "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=s12a%20100%26x%3D1"
  );
});
