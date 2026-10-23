import { test } from "node:test";
import assert from "node:assert/strict";
import { englishName, largeImage, numberedProducts } from "../scripts/lib/pricecharting.mjs";

test("englishName strips the trailing card number", () => {
  assert.equal(englishName("Pikachu ex #126"), "Pikachu ex");
  assert.equal(englishName("Darkrai & Cresselia LEGEND #151"), "Darkrai & Cresselia LEGEND");
  assert.equal(englishName("Booster Box"), "Booster Box");
});

test("largeImage swaps the thumbnail size for 1600", () => {
  assert.equal(
    largeImage("https://storage.googleapis.com/images.pricecharting.com/abc/60.jpg"),
    "https://storage.googleapis.com/images.pricecharting.com/abc/1600.jpg"
  );
});

test("numberedProducts keeps one product per card number and drops unnumbered ones", () => {
  const m = numberedProducts([
    { id: "1", productUri: "exeggcute-1", productName: "Exeggcute #1" },
    { id: "2", productUri: "exeggcute-1", productName: "Exeggcute #1" },
    { id: "3", productUri: "booster-box", productName: "Booster Box" },
  ]);
  assert.equal(m.size, 1);
  assert.equal(m.get(1).id, "1");
});
