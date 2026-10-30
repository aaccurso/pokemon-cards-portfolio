# Design critique, 2026-10-29

Reviewed against the production build at `http://localhost:3300` on 2026-10-29, at 1440x900, 768 and 390 CSS px
(device emulation via the design-taste inspector for the phone and tablet renders, plain headless Chrome for
desktop and A4). Screenshots cited below live in `critique-shots/`. Data facts quoted (31 wanted M6a cards,
11 of them over 10 EUR summing to 315,52 EUR; 69 wanted Kanto cards of which 3 are priced; 309 cards with two
price snapshots; no link to `/print` anywhere in `components/`) were computed from `data/*.json` and the source
on the same day.

## Verdict

This is a competent personal tool with one genuinely good idea (the grey Pokedex-silhouette treatment for cards
you do not own) wrapped in a stock dark-dashboard template: six identical yellow KPI tiles, a centred 32px yellow
title that repeats the tab above it, navy-on-navy surfaces, uppercase tracked table headers, and the accent colour
spent on everything so that nothing leads. For a collector standing at 134/165, the first screen should say
"31 to go, 375 EUR as singles, 11 of them are the expensive ones" and offer the shopping list in one click;
instead that information is scattered across a muted right-aligned "to go" column, a 13px sub-line, and a tile
grid where "Duplicates 0" and "Set value 620,97 EUR (165 priced)" get the same weight as the one number that
matters. The Kanto wants binder is worse: "To complete (est.) 109,04 EUR" is built from 3 priced cards out of 69
missing, and nothing on screen says so. The phone layout works mechanically but puts the first card roughly
770px down. The needed list and the printable placeholders are the most honest, best-designed surfaces in the
app, and the print page is not even linked from the dashboard.

## Top 10 changes

Ranked by impact for this collector. Effort: S under half a day, M a day, L several days.

1. **Make the master-set first screen answer "what is left and what does it cost".**
   Lead with `31 to go · 374,74 EUR as singles`, split into price bands (11 cards over 10 EUR = 315,52 EUR;
   20 cards under 10 EUR = 59,22 EUR), with "Buy as singles" as the one filled button. Demote the tiles.
   M. `critique-shots/m6a-grid-desktop.png`
   Status: shipped 2026-10-29 in 053142e.
2. **Stop lying on the wants binder.**
   "To complete (est.) 109,04 EUR" covers 3 of 69 missing cards. Show
   `69 to go · 66 still to choose a print · 3 chosen, 109,04 EUR` and make "to choose" the wants-binder lead.
   S. `critique-shots/kanto-grid-desktop.png`
   Status: shipped 2026-10-29 in 053142e.
3. **Replace the six-tile grid with one divided strip**
   of two lead figures (30px) and three or four secondary ones (20px), label above value, values in ink not
   yellow, zero tiles hidden, red reserved for actual bad news (not "value = 31%" on a binder built from booster
   boxes). M. `critique-shots/m6a-grid-desktop.png`
   Status: shipped 2026-10-29 in 053142e.
4. **Phone first screen.**
   Title 22px, tabs not clipped by the fade mask, stats as a six-line label/value list, one row of controls
   (search plus a Filters sheet) so the first card appears above 500px. M. `critique-shots/m6a-phone-fold.jpg`
   Status: shipped 2026-10-29 in 526a214.
5. **Table columns that earn their place.**
   Drop Language (every row says Japanese), drop Set on master-set binders (165 rows of "30th CELEBRATION"),
   add Rarity, sentence-case 12px headers, a visible sort affordance on every sortable header, and two-line rows
   on the phone instead of wrapping "7,94 EUR" and "m1L 064" onto two lines.
   M. `critique-shots/kanto-table-phone.jpg`, `critique-shots/m6a-singles-desktop.png`
   Status: shipped 2026-10-29 in 9ac9184.
6. **Rarity on tiles and in the modal.**
   AR / SAR / RR / Classic is what prices an M6a card and it appears nowhere on a tile. A small neutral chip
   beside `130/103`. S. `critique-shots/m6a-grid-desktop.png`
   Status: shipped 2026-10-29 in 1c64748.
