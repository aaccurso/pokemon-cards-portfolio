# Multi-binder, M6a binder, and price refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the tracker hold several binders, add the Japanese 30th CELEBRATION (M6a) master set as a pack-opened binder with printable placeholders, and make market-price refresh a script that keeps history.

**Architecture:** A `data/binders.json` registry gives each binder a `kind` (`wants` or `master-set`) and default sort. JSON loading moves into one `lib/data.ts`; `lib/cards.ts`, `lib/purchases.ts`, `lib/binders.ts` become pure modules tested with Node's built-in runner. The dashboard and print page scope everything to a `binder` URL param. Three Node scripts build the M6a entries from tcgdex plus PriceCharting, backfill new card fields, and refresh prices into `buyPrice` while appending snapshots to `data/prices.json`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, plain CSS, Node 24 (`node --test` with native type stripping), no new runtime dependencies. `sharp` is installed ad hoc for image downloads as today.

**Spec:** `docs/superpowers/specs/2026-10-23-multi-binder-m6a-design.md`

## Global Constraints

- No new entries in `package.json` `dependencies`. Tests use `node:test` and `node:assert/strict` only.
- Node 24 strips types natively. Test files are `tests/**/*.test.ts`; `npm test` runs `node --test "tests/**/*.test.ts"`. Tests import `lib/*.ts` with the explicit `.ts` extension. Between `lib/` modules only `import type` is allowed (erased at runtime); a helper needed by two modules lives in one of them or takes its input as a parameter.
- `lib/cards.ts`, `lib/purchases.ts`, `lib/binders.ts` must not import JSON or use the `@/` alias. Only `lib/data.ts` imports JSON.
- `data/cards.json` and `data/purchases.json` stay the only places collection data lives (CLAUDE.md). Scripts build the full new JSON in memory and write once at the end; they never partially write.
- Card ids for M6a: `m6a-<three-digit-number>-<slug>`, e.g. `m6a-126-pikachu-ex`.
- Binder ids: `kanto-151`, `kanto-evolutions`, `eeveelutions`, `m6a-30th`. Default binder: `kanto-151`.
- M6a scope: tcgdex `M6a` cards with numeric `localId` 001 to 165 only.
- Price adopted on refresh: Cardmarket `trend`, rounded to 2 decimals. In `wants` binders a null `buyPrice` is never set.
- Existing CSS class names and print dimensions are unchanged. New UI uses the dark theme variables already in `app/globals.css`.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. A shipment whose items all have `pricePaid: null` (pure booster pull) must not change "Spent on cards" and must still count fully toward that binder's "Total outlay". Pinned in Task 2.
2. A `qty` of 3 on a single item must yield ownership with `duplicateCount: 2`, and "Duplicates" must count it as 2, not 1 or 3. Pinned in Task 2.
3. `?binder=typo` must render the Kanto binder and rewrite the URL without the bad param, not crash or show an empty grid. Pinned in Task 3 (resolver) and Task 5 (manual check).
4. A Trainer card (null `pokedexNumber`, null `type1`) must render in grid, table, modal, and placeholder without `#null`, `undefined`, or a `#888` badge labelled "null". Pinned in Task 6 and Task 7 helper tests; manual check in Task 6.
5. Running `refresh_prices.mjs` twice on the same day must leave one `cardmarket` snapshot for that date and exactly one `manual` seed per card, and must never set a price on a null-priced Kanto card. Pinned in Task 9.

---

### Task 1: Test harness and pure data split

**Files:**
- Create: `lib/data.ts`
- Create: `tests/purchases.test.ts`
- Modify: `lib/cards.ts:1,23` (remove JSON import and `cards` export)
- Modify: `lib/purchases.ts:1-2,22,33,70` (remove JSON import and `purchases` export; drop default parameters)
- Modify: `components/PortfolioTracker.tsx:5-12`, `components/CardTile.tsx:4`, `components/CardModal.tsx:4-5`, `components/PlaceholderCard.tsx:1`, `app/print/page.tsx:4-5`
- Modify: `package.json` (add `"test": "node --test \"tests/**/*.test.ts\""` to `scripts`)

**Interfaces:**
- Produces: `lib/data.ts` exports `cards: Card[]`, `purchases: PurchaseData`. `lib/cards.ts` exports only types and the three lookup records. `lib/purchases.ts` exports types and `buildOwnershipMap(data: PurchaseData): OwnershipMap`, `computeStats(cards: Card[], ownership: OwnershipMap, data: PurchaseData): CollectionStats`, `buildCsv(cards: Card[], ownership: OwnershipMap): string` with no default arguments.

- [ ] **Step 1: Write the characterization test**

