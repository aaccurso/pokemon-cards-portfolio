import fs from "node:fs";

/**
 * Write several files so a crash can never leave a half-written one: every
 * text goes to a `<file>.tmp` sibling first, then each tmp is renamed into
 * place (a rename is atomic on the same filesystem). If any tmp write fails,
 * the tmp files written so far are removed and nothing is renamed. A crash
 * between two renames can still leave one file stale; git is the real
 * backstop for that.
 *
 * @param {Array<[string, string]>} entries [file, text] pairs
 */
export function writeAllAtomic(entries) {
  const written = [];
  try {
    for (const [file, text] of entries) {
      fs.writeFileSync(`${file}.tmp`, text);
      written.push(file);
    }
  } catch (err) {
    for (const file of written) fs.rmSync(`${file}.tmp`, { force: true });
    throw err;
  }
  for (const [file] of entries) fs.renameSync(`${file}.tmp`, file);
}
