# Pokemon card binders

## Overview
Next.js 15 (App Router, TypeScript) web app to track several Japanese Pokemon TCG binders. Each binder is its own collection with its own stats, grid/table, CSV export, and printable placeholder sheet:

- **Pokedex 151 full-art** (`kanto-151`) — the original wants list: one full-art / alt-art print of each Kanto Pokemon, sourced from Cardmarket.
- **Kanto evolutions** (`kanto-evolutions`) and **Eeveelutions** (`eeveelutions`) — small curated side lists.
- **30th CELEBRATION** (`m6a-30th`) — the full master set of the Japanese 30th anniversary expansion (M6a, cards 001–165), collected by opening booster packs.

## Tech Stack
- Next.js 15 with App Router
- TypeScript (`resolveJsonModule` for JSON imports, `allowImportingTsExtensions` for the tests)
- React 19
- No external UI libraries — plain CSS with dark theme and Pokemon type colors
- Theme: a neutral dark ground (`--bg #141416`, `--surface #1d1d21`, tokens in `:root` of `app/globals.css`) so the card art is the colour on the page. The accent (`--accent #f8d030`) is spent on three things only: the active binder tab, the one primary action on a screen (`.action-button.primary`, "Buy as singles", the modal's `.modal-buy` "Open on Cardmarket" button) and the progress fill; keyboard focus rings also use it. Everything else, including the h1, stat values and hover states, is ink (`--text`), and text on an accent fill uses `--accent-ink`. `tests/accent.test.ts` fails if a new rule uses the accent (the token, the hex or a literal `rgba(248, 208, 48, ...)` tint) outside that allowlist; tile hover, table name-cell hover and the modal alt-image notice are neutral. `app/opengraph-image.tsx` hard-codes the same ground and surface; change both together.
- Tests: Node 24 built-in runner (`node --test`), no test dependencies

## Data model
Five git-tracked JSON files are the single source of truth:

- **`data/binders.json`** — the binder registry. Fields: `id, name, description, kind, sort, officialCount?`.
  - `kind: "wants"` — a curated list. `buyPrice == null` means "no illustrated print chosen yet"; the "Illustration only" toggle is shown; the price refresh never prices a null card.
  - `kind: "master-set"` — every card is the target. `buyPrice` is the current Cardmarket single price (auto-filled by the refresh); the toggle is hidden; the "Spent on cards" and "Value" tiles become "Pulled value" and "Duplicates".
  - `sort` is the default sort key (`pokedexNumber` or `setNumber`). `officialCount` is the number of non-secret cards; master-set binders label every card with its slot index as printed on the card (`126/103`) in grid, table, modal, and placeholders, and the table "#" column sorts by `setNumber` there. Wants binders show the Pokedex number (`#025`).
- **`data/cards.json`** — all cards across all binders. Fields: `id, name, code, set, qty, language, condition, buyPrice, imageUrl, localImage, pokedexNumber, type1, type2, generation, variant, binderId, setNumber, category?, nameJa?, tcgdexId?, rarity?`.
  - `category` defaults to `"Pokemon"`; Trainers and Energies have `pokedexNumber: null`, `type1: null`, `generation: null`.
  - `setNumber` is the numeric part of `code`. `tcgdexId` (e.g. `SV2a-063`) is the join key for the price refresh. `nameJa` is the printed Japanese name, shown under the English name.
  - No `owned` or `pricePaid` — those are derived from purchases.
- **`data/purchases.json`** — the shipment log. `{ shipments: Shipment[] }`, each `{ id, seller, date, shipping, fees, total, product?, items[] }`, each item `{ cardId, pricePaid, condition, qty? }`.
  - `pricePaid: null` means pulled from sealed product. `qty` defaults to 1. `product` is a free label such as `"30th CELEBRATION booster box x2"`.
- **`data/prices.json`** — append-only price history keyed by card id. Each entry is a list of snapshots: `{ date, source: "manual", price }` for the pre-refresh target, and `{ date, source: "cardmarket", trend, avg7, avg30, low }` per refresh. Nothing in the UI reads it yet. On disk it is stored one snapshot per line (`formatPrices` in `scripts/lib/prices.mjs`) so a refresh diff is an append per card; `tests/data.test.ts` fails if the file drifts from that format, so after a hand edit rerun the formatter rather than `JSON.stringify`.
- **`data/meta.json`** — `{ "pricesRefreshed": "YYYY-MM-DD" }`, the date of the last Cardmarket refresh. Written by `scripts/refresh_prices.mjs` in the same atomic write as the other two files; the only freshness file the UI imports (`prices.json` never is). Shown as "Prices refreshed 29 Oct 2026" beside the progress bar. `tests/data.test.ts` fails if it differs from the newest cardmarket snapshot date in `prices.json`, and `lib/data.ts` throws on a malformed date.

A card is "owned" if it appears in at least one purchase item. Its effective `pricePaid` is the min across priced purchases, or null when every copy was pulled. Duplicates are recorded but don't double-count in collection stats.

**Illustration cards** (wants binders only) are entries with `buyPrice != null`. The "Illustration only" toggle filters to those.

**Total outlay** per binder attributes each shipment's `total` in proportion to how many of its items (by qty) belong to that binder, so the binders' outlays sum to the global total. Every shipment must have a `total` (a test enforces it); the `legacy` shipment's is the sum of its item prices.

**Collection value** (`marketValue`, `marketValueAllCopies`, `unpricedOwned` in `computeStats`) is the Cardmarket trend (`buyPrice`) summed over owned priced cards, once per card or once per copy. Gain vs paid (`marketValue - spentOnCards`) is derived in the component, not stored. Value / outlay (`valueVsOutlayPct`) always uses `marketValueAllCopies`, on every binder kind and on the "All binders" line, because outlay already paid for the duplicate copies. `savings` is the pre-value figure and is kept for one release.

## Project Structure
```
app/
  layout.tsx
  page.tsx           — renders PortfolioTracker
  print/page.tsx     — printable placeholder-card binder sheet (per binder)
  needed/page.tsx    — pocket needed list (number grid, copy as text, one-sheet print)
  globals.css
components/
  PortfolioTracker.tsx — main dashboard: URL-backed state, derived data, composition of the parts below
  BinderTabs.tsx       — binder selector pills with owned / total counts
  StatsStrip.tsx       — collection summary: two lead figures plus two "what is left / where the money went" lines (props: stats, kind, onBuySingles?)
  FilterBar.tsx        — search, type/set/ownership selects, illustration toggle, view toggle, Share, and the Tools row (Needed list, Placeholder sheets, CSV, Trade list); exports the Filters type
  CardTable.tsx        — table view with sortable headers and hover preview
  CardTile.tsx         — grid-view 3D-tilt holo card
  CardModal.tsx        — per-card details modal
  PlaceholderCard.tsx  — per-card print sheet placeholder
lib/
  data.ts        — the ONLY module that imports the JSON files; validates them at load
  cards.ts       — Card type, typeColors, numberLabel/typeBadges/rarityLabel/tileRarity display helpers
  purchases.ts   — ownership/stats derivation + CSV export (pure)
  needed.ts      — needed-list blocks, labels and text export (pure)
  shortlist.ts   - Cardmarket search URL and the "Open on Cardmarket · <price>" button label for the card modal (pure)
  binders.ts     — Binder type, resolveBinderId/getBinder/cardsForBinder, validateData (pure)
  sort.ts        — SortKey/SortDir, SORT_KEYS + isSortKey (validates ?sort=), getSortValue, compareBySort nulls-last comparator (pure)
  tableColumns.ts — tableColumns(binderCards, binder): the table's column list per binder (Set only across several sets, Rarity only when present; no Language or Variant) (pure)
  format.ts      — fmtEur, the one place prices are formatted for display (pure)
  filters.ts     — activeFilterCount for the phone "Filters" disclosure badge (pure)
  tabStrip.ts    — activeTabScrollLeft / tabStripFade geometry for the phone tab strip (pure)
  meta.ts        — Meta type, latestCardmarketDate, fmtRefreshed ("29 Oct 2026"), metaProblems (pure)
data/
  binders.json    — binder registry
  cards.json      — all cards
  purchases.json  — shipment log
  prices.json     — price history
  meta.json       — date of the last price refresh
scripts/
  lib/            — helpers (tcgdex, pricecharting, m6a, prices; atomic = tmp + rename writer), unit-tested
  download_images.mjs, backfill_card_fields.mjs, build_m6a.mjs, refresh_prices.mjs
tests/            — node --test suites (*.test.ts), run with npm test
```

`lib/cards.ts`, `lib/purchases.ts`, `lib/binders.ts`, `lib/sort.ts`, `lib/tableColumns.ts`, `lib/format.ts`, `lib/needed.ts`, `lib/print.ts`, `lib/shortlist.ts`, `lib/filters.ts`, `lib/tabStrip.ts`, `lib/meta.ts` must not import JSON or use the `@/` alias, so Node can run the tests directly. Imports between them use a relative path with an explicit `.ts` extension (`import { rarityOrder } from "./cards.ts"`), which both Node and the Next bundler resolve; keep the graph acyclic (`cards.ts` imports nothing from the others).

## Source of truth rule
**The five `data/*.json` files are the only places collection data lives.** `lib/data.ts` is a thin loader — do not hand-edit card objects anywhere else. Never set `owned` or `pricePaid` on a card — those are derived.

**Logging a Cardmarket shipment:** paste the email into Claude and ask it to append to `data/purchases.json`.

**Logging a booster-box / pack opening:** one shipment per purchase with `product` set, `total` = what the sealed product cost, and one item per distinct card pulled with `pricePaid: null` and `qty`:

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

The old `data/wishlist.csv` has been retired. The active binder can be exported as CSV at runtime via the "↓ CSV" button.

## Refreshing prices
```bash
node scripts/refresh_prices.mjs --dry-run   # list what would change
node scripts/refresh_prices.mjs             # update buyPrice + append to data/prices.json + stamp data/meta.json
```
It fetches the Cardmarket block from tcgdex for every card with a `tcgdexId`, appends a dated snapshot (same-day reruns replace that day's snapshot), seeds a `manual` snapshot of the pre-refresh `buyPrice` on a card's first refresh, sets `buyPrice` to the trend price, and writes today's date to `data/meta.json`. Null prices in wants binders stay null. Cards without `tcgdexId` (8 promos / odd sets) are listed as skipped and stay manual. Commit `data/cards.json`, `data/prices.json` and `data/meta.json` together; `--summary FILE` writes the commit message (title plus top movers, `summaryMessage` in `scripts/lib/prices.mjs`) so `git commit -F FILE` does it.

**Scheduled refresh.** `.github/workflows/refresh-prices.yml` runs the script every Monday 06:17 UTC (and on demand from the Actions tab), runs `npm test` on the result, and pushes the three data files straight to `main` as `github-actions[bot]`. That push deploys on Vercel but does not trigger `ci.yml` (GitHub blocks recursive workflow runs), which is why the tests run inside the Action. Guardrails (`guardrailViolations`): the script exits 2 and writes nothing when any card priced at 1 EUR or more moves over 5x either way, or when more than 60% of the refreshed cards change; a failed run shows up as a red Action, and the fix is to look, then rerun locally with `--force`. tcgdex 429 and 5xx responses are retried with 1 s / 4 s / 16 s backoff (`scripts/lib/retry.mjs`). Pull `main` before committing by hand on a Monday morning.

## Adding or updating a card image
Whenever a card is added or updated without a bundled image (e.g. a new set not on tcgdex, or a variant swap), find the PriceCharting image and download it locally — don't leave `imageUrl: null`.

1. Search or curl `pricecharting.com` for the card (e.g. `pokemon-japanese-<set-slug>/<card-slug>-<number>`). The console listing also has a JSON mode: `/console/<slug>?cursor=0&format=json` returns products with `imageUri`.
2. Grab the `https://storage.googleapis.com/images.pricecharting.com/<hash>/1600.jpg` URL and set it as the card's `imageUrl`. Set `localImage: false` so the download script picks it up.
3. Run `npm install --no-save sharp && node scripts/download_images.mjs` — it resizes to webp, writes `public/cards/{id}.webp`, and flips `localImage: true`.
4. If the card's `id` was renamed, delete the stale `public/cards/{old-id}.webp`.

## Adding a new binder
1. Add an entry to `data/binders.json`.
2. Add cards with that `binderId` to `data/cards.json` (for a full set, write a builder like `scripts/build_m6a.mjs`).
3. Download images, run `node scripts/refresh_prices.mjs`, run `npm test && npm run build`. `lib/data.ts` throws in every environment (so `next build` fails) if `validateData` finds a problem: unknown or duplicate binder, card or shipment ids, a master-set binder without `officialCount`, an empty shipment, a null `total`, `qty < 1`, or a negative `pricePaid`.

## Data validation gate
`validateData` in `lib/binders.ts` is the single checker. It runs in three places: `lib/data.ts` throws at module load (fails the build), `tests/data.test.ts` runs it on the real JSON, and the tracked `.githooks/pre-commit` runs that test before every commit (`git commit --no-verify` skips it once). `npm install` / `npm ci` enables the hook through the `prepare` script; after a fresh clone with no install, run `git config core.hooksPath .githooks`. Every shipment needs a numeric `total`; when shipping is unknown, use the sum of item prices.

## Current Features
- Binder tabs (`?binder=<id>` in the URL, default `kanto-151`); switching resets filters and sort
- "Prices refreshed 29 Oct 2026" stamp beside the progress label, from `data/meta.json` (`fmtRefreshed` in `lib/meta.ts`); wraps under the bar on phones
- Tools row under the controls: Needed list (`/needed`), Placeholder sheets (`/print`, via `printHref`), CSV, Trade list (shown only with extra copies); quiet text links, moved below the results on phones together with the Share button
- Progress bar and a stats strip per binder. Two lead figures: cards collected with percent, and either the owned share of set value (master set, `setValuePct`) or worth vs paid (wants). Then two lines: what is left (`31 to go · 374,74 € as singles · 11 over 10 € = … · 20 under 10 € = …` with the "Buy as singles" link on master sets; `69 to go · 66 prints still to choose · 3 chosen, 109,04 € to buy` on wants binders; `Complete` when nothing is wanted) and where the money went (outlay, then pulled value and duplicates, or cards plus shipping and fees). Zero figures are hidden, values are ink not accent, nothing is red. The 10 € band boundary is `SINGLES_BAND_EUR` in `lib/purchases.ts`
- One "All binders" line under the tabs: market value of everything owned vs the sum of all shipment totals
- Grid view with 3D tilt + holographic hover; Japanese names under English ones
- Table view with sortable columns (incl. derived `owned` and `pricePaid`). Columns come from `tableColumns` in `lib/tableColumns.ts`: Own, #, Name, Type, Rarity (when any card has one), Code, Set (only when the binder spans several sets), Buy price, Paid; no Language or Variant column (CSV export still has every field). Headers are sentence case; every sortable header is a button with `aria-sort` and a visible glyph (direction when active, a muted two-way arrow otherwise). Below 768px rows render as two lines (own, number, name, buy price; then type, rarity, code, set, paid as a muted metadata line) and the header becomes a "Sort by" chip row. The smoke test checks the rendered header list against `tableColumns`.
- Search by name, code, or set name; filter by type (incl. Trainer), set, ownership (All, Owned, Wanted, Duplicates; `own=dupes` in the URL)
- Rarity filter (`?rarity=<tcgdex label>`), shown whenever a card in the binder has `rarity`; master-set binders also get a clickable per-rarity completion breakdown under the progress bar and a value-weighted progress figure in the header (`rarityBreakdown` in `lib/purchases.ts`, display order and labels in `rarityOrder` in `lib/cards.ts`)
- Rarity chip: a small neutral outlined chip (`.rarity-chip`) beside the number label, showing the short `rarityOrder` label (SAR, AR, RR, Classic). The modal shows it for every card with a `rarity`; the grid tile skips Common / Uncommon (`tileRarity` in `lib/cards.ts`) so the chip only marks the prints that carry the price. Type badges are unchanged
- Duplicates: `xN` copies badge beside the Pokeball (grid and table), and a "Trade list" export beside CSV (copy text or download CSV via `buildTradeList` in `lib/purchases.ts`), shown only when the binder has extra copies
- Pokemon type badges with canonical game colors; neutral badge for Trainers. `typeBadges` in `lib/cards.ts` also returns the text `ink`, decided by the fill's relative luminance (`badgeInk`, threshold `BADGE_INK_LUMINANCE` 0.35): dark on the light fills (Electric, Ice, Ground, Steel, Grass, Fairy, Bug, Normal, Rock), white elsewhere, no text-shadow. The print placeholder badge keeps its own rules. The Grid/Table view toggle's selected button is inverted (`--text` fill, `--bg` text) so it cannot be confused with the neutral hover lift on its neighbour
- Variant badges (ex, GX, V, VMAX, VSTAR, BREAK, LEGEND, Alolan/Galarian/Hisuian/Mega forms)
- CSV download of the active binder
- Finish-as-singles shortlist: "Buy as singles" on the master-set "to go" line of the stats strip (wanted, table, buyPrice desc), "Copy as text" when the Wanted filter is on (`Need (N): 003 007 ...`, Pokedex number + name for wants binders), Cardmarket search in the card modal
- Card modal as a buying surface: on a wanted card with a chosen print (`buyPrice != null`) the one filled button is "Open on Cardmarket · <trend price>" (`cardmarketButtonLabel` in `lib/shortlist.ts`), the details list leads with Status, Trend price and Paid, owned cards and wants-binder cards with no print chosen yet keep the quiet Cardmarket link in the Code row instead of the button (their code is a default regular print, not a buying target), and on phones the card image is capped at 45dvh so the facts sit on the first screen. Price history from `data/prices.json` is still not shown (the UI does not load it)
- Phone first screen (max-width 768px): 22px left-aligned title with the description hidden, a compact stats strip, rarity completion as wrapping chips (no bars), and one row of controls (search, a "Filters" disclosure that reveals the selects and shows how many are set, the view toggle) so the first card tile starts above 500px on a 390px phone. The tab strip fades only the edge that still hides tabs (`data-fade` from `tabStripFade`). Desktop markup and layout are unchanged: the disclosure button is hidden and its panel is `display: contents`. `tests/phone-first-screen.test.ts` pins the rules.
- Print page (`/print?binder=<id>`) for blank placeholder cards, sorted by the binder's sort key; `&ink=1` is the ink saver (no card photo, outlined badges and watermark, same geometry)
- Needed list (`/needed?binder=<id>`): one-screen or one-A4 view of the missing numbers (master sets as a 001 to 165 grid with secrets in their own block, wants binders as `#025 Pikachu` rows), owned cells dimmed, plus a "Copy as text" button that emits `Need (62): 003 007 ...` for seller chats

## Known Limitations / Planned Work
- **Price history is captured but not visualized** — `data/prices.json` is write-only for now.
- **No "All binders" view** — each binder is its own collection.
- **Price refresh is manual** — run the script; no scheduled job.
- **Deployed on Vercel.** The repo auto-deploys `main` to a Vercel URL.

## Commands
```bash
npm run dev    # Start dev server on localhost:3000
npm test       # Run unit tests (node --test)
npm run build  # Production build
npm start      # Serve production build
npm run smoke  # Headless Chrome DOM checks on the real pages (see below)
git config core.hooksPath .githooks  # Enable the pre-commit data gate (npm install does this too)
```

`npm run smoke` renders every binder, the table view, the finish-as-singles shortlist (wanted, table, buyPrice desc), the card modal, the rarity-filtered master-set view (breakdown rows, active row, filtered count), and the print pages in headless Chrome and asserts on the DOM (h1, counts, tabs, no `undefined`/`NaN`). Expectations come from `data/*.json`. It starts `next start` on `SMOKE_PORT` (default 3000; needs a prior `npm run build`, otherwise falls back to `next dev`), or reuses a running server when `SMOKE_URL` is set. Without Chrome it prints SKIP and exits 0; CI passes `--require-chrome`. Helpers live in `scripts/lib/smoke.mjs` and are unit-tested.
