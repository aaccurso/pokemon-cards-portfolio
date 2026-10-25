import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Static contract for roadmap engineering item 2 (PR A): what the dashboard and
// the print page trust from the URL. There is no DOM test runner in this repo
// (zero dependencies), so this pins the source shape; lib/sort.ts and
// lib/print.ts carry the unit tests for the helpers these lines call.

const readText = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const tracker = readText("components/PortfolioTracker.tsx");
const print = readText("app/print/page.tsx");
const tabs = readText("components/BinderTabs.tsx");

test("?sort= is validated with isSortKey instead of being cast to SortKey", () => {
  assert.doesNotMatch(tracker, /as SortKey/, "no cast of the raw query string");
  assert.match(tracker, /isSortKey\(/, "the raw value goes through isSortKey");
  assert.match(tracker, /isSortKey\((\w+)\)\s*\?\s*\1\s*:\s*initialBinder\.sort/, "an unknown key falls back to the binder's default sort");
});

test("?illus=1 is read, written and applied only in a wants binder", () => {
  assert.match(tracker, /illus:\s*params\.get\("illus"\) === "1" && kind === "wants"/, "readFilters ignores ?illus=1 outside a wants binder");
  assert.match(tracker, /readFilters\(searchParams, initialBinder\.kind\)/, "the initial read passes the binder kind");
  assert.match(tracker, /if \(filters\.illus && binder\.kind === "wants"\) p\.set\("illus", "1"\)/, "the URL write is guarded");
  assert.match(tracker, /if \(filters\.illus && binder\.kind === "wants"\) \{\s*list = list\.filter\(\(c\) => c\.buyPrice != null\)/, "the filter is guarded");
});

test("print page rewrites ?binder=<unknown> to the id it actually renders", () => {
  assert.match(print, /useEffect/, "a useEffect runs after resolveBinderId");
  assert.match(print, /const binderParam = searchParams\.get\("binder"\)/);
  assert.match(print, /if \(binderParam == null \|\| binderParam === binderId\) return;/, "no-op when absent or already correct");
  assert.match(print, /router\.replace\(printHref\(pathname, binderId, inkLight\), \{ scroll: false \}\)/, "uses the shared printHref so ?ink= survives");
});

test("binder tabs carry a screen-reader label with the count spelled out", () => {
  assert.match(tabs, /aria-label=\{`\$\{b\.name\}, \$\{c\.owned\} of \$\{c\.total\} owned`\}/);
});