7. **Link the tools and date the prices.**
   `/print` has no link from the dashboard at all; `/needed` hides behind a "☐ Needed" button among the exports.
   One quiet "Tools" row (Needed list, Placeholder sheets, CSV, Trade list) plus a `Prices refreshed 29 Oct`
   stamp beside the progress bar. S. `critique-shots/kanto-grid-desktop.png`
   Status: shipped 2026-10-29 in c615289 (accent follow-up f975046).
8. **Modal as a buying surface.**
   On a wanted card, "Open on Cardmarket · 78,72 EUR" is the primary button, not a link tucked into the Code
   row; show the two price snapshots you already have; on the phone cap the image at 45dvh so the facts are on
   the first screen. M. `critique-shots/m6a-modal-desktop.png`, `critique-shots/modal-phone.jpg`
   Status: shipped 2026-10-29 in feaafbb.
9. **Accent discipline and a neutral dark.**
   Yellow only on the active tab, the one primary action and the progress fill; stat values in `#f2f2f2`;
   ground `#141416` and surface `#1d1d21` instead of navy; dark text on the Electric, Ground, Ice, Steel, Normal
   and Fairy badges; no text-shadow. S. `critique-shots/m6a-grid-desktop.png`
   Status: shipped 2026-10-29 in cb7519b (bulk of the item in 677b336).
10. **Print sheet finishing.**
    Corner crop ticks outside each card, calibration folded onto sheet 1 beside the first six cards, the budget
    line in black, and the red PLACEHOLDER stamp lighter in normal mode. S. `critique-shots/print-m6a-sheet.png`

## 1. Visual hierarchy: what is important when

**Master set at 134/165** (`critique-shots/m6a-grid-desktop.png`). Reading order on the first screen is:
yellow tab pill, 13px "All binders" line, 32px yellow title (which repeats the tab 60px above it), a description
whose last word "165" orphans onto its own line, a progress bar, six rarity rows, six yellow tiles, a filter row,
then the cards.

The collector's question is answered only in the sixth rarity row (`Classic 15 / 30 · to go 261 EUR`) and in the
fourth tile (`374,74 EUR To complete as singles`). Those two are the biggest facts on the page and they are set
at 13px muted and 28px among five other 28px yellow figures.

The rarity breakdown is the right component in the wrong clothes: six equal rows with gradient bars, "to go 0 EUR"
printed for two rows that have nothing to go, the "to go" column muted and right-aligned where the eye arrives
last. The value-weighted progress (`value 246 / 621 EUR (40%)`) is the honest master-set figure and it sits as a
13px afterthought to the right of the bar.

Proposal, master set, desktop (1440 wide):

```
30th CELEBRATION   M6a · 165 cards                          Prices refreshed 29 Oct
134 of 165 · 81%   [=================================------------]   value 40%

31 to go                   374,74 EUR as singles             [ Buy as singles ]
11 cards over 10 EUR       315,52 EUR      Classic 15/30 · SAR 6/10 · AR 12/20
20 cards under 10 EUR       59,22 EUR      Futuristic 0/2 · RR 9/10 · C/U 92/93

Pulled value 246 EUR  ·  Outlay 795 EUR  ·  Set value 621 EUR  ·  Last shipment 29 Oct, 12 cards
```

The second block is the screen's answer at 30px; the third is one grey line at 14px. The rarity rows become an
inline list of `label owned/total` chips that still filter on click; rows at 100% lose their bar.

**Wants binder** (`critique-shots/kanto-grid-desktop.png`). A wants list bought as singles has three jobs:
decide which print to want for each Pokemon (66 undecided), buy the ones decided (3 at 109 EUR), and notice when
a chosen print's price moves. The first screen shows none of this.

- `83 / 152 Collected` is fine.
- `Spent on cards 754,64 EUR` and `Total outlay 925,07 EUR` are two spend figures 170 EUR apart with no word of
  explanation (shipping, fees, duplicate copies).
- `Value (83 owned) 1085,25 EUR · +330,61 EUR vs paid` is good and should lead.
- `Budget (86 priced)` means nothing to a reader; it is the sum of three wanted prices and 83 owned ones.
- `To complete (est.) 109,04 EUR` is the serious problem: with 66 of 69 wanted cards unpriced the honest line is
  `3 of 69 priced`, and the honest lead is `66 Pokemon still need a print chosen`.

