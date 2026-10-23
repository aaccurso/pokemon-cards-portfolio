# Multi-binder support, 30th CELEBRATION (M6a) binder, and price refresh

Date: 2026-10-23
Status: approved in conversation, pending written review

## Goal

Add a second physical binder to the tracker: the Japanese **30th CELEBRATION**
expansion (set code M6a, released 2026-09-16), collected as a full master set
(cards 001 to 165) by opening booster packs. Give the dashboard and the print
page a binder selector so each binder is viewed, counted, and printed on its
own. Along the way, make market-price refresh a script instead of a manual
edit, and keep every past price so history can be visualized later.

### What the user said

- Track the full M6a master set in a new binder.
- Printable placeholders for the new binder, using the existing browser
  print / save-as-PDF flow. No generated PDF file, no new PDF dependency.
- Most M6a cards will be pulled from booster packs, so they will not have a
  per-card purchase price.
- Refresh prices for the existing binder, but keep previous prices for a
  future history visualization. The visualization itself is out of scope.

### Assumptions made

- M6a scope is the 165 numbered cards. The three letter-coded Mew promos
  (B, G, R) and the eight basic energies on tcgdex are deck and Card Set
  inserts and are excluded.
- The three existing non-Kanto binder ids in `data/cards.json`
  (`kanto-151`, `kanto-evolutions`, `eeveelutions`) become real binders in the
  registry rather than being merged.
- Default binder is `kanto-151`. There is no "All binders" view.
- Cardmarket **trend** is the price adopted as `buyPrice` on refresh.

### Success criteria

- Switching binder in the dashboard changes title, stats, filters, grid,
  table, CSV export, and the URL. Reloading the URL restores the binder.
- `/print?binder=m6a-30th` prints 165 placeholders in set order over 19
  sheets plus the calibration page, with the same card dimensions as today.
- Logging a booster-box shipment with pulled cards marks them owned without
  inventing a per-card price, and the Kanto stats are unaffected.
- `node scripts/refresh_prices.mjs` updates `buyPrice` for every mappable card
  and `data/prices.json` holds both the pre-refresh value and the new snapshot.
- `npm test` runs and passes with no new runtime dependency.

## Current state (for context)

- 156 cards in `data/cards.json`: 152 `kanto-151`, 1 `kanto-evolutions`,
  3 `eeveelutions`. Every view ignores `binderId`.
- Dashboard state already lives in URL search params
  (`components/PortfolioTracker.tsx`), so a `binder` param fits the pattern.
- `computeStats` runs over all cards; total outlay sums every shipment.
  31 shipments, 2 of which contain cards from two binders.
- tcgdex (`api.tcgdex.net/v2/ja`) has all 165 M6a cards with category,
  Pokédex ids, types, rarity, and a Cardmarket pricing block, but **no
  images** and **Japanese names only**. 148 of the 156 existing cards map to a
  tcgdex id by parsing `code`; the 8 that do not are promos and odd sets.
- PriceCharting (`pricecharting.com/console/pokemon-japanese-30th-celebration`)
  lists the set with English slugs that end in the card number, and image
  URLs, matching the existing CLAUDE.md image rule.

## Design

### 1. Data model

#### `data/binders.json` (new)

Array of binder entries:

```json
[
  {
    "id": "kanto-151",
    "name": "Pokedex 151 full-art",
    "description": "One full-art or alt-art print of each original Kanto Pokemon",
    "kind": "wants",
    "sort": "pokedexNumber"
  },
  { "id": "kanto-evolutions", "name": "Kanto evolutions", "description": "Later-generation evolutions of Kanto Pokemon", "kind": "wants", "sort": "pokedexNumber" },
  { "id": "eeveelutions", "name": "Eeveelutions", "description": "Eevee and its evolutions", "kind": "wants", "sort": "pokedexNumber" },
  { "id": "m6a-30th", "name": "30th CELEBRATION", "description": "Full master set of the Japanese 30th anniversary expansion (M6a), cards 001 to 165", "kind": "master-set", "sort": "setNumber", "officialCount": 103 }
]
```

`officialCount` is optional and only used for the `No. 101 / 103` display on
cards without a Pokedex number.

`kind` controls exactly two behaviours:

- `wants`: the "Illustration only" toggle is shown; `buyPrice == null` means
  "no illustrated print chosen yet" and the refresh script never sets it.
- `master-set`: the toggle is hidden; every card gets a `buyPrice` from the
  refresh script, meaning "current single price", not a target.

`sort` is the default sort key for the dashboard and the print page.

#### `Card` changes (`lib/cards.ts`), all additive