```ts
// tests/purchases.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOwnershipMap, computeStats } from "../lib/purchases.ts";
import type { Card } from "../lib/cards.ts";
import type { PurchaseData } from "../lib/purchases.ts";

export const card = (over: Partial<Card>): Card => ({
  id: "x", name: "X", code: "sv2a 001", set: "S", qty: 1, language: "Japanese",
  condition: "NM", buyPrice: null, pokedexNumber: 1, type1: "Grass", type2: null,
  generation: 1, variant: null, binderId: "kanto-151", ...over,
});

test("min price across purchases wins and duplicates are counted", () => {
  const data: PurchaseData = { shipments: [
    { id: "a", seller: null, date: null, shipping: null, fees: null, total: 10, items: [{ cardId: "x", pricePaid: 6, condition: "NM" }] },
    { id: "b", seller: null, date: null, shipping: null, fees: null, total: 5, items: [{ cardId: "x", pricePaid: 4, condition: "NM" }] },
  ] };
  const o = buildOwnershipMap(data);
  assert.deepEqual(o.get("x"), { owned: true, pricePaid: 4, duplicateCount: 1, purchaseCount: 2 });
  const s = computeStats([card({ id: "x", buyPrice: 5 }), card({ id: "y", buyPrice: 7 })], o, data);
  assert.equal(s.owned, 1); assert.equal(s.spentOnCards, 4); assert.equal(s.savings, 1);
  assert.equal(s.toComplete, 7); assert.equal(s.budget, 12); assert.equal(s.totalOutlay, 15);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL. Either `Missing script: "test"` or a module error from `lib/purchases.ts` importing `@/data/purchases.json`.

- [ ] **Step 3: Add the `test` script to `package.json` and create `lib/data.ts`**

`lib/data.ts` imports `@/data/cards.json` and `@/data/purchases.json` and exports `cards` and `purchases` typed via `Card[]` and `PurchaseData` (types imported with `import type`).

- [ ] **Step 4: Make `lib/cards.ts` and `lib/purchases.ts` pure**

Remove the JSON imports and the `cards` / `purchases` exports. Change `import { Card } from "./cards"` to `import type`. Remove the `= purchases` default values from `buildOwnershipMap` and `computeStats`.

- [ ] **Step 5: Repoint consumers**

Components and `app/print/page.tsx` import `cards` and `purchases` from `@/lib/data` and everything else from where it was. `PortfolioTracker.tsx` keeps the `cards as allCards` alias.

- [ ] **Step 6: Run tests and the type check**

Run: `npm test && npx tsc --noEmit`
Expected: `pass 1`, and tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add package.json lib tests components app
git commit -m "Split JSON loading into lib/data.ts and add node:test harness"
```

---

### Task 2: Extended card and purchase types, ownership with pulls, per-binder stats

**Files:**
- Modify: `lib/cards.ts` (Card type)
- Modify: `lib/purchases.ts` (types, `buildOwnershipMap`, `computeStats`)
- Modify: `tests/purchases.test.ts`

**Interfaces:**
- Produces, in `lib/cards.ts`:
  ```ts
  export type CardCategory = "Pokemon" | "Trainer" | "Energy";
  export type Card = { /* existing */ pokedexNumber: number | null; type1: string | null;
    category?: CardCategory; setNumber: number; nameJa?: string; tcgdexId?: string; rarity?: string; };
  export function cardCategory(c: Card): CardCategory; // c.category ?? "Pokemon"
  ```
- Produces, in `lib/purchases.ts`:
  ```ts
  export type PurchaseItem = { cardId: string; pricePaid: number | null; condition: string; qty?: number };
  export type Shipment = { /* existing */ product?: string };
  export type CardOwnership = { owned: true; pricePaid: number | null; duplicateCount: number; purchaseCount: number };
  export type CollectionStats = { /* existing */ duplicates: number };
  export function computeStats(cards: Card[], ownership: OwnershipMap, data: PurchaseData, binderId: string, cardBinder: Map<string, string>): CollectionStats;
  ```
  `cardBinder` maps every card id (all binders) to its `binderId`; it is what outlay attribution needs to classify items from other binders.

- [ ] **Step 1: Add failing tests**

```ts
test("pulled items own the card without a price and qty counts duplicates", () => {
  const data: PurchaseData = { shipments: [
    { id: "box", seller: null, date: null, shipping: 0, fees: 0, total: 120, product: "booster box",
      items: [{ cardId: "m1", pricePaid: null, condition: "NM", qty: 3 }, { cardId: "m2", pricePaid: null, condition: "NM" }] },
  ] };
  const o = buildOwnershipMap(data);
  assert.deepEqual(o.get("m1"), { owned: true, pricePaid: null, duplicateCount: 2, purchaseCount: 3 });
  assert.deepEqual(o.get("m2"), { owned: true, pricePaid: null, duplicateCount: 0, purchaseCount: 1 });
});

test("a priced purchase after a pull sets the price; a pull after a price keeps it", () => {
  const data: PurchaseData = { shipments: [
    { id: "a", seller: null, date: null, shipping: null, fees: null, total: 1, items: [{ cardId: "m1", pricePaid: null, condition: "NM" }] },
    { id: "b", seller: null, date: null, shipping: null, fees: null, total: 3, items: [{ cardId: "m1", pricePaid: 3, condition: "NM" }] },
    { id: "c", seller: null, date: null, shipping: null, fees: null, total: 1, items: [{ cardId: "m1", pricePaid: null, condition: "NM" }] },
  ] };
  assert.equal(buildOwnershipMap(data).get("m1")?.pricePaid, 3);
});

test("stats are scoped to a binder and outlay is split by item share", () => {
  const cards = [
    card({ id: "k1", binderId: "kanto-151", buyPrice: 10 }),
    card({ id: "m1", binderId: "m6a-30th", buyPrice: 2 }),
    card({ id: "m2", binderId: "m6a-30th", buyPrice: 4 }),
  ];
  const cardBinder = new Map(cards.map((c) => [c.id, c.binderId]));
  const data: PurchaseData = { shipments: [
    { id: "mixed", seller: null, date: null, shipping: null, fees: null, total: 40,
      items: [{ cardId: "k1", pricePaid: 8, condition: "NM" }, { cardId: "m1", pricePaid: null, condition: "NM", qty: 3 }] },
    { id: "box", seller: null, date: null, shipping: null, fees: null, total: 100,
      items: [{ cardId: "m1", pricePaid: null, condition: "NM" }] },
  ] };
  const o = buildOwnershipMap(data);
  const m6a = computeStats(cards.filter((c) => c.binderId === "m6a-30th"), o, data, "m6a-30th", cardBinder);
  assert.equal(m6a.total, 2); assert.equal(m6a.owned, 1);
  assert.equal(m6a.spentOnCards, 0);           // pulls carry no price
  assert.equal(m6a.totalOutlay, 30 + 100);     // 3 of 4 items of "mixed" plus all of "box"
  assert.equal(m6a.toComplete, 4); assert.equal(m6a.budget, 6); assert.equal(m6a.pricedCount, 2);
  assert.equal(m6a.duplicates, 3);             // qty 3 + 1 more pull = 4 copies, 3 extra
  assert.equal(m6a.savings, 0);                // no priced owned card
  const kanto = computeStats(cards.filter((c) => c.binderId === "kanto-151"), o, data, "kanto-151", cardBinder);
  assert.equal(kanto.spentOnCards, 8); assert.equal(kanto.totalOutlay, 10); assert.equal(kanto.savings, 2);
  assert.equal(kanto.totalOutlay + m6a.totalOutlay, 140);
});
```

