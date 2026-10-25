import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE_TITLE, siteDescription, ogAlt } from "../lib/binders.ts";
import type { Binder } from "../lib/binders.ts";

const binders: Binder[] = [
  { id: "kanto-151", name: "Pokedex 151 full-art", description: "", kind: "wants", sort: "pokedexNumber" },
  { id: "m6a-30th", name: "30th CELEBRATION", description: "", kind: "master-set", sort: "setNumber", officialCount: 103 },
];

test("siteDescription enumerates every binder by name, in data order", () => {
  const d = siteDescription(binders);
  assert.match(d, /Pokedex 151 full-art, 30th CELEBRATION/);
  assert.match(d, /Cardmarket/);
  assert.doesNotMatch(d, /—/, "no em-dashes in UI copy");
});

test("siteDescription still reads as a sentence with no binders", () => {
  const d = siteDescription([]);
  assert.match(d, /Japanese Pokémon TCG binders\./);
  assert.doesNotMatch(d, /: \./);
});

test("ogAlt pairs the site title with the binder names", () => {
  assert.equal(SITE_TITLE, "Pokémon card binders");
  assert.equal(ogAlt(binders), "Pokémon card binders: Pokedex 151 full-art, 30th CELEBRATION");
  assert.equal(ogAlt([]), "Pokémon card binders");
});
