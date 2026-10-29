import { test } from "node:test";
import assert from "node:assert/strict";
import { textOf, buildPlan, checkPage } from "../scripts/lib/smoke.mjs";
import { card } from "./helpers.ts";
import type { Binder } from "../lib/binders.ts";
import type { PurchaseData } from "../lib/purchases.ts";

const binders: Binder[] = [
  { id: "kanto-151", name: "Pokedex 151 full-art", description: "", kind: "wants", sort: "pokedexNumber" },
  { id: "m6a-30th", name: "30th CELEBRATION", description: "", kind: "master-set", sort: "setNumber", officialCount: 3 },
];

const cards = [
  card({ id: "bulbasaur", pokedexNumber: 1 }),
  card({ id: "ivysaur", pokedexNumber: 2 }),
  card({ id: "venusaur", pokedexNumber: 3 }),
  card({ id: "m6a-001", binderId: "m6a-30th", setNumber: 1, rarity: "None" }),
  card({ id: "m6a-002", binderId: "m6a-30th", setNumber: 2, rarity: "Classic Collection" }),
  card({ id: "m6a-003", binderId: "m6a-30th", setNumber: 3, rarity: "Classic Collection" }),
  card({ id: "m6a-004", binderId: "m6a-30th", setNumber: 4, rarity: "None" }),
];

const purchases: PurchaseData = {
  shipments: [
    { id: "s1", seller: null, date: null, shipping: null, fees: null, total: null, items: [
      { cardId: "ivysaur", pricePaid: 5, condition: "NM" },
      { cardId: "m6a-001", pricePaid: null, condition: "NM" },
    ] },
  ],
};

test("textOf strips tags, comments, scripts and styles, and decodes entities", () => {
  const html = `<html><head><style>.a{color:red}</style><script>var x = undefined;</script></head>
    <body><h1>Hi<!-- --> there</h1><p>a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;&nbsp;f</p></body></html>`;
  assert.equal(textOf(html), `Hi there a & b <c> "d" 'e' f`);
});

test("buildPlan derives every URL and expectation from the data", () => {
  const plan = buildPlan({ cards, purchases, binders });
  const byPath = Object.fromEntries(plan.map((p) => [p.path, p.expect]));

  assert.deepEqual(byPath["/"], {
    h1: "Pokedex 151 full-art",
    showing: 3,
    tabs: ["1 / 3", "1 / 4"],
    raritySelect: false,
  });
  assert.deepEqual(byPath["/?binder=m6a-30th"], {
    h1: "30th CELEBRATION",
    showing: 4,
    tabs: ["1 / 3", "1 / 4"],
    raritySelect: true,
  });
  assert.equal(byPath["/?binder=typo"].h1, "Pokedex 151 full-art");
  assert.equal(byPath["/?binder=m6a-30th&view=table"].tbodyRows, 4);
  // Column set follows the binder: one set and rarities present, so no Set column and a Rarity one.
  assert.deepEqual(byPath["/?binder=m6a-30th&view=table"].tableHeaders, ["Own", "#", "Name", "Type", "Rarity", "Code", "Buy price", "Paid"]);
  assert.deepEqual(byPath["/?card=ivysaur"], { h1: "Pokedex 151 full-art", modalStatus: "Owned" });
  // Print excludes owned cards: 2 unowned Kanto cards -> 1 grid sheet + 1 calibration sheet.
  assert.deepEqual(byPath["/print"], { h1: "Pokedex 151 full-art placeholder cards", printCards: 2, printSheets: 2 });
  assert.deepEqual(byPath["/print?binder=m6a-30th"], { h1: "30th CELEBRATION placeholder cards", printCards: 3, printSheets: 2 });
  // Rarity filter: the first rarity in rarityOrder present in the binder, counts from the data.
  assert.deepEqual(byPath["/?binder=m6a-30th&rarity=None"], {
    h1: "30th CELEBRATION",
    showing: 2,
    of: 4,
    rarityRows: 2,
    activeRarity: "Common / Uncommon",
  });
  // Finish-as-singles shortlist: the wanted cards of the master set as a table, priciest first.
  assert.deepEqual(byPath["/?binder=m6a-30th&own=wanted&view=table&sort=buyPrice&dir=desc"], {
    h1: "30th CELEBRATION",
    tbodyRows: 3,
    tableHeaders: ["Own", "#", "Name", "Type", "Rarity", "Code", "Buy price", "Paid"],
  });
  assert.equal(plan.length, 9);
});