Update the Task 1 test's `computeStats` call to pass `"kanto-151"` and a `cardBinder` map built from its two cards.

- [ ] **Step 2: Run to confirm failure**

Run: `npm test`
Expected: FAIL with type or assertion errors on `qty`, `product`, `duplicates`, and the 5-argument call.

- [ ] **Step 3: Extend the types in `lib/cards.ts` and `lib/purchases.ts`**

Add the fields from the Interfaces block. Add `cardCategory`. Keep `imageUrl`, `imageIsFallback`, `localImage` as they are.

- [ ] **Step 4: Rewrite `buildOwnershipMap`**

Each item contributes `qty ?? 1` to `purchaseCount`; `duplicateCount = purchaseCount - 1`. `pricePaid` is the minimum over non-null prices, or null when every purchase was a pull.

- [ ] **Step 5: Rewrite `computeStats`**

Per-card loop as today but `spentOnCards` and `savings` only add when `o.pricePaid != null`. `duplicates` sums `o.duplicateCount` over owned cards. `totalOutlay` sums, per shipment, `total * (qty of items whose cardBinder is binderId) / (qty of all items)`; a shipment with zero items contributes 0.

- [ ] **Step 6: Run tests and type check**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass; tsc reports errors only in `components/PortfolioTracker.tsx` (`computeStats` arity) and wherever `pricePaid` is formatted as a number (`PortfolioTracker.tsx` table cell and `getSortValue`, `CardModal.tsx` Paid row). Fix those three call sites minimally: pass `"kanto-151"` and `new Map(allCards.map(c => [c.id, c.binderId]))` for now (Task 5 replaces it); render `"—"` when `pricePaid` is null, and show "Pulled from pack" in the modal's Paid row when null and owned.

- [ ] **Step 7: Run type check again, then commit**

Run: `npx tsc --noEmit && npm test`
Expected: both clean.

```bash
git add lib tests components
git commit -m "Support pack pulls (null price, qty) and per-binder stats"
```

---

### Task 3: Binder registry and `lib/binders.ts`

**Files:**
- Create: `data/binders.json`
- Create: `lib/binders.ts`
- Create: `tests/binders.test.ts`
- Modify: `lib/data.ts` (import registry, run validation)

**Interfaces:**
- Produces:
  ```ts
  export type BinderKind = "wants" | "master-set";
  export type BinderSort = "pokedexNumber" | "setNumber";
  export type Binder = { id: string; name: string; description: string; kind: BinderKind; sort: BinderSort; officialCount?: number };
  export const DEFAULT_BINDER_ID = "kanto-151";
  export function resolveBinderId(param: string | null | undefined, binders: Binder[]): string;
  export function getBinder(id: string, binders: Binder[]): Binder;   // throws on unknown id
  export function cardsForBinder(id: string, cards: Card[]): Card[];
  export function buildCardBinderMap(cards: Card[]): Map<string, string>;
  export function validateData(cards: Card[], purchases: PurchaseData, binders: Binder[]): string[]; // human-readable problems, empty when fine
  ```
- `lib/data.ts` additionally exports `binders: Binder[]`.

- [ ] **Step 1: Write `data/binders.json`**

Four entries exactly as in the spec section "1. Data model", including `"officialCount": 103` on `m6a-30th`.

- [ ] **Step 2: Write failing tests**

```ts
// tests/binders.test.ts
test("resolveBinderId falls back to the default", () => {
  assert.equal(resolveBinderId("typo", binders), "kanto-151");
  assert.equal(resolveBinderId(null, binders), "kanto-151");
  assert.equal(resolveBinderId("m6a-30th", binders), "m6a-30th");
});
test("validateData reports unknown binder ids and unknown purchase card ids", () => {
  const problems = validateData(
    [card({ id: "a", binderId: "nope" })],
    { shipments: [{ id: "s", seller: null, date: null, shipping: null, fees: null, total: null, items: [{ cardId: "ghost", pricePaid: 1, condition: "NM" }] }] },
    binders);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /a.*nope/); assert.match(problems[1], /ghost/);
});
test("cardsForBinder filters by binderId", () => {
  assert.deepEqual(cardsForBinder("m6a-30th", [card({ id: "a" }), card({ id: "b", binderId: "m6a-30th" })]).map((c) => c.id), ["b"]);
});
```

`binders` in the test is an inline array literal with the four ids (do not import the JSON).

- [ ] **Step 3: Run to confirm failure**

Run: `npm test`
Expected: FAIL, module `../lib/binders.ts` not found.

- [ ] **Step 4: Implement `lib/binders.ts`**

Pure functions per the Interfaces block. `validateData` messages: `` `card ${id} has unknown binderId ${binderId}` `` and `` `shipment ${shipmentId} item references unknown card ${cardId}` ``.

- [ ] **Step 5: Wire validation into `lib/data.ts`**

