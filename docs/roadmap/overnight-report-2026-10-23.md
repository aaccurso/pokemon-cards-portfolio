# Overnight roadmap run, 2026-10-23

- Branch: `overnight/roadmap` (branched from `main` at 165af9c; `main` untouched)
- Items attempted: 18. Merged: 18. Not merged: 0.
- Waves covered: wave 1 and wave 2 of the four lane documents under `docs/roadmap/`.
- Final gates on the merged branch (Node v24.22.1, Chrome 155):
  - `npm test`: 138 tests, 138 pass, 0 fail
  - `npx tsc --noEmit`: clean
  - `npm run build`: Next.js 15.5.15, 8/8 static pages (`/`, `/needed`, `/print`, `/opengraph-image`, `/icon.svg`, `/_not-found`)
  - `SMOKE_PORT=3999 npm run smoke -- --require-chrome`: 11/11 pages passed

Every item was implemented in its own worktree with a test written first, reviewed, fixed where the review raised an important finding, then merged into `overnight/roadmap` with `--no-ff`. Each merge re-ran the full gate set in the main checkout. Review minors that were judged not worth blocking on are listed at the end, grouped by item, so nothing from the reviews is lost.

## Lane: collecting-workflow

### 2. Pocket needed list
Status: merged in b7df070.

A new pure module `lib/needed.ts` builds the needed list per binder (padded set numbers for master sets, `#025 Pikachu` style for wants binders, secrets above `officialCount` split into their own block) and formats it as `Need (62): 003 007 ...`. A new client route `/needed` renders the 10-column number grid or 3-column name rows with owned cells dimmed, plus Copy as text, Print and a back link; the dashboard gained a Needed link beside CSV. Print CSS fits either binder on one portrait A4 page. The merge threaded the link through the new `FilterBar` component since the tracker had been split in the meantime.

Rulings:
- Render the whole grid with owned cells dimmed rather than missing-only; the grid shows where gaps sit.
- Text export is English only, no Japanese names; sellers can search by set number.
- Wants binders print at 10pt in four columns instead of 16pt, since 152 rows cannot fit one A4 at 16pt.
- The needed page uses the light print-page palette rather than the dark dashboard theme.
- No page hints from item 4, because item 4 is not built.
- `lib/needed.ts` follows the type-only import rule, so the padded-number formatting is duplicated rather than importing `numberLabel`.
- Added a back-to-dashboard link even though the spec did not list it; the page was otherwise a dead end on a phone.

### 3. Duplicates view and trade list
Status: merged in 736ee04.

The ownership filter gained a Duplicates Only option (`own=dupes` in the URL), tiles and the table show an `xN` copies badge beside the Pokeball, and a Trade list disclosure offers Copy text and Download CSV built from two pure, tested formatters in `lib/purchases.ts`. The empty state says "No duplicates in this binder." when the filter yields nothing. The branch was rebased three times as the target moved and landed cleanly on the split component shape.

Rulings:
- Build the trade export (text and CSV), not filter-only; both formatters are pure and tested.
- No per-copy condition in trade rows; NM for everything, as the lane's open question defaults.
- Tile and table badge shows total copies owned (`x2`) while the trade list shows extra copies; tooltips state both numbers.
- Trade list text omits `nameJa`; the CSV keeps it as a column.
- The Trade list control is a native details/summary disclosure with two buttons, no new state or component.
- Copy text falls back to downloading a .txt when the clipboard API throws.
- Trade rows sort by `setNumber` with `code` as tiebreak, as specified, even though Kanto mixes sets.
- Did not edit the lane doc status in the branch; parallel lanes touch the same file.
- Trade-list controls are explicit `FilterBar` props rather than a children slot, matching how Share/CSV already pass handler plus copied flag.
- Widened `EmptyStateInput.ownershipFilter` to include `dupes` and return a dedicated message.
- Resolved the mid-task target moves by re-rebasing rather than merging, keeping three linear commits.

### 5. Finish-as-singles shortlist
Status: merged in 4d05b28.

Master-set binders show a Buy as singles button in the To complete tile that sets Wanted, table view, sorted by `buyPrice` descending; the filter bar gains Copy as text while the Wanted filter is on, reusing item 2's `neededText`; the card modal links every card to a Cardmarket search by set code via `lib/shortlist.ts`. The smoke plan gained the shortlist page for the first master-set binder. The branch was rebased until `git merge-tree` against the tip was clean.

