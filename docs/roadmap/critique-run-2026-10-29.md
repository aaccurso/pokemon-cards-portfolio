# Design critique run, 2026-10-29

- Date: 2026-10-29 (gates rerun and report written 2026-10-30)
- Branch: `evening/critique-4-9` (branched from `main` at a4391de; `main` untouched)
- Source: `docs/roadmap/design-critique-2026-10-29.md`, Top 10 entries 4 to 9. Entries 1 to 3 shipped earlier in 053142e; entry 10 (print sheet finishing) was not in scope.
- Items attempted: 6. Merged: 6. Not merged: 0.
- Final gates on the merged branch at 526a214 (Node v24.22.1, Next.js 15, Chrome 156.0.8078.79):
  - `npm test`: 199 tests, 199 pass, 0 fail
  - `npx tsc --noEmit`: clean
  - `npm run build`: succeeded, static prerender of `/`, `/needed`, `/print`, `/opengraph-image`, `/icon.svg`, `/_not-found`
  - `SMOKE_PORT=3999 npm run smoke -- --require-chrome`: 11/11 pages passed
- Diff against `main`: 37 files, +1973 / -347.
- After screenshots (1440x900, `next start` on port 3998):
  - `critique-shots/after-m6a-2026-10-29.png`: `/?binder=m6a-30th`
  - `critique-shots/after-kanto-2026-10-29.png`: `/` (Pokedex 151 full-art)

Every item was implemented in its own worktree with a test written first, reviewed, fixed where the review raised an important finding, then merged into `evening/critique-4-9` with `--no-ff`. Each merge re-ran the full gate set in the main checkout. Because item 9 (accent discipline) landed first and added `tests/accent.test.ts`, three of the later items needed a small accent fix at merge time; each is noted under its item. Review minors that were judged not worth blocking on are listed at the end, grouped by item, so nothing from the reviews is lost.

## 7. Link the tools and date the prices
Status: merged in c615289, accent follow-up in f975046.

The dashboard has a quiet Tools row under the controls (Needed list, Placeholder sheets via `printHref`, CSV, Trade list when extra copies exist), rendered as text links in `FilterBar`. It replaces the old "Needed" export button and gives `/print` its first link from the dashboard; on phones it follows the Share button below the results so the first card does not move. A "Prices refreshed 29 Oct 2026" stamp sits beside the progress label, read from a new `data/meta.json` (`{ "pricesRefreshed": "2026-10-29" }`) that `lib/data.ts` imports and validates. `scripts/refresh_prices.mjs` writes that file in the same atomic write as `cards.json` and `prices.json`. New `lib/meta.ts` (pure: `latestCardmarketDate`, `fmtRefreshed`, `metaProblems`) backs a data test that fails if `meta.json` drifts from the newest cardmarket snapshot in `prices.json`; `tests/tools-row.test.ts` pins the markup, CSS and phone ordering. Verified in headless Chrome at 1440 (both binder kinds) and at 390.

Merge note: the branch had been merged by a previous run. Re-running the gates on the current head showed that `.tool-link:hover` and `.trade-menu[open] > summary.tool-link` still used `var(--accent)`, which the later crit-9 accent test rejects. Fixed in f975046 (hover and open-menu underline now `var(--text)`).

