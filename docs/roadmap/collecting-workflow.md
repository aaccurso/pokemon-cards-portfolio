# Roadmap lane: Collecting workflow

Date: 2026-10-23. Status: proposal, nothing here is built.

## Lane summary

This lane serves the one owner of the tracker at the moments when cards are physically moving: opening booster packs for the 30th CELEBRATION master set, standing at a shop or a Cardmarket listing deciding what is still missing, and sliding cards into binder pockets. Today the app is a read-only dashboard over `data/cards.json` and `data/purchases.json`; logging a pack opening means dictating 165-card numbers to Claude and sorting out duplicates by hand. After this lane, the owner taps or types pulls as packs open and gets a paste-ready shipment block, carries a one-sheet "needed" list, sees and exports duplicates, and can view the binder as the 3x3 pages it actually is.

Constraint that shapes everything below: the site is deployed from `main` on Vercel and the JSON files are the only store. The browser can read, but any write has to end up as a git commit. Every item therefore produces an artifact (clipboard text, download, printable page) rather than a saved state, except where localStorage is explicitly used as a scratchpad.

## 1. Pull checklist mode (master-set binders)

**Problem.** The first M6a booster box has not been opened yet (M6a: 165 cards, 0 owned, 0 pull shipments). When it is, 30 to 60 cards arrive at once with duplicates, and the only path into `data/purchases.json` is reading numbers aloud. That is slow, error-prone for repeated numbers, and impossible to resume if interrupted.

**Proposed approach.**
- New pure module `lib/pulls.ts` (type-only imports, testable under `node --test`): `type PullSession = { binderId: string; startedAt: string; counts: Record<string, number>; history: string[] }`, plus `addPull(session, cardId)`, `undoPull(session)` (pops `history`, decrements), `removeCard(session, cardId)`, `parseNumberEntry(text, binderCards)` (maps "12 45 45 101" or "12,45" to card ids via `setNumber`, returns unmatched tokens), and `sessionToShipment(session, meta)` returning a `Shipment` with `id` = `${date}-${binderId}-pulls`, `product`, `total`, `seller`, items sorted by `setNumber`, `pricePaid: null`, `condition: "NM"`, `qty` only when greater than 1 (matches the `qty?` default in `lib/purchases.ts`). Tests in `tests/pulls.test.ts`.
- `components/PortfolioTracker.tsx`: new URL param `mode=pulls`, allowed only when `binder.kind === "master-set"` (the toggle is hidden for wants binders, same pattern as "Illustration only"). In pulls mode the grid is forced, and `CardTile.onClick` increments instead of opening the modal. The session is loaded from `localStorage["pull-session:" + binderId]` in a `useEffect` after mount (never during render, to avoid a hydration mismatch) and written back on every change.
- `components/CardTile.tsx`: optional `pullCount?: number` prop renders a corner badge (`x3`) and a small minus button (`stopPropagation`, decrements). Owned-from-purchases and pending-from-session are visually distinct: Pokeball for committed, outlined badge for pending.
- New `components/PullSessionBar.tsx`: sticky bottom bar with a number-entry input, running totals (`14 cards, 9 distinct`), Undo, Clear (confirm), fields for `product` and `total`, and two export buttons: Copy JSON (clipboard) and Download `.json`. The clipboard payload is the single shipment object, pretty-printed with 2-space indent, ready to paste as the last element of `shipments` in `data/purchases.json`; the owner (or Claude) adds the trailing comma. Example of the block:

```
{
  "id": "2026-10-30-m6a-30th-pulls",
  "seller": "Pokemon Center Online",
  "product": "30th CELEBRATION booster box x1",
  "date": "2026-10-30",
  "shipping": 0, "fees": 0, "total": 60.00,
  "items": [
    { "cardId": "m6a-001-exeggcute", "pricePaid": null, "condition": "NM", "qty": 3 },
    { "cardId": "m6a-012-pikachu", "pricePaid": null, "condition": "NM" }
  ]
}
```

- Keep stats untouched by the session in v1. The pending state lives on tiles and in the bar only; the dashboard numbers keep meaning "what is committed".

**Why a Server Action is not the answer.** `next.config.ts` has no `output: "export"`, so a Server Action would technically execute on Vercel, but `data/purchases.json` is bundled at build time and the function filesystem is ephemeral and read-only outside `/tmp`. A write would vanish on the next cold start and would never reach git, which is where the data lives per CLAUDE.md. The site also has no auth, so a write endpoint would be public. Realistic alternatives, in order: (1) clipboard, zero infrastructure, pairs with the existing "paste into Claude" habit; (2) download `.json`, works when the clipboard API is blocked (non-HTTPS, some mobile browsers), same payload; (3) a GitHub Contents API commit. Option 3 needs a token: a fine-grained PAT in the browser's localStorage is a plaintext secret on a public site (not acceptable), so it would have to be a Vercel route handler with the token in env plus some owner-only gate, then a one to two minute rebuild before the UI reflects it. Defer 3 until 1 and 2 feel limiting.

