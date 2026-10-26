# Roadmap lane: design and usability

## Lane summary

The current look (dark navy, yellow accent, type colours, 3D holo tiles, silhouette treatment for wanted cards) is liked and should stay; this lane proposes refinements to it, not a restyle. The two biggest gaps found in `app/globals.css` are a single `768px` breakpoint that leaves phones with a one-column stats grid and four rows of controls above the fold, and a complete absence of `:focus-visible` rules on the newly added pills and tabs. Everything else is small polish: the Japanese name line, empty states, the modal on phones, the print page now that it hosts binder tabs, an ink-light print mode, rarity-aware tiles, and OG metadata that still says "Pokédex 151 full-art" while there are four binders. Widths below assume the mobile container inner width of viewport minus 16px (`.container { padding: 1rem 0.5rem }`).

---

## 1. Mobile pass: stats grid, controls row, tab strip, table
Status: shipped 2026-10-23 in 77b411b.

**Problem.** Only one breakpoint exists (`@media (max-width: 768px)`, line ~1709). Consequences on a phone:

- `.stats-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) }` needs 376px for two columns. Any phone narrower than 392 CSS px (iPhone SE and 12/13 mini at 375, most 360px Androids) gets **one column of six stat cards**, roughly 540px of scrolling before the controls. Between ~860px and ~1190px window width (iPad landscape, half-screen desktop) the grid fits 4 or 5 columns and the sixth card sits alone as an orphan row.
- `.controls`: `input { min-width: 200px }`, `select { min-width: 140px }` produce four rows on a 359px inner width (input + type, set + ownership, pill + view toggle, Share + CSV). At 200px the search field clips its own placeholder "Search by name, code, or set...".
- `.controls input, .controls select { font-size: 0.9rem }` is 14.4px; iOS Safari zooms the page on focus for any field under 16px. This is the most annoying mobile bug and is one line to fix.
- `.binder-tabs { flex-wrap: wrap }` with four pills including counts ("Pokedex 151 full-art 12 / 151") wraps to two or three rows, then `header h1` repeats the active binder name directly below.
- `.card-table` already hides four columns via `.hide-mobile`, but `.preview-icon` (the eye emoji) still renders in every Name cell even though `.preview-tooltip { display: none }` on mobile makes it do nothing. There is no horizontal-scroll wrapper, so a wide row pushes the whole page sideways.

**Proposed approach.** Keep one file, add two breakpoints and a few variables.

```css
:root { --stat-pad: 1.25rem; --stat-value: 1.75rem; }
@media (max-width: 1190px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
  .stat-card { --stat-pad: 0.85rem; --stat-value: 1.35rem; }
  .controls input, .controls select { font-size: 16px; }   /* no iOS zoom */
  .controls input { flex-basis: 100%; }
  .controls select { flex: 1 1 40%; min-width: 0; }
  .preview-icon { display: none; }
  .binder-tabs { flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x proximity;
                 scrollbar-width: none; margin-inline: -0.5rem; padding-inline: 0.5rem;
                 mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
  .binder-tab { flex: 0 0 auto; scroll-snap-align: start; }
}
```

Wrap the table in `<div className="table-wrap">` with `overflow-x: auto` (markup change in `PortfolioTracker.tsx`). Move Share and CSV out of `.controls` into the `.results-count` footer row on mobile only (`order` + a `.controls-secondary` wrapper), which turns four rows into two.

```
 phone, after              phone, today
 [tabs ----------> ]       [tab][tab]
 30th CELEBRATION          [tab][tab]
 97 / 165 · 59%            30th CELEBRATION
 [====------]              97 / 165 · 59%
 [ 97/165 ][ 123 € ]       [====------]
 [  12    ][ 45 € ]        [   Collected    ]
 [ 980 €  ][ 1.1k €]       [ Spent on cards ]
 [ search............ ]    [   Duplicates   ]
 [Types][Sets][Cards ]     [  To complete   ]
 [ grid starts here ]      [   Set value    ]
                           [  Total outlay  ]
```

**Effort.** M: half a day of CSS plus two small markup wrappers, then checking on two real phones.
**Dependencies.** None. Do before item 5 (modal) so both share the breakpoint variables.
**Open questions.** (1) Is 2 columns of stat cards acceptable, or would you rather hide "Total outlay" and "Budget" on phones? (2) Tab strip: scroll horizontally (proposed) or drop the counts below 480px and keep wrapping?

---