Rulings:
- The stamp reads "Prices refreshed 29 Oct 2026" with the year rather than the critique's "29 Oct". The file ages and a year-less date becomes ambiguous after a few months. Cost if wrong: one string in `fmtRefreshed` and one test expectation.
- The stamp sits in the existing `.progress` flex row after the progress label with a thin left divider, not on the title line as in the critique's ASCII proposal. The title line is owned by items 1 to 3 and 9 and the spec said "near the progress bar". Cost if wrong: move one span and a few CSS lines.
- The Tools row lives inside `FilterBar` as a full-width nav after `.controls-secondary`; Share and the contextual "Copy as text" stay as buttons in `.controls-secondary`. Smallest change that keeps the existing prop wiring and the dupes-ui and shortlist tests meaningful. The critique calls Share redundant but removing it is item 2 territory. Cost if wrong: delete one button later.
- On phones the Tools row takes the same `order: 1` as `.controls-secondary` (below the results). Item 4's goal is the first card above 500px, and a footer row is where Needed already lived. Cost if wrong: drop one phone rule.
- The Trade list keeps its details/summary dropdown with the two action buttons; only the summary is restyled as a tool link. Zero behaviour change for the trade export.
- No "Print placeholders for these" link was added to `/needed` (section 2 mentions it, Top 10 entry 7 does not). Cost if wrong: one Link in `app/needed/page.tsx`.
- `formatMeta` lives in `scripts/lib/prices.mjs` and `lib/meta.ts` holds the pure TS helpers; `lib/data.ts` throws on a malformed date via `metaProblems` rather than extending `validateData`'s signature. Cost if wrong: fold `metaProblems` into `validateData` later.
- No smoke expectation was added for the stamp or the tools links; the tools-row test and the data test already pin both. Cost if wrong: a few lines in `scripts/lib/smoke.mjs` and its test.

## 6. Rarity on tiles and in the modal
Status: merged in 1c64748.

A small neutral outlined chip (`.rarity-chip`, `--border` outline, `--text-muted` text, 11px) sits beside the number label on `CardTile` and in the `CardModal` Number row, showing the `rarityOrder` short label (SAR, AR, RR, Classic, Futuristic). Two pure helpers were added to `lib/cards.ts`: `rarityLabel(rarity)` maps a tcgdex rarity to its short label (raw string for unknown ones), and `tileRarity(card)` returns that label for the tile or null when the card has no rarity or is Common / Uncommon. Type badges are untouched. `tests/rarity-chip.test.ts` covers the helpers, tile markup order and condition, modal markup and the neutral CSS rule. Verified visually at 1440 (grid and modal) and at 1440/768/390: the chip fits on one line in the 170px phone tiles.

Rulings:
- The grid tile skips the chip for rarity "None" (Common / Uncommon) while the modal shows every rarity. 93 of 165 M6a cards are "None", so chipping them would stamp the same long label on most of the grid and defeat the critique's point (tell the 78 EUR Lugia from the 0,31 EUR Mewtwo). Cost if wrong: delete one condition in `tileRarity` and its test line.
- The modal chip goes inside the existing Number dd rather than a new Rarity row. The direction says beside the number label, and it keeps the dl one row shorter on phones. Cost if wrong: move one span into a new dt/dd pair.
- Chip font size 0.7rem (11px) instead of the 0.65rem first tried. The design-taste inspector fails text under 11px and the critique itself asked for an 11px chip.
- The chip carries `title={card.rarity}` with the full tcgdex label, a zero-cost disclosure of what SAR expands to on desktop. Cost if wrong: remove one attribute.
- `smoke.mjs` not changed; the chip adds a span inside existing markup and smoke passed unchanged.

## 5. Table columns that earn their place
Status: merged in 9ac9184.

New `lib/tableColumns.ts` drives the table's column set: Language and Variant are dropped, Set is hidden on master-set binders, Rarity is added, headers are sentence-cased 12px with a visible sort affordance on every sortable header, and the phone layout uses two-line rows (name line, then metadata line) so "7,94 EUR" and "m1L 064" no longer wrap mid-value. The smoke helper checks the table headers against `tableColumns`. The branch was first merged with the integration tip (93e2917) to pick up the badge ink and the accent gate; on that merged tree the accent test flagged `.th-sort:hover`, which was changed to `color: var(--text)` and pinned in `tests/table-columns.test.ts`. A leftover passing pin from the prior run (the phone Paid label follows the Buy price cell in DOM order) was committed as e30796e.

