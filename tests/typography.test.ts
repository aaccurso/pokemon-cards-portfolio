import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "components");

// Every rendered Japanese name must carry lang="ja" on the same element, or
// browsers fall back to Han-unification glyphs (Chinese forms) for the kanji.
// Covers every surface: grid tile, table row, modal, print placeholder.
test("every .name-ja span in components declares lang=\"ja\"", () => {
  const offenders: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(join(dir, file), "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (!line.includes('className="name-ja"')) return;
      const tag = line.match(/<span[^>]*className="name-ja"[^>]*>/)?.[0] ?? line;
      if (!/\blang="ja"/.test(tag)) offenders.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `name-ja without lang="ja": ${offenders.join(", ")}`);
  const total = readdirSync(dir).filter((f) => f.endsWith(".tsx"))
    .reduce((n, f) => n + (readFileSync(join(dir, f), "utf8").match(/className="name-ja"/g) ?? []).length, 0);
  assert.ok(total >= 4, `expected at least four Japanese-name surfaces, found ${total}`);
});