## 2. Focus states on tabs, pills and tiles
Status: shipped 2026-10-23 in 9bf9ef9.

**Problem.** `grep focus` in `globals.css` finds rules only for `.controls input/select` (outline removed, border recoloured), `.card-tile:not(.owned):focus-visible` (restores colour, no ring), `.card-name-cell:focus-visible` (`outline: none`, faint background) and `.modal-close`. `.binder-tab`, `.pill-toggle`, `.view-toggle button`, `.action-button`, `.modal-nav`, `.print-btn` and `.card-tile` itself all fall back to the browser's default ring, which on an active yellow pill (`.binder-tab.active { background: var(--accent) }`) is nearly invisible in Chrome and clipped by `border-radius: 999px` in Safari.

**Proposed approach.** One shared rule using the double-ring technique so it reads on both dark surfaces and the yellow active state:

```css
:root { --ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent); }
.binder-tab:focus-visible, .pill-toggle:focus-visible, .view-toggle button:focus-visible,
.action-button:focus-visible, .modal-nav:focus-visible, .card-tile:focus-visible {
  outline: none; box-shadow: var(--ring);
}
.card-tile:focus-visible .card-tile-image { /* reuse the hover glow */
  box-shadow: 0 18px 40px rgba(0,0,0,.55), 0 0 24px rgba(248,208,48,.25);
  border-color: rgba(248,208,48,.5);
}
.card-name-cell:focus-visible { box-shadow: var(--ring); }
```

`.card-tile` has `transform-style: preserve-3d` and no `overflow: hidden`, so a box-shadow ring on the button is safe. `.print-btn` on the light print page needs its own ring colour (`#2a6fdb`).

**Effort.** S: 20 lines of CSS, one keyboard walk through the page.
**Dependencies.** None.
**Open questions.** None.

---

## 3. Typography with the Japanese line, and the header tagline
Status: shipped 2026-10-23 in 50531fd.

**Problem.** `.name-ja { display: block; font-size: 0.75em; opacity: 0.7 }` is applied inside four very different parents:

- `.card-tile-name` (0.9rem, `white-space: nowrap`): Japanese renders at ~10.8px. Fine, but `nowrap` is inherited so long names like "アローラ ナッシー" truncate with the ellipsis of the parent.
- `.modal-info h2` (1.6rem, `color: var(--accent)`): the Japanese line inherits the yellow and renders at 19px, louder than every label in `.modal-details dt`. It reads as a second title, not a subtitle.
- Table `<strong>`: 0.85rem × 0.75 ≈ 10px, the smallest text on the page.
- `.placeholder-card .name-ja { font-size: 7pt }` on print: fine.

The span has no `lang="ja"`, so browsers pick CJK glyphs via Han unification heuristics; on Windows this can produce Chinese-style glyph forms. Separately, `binder.description` is only exposed as a `title` tooltip on tabs; the `header p` line ("97 / 165 cards collected · 59%") duplicates both the tab count and the "Collected" stat card.

**Proposed approach.**

- Add `lang="ja"` to every `.name-ja` span (CardTile, CardModal, PortfolioTracker table, PlaceholderCard). Add `.name-ja { font-family: -apple-system, "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif; }`.
- `.modal-info h2 .name-ja { color: var(--text-muted); font-size: 1rem; font-weight: 400; margin-top: 2px; opacity: 1 }`.
- `.card-table .name-ja { font-size: 0.72rem }` (floor the table at ~11.5px).
- Header: `header p` shows `binder.description` (max-width 36rem, 0.95rem, muted). The owned/total/percent line moves to a small label on the progress bar (`.progress-label`, right-aligned, 0.8rem) so the number is still above the fold once, not three times.

```
   30th CELEBRATION
   Full master set of the Japanese 30th anniversary expansion (M6a)
   [==========---------]                       97 / 165 · 59%
```

**Effort.** S: four one-attribute markup edits and ~15 lines of CSS.
**Dependencies.** None; pairs well with item 1 since both touch the header area.
**Open questions.** (1) Keep the yellow for the Japanese line in the modal (brand) or go muted (hierarchy)? Proposal is muted.

---

## 4. Empty states: zero results and a binder with zero owned
Status: shipped 2026-10-23 in 7ee85ad.

**Problem.** When filters produce no matches, `.card-grid` renders as an empty element and the table renders a header row with nothing under it. The only feedback is `.results-count` ("Showing 0 of 165 cards") in 0.8rem muted text at the bottom. A binder with zero owned cards (Kanto evolutions, Eeveelutions today) is actually fine: the silhouettes are the design, the bar is an empty track, and the stats are honest zeros. No change needed there beyond item 3's tagline, which gives those pages a sentence of purpose.