Rulings:
- Variant column dropped along with Language. The critique's proposed column list omits it and the variant is already a suffix of every card name (Charizard ex, Pikachu & Zekrom GX). Cost if wrong: one column entry in `lib/tableColumns.ts` and one cell case in `CardTable.tsx`.
- The price header stays "Buy price" rather than the critique's "Trend". On wants binders `buyPrice` is still a hand-set target for many cards and the CSV header is "Buy Price (EUR)". Cost if wrong: one label string.
- Rarity is not sortable. Sorting its label alphabetically is meaningless and a `rarityOrder` sort would need a new `SortKey`; the rarity filter and breakdown already cover the need. Cost if wrong: add a `rarity` `SortKey` and comparator later.
- The two-line phone rows use the existing 768px breakpoint instead of the critique's 640px, because the stylesheet and `tests/mobile.test.ts` already define the phone layer there. Cost if wrong: one media query value.
- Set and Rarity presence is decided from the whole binder, not the filtered rows, so the columns do not jump as filters change. Cost if wrong: pass the filtered list instead.
- The Japanese name stays as a second line inside the Name cell on phones rather than moving to the metadata line. Cost if wrong: a phone-only CSS rule or a small markup change.
- The set column header on the phone "Sort by" row and the "paid" label on line two are CSS-generated text (`::before`). This is a personal tool so the screen-reader cost was accepted. Cost if wrong: replace with visually hidden spans.
- Pre-existing inspector failures on the table pages (emoji in the view toggle and preview icon, badge text-shadow, Electric badge contrast) were left to items 7 and 9.
- Merge the integration tip into the branch rather than rebase, keeping the reviewed branch commits intact and giving one commit where the conflict resolution is visible and tested.
- Dropped the tip's `.card-table thead th:hover` rule in favour of `.th-sort:hover`, since only the sort buttons are interactive. Cost if wrong: a non-sortable header would not lift on hover, which is the intended affordance.
- Committed the prior run's uncommitted Paid-label pin rather than discard it; it was passing and scoped to item 5.
- Put both merge-time fixes inside the merge commit so the merge commit itself passes `npm test` and the accent gate.

## 8. Modal as a buying surface
Status: merged in feaafbb.

On a wanted card with a chosen print, "Open on Cardmarket · 25,00 €" is the modal's primary filled button (`.modal-buy`, accent fill with `--accent-ink` text), the price rows (Status, Trend price, Paid) moved to the top of the details list, and on phones the image is capped at 45dvh so name, button, Status and Trend price sit above the fold at 390x844. Owned cards and unpriced wants cards keep the quiet Cardmarket link in the Code row instead, so every card shows exactly one Cardmarket link. `cardmarketButtonLabel(buyPrice: number)` is a pure helper; `tests/modal-buying.test.ts` pins the button gate, the row order and the CSS. Review finding 1 (button shown on unpriced wants cards) was fixed in 678f4ec; finding 2 (`.modal-buy` outside the accent allowlist and a literal `#222`) was fixed in d76f459 after merging the integration branch into the feature branch to run the accent gate.

Rulings:
- The two price snapshots are not shown. `lib/data.ts` does not load `data/prices.json` and the task forbids importing it, so no snapshot data exists in the UI; the modal shows the trend and paid price it already has. Cost if wrong: a follow-up wires `prices.json` into the loader and adds a two-point line.
- The Code-row Cardmarket link is hidden on wanted priced cards and kept on owned cards. Keeping both on a wanted card would be two controls for one action. Cost if wrong: a one-line gate change.
- Price rows moved to the top of the details list and "Buy Price" renamed "Trend price". The value is the Cardmarket trend on every refreshed card; "Cardmarket trend" wrapped in the 110px label column.
- On phones only the image cap was done, not the critique's side-by-side title layout. The cap alone puts the facts above the sticky nav row at 390x844. Cost if wrong: an extra two-column rule in the 768px block.
- Page-level inspector failures (uppercase dt labels, holo gradients, text-shadow, badge contrast, h1 size) belong to items 3, 5, 6 and 9 and were left alone.
- Merged `evening/critique-4-9` into the feature branch rather than leaving the allowlist change as a merge-time note, because the accent gate only exists on the integration branch. The merge was conflict-free.
- The quiet Code-row link is the exact complement of the button gate (`owned || buyPrice == null`).
- `.modal-buy` is admitted to the accent allowlist as the one primary action in the modal, matching the rule's stated intent, rather than being demoted to ink.