test("buildPlan adds no rarity page for a binder where no card has a rarity", () => {
  const plan = buildPlan({ cards, purchases, binders });
  assert.equal(plan.filter((p) => p.path.includes("rarity=")).length, 1);
  const noRarity = cards.map((c) => ({ ...c, rarity: undefined }));
  assert.equal(buildPlan({ cards: noRarity, purchases, binders }).some((p) => p.path.includes("rarity=")), false);
});

test("buildPlan skips the shortlist page when there is no master-set binder", () => {
  const plan = buildPlan({ cards, purchases, binders: binders.filter((b) => b.kind !== "master-set") });
  assert.equal(plan.some((p) => p.path.includes("own=wanted")), false);
});

test("buildPlan skips the modal page when nothing in the default binder is owned", () => {
  const plan = buildPlan({ cards, purchases: { shipments: [] }, binders });
  assert.equal(plan.some((p) => p.path.startsWith("/?card=")), false);
});

const dashboard = (h1: string, n: number, tabs: string[], extra = "") => `<html><body>
  <nav class="binder-tabs" aria-label="Binders">
    ${tabs.map((t) => `<button class="binder-tab">Name<span class="binder-tab-count">${t.replace(" / ", "<!-- --> / <!-- -->")}</span></button>`).join("")}
  </nav>
  <header><h1>${h1}</h1></header>
  ${extra}
  <div class="results-count">Showing <!-- -->${n}<!-- --> of <!-- -->${n}<!-- --> cards</div>
  <script>window.__NEXT=undefined; NaN</script>
</body></html>`;

test("checkPage passes a dashboard that matches its expectations", () => {
  const page = { path: "/", expect: { h1: "Pokedex 151 full-art", showing: 3, tabs: ["1 / 3", "1 / 4"] } };
  assert.deepEqual(checkPage(page, dashboard("Pokedex 151 full-art", 3, ["1 / 3", "1 / 4"])), []);
});

