# Roadmap lane: engineering

## Lane summary

The M6a work left the codebase in good shape (pure `lib/` modules, 33 fast tests, scripts that write once at the end), but the safety net has a hole: `.github/workflows/ci.yml` runs `tsc` and `next build` on Node 20 and never runs `npm test`, and the real-data checks in `tests/data.test.ts` plus the `lib/data.ts` validation only bite in local dev. This lane closes that hole first, clears the deferred review minors, then adds the two automation pieces that pay for themselves on a one-person project: a headless-Chrome smoke script (the manual `--dump-dom` loop made repeatable) and a weekly GitHub Action that runs `scripts/refresh_prices.mjs` and commits. The `PortfolioTracker.tsx` split comes after the smoke script exists to prove behavior is unchanged; everything else (data growth, `checkJs`) is small or deferred, and the zero-dependency rule holds throughout: no Playwright, no test framework, no new runtime packages.

---

## 1. Make CI run the tests (Node 24, `npm test`, `.nvmrc`)

**Problem.** `ci.yml` pins `node-version: 20` and runs only `npx tsc --noEmit` and `npm run build`. Node 20 cannot run `node --test "tests/**/*.test.ts"` (type stripping is unflagged from 22.18 / 24), so the suite that guards stats math and real-data consistency never runs on a push or PR. Every later item here adds tests, so this is the foundation.

**Proposed approach.** Add `.nvmrc` containing `24`, switch the workflow to `node-version-file: .nvmrc`, and add a `- run: npm test` step before the build. Optionally add `"engines": { "node": ">=22.18" }` to `package.json` so a stale local Node fails loudly on `npm install`. Also add `tests/package.json` with `{ "type": "module" }` to silence the `MODULE_TYPELESS_PACKAGE_JSON` warning printed once per test file (do not set `"type": "module"` on the root; it changes how Next loads `.js` config and buys nothing since scripts are already `.mjs`).

**Effort.** S: three files, ten lines.
**Dependencies.** None.
**Risks.** `@types/node` is `^22` while the runtime is 24; harmless, but bump when convenient. Vercel's own Node setting only affects `next build`, not tests, so nothing changes there.
**Open questions.** (1) Keep the build step in CI now that Vercel builds every push anyway, or drop it to halve CI time? (2) Should CI also run on `pull_request` only, since `main` pushes already deploy?

---

## 2. Clear the deferred review minors in two small PRs

**Problem.** Eight known nits from the post-merge review are small individually but together they are the kind of thing that never gets done unless batched.

**Proposed approach.**

PR A, URL and UI (`components/PortfolioTracker.tsx`, `app/print/page.tsx`, `components/BinderTabs.tsx`):
- `?sort=`: line 47 casts any string to `SortKey` and line 75 then persists it. Add `const SORT_KEYS: ReadonlySet<SortKey> = new Set(["owned", "pokedexNumber", "setNumber", "name", "code", "set", "buyPrice", "pricePaid"])` next to the type and resolve `isSortKey(v) ? v : initialBinder.sort`. Put it in a new `lib/sort.ts` together with `getSortValue` (lines 561-571) so it is unit-testable and ready for item 6.
- `?illus=1` in a master-set binder: line 44 reads the param regardless of `kind`; line 178 then filters invisibly. Initialise with `&& initialBinder.kind === "wants"`, and guard the filter and the URL write (line 74) with `binder.kind === "wants"`.
- Print page fallback: `resolveBinderId` (line 34) silently maps `?binder=typo` to Kanto but the URL keeps the typo. Add a `useEffect` that calls `router.replace` when `searchParams.get("binder")` is non-null and differs from `binderId`, mirroring `selectBinder` on lines 53-57.
- `BinderTabs` count: a screen reader hears "30th CELEBRATION97 / 165". Give the button `aria-label={`${b.name}, ${c.owned} of ${c.total} owned`}`; no CSS needed, and the visible markup stays.

PR B, data and scripts (`lib/binders.ts`, `lib/purchases.ts`, `scripts/lib/prices.mjs`, `scripts/refresh_prices.mjs`):
- `binderShare` returns 0 for a shipment with no items, so its `total` vanishes from every binder and the sum-to-global-outlay invariant silently breaks. Keep the function as is and make `validateData` report `shipment X has no items`, plus `qty < 1`, negative `pricePaid`, and duplicate shipment ids. The real data has no empty shipment today, so this is purely preventive.
- `trend === 0`: `refresh_prices.mjs` line 51 checks `cm.trend == null` and `nextBuyPrice` checks `trend == null`; both should treat `!(trend > 0)` as "no price" (no snapshot has 0 today, but 120 are under 0.10, so a 0 from tcgdex is plausible). Add a test case.
- Two writes at the end (lines 87-88): write both to `*.tmp` then `fs.renameSync` both. A crash between the renames still leaves one stale file, but never a half-written one; git is the real backstop, say so in the header comment.