## 4. Phone first screen
Status: merged in 526a214.

At 390px the title is 22px and left-aligned with the description hidden, the binder tabs scroll to the active pill and the fade mask is driven by `data-fade` (start, middle, end) computed in `lib/tabStrip.ts`, the stats strip stacks as a label/value list, the rarity completion rows become wrapping label plus owned/total chips, and the controls collapse to one row: the search box plus a Filters button that discloses the selects in a panel and shows a count badge when a deep link carries filters (`lib/filters.ts`, `activeFilterCount`). The first `.card-tile` lands above 500px on both binder kinds. `tests/phone-first-screen.test.ts` pins the rules. Review finding 1 (accent outside the crit-9 allowlist on `.filters-count`, `.rarity-row.active` and the open Filters toggle) was fixed inside the merge of the integration branch (f078dee): the badge is `var(--border)` fill with `var(--text)` ink and both outlines use `var(--text-muted)`.

Rulings:
- Rarity completion rows become wrapping label plus owned/total chips on phones (no bar, no to-go). The 188px rows alone put the first card past 500px on the master set, and the critique's section 1 proposal already calls for inline chips. Cost if wrong: the per-rarity euro figure stays absent on phones until a follow-up.
- Title left-aligned and description hidden on phones, not just 22px. The critique's section 7 says "22px, left, description hidden" and the description is a one-line repeat of the tab. Cost if wrong: one CSS rule each.
- The Filters disclosure is a button plus a panel with React state rather than a `<details>` element. A closed `<details>` cannot be forced open by CSS on desktop without a Chrome-only pseudo, while a div with `display: contents` keeps the desktop row identical and the selects stay in the server HTML for smoke.
- The panel starts closed even when a deep link carries filters; the button shows a count badge instead, so the cards are not pushed back down on exactly the links the item is about.
- The tab fade state is computed in JS (scroll and resize listeners writing `data-fade`) rather than CSS scroll-driven animations, because `animation-timeline` support on iOS Safari is too recent to rely on and a pure helper is testable.
- `tests/mobile.test.ts` lost its assertion that the phone search box is `flex-basis: 100%` and now asserts `flex: 1 1 0`; that rule is what the one-row controls replace.
- Tab labels were not shortened on phones. Not in the item's direction and it would need a second label field; the fade now handles the scrolling strip honestly.
- The Filters count badge is neutral rather than added to the accent allowlist: a filter count is status, not a call to action.
- The accent fix landed inside the merge commit so no commit on the branch carries a failing `tests/accent.test.ts`.

## 9. Accent discipline and a neutral dark
Status: merged in 677b336 (bulk) and cb7519b (follow-up commit 7718549).

Ground `#141416` and surface `#1d1d21` replace the navy; the accent is spent only on the active binder tab, the one primary action on a screen and the progress fill, plus keyboard focus rings; the h1, stat values and hover states are ink. `tests/accent.test.ts` parses `app/globals.css` and fails if a rule outside the allowlist uses the token, the hex or a literal tint. Badge ink is chosen by relative luminance (`relativeLuminance`, `badgeInk`, `BADGE_INK_LUMINANCE = 0.35` in `lib/cards.ts`) and applied inline by `typeBadges`, so Electric, Ice, Ground, Steel, Grass, Fairy, Bug, Normal and Rock get dark text with no text-shadow. The selected Grid/Table button is inverted (`--text` fill, `--bg` text) and its hover rule is scoped to `:not(.active)` so a hover on the neighbour cannot wash it out. `app/opengraph-image.tsx` hard-codes the same ground and surface.