**Proposed approach.** Render an `.empty-state` block in place of the grid or table when `filtered.length === 0`:

```
 ┌───────────────────────────────────────┐
 │               ●  (reuse               │
 │        .placeholder-pokeball)         │
 │   No cards match these filters.       │
 │          [ Clear filters ]            │
 └───────────────────────────────────────┘
```

```css
.empty-state { display: grid; place-items: center; gap: 0.75rem; padding: 3rem 1rem;
  border: 1px dashed var(--border); border-radius: 12px; color: var(--text-muted); }
```

"Clear filters" reuses `.action-button` and calls the same reset block already in `selectBinder()` (extract it to `resetFilters()`). Copy varies by cause: search text present ("No cards match 'pikachu'"), "Owned only" on a binder with 0 owned ("Nothing owned yet in this binder").

**Effort.** S: one component branch, one helper, 10 lines of CSS.
**Dependencies.** None.
**Open questions.** None.

---

## 5. Card modal on small screens
Status: shipped 2026-10-23 in f7361bd.

**Problem.** At ≤768px `.modal-content` collapses to one column, but `.modal-nav-prev/next` stay `position: absolute; top: 50%; left/right: 0.5rem` inside the scrolling `.modal-content`. In a stacked layout that is somewhere over the details list, 32px into the text (content padding is 1.25rem, buttons are 44px wide), and it scrolls away with the content. `max-height: 90vh` uses the large viewport unit, so with the iOS URL bar visible the bottom of the modal can sit under the toolbar. `.modal-backdrop { padding: 1.5rem }` leaves 311px for content on a 359px inner width, which is fine.

**Proposed approach.** Move the two nav buttons into a `<div className="modal-nav-row">` placed after `.modal-info` in `CardModal.tsx`. Desktop: `.modal-nav-row { display: contents }` so the existing absolute positioning is untouched. Mobile:

```css
@media (max-width: 768px) {
  .modal-content { max-height: 90vh; max-height: 90dvh; padding-bottom: 0; }
  .modal-backdrop { padding: 0.75rem; }
  .modal-nav-row { display: flex; justify-content: space-between; position: sticky; bottom: 0;
    margin: 0 -1.25rem; padding: 0.6rem 1.25rem; background: var(--surface);
    border-top: 1px solid var(--border); }
  .modal-nav { position: static; transform: none; }
}
```

```
 ┌────────────────────────┐
 │ [x]                    │
 │   ┌──────────────┐     │
 │   │  card image  │     │
 │   └──────────────┘     │
 │ Pikachu                │
 │ ピカチュウ               │
 │ [Electric]             │
 │ NUMBER   025/103       │
 │ ...                    │
 ├────────────────────────┤  <- sticky
 │ [‹]               [›]  │
 └────────────────────────┘
```

**Effort.** M: small markup move, 20 lines of CSS, but needs testing with a long details list and the zoom overlay.
**Dependencies.** Item 1 (shared breakpoint). A swipe gesture is behaviour, out of this lane; note as a follow-up.
**Open questions.** (1) Should the modal become a bottom sheet on phones (slide up from bottom, rounded top only)? It is a nicer feel but more CSS; the sticky nav row works with either.

---

## 6. Rarity-aware tiles

**Problem.** `rarity` exists on all 165 M6a cards (93 None, 30 Classic Collection, 20 Illustration rare, 10 Special illustration rare, 10 Double rare, 2 Futuristic Rare) but is only used in the CSV export. In the grid every card gets the same `.card-tile-holo` (hover opacity 0.55) and the same frame. The ownership channel is already fully occupied by the border: `.card-tile.owned .card-tile-image` has a green border plus a 2px green ring, and unowned images are grayscale via `filter` on the `img`, not the container. Any coloured rarity frame would therefore stay saturated on an unowned grey card and read as "owned-ish". Also 62 of 165 cards (38%) carry a non-None rarity; if all of them get a frame, nothing reads as special.

**Proposed approach.** Keep border and ring for ownership only. Express rarity through the holo layer (intensity) and a tiny text chip in the footer row, driven by a `data-rarity` tier attribute:

- `lib/cards.ts`: `rarityTier(c): 0 | 1 | 2` where tier 2 = Special illustration rare and Futuristic Rare (12 cards), tier 1 = Illustration rare and Classic Collection (50 cards), tier 0 = everything else and all cards without the field (kanto-151 unchanged).
- `CardTile.tsx`: `data-rarity={tier}` on the button; `<span className="rarity-chip">SIR</span>` after the type badges when tier > 0 (labels SIR, FR, IR, CC).

```css
.card-tile { --holo-hover: 0.55; --holo-idle: 0; }
.card-tile[data-rarity="1"] { --holo-hover: 0.7; }
.card-tile[data-rarity="2"] { --holo-hover: 0.85; --holo-idle: 0.14; }
.card-tile.owned .card-tile-holo { opacity: var(--holo-idle); } /* idle sheen only when owned */
.card-tile:hover .card-tile-holo { opacity: var(--holo-hover); }
.rarity-chip { font-size: 0.6rem; letter-spacing: 0.08em; padding: 1px 4px; border-radius: 3px;
  border: 1px solid currentColor; color: var(--text-muted); }
.card-tile[data-rarity="2"] .rarity-chip { color: var(--accent); }
```

Unowned cards keep idle 0, so the grey silhouette is never lit; the chip is the only rarity cue there, which is correct (you do not own it yet). Phones have no hover, so the chip and the tier-2 idle sheen are what they see. Add a "Rarity" row to `.modal-details` (one `dt/dd`).

```
 ┌──────────┐        ┌──────────┐
 │  image   │        │ image ~~ │  <- faint rainbow at rest (owned SIR)
 │          │        │ ~~    ● │
 └──────────┘        └──────────┘
 025/103             126/103
 Pikachu             Mew ex
 ピカチュウ            ミュウex
 [Electric]          [Psychic] [SIR]   (●)
```

**Effort.** M: one helper, one attribute, one chip, ~20 lines of CSS, then eyeballing the 0.14 idle value on real owned SIR images (color-dodge over photos can blow out).
**Dependencies.** Items 1 and 2 first so the chip is tested on mobile and the tile has a focus ring.
**Open questions.** (1) Is Classic Collection "special" to you, or just a numbering range? (2) Should tier 2 glow at rest or only on hover? (3) Chip labels: abbreviations (SIR/IR/CC/FR) or full words on desktop?

---

## 7. Print page: controls layout with tabs, and an ink-light variant
Status: shipped 2026-10-23 in 9d95218.

**Problem.** `BinderTabs` was dropped into `.print-controls-actions` (a `space-between` flex row with the checkbox and the blue button). Four dark pills (`.binder-tab { background: var(--surface) }` is navy) now sit inside the white `.print-controls` card on the light `#f4f4f4` page; they wrap because the card is 780px wide and the tabs need ~800px, which pushes the checkbox and button onto odd rows. The tabs still look like the dark app, not like the light print page. For ink: `.ph-thumb img { filter: grayscale(1) opacity(0.45) }` prints a 50x50mm grey photo on every card, nine per sheet; type badges print solid colour; `.ph-watermark` prints red at 0.35. The instructions tell the owner to enable "Background graphics" manually because `print-color-adjust` is never set.

**Proposed approach.**

Layout: give the tabs their own row directly under `.print-controls-header`, before the instructions, and re-skin them in the light context:

```css
.print-page .binder-tabs { margin: 0.5rem 0 0; }
.print-page .binder-tab { background: #fff; border-color: #d0d0d0; color: #444; }
.print-page .binder-tab:hover { border-color: #888; }
.print-page .binder-tab.active { background: #2a6fdb; border-color: #2a6fdb; color: #fff; }
```

```
 ┌────────────────────────────────────────────────────────┐
 │ 30th CELEBRATION placeholder cards                     │
 │ 68 cards · 9 sheets · each card 63x88 mm               │
 │ (Pokedex 151 12/151) (Kanto evo 0/40) (Eevee 0/9) (30th 97/165) │
 │ ┌ Before printing ... ┐                                 │
 │ [x] Include owned   [ ] Ink saver      [Print / Save PDF] │
 └────────────────────────────────────────────────────────┘
```

Ink saver: a second checkbox, persisted as `?ink=1`, toggles `.print-page.ink-light`. Geometry never changes; only colour and visibility:

```css
.ink-light .ph-thumb img { display: none; }           /* dashed box + watermark remain */
.ink-light .ph-thumb { background: #fff; }
.ink-light .placeholder-card { border-width: 0.3mm; }
.ink-light .ph-watermark { color: rgba(0,0,0,.3); border-color: rgba(0,0,0,.3); }
.ink-light .ph-type-badge { background: none !important; color: var(--badge); border: 0.25mm solid var(--badge); text-shadow: none; }
```

