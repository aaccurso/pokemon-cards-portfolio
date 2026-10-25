import { test } from "node:test";
import assert from "node:assert/strict";
import { isInkLight, printHref } from "../lib/print.ts";

test("isInkLight is on only for the literal ?ink=1", () => {
  assert.equal(isInkLight("1"), true);
  assert.equal(isInkLight("0"), false);
  assert.equal(isInkLight("true"), false);
  assert.equal(isInkLight(null), false);
  assert.equal(isInkLight(undefined), false);
});

test("printHref omits the default binder and a disabled ink saver", () => {
  assert.equal(printHref("/print", "kanto-151", false), "/print");
  assert.equal(printHref("/print", "m6a-30th", false), "/print?binder=m6a-30th");
  assert.equal(printHref("/print", "kanto-151", true), "/print?ink=1");
  assert.equal(printHref("/print", "m6a-30th", true), "/print?binder=m6a-30th&ink=1");
});
