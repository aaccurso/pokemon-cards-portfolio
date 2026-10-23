# Roadmap lane: insight for a collector

## Lane summary

The data to answer the questions a collector actually asks ("what is my collection worth", "which rarities am I missing", "is this price going up", "should I keep buying packs") is already in the four JSON files; nothing here needs a new data source, and only one item needs new fields. The main skeptical findings are that `buyPrice` is now the Cardmarket trend, so "Saved vs target" on wants binders is already market value minus paid and only needs reframing, that M6a value is so concentrated (top 40 of 165 cards hold 94% of the 620,97 EUR set value, 111 cards under 1 EUR sum to 11,90 EUR) that card-count progress and sub-euro price deltas are misleading, and that `data/prices.json` has exactly one date today and grows by roughly 35-40 KB per refresh, so the UI should read a bounded summary derived at refresh time rather than the history itself. Every item below is a pure function in `lib/` with a `node --test` case, plus a small change to the stats grid, the controls row, the tile, or the modal.

Numbers quoted are from the repo as of 2026-10-23: Kanto 83 / 152 owned, M6a 0 / 165 owned, 31 shipments, none with `product` yet.

---

## 1. Collection value: market value of what you own vs what you paid

**Problem.** The app is called a portfolio, but no tile says what the owned cards are worth. On wants binders the information is hidden inside "Saved vs target" (`savings` in `computeStats`, `lib/purchases.ts`), which since the price refresh is literally `sum(buyPrice) - sum(pricePaid)` over owned cards, i.e. unrealised gain, under a label that still implies a shopping target. On master-set binders every pull has `pricePaid: null`, so "Spent on cards" is permanently 0,00 EUR and `savings` is 0: the tile that should carry the insight carries nothing. The `legacy` shipment has `total: null`, so "Total outlay" is at least 55,34 EUR (the sum of its eight `pricePaid`) too low on Kanto.

**Proposed approach.** Add three numbers to `CollectionStats` in `computeStats`, no new inputs:

```
marketValue          = sum(c.buyPrice)                       over owned c with buyPrice != null
marketValueAllCopies = sum(c.buyPrice * o.purchaseCount)     same set, o = ownership.get(c.id)
unpricedOwned        = count(owned c with buyPrice == null)
```

