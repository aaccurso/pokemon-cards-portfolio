import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtEur } from "../lib/format.ts";

test("fmtEur renders two decimals with a comma separator and a euro sign", () => {
  assert.equal(fmtEur(12.5), "12,50 €");
  assert.equal(fmtEur(0), "0,00 €");
  assert.equal(fmtEur(1234.567), "1234,57 €");
  assert.equal(fmtEur(-3.2), "-3,20 €");
});