Rulings:
- Keyboard focus rings keep the accent; they are an indicator, not decoration, and `tests/focus.test.ts` requires it.
- "Buy as singles" (`.stat-link`) stays accent as the one primary action on the master-set dashboard, and `.action-button.primary` / `.importer-actions button.primary` stay accent elsewhere.
- Rarity bar fills are neutral grey (`var(--text-muted)`) rather than flat yellow; six yellow bars under the progress bar would compete with it.
- `.tag-warn` (importer status tag) keeps the accent as a semantic status colour and is allowlisted, although no component currently renders it.
- Badge ink is carried by `typeBadges()` and applied as an inline style rather than a CSS attribute selector, since React serialises inline colours differently on server and client.
- The print placeholder badge and the print page palette are unchanged; item 10 owns print finishing.
- The OG title stays accent yellow as the one accent on that image.
- The modal Cardmarket link became an ink link with a muted underline, since item 8 turns it into the primary button.
- The dead `.owned-checkbox` accent declaration was removed instead of allowlisted.
- Inverted fill for the selected view button rather than a neutral fill plus inset underline: smallest change that no hover lift can approach.
- Badge ink threshold 0.35, not the mathematically balanced crossover near 0.20. It reproduces exactly the dark-ink types the critique names plus Grass, while leaving Fire (0.342) and Flying (0.346) white. Cost if wrong: lowering `BADGE_INK_LUMINANCE` to 0.30 flips them and is a one-constant change.
- Rock also moves to dark ink; it is lighter than the threshold and the critique body lists it.
- Both review findings were committed together in 7718549 because both add tests to `tests/accent.test.ts`.

## Did not land

Nothing. All six items merged. Top 10 entry 10 (print sheet finishing) was out of scope for this run and remains open; entries 1 to 3 had already shipped in 053142e.

## Deferred minors from reviews

### Item 7, tools and date
- `app/globals.css` around line 296: the dot separator is a `::before` on the tool element itself (the Link, the CSV button, the details), so it renders inside the control: the underline and the focus ring extend under the dot and its margin, the dot joins the link's accessible name and click target, the Trade list dropdown anchors to the dot rather than the text, and when the centred row wraps on a 390px phone a line can start with an orphan dot.
- `CLAUDE.md`: "validateData in lib/binders.ts is the single checker" is no longer true; `metaProblems` in `lib/meta.ts` is a second checker that `lib/data.ts` and `tests/data.test.ts` also run.
- `CLAUDE.md`: five added or rewritten lines use em-dashes, following the file's existing list convention.

### Item 6, rarity chip
- `components/CardTile.tsx`: section 3 of the critique also asks for the trend price under the name on wanted tiles; only the chip shipped. Within the 30 Classic Collection cards the chip still cannot tell the 78 EUR Lugia from a 2 EUR Classic. Top 10 entry 6 names only the chip, so this is a scoping gap.
- `components/CardModal.tsx`: the modal chip carries `title={card.rarity}` for every rarity, so the 93 Common / Uncommon cards show a chip reading "Common / Uncommon" whose tooltip says "None", the raw tcgdex token.
- `lib/cards.ts`: `tileRarity` decides which rarity to hide by comparing against `rarityOrder[0].rarity`, coupling a display filter to the array's display order; a unit test would catch a reorder. `tileRarity(card)` is also evaluated twice per tile render.
- `CLAUDE.md`: the edited `cards.ts` entry keeps the list's em-dash separator.

### Item 5, table columns
- `components/CardTable.tsx`: on the M6a master set 93 of 165 rows show "Common / Uncommon" in the new Rarity column and on the phone metadata line, a column of repeated text in miniature; the tile already treats "None" as not worth a chip.
- `app/globals.css` 768px block: the `.hide-mobile` rule is now dead; `CardTable` was its only consumer.
- `components/CardTable.tsx`: every M6a card has a `nameJa` and `.name-ja` is `display: block`, so on the phone every "two-line" row is three lines (name, Japanese name, metadata).
- `CLAUDE.md`: the new `tableColumns.ts` line uses the list's em-dash separator.