Import `@/data/binders.json` as `binders`. Call `validateData(cards, purchases, binders)`; if non-empty, throw `new Error(problems.join("\n"))` when `process.env.NODE_ENV !== "production"`, else `console.error` each.

- [ ] **Step 6: Run tests, type check, and a dev build smoke**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: tests pass; build succeeds (validation finds no problems in the real data).

- [ ] **Step 7: Commit**

```bash
git add data/binders.json lib tests
git commit -m "Add binder registry and lib/binders.ts"
```

---

### Task 4: Script helpers for tcgdex ids and set numbers, then backfill existing cards

**Files:**
- Create: `scripts/lib/tcgdex.mjs`
- Create: `tests/tcgdex.test.ts`
- Create: `scripts/backfill_card_fields.mjs`
- Modify: `data/cards.json` (by running the script)

**Interfaces:**
- Produces, in `scripts/lib/tcgdex.mjs`:
  ```js
  export function parseCode(code)            // "sv2a 063" -> { setCode: "sv2a", number: "063" } ; null when no "<set> <number>" shape
  export function parseSetNumber(code)       // "sv2a 063" -> 63 ; "S-P SWSH194" -> 194 ; "DP4d" -> null
  export function toTcgdexId(code, setIds)   // setIds: string[] from api.tcgdex.net/v2/ja/sets ; case-insensitive match -> "SV2a-063" or null
  export async function fetchJaSetIds()      // GET https://api.tcgdex.net/v2/ja/sets -> string[]
  export async function fetchCard(tcgdexId)  // GET https://api.tcgdex.net/v2/ja/cards/<id> -> parsed JSON or null on 404
  ```

- [ ] **Step 1: Write failing tests**

```ts
// tests/tcgdex.test.ts
import { parseCode, parseSetNumber, toTcgdexId } from "../scripts/lib/tcgdex.mjs";
const setIds = ["SV2a", "M4", "S6a", "SM-P", "S-P", "SV8a"];
test("parseCode and parseSetNumber across known shapes", () => {
  assert.deepEqual(parseCode("sv2a 063"), { setCode: "sv2a", number: "063" });
  assert.equal(parseSetNumber("sv2a 063"), 63);
  assert.equal(parseSetNumber("M6a 126"), 126);
  assert.equal(parseSetNumber("S-P SWSH194"), 194);
  assert.equal(parseSetNumber("SM-P 187"), 187);
  assert.equal(parseSetNumber("svg 16"), 16);
  assert.equal(parseSetNumber("DP4d"), null);
});
test("toTcgdexId matches set ids case-insensitively and returns null otherwise", () => {
  assert.equal(toTcgdexId("sv2a 063", setIds), "SV2a-063");
  assert.equal(toTcgdexId("m4 091", setIds), "M4-091");
  assert.equal(toTcgdexId("SM-P 187", setIds), "SM-P-187");
  assert.equal(toTcgdexId("mBG 022", setIds), null);
  assert.equal(toTcgdexId("DP4d", setIds), null);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test`
Expected: FAIL, `scripts/lib/tcgdex.mjs` not found.

- [ ] **Step 3: Implement `scripts/lib/tcgdex.mjs`**

`parseSetNumber` takes the trailing digit run of the number token. The fetchers use global `fetch`, set `User-Agent: pokemon-cards-portfolio`, and pause 150 ms after each call.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write `scripts/backfill_card_fields.mjs`**

Reads `data/cards.json`, fetches set ids once, and for every card sets `setNumber` (skip when `parseSetNumber` is null and print the code), `category: "Pokemon"` when absent, and `tcgdexId` when `toTcgdexId` returns non-null. Builds the new array in memory, writes once with `JSON.stringify(cards, null, 2) + "\n"`. Prints a summary: counts updated and the list of unmapped codes.

- [ ] **Step 6: Run it and inspect**

Run: `node scripts/backfill_card_fields.mjs && node -e 'const c=require("./data/cards.json");console.log(c.filter(x=>x.tcgdexId).length, c.filter(x=>x.setNumber==null).length)'`
Expected: `148 1` (DP4d has no number) and the 8 unmapped codes listed, matching the spec's "148 of 156".

- [ ] **Step 7: Set `setNumber` by hand for the one card without it**

