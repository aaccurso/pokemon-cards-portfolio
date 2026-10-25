import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("package.json keeps the eng-1 test script and adds the smoke script", () => {
  // eng-1 (CI on Node 24) silences the typeless-package warning in the test runner.
  // eng-3 appends the smoke runner right after it. Both must survive the merge.
  assert.equal(pkg.scripts.test, 'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test "tests/**/*.test.ts"');
  assert.equal(pkg.scripts.smoke, "node scripts/smoke.mjs");
  assert.equal(pkg.engines?.node, ">=22.18");
});
