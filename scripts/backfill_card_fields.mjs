#!/usr/bin/env node
/**
 * One-off: add setNumber, category ("Pokemon" when absent) and tcgdexId to
 * every card in data/cards.json. Idempotent; writes the file once at the end.
 *
 *   node scripts/backfill_card_fields.mjs
 */
import fs from "node:fs";
import { fetchJaSetIds, parseSetNumber, toTcgdexId } from "./lib/tcgdex.mjs";

const FILE = "data/cards.json";
const cards = JSON.parse(fs.readFileSync(FILE, "utf8"));
const setIds = await fetchJaSetIds();

let setNumbers = 0;
let categories = 0;
let tcgdexIds = 0;
const noNumber = [];
const unmapped = [];

for (const card of cards) {
  const n = parseSetNumber(card.code);
  if (n == null) noNumber.push(card.code);
  else if (card.setNumber !== n) {
    card.setNumber = n;
    setNumbers++;
  }
  if (!card.category) {
    card.category = "Pokemon";
    categories++;
  }
  const id = toTcgdexId(card.code, setIds);
  if (!id) unmapped.push(card.code);
  else if (card.tcgdexId !== id) {
    card.tcgdexId = id;
    tcgdexIds++;
  }
}

fs.writeFileSync(FILE, JSON.stringify(cards, null, 2) + "\n");
console.log(
  `setNumber set on ${setNumbers}, category on ${categories}, tcgdexId on ${tcgdexIds} card(s)`
);
if (noNumber.length) console.log("no set number parsed:", noNumber.join(", "));
if (unmapped.length) console.log("no tcgdex set match:", unmapped.join(", "));