Edit the `DP4d` card in `data/cards.json`: `setNumber: 0`. Then `npm test && npx tsc --noEmit`.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/tcgdex.mjs scripts/backfill_card_fields.mjs tests/tcgdex.test.ts data/cards.json
git commit -m "Backfill setNumber, category, tcgdexId on existing cards"
```

---

### Task 5: Dashboard binder scoping, tabs, stats labels, filters

**Files:**
- Create: `components/BinderTabs.tsx`
- Modify: `components/PortfolioTracker.tsx`
- Modify: `app/globals.css` (append `.binder-tabs`, `.binder-tab`, `.binder-tab.active`, `.binder-tab-count`)

**Interfaces:**
- Consumes: Task 2 `computeStats`, Task 3 `resolveBinderId`, `getBinder`, `cardsForBinder`, `buildCardBinderMap`, `binders` from `@/lib/data`.
- Produces: `BinderTabs({ binders, activeId, counts, onSelect })` where `counts: Record<string, { owned: number; total: number }>` and `onSelect(id: string): void`. Reused by Task 6.

- [ ] **Step 1: Add `BinderTabs`**

A `<nav className="binder-tabs" aria-label="Binders">` of `<button className="binder-tab[ active]" aria-pressed>` showing `binder.name` and `<span className="binder-tab-count">{owned} / {total}</span>`. CSS: horizontal, wrapping, pill style using the existing `.pill-toggle` colors, `.active` uses the progress-bar accent.

- [ ] **Step 2: Add binder state to `PortfolioTracker.tsx`**

- `const [binderId, setBinderId] = useState(() => resolveBinderId(searchParams.get("binder"), binders))`.
- `const binder = getBinder(binderId, binders)`; `const binderCards = useMemo(() => cardsForBinder(binderId, allCards), [binderId])`; `const cardBinder = useMemo(() => buildCardBinderMap(allCards), [])`.
- In the URL effect: `if (binderId !== DEFAULT_BINDER_ID) p.set("binder", binderId)`; add `binderId` to deps.
- `sortKey` initial value: `searchParams.get("sort") ?? initialBinder.sort`, where `initialBinder` is computed once above the hooks from the same `resolveBinderId` call; the URL effect omits `sort` when it equals `binder.sort`.
- `function selectBinder(id)`: set binderId, reset `search` to "", `typeFilter`/`setFilter`/`ownershipFilter` to "all", `illustrationOnly` false, `sortKey` to the new binder's sort, `sortDir` "asc", `modalCard` null.
- `stats = computeStats(binderCards, ownership, purchases, binderId, cardBinder)`.
- `allTypes`, `allSets`, `filtered`, modal lookup (`allCards.find` at line 44), and the results count all use `binderCards`.
- `counts` for the tabs: for each binder, `cardsForBinder(b.id, allCards)` with owned = those in `ownership`.

- [ ] **Step 3: Adapt header and stats tiles**

- `<h1>{binder.name}</h1>`, tagline unchanged formula.
- Tile labels: `wants` keeps today's six. `master-set`: label "Set value ({pricedCount} priced)" replaces "Budget", "To complete as singles" replaces "To complete (est.)", and the Saved tile becomes `{stats.duplicates}` with label "Duplicates" and title "Extra copies pulled beyond the first".

- [ ] **Step 4: Adapt filters**

- Render the Illustration button only when `binder.kind === "wants"`.
- `allTypes` is built from `type1`/`type2` of Pokemon cards; append `"Trainer"` when any card in the binder has `cardCategory(c) === "Trainer"`. Type filter match: `typeFilter === "Trainer" ? cardCategory(c) === "Trainer" : (c.type1 === typeFilter || c.type2 === typeFilter)`.

- [ ] **Step 5: Adapt CSV**

`buildCsv(binderCards, ownership)`; filename `` `${binderId}-${date}.csv` ``. In `lib/purchases.ts` extend `buildCsv` header with `Category,Set Number,Japanese Name,Rarity,Qty Owned` and the row with `c.category ?? "Pokemon"` (inlined, since `lib/purchases.ts` may not value-import from `lib/cards.ts`), `c.setNumber`, `csvEscape(c.nameJa ?? "")`, `csvEscape(c.rarity ?? "")`, `o ? String(o.purchaseCount) : "0"`; Pokedex # renders `""` for null; Price Paid renders `""` for null. Add a test in `tests/purchases.test.ts` asserting the header string and one Trainer row.

- [ ] **Step 6: Type check, tests, manual check**

Run: `npx tsc --noEmit && npm test && npm run dev`
Check in the browser: `/` shows Kanto with tabs and unchanged stats; clicking "30th CELEBRATION" shows an empty binder (0 / 0) until Task 8 adds cards; `/?binder=typo` lands on Kanto and the URL drops the param; `/?binder=eeveelutions&set=Eevee%20Heroes` keeps the set filter on load.

- [ ] **Step 7: Commit**

```bash
git add components app/globals.css lib tests
git commit -m "Scope dashboard to a binder with tabs, URL param, and kind-aware stats"
```

---

### Task 6: Card display for Trainers and Japanese names; print page per binder

**Files:**
- Create: `tests/display.test.ts`
- Modify: `lib/cards.ts` (append `numberLabel`, `typeBadges`)
- Modify: `components/CardTile.tsx:120-137`, `components/CardModal.tsx:165-184,190-193`, `components/PortfolioTracker.tsx` (table `#` and Type cells, name cell), `components/PlaceholderCard.tsx:10,13,27-40`
- Modify: `app/print/page.tsx`
- Modify: `app/globals.css` (append `.name-ja`, `.type-badge.trainer`)

**Interfaces:**
- Produces, appended to `lib/cards.ts` (next to `typeColors`, which they use):
  ```ts
  export function numberLabel(c: Card, officialCount?: number): string;
  // Pokemon: "#025" style (3-digit padded) ; Trainer/Energy: "No. 101 / 103" or "No. 101" when officialCount is undefined
  export function typeBadges(c: Card): { label: string; color: string }[];
  // Pokemon: type1 and type2 with typeColors fallback "#888" ; otherwise one { label: "Trainer" | "Energy", color: "#777" }
  ```

- [ ] **Step 1: Write failing tests**

```ts
test("numberLabel and typeBadges for Pokemon and Trainer", () => {
  assert.equal(numberLabel(card({ pokedexNumber: 25 })), "#025");
  assert.equal(numberLabel(card({ pokedexNumber: null, type1: null, category: "Trainer", setNumber: 101 }), 103), "No. 101 / 103");
  assert.equal(numberLabel(card({ pokedexNumber: null, type1: null, category: "Trainer", setNumber: 101 })), "No. 101");
  assert.deepEqual(typeBadges(card({ type1: "Grass", type2: "Poison" })).map((b) => b.label), ["Grass", "Poison"]);
  assert.deepEqual(typeBadges(card({ pokedexNumber: null, type1: null, category: "Trainer" })), [{ label: "Trainer", color: "#777" }]);
});
```

Move the `card()` factory from `tests/purchases.test.ts` into `tests/helpers.ts` and import it from both files.