**Tiles that earn their place.** Collected (both kinds), To complete with its count (both), Value with gain vs
paid (wants), Pulled value (master set, once the "distinct" line goes: at 0 duplicates it prints the same number
twice). Tiles that do not: Duplicates when 0 (hide, or fold into the Pulled value sub-line), Set value, Budget,
Spent on cards when Total outlay exists (keep outlay, show the card-only figure as its sub-line).
`StatsGrid.tsx` gives all six the same `.value` class; the strip needs a `lead` modifier and label-above-value.

Copy suggestions for the strip, in the collector's words:

- `31 to go` not `Collected 134 / 165` (the bar already says 134).
- `374,74 EUR to finish as singles` not `To complete as singles`.
- `66 prints still to choose` not `Budget (86 priced)`.
- `Worth 1 085 EUR, paid 755 EUR` not `Value (83 owned) +330,61 EUR vs paid`.
- `795 EUR spent, cards worth 31% of it` in grey, not `value = 31%` in red.

## 2. Information architecture and navigation

- **Tabs** (`BinderTabs.tsx`): pills with `owned / total` counts are good; the counts are the most useful thing in
  the header. The two tiny side binders (`1 / 1`, `3 / 3`) carry the same weight as the two real ones. Consider a
  muted "Side lists" group, or 12px pills once they are complete.
- **The h1 repeats the active tab.** `header h1` at 32px yellow, centred, 60px under a yellow pill with the same
  words. Keep one. The app-screen convention is a 22 to 24px left-aligned noun title; the tab row can be the
  title row.
- **"All binders" line** (`.binder-summary`, 13px muted): the only cross-binder figure in the app, phrased as
  `1390,15 EUR value vs 1734,13 EUR outlay` with no verdict. Write `All binders: 1 390 EUR of cards for
  1 734 EUR spent (80%)` at 14px.
- **`/needed` and `/print` discoverability.** `FilterBar.tsx` renders `☐ Needed` as the fourth export button;
  nothing anywhere links to `/print`. A collector who prints placeholder sheets has to know the URL. Add a "Tools"
  row under the controls: `Needed list · Placeholder sheets · CSV · Trade list (4)`, and from the needed page a
  "Print placeholders for these" link; both pages already share `BinderTabs`.
- **Needed list** (`critique-shots/needed-m6a-desktop.png`): the cleanest screen in the app and the only one the
  inspector passes with zero findings. It answers "what do I say to the seller" on one screen. It lacks only a
  price per number (sellers ask what you will pay) and a total; a "Copy with prices" variant covers both.
- **URL state** is exemplary: every filter, sort, view and the open card round-trip, defaults are omitted,
  unknown values fall back. Keep. The `↗ Share` button is redundant for a single-user tool whose address bar is
  already the state; demote or remove.
- **Empty Suspense fallback** (`app/page.tsx`): the first paint is a blank navy page. A static header skeleton
  costs nothing. The description orphan ("...cards 001 to" / "165") is a copy fix: "M6a, 165 cards".

## 3. Card grid and tiles

- **Owned versus unowned** (`critique-shots/m6a-wanted-desktop.png`): `filter: grayscale(0.95) brightness(0.55)`
  on unowned images, colour restored on hover and focus. The best decision in the app: it reads like the Pokedex
  silhouette, survives at thumbnail size, and the Wanted filter becomes a wall of grey that says "work to do".
  The green 2px ring on owned tiles (`.card-tile.owned .card-tile-image`) is a second signal for the same fact;
  drop it and let colour alone mean owned.
- **Holo and tilt** (`.card-tile-holo`, `.card-tile-shine`, `--rx/--ry`): fun on desktop, dead on a phone, and a
  repeating-gradient layer on every one of 165 tiles. Keep it behind `@media (hover: hover)`. The 500ms opacity
  reveal on scroll (`.card-tile { opacity: 0 }` until `is-revealed`) is a landing-page move; on a working screen
  it makes tiles appear late (6-second screenshots still caught half-faded cards). Remove it or cut to 150ms.
- **Duplicates badge** (`.copies-badge`): `x2` in a yellow outline pill beside the Pokeball. Legible, placed
  where the eye goes. Nothing to change.
- **Japanese names** (`.name-ja`, 0.75em at 70% opacity): good, correctly `lang="ja"`, does not fight the
  English. Keep.
- **Number labels.** `001/103` on a master set is faithful to the card and right for this collector; `#025` on a
  wants binder is right too. `No. 101` for a Trainer in a wants binder is the odd one out; use the set code.