**UX sketch (phone, pulls mode).**
```
[30th CELEBRATION]  Pulls mode: ON   (Exit)
+--------+ +--------+ +--------+
| 001 x3 | | 002    | | 003 x1 |
|  (-)   | |        | |  (-)   |
+--------+ +--------+ +--------+
...
================================= sticky
Type numbers: [ 12 45 45 101   ] (Add)
14 cards / 9 distinct   Undo  Clear
Product [booster box x1] Total [60]
          [Copy JSON]  [Download]
```

**Effort.** M for the number-entry path plus clipboard/download (`lib/pulls.ts`, bar, URL param), then another M for tile tapping, badges, localStorage, and undo. Call it L overall; the first M alone unblocks the first box.

**Dependencies.** None. Item 3 (duplicates) becomes much more useful once pulls are logged this way.

**Open questions.**
1. Should a pending session also overlay the Collected and Duplicates stats (with a "pending" marker), or stay tile-only as proposed?
2. One session per binder in localStorage, or allow naming sessions (box 1, box 2) before export?
3. Default `condition` for pulls: always `NM`, or a per-session picker?

## 2. Pocket "needed" list

**Problem.** The print page produces 63x88 mm placeholders, which is right for the binder but useless at a card shop or when scrolling a Cardmarket listing on a phone. What is needed there is the set of missing numbers at a glance, on one A4 sheet or one phone screen.

**Proposed approach.**
- New route `app/needed/page.tsx` (client component in `Suspense`, same shape as `app/print/page.tsx`), reading `binder` from the URL and reusing `cardsForBinder`, `buildOwnershipMap`, and `numberLabel` from `lib/cards.ts`.
- Master-set binders render a number grid 001 to 165 in rows of 10, one cell per card: missing cells bold on light, owned cells dimmed. Secret cards (104 to 165) start a new block so the official set and the secrets read separately. Wants binders render `#025 Pikachu` style rows in three columns, because Pokedex numbers alone do not identify a print across sets.
- A "Copy as text" button emits `Need (62): 003 007 012 ...` for pasting into a chat with a seller.
- Print CSS: `@media print` block that hides the controls and fits the grid on one portrait A4 sheet with 16pt numbers. Link to `/needed?binder=...` from the dashboard controls next to the CSV button.

**Effort.** S. It is a read-only view over data that is already derived; the only new code is layout.

**Dependencies.** None. If item 4 lands, each number can gain a `p.3` page hint from the shared pagination helper.

**Open questions.**
1. Is the whole grid (owned dimmed) more useful than missing-only? The grid gives context, missing-only is denser.
2. Should the text export include Japanese names for sellers in Japan?

## 3. Duplicates view and trade list

**Problem.** `buildOwnershipMap` already computes `duplicateCount` per card and the master-set stats tile shows the total, but there is no way to see which cards are duplicated or to hand that list to a trade partner or a buylist.

**Proposed approach.**
- `components/PortfolioTracker.tsx`: add `duplicates` to the ownership filter select (`own=dupes` in the URL), filtering to `ownership.get(id)?.duplicateCount > 0`. Show the option for every binder (Kanto has repeat purchases too), not only master-set.
- `components/CardTile.tsx`: when owned with duplicates, render `x3` beside the Pokeball (reuses the badge from item 1, without the minus button).
- `lib/purchases.ts`: `buildTradeList(cards, ownership)` returning rows `{ code, name, nameJa, extra, trend: buyPrice }` sorted by `setNumber`; two formatters, `tradeListCsv` and `tradeListText` (`M6a 045 Pikachu ex x2 (1,20 EUR)`). Tests next to the existing `buildCsv` test.
- A "Trade list" button beside CSV, visible only when `stats.duplicates > 0`, offering Copy text and Download CSV.

**Effort.** S. All inputs exist; it is a filter option, a badge, and two string builders.

**Dependencies.** Item 1 is what will create duplicates in the first place, but the code does not depend on it.

**Open questions.**
1. Do you intend to trade or sell duplicates at all, or only count them? If never, drop the export and keep just the filter.
2. Should extra copies carry their own condition, or is `NM` for everything acceptable?

## 4. Binder page view

**Problem.** The grid is a flat list; the physical binder is 9-pocket pages. When filing cards, the owner has to count pockets to find the slot, and the printed placeholders carry no page number, so a stack of placeholders has to be re-sorted by hand.