- [ ] **Step 2: Run to confirm failure, implement the two helpers in `lib/cards.ts`, run to pass**

Run: `npm test` (FAIL: `numberLabel` is not exported), implement, `npm test` (PASS).

- [ ] **Step 3: Use the helpers in the four components**

- `CardTile`: `.card-tile-num` shows `numberLabel(card, officialCount)`; badges map over `typeBadges(card)` with `className={"type-badge" + (b.label === "Trainer" ? " trainer" : "")}`; add `<span className="name-ja">{card.nameJa}</span>` after the name when present. `CardTile` gains an optional `officialCount?: number` prop; `PortfolioTracker` passes `binder.officialCount`.
- `CardModal`: same for the badges; `<dt>Pokedex #</dt>` row renders `numberLabel(card, officialCount)` with label "Number" when `pokedexNumber` is null; `<h2>` gets the `name-ja` line; new optional `officialCount` prop.
- `PortfolioTracker` table: `pokedex-num` cell uses `numberLabel`; Type cell maps `typeBadges`; name cell appends `name-ja`. `getSortValue` for key `pokedexNumber` returns `c.pokedexNumber ?? null` (already null-safe).
- `PlaceholderCard`: `.ph-dex` shows `numberLabel(card, officialCount)`; `.ph-name` appends `name-ja`; badges map `typeBadges`. New optional `officialCount` prop.
- CSS: `.name-ja { display:block; font-size: 0.75em; opacity: 0.7; }` and `.type-badge.trainer { background:#777 }`. For `.placeholder-card .name-ja` use `font-size: 7pt` so the 63 by 88 mm card still fits.

- [ ] **Step 4: Print page per binder**

In `app/print/page.tsx`: wrap the page in `<Suspense>` inside a new default export so `useSearchParams` is allowed (mirror `app/page.tsx`); read `binderId` with `resolveBinderId`; `binderCards = cardsForBinder(binderId, cards)`; sort by `binder.sort` with null `pokedexNumber` last; render `<BinderTabs>` in `.print-controls-actions` with `onSelect` doing `router.replace` to `?binder=<id>` (omit when default); `<h1>{binder.name} placeholder cards</h1>`; pass `officialCount` to `PlaceholderCard`.

- [ ] **Step 5: Type check, tests, manual check**

Run: `npx tsc --noEmit && npm test && npm run dev`
Check: `/print` identical to before for Kanto; `/print?binder=eeveelutions` shows 3 cards on one sheet; tabs switch binders; a browser print preview still shows the calibration page first.

- [ ] **Step 6: Commit**

```bash
git add lib tests components app
git commit -m "Render Trainers and Japanese names; print page per binder"
```

---

### Task 7: Script helpers for PriceCharting and M6a card building

**Files:**
- Create: `scripts/lib/pricecharting.mjs`
- Create: `scripts/lib/m6a.mjs`
- Create: `tests/pricecharting.test.ts`, `tests/m6a.test.ts`

**Interfaces:**
- Produces, in `scripts/lib/pricecharting.mjs`:
  ```js
  export async function fetchConsoleProducts(consoleSlug)  // pages GET https://www.pricecharting.com/console/<slug>?cursor=<0,50,100,...>&format=json until `products` is empty; dedupes by `id`; returns products[]
  export function numberedProducts(products)   // Map<number, product> for productUri matching /-(\d+)$/ ; first seen wins
  export function englishName(productName)     // "Pikachu ex #126" -> "Pikachu ex" ; "Darkrai & Cresselia LEGEND #151" -> "Darkrai & Cresselia LEGEND"
  export function largeImage(imageUri)         // ".../<hash>/60.jpg" -> ".../<hash>/1600.jpg"
  ```
- Produces, in `scripts/lib/m6a.mjs`:
  ```js
  export function detectVariant(name)          // see test ; null when none
  export function generationOf(dexId)          // 1..9 by thresholds 151,251,386,493,649,721,809,905,1025
  export function slugify(name)                // "Darkrai & Cresselia LEGEND" -> "darkrai-cresselia-legend" ; "Alolan Exeggutor" -> "alolan-exeggutor"
  export function buildM6aCard(tcgdexCard, product, trainerNames)  // -> Card JSON object per the spec, or throws when product is missing and name not in trainerNames
  ```
  `trainerNames` is `{ "101": "Ultra Ball", "102": "Poke Pad", "103": "Switch", "138": "Misty", "153": "N" }`. PriceCharting covers all 165 numbers today, so the table is a fallback only.

- [ ] **Step 1: Write failing tests**

