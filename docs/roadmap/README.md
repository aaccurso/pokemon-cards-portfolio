# Roadmap

Four lanes of proposals written on 2026-10-23, right after the multi-binder
release (binder tabs, the 30th CELEBRATION master set, pack-pull purchases,
price refresh with history). Nothing here is built. Each lane document has,
per item: the problem, an approach grounded in the current code, effort
(S under half a day, M a day, L several days), dependencies, open questions,
a recommended order within the lane, and a "not recommended" list.

| Lane | File | Items | Serves |
|---|---|---|---|
| Collecting workflow | [collecting-workflow.md](collecting-workflow.md) | 5 (item 2 shipped in e0740ef) | Logging pack pulls, ~~carrying a needed list~~, duplicates, binder page view |
| Collector insight | [collector-insight.md](collector-insight.md) | 6 | Collection value, rarity progress, price movement, pack economics |
| Design and usability | [design-usability.md](design-usability.md) | 8 | Mobile layout, focus states, typography, empty states, rarity-aware tiles, print |
| Engineering | [engineering.md](engineering.md) | 8 | CI running tests, review minors, smoke script, scheduled refresh, component split |

## Findings worth knowing before picking anything

- `.github/workflows/ci.yml` runs on Node 20 and only type-checks and builds.
  `npm test` needs Node 24 and never runs in CI, so the 33 tests only run
  locally. Engineering item 1 fixes this in three files.
- `lib/data.ts` throws on bad data only when `NODE_ENV` is not `production`,
  and `next build` always sets `production`, so neither CI nor Vercel catches
  a bad `binderId` or orphan purchase. `tests/data.test.ts` does, once CI
  runs tests.
- The shipment with id `legacy` in `data/purchases.json` has `total: null`,
  which understates Kanto total outlay by 55.34 EUR. A one-line data fix.
- Since the refresh set `buyPrice` to the Cardmarket trend, "Saved vs target"
  already means market value minus paid, and "Spent on cards" is permanently
  0 in a master-set binder. Insight item 1 relabels those tiles.
- Phones narrower than about 392 CSS px get a single column of six stat
  tiles, and inputs at 14.4 px trigger iOS Safari's focus zoom. Design items
  1 and 2.

## Suggested starting order across lanes

1. **Engineering 1** (shipped 2026-10-23): CI on Node 24 with `npm test`. Half a morning; makes
   every later item safer.
2. **Design 2 and 1** (shipped 2026-10-23): focus states and the iOS zoom fix, then the mobile
   pass. Small CSS, visible every day on a phone.
3. **Workflow 1, first half**: number-entry pull logging with a copy-to-
   clipboard shipment block. Needed before the first M6a booster box is
   opened; the tile-tapping half can wait until typing numbers proves
   insufficient.
4. **Insight 1 and 2** (shipped 2026-10-23): collection value tiles and completion by rarity.
   Both are pure functions over existing fields plus a few tiles.
5. **Engineering 2** (shipped 2026-10-23): clear the deferred review minors in two small PRs.
6. **Engineering 6** (shipped 2026-10-23): split `PortfolioTracker.tsx` before adding the third
   view mode (workflow 4) or the pulls mode UI.
7. Then by appetite: pack economics after the first box is logged, price
   movement after a second refresh, scheduled refresh once the manual run
   feels routine, rarity-aware tiles, print refinements (shipped 2026-10-23).

## Conventions for working these items

- Each item becomes its own brainstorm and, for anything beyond S, its own
  spec under `docs/superpowers/specs/`. The lane documents are inputs, not
  specs.
- Keep the zero-dependency bias: no test framework, no chart library, no UI
  library. Each lane's "not recommended" section records what was considered.
- When an item ships, strike it here and in its lane file with the commit
  hash rather than deleting the text, so the reasoning stays searchable.