- **Rarity is invisible on the tile.** The breakdown says SAR and Classic are where the money is, yet a tile gives
  no hint which of the 31 grey cards is a 78,72 EUR Lugia and which is a 0,31 EUR Mewtwo. Add `SAR` as an 11px
  neutral chip after the number, and the trend price under the name on wanted tiles.
- **Type badges**: saturated fills, white text, `text-shadow`. White on Electric `#F8D030` is 1.5:1; on Ground
  `#E0C068` 1.8:1. Dark text (`#1a1a1a`) on Electric, Ground, Ice, Steel, Normal, Fairy, Bug and Rock, or the
  pale-tint-with-dark-text pill already used for `ex`/`GX` (`.variant-badge`). Remove `text-shadow` everywhere.
- **Long names**: `.card-tile-name` is `nowrap` with ellipsis, so "Darkrai & Cresselia LEGEND" and "Team Rocket's
  Weezing" truncate at 180px. Allow two lines (`-webkit-line-clamp: 2`) and reserve the height.

## 4. Table view

(`critique-shots/m6a-singles-desktop.png`, `critique-shots/kanto-table-phone.jpg`, `critique-shots/singles-phone.jpg`)

- **Columns.** Own, #, Name, Type, Code, Set, Language, Variant, Buy price, Paid. Language is "🇯🇵 Japanese" on
  every row of every binder: a dead column. Set on the master set is "30th CELEBRATION" 165 times. Variant is
  empty for most rows. Rarity, the one field that explains the price order in the shortlist, is absent.
  Proposed: Own · # · Name (set as a grey sub-line on wants binders) · Type · Rarity · Code · Trend · Paid.
- **Singles shortlist** (wanted, by price desc): Paid is a column of dashes by definition. Hide it when
  `own=wanted` and show a footer total (`31 cards · 374,74 EUR`) so the shortlist reads as a quote.
- **Sorting affordances.** `thead th { cursor: pointer }` applies to every header including Type, Language and
  Variant, which do not sort (`CardTable.tsx` wires `onSort` on seven of ten). The indicator shows only on the
  active column, so nothing says the others sort. A 40%-opacity chevron pair on sortable headers, `cursor:
  default` on the rest.
- **Headers** are 11px uppercase tracked (`text-transform: uppercase; letter-spacing: 0.05em`): the template
  tell. 12px sentence case grey.
- **Owned rows** get a full-row green fill (`tr.owned`) on top of the Pokeball in the Own column: two signals for
  one fact, and on the Kanto table it produces a green-and-navy stripe pattern. Keep the Pokeball, drop the fill.
- **Numbers**: right-aligned tabular figures in `.price`, good. `#001` in muted grey is 4:1 against the surface;
  use `--text`.
- **The eye emoji** (`.preview-icon`) before every name is noise; the hover preview can trigger from the name.
- **Phone**: six columns squeezed into 374px. `7,94 €` wraps to two lines, `m1L 064` wraps, `Pikachu & Zekrom GX`
  takes three. Below 640px render two-line rows:

```
○  142/103  Lugia                                    78,72 EUR
            ルギア · Normal · SAR · M6a 142
●  005      Charmeleon  x2                  16,22 → paid 15,95
            リザード · Fire · sv2a 169 · Pokemon Card 151
```

## 5. Typography, colour, spacing, theme

- **Typeface**: the system stack. Legible, free, and exactly what every unstyled dashboard uses. If one change is
  allowed, pick a grotesk with tabular numerals and real weights; even on the system face, drop the yellow 700
  numerals to 500.
- **Sizes in use**: 9, 11, 12, 13, 14, 15, 16, 28, 32px. 59% of the text is under 13px (inspector). Nothing on a
  screen read daily should be under 12px: labels 13, data 14, title 24.
- **Colour**: `--bg #1a1a2e` and `--surface #16213e` are a navy theme, and navy fights the card art, which is the
  only colour that should matter. A true neutral dark lets the Pikachu yellow and the holo sheen be the colour on
  the page. The accent `#f8d030` is used on the active tab, every stat value, the h1, the progress fill, the Grid
  toggle, "Buy as singles", the Cardmarket link, the copies badge and the variant badges. Spend it on three
  things: active tab, primary action, progress fill.