**Effort.** S: half a day for both PRs including tests for `isSortKey`, the new `validateData` cases, and `nextBuyPrice(card, kind, 0)`.
**Dependencies.** Item 1 so the new tests actually run in CI.
**Risks.** None of substance; PR A touches `PortfolioTracker.tsx`, which item 6 will move around, so land PR A first.
**Open questions.** (1) Should an empty shipment be an error (throws in dev) or should its `total` be attributed to the binder named in a new optional `shipment.binderId` field? The second is the only way to make a sealed-product purchase with zero pulls count anywhere.

---

## 3. `npm run smoke`: headless Chrome DOM assertions without Playwright

**Problem.** Every UI change during M6a was verified by hand with `Google Chrome --headless=new --dump-dom URL | grep`. That worked, but it is unrepeatable, and the server-rendered HTML alone is useless for assertions: `.next/server/app/index.html` contains only the Suspense shell because `useSearchParams` bails to client rendering, so `curl` cannot see the `<h1>`, the counts, or the tabs. Only a real browser can.

**Proposed approach.** `scripts/smoke.mjs`, wired as `"smoke": "node scripts/smoke.mjs"`.
- Server: with `--base URL` reuse a running server (local dev); otherwise require `.next/BUILD_ID` (print "run npm run build first" if missing), spawn `npx next start -p 3123`, poll `GET /` until 200 (30 s cap), kill it on exit.
- Chrome discovery: `CHROME_BIN`, then the macOS app path, then `google-chrome` / `chromium` on `PATH`. If none is found print a loud `SKIP` and exit 0, unless `--require-chrome` is passed (CI passes it; `ubuntu-latest` ships Chrome).
- Render: `execFile(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=10000", "--dump-dom", url])`, one retry per URL for timing flakes.
- Expectations come from the data, not from literals: the script is plain `.mjs` under Node 24, so it can `import { cardsForBinder } from "../lib/binders.ts"` and `buildOwnershipMap` from `../lib/purchases.ts` exactly as the tests do, and read `data/*.json` with `fs` (not via `lib/data.ts`, whose `@/` alias and JSON imports do not resolve in Node).
- URL list and checks: `/` and `/?binder=<id>` for all four binders (`<h1>` equals `binder.name`; `Showing N of N cards` with N = binder size; each tab shows `owned / total`), `/?binder=m6a-30th&view=table` (tbody row count = 165), `/?binder=typo` (renders Kanto), `/?card=<first owned id>` (modal present with "Owned"), `/print` and `/print?binder=m6a-30th` (hint shows unowned count and `ceil(unowned / 9) + 1` sheets, since the print page excludes owned cards by default). Every page: text content contains none of `#null`, `undefined`, `NaN`, `[object Object]`, `Application error`.
- CI: add a `smoke` step after the build: `npm run smoke -- --require-chrome`. Roughly one minute.

**Effort.** M: one day including a tiny tag-stripping `textOf(html)` helper and the CI step.
**Dependencies.** Item 1 (Node 24 in CI). Item 2 PR A first, or the `?binder=typo` print check will fail.
**Risks.** Headless timing; mitigated by the virtual time budget and one retry. Chrome major upgrades occasionally change flags; the script should print the Chrome version it found.
**Open questions.** (1) Is a `SKIP` exit 0 without Chrome acceptable locally, or should `npm run smoke` always fail hard? (2) Should the script also write the dumped DOMs to `.smoke/` (gitignored) so a before/after `diff` can serve as a characterization test for item 6?

---

## 4. Weekly price refresh as a GitHub Action

**Problem.** Prices are a frozen snapshot until someone runs `node scripts/refresh_prices.mjs` and commits two files. A Vercel cron cannot commit to the repo, so the only free option that writes to git is GitHub Actions.

**Proposed approach.** `.github/workflows/refresh-prices.yml`:

```yaml
name: Refresh prices
on:
  schedule:
    - cron: "17 6 * * 1"   # Mondays 06:17 UTC
  workflow_dispatch:
permissions:
  contents: write
concurrency:
  group: refresh-prices
jobs:
  refresh:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: node scripts/refresh_prices.mjs --summary .refresh-summary.md
      - run: npm test
      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/cards.json data/prices.json
          git diff --cached --quiet && exit 0
          git commit -F .refresh-summary.md
          git pull --rebase origin main
          git push
```

Script changes in `scripts/refresh_prices.mjs` and `scripts/lib/tcgdex.mjs`:
- `--summary <file>` writes the commit message: title `Refresh Cardmarket prices YYYY-MM-DD: N changes, M skipped` and the existing top-movers list as the body (the same text CLAUDE.md already asks to paste by hand).
- Guardrails: exit 2 without writing when any priced card moves more than 5x in either direction or when more than 60% of cards change. A failed step emails the owner; rerun locally with `--force` after looking.
- Retry in `getJson`: three attempts with 1 s / 4 s / 16 s backoff on 429 and 5xx; a final failure throws and nothing is written, as today. Keep the 150 ms pause and sequential fetching: 313 cards at roughly 350 ms each is about two minutes, well under any plausible tcgdex limit. `today` is UTC from `toISOString`, and same-day reruns replace the snapshot, so a manual `workflow_dispatch` on the same day is idempotent.

Push to `main` versus PR: a push made with `GITHUB_TOKEN` does not trigger `ci.yml` (GitHub blocks recursive workflow triggers) but does trigger Vercel's GitHub App, so the deploy happens without CI. That is why `npm test` runs inside this workflow. A PR opened with `GITHUB_TOKEN` has the same limitation (no `pull_request` run), so a PR would add only a weekly click for a diff that is mechanical and trivially revertible. Recommendation: push directly, rely on the guardrails plus tests, keep `workflow_dispatch` for manual runs. Skip `peter-evans/create-pull-request` and PATs.

**Effort.** M: half a day for the script flags and retry, half a day to watch the first two scheduled runs.
**Dependencies.** Items 1 and 2 PR B (`trend > 0`, atomic writes). Item 5 so unattended commits pass the stronger `validateData`.
**Risks.** tcgdex changing its pricing block shape; the `skipped (no Cardmarket price)` list would balloon, which the 60% guardrail catches. A refresh commit landing while a manual commit is in flight: `git pull --rebase` handles the common case; a conflict fails the step and the next week retries.
**Open questions.** (1) Direct push (recommended) or PR for the first month? (2) Weekly on Monday, or twice a week while M6a singles prices are still settling after release? (3) Should the Action also run `npm run build` before pushing, adding about a minute, given Vercel will build anyway?

---

## 5. Data validation gate: stronger `validateData`, a pre-commit hook, one throw policy

**Problem.** Three partial mechanisms exist: `lib/data.ts` throws only when `NODE_ENV !== "production"`, and `next build` sets production, so Vercel preview and production builds log and ship, while CI never runs the test that would catch it (`tests/data.test.ts`). Preview therefore behaves exactly like production here, which defeats the purpose of the environment check. Hand-edited `data/purchases.json` is the most common change in this repo and the most likely to introduce a bad `cardId`.

**Proposed approach.**
- `validateData` gains the checks from item 2 PR B plus: duplicate card ids, master-set binders must have `officialCount`, every `binderId` in `binders.json` unique. Keep it pure; keep the real-data test as the single consumer.
- Pre-commit: a tracked `.githooks/pre-commit` that runs `node --test tests/data.test.ts` (under 200 ms), enabled once with `git config core.hooksPath .githooks` and documented in CLAUDE.md under Commands. No husky, no new dependency. A separate `validate_data.mjs` CLI would duplicate the test; skip it.
- Throw policy in `lib/data.ts`: once CI runs tests, drop the `NODE_ENV` branch and always throw. The module evaluates when `next build` prerenders `/` and `/print`, so an inconsistent file fails the build before Vercel can deploy it; confirm by breaking one `binderId` locally and running `npm run build`.
- `app/error.tsx` (15 lines, "Something went wrong" plus a reload button) as the runtime boundary. The only remaining runtime throw path is `getBinder` on an unknown id, which `resolveBinderId` already prevents, so this is a nicety rather than a fix.

