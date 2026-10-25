# Pokémon card binders

Personal tracker for Japanese Pokémon TCG binders. Each binder is its own collection with its own stats, grid and table views, CSV export, and a printable sheet of 63×88&nbsp;mm placeholder cards for the slots you haven't filled yet.

- **Pokédex 151 full-art** — one full-art / alt-art print of each original Kanto Pokémon, sourced from Cardmarket.
- **30th CELEBRATION** — the full master set of the Japanese 30th anniversary expansion (M6a, cards 001–165), collected by opening booster packs.
- Two small side lists: Kanto evolutions and Eeveelutions.

> Live site: https://pokemon-cards-portfolio.vercel.app *(update with your actual Vercel URL)*

![Grid view](docs/screenshot.png)
*(drop a screenshot here; see "Screenshots" below)*

## Features

- **Binder tabs** — switch collections; the choice lives in the URL (`?binder=m6a-30th`) so views are shareable.
- **Grid view** with holographic 3D-tilt hover, shiny rainbow sheen, Japanese names under the English ones, and a silhouette treatment for cards you don't own yet.
- **Table view** with sortable columns (Pokédex #, name, code, set, buy price, price paid).
- **Search and filter** by name/code/set, Pokémon type (incl. Trainer), card set, or ownership status.
- **Per-card modal** with the full-resolution image, set/code, price paid, and purchase history.
- **Derived stats per binder**: Collected, Spent on cards, Saved vs target (or Duplicates for a master set), To complete, Budget / Set value, Total outlay. Shipments that span binders split their total by item share.
- **Booster pulls** — log a box opening as one shipment; pulled cards count as owned without inventing a per-card price.
- **Print route** (`/print?binder=…`) generates an A4 PDF of placeholder cards (9 per page) with a calibration sheet so you can confirm the print scale first.
- **Price refresh** — one script pulls Cardmarket trend prices from tcgdex into `buyPrice` and appends every snapshot to `data/prices.json`, so history is kept for later charts.
- **CDN-independent images** — every card image is bundled as WebP in `public/cards/`.
- **CSV export** of the active binder.

## Tech stack

- [Next.js 15](https://nextjs.org/) App Router
- TypeScript, React 19
- No external UI libraries — plain CSS with a dark theme and canonical Pokémon type colors
- Unit tests on Node's built-in runner (`npm test`), no test dependencies

## Data model

Four git-tracked JSON files are the single source of truth:

- **`data/binders.json`** — the binder registry (`kind: "wants"` for curated lists, `"master-set"` for complete sets).
- **`data/cards.json`** — every card across all binders.
- **`data/purchases.json`** — the shipment log. A card is "owned" if it appears in at least one purchase item; `pricePaid` is the minimum across priced purchases, or null when every copy was pulled from packs.
- **`data/prices.json`** — append-only price history per card.

Full schema and workflows documented in [`CLAUDE.md`](CLAUDE.md).

## Local development

Requires Node 24 (see `.nvmrc`; `nvm use` picks it up). The tests rely on Node's built-in TypeScript type stripping, so anything older than 22.18 gets an `EBADENGINE` warning on `npm install` and cannot run `npm test`.

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # unit tests
npm run build          # production build
npm start              # serve the build
```

Refresh prices:

```bash
node scripts/refresh_prices.mjs --dry-run   # preview changes
node scripts/refresh_prices.mjs             # write buyPrice + history
```

Re-download card images (PriceCharting / tcgdex → local WebP):

```bash
npm install --no-save sharp
node scripts/download_images.mjs              # only cards missing localImage
node scripts/download_images.mjs --force      # re-download everything
```

`sharp` is kept out of `package.json` so Vercel's install step doesn't hang on its native bindings.

## Known limitations

- **Price history is captured but not visualized yet.**
- **Price refresh is manual** — run the script; there is no scheduled job.
- **No "All binders" view** — each binder is its own collection.

## License

MIT — see [LICENSE](LICENSE).