| Field | Type | Notes |
|---|---|---|
| `category` | `"Pokemon" \| "Trainer" \| "Energy"` | Optional in JSON, defaults to `"Pokemon"` when absent. |
| `pokedexNumber` | `number \| null` | Null for Trainers and Energies. |
| `type1` | `string \| null` | Null for Trainers and Energies. |
| `setNumber` | `number` | Numeric part of `code`. Backfilled for all cards. |
| `nameJa` | `string?` | Printed Japanese name. Filled for M6a only. |
| `tcgdexId` | `string?` | e.g. `SV2a-063`. Join key for price refresh. Absent for the 8 unmappable cards. |
| `rarity` | `string?` | tcgdex rarity label, e.g. `Classic Collection`. Filled for M6a only. |

M6a card ids follow `m6a-<number>-<slug>`, e.g. `m6a-126-pikachu-ex`, because
the set repeats names (two Pikachu ex, two Mewtwo ex, two Mew ex).

#### Purchase changes (`lib/purchases.ts`), all additive

| Field | Type | Notes |
|---|---|---|
| `PurchaseItem.pricePaid` | `number \| null` | Null means pulled from sealed product. |
| `PurchaseItem.qty` | `number?` | Default 1. Duplicate count uses it. |
| `Shipment.product` | `string?` | Free label, e.g. `"30th CELEBRATION booster box x2"`. |

A booster-pull shipment looks like:

```json
{
  "id": "2026-10-30-m6a-booster-box",
  "seller": "Pokemon Center Online",
  "product": "30th CELEBRATION booster box x2",
  "date": "2026-10-30",
  "shipping": 0, "fees": 0, "total": 120.00,
  "items": [
    { "cardId": "m6a-001-exeggcute", "pricePaid": null, "condition": "NM", "qty": 3 }
  ]
}
```

#### `data/prices.json` (new)

Object keyed by card id. Each value is an append-only list of snapshots,
oldest first:

```json
{
  "pikachu": [
    { "date": "2026-10-23", "source": "manual", "price": 32.00 },
    { "date": "2026-10-23", "source": "cardmarket", "trend": 30.45, "avg7": 27.99, "avg30": 31.49, "low": 16.00 }
  ]
}
```

The first refresh seeds a `manual` snapshot from the current `buyPrice`.
`buyPrice` on the card remains the single value the UI reads. Nothing in the
UI reads this file yet.

### 2. Binder scoping, stats, and UI

#### `lib/binders.ts` (new)

- Loads `data/binders.json`, exports `binders`, `DEFAULT_BINDER_ID`,
  `getBinder(id)`, `cardsForBinder(id)`, `resolveBinderId(param)`.
- `resolveBinderId` returns the default for an unknown or missing param.
- A pure `validateData(cards, purchases, binders)` returns a list of problems:
  cards whose `binderId` is not in the registry and purchase items whose
  `cardId` matches no card. `lib/data.ts` calls it once at module load,
  throws in development, and logs in production.

#### Active binder in the dashboard

- Read from the `binder` search param, default `kanto-151`, written back by
  the existing replace-URL effect (omitted when default).
- Switching binders resets search, type filter, set filter, ownership filter,
  illustration toggle, sort key to the binder default, and closes the modal.
- The modal card lookup uses the active binder's cards.

#### Selector

A tab strip above the header, one pill per binder showing the name and
`owned / total`. Active pill highlighted. Same strip in the print page's
no-print controls. No "All binders" option.

#### Stats (`computeStats(binderCards, purchaseData, binderId)`)

- **Collected / progress**: unchanged, over the binder's cards.
- **Spent on cards**: sum of `pricePaid` for owned cards in the binder, over
  the best (min) priced purchase; items with null price are skipped.
- **Total outlay**: each shipment's `total` is attributed to binders in
  proportion to item qty. A shipment with 9 M6a items and 3 Kanto items
  gives 75% of its total to M6a. Sums across binders equal the global total.
- **Budget / Set value (N priced)**: sum of `buyPrice` over priced cards.
- **To complete / To complete as singles**: sum of `buyPrice` over priced
  cards not owned.
- **Saved vs target** (`wants` only): sum of `buyPrice - pricePaid` over owned
  cards with both values.
- **Duplicates** (`master-set` only): sum of `(qty - 1)` per owned card across
  purchases, replacing the Saved tile.
- Labels are chosen from `binder.kind`. Header title and tagline come from
  the binder's `name` and `description`.

#### Filters and display

- "Illustration only" renders only for `wants` binders.
- Type filter gains a `Trainer` entry matching `category === "Trainer"`.
- Set filter unchanged.
- Tiles, table rows, modal, and placeholder cards show `nameJa` under the
  English name when present.
- Cards with null `pokedexNumber` show `No. 101 / 103` (set number over
  official count) in the dex slot; the official count comes from the max
  `setNumber` among non-secret cards, hard-coded per binder as
  `officialCount` in the registry for M6a (103).
- Trainers show one neutral gray badge reading `Trainer` instead of type
  badges.
- Default sort is `binder.sort`; the table still allows sorting by any column.

#### CSV export

Exports the active binder only. New columns: Category, Set Number, Japanese
Name, Rarity, Qty Owned. Filename includes the binder id.

