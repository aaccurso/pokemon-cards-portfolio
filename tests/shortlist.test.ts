import { test } from "node:test";
import assert from "node:assert/strict";
import { cardmarketSearchUrl } from "../lib/shortlist.ts";

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

test("cardmarketSearchUrl escapes characters that would break the query string", () => {
  assert.equal(
    cardmarketSearchUrl("s12a 100&x=1"),
    "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=s12a%20100%26x%3D1"
  );
});
