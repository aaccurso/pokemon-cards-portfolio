import { test } from "node:test";
import assert from "node:assert/strict";
import { cardmarketSearchUrl, neededText } from "../lib/shortlist.ts";
import { buildOwnershipMap } from "../lib/purchases.ts";
import { card } from "./helpers.ts";

const master = { kind: "master-set" as const, officialCount: 103 };
const wants = { kind: "wants" as const };

const owning = (...ids: string[]) =>
  buildOwnershipMap({ shipments: [
    { id: "s", seller: null, date: null, shipping: null, fees: null, total: 1,
      items: ids.map((cardId) => ({ cardId, pricePaid: null, condition: "NM" })) },
  ] });

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

test("neededText lists missing set numbers for a master-set binder, padded and ascending", () => {
  const cards = [
    card({ id: "c", setNumber: 101, binderId: "m6a-30th" }),
    card({ id: "a", setNumber: 3, binderId: "m6a-30th" }),
    card({ id: "b", setNumber: 12, binderId: "m6a-30th" }),
    card({ id: "owned", setNumber: 7, binderId: "m6a-30th" }),
  ];
  assert.equal(neededText(cards, owning("owned"), master), "Need (3): 003 012 101");
});

test("neededText lists Pokedex number and name for a wants binder, by Pokedex order", () => {
  const cards = [
    card({ id: "charizard", name: "Charizard ex", pokedexNumber: 6 }),
    card({ id: "pikachu", name: "Pikachu", pokedexNumber: 25 }),
    card({ id: "bulbasaur", name: "Bulbasaur", pokedexNumber: 1 }),
  ];
  assert.equal(
    neededText(cards, owning("bulbasaur"), wants),
    "Need (2): #006 Charizard ex, #025 Pikachu"
  );
});

test("neededText with nothing missing", () => {
  assert.equal(neededText([card({ id: "x" })], owning("x"), wants), "Need (0)");
});