Proposed tokens (drop-in for `:root` in `app/globals.css`):

```css
:root {
  --bg: #141416;          /* was #1a1a2e */
  --surface: #1d1d21;     /* was #16213e */
  --surface-hover: #242429;
  --border: #2a2a30;      /* was #2a3a5c */
  --text: #f2f2f2;        /* was #e0e0e0 */
  --text-muted: #9a9aa3;  /* 5.6:1 on --surface */
  --accent: #f8d030;      /* keep */
  --accent-ink: #1a1a1a;  /* text on accent */
  --radius: 6px;          /* was 4, 7, 8, 12, 16 */
  --radius-pill: 999px;
  --stat-value: 1.5rem;   /* was 1.75rem; lead figures 1.875rem */
}
```

- **Gradients**: progress and rarity bars fade yellow to green. One flat fill; the number beside it says how far.
- **Radii**: 4, 7, 8, 12, 16 and 999px across the page. Two: 6px for controls and tiles, 999px for tab pills.
- **Red**: `.stat-sub.negative` paints `value = 31%` red on the master set. Opening boosters is a known-loss
  activity the collector chose; red here is a nag. Red is for a price that fell below your target or a shipment
  with no total.
- **Spacing**: a consistent 1rem rhythm and one left edge; only the centred header breaks it. Left-align the title.

## 6. Empty, loading and edge states

- **Fully owned binder** (Eeveelutions 3/3): six tiles still render, including `To complete (est.) 0,00 EUR`,
  `+0,00 EUR vs paid` and `value = 61%` in red. A finished binder reads as a loss. When `wanted === 0`, replace
  the strip with one line, `Complete · 3 cards · paid 5,23 EUR · worth 5,23 EUR`, and hide the Wanted and
  Illustration controls.
- **Zero results**: dashed box, a sentence, "Clear filters". Right shape; the 40% yellow dot above it reads as a
  stalled spinner.
- **Trainer cards**: neutral grey badge, no Pokedex number; correct. Hide "Duplicates only" when `tradeCount === 0`.
- **Loading**: no skeleton, blank Suspense fallback, tiles fade in. Static header first, then the grid.

## 7. Mobile

(`critique-shots/m6a-phone-fold.jpg`, `critique-shots/kanto-table-phone.jpg`, `critique-shots/singles-phone.jpg`,
`critique-shots/modal-phone.jpg`)

- **Tabs**: a horizontal strip with a fade mask; the active "30th CELEBRATION 134 / 165" pill is clipped by the
  mask on first paint even though the strip scrolled to it. Fade only the side that overflows, and shorten
  labels on phones (`Pokedex 151`, `30th`).
- **Title**: 32px on a 390 screen, centred, plus a two-line description. 22px, left, description hidden.
- **Stats**: a 2x3 grid of tiles, 300px tall, with the same six figures. The first card appears at about 770px on
  the Kanto page and about 840px on the master set, which is the bottom of the screen. Collapse to a label/value
  list of four lines (about 90px) or two lead figures plus a disclosure.
- **Controls**: search, two selects, one more select plus the view toggle: three rows, four on the wants binder.
  One row (search, a "Filters" button opening a sheet with the selects, the view toggle); Share/CSV/Needed
  already move to the footer via `.controls-secondary { order: 1 }`.

```
390px, proposed first screen            390px, today
[Pokedex 151][Kanto evo][Eevee][30th]   [Pokedex 151 full-art 83/152][Kanto ev
30th CELEBRATION           refreshed    All binders: 1390,15 € value vs ...
134 of 165 · 81%                               30th CELEBRATION
[==================--------]            Full master set of the Japanese 30th
31 to go           374,74 EUR singles          anniversary expansion ...
[ search........ ][Filters][▦]          [=====------] 134 / 165 · 81% value...
[card][card]                            six rarity rows, six tiles, four rows
[card][card]                            of controls, first card at 840px
```

- **Grid**: two columns of 170px tiles; good. **Table**: see section 4; it is the weakest phone surface.
- **Modal**: the image takes the full first screen (`max-width: 340px` in a `1fr` column) and the facts begin
  below the fold. Cap the image at 45dvh and let the title sit beside it. The sticky prev/next footer and the
  44px close target are right.
