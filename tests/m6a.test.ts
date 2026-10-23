import { test } from "node:test";
import assert from "node:assert/strict";
import { detectVariant, generationOf, slugify, buildM6aCard } from "../scripts/lib/m6a.mjs";

test("detectVariant follows the existing convention", () => {
  assert.equal(detectVariant("Pikachu ex"), "ex");
  assert.equal(detectVariant("Rayquaza EX"), "EX");
  assert.equal(detectVariant("Solgaleo GX"), "GX");
  assert.equal(detectVariant("Zacian V"), "V");
  assert.equal(detectVariant("Mew VMAX"), "VMAX");
  assert.equal(detectVariant("Arceus VSTAR"), "VSTAR");
  assert.equal(detectVariant("Greninja BREAK"), "BREAK");
  assert.equal(detectVariant("Darkrai & Cresselia LEGEND"), "LEGEND");
  assert.equal(detectVariant("M Gardevoir EX"), "Mega / EX");
  assert.equal(detectVariant("Alolan Exeggutor"), "Alolan Form");
  assert.equal(detectVariant("Galarian Meowth"), "Galarian Form");
  assert.equal(detectVariant("Hisuian Zorua"), "Hisuian Form");
  assert.equal(detectVariant("Erika's Jigglypuff"), "Trainer's Pokemon");
  assert.equal(detectVariant("Pikachu"), null);
});

test("generationOf thresholds", () => {
  assert.equal(generationOf(151), 1);
  assert.equal(generationOf(152), 2);
  assert.equal(generationOf(386), 3);
  assert.equal(generationOf(1025), 9);
});

test("slugify", () => {
  assert.equal(slugify("Darkrai & Cresselia LEGEND"), "darkrai-cresselia-legend");
  assert.equal(slugify("Alolan Exeggutor"), "alolan-exeggutor");
  assert.equal(slugify("Erika's Jigglypuff"), "erikas-jigglypuff");
});

test("buildM6aCard maps a Pokemon and a Trainer", () => {
  const pika = buildM6aCard(
    { id: "M6a-126", localId: "126", name: "ピカチュウex", category: "Pokemon", dexId: [25], types: ["Lightning"], rarity: "Special illustration rare" },
    { productName: "Pikachu ex #126", imageUri: "https://storage.googleapis.com/images.pricecharting.com/h/60.jpg" },
    {}
  );
  assert.equal(pika.id, "m6a-126-pikachu-ex");
  assert.equal(pika.name, "Pikachu ex");
  assert.equal(pika.code, "M6a 126");
  assert.equal(pika.setNumber, 126);
  assert.equal(pika.set, "30th CELEBRATION");
  assert.equal(pika.tcgdexId, "M6a-126");
  assert.equal(pika.pokedexNumber, 25);
  assert.equal(pika.type1, "Electric");
  assert.equal(pika.type2, null);
  assert.equal(pika.variant, "ex");
  assert.equal(pika.generation, 1);
  assert.equal(pika.category, "Pokemon");
  assert.equal(pika.rarity, "Special illustration rare");
  assert.equal(pika.nameJa, "ピカチュウex");
  assert.equal(pika.binderId, "m6a-30th");
  assert.equal(pika.buyPrice, null);
  assert.equal(pika.language, "Japanese");
  assert.equal(pika.condition, "NM");
  assert.equal(pika.qty, 1);
  assert.equal(pika.imageUrl, "https://storage.googleapis.com/images.pricecharting.com/h/1600.jpg");
  assert.equal(pika.localImage, false);

  const n = buildM6aCard(
    { id: "M6a-153", localId: "153", name: "N", category: "Trainer", rarity: "Classic Collection" },
    undefined,
    { "153": "N" }
  );
  assert.equal(n.id, "m6a-153-n");
  assert.equal(n.name, "N");
  assert.equal(n.pokedexNumber, null);
  assert.equal(n.type1, null);
  assert.equal(n.generation, null);
  assert.equal(n.category, "Trainer");
  assert.equal(n.variant, null);
  assert.equal(n.imageUrl, null);

  assert.throws(() => buildM6aCard({ id: "M6a-999", localId: "999", name: "?", category: "Trainer" }, undefined, {}));
});

test("buildM6aCard maps Metal to Steel", () => {
  const c = buildM6aCard(
    { id: "M6a-082", localId: "082", name: "ディアルガ", category: "Pokemon", dexId: [483], types: ["Metal"], rarity: "None" },
    { productName: "Dialga #82", imageUri: "https://storage.googleapis.com/images.pricecharting.com/h/60.jpg" }, {});
  assert.equal(c.type1, "Steel");
});

test("buildM6aCard takes ex/EX casing from the Japanese name and keeps variant detection working", () => {
  const mewtwo = buildM6aCard(
    { id: "M6a-128", localId: "128", name: "ミュウツーex", category: "Pokemon", dexId: [150], types: ["Psychic"], rarity: "Futuristic Rare" },
    { productName: "Mewtwo Ex #128", imageUri: "https://storage.googleapis.com/images.pricecharting.com/h/60.jpg" }, {});
  assert.equal(mewtwo.name, "Mewtwo ex");
  assert.equal(mewtwo.variant, "ex");
  assert.equal(mewtwo.id, "m6a-128-mewtwo-ex");
  const garde = buildM6aCard(
    { id: "M6a-156", localId: "156", name: "MサーナイトEX", category: "Pokemon", dexId: [282], types: ["Fairy"], rarity: "Classic Collection" },
    { productName: "M Gardevoir Ex #156", imageUri: "https://storage.googleapis.com/images.pricecharting.com/h/60.jpg" }, {});
  assert.equal(garde.name, "M Gardevoir EX");
  assert.equal(garde.variant, "Mega / EX");
});

test("buildM6aCard applies hand name fixes for malformed PriceCharting names", () => {
  const c = buildM6aCard(
    { id: "M6a-160", localId: "160", name: "ピカチュウ&ゼクロムGX", category: "Pokemon", dexId: [25, 644], types: ["Lightning"], rarity: "Classic Collection" },
    { productName: "Pikachu & ZekromTag Team GX #160", imageUri: "https://storage.googleapis.com/images.pricecharting.com/h/60.jpg" }, {});
  assert.equal(c.name, "Pikachu & Zekrom GX");
  assert.equal(c.id, "m6a-160-pikachu-zekrom-gx");
  assert.equal(c.variant, "GX");
});
