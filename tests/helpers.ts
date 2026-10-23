import type { Card } from "../lib/cards.ts";

export const card = (over: Partial<Card>): Card => ({
  id: "x", name: "X", code: "sv2a 001", set: "S", qty: 1, language: "Japanese",
  condition: "NM", buyPrice: null, pokedexNumber: 1, type1: "Grass", type2: null,
  generation: 1, variant: null, binderId: "kanto-151", setNumber: 1, ...over,
});
