import { test } from "node:test";
import assert from "node:assert/strict";
import { getSortValue, compareBySort } from "../lib/sort.ts";
import type { OwnershipMap } from "../lib/purchases.ts";
import { card } from "./helpers.ts";

const owned = (id: string, pricePaid: number | null) =>
  [id, { owned: true as const, pricePaid, duplicateCount: 0, purchaseCount: 1 }] as const;

const ownership: OwnershipMap = new Map([owned("a", 3.5), owned("b", null)]);

test("getSortValue reads card fields and derives owned and pricePaid", () => {
  const a = card({ id: "a", name: "Abra", buyPrice: 2 });
  const c = card({ id: "c", name: "Cubone", buyPrice: null });
  assert.equal(getSortValue(a, "name", ownership), "Abra");
  assert.equal(getSortValue(a, "buyPrice", ownership), 2);
  assert.equal(getSortValue(c, "buyPrice", ownership), null);
  assert.equal(getSortValue(a, "owned", ownership), true);
  assert.equal(getSortValue(c, "owned", ownership), false);
  assert.equal(getSortValue(a, "pricePaid", ownership), 3.5);
  assert.equal(getSortValue(card({ id: "b" }), "pricePaid", ownership), null);
  assert.equal(getSortValue(c, "pricePaid", ownership), null);
});

test("compareBySort orders by key, puts nulls last in both directions", () => {
  const a = card({ id: "a", name: "Abra", buyPrice: 2 });
  const b = card({ id: "b", name: "Bulbasaur", buyPrice: 5 });
  const c = card({ id: "c", name: "Cubone", buyPrice: null });
  const ids = (list: ReturnType<typeof card>[]) => list.map((x) => x.id);

  assert.deepEqual(ids([c, b, a].sort(compareBySort("buyPrice", "asc", ownership))), ["a", "b", "c"]);
  assert.deepEqual(ids([c, a, b].sort(compareBySort("buyPrice", "desc", ownership))), ["b", "a", "c"]);
  assert.deepEqual(ids([b, c, a].sort(compareBySort("name", "desc", ownership))), ["c", "b", "a"]);
  assert.equal(compareBySort("buyPrice", "asc", ownership)(c, card({ id: "d", buyPrice: null })), 0);
});