Rulings:
- Cardmarket search by set code (lane default), not a PriceCharting link; PriceCharting slugs are not stored.
- Text formatter initially lived in `lib/shortlist.ts`; after item 2 merged mid-task, the shortlist reuses `neededText` from `lib/needed.ts` and `lib/shortlist.ts` keeps only `cardmarketSearchUrl`.
- Buy as singles is a button that sets React state, not an anchor, because the tracker initialises from `searchParams` only on mount.
- Copy as text copies the currently filtered wanted cards in formatter order, not the active table sort.
- Text export excludes Japanese names.
- Buy as singles shown only on master-set binders and only while `stats.wanted > 0`, and only when the `onBuySingles` prop is passed.
- Cardmarket link shown for every card, owned or not.
- Smoke plan derives the shortlist page from the first master-set binder rather than hardcoding `m6a-30th`.
- Added `:focus-visible` rules for `.stat-link` and `.cardmarket-link` using `var(--ring)` for consistency with item design 2.
- Contract tests read component source instead of rendering React, as the repo has no DOM test runner.
- Copy as text sits in the controls-secondary row directly after Share.

## Lane: collector-insight

### 1. Collection value: market value of what you own vs what you paid
Status: merged in bd12551.

`computeStats` gained `marketValue`, `marketValueAllCopies` and `unpricedOwned`; the stats grid relabels tiles so master sets show Pulled value (with a distinct sub-line) and wants binders show Value (N owned) with a vs paid gain line, and Total outlay carries a value = N% sub-line from a new pure `valueVsOutlayPct`. A one-line All binders summary sits under the tab strip. The `legacy` shipment's `total` was set to 55.34. The review's important finding (ratio basis inconsistent between tiles) was fixed by using `marketValueAllCopies` everywhere.

Rulings:
- The value tile uses today's `buyPrice` (Cardmarket trend), not `avg30`, which needs item 3's summary file.
- Ship the one-line all-binders summary under the tab strip; the lane says one summary line is enough.
- Legacy shipment total set to 55.34, the sum of its eight `pricePaid`.
- Value / outlay uses `marketValueAllCopies` on every binder kind and on the All binders line, since outlay already paid for duplicates; this is the only basis that reproduces the spec's 123% Kanto example.
- Hide the ROI sub-line when `totalOutlay` is 0 rather than show a division by zero.
- Keep `savings` in `CollectionStats` for one release.
- Left a pre-existing em-dash in the CLAUDE.md master-set bullet whose tail was edited.
- The ratio moved from inline JSX into the pure helper so a fixture test can pin the basis.

### 2. Completion by rarity (master-set)
Status: merged in 83f09e8.

Master-set binders get a rarity breakdown under the progress bar (one row per rarity in `rarityOrder`, owned / total, to go in whole euros), a rarity select in the filter bar whenever a card has a rarity, a value-weighted figure in the progress row (`marketValue / budget`), and a `rarity` URL param integrated into the shared `Filters` object. The smoke plan gained a rarity-filtered page and asserts the select appears exactly where data has rarities. The duplicated rarity order constant was removed in favour of a `.ts` relative import, and the CLAUDE.md lib import rule was reworded to what is actually enforced.

Rulings:
- Value-weighted progress initially used `budget - toComplete`; after item 1 merged it uses `stats.marketValue / stats.budget`, which the lane names as the dependency.
- The tcgdex None bucket is labelled Common / Uncommon with no second rarity source.
- The rarity select is data-driven (any binder where a card has a rarity); breakdown rows and the value figure are master-set only.
- `rarityBreakdown` skips cards without a rarity rather than inventing an Unknown bucket.
- Clicking the active breakdown row clears the rarity filter.
- The display-order constant was first duplicated to respect the type-only import rule, then de-duplicated once the rule was reworded (lib modules may value-import each other with explicit `.ts` relative paths, acyclic).
- Header and row figures use whole euros (`fmt0`).
- DOM verification first ran ad hoc, then became a repeatable smoke page once the eng 3 script was on the base.
- Merged `overnight/roadmap` into the branch twice as the target advanced, so the findings about mergeability were verifiable.
- Smoke rarity page filters on the first rarity in `rarityOrder` present (None for M6a).
- Smoke also asserts the rarity select is present exactly when a card has a rarity.
- UI shape is pinned by source-contract tests plus the data-derived smoke plan, not a DOM runner.

## Lane: design-usability

### 1. Mobile pass: stats grid, controls row, tab strip, table
Status: merged in 77b411b.

On phones the six stat tiles stay in two columns with tighter padding, the binder tabs scroll horizontally with a right-edge fade and the active tab centred by a pure `activeTabScrollLeft` helper in `lib/tabStrip.ts`, Share/CSV/Needed move below the results via a `.controls-secondary` group and flex order, and the table gets a horizontal scroll wrapper inside the 768px breakpoint only. The review's important finding (scrollIntoView scrolled the window on hydration) was fixed by scrolling only the nav element. The merge ported the markup into the newly extracted `FilterBar` and `CardTable` components.