```ts
// tests/pricecharting.test.ts
test("englishName, largeImage, numberedProducts", () => {
  assert.equal(englishName("Pikachu ex #126"), "Pikachu ex");
  assert.equal(englishName("Darkrai & Cresselia LEGEND #151"), "Darkrai & Cresselia LEGEND");
  assert.equal(largeImage("https://storage.googleapis.com/images.pricecharting.com/abc/60.jpg"), "https://storage.googleapis.com/images.pricecharting.com/abc/1600.jpg");
  const m = numberedProducts([{ id: "1", productUri: "exeggcute-1", productName: "Exeggcute #1" }, { id: "2", productUri: "exeggcute-1", productName: "Exeggcute #1" }, { id: "3", productUri: "booster-box", productName: "Booster Box" }]);
  assert.equal(m.size, 1); assert.equal(m.get(1).id, "1");
});
// tests/m6a.test.ts
test("detectVariant follows the existing convention", () => {
  assert.equal(detectVariant("Pikachu ex"), "ex");
  assert.equal(detectVariant("Rayquaza EX"), "EX");
  assert.equal(detectVariant("Solgaleo GX"), "GX");
  assert.equal(detectVariant("Zacian V"), "V");
  assert.equal(detectVariant("Mew VMAX"), "VMAX");
  assert.equal(detectVariant("Arceus VSTAR"), "VSTAR");
  assert.equal(detectVariant("Greninja BREAK"), "BREAK");
  assert.equal(detectVariant("Darkrai & Cresselia LEGEND"), "LEGEND");
  assert.equal(detectVariant("M Gardevoir EX"), "Mega / EX");
  assert.equal(detectVariant("Alolan Exeggutor"), "Alolan Form");
  assert.equal(detectVariant("Galarian Meowth"), "Galarian Form");
  assert.equal(detectVariant("Hisuian Zorua"), "Hisuian Form");
  assert.equal(detectVariant("Erika's Jigglypuff"), "Trainer's Pokemon");
  assert.equal(detectVariant("Pikachu"), null);
});
test("generationOf thresholds", () => {
  assert.equal(generationOf(151), 1); assert.equal(generationOf(152), 2); assert.equal(generationOf(1025), 9);
});
test("buildM6aCard maps a Pokemon and a Trainer", () => {
  const pika = buildM6aCard(
    { id: "M6a-126", localId: "126", name: "ピカチュウex", category: "Pokemon", dexId: [25], types: ["Lightning"], rarity: "Special illustration rare" },
    { productName: "Pikachu ex #126", imageUri: "https://storage.googleapis.com/images.pricecharting.com/h/60.jpg" }, {});
  assert.equal(pika.id, "m6a-126-pikachu-ex"); assert.equal(pika.code, "M6a 126"); assert.equal(pika.setNumber, 126);
  assert.equal(pika.type1, "Electric"); assert.equal(pika.variant, "ex"); assert.equal(pika.generation, 1);
  assert.equal(pika.nameJa, "ピカチュウex"); assert.equal(pika.binderId, "m6a-30th"); assert.equal(pika.buyPrice, null);
  assert.equal(pika.imageUrl, "https://storage.googleapis.com/images.pricecharting.com/h/1600.jpg"); assert.equal(pika.localImage, false);
  const n = buildM6aCard({ id: "M6a-153", localId: "153", name: "N", category: "Trainer", rarity: "Classic Collection" }, undefined, { "153": "N" });
  assert.equal(n.id, "m6a-153-n"); assert.equal(n.pokedexNumber, null); assert.equal(n.type1, null); assert.equal(n.category, "Trainer"); assert.equal(n.imageUrl, null);
});
```

- [ ] **Step 2: Run to confirm failure, implement both modules, run to pass**

tcgdex type names differ from the app's: map `Lightning -> Electric`, `Darkness -> Dark`, `Colorless -> Normal`; everything else passes through. The `Card` object's field order follows the existing entries in `data/cards.json`. `generation` is `generationOf(dexId[0])` for Pokemon and `null` for Trainers.

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib tests
git commit -m "Add PriceCharting and M6a card-building helpers"
```

---

### Task 8: Build the M6a binder data and images

**Files:**
- Create: `scripts/build_m6a.mjs`
- Modify: `data/cards.json`, `public/cards/m6a-*.webp` (by running scripts)

**Interfaces:**
- Consumes: Task 4 `fetchCard`, Task 7 helpers.

- [ ] **Step 1: Write `scripts/build_m6a.mjs`**

Sequence: fetch `https://api.tcgdex.net/v2/ja/sets/M6a`, keep cards whose `localId` matches `/^\d{3}$/`, fetch each with `fetchCard` (sequential, 150 ms pause); `fetchConsoleProducts("pokemon-japanese-30th-celebration")` then `numberedProducts`; build each card with `buildM6aCard`; skip ids already present in `data/cards.json`; append; write once. Print: count added, count skipped, list of cards with `imageUrl: null`.

- [ ] **Step 2: Run it**

Run: `node scripts/build_m6a.mjs && node -e 'const c=require("./data/cards.json").filter(x=>x.binderId==="m6a-30th");console.log(c.length, c.filter(x=>!x.imageUrl).length, c.filter(x=>x.category==="Trainer").length)'`
Expected: `165 0 5`. If the second number is not 0, follow the CLAUDE.md image rule for those cards before continuing.

- [ ] **Step 3: Download images**

Run: `npm install --no-save sharp && node scripts/download_images.mjs && ls public/cards | grep -c '^m6a-'`
Expected: `165`. Failed downloads are listed by the script; retry once, then fill by hand.

- [ ] **Step 4: Validate and check in the UI**

