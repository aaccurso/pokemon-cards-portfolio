import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dirname, "..", "app", "globals.css"), "utf8");

// First declaration block for a bare selector (not the @media print override).
const block = (selector: string): string => {
  const re = new RegExp(`(^|\\n)${selector.replace(/[.\\-]/g, "\\$&")}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  assert.ok(m, `no rule for ${selector}`);
  return m[2];
};

test("print-color-adjust: exact is set on .print-page so inherited rules cover the calibration ticks", () => {
  // .cal-tick is drawn with a background colour, so it drops out when the
  // print dialog has Background graphics off unless an ancestor opts in.
  assert.match(block(".cal-tick"), /background:\s*#111/);
  const page = block(".print-page");
  assert.match(page, /(^|[^-])print-color-adjust:\s*exact/);
  assert.match(page, /-webkit-print-color-adjust:\s*exact/);
});
