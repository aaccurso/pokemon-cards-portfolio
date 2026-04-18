# Pokedex 151 full-art

## Overview
Next.js 15 (App Router, TypeScript) web app to track a 151-card Japanese Pokemon TCG wants list (full-art / alt-art prints of each original Kanto Pokemon), sourced from Cardmarket.

## Tech Stack
- Next.js 15 with App Router + Server Actions (for writing `data/purchases.json`)
- TypeScript (`resolveJsonModule` for JSON imports)
- React 19
- No external UI libraries — plain CSS with dark theme and Pokemon type colors

## Data model
Two git-tracked JSON files are the single source of truth:

- **`data/cards.json`** — the wants list. One entry per card. Fields: `id, name, code, set, qty, language, condition, buyPrice, imageUrl, pokedexNumber, type1, type2, generation, variant, binderId`. No `owned` or `pricePaid` — those are derived from purchases.
- **`data/purchases.json`** — the shipment log. `{ shipments: Shipment[] }` where each shipment has `id, seller, date, shipping, fees, total, items[]` and each item is `{ cardId, pricePaid, condition }`.

A card is "owned" if it appears in at least one purchase item. Its effective `pricePaid` is the min across purchases (best deal captured). Duplicates are recorded but don't double-count in collection stats.

`binderId` defaults to `"kanto-151"`. A binder selector is planned but not yet implemented — the field is present so future binders don't force a migration.

## Project Structure
```
app/
  actions/
    shipments.ts     — server action: append shipments to data/purchases.json
  layout.tsx
  page.tsx           — renders PortfolioTracker
  print/page.tsx     — printable placeholder-card binder sheet
  globals.css
components/
  PortfolioTracker.tsx — main dashboard (stats, filters, grid/table, modals)
  CardTile.tsx         — grid-view 3D-tilt holo card
  CardModal.tsx        — per-card details modal
  ImportShipmentModal.tsx — paste Cardmarket email → preview → save
  PlaceholderCard.tsx  — per-card print sheet placeholder
lib/
  cards.ts                     — Card type + typeColors + JSON loader
  purchases.ts                 — ownership/stats derivation + CSV export
  parseCardmarketShipment.ts   — shipment-email parser + card matcher
data/
  cards.json      — canonical wants list
  purchases.json  — shipment log
```

## Source of truth rule
**`data/cards.json` and `data/purchases.json` are the only places collection data lives.** `lib/cards.ts` is a thin wrapper — do not hand-edit card objects anywhere else. New shipments should be added via the in-app Import Shipment modal (which writes to `purchases.json` via a server action) OR by editing `data/purchases.json` directly. Never set `owned` or `pricePaid` on a card — those are derived.

The old `data/wishlist.csv` has been retired. Portfolio can be exported as CSV at runtime via the "↓ CSV" button in the UI.

## Current Features
- Progress bar showing collection completion percentage
- Stats grid: Collected, Spent on cards, Saved vs target, To complete, Budget (N priced), Total outlay
- Grid view with 3D tilt + holographic hover
- Table view with sortable columns (incl. derived `owned` and `pricePaid`)
- Search by name, code, or set name
- Filter by Pokemon type, card set, or ownership status
- Pokemon type badges with canonical game colors
- Variant badges (ex, GX, VMAX, Alolan/Galarian/Hisuian/Mega forms)
- Import Shipment modal: parses Cardmarket emails, fuzzy-matches to cards, flags unmatched items and duplicate purchases, saves to `purchases.json`
- CSV download of current portfolio state
- Print page (`/print`) for blank placeholder cards to slot into binder pages

## Known Limitations / Planned Work
- **Binder selector** — `binderId` is on every card but there's no UI yet to switch between binders.
- **Market-price refresh** — `buyPrice` is a frozen snapshot; refresh is manual (ask Claude to update it).
- **Deployed on Vercel.** The repo auto-deploys `main` to a Vercel URL. **Caveat:** the import-shipment server action writes to `data/purchases.json`, which requires a writable filesystem — this only works in local dev. On the deployed site the Import Shipment button will throw at runtime until ownership state is moved to a real backend (Vercel KV / Upstash / Supabase) or browser `localStorage`.
- **No tests yet** — stats math and parser are the obvious first candidates.

## Commands
```bash
npm run dev    # Start dev server on localhost:3000
npm run build  # Production build
npm start      # Serve production build
```