**Effort.** S: half a day.
**Dependencies.** Item 1.
**Risks.** `core.hooksPath` is per clone and must be redone after a fresh clone; mitigate with a `"prepare": "git config core.hooksPath .githooks || true"` script, noting that `npm ci` on Vercel runs it harmlessly.
**Open questions.** (1) Should the hook also run the full `npm test` (still under a second) rather than only the data test?

---

## 6. Split `components/PortfolioTracker.tsx` along its existing seams

**Problem.** The component is 571 lines mixing URL state, derived data, three render blocks, and two helper functions. It is not buggy, but every design-lane change (table wrapper, moving Share/CSV, empty states) and every binder feature lands in the same file.

**Proposed approach.** The seams are already visible in the line ranges:
- `lib/sort.ts` (from item 2): `SortKey`, `SORT_KEYS`, `isSortKey`, `getSortValue` (561-571), and the nulls-last comparator from 182-190. Pure, tested.
- `lib/format.ts`: `fmtEur` from `fmt` (557-559); `CardModal.tsx` lines 202 and 210 and `PlaceholderCard.tsx` line 51 duplicate the same `toFixed(2).replace(".", ",")`.
- `components/StatsGrid.tsx` (261-309): props `{ stats, kind }`. The header and progress bar (247-259) can stay in the tracker or join it as `BinderHeader`.
- `components/CardTable.tsx` (399-525): props `{ cards, ownership, binder, sortKey, sortDir, onSort, onOpen }`; `hoveredId` state (52) moves inside since only the table uses it.
- `components/FilterBar.tsx` (311-384): today this would need about 18 props. Collapse the five filter states into one `filters: { q, type, set, own, illus }` object with a single setter, so `selectBinder` (134-145) becomes `setFilters(EMPTY_FILTERS)` and the bar takes `{ filters, onChange, options, viewMode, onViewMode, onShare, onCsv, copied, showIllustration }`.
- `hooks/useDashboardState.ts` (32-96 plus 134-145): owns all URL-backed state, the replace-URL effect, and `selectBinder`; returns state and setters. The tracker shrinks to roughly 120 lines of composition.

Behavior lock: run item 3 against `main`, dump every URL's DOM to files, do the split, dump again, and `diff`. Zero diff is the acceptance test, since there are no component tests and the design lane will rely on the same markup.

**Effort.** M: one to two days with the DOM diff.
**Dependencies.** Items 2 PR A and 3. Coordinate with design-lane items 1, 4, and 5, which touch the same regions; split first, then let those changes land in the small files.
**Risks.** Accidental re-render churn from new object props (`filters`) in `useMemo` deps; keep deps on primitives or memoize the object. Hook extraction can subtly change initial-state timing for the URL effect; the DOM diff catches visible regressions but not an extra `router.replace` call, so also log replace calls once in dev while verifying.
**Open questions.** (1) Is the hook extraction wanted, or only the three render components? The hook is the riskiest part and the least visible. (2) Should `app/print/page.tsx` share `BinderHeader` for its `<h1>`?

---

## 7. Data growth: `prices.json`, client payload, images

**Problem.** Three numbers worth knowing before the refresh job runs weekly. `data/cards.json` (180 KB) is imported by `"use client"` code and ships in chunk `609-*.js` (154 KB minified, a few tens of KB gzipped). `data/prices.json` is 60 KB today with 388 snapshots at about 98 bytes each pretty-printed; a weekly run adds 313 snapshots, so roughly 31 KB a week and 1.6 MB a year, and each run rewrites 313 arrays, producing a 3,000-line diff. Nothing imports it, so it costs the site nothing until the price-history view (another lane) does. `public/cards` is 52 MB across 320 WebP files, largest 460 KB (`m6a-165-magikarp.webp`); tiles lazy-load, so page cost is bounded by what is on screen, and the git pack is 21.5 MB, fine for `actions/checkout`.

**Proposed approach.** Do nothing structural now; write the decision down. Two cheap, optional tweaks: format `prices.json` with one snapshot per line (a 10-line custom stringify in `refresh_prices.mjs`) so weekly diffs become appends per card; and when the history view arrives, do not import `prices.json` client-side, but derive what the UI needs at build time (for example `public/prices/<id>.json` or a compact per-card array written by the refresh script). If the file passes a few MB, shard to `data/prices/<year>.json` with the refresh script writing only the current year and `tests/data.test.ts` reading all. Images: leave `download_images.mjs` at 800 px / q85; re-encoding to save 20 MB buys nothing visible.