Run: `npm test && npx tsc --noEmit && npm run build`
Then `npm run dev`: the "30th CELEBRATION" tab shows 0 / 165, grid tiles show Japanese names, the five Trainers show "No. 101 / 103" style labels and a gray Trainer badge, `/print?binder=m6a-30th` reports 165 cards and 19 sheets.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_m6a.mjs data/cards.json public/cards
git commit -m "Add 30th CELEBRATION (M6a) master set binder with images"
```

---

### Task 9: Price refresh script with history

**Files:**
- Create: `scripts/lib/prices.mjs`
- Create: `tests/prices.test.ts`
- Create: `scripts/refresh_prices.mjs`
- Create: `data/prices.json` (by running the script)
- Modify: `data/cards.json` (by running the script)

**Interfaces:**
- Consumes: Task 4 `fetchCard`, binder kinds from `data/binders.json` (the script reads the JSON directly).
- Produces, in `scripts/lib/prices.mjs`:
  ```js
  export function seedManual(history, buyPrice, date)   // history: snapshot[] | undefined ; returns new array with { date, source: "manual", price } prepended only when history is empty and buyPrice != null
  export function upsertCardmarket(history, snap)       // snap: { date, source: "cardmarket", trend, avg7, avg30, low } ; replaces an existing cardmarket snapshot with the same date, else appends ; returns new array
  export function nextBuyPrice(card, binderKind, trend) // round(trend, 2) ; returns card.buyPrice unchanged when binderKind === "wants" && card.buyPrice == null, or when trend == null
  export function topMovers(changes, n)                 // changes: { id, from, to }[] -> n entries sorted by |to - from| desc
  ```

- [ ] **Step 1: Write failing tests**

```ts
test("seedManual only once and only for priced cards", () => {
  assert.deepEqual(seedManual(undefined, 32, "2026-10-23"), [{ date: "2026-10-23", source: "manual", price: 32 }]);
  assert.deepEqual(seedManual(undefined, null, "2026-10-23"), []);
  const h = [{ date: "2026-10-01", source: "manual", price: 30 }];
  assert.equal(seedManual(h, 32, "2026-10-23"), h);
});
test("upsertCardmarket replaces same-day and appends otherwise", () => {
  const a = upsertCardmarket([], { date: "2026-10-23", source: "cardmarket", trend: 1, avg7: 1, avg30: 1, low: 1 });
  const b = upsertCardmarket(a, { date: "2026-10-23", source: "cardmarket", trend: 2, avg7: 2, avg30: 2, low: 2 });
  assert.equal(b.length, 1); assert.equal(b[0].trend, 2);
  assert.equal(upsertCardmarket(b, { date: "2026-10-24", source: "cardmarket", trend: 3, avg7: 3, avg30: 3, low: 3 }).length, 2);
});
test("nextBuyPrice respects the wants-null rule", () => {
  assert.equal(nextBuyPrice({ buyPrice: null }, "wants", 4.567), null);
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "wants", 4.567), 4.57);
  assert.equal(nextBuyPrice({ buyPrice: null }, "master-set", 4.567), 4.57);
  assert.equal(nextBuyPrice({ buyPrice: 5 }, "master-set", null), 5);
});
test("topMovers sorts by absolute change", () => {
  assert.deepEqual(topMovers([{ id: "a", from: 1, to: 2 }, { id: "b", from: 10, to: 5 }], 1).map((m) => m.id), ["b"]);
});
```

- [ ] **Step 2: Run to confirm failure, implement, run to pass**

Run: `npm test` (FAIL then PASS).

- [ ] **Step 3: Write `scripts/refresh_prices.mjs`**

Reads `data/cards.json`, `data/binders.json`, and `data/prices.json` (default `{}` when missing). Today's date as `YYYY-MM-DD`. For each card with `tcgdexId`: `fetchCard`; skip and list when null or `pricing.cardmarket.trend == null`; `history = seedManual(prices[id], card.buyPrice, date)`; `history = upsertCardmarket(history, snapshot)`; `card.buyPrice = nextBuyPrice(card, kind, trend)`; record `{ id, from, to }` when changed. Cards without `tcgdexId` are listed as skipped. `--dry-run` prints the change list and skips writing. Otherwise writes both files once at the end and prints `topMovers(changes, 10)` as `id: from -> to`.

- [ ] **Step 4: Dry run, then real run**

Run: `node scripts/refresh_prices.mjs --dry-run`
Expected: a change list, 8 skipped Kanto codes plus none for M6a, no file changes (`git status` clean).

Run: `node scripts/refresh_prices.mjs && node -e 'const p=require("./data/prices.json");const c=require("./data/cards.json");console.log(Object.keys(p).length, c.filter(x=>x.binderId==="m6a-30th"&&x.buyPrice==null).length, c.filter(x=>x.binderId==="kanto-151"&&x.buyPrice==null).length)'`
Expected: first number about 313 (148 Kanto-era plus 165 M6a); second `0`; third unchanged from before the run (compare with `git show HEAD:data/cards.json`).

- [ ] **Step 5: Run again the same day and confirm idempotence**

Run: `node scripts/refresh_prices.mjs && node -e 'const p=require("./data/prices.json");console.log(Math.max(...Object.values(p).map(h=>h.filter(s=>s.source==="cardmarket").length)), Math.max(...Object.values(p).map(h=>h.filter(s=>s.source==="manual").length)))'`
Expected: `1 1`.

- [ ] **Step 6: Build, then commit data and script separately**

Run: `npm test && npx tsc --noEmit && npm run build`

```bash
git add scripts/lib/prices.mjs scripts/refresh_prices.mjs tests/prices.test.ts
git commit -m "Add price refresh script with append-only history"
git add data/prices.json data/cards.json
git commit -m "Refresh Cardmarket prices and seed price history"
```

Use the script's top-movers output in the second commit body.

---

### Task 10: Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `app/layout.tsx:4-5,13-16` (title default "Pokemon card binders", template "%s · Pokemon binders", description mentions multiple binders)

- [ ] **Step 1: Update CLAUDE.md**

Sections to change: Overview (several binders, M6a), Data model (add `data/binders.json` with `kind` semantics, new card fields, `pricePaid: null` and `qty` for pulls, `product`, `data/prices.json`), Project Structure (`lib/data.ts`, `lib/binders.ts`, `components/BinderTabs.tsx`, `scripts/lib/`, `tests/`), Source of truth rule (how to log a booster-pull shipment, with the example from the spec), a new "Refreshing prices" section (`node scripts/refresh_prices.mjs [--dry-run]`, what it changes, commit both files), Current Features (binder tabs, `?binder=` param), Known Limitations (remove "Binder selector", "Market-price refresh", and "No tests yet"; add "price history not visualized"), Commands (`npm test`).

- [ ] **Step 2: Update layout metadata and build**

Run: `npm run build && npm test`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md app/layout.tsx
git commit -m "Document binders, pack-pull shipments, price refresh, and tests"
```