Rulings:
- Keep all six stat cards in two columns on phones rather than hiding Total outlay and Budget.
- Binder tabs scroll horizontally on phones instead of dropping counts and wrapping.
- `.table-wrap` gets `overflow-x: auto` only inside the 768px breakpoint, so the sticky thead keeps working on desktop.
- Share/CSV move below the results through a real DOM group reordered by flex order, not duplicated buttons.
- Added a scroll-to-active-tab effect so a deep-linked fourth binder is not invisible off the end of the strip.
- Mobile tab overrides live in a second 768px block placed after the base `.binder-tabs` rules.
- CSS tests are literal contract tests that parse `globals.css` and the markup.
- The scroll helper lives in `lib/tabStrip.ts` so it is unit-testable without a DOM.
- Scroll centres the active tab instead of nearest edge.
- Scroll uses `nav.scrollTo({ left })` with no smooth behaviour, since it runs on hydration.
- The contract test asserts `BinderTabs.tsx` contains no `scrollIntoView` token at all.

### 2. Focus states on tabs, pills and tiles
Status: merged in 9bf9ef9.

A shared `--ring` double ring (2px gap in `var(--bg)` plus 2px `var(--accent)`) is declared on `:root` and applied in one `:focus-visible` block to `.binder-tab`, `.pill-toggle`, `.action-button`, `.modal-nav`, `.print-btn`, `.card-tile` and `.card-name-cell`; focused tiles reuse the hover glow. `.view-toggle button` gets an inset variant because its parent clips overflow. `.print-page` redeclares `--ring` in white plus blue for the light page. A static contract test over `globals.css` guards all selectors.

Rulings:
- `.view-toggle button` uses an inset double ring because `.view-toggle` has `overflow: hidden`.
- The print-page override is a scoped `--ring` redeclaration on `.print-page` rather than a `.print-btn`-only rule, so the tabs on the light page share it.
- The TDD test is a static contract over `app/globals.css`, since focus styling cannot be observed via `--dump-dom`.
- Existing `.controls input/select :focus` and `.modal-close:focus-visible` left unchanged; the spec lists them as handled.
- No `border-radius` added to `.card-tile` for the outer ring.

### 3. Typography with the Japanese line, and the header tagline
Status: merged in 50531fd.

The Japanese name line is now styled per surface (muted subtitle in the modal, proper sizing in tiles, table and placeholders) and every `name-ja` span carries `lang="ja"`, enforced by a source-scan test over `components/*.tsx` and a `checkPage` guard in the smoke library. The header gained the binder description as a tagline and the progress bar sits in a flex row with a `collectedPct` / `progressLabel` label from `lib/purchases.ts`. The review's important finding (table view lost `lang="ja"` after the eng 6 split) was fixed by rebasing onto the split and adding the attribute in `CardTable.tsx`.

Rulings:
- The Japanese line in the modal goes muted (`var(--text-muted)`, 1rem, weight 400), not yellow.
- Progress label and percent formatting live in `lib/purchases.ts` as `collectedPct` / `progressLabel`.
- Left `.card-tile-name` nowrap inheritance untouched; the lane lists it as an observation only.
- Progress label placed beside the bar in a flex row rather than absolutely positioned over it.
- Skipped the smoke gate in the worktree (no smoke script at that base); the merge step ran it.
- Rebased onto `overnight/roadmap` rather than asking the merge step to hand-resolve.
- Dropped the now-dead `isMasterSet` local when resolving the tracker conflict.
- Guard `lang="ja"` with a source-scan test plus a smoke `checkPage` guard instead of a React render test.
- A one-off smoke launch flake (2/9 with no h1) was treated as a flake after a rerun via `SMOKE_URL` passed 9/9; the smoke script was not modified.
- Did not re-rebase onto the four merges that landed during the fix, since `merge-tree` was conflict-free.
- Lane open question 1 (modal Japanese line colour) kept muted.

### 4. Empty states: zero results and a binder with zero owned
Status: merged in 7ee85ad.

A pure `emptyStateMessage` in `lib/cards.ts` returns "Nothing owned yet in this binder." for Owned-only on a binder with zero owned, `No cards match "<q>".` when search text is present, and "No cards match these filters." otherwise. The tracker renders a dashed `.empty-state` block (role status, reused Pokeball, message, Clear filters button) in place of the grid or table when nothing matches; `resetFilters()` was extracted and is shared with the binder switch. The merge re-expressed it as `setFilters(EMPTY_FILTERS)` on the new `Filters` object.

Rulings:
- The owned-zero message takes precedence over search text when both apply.
- Clear filters resets only search, type, set, ownership and illustration, not sort, view or modal.
- Search text is trimmed and wrapped in straight double quotes in the copy.
- The empty-state block has `role=status` so screen readers announce it.
- No in-browser check of the owned-zero copy, since every binder now has at least one owned card; the unit test covers it.

### 5. Card modal on small screens
Status: merged in f7361bd.

The prev/next buttons moved out of the top of `.modal-content` into a `.modal-nav-row` rendered after `.modal-info`, which is `display: contents` on desktop and a sticky bottom row on phones; `.modal-content` gets `max-height: 90vh` with a `90dvh` fallback, and backdrop padding drops to 0.75rem. A static contract test parses the mobile blocks and the component source.