### Item 8, modal buying
- `components/CardModal.tsx`: "Trend price" and "Open on Cardmarket · 25,00 €" are not strictly true for the 7 priced cards without a `tcgdexId` (haunter, slowbro, goldeen, aerodactyl-gx, alolan-sandslash-gx, blastoise-ex on kanto-151; leafeon-v on eeveelutions); the refresh skips them, so their `buyPrice` is a hand-set target.
- `app/globals.css` phone block: `.modal-placeholder` gets `max-height: 45dvh` but keeps `width: 100%` and `aspect-ratio: 63 / 88`; when the cap bites the dashed placeholder becomes a squat landscape box. Only visible when a card has no image or the image fails to load.

### Item 4, phone first screen
- `app/globals.css` phone block: the new rules are bare element selectors (`header`, `header h1`) and `/needed` also renders a `<header>`, so on phones the needed page's title and summary flip from centred to left while the number blocks stay centred.
- `app/globals.css`: the phone rarity chips drop both the bar and the per-rarity to-go figure; the critique's section 7 wanted the to-go kept ("Drop the bar instead and keep 15 / 30 · 261 EUR"). Below 640px the to-go was already hidden, but the 640 to 768px band loses a figure it had. The chips are also about 24px tall as the only tappable filter on the first screen.
- `components/BinderTabs.tsx`: the strip is scrolled to the active tab and `data-fade` is set in a passive `useEffect`, so on a deep link to the last binder the first painted frame can still show the right-edge fade over the active pill for a frame.
- `CLAUDE.md`: the `FilterBar.tsx` line still describes a flat row of selects and does not mention the Filters disclosure, the panel or `activeFilterCount`; the two added lib lines use em-dashes.
- `tests/phone-first-screen.test.ts`: the acceptance criterion (first `.card-tile` above 500px at 390px) is verified by hand only; the tests pin CSS declarations as text. The smoke harness could emulate a 390px viewport.

### Item 9, accent discipline
- `tests/accent.test.ts`: `.tag-warn` is allowlisted and keeps the accent although no component renders it, while the equally dead `.owned-checkbox` was deleted; CLAUDE.md's "three things only" sentence does not mention it or `.importer-actions button.primary`.
- `tests/accent.test.ts`: the guard only parses `app/globals.css`. An inline `style={{ color: "#f8d030" }}` in a component or a new accent use in `app/opengraph-image.tsx` would pass.
- `app/globals.css`: the owned tints (`--owned-bg #1a3a2e`, `--owned-border #2a5a3e`, literal `#1e4535` row hover) were mixed for the navy ground and not revisited; on the neutral surface the green row fill is the only tinted surface on the table. The critique wants that fill dropped (section 4); the literal hover colour should at least become a token.

## Suggested next steps

1. Review and merge `evening/critique-4-9` into `main` through the draft PR; Vercel will deploy it.
2. Top 10 entry 10, print sheet finishing (corner crop ticks, calibration on sheet 1, black budget line, lighter PLACEHOLDER stamp). It is the one remaining Top 10 item and item 9 deliberately left the print palette alone.
3. Trend price under the name on wanted tiles (critique section 3), the half of item 6 that did not ship; it is the only way to separate the 78 EUR Lugia from a 2 EUR Classic on the grid.
4. Wire `data/prices.json` into `lib/data.ts` and show the two price snapshots in the modal (item 8 ruling 1); this also unblocks the "price history is captured but not visualized" limitation.
5. Clean-up pass on the deferred minors: move the tool-row dot separator out of the controls, drop the "None" tooltip on the modal chip, delete `.hide-mobile`, tokenise the `#1e4535` row hover, scope the phone `header` rules to the dashboard, and make the accent guard also read the component files.
6. Bring the per-rarity to-go figure back on phones as a third chip, per critique section 7.
7. Update CLAUDE.md: the `FilterBar.tsx` line (Filters disclosure, panel, `activeFilterCount`), the "single checker" sentence, and the accent allowlist members (`.modal-buy`, `.tag-warn`, `.importer-actions button.primary`).
8. Add a 390px viewport page to the smoke harness that asserts the first `.card-tile` top is under 500px, turning item 4's acceptance criterion into a gate.
