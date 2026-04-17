# Pokemon Card Portfolio Tracker

## Overview
Next.js 15 (App Router, TypeScript) web app to track a 150-card Japanese Pokemon TCG wants list sourced from Cardmarket.

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
- A CSV version also exists at `/tmp/pokemon_cards_wishlist.csv`

## Source Sync Rule
Whenever `lib/cards.ts` is modified (add/remove/edit a card), keep `/tmp/pokemon_cards_wishlist.csv` in sync with the same change. The CSV is the original source export and should reflect the current wants list at all times. Fields that don't have a CSV column (e.g. `pricePaid`, `owned`) are only tracked in `lib/cards.ts`.

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
