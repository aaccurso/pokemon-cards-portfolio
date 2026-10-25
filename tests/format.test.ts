import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtEur, fmt0 } from "../lib/format.ts";

test("fmtEur renders two decimals with a comma separator and a euro sign", () => {
  assert.equal(fmtEur(12.5), "12,50 €");
  assert.equal(fmtEur(0), "0,00 €");
  assert.equal(fmtEur(1234.567), "1234,57 €");
  assert.equal(fmtEur(-3.2), "-3,20 €");
});

test("fmt0 renders whole euros with no decimals or sign", () => {
  assert.equal(fmt0(41.4), "41");
  assert.equal(fmt0(620.5), "621");
  assert.equal(fmt0(0), "0");
});