**Effort.** S: an hour for the line-per-snapshot formatter, otherwise a note.
**Dependencies.** None; informs item 4 and the history visualization.
**Risks.** Over-engineering here is the main risk; the hobby-project budget is better spent on items 3 and 4.
**Open questions.** (1) Is the 3,000-line weekly diff a nuisance worth the formatter, or is it fine since nobody reads it?

---

## 8. Type-check the `.mjs` scripts with `checkJs` and JSDoc

**Problem.** `tsconfig.json` has `allowJs: true`, which is why `tests/*.test.ts` can import `scripts/lib/*.mjs` and `tsc` infers their types, but `checkJs` is off and `include` lists only `.ts`/`.tsx`, so errors inside the scripts themselves are invisible until runtime. The scripts are the part of the repo that hits the network and writes files.

**Proposed approach.** Add `"checkJs": true` and `"scripts/**/*.mjs"` to `include`. Expect a handful of strict-mode errors on first run: `TYPE_MAP[t]` and `NAME_FIXES[localId]` indexing object literals with a `string`, `trainerNames[tcgdexCard.localId]`, and untyped `history`/`snap` parameters in `prices.mjs`. Fix with `/** @type {Record<string, string>} */` on the tables and `@param` tags; for `buildM6aCard`'s return and `nextBuyPrice`'s `card`, use `/** @typedef {import("../../lib/cards.ts").Card} Card */`, which works with `allowImportingTsExtensions`. Keep the one-off scripts (`build_m6a.mjs`, `backfill_card_fields.mjs`) excluded if they resist; the recurring `refresh_prices.mjs` and `scripts/lib/` are the ones that matter.

**Effort.** S to M: about 20 annotations, half a day if the one-offs are included.
**Dependencies.** None. Best done before item 4 adds flags to `refresh_prices.mjs`, but not blocking.
**Risks.** Low. `checkJs` only applies to JavaScript files, `node_modules` is excluded, and `next.config.ts` is already type-checked as TypeScript.
**Open questions.** (1) Worth it at all for a one-person repo, or is the test coverage of `scripts/lib/` enough? Honest answer: it is the lowest-value item here; do it on a slow evening or not at all.

---

## Recommended sequence

1. **Item 1 (CI runs tests)**, same day. Everything below adds tests that would otherwise run only on one laptop.
2. **Item 2 (minors, two PRs)**, next. Small, closes the review, and PR A changes the URL handling the smoke script will assert on.
3. **Item 5 (validation gate)**. Cheap, and it must exist before a bot starts committing data unattended.
4. **Item 3 (smoke script)**. The repeatable version of what already worked; it becomes the acceptance test for item 6 and the design lane.
5. **Item 4 (scheduled refresh)**. Depends on 1, 2B, and 5; the first scheduled run should be watched, then it is free value every week.
6. **Item 6 (split PortfolioTracker)**. Only after 3 exists, and before the design lane's mobile pass so those edits land in small files.
7. **Items 7 and 8** as filler: 7 is mostly a written decision, 8 is optional.

The ordering optimises for "no unattended breakage": gate first, automation second, refactor last.

## Not recommended

- **Playwright, Puppeteer, or Cypress**: a 300 MB browser download and a dependency for assertions that `--dump-dom` plus string checks already cover; revisit only if click-through flows (modal navigation, binder switch) need testing.
- **Jest or Vitest**: `node --test` with native type stripping runs the 33 tests in under 200 ms with zero dependencies; a framework adds config, transforms, and a second TypeScript pipeline.
- **A database, KV store, or CMS for cards and purchases**: the JSON files are the product's source-of-truth rule in CLAUDE.md, diffable, reviewable, and deployed statically; a store adds auth, hosting, and a sync problem for no feature.
- **Vercel cron for the refresh**: it cannot commit to the repo, so it would need a store (see above) and the UI would have two sources of truth.
- **`peter-evans/create-pull-request` or a PAT**: third-party action plus secret management for a PR that would not trigger CI anyway.
- **Husky or lint-staged**: `core.hooksPath` with a tracked shell script does the same with no package.
- **Re-encoding `public/cards` smaller**: saves repo bytes, costs image quality in the modal zoom, changes nothing for page load.
- **An "All binders" view or per-binder data files**: out of scope per the spec; stats attribution across binders is already handled by `binderShare`.
- **ESLint or Prettier**: not currently installed; adding them now would turn item 6 into a whitespace diff. If wanted, add after the split in a separate formatting-only commit.
