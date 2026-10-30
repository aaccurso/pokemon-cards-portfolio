import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { rarityLabel, tileRarity } from "../lib/cards.ts";
import { card } from "./helpers.ts";

// Design critique 2026-10-29, item 6: rarity on tiles and in the modal.
// AR / SAR / RR / Classic is what prices an M6a card, and until now it showed
// nowhere on a tile. A small neutral chip sits beside the number label on the
// tile and in the modal, using the short labels from rarityOrder. The tile
// skips Common / Uncommon ("None"), which is 93 of the 165 M6a cards and would
// put the same chip on most of the grid; the modal shows every rarity.

const read = (rel: string) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

test("rarityLabel maps tcgdex rarities to the rarityOrder short label and keeps unknown ones raw", () => {
  assert.equal(rarityLabel("Special illustration rare"), "SAR");
  assert.equal(rarityLabel("Illustration rare"), "AR");
  assert.equal(rarityLabel("Double rare"), "RR");
  assert.equal(rarityLabel("Classic Collection"), "Classic");
  assert.equal(rarityLabel("None"), "Common / Uncommon");
  assert.equal(rarityLabel("Zebra rare"), "Zebra rare");
});

test("tileRarity is the short label for priced rarities and null for no rarity or Common / Uncommon", () => {
  assert.equal(tileRarity(card({ rarity: "Special illustration rare" })), "SAR");
  assert.equal(tileRarity(card({ rarity: "Classic Collection" })), "Classic");
  assert.equal(tileRarity(card({ rarity: "Zebra rare" })), "Zebra rare");
  assert.equal(tileRarity(card({ rarity: "None" })), null);
  assert.equal(tileRarity(card({})), null);
});

test("CardTile renders the rarity chip beside the number label, only when tileRarity has one", () => {
  const tile = read("components/CardTile.tsx");
  assert.match(tile, /import \{[^}]*\btileRarity\b[^}]*\} from "@\/lib\/cards"/);
  const num = tile.indexOf('<span className="card-tile-num">');
  const chip = tile.indexOf('<span className="rarity-chip"');
  const name = tile.indexOf('<span className="card-tile-name">');
  assert.ok(num !== -1 && chip !== -1 && name !== -1, "number, chip and name spans should exist");
  assert.ok(num < chip && chip < name, "the chip should sit between the number and the name");
  assert.match(tile, /\{tileRarity\(card\) && \(/, "the chip should render only when tileRarity returns a label");
  // Type badges stay as they are: the chip is not one of them.
  assert.match(tile, /<div className="card-tile-types">\s*\{typeBadges\(card\)\.map/);
});

test("CardModal renders the rarity chip beside the number label, for every card with a rarity", () => {
  const modal = read("components/CardModal.tsx");
  assert.match(modal, /import \{[^}]*\brarityLabel\b[^}]*\} from "@\/lib\/cards"/);
  const dd = modal.match(/<dd>\s*\{numberLabel\(card, binder\)\}([\s\S]*?)<\/dd>/);
  assert.ok(dd, "the Number row should still lead with numberLabel");
  assert.match(dd![1], /\{card\.rarity && \(/, "the chip should render only when the card has a rarity");
  assert.match(dd![1], /className="rarity-chip"/);
  assert.match(dd![1], /\{rarityLabel\(card\.rarity\)\}/);
});

test("the rarity chip is a neutral outlined chip, not an accent one", () => {
  const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = css.match(/\.rarity-chip\s*\{([^}]*)\}/);
  assert.ok(rule, "globals.css should style .rarity-chip");
  const decls = rule![1];
  assert.match(decls, /border:\s*1px solid var\(--border\)/);
  assert.match(decls, /color:\s*var\(--text-muted\)/);
  assert.doesNotMatch(decls, /--accent/, "the chip must not use the accent colour");
  assert.match(decls, /white-space:\s*nowrap/);
});
