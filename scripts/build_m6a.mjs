#!/usr/bin/env node
/**
 * One-off: build the 30th CELEBRATION (M6a) master-set entries, cards 001 to
 * 165, from tcgdex (Japanese names, dex ids, types, rarity) plus PriceCharting
 * (English names, images), and append them to data/cards.json.
 *
 * Idempotent: ids already present are skipped. Writes the file once at the end.
 * Then run `node scripts/download_images.mjs` to localize the images.
 *
 *   node scripts/build_m6a.mjs
 */
import fs from "node:fs";
import { fetchSet, fetchCard } from "./lib/tcgdex.mjs";
import { fetchConsoleProducts, numberedProducts } from "./lib/pricecharting.mjs";
import { buildM6aCard, SET_CODE } from "./lib/m6a.mjs";

const FILE = "data/cards.json";
const CONSOLE = "pokemon-japanese-30th-celebration";
const MAX_NUMBER = 165;
const TRAINER_NAMES = {
  "101": "Ultra Ball",
  "102": "Poke Pad",
  "103": "Switch",
  "138": "Misty",
  "153": "N",
};

const cards = JSON.parse(fs.readFileSync(FILE, "utf8"));
const existing = new Set(cards.map((c) => c.id));

const set = await fetchSet(SET_CODE);
if (!set) throw new Error(`tcgdex set ${SET_CODE} not found`);
const localIds = set.cards
  .map((c) => c.localId)
  .filter((l) => /^\d{3}$/.test(l) && Number(l) <= MAX_NUMBER)
  .sort();
console.log(`tcgdex ${SET_CODE}: ${localIds.length} numbered cards`);

const products = numberedProducts(await fetchConsoleProducts(CONSOLE));
console.log(`PriceCharting: ${products.size} numbered products`);

const added = [];
const skipped = [];
const noImage = [];
for (let i = 0; i < localIds.length; i++) {
  const localId = localIds[i];
  const tc = await fetchCard(`${SET_CODE}-${localId}`);
  if (!tc) throw new Error(`tcgdex card ${SET_CODE}-${localId} not found`);
  const card = buildM6aCard(tc, products.get(Number(localId)), TRAINER_NAMES);
  if (existing.has(card.id)) {
    skipped.push(card.id);
    continue;
  }
  if (!card.imageUrl) noImage.push(card.id);
  added.push(card);
  if ((i + 1) % 25 === 0 || i === localIds.length - 1) {
    console.log(`  ${i + 1} / ${localIds.length}`);
  }
}

fs.writeFileSync(FILE, JSON.stringify([...cards, ...added], null, 2) + "\n");
console.log(`added ${added.length}, skipped ${skipped.length} already present`);
if (noImage.length) {
  console.log("no image (fill by hand per CLAUDE.md):", noImage.join(", "));
}