test("checkPage reports every mismatch and bad token", () => {
  const page = { path: "/", expect: { h1: "Pokedex 151 full-art", showing: 3, tabs: ["1 / 3", "1 / 4"] } };
  const failures = checkPage(page, dashboard("Other", 2, ["1 / 3"], "<p>Price: #null, total NaN</p>"));
  assert.equal(failures.length, 4);
  assert.match(failures[0], /h1/);
  assert.match(failures[1], /Showing/);
  assert.match(failures[2], /tabs/);
  assert.match(failures[3], /#null.*NaN|NaN.*#null/);
});

test("checkPage counts table rows, finds the modal status, and reads the print hint", () => {
  const table = `<html><body><h1>X</h1><table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table></body></html>`;
  assert.deepEqual(checkPage({ path: "/t", expect: { h1: "X", tbodyRows: 2 } }, table), []);
  assert.equal(checkPage({ path: "/t", expect: { h1: "X", tbodyRows: 3 } }, table).length, 1);

  // Header labels are read without the sort glyphs; the comparison is on the whole ordered list.
  const headed = `<html><body><h1>X</h1><table><thead><tr><th aria-sort="none"><button class="th-sort">Own<span class="sort-indicator idle">⇅</span></button></th><th>Type</th><th aria-sort="descending"><button class="th-sort">Buy price<span class="sort-indicator">▼</span></button></th></tr></thead><tbody><tr><td>1</td></tr></tbody></table></body></html>`;
  assert.deepEqual(checkPage({ path: "/t", expect: { h1: "X", tableHeaders: ["Own", "Type", "Buy price"] } }, headed), []);
  const wrong = checkPage({ path: "/t", expect: { h1: "X", tableHeaders: ["Own", "Type", "Set", "Buy price"] } }, headed);
  assert.equal(wrong.length, 1);
  assert.match(wrong[0], /headers/);

  const modal = `<html><body><h1>X</h1><div class="modal-content"><dl><dd><span class="status-owned">Owned</span></dd></dl></div></body></html>`;
  assert.deepEqual(checkPage({ path: "/m", expect: { h1: "X", modalStatus: "Owned" } }, modal), []);
  assert.equal(checkPage({ path: "/m", expect: { h1: "X", modalStatus: "Owned" } }, `<html><body><h1>X</h1></body></html>`).length, 1);

  const print = `<html><body><h1>X placeholder cards</h1><p class="print-hint">69<!-- --> cards · <!-- -->9<!-- --> sheet<!-- -->s<!-- --> total (first page is a calibration guide)</p></body></html>`;
  assert.deepEqual(checkPage({ path: "/print", expect: { h1: "X placeholder cards", printCards: 69, printSheets: 9 } }, print), []);
  assert.equal(checkPage({ path: "/print", expect: { h1: "X placeholder cards", printCards: 70, printSheets: 9 } }, print).length, 1);
});

test("checkPage reads a filtered Showing count and the rarity breakdown rows", () => {
  const rows = (active: string) => `<div class="rarity-breakdown">
    <button type="button" class="rarity-row${active === "Common / Uncommon" ? " active" : ""}" aria-pressed="${active === "Common / Uncommon"}"><span class="rarity-label">Common / Uncommon</span></button>
    <button type="button" class="rarity-row${active === "Classic" ? " active" : ""}" aria-pressed="${active === "Classic"}"><span class="rarity-label">Classic</span></button>
  </div>`;
  const html = dashboard("30th CELEBRATION", 0, ["1 / 3", "1 / 4"], rows("Common / Uncommon"))
    .replace("Showing <!-- -->0<!-- --> of <!-- -->0", "Showing <!-- -->2<!-- --> of <!-- -->4");
  const expect = { h1: "30th CELEBRATION", showing: 2, of: 4, rarityRows: 2, activeRarity: "Common / Uncommon" };
  assert.deepEqual(checkPage({ path: "/r", expect }, html), []);
  assert.equal(checkPage({ path: "/r", expect: { ...expect, showing: 3 } }, html).length, 1);
  assert.equal(checkPage({ path: "/r", expect: { ...expect, rarityRows: 3 } }, html).length, 1);
  assert.equal(checkPage({ path: "/r", expect: { ...expect, activeRarity: "Classic" } }, html).length, 1);
  const none = dashboard("30th CELEBRATION", 4, ["1 / 3", "1 / 4"], rows(""));
  assert.equal(checkPage({ path: "/r", expect: { h1: "30th CELEBRATION", activeRarity: "Classic" } }, none).length, 1);
});

test("checkPage asserts the rarity select is present on binders with rarities and absent elsewhere", () => {
  const withSelect = dashboard("30th CELEBRATION", 4, ["1 / 3", "1 / 4"], `<select aria-label="Rarity"><option value="all">All Rarities</option></select>`);
  const without = dashboard("Pokedex 151 full-art", 3, ["1 / 3", "1 / 4"]);
  assert.deepEqual(checkPage({ path: "/m", expect: { h1: "30th CELEBRATION", raritySelect: true } }, withSelect), []);
  assert.deepEqual(checkPage({ path: "/", expect: { h1: "Pokedex 151 full-art", raritySelect: false } }, without), []);
  assert.equal(checkPage({ path: "/m", expect: { h1: "30th CELEBRATION", raritySelect: false } }, withSelect).length, 1);
  assert.equal(checkPage({ path: "/", expect: { h1: "Pokedex 151 full-art", raritySelect: true } }, without).length, 1);
});

test("checkPage flags Next's client error page", () => {
  const failures = checkPage({ path: "/", expect: {} }, `<html><body><h2>Application error: a client-side exception has occurred</h2></body></html>`);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Application error/);
});

test("checkPage flags a Japanese name rendered without lang=\"ja\"", () => {
  const ok = `<html><body><h1>X</h1><strong>Pikachu<span class="name-ja" lang="ja">ピカチュウ</span></strong></body></html>`;
  assert.deepEqual(checkPage({ path: "/t", expect: { h1: "X" } }, ok), []);
  const bare = `<html><body><h1>X</h1><strong>Pikachu<span class="name-ja">ピカチュウ</span></strong></body></html>`;
  const failures = checkPage({ path: "/t", expect: { h1: "X" } }, bare);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /lang="ja"/);
});