Derived in the component, not stored: `gainVsPaid = marketValue - spentOnCards` (equals today's `savings` whenever every owned card is priced, which is true for all 83 Kanto cards; keep `savings` in the type for one release, then drop it) and `vsOutlay = marketValue - totalOutlay` (outlay already includes shipping, fees and duplicates via `binderShare`).

Stats grid changes in `components/PortfolioTracker.tsx`:

- wants: the "Saved vs target" tile becomes "Value (83 owned)", value `1085,25 EUR`, sub-line `+330,61 EUR vs paid`. Title attribute explains that value is the Cardmarket trend.
- master-set: the useless "Spent on cards" tile becomes "Pulled value", value `marketValueAllCopies`, sub-line `distinct N EUR`. Duplicates tile stays.
- both: "Total outlay" gets the sub-line `value / outlay` as a percentage, e.g. `123%`. This is the only honest ROI, because it includes shipping.

```
+-------------------+  +-------------------+  +-------------------+
| 1085,25 EUR       |  | 754,64 EUR        |  | 883,33 EUR        |
| Value (83 owned)  |  | Spent on cards    |  | Total outlay      |
| +330,61 vs paid   |  |                   |  | value = 123%      |
+-------------------+  +-------------------+  +-------------------+
```

`BinderTabs` can show nothing new; an "all binders" value is one line under the tab strip (`sum over binders of marketValue` vs global `sum(shipment.total)`), computed in the existing `binderCounts` memo. That is a summary line, not the "All binders" view the spec excluded.

Data fix shipped with it: set `legacy.total` to 55,34 in `data/purchases.json` so outlay and the ROI line are not understated. Tests: extend `tests/purchases.test.ts` with a wants and a master-set fixture; add a real-data invariant in `tests/data.test.ts` that `marketValue <= budget` per binder.

**Effort.** S: one function, three tiles, one test file.

**Dependencies.** None. It also unblocks item 4 (pack economics needs `marketValueAllCopies`).

**Open questions.**
1. Should the value tile use `trend` (volatile, today's `buyPrice`) or `avg30` (needs item 3's summary file)? Recommendation: trend now, switch the sub-line to avg30 later.
2. Is the "all binders" line wanted, given the spec said no All view?
3. Is the `legacy` total really 55,34 EUR, or were there shipping costs you remember?

---

## 2. Completion by rarity (master-set)

**Problem.** `rarity` exists on all 165 M6a cards (93 None, 10 Double rare, 20 Illustration rare, 10 Special illustration rare, 2 Futuristic Rare, 30 Classic Collection) and on no other binder, and nothing reads it except the CSV. Progress is one bar over card count. Because 111 cards are worth under 1 EUR in total 11,90 EUR, the bar will read 67% while 98% of the set's value (609 EUR) is still missing. There is no way to filter the grid to "Classic Collection I still need".

**Proposed approach.**

- New pure function `rarityBreakdown(cards, ownership)` in `lib/purchases.ts` returning, per rarity in a fixed display order, `{ rarity, label, total, owned, value, toComplete }` with `value = sum(buyPrice)` and `toComplete = sum(buyPrice over unowned)`. Order and labels are a constant in `lib/cards.ts` next to `typeColors`: `None -> "Common / Uncommon"`, `Double rare -> "RR"`, `Illustration rare -> "AR"`, `Special illustration rare -> "SAR"`, `Futuristic Rare -> "Futuristic"`, `Classic Collection -> "Classic"`. Unknown rarities go last with their raw label.
- A second progress figure in the header: value-weighted completion `marketValue / budget` from item 1, shown next to the count percentage. This is the honest master-set progress.
- A `rarity` select in the controls row, rendered only when `binderCards.some(c => c.rarity)`, URL param `rarity`, reset in `selectBinder`, applied in the `filtered` memo like `setFilter`.
- A compact breakdown under the progress bar, master-set only, each row clickable to set the rarity filter:

```
62 / 165 cards (38%)   value 41 / 621 EUR (7%)
Common / Uncommon  ##############......  58 / 93
RR                 ####................   2 / 10
AR                 ##..................   2 / 20   to go 23 EUR
SAR                ....................   0 / 10   to go 186 EUR
Futuristic         ....................   0 / 2    to go 28 EUR
Classic            ....................   0 / 30   to go 372 EUR
```

Rows are plain `div`s with a width percentage, same technique as `.progress-bar-fill`. Visual rarity treatment of tiles belongs to the design lane (design-usability.md item 6); this item only adds data and a filter, so the two do not collide.

**Effort.** S: one pure function with a test, one select, one list.

**Dependencies.** Item 1 for the value-weighted percentage (can ship without it, count-only).

**Open questions.**
1. tcgdex reports "None" for 93 cards. Does that bucket mix Common, Uncommon and Rare? If the printed rarity symbol matters to you, `build_m6a.mjs` would need a second source.
2. Should the rarity filter also appear on wants binders once any card there has a rarity, or stay master-set only?

---

## 3. Price movement: delta chip on tiles, sparkline in the modal

**Problem.** `data/prices.json` is write-only. The collector cannot see whether a 32 EUR Pikachu is drifting up or down, and the first refresh already moved 58 Kanto targets up and 20 down against the hand-set prices. Constraints: no chart library; the app is a static client bundle, and `lib/data.ts` is the only JSON importer, so anything imported there ships to every visitor. The history file is 61 KB pretty-printed with one date and 309 keys; at one refresh a week it is roughly 2 MB in a year. It must not be bundled.

**Proposed approach.** Derive a bounded summary at refresh time and bundle only that.

- `scripts/refresh_prices.mjs` writes a third file, `data/price-summary.json`, after `prices.json`, via a new pure `summarize(history, n = 12)` in `scripts/lib/prices.mjs` (tested in `tests/prices.test.ts`). Shape per card id: `{ asOf, trend, avg7, avg30, low, target, spark }` where `target` is the `manual` snapshot price when present and `spark` is the last 12 cardmarket `trend` values, oldest first. About 309 x 120 bytes, 40 KB, constant regardless of history length. `lib/data.ts` imports it as `priceSummary`; a new pure `lib/prices.ts` holds the type and `priceDelta(summary)`.
- Delta is computed from the latest snapshot alone, so it works from day one: `pct = (trend - avg30) / avg30`. Show a chip only when `avg30 >= 1` and `|pct| >= 0.05`. Both thresholds are essential: M6a commons move from 0,02 to 0,03 EUR between refreshes, which is +50% of nothing. Once `spark.length >= 2`, add a second delta "since last refresh" as `spark[-1] vs spark[-2]`.
- Tile (`components/CardTile.tsx`): a small chip next to `card-tile-num`, `▲ 12%` or `▼ 8%`, colour from two CSS classes. Table: a `Trend` column sortable via a new `SortKey` `priceDelta` handled in `getSortValue`. Modal (`components/CardModal.tsx`): a `dl` row "30-day avg 31,49 EUR, low 16,00 EUR, your target 32,00 EUR" and the sparkline:

```
Price      30,45 EUR  ▼ 3% vs 30-day avg
           .-'''-.             ._
       _.-'       '-._     _.-'      <- polyline, 120 x 28 viewBox
                      '--'
           Jul               Oct
```

```tsx
<svg viewBox="0 0 120 28" className="spark" aria-label="Price history">
  <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={pts} />
</svg>
// x = i * 120 / (n - 1); y = 26 - (v - min) / ((max - min) || 1) * 24
```

Render the sparkline only when `spark.length >= 3`; before that show "History starts after a few refreshes." Nothing else in the modal changes.

**Effort.** M: a script change with tests, a new lib module, three component touches, one CSS block. The delta chip alone, without the sparkline, is S.

**Dependencies.** A second price refresh to make the sparkline non-trivial. Delta chip has none.

**Open questions.**
1. Weekly or monthly refresh cadence? It sets the sparkline window (12 points is 3 months weekly, a year monthly).
2. Is `avg30` the right baseline for the chip, or `target` (your original hand-set price) on wants binders?
3. Are you fine committing a derived file, or would you rather fold `asOf/avg30/spark` into `cards.json`? Separate file keeps `cards.json` hand-editable; recommended.

---

## 4. Pack economics: when to stop opening and buy singles

**Problem.** For the M6a binder the real question is money: packs cost a fixed amount, return mostly sub-euro commons plus the occasional 20 to 80 EUR Classic Collection card, and the set completes faster by singles at some point. Today the fields exist to log pulls (`product`, `total`, `pricePaid: null`, `qty`) but no shipment uses them yet, and the ownership map discards shipment order, so "what did this box add" is not derivable from `buildOwnershipMap`.

**Proposed approach.** A pure `packLedger(shipments, cards, binderId)` in `lib/purchases.ts` that walks shipments with `product` set and at least one item in the binder, sorted by `date`, keeping a `seen` set. Per shipment:

```
spend      = total                                   (sealed cost, already includes fees)
pulled     = sum(qty)
newCards   = count(items whose cardId not yet in seen)
newValue   = sum(buyPrice over those new cards)       first copy only
dupValue   = sum(buyPrice * (qty - firstCopy))        trade or bulk value
yieldNew   = newValue / spend                         EUR of new cards per EUR spent
singlesLeft= sum(buyPrice over cards not in seen)     "To complete as singles" as of that shipment
```

All of this is derivable today from existing fields. New optional field on `Shipment`: `packs?: number` (count opened). It is not needed for the ledger but turns every row into per-pack figures and makes a 2-box and a 1-box shipment comparable; add it to the CLAUDE.md example so the first real shipment carries it.

The decision rule is deliberately simple and shown as a sentence, not a verdict. A euro spent on singles buys one euro of missing value by definition, while a box returns `yieldNew` euros of missing value per euro, and `yieldNew` can only fall as `seen` grows. So the moment the last shipment's `yieldNew < 1`, singles are cheaper for completion even under the optimistic assumption that the next box pulls like the last one. The optimistic cost of finishing by packs is `singlesLeft / yieldNew`, a lower bound; display it next to `singlesLeft` so the gap is visible. What packs still buy after that point is duplicates (`dupValue`) and the fun, which the app should not try to price.

UI, master-set only, a `<details>` block under the stats grid:

```
Pack ledger
date        product              spend   pulled  new  new value  dup value  yield  singles left
2026-10-30  booster box x2      120,00     200    96     71,40       9,80   0,60      549,57
2026-11-12  booster box x1       60,00     100    21     12,10      18,30   0,20      537,47
Last box returned 0,20 EUR of new cards per 1 EUR. Finishing by packs would cost at
least 2687 EUR at that rate; finishing as singles costs 537,47 EUR today.
```

Caveats to print in the block's title attribute: valuations use today's trend, not the price on the pull date; expensive cards drive everything (a single Lugia at 78,72 EUR is more than the value of all 93 commons together), so one row proves little.

**Effort.** M: one pure function with a dated-fixture test, one table component, a CLAUDE.md note. No stats-grid change beyond item 1.

**Dependencies.** Item 1 (`marketValueAllCopies` for the totals row). At least one logged box to be worth looking at; decide `packs` before the first box is logged.

**Open questions.**
1. How many packs and cards per pack in an M6a box? Needed only for the per-pack line.
2. Do you want duplicates valued at trend, or discounted (bulk commons are unsellable; a 50% haircut on `dupValue` is common practice)?
3. Will you also buy M6a singles? If so, items with `pricePaid` set would mix into the same binder; the ledger ignores them, but the "Pulled value" tile should say "pulled or bought".

---

## 5. Buy-next list for wants binders (deal finder)

**Problem.** With 69 Kanto cards still wanted and 86 priced, "what should I buy next" is answered by scrolling. The pre-refresh hand-set targets now live only as `manual` snapshots in `prices.json`, and 20 cards are already cheaper than the target you set; nothing surfaces that.

**Proposed approach.** Uses item 3's summary (`target`, `avg30`, `low`). Two derived values per unowned priced card: `vsTarget = trend - target` and `discount = (avg30 - trend) / avg30`. Add a `Deals` pill toggle next to "Illustration only" (wants binders only, URL param `deals=1`) that filters to unowned cards where `trend <= target` or `discount >= 0.10`, and a default sort of `vsTarget` ascending while the toggle is on. The table shows `target` and `low` as two extra columns under the toggle; tiles need nothing new beyond item 3's chip. No new stats.

```
[ Illustration only ] [ Deals (14) ]   sorted: cheapest vs your target first
```

**Effort.** S once item 3 exists: one filter branch, one sort key, two columns.

**Dependencies.** Item 3 (summary file with `target`).

**Open questions.**
1. Should `low` (cheapest listing) be shown at all? It is a single listing, often a damaged copy, and will tempt bad comparisons.
2. Is 10% off the 30-day average the right threshold, or should the toggle only use your own target?

---

## 6. Binder value over time

**Problem.** "Is my collection going up" needs a line, and a line needs more than one date. Today there is exactly one (2026-10-23).

**Proposed approach.** No new data file. Add `sparkDates: string[]` (shared, since every card refreshes on the same day) at the top level of `price-summary.json`, carrying each card's `spark` forward when it was skipped on a date. In the component, `V[t] = sum over owned cards of spark[t]`, 12 points, drawn with the same polyline as item 3 at 320 x 60 in the stats area or under the progress bar, labelled "today's collection at past prices" because the owned set is today's, not the historical one. Optionally overlay `spentOnCards` as a flat dashed line. A true "as it grew" line would need each card's first purchase date (`buildOwnershipMap` could record `firstDate` from `Shipment.date`; the `legacy` shipment has none). Defer that until the simple line has proven useful.

**Effort.** M: summary shape change with a test, one memo, one SVG component shared with item 3.

**Dependencies.** Item 3, and at least six refreshes before it says anything.

**Open questions.**
1. Is "today's collection at past prices" acceptable, or is only the "as it grew" version meaningful to you?

---

## Recommended sequence

1. **Item 1, collection value.** Smallest change with the largest insight, fixes two tiles that are wrong or empty today, fixes the `legacy` outlay, and provides `marketValueAllCopies` for item 4. Pure `computeStats` work with existing test patterns.
2. **Item 2, rarity.** Also S, all data present, and it makes the M6a binder honest before the first box arrives. Independent of prices.
3. **Decide the `packs` field and log the first box (item 4 data), then build the ledger.** The function is cheap; its value depends entirely on the shipments being logged in the agreed shape from the first one.
4. **Item 3, price summary and delta chip.** Schedule it around the second refresh. Ship the summary file and the chip first (the chip needs no history), the sparkline when three points exist.
5. **Item 5, deals.** Half a day once the summary exists; pairs naturally with the next Cardmarket order.
6. **Item 6, value line.** Only after six or so refreshes; until then it is a dot.

The ordering keeps every step in `lib/` plus one component, each with a `node --test` case, and never touches the scripts until step 4.

## Not recommended

- Bundling `data/prices.json` into the client: unbounded growth, 2 MB within a year at weekly refresh, for a sparkline that needs 12 numbers per card.
- Any chart library: two polylines and a bar list cover every visual in this lane.
- Fetching tcgdex prices at runtime: breaks the "four JSON files are the source of truth" rule, adds a network dependency to a static site, and the trend only moves weekly anyway.
- Per-card gain/loss chips on master-set tiles: 111 of 165 cards are under 1 EUR; percentage moves there are noise, and the thresholds in item 3 exist to hide them.
- Pack expected value from published pull rates: no official rates for Japanese sets, and the observed `yieldNew` already answers the question with your own data.
- Condition-adjusted valuation: every card is NM; nothing to adjust until that changes.
- A spend-per-month chart: shipments span two months (2026-04 and 2026-07); the ledger in item 4 is the useful time view.
- A full "All binders" dashboard: the spec excluded it; one summary line under the tabs (item 1) is enough.
- Storing derived numbers (value, deltas) in `cards.json`: keep it the hand-editable list; the summary file is the derived artifact.