Rulings:
- Keep the centred modal, no bottom-sheet on phones; the sticky nav row works with either.
- Render `.modal-nav-row` only when `onPrev` or `onNext` exists.
- Add `.modal-nav-row .modal-nav-next { margin-left: auto }` so a lone next button stays right.
- Reset `.modal-nav:hover` transform inside the row too, so the button does not jump on tap.
- Test as a static CSS/markup contract rather than a DOM test.
- Do not update CLAUDE.md; it does not document modal CSS.

### 7. Print page: controls layout with tabs, and an ink-light variant
Status: merged in 9d95218.

The print controls card got its own rows for tabs and for the checkboxes and button, the tabs are re-skinned light on the print page, and an Ink saver toggle (`?ink=1`, via pure helpers in `lib/print.ts`) prints black text, outlined badges and no grey photos. The review's important finding (calibration ticks could drop out with Background graphics off) was fixed by hoisting `print-color-adjust: exact` from `.placeholder-card` to `.print-page`, with a CSS contract test.

Rulings:
- Keep the Japanese name line in ink-light mode.
- Keep the PLACEHOLDER watermark in ink-light, recoloured to `rgba(0,0,0,.3)`.
- Ink saver lives in the URL (`?ink=1`) while Include owned stays local component state.
- `lib/print.ts` imports `DEFAULT_BINDER_ID` from `./binders.ts` with an explicit `.ts` extension.
- Tabs may wrap to two rows inside the 780px card; the print preview is not made responsive.
- Added a focus-visible ring on `.print-page .binder-tab`.
- Hoist `print-color-adjust` to `.print-page` rather than adding `.cal-tick` to a selector list.
- The regression test is a static read of `app/globals.css`, not a rendered-print check.

### 8. OG image and title for several binders (data-derived version only)
Status: merged in daef75d.

`lib/binders.ts` gained `SITE_TITLE`, `siteDescription(binders)` and `ogAlt(binders)`; `app/layout.tsx` builds the title and description from them and `app/opengraph-image.tsx` renders one row of pill chips, one per binder, with a derived alt. A real-data test asserts every binder appears in both strings. Per-binder OG images were left out as the lane recommends.

Rulings:
- Stop at the S data-derived version, no per-binder OG images.
- Replace the em-dash in the description and alt with a colon followed by the binder list.
- Keep `flexWrap` on the chip row but size chips so today's four fit one row.
- With zero binders the description and alt fall back to the plain title.
- Helpers live in `lib/binders.ts` rather than a new `lib/site.ts`.

## Lane: engineering

### 1. Make CI run the tests (Node 24, npm test, .nvmrc)
Status: merged in 356d965.

`.github/workflows/ci.yml` now reads Node from a new `.nvmrc` (24) via `node-version-file` and runs `npm test` after `npm ci` and before the kept `tsc` and build steps. `package.json` gained `engines.node: ">=22.18"`, `tests/package.json` sets `type: module`, and the test script passes `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON`. A config-contract test `tests/ci.test.ts` guards the file shapes. README gained a Node requirement note.

Rulings:
- Keep the build step in CI; it catches `validateData` throws and Next-layer type errors that tests do not.
- Keep CI on both push to main and pull_request.
- Add `engines.node >=22.18` but not `engine-strict`, so Vercel's `npm ci` cannot fail on a lagging Node setting.
- Silence the remaining typeless-package warnings with `--disable-warning` on the test script rather than adding `lib/package.json`.
- Do not bump `@types/node` from ^22 to 24.
- Write a config-contract test as the TDD vehicle since the item has no runtime behaviour.

### 2. Clear the deferred review minors (both PR A and PR B scopes, as one branch)
Status: merged in bdcb468.

`SortKey` is narrowed to the eight sortable keys with `SORT_KEYS` and `isSortKey`, `?sort=` is validated, `?illus=1` is guarded by `binder.kind === "wants"` at read, write and filter, the print page rewrites `?binder=typo` to the id it renders, `hasTrend` is exported and used in both `nextBuyPrice` and the refresh skip check, `BinderTabs` carries a screen-reader label, and `refresh_prices.mjs` writes both files through a new `scripts/lib/atomic.mjs` `writeAllAtomic` (tmp plus rename) with `formatPrices` output. The branch merged the target three times as it advanced and landed with zero conflicts.