The last rule needs `PlaceholderCard.tsx` to set `style={{ "--badge": b.color, background: "var(--badge)" }}` instead of a hard-coded inline background, so the class can override it. Also add `.placeholder-card { print-color-adjust: exact; -webkit-print-color-adjust: exact; }` so the badge colours and watermark print without the manual "Background graphics" step, and shorten the instruction list by one line.

**Effort.** M: markup reorder, one checkbox with URL state, ~30 lines of CSS, one test print of a single sheet in each mode.
**Dependencies.** None. The page is desktop-only in practice; do not spend time making the 193mm sheet preview fit a phone.
**Open questions.** (1) In ink-light mode, keep the Japanese name line? It costs nothing in ink, so proposal is yes. (2) Should ink-light also drop the "PLACEHOLDER" watermark entirely for a cleaner test print?

---

## 8. OG image and title for several binders
Status: shipped 2026-10-23 in daef75d.

**Problem.** `app/opengraph-image.tsx` hard-codes "Pokédex 151 full-art" and the alt text "Japanese Pokémon TCG wishlist tracker". `app/layout.tsx` titles the site "Pokémon card binders" (good) but its description enumerates exactly two binders while `data/binders.json` has four. Sharing a `?binder=m6a-30th` link produces a 151 card.

**Proposed approach.** Smallest fix first: derive text from data. In `opengraph-image.tsx` import `binders` from `@/lib/data`, keep the Poké Ball, set the headline to "Pokémon card binders" and render one row of pill chips (`binders.map(b => b.name)`) in the muted colour underneath. In `layout.tsx` build `description` from `binders.map(b => b.name).join(", ")`. Update `alt`. Per-binder OG images are possible via `generateMetadata({ searchParams })` in `app/page.tsx` plus an `app/og/route.tsx?binder=`, but that makes the home route dynamic for a feature that only matters when a link is shared; defer unless sharing becomes a habit.

**Effort.** S for the data-derived version; M for per-binder images.
**Dependencies.** None. Verify with the Vercel deployment preview, as `next/og` renders differently from the browser (no `calc()`, limited fonts; the chips need explicit widths or `display: flex`).
**Open questions.** (1) Is per-binder sharing something you actually do? If not, stop at the S version.

---

## Recommended sequence

1. **Item 2 (focus) and the iOS zoom line from item 1**: an hour, zero risk, fixes the two things that are bugs rather than taste.
2. **Item 1 (mobile pass)**: the phone is a daily surface; this is the largest visible win and defines the breakpoints everything else reuses.
3. **Item 3 (Japanese line, tagline)**: tiny edits that land while the header area is already open from item 1.
4. **Item 4 (empty state)**: small, self-contained, and the clear-filters button is immediately useful on a phone where filters are easy to leave on.
5. **Item 5 (modal on phones)**: depends on the breakpoint work and is the most-touched surface after the grid.
6. **Item 7 (print controls and ink-light)**: do before the next batch of placeholders is printed; the tab re-skin is a visible wart today.
7. **Item 6 (rarity tiles)**: cosmetic, has three owner decisions, and is only visible on one binder; schedule once the answers are in.
8. **Item 8 (OG and title)**: last, S version only, since it is seen only by people you share links with.

## Not recommended

- **Adding a UI library or Tailwind**: 1800 lines of hand-written CSS already express the look; a library would add weight and fight the holo and print rules.
- **A redesign or light theme for the app**: the dark theme is liked and the print page already covers the light context where it matters.
- **Bundling a Japanese web font**: system CJK fonts are good on every platform the owner uses; `lang="ja"` fixes glyph selection without a 1 MB download.
- **Rarity frames or coloured borders**: the border is the ownership channel; a second coloured frame would blur owned versus unowned (see item 6).
- **Converting binder tabs to routes (`/binder/[id]`)**: query params already work and are shareable; a route change is plumbing, not design.
- **Making the print sheet preview responsive**: it is a 193mm artefact for a desktop print dialog; keep it fixed-width.
- **A hamburger menu or sidebar on mobile**: the app has four tabs and one controls row; a scrolling strip and tighter controls are enough.
- **Confetti or completion animations**: the holo tiles and progress bar already carry the celebration; more motion competes with them.