**Proposed approach.**
- New pure helper `lib/layout.ts`: `paginate(cards, perPage = 9)` returns `{ page: number; pocket: number; card: Card }[]` over the binder's cards in `binder.sort` order, independent of filters. Tested.
- `components/PortfolioTracker.tsx`: third view mode `view=pages`. Render `.binder-page` blocks, a 3x3 CSS grid with a `Page N` header, two pages side by side above 900px to mimic an open binder, one per row on phones (3 columns of about 120px fit a 390px screen). Filters do not remove cards in this view; non-matching tiles are dimmed, so pocket positions never shift.
- `components/PlaceholderCard.tsx`: optional `slot?: { page: number; pocket: number }` prop rendered as `p.3 / 7` in the header. `app/print/page.tsx` computes slots over the full sorted binder before filtering out owned cards, so a printed placeholder shows its real binder position even when only missing cards are printed.

**UX sketch (desktop).**
```
Page 1                      Page 2
+----+----+----+            +----+----+----+
|001 |002 |003 |            |010 |011 |012 |
+----+----+----+            +----+----+----+
|004 |005 |006 |            |013 |014 |015 |
+----+----+----+            +----+----+----+
|007 |008 |009 |            |016 |017 |018 |
+----+----+----+            +----+----+----+
```

**Effort.** M. The pagination is trivial; the time goes into a third view branch in an already 571-line component, the responsive CSS, and threading slot info into the print page.

**Dependencies.** None. Items 2 and the print page benefit from `lib/layout.ts`.

**Open questions.**
1. Does page 1 sit alone on the right when the binder is opened (common with ring binders), so spreads are pages 2+3, 4+5? This changes the side-by-side pairing.
2. Are pages double-sided (back of page 1 is page 2)? If so the "open binder" view should show pages 2 and 3 as a spread.
3. Any binder with a non-default sort order, for example Kanto by set rather than Pokedex? Then `paginate` needs a per-binder order field.

## 5. Finish-as-singles shortlist

**Problem.** After the packs are done, the remaining M6a cards will be bought as singles, and the "To complete as singles" tile already prices that. But getting from the tile to a shopping list means setting four filters by hand, and nothing links a card to a Cardmarket search.

**Proposed approach.** Most of this exists via URL state: `?binder=m6a-30th&own=wanted&view=table&sort=buyPrice&dir=desc` is the shortlist. Add: a "Buy as singles" link in the master-set stats tile that applies those params; a Cardmarket search link in `components/CardModal.tsx` (`https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=` + encoded `code`, since Cardmarket product URLs are not derivable from `tcgdexId`); and "Copy as text" on the wanted set reusing item 2's text formatter.

**Effort.** S. Two links and a reuse of item 2's formatter.

**Dependencies.** Item 2 for the text export.

**Open questions.**
1. Is a Cardmarket search by set code reliable enough for Japanese cards, or would a PriceCharting link (whose slugs are already stored as `imageUrl` hashes but not as page URLs) be preferred?

## Recommended sequence

1. **Item 1, first half** (number entry + clipboard/download, `lib/pulls.ts`, session bar). This is the only item with a deadline: the first booster box. Dictating numbers into a text field already beats dictating to Claude, and the clipboard block removes the transcription step entirely.
2. **Item 3** (duplicates filter, badge, trade list). S effort, and the first box will create duplicates immediately. Share the `xN` badge with item 1.
3. **Item 1, second half** (tile tapping, localStorage persistence, undo). Only worth doing after a real box has shown whether typing numbers is enough; if it is, this half may never be needed.
4. **Item 2** (needed list). S effort, needed when the owner starts hunting singles or visits a shop, which comes after the packs.
5. **Item 4** (binder page view). M effort, needed when the physical binder is being filled and for better placeholders; it also unlocks page hints in item 2.
6. **Item 5** (singles shortlist). Last, since most of it is already reachable by URL and it reuses item 2.

Reasoning: order by when the real-world need arrives (box, duplicates, shop, filing, singles), and keep every step small enough to ship and test with `npm test` in one sitting. Items 2, 3, 5 are each under half a day; item 1's first half and item 4 are each a day.

## Not recommended

- **Server Action that writes `data/purchases.json`.** The Vercel filesystem is ephemeral and the file is bundled at build; writes would not persist or reach git.
- **GitHub API commit from the browser.** Requires a token in a public, unauthenticated site; only acceptable behind a server route with the token in Vercel env, which is more infrastructure than the clipboard justifies today.
- **Overlaying the in-progress session onto the stats tiles.** Blurs "committed" and "pending"; keep stats as the truth of the JSON until the owner asks for it.
- **Pack-level logging (packs opened, hits per pack).** Would need new fields on `Shipment` for a statistic nobody asked for.
- **Camera or OCR card recognition.** Heavy dependency and flaky on holo Japanese cards; typing a three-digit number is faster.
- **Per-copy condition on duplicates.** Doubles the data entry for pulls that are all NM from a pack; revisit only if trading becomes real.
- **Custom slot mapping (hand-reordered binder pages).** No current need; `binder.sort` plus 9-per-page covers both binders.
- **Cross-device sync of pull sessions.** localStorage on the phone used at the table is enough; the export is the sync.
