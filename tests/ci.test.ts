// Contract test for the CI and toolchain configuration (roadmap engineering item 1).
// It guards the shape of a few small files rather than runtime behaviour: without it,
// a future edit could silently drop `npm test` from CI again and nothing would notice.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

test(".nvmrc pins a Node major that supports unflagged type stripping", () => {
  const raw = read(".nvmrc").trim();
  assert.match(raw, /^\d+$/, ".nvmrc should contain a bare major version");
  assert.ok(Number(raw) >= 24, `expected Node 24 or newer, got ${raw}`);
});

test("package.json declares the minimum Node engine", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.engines?.node, ">=22.18");
});

test("tests/package.json marks the test files as ES modules", () => {
  const pkg = JSON.parse(read("tests/package.json"));
  assert.deepEqual(pkg, { type: "module" });
});

test("CI picks Node from .nvmrc and runs the tests before the build", () => {
  const yml = read(".github/workflows/ci.yml");
  const lines = yml.split("\n").map((l) => l.trim());

  assert.ok(!lines.includes("node-version: 20"), "CI must not pin Node 20");
  assert.ok(lines.includes("node-version-file: .nvmrc"), "CI should read Node from .nvmrc");

  const idx = (step: string) => lines.indexOf(step);
  const ci = idx("- run: npm ci");
  const testStep = idx("- run: npm test");
  const tsc = idx("run: npx tsc --noEmit");
  const build = idx("run: npm run build");

  assert.ok(ci >= 0, "npm ci step present");
  assert.ok(testStep >= 0, "npm test step present");
  assert.ok(tsc >= 0, "tsc step kept");
  assert.ok(build >= 0, "build step kept");
  assert.ok(ci < testStep, "npm test runs after npm ci");
  assert.ok(testStep < build, "npm test runs before the build");
});
