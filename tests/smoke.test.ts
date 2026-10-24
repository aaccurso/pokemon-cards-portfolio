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
  card({ id: "m6a-001", binderId: "m6a-30th", setNumber: 1 }),
  card({ id: "m6a-002", binderId: "m6a-30th", setNumber: 2 }),
  card({ id: "m6a-003", binderId: "m6a-30th", setNumber: 3 }),
  card({ id: "m6a-004", binderId: "m6a-30th", setNumber: 4 }),
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
  });
  assert.deepEqual(byPath["/?binder=m6a-30th"], {
    h1: "30th CELEBRATION",
    showing: 4,
    tabs: ["1 / 3", "1 / 4"],
  });
  assert.equal(byPath["/?binder=typo"].h1, "Pokedex 151 full-art");
  assert.equal(byPath["/?binder=m6a-30th&view=table"].tbodyRows, 4);
  assert.deepEqual(byPath["/?card=ivysaur"], { h1: "Pokedex 151 full-art", modalStatus: "Owned" });
  // Print excludes owned cards: 2 unowned Kanto cards -> 1 grid sheet + 1 calibration sheet.
  assert.deepEqual(byPath["/print"], { h1: "Pokedex 151 full-art placeholder cards", printCards: 2, printSheets: 2 });
  assert.deepEqual(byPath["/print?binder=m6a-30th"], { h1: "30th CELEBRATION placeholder cards", printCards: 3, printSheets: 2 });
  assert.equal(plan.length, 7);
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

  const modal = `<html><body><h1>X</h1><div class="modal-content"><dl><dd><span class="status-owned">Owned</span></dd></dl></div></body></html>`;
  assert.deepEqual(checkPage({ path: "/m", expect: { h1: "X", modalStatus: "Owned" } }, modal), []);
  assert.equal(checkPage({ path: "/m", expect: { h1: "X", modalStatus: "Owned" } }, `<html><body><h1>X</h1></body></html>`).length, 1);

  const print = `<html><body><h1>X placeholder cards</h1><p class="print-hint">69<!-- --> cards · <!-- -->9<!-- --> sheet<!-- -->s<!-- --> total (first page is a calibration guide)</p></body></html>`;
  assert.deepEqual(checkPage({ path: "/print", expect: { h1: "X placeholder cards", printCards: 69, printSheets: 9 } }, print), []);
  assert.equal(checkPage({ path: "/print", expect: { h1: "X placeholder cards", printCards: 70, printSheets: 9 } }, print).length, 1);
});

test("checkPage flags Next's client error page", () => {
  const failures = checkPage({ path: "/", expect: {} }, `<html><body><h2>Application error: a client-side exception has occurred</h2></body></html>`);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Application error/);
});