- **Rarity rows** drop the "to go" column below 640px (`.rarity-togo { display: none }`), which removes the single
  most useful number on the phone. Drop the bar instead and keep `15 / 30 · 261 EUR`.

## 8. Print

(`critique-shots/print-m6a-sheet.png`)

- **Placeholder card**: number and set in the header, name with Japanese, a greyed thumbnail of the real card
  under a red PLACEHOLDER stamp, type badge, code, `≤ 0,38 EUR` as the budget, and ruled fields for Paid, Date,
  Seller, Notes. A well-designed object: it says which card belongs in the pocket and leaves room to log the
  purchase. Legible at 63x88 mm; the 2 mm field labels are small but the lines are long enough to write on.
- **Ink**: in normal mode every placeholder prints a 45% grey photo plus a 35% red stamp plus a saturated badge;
  31 cards is a lot of toner for throwaway cards. Ink saver (outline badge, no photo, grey stamp) is good and
  should be the default; or keep the photo at 25% and make the stamp an outline. The budget in `#2a6fdb` is the
  only colour that survives the ink saver; make it black.
- **Cutting**: cards sit 2 mm apart with rounded 1px borders and no crop marks. Cutting a rounded border by hand
  is slow; add 3 mm straight ticks at each corner outside the card and a dashed cut line between columns.
- **Calibration page**: right idea (50 mm ruler, 63x88 outline), but it takes a full sheet for a rectangle and a
  line, and the ticks carry no numbers. Put the ruler and outline on sheet 1 beside the first six cards, label
  the ticks 0/10/.../50. That turns 5 sheets into 4 for the current 31 cards.
- **Controls**: a seven-step print-dialog checklist in a yellow callout above the only blue filled button in the
  app. Keep the checklist (genuinely useful), set it in the same grey panel as the rest, and use the dashboard
  accent for the button so the two surfaces read as one product.

## 9. Usefulness gaps

Absent and wanted:

- **What to buy next and for how much**, as a quote: the singles shortlist exists, but without a total, price
  bands, or grouping that reduces shipping (one Cardmarket order for the 11 big cards, one for the 20 small).
  A footer total and a "Copy as Cardmarket want list" make the table a buying tool.
- **Freshness**: no date for the Cardmarket prices anywhere on screen; `data/prices.json` knows it.
- **Price movement**: 309 cards already have two snapshots. A `▲ 12%` beside the trend on wanted tiles and a
  two-point line in the modal would be the first use of that file.
- **Binder page and pocket**: 165 cards in 9-pocket pages is 19 pages; card 055 is page 7, pocket 1. One derived
  label (`p7 · 1`) on the tile, the needed list and the placeholder maps the data to the physical binder.
- **Recent activity**: "Last shipment 29 Oct · 12 cards · 195,46 EUR" under the progress bar; the purchases file
  has the dates and nothing on screen uses them.
- **Chosen-but-unbought on the wants binder**: `buyPrice != null && !owned` (3 cards) has no name in the UI
  except two combined filters. Call it "Chosen" and count it.

On screen and needed by nobody: the Language column; the Set column on master sets; "Set value (165 priced)";
"Budget (86 priced)"; "Duplicates 0"; "distinct 246,23 EUR" when it equals the line above; "Showing 165 of 165
cards" when no filter is active; the Share button; the eye emoji; the 3D tilt on touch devices; the scroll reveal.

## 10. Other observations

- Every `title=` tooltip in `StatsGrid.tsx` carries a definition that belongs on screen; tooltips do not exist
  on phones. Put a six-word version in the label.

## Keep as is

- The grey silhouette for unowned cards, with colour on hover and focus. The single best idea in the app.
- URL-backed state: every filter, sort, view and open card is a link, defaults are omitted, bad values fall back.
- The printable placeholder card as an object: number, set, name, Japanese name, ghost image, code, budget, and
  ruled fields. Finish it (crop ticks, ink), do not redesign it.
- The needed list: a plain numbered grid, owned numbers dimmed, secrets in their own block, one Copy as text.
- Binder tabs with `owned / total` counts, and the master-set `001/103` number label.
- Japanese names as a quiet second line under the English.
- Keyboard handling in the modal (Escape, arrows, wrap-around), the 44px close target and the sticky prev/next
  row on phones.
- The data layer's honesty: derived ownership, no stored `owned`, every shipment with a total, a validator that
  fails the build.
- The CSS Pokeball.
