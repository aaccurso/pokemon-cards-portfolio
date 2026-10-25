import { test } from "node:test";
import assert from "node:assert/strict";
import { SORT_KEYS, isSortKey, getSortValue } from "../lib/sort.ts";
import type { OwnershipMap } from "../lib/purchases.ts";
import { card } from "./helpers.ts";

test("isSortKey accepts exactly the eight sortable keys", () => {
  for (const k of ["owned", "pokedexNumber", "setNumber", "name", "code", "set", "buyPrice", "pricePaid"]) {
    assert.equal(isSortKey(k), true, k);
  }
  assert.equal(SORT_KEYS.size, 8);
  assert.equal(isSortKey("id"), false, "a Card field that is not sortable");
  assert.equal(isSortKey("__proto__"), false);
  assert.equal(isSortKey(""), false);
  assert.equal(isSortKey(null), false);
  assert.equal(isSortKey(undefined), false);
});

test("getSortValue reads derived keys from ownership and card keys from the card", () => {
  const ownership: OwnershipMap = new Map([
    ["a", { owned: true, pricePaid: 3.5, duplicateCount: 0, purchaseCount: 1 }],
    ["b", { owned: true, pricePaid: null, duplicateCount: 0, purchaseCount: 1 }],
  ]);
  const a = card({ id: "a", name: "A", buyPrice: 10 });
  const b = card({ id: "b", name: "B", buyPrice: null });
  const c = card({ id: "c", name: "C", setNumber: 7 });
  assert.equal(getSortValue(a, "pricePaid", ownership), 3.5);
  assert.equal(getSortValue(b, "pricePaid", ownership), null, "pulled copy has no price");
  assert.equal(getSortValue(c, "pricePaid", ownership), null, "unowned has no price");
  assert.equal(getSortValue(a, "owned", ownership), true);
  assert.equal(getSortValue(c, "owned", ownership), false);
  assert.equal(getSortValue(a, "buyPrice", ownership), 10);
  assert.equal(getSortValue(b, "buyPrice", ownership), null);
  assert.equal(getSortValue(c, "setNumber", ownership), 7);
  assert.equal(getSortValue(c, "name", ownership), "C");
});
