# Pokédex 151 full-art

Personal tracker for a 151-card Japanese Pokémon TCG wishlist — one full-art / alt-art print for each original Kanto Pokémon. Import Cardmarket shipment emails, watch the collection fill in, and print 63×88&nbsp;mm binder placeholders for cards you haven't bought yet.

> Live site: https://pokemon-cards-portfolio.vercel.app *(update with your actual Vercel URL)*

![Grid view](docs/screenshot.png)
*(drop a screenshot here; see "Screenshots" below)*

## Features

- **Grid view** with holographic 3D-tilt hover, shiny rainbow sheen, and a Pokédex-silhouette treatment for cards you don't own yet.
- **Table view** with sortable columns (Pokédex #, name, code, set, buy price, price paid).
- **Search and filter** by name/code/set, Pokémon type, card set, or ownership status.
- **Per-card modal** with the full-resolution image, set/code, price paid, and purchase history.
- **Derived stats**: Collected, Spent on cards, Saved vs target, To complete, Budget, Total outlay.
- **Print route** (`/print`) generates an A4 PDF of 63×88&nbsp;mm placeholder cards (9 per page) with a calibration sheet so you can confirm the print scale before committing to a full binder.
- **CDN-independent images** — 146 of 151 card images are bundled as WebP in `public/cards/`, so the grid stays functional if the upstream sources disappear.
- **CSV export** of the current portfolio state.

## Tech stack

- [Next.js 15](https://nextjs.org/) App Router
- TypeScript, React 19
- No external UI libraries — plain CSS with a dark theme and canonical Pokémon type colors

## Data model

Two git-tracked JSON files are the single source of truth:

- **`data/cards.json`** — the wants list (one entry per card).
- **`data/purchases.json`** — the shipment log. A card is "owned" if it appears in at least one purchase item; `pricePaid` is derived as the minimum across matching purchases.

Full schema documented in [`CLAUDE.md`](CLAUDE.md).

## Local development

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # production build
npm start              # serve the build
```

To refresh or re-download card images (tcgdex / pokemontcg.io / PriceCharting → local WebP):

```bash
npm install --no-save sharp
node scripts/download_images.mjs              # only cards missing localImage
node scripts/download_images.mjs --force      # re-download everything
```

`sharp` is kept out of `package.json` so Vercel's install step doesn't hang on its native bindings.

## Known limitations

- **`buyPrice` is a frozen snapshot** from Cardmarket at the time the wishlist was captured. Re-refreshing is manual.
- **Binder selector** — every card has a `binderId` field for future multi-binder support, but there's no UI to switch between binders yet.

## License

MIT — see [LICENSE](LICENSE).
