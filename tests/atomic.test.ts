import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeAllAtomic } from "../scripts/lib/atomic.mjs";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "atomic-"));

test("writeAllAtomic replaces every file and leaves no *.tmp behind", () => {
  const dir = tmpDir();
  const a = path.join(dir, "a.json");
  const b = path.join(dir, "b.json");
  fs.writeFileSync(a, "old a\n");
  writeAllAtomic([[a, "new a\n"], [b, "new b\n"]]);
  assert.equal(fs.readFileSync(a, "utf8"), "new a\n");
  assert.equal(fs.readFileSync(b, "utf8"), "new b\n");
  assert.deepEqual(fs.readdirSync(dir).sort(), ["a.json", "b.json"]);
});

test("writeAllAtomic writes all temp files before renaming any", () => {
  // Second entry points into a missing directory, so its tmp write throws
  // before the first rename runs: the first file must still hold its old text.
  const dir = tmpDir();
  const a = path.join(dir, "a.json");
  fs.writeFileSync(a, "old a\n");
  assert.throws(() => writeAllAtomic([[a, "new a\n"], [path.join(dir, "missing", "b.json"), "b"]]));
  assert.equal(fs.readFileSync(a, "utf8"), "old a\n", "a is untouched");
  assert.ok(!fs.existsSync(`${a}.tmp`), "the orphan tmp file is removed");
});