### 3. Scripts and data build

All under `scripts/`, plain Node ESM like the existing scripts, idempotent,
never run at build time. Pure helpers live in `scripts/lib/` so they can be
unit-tested.

#### `build_m6a.mjs` (one-off)

1. Fetch `api.tcgdex.net/v2/ja/sets/M6a`, keep numeric `localId`s 001 to 165,
   fetch each card.
2. Fetch the PriceCharting set listing, collect `(slug, number, imageUrl)`
   triples. Match to tcgdex cards by number.
3. Build card entries: `name` from the slug (title-cased; a 5-entry hand table
   covers the Trainers: Ultra Ball, Poke Pad, Switch, Misty, N), `nameJa`,
   `pokedexNumber` (first dex id for two-Pokemon cards), `type1`/`type2`,
   `variant` from suffix (ex, GX, V, VMAX, VSTAR, BREAK, EX, LEGEND),
   `rarity`, `category`, `set: "30th CELEBRATION"`, `code: "M6a 126"`,
   `setNumber`, `tcgdexId`, `language: "Japanese"`, `condition: "NM"`,
   `qty: 1`, `buyPrice: null`, `generation` derived from dex number,
   `binderId: "m6a-30th"`, `imageUrl` from PriceCharting or null,
   `localImage: false`.
4. Append to `data/cards.json` (skipping ids already present) and write once.
5. Print the cards with no image so they are filled by hand per CLAUDE.md,
   then `download_images.mjs` runs as today.

#### `backfill_card_fields.mjs` (one-off)

Adds `setNumber`, `category: "Pokemon"`, and `tcgdexId` to the existing 156
cards by parsing `code` against the tcgdex `ja` set list (case-insensitive
set id match). Prints the codes it could not map.

#### `refresh_prices.mjs` (recurring)

- For every card with `tcgdexId`, fetch the Cardmarket block.
- Seed a `manual` snapshot of the current `buyPrice` on first run for that
  card (when the card has no history yet and `buyPrice != null`).
- Append a `cardmarket` snapshot (`trend`, `avg7`, `avg30`, `low`); a rerun
  on the same date replaces that date's cardmarket snapshot.
- Set `buyPrice = round(trend, 2)` except when the binder is `wants` and
  `buyPrice == null`.
- Skip and list cards without `tcgdexId` or without pricing.
- `--dry-run` prints the diff without writing. Output ends with the ten
  largest absolute movers.
- Builds both JSON files in memory and writes once at the end.

#### CLAUDE.md updates

Binder registry and `kind` semantics, new card and purchase fields, how to
log a booster-pull shipment, when and how to run `refresh_prices.mjs`, and
`npm test`.

### 4. Print page, error handling, testing

#### Print page (`app/print/page.tsx`)

- Binder strip in the no-print controls; reads the `binder` param.
- Sheets sorted by `binder.sort`.
- `PlaceholderCard` shows `nameJa` and the `No. 101 / 103` slot for Trainers.
- Hint line reports the per-binder count and sheet total.
- Calibration sheet, card dimensions, CSS, and print instructions unchanged.

#### Error handling

- Unknown `binder` param falls back to the default and rewrites the URL.
- Registry validation at module load (see `lib/binders.ts`).
- Scripts write nothing on failure (single write at the end).

#### Testing

Node 24 is installed and strips TypeScript types natively, so tests are
`.ts` files under `tests/` run by `node --test tests/`, wired to `npm test`.
No new dependency. Two constraints follow and are part of the design:

- Logic modules must not import JSON or use the `@/` alias, because Node
  cannot resolve either. JSON loading moves into a single new `lib/data.ts`
  that imports `data/cards.json`, `data/purchases.json`, `data/binders.json`
  and exports `cards`, `purchases`, `binders`. `lib/cards.ts`,
  `lib/purchases.ts`, and `lib/binders.ts` keep only types and pure functions
  that take data as parameters. Components and pages import data from
  `lib/data.ts` and functions from the logic modules.
- Cross-module imports inside `lib/` are `import type` only, so they are
  erased at runtime and no `.ts` extension question arises.
- `scripts/lib/` helpers are plain `.mjs` and are imported directly.

Coverage:

- `lib/purchases.ts`: ownership map with null prices and qty; outlay
  attribution for a pure and a mixed shipment; stat formulas for both kinds;
  CSV escaping.
- `lib/binders.ts`: default binder, unknown id fallback, registry validation.
- `scripts/lib/`: code to tcgdex id parsing across the 8 known odd formats;
  PriceCharting slug to name; variant detection; same-day snapshot
  replacement.
- No component tests. UI verified manually in both binders across grid,
  table, and print views.

## Out of scope

- Price history visualization (data is captured for it).
- An "All binders" view.
- Scheduled refresh (Vercel cron).
- The nine starter-trio Card Sets, the letter-coded Mew promos, and the
  basic energies.
- Any PDF generation beyond the browser print flow.
