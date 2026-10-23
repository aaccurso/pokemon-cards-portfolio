import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCode, parseSetNumber, toTcgdexId } from "../scripts/lib/tcgdex.mjs";

const setIds = ["SV2a", "M4", "S6a", "SM-P", "S-P", "SV8a"];

test("parseCode and parseSetNumber across known shapes", () => {
  assert.deepEqual(parseCode("sv2a 063"), { setCode: "sv2a", number: "063" });
  assert.equal(parseCode("DP4d"), null);
  assert.equal(parseSetNumber("sv2a 063"), 63);
  assert.equal(parseSetNumber("M6a 126"), 126);
  assert.equal(parseSetNumber("S-P SWSH194"), 194);
  assert.equal(parseSetNumber("SM-P 187"), 187);
  assert.equal(parseSetNumber("svg 16"), 16);
  assert.equal(parseSetNumber("DP4d"), null);
});

test("toTcgdexId matches set ids case-insensitively and returns null otherwise", () => {
  assert.equal(toTcgdexId("sv2a 063", setIds), "SV2a-063");
  assert.equal(toTcgdexId("m4 091", setIds), "M4-091");
  assert.equal(toTcgdexId("SM-P 187", setIds), "SM-P-187");
  assert.equal(toTcgdexId("mBG 022", setIds), null);
  assert.equal(toTcgdexId("DP4d", setIds), null);
});