Rulings:
- An empty shipment is a validation error, not attributed via a new optional `shipment.binderId` field.
- Both PR A and PR B scopes landed on one branch in small commits split along the lane's PR lines.
- `SortKey` narrowed to exactly the eight keys in `SORT_KEYS`, which makes `isSortKey` a real type guard.
- `hasTrend` exported as its own helper and used in both places.
- No `*.tmp` entry added to `.gitignore`; a crash leaving `data/*.json.tmp` should be visible.
- Print-page URL rewrite implemented as an inline `router.replace` in a `useEffect` keyed on the raw param and the resolved id.
- Component changes verified with headless Chrome DOM checks; pure logic unit-tested.
- Merged `overnight/roadmap` into the branch rather than rebasing, keeping the reviewed commits byte-identical.
- Conflicted files took the target's side in a green baseline merge, then each minor was re-applied in a fresh TDD commit.
- `validateData` keeps the target's eng 5 version unchanged, which is a superset of the branch's.
- The `?illus=` kind guard lives in the `useState` initialiser, not as a `readFilters` parameter, because the rarity lane's test pins that signature.
- tmp plus rename lives in `scripts/lib/atomic.mjs` so it can be unit-tested on a tmpdir.
- `refresh_prices.mjs` is covered by a static contract test, not executed.
- `PRICES_FILE` text is `formatPrices(prices)`, so `data/prices.json` stays byte-identical to formatter output.
- Stopped re-merging once `merge-tree` against the tip reported zero conflicts.
- A merge that pulled in a since-rewritten target commit was dropped and redone against the rewritten one.

### 3. npm run smoke: headless Chrome DOM assertions
Status: merged in 1ca3960.

