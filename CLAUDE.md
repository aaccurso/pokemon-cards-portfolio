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
- Tests: Node 24 built-in runner (`node --test`), no test dependencies

## Data model
Four git-tracked JSON files are the single source of truth:

- **`data/binders.json`** — the binder registry. Fields: `id, name, description, kind, sort, officialCount?`.
  - `kind: "wants"` — a curated list. `buyPrice == null` means "no illustrated print chosen yet"; the "Illustration only" toggle is shown; the price refresh never prices a null card.
  - `kind: "master-set"` — every card is the target. `buyPrice` is the current Cardmarket single price (auto-filled by the refresh); the toggle is hidden; the "Saved vs target" tile becomes "Duplicates".
  - `sort` is the default sort key (`pokedexNumber` or `setNumber`). `officialCount` is the number of non-secret cards; master-set binders label every card with its slot index as printed on the card (`126/103`) in grid, table, modal, and placeholders, and the table "#" column sorts by `setNumber` there. Wants binders show the Pokedex number (`#025`).
- **`data/cards.json`** — all cards across all binders. Fields: `id, name, code, set, qty, language, condition, buyPrice, imageUrl, localImage, pokedexNumber, type1, type2, generation, variant, binderId, setNumber, category?, nameJa?, tcgdexId?, rarity?`.
  - `category` defaults to `"Pokemon"`; Trainers and Energies have `pokedexNumber: null`, `type1: null`, `generation: null`.
  - `setNumber` is the numeric part of `code`. `tcgdexId` (e.g. `SV2a-063`) is the join key for the price refresh. `nameJa` is the printed Japanese name, shown under the English name.
  - No `owned` or `pricePaid` — those are derived from purchases.
- **`data/purchases.json`** — the shipment log. `{ shipments: Shipment[] }`, each `{ id, seller, date, shipping, fees, total, product?, items[] }`, each item `{ cardId, pricePaid, condition, qty? }`.
  - `pricePaid: null` means pulled from sealed product. `qty` defaults to 1. `product` is a free label such as `"30th CELEBRATION booster box x2"`.
- **`data/prices.json`** — append-only price history keyed by card id. Each entry is a list of snapshots: `{ date, source: "manual", price }` for the pre-refresh target, and `{ date, source: "cardmarket", trend, avg7, avg30, low }` per refresh. Nothing in the UI reads it yet.

A card is "owned" if it appears in at least one purchase item. Its effective `pricePaid` is the min across priced purchases, or null when every copy was pulled. Duplicates are recorded but don't double-count in collection stats.

**Illustration cards** (wants binders only) are entries with `buyPrice != null`. The "Illustration only" toggle filters to those.

**Total outlay** per binder attributes each shipment's `total` in proportion to how many of its items (by qty) belong to that binder, so the binders' outlays sum to the global total.

## Project Structure
```
app/
  layout.tsx
  page.tsx           — renders PortfolioTracker
  print/page.tsx     — printable placeholder-card binder sheet (per binder)
  globals.css
components/
  PortfolioTracker.tsx — main dashboard (binder tabs, stats, filters, grid/table, modals)
  BinderTabs.tsx       — binder selector pills with owned / total counts
  CardTile.tsx         — grid-view 3D-tilt holo card
  CardModal.tsx        — per-card details modal
  PlaceholderCard.tsx  — per-card print sheet placeholder
lib/
  data.ts        — the ONLY module that imports the JSON files; validates them at load
  cards.ts       — Card type, typeColors, numberLabel/typeBadges display helpers
  purchases.ts   — ownership/stats derivation + CSV export (pure)
  binders.ts     — Binder type, resolveBinderId/getBinder/cardsForBinder, validateData (pure)
data/
  binders.json    — binder registry
  cards.json      — all cards
  purchases.json  — shipment log
  prices.json     — price history
scripts/
  lib/            — pure helpers (tcgdex, pricecharting, m6a, prices), unit-tested
  download_images.mjs, backfill_card_fields.mjs, build_m6a.mjs, refresh_prices.mjs
tests/            — node --test suites (*.test.ts), run with npm test
```

`lib/cards.ts`, `lib/purchases.ts`, `lib/binders.ts` must not import JSON or use the `@/` alias and may only `import type` from each other, so Node can run the tests directly.

## Source of truth rule
**The four `data/*.json` files are the only places collection data lives.** `lib/data.ts` is a thin loader — do not hand-edit card objects anywhere else. Never set `owned` or `pricePaid` on a card — those are derived.

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
node scripts/refresh_prices.mjs             # update buyPrice + append to data/prices.json
```
It fetches the Cardmarket block from tcgdex for every card with a `tcgdexId`, appends a dated snapshot (same-day reruns replace that day's snapshot), seeds a `manual` snapshot of the pre-refresh `buyPrice` on a card's first refresh, and sets `buyPrice` to the trend price. Null prices in wants binders stay null. Cards without `tcgdexId` (8 promos / odd sets) are listed as skipped and stay manual. Commit `data/cards.json` and `data/prices.json` together; paste the "top movers" into the commit body.

## Adding or updating a card image
Whenever a card is added or updated without a bundled image (e.g. a new set not on tcgdex, or a variant swap), find the PriceCharting image and download it locally — don't leave `imageUrl: null`.

1. Search or curl `pricecharting.com` for the card (e.g. `pokemon-japanese-<set-slug>/<card-slug>-<number>`). The console listing also has a JSON mode: `/console/<slug>?cursor=0&format=json` returns products with `imageUri`.
2. Grab the `https://storage.googleapis.com/images.pricecharting.com/<hash>/1600.jpg` URL and set it as the card's `imageUrl`. Set `localImage: false` so the download script picks it up.
3. Run `npm install --no-save sharp && node scripts/download_images.mjs` — it resizes to webp, writes `public/cards/{id}.webp`, and flips `localImage: true`.
4. If the card's `id` was renamed, delete the stale `public/cards/{old-id}.webp`.

## Adding a new binder
1. Add an entry to `data/binders.json`.
2. Add cards with that `binderId` to `data/cards.json` (for a full set, write a builder like `scripts/build_m6a.mjs`).
3. Download images, run `node scripts/refresh_prices.mjs`, run `npm test && npm run build`. `lib/data.ts` throws in development if any card references an unknown binder.

## Current Features
- Binder tabs (`?binder=<id>` in the URL, default `kanto-151`); switching resets filters and sort
- Progress bar and stats grid per binder: Collected, Spent on cards, Saved vs target / Duplicates, To complete, Budget / Set value (N priced), Total outlay
- Grid view with 3D tilt + holographic hover; Japanese names under English ones
- Table view with sortable columns (incl. derived `owned` and `pricePaid`)
- Search by name, code, or set name; filter by type (incl. Trainer), set, ownership
- Pokemon type badges with canonical game colors; neutral badge for Trainers
- Variant badges (ex, GX, V, VMAX, VSTAR, BREAK, LEGEND, Alolan/Galarian/Hisuian/Mega forms)
- CSV download of the active binder
- Print page (`/print?binder=<id>`) for blank placeholder cards, sorted by the binder's sort key

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
```
