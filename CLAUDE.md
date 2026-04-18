# Pokedex 151 full-art

## Overview
Next.js 15 (App Router, TypeScript) web app to track a 151-card Japanese Pokemon TCG wants list (full-art / alt-art prints of each original Kanto Pokemon), sourced from Cardmarket.

## Tech Stack
- Next.js 15 with App Router
- TypeScript
- React 19
- No external UI libraries — plain CSS with dark theme and Pokemon type colors
- No database yet — card data is hardcoded in `lib/cards.ts`

## Project Structure
```
app/
  layout.tsx        — root layout with metadata
  page.tsx          — renders PortfolioTracker component
  globals.css       — dark theme, type badge colors, responsive table styles
components/
  PortfolioTracker.tsx — main client component: stats dashboard, filters, sortable card table
lib/
  cards.ts          — 150 Card objects with Pokedex #, types, set, buy price, owned flag + type color map
```

## Key Data
- 150 cards total, almost all Gen 1 (Kanto) Pokemon
- Cards sourced from a Cardmarket wants list (Japanese language, Near Mint condition)
- Total budget for priced cards: ~1,119.75 EUR
- Most expensive: Blastoise ex (135 EUR), Meowth promo (60 EUR), Vileplume GX (50 EUR)
- A CSV version is versioned at `data/wishlist.csv`

## Source Sync Rule
**Always keep `data/wishlist.csv` in sync with `lib/cards.ts`.** Whenever a card is added, removed, or edited in `lib/cards.ts`, apply the equivalent change to `data/wishlist.csv` in the same commit/turn. The CSV is the canonical wants-list export and must reflect the current state at all times.

CSV columns: `Card Name, Card Code, Set, Qty, Language, Condition, Buy Price (EUR), Price Paid (EUR), Owned, Pokedex #, Type 1, Type 2, Generation, Card Variant`. `Owned` is `true`/`false`; `Price Paid (EUR)` is blank for unowned cards. `imageUrl` stays only in `lib/cards.ts` (not mirrored to CSV).

## Current Features
- Progress bar showing collection completion percentage
- Stats grid: owned count, wanted, total budget, spent estimate, remaining
- Checkbox per card row to mark as owned (row highlights green)
- Search by name, code, or set name
- Filter by Pokemon type, card set, or ownership status
- Sortable columns (Pokedex #, name, code, set, buy price)
- Pokemon type badges with canonical game colors
- Variant badges (ex, GX, VMAX, Alolan/Galarian/Hisuian/Mega forms)

## Known Limitations / Planned Work
- **No persistence** — owned state resets on page refresh. Needs localStorage or a backend.
- **No "date acquired" or "price paid"** — only tracks the Cardmarket buy price ceiling.
- **Not deployed** — runs locally only (`npm run dev`).
- Could add card images using the Cardmarket product image URLs from the original HTML.

## Commands
```bash
npm run dev    # Start dev server on localhost:3000
npm run build  # Production build
npm start      # Serve production build
```