`scripts/smoke.mjs` plus a tested `scripts/lib/smoke.mjs` build a page plan from `data/*.json` (every binder, the table view of the largest binder, a typo binder, the first owned card's modal, both print pages), start `next start` on `SMOKE_PORT` or reuse `SMOKE_URL`, and assert on the DOM in headless Chrome (h1, counts, tabs, no `undefined` or `NaN`). Without Chrome it prints SKIP and exits 0; CI passes `--require-chrome` as a new step. The review's important finding (a `package.json` conflict with eng 1) was fixed by merging the target into the branch and pinning both script lines in `tests/package.test.ts`. Later items (rarity, shortlist, typography) extended the plan to 11 pages.

Rulings:
- SKIP with exit 0 when Chrome is missing, fail only with `--require-chrome`.
- Do not write dumped DOMs to `.smoke/`; failures print the exact mismatch.
- When `.next/BUILD_ID` is missing, print a notice and fall back to `next dev` instead of exiting.
- Server choice is `SMOKE_URL`/`--base` to reuse, else spawn on `SMOKE_PORT` (default 3000).
- The table-view row check and the second print page target the largest binder by card count, not a literal.
- The modal check uses the first owned card of the default binder and is skipped when nothing is owned.
- Added the CI smoke step to the worktree's pre-eng-1 ci.yml, knowing the step needs Node 24 from eng 1.
- Resolved the conflict by merging the target into the branch rather than rebasing.
- The reproducing test is a `package.json` shape test rather than a `git merge-tree` test.
- No changes to `scripts/smoke.mjs`, ci.yml or docs for the finding; it was purely the `package.json` conflict.

### 5. Data validation gate: stronger validateData, pre-commit hook, one throw policy
Status: merged in 0a5cbbb.

`validateData` now also reports empty shipments, `qty < 1`, negative `pricePaid`, duplicate shipment ids and a null `total`; `lib/data.ts` throws in every environment, so `next build` is the gate (verified by hand: a bad `binderId` fails the build with `Invalid data:`); a tracked `.githooks/pre-commit` runs `tests/data.test.ts` and `npm install` enables it via a `prepare` script; `app/error.tsx` is an error boundary that reuses the existing button styles. The `legacy` shipment total was set to 55.34.

Rulings:
- The pre-commit hook runs only `tests/data.test.ts`, not the full `npm test`.
- Legacy shipment total set to 55.34 with shipping and fees left null.
- A null shipment total is a `validateData` error, since `computeStats` would silently count it as 0.
- An empty shipment is an error, not attributed to a new `shipment.binderId` field.
- `lib/data.ts` throws in every environment now, without waiting for item 1.
- No separate `validate_data.mjs` CLI; the hook invokes the test directly.
- The hook checks the working tree, not the staged snapshot.
- Did not set `core.hooksPath` in the worktree (git config is shared); the `prepare` script sets it on install.
- The build-gate throw path was first checked against the dev server, then proven by a real `npm run build` (exit 1 on bad data, exit 0 on clean data) when the review asked for it; no code change was needed.
- Error boundary reuses `.action-button` classes plus 18 lines of layout CSS.
- No test runs `next build`; it would take tens of seconds and mutate `data/*.json` in a suite that doubles as the pre-commit hook.

### 6. Split components/PortfolioTracker.tsx along its existing seams
Status: merged in b830402.

`PortfolioTracker.tsx` (571 lines) became `StatsGrid.tsx`, `FilterBar.tsx` and `CardTable.tsx` plus two pure, tested modules, `lib/sort.ts` (`SortKey`, `SortDir`, `getSortValue`, `compareBySort`) and `lib/format.ts` (`fmtEur`); the tracker is now URL state, derived data and composition. The five filter states collapsed into one `Filters` object. Rendered DOM text for four representative URLs was byte-identical before and after. Nearly every later merge was re-expressed against this shape.

Rulings:
- Skip the `useDashboardState` hook extraction; extract only the three render components plus `lib/sort` and `lib/format`.
- Do not share a `BinderHeader` with the print page; header and progress bar stay inline.
- `lib/sort.ts` does not include `SORT_KEYS`/`isSortKey` validation; that belonged to item 2 and landed there.
- Collapse the five filter states into one `Filters` object; render and `router.replace` counts are unchanged.
- Accept React's text-node separator removal in stat cards and price cells as a non-regression.
- `fmtEur` returns number, space and euro sign in one string; `CardModal` and `PlaceholderCard` use it too.
- New CLAUDE.md structure lines use the block's existing separator for consistency.

### 7. Data growth: line-per-snapshot formatter for prices.json (the S part only)
Status: merged in 583bdcc.

A pure `formatPrices(prices)` in `scripts/lib/prices.mjs` serialises `data/prices.json` with one compact snapshot per line, wired into the refresh script in place of `JSON.stringify`. `data/prices.json` was reformatted once (3,487 lines to 1,008, 60.9 KB to 42.2 KB) and a real-data test asserts the file on disk is byte-identical to formatter output. The data-growth decision (no client import of prices, derive at build time, shard only past a few MB, leave images alone) is recorded in the refresh script header.

Rulings:
- Implement the formatter; the 3,000-line weekly diff is worth it.
- Reformat `data/prices.json` now in its own commit instead of letting the next refresh do it.
- Lock the format with a real-data test rather than trusting the script alone.
- Snapshot lines are compact `JSON.stringify` of each snapshot, 4-space indent under 2-space keys, key order preserved.
- Do no structural data-growth work; record the decision as a comment in `refresh_prices.mjs`.

## Did not land

Every item attempted in this run merged. The following lane items were not attempted, by design of the two waves:

- collecting-workflow 1 (Pull checklist mode): M-sized and only useful once the first M6a booster box is opened; wave 3 candidate.
- collecting-workflow 4 (Binder page view): depends on the component split (now done) and was scheduled after the pulls mode UI.
- collector-insight 3 (Price movement): needs a second price refresh so there is more than one date to compare.
- collector-insight 4 (Pack economics): needs the first box logged.
- collector-insight 5 (Buy-next list) and 6 (Binder value over time): both depend on item 3's summary file and more refresh dates.
- design-usability 6 (Rarity-aware tiles): the lane itself puts it after the rarity breakdown and recommends restraint; it needs a product decision on which rarities get a frame.
- engineering 4 (Weekly price refresh as a GitHub Action): the lane recommends it once the manual run feels routine; also needs a repo secret or token decision from the owner.
- engineering 8 (checkJs for the .mjs scripts): low priority housekeeping.

## Deferred minors from reviews

Each merged item went through a review; important findings were fixed before merge. The minors below were judged not worth blocking on and are recorded here, grouped by item. Paths are relative to the repo root at the time of review; line numbers may have shifted after later merges.

### eng-1-ci
- `engines.node >=22.18` is also read by Vercel to pick the build runtime: an open range resolves to the newest supported major (24.x) and Vercel prints a will-auto-upgrade warning on every build. Low risk (Next 15 supports Node 24 and CI builds on 24), but an unreviewed side effect.
- `tests/package.json` (`type: module`) and `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON` both silence the same warning; the flag alone suffices, so `tests/package.json` is redundant.
- `tests/ci.test.ts` matches whole trimmed lines with inconsistent shapes (some include the leading dash, some do not); adding a `name:` label or quoting a command would fail the test without a real CI change.
- TDD evidence for the config-contract test is asserted, not visible in history, since test and change landed in one commit.

### eng-6-split
- `tests/sort.test.ts` exercises `compareBySort` only through `buyPrice` and `name`; the binder default sort with Trainer cards carrying null `pokedexNumber` and the boolean `owned` key are not locked.
- `updateFilters` always allocates a new `Filters` object, so a no-op patch re-renders and fires `router.replace` to an identical URL; not reachable from normal clicks on native inputs.

### eng-3-smoke
- Standalone, the branch's CI was red (Node 20 cannot import `lib/*.ts`); it is green after merging with eng 1. Noted so nobody reads a failing standalone check as a smoke regression.
- CLAUDE.md's Project Structure block was not updated for `scripts/smoke.mjs` and `scripts/lib/smoke.mjs`; only the Commands section mentions them.
- When port 3000 is taken by `npm run dev`, the script exits 2 with only `next start exited with code 1` and no pointer to `SMOKE_URL`/`SMOKE_PORT`.
- `buildPlan` sorts the default binder via `sortValue` (null to Infinity) to pick the first owned card, but no fixture has a null sort key, so the Trainer path is untested.

### design-1-mobile
- The active-tab scroll effect in `BinderTabs` is the one piece of JS and had no test at review time (the follow-up fix added four tests for the pure helper).
- The right-edge mask on `.binder-tabs` is unconditional, so the last ~20px of the final tab are permanently faded even when fully scrolled or when all tabs fit.
- `.table-wrap { overflow-x: auto }` makes the wrapper the scroll container on phones, so the sticky thead no longer pins to the viewport in table view on phones.
- On phones `.controls-secondary` is visually last but stays before the results in the DOM, so keyboard and screen-reader order differs from the visual order.
- Merge follow-up: Share/CSV/Needed now render below the results list and below the empty-state and all-binders line on phones; worth a glance on a real phone.

### design-2-focus
- The shared block sets `outline: none` and relies solely on box-shadow; in forced-colors mode (Windows High Contrast) box-shadow is dropped, so these controls lose their focus indicator.
- Focus and hover diverge on owned tiles: tabbing onto an owned tile swaps the green owned ring for the yellow hover glow, then snaps back on blur.
- After merging with design 7, print-page tabs carry two coinciding focus indicators (the `.print-page .binder-tab:focus-visible` outline and the `--ring` box-shadow).
- `tests/focus.test.ts` captures rules nested inside `@media` with their inner selector (a `@media print` rule would satisfy it) and requires exact selector spelling.

### design-3-type
- `<p className="binder-description">` renders unconditionally; an empty description leaves a blank muted paragraph under the h1.
- `.card-tile-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }` is inherited by the Japanese line, so long names truncate on grid tiles (pre-existing).
- The progress bar container has a visible label beside it but still only `aria-label="Collection progress"` with no role or value.

### design-4-empty
- The filter uses the raw search string while `emptyStateMessage` trims it, so a whitespace-only search shows the generic copy with a visually blank search box.
- Wanted only on a fully collected binder yields the generic "No cards match these filters." where the empty grid is actually good news.
- TDD covers the copy helper only; the rendered branch was verified by a one-off manual headless-Chrome check.
- CLAUDE.md's Current Features list does not mention the empty state or the `resetFilters()` seam.

### design-5-modal
- `.modal-content { padding-bottom: 0 }` in the 768px block applies even when the nav row is not rendered (single-result filter), so the details list sits flush against the modal's bottom edge.
- `.modal-nav-row .modal-nav-next { margin-left: auto }` and its comment rest on a wrong premise; the tracker passes both handlers or neither and wraps around, so a lone button never occurs.
- `.zoom-image { max-height: 95vh }` has the same large-viewport-unit issue the item fixed for the modal; the overlay was left on vh.
- `tests/modal-mobile.test.ts` asserts ordering, not containment, and hard-codes `@media (max-width: 768px)`.
- `.modal-close` is `position: absolute` inside the scrolling `.modal-content`, so on a phone it scrolls off the top; the smaller backdrop padding also shrinks the tap-outside-to-close area to 12px.

### design-7-print
- `lib/print.ts` uses a runtime import with an explicit `.ts` extension; at the time it was the first of its kind in `lib/` (the rarity item later made this the documented convention).
- Tests cover only the two pure URL helpers; nothing covers the `.ink-light` class landing on `.print-page`. The smoke plan is the natural place for a `?ink=1` URL.
- In ink-light mode `.ph-alt-tag` (red text and border) and the `.ph-thumb-fallback` grey dot are untouched.

### design-8-og
- CLAUDE.md's `lib/binders.ts` entry does not list `SITE_TITLE`/`siteDescription`/`ogAlt`, and nothing documents that layout and OG image derive from `data/binders.json`.
- Importing `binders` from `@/lib/data` pulls cards and purchases plus the `validateData` pass into the OG route and root layout.
- The one-row chip fit (~1080px of 1100px) is satisfied by inspection only; a renamed or fifth binder silently wraps.

### eng-2-minors
- CLAUDE.md line about `lib/data.ts` throwing was reviewed as stale at the time (it has since been updated to list the new validation cases; re-check after reading).
- The qty rule `item.qty != null && !(item.qty >= 1)` accepts a non-integer such as 1.5, which would produce a fractional `duplicateCount`.
- `getSortValue` is not exercised with a Trainer card (`pokedexNumber` null).

### eng-5-gate
- Kanto's Total outlay rises by 55.34 because the legacy shipment's total went from null to 55.34; a user-visible stat change under a validation-themed commit.
- `package.json` and CLAUDE.md conflicted at merge time (resolved by keeping both sides).
- `.githooks/pre-commit` calls `node` from the git process's PATH; GUI clients that do not inherit the nvm PATH fail with `node: not found` and block commits until `--no-verify`.
- `app/error.tsx` prints `error.message`, which Next redacts for server errors in production, so the line adds little.

### eng-7-growth
- At review time CI did not run `npm test`, so the real-data format lock only ran locally; eng 1 has since closed this gap.
- The refresh script header hard-codes figures copied from the spec (~98 bytes per snapshot, 313 per refresh, ~1.6 MB a year) that are already stale.
- `formatPrices` assumes every value is an array; `history.length` throws on a null entry (not reachable from the refresh script today).

### insight-1-value
- On a wants binder that owns an unpriced placeholder, the Value (N owned) label counts the unpriced cards and the vs paid sub-line subtracts their cost from a value that excludes them, understating the gain; harmless today since all Kanto owned cards are priced.
- The real-data invariants `marketValue <= budget` and `marketValueAllCopies >= marketValue` hold by construction and cannot catch a regression.
- The All binders summary title says "every owned card" but unpriced owned cards contribute nothing and only one copy per card is counted.
- The negative sub-line colour is a hard-coded `#e07070` while the rest of the stat-card palette uses CSS variables.

### insight-2-rarity
- The `rarity` URL value is applied without checking it exists in the binder; `?rarity=Foo` filters every card out with no visible cause (consistent with the unvalidated `set` and `type` params).
- At 640px and below `.rarity-togo` is hidden, so phone users lose the per-rarity to go figure.
- `tests/rarity.test.ts` pins floating-point noise (`0.30000000000000004`), so reordering the summation would fail the test for a non-bug.
- Master-set header copy grows long in one `<p>` and wraps awkwardly on narrow screens; `fmt0` has no thousands separator.

### workflow-2-needed
- Copy as text fails silently when `navigator.clipboard` is unavailable (plain-HTTP LAN) or denied; works on the HTTPS deploy.
- Wants rows keep nowrap/ellipsis in print, where 4 columns of ~47mm at 10pt put the longest Kanto labels at the truncation boundary.
- The lane doc introduced strikethrough headings and commit hashes in prose ("shipped in e0740ef"), a convention the other lanes did not use; hashes go stale on squash or rebase.
- Two added CLAUDE.md lines contain em-dashes, following the pre-existing tree-listing format.

### workflow-3-dupes
- `own=dupes` on a binder with zero extra copies initially fell through to the generic empty-state copy (fixed in the rebase with a dedicated message).
- The native `<details>` trade menu never closes on its own and the absolute panel has no right-edge clamp, so on a narrow phone it can extend past the viewport.
- Sorting trade rows by `setNumber` alone interleaves sets in a wants binder; a trade partner has to re-group by set.
- `buildTradeList` tests do not cover the duplicate-from-two-shipments path (the Kanto case) or the `code` tie-break.

### workflow-5-singles
- `showSinglesShortlist` leaves search, type, set and illustration filters as they are, so with `type=Fire` selected the table shows only the Fire subset while the tile prices the whole set. (The merged version resets to `EMPTY_FILTERS` plus `own: wanted`, which addresses this; verify.)
- The wants-binder text test uses only Pokemon with `pokedexNumber`; the Trainer null branch and `setNumber` tie-break are untested.
- Copy as text is shown whenever the Wanted filter is on, including when `filtered` is empty, in which case it copies `Need (0)`.
- The new `shortlist.ts` line in CLAUDE.md's lib block used a different separator than its siblings; the feature bullet does not mention the Trainer fallback.

## Suggested next steps

1. Review and merge this PR into `main`. Vercel will build on Node 24 (from `engines.node`); the kept CI build step already runs there.
2. Walk the dashboard, `/needed` and `/print` on a real phone: the mobile pass, modal nav row, empty state and tab strip were verified in headless Chrome at desktop widths only (desktop headless Chrome clamps windows to about 500px).
3. Open the first M6a booster box, then build collecting-workflow 1 (pull checklist mode) and collector-insight 4 (pack economics); both are blocked on real pull data.
4. Run `node scripts/refresh_prices.mjs` a second time, then collector-insight 3 (price movement) becomes possible; engineering 4 (weekly refresh as a GitHub Action) can follow once the manual run feels routine.
5. Collecting-workflow 4 (binder page view) is unblocked now that the tracker is split.
6. Design-usability 6 (rarity-aware tiles) needs a product call on which rarities get a frame; the rarity data and breakdown are in place.
7. Engineering 8 (`checkJs` for the scripts) is cheap housekeeping now that `scripts/lib/*.mjs` has grown to five modules.
8. Clear the deferred minors above in one or two small PRs, prioritising: the forced-colors focus fallback, the `.zoom-image` dvh fix, `modal-close` on phones, the `?rarity=` validation, the trade menu right-edge clamp, the hook's PATH note, and the stale figures in the refresh script header.
9. Housekeeping: `package.json` could gain `"type": "module"` to silence the typeless-package warning the smoke script prints, and the `tests/package.json` redundancy from eng 1 can be removed.
