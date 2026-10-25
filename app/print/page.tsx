"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cards, purchases, binders } from "@/lib/data";
import { buildOwnershipMap } from "@/lib/purchases";
import {
  DEFAULT_BINDER_ID,
  cardsForBinder,
  getBinder,
  resolveBinderId,
} from "@/lib/binders";
import type { Card } from "@/lib/cards";
import { PlaceholderCard } from "@/components/PlaceholderCard";
import { BinderTabs, BinderCounts } from "@/components/BinderTabs";

export default function PrintPage() {
  return (
    <Suspense>
      <PrintSheets />
    </Suspense>
  );
}

function sortValue(c: Card, key: "pokedexNumber" | "setNumber"): number {
  const v = c[key];
  return v == null ? Number.POSITIVE_INFINITY : v;
}

function PrintSheets() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const binderId = resolveBinderId(searchParams.get("binder"), binders);
  const binder = getBinder(binderId, binders);

  const [includeOwned, setIncludeOwned] = useState(false);
  const ownership = useMemo(() => buildOwnershipMap(purchases), []);
  const binderCards = useMemo(() => cardsForBinder(binderId, cards), [binderId]);

  const binderCounts = useMemo<BinderCounts>(() => {
    const counts: BinderCounts = {};
    for (const b of binders) {
      const list = cardsForBinder(b.id, cards);
      counts[b.id] = {
        owned: list.filter((c) => ownership.has(c.id)).length,
        total: list.length,
      };
    }
    return counts;
  }, [ownership]);

  function selectBinder(id: string) {
    router.replace(id === DEFAULT_BINDER_ID ? pathname : `${pathname}?binder=${id}`, {
      scroll: false,
    });
  }

  // ?binder=typo resolves to the default binder; make the URL say so too,
  // so the address bar never shows an id the page is not rendering.
  const binderParam = searchParams.get("binder");
  useEffect(() => {
    if (binderParam == null || binderParam === binderId) return;
    router.replace(
      binderId === DEFAULT_BINDER_ID ? pathname : `${pathname}?binder=${binderId}`,
      { scroll: false }
    );
  }, [binderParam, binderId, pathname, router]);

  const sheets = useMemo(() => {
    const filtered = includeOwned
      ? binderCards
      : binderCards.filter((c) => !ownership.has(c.id));
    const sorted = [...filtered].sort(
      (a, b) => sortValue(a, binder.sort) - sortValue(b, binder.sort)
    );
    const pages: typeof sorted[] = [];
    for (let i = 0; i < sorted.length; i += 9) {
      pages.push(sorted.slice(i, i + 9));
    }
    return pages;
  }, [includeOwned, ownership, binderCards, binder.sort]);

  const totalCards = sheets.reduce((s, p) => s + p.length, 0);

  return (
    <div className="print-page">
      <div className="print-controls no-print">
        <div className="print-controls-header">
          <h1>{binder.name} placeholder cards</h1>
          <p className="print-hint">
            {totalCards} cards &middot; {sheets.length + 1} sheet
            {sheets.length + 1 === 1 ? "" : "s"} total (first page is a
            calibration guide, then 3&times;3 card grids) &middot; each card
            63&times;88&nbsp;mm.
          </p>
        </div>

        <div className="print-instructions">
          <h2>Before printing &mdash; set your print dialog like this</h2>
          <ol>
            <li>
              <strong>Destination:</strong> Save as PDF (or your printer).
            </li>
            <li>
              <strong>Paper size:</strong> A4.
            </li>
            <li>
              <strong>Scale / Size:</strong> 100% &mdash; also called
              &ldquo;Actual size&rdquo; or &ldquo;Default&rdquo;. Do <em>not</em>{" "}
              pick &ldquo;Fit to page&rdquo; or &ldquo;Shrink to fit&rdquo;.
            </li>
            <li>
              <strong>Margins:</strong> Default (or None/Minimum). Do not set a
              large custom margin.
            </li>
            <li>
              <strong>Orientation:</strong> Portrait.
            </li>
            <li>
              <strong>Headers and footers:</strong> off.
            </li>
            <li>
              <strong>Background graphics:</strong> on (so type colors and
              watermarks print).
            </li>
            <li>
              <strong>Two-sided / Duplex:</strong> off.
            </li>
          </ol>
          <p className="print-note">
            The first printed page has a 50&nbsp;mm ruler and a 63&times;88&nbsp;mm
            card outline &mdash; measure those after printing. If they are off,
            adjust the scale percentage (e.g. 50&nbsp;mm reads 49&nbsp;mm &rarr;
            reprint at 102%) and print again.
          </p>
        </div>

        <div className="print-controls-actions">
          <BinderTabs
            binders={binders}
            activeId={binderId}
            counts={binderCounts}
            onSelect={selectBinder}
          />
          <label className="print-opt">
            <input
              type="checkbox"
              checked={includeOwned}
              onChange={(e) => setIncludeOwned(e.target.checked)}
            />
            Include owned cards
          </label>
          <button className="print-btn" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="print-calibration-sheet">
        <h2>Calibration</h2>
        <p className="cal-intro">
          Measure the ruler and the card outline below with a physical ruler.
          Both numbers must match the printed length exactly for the placeholder
          cards to fit standard TCG binder sleeves.
        </p>

        <div className="cal-ruler-wrap">
          <div className="cal-label-left">0</div>
          <div className="cal-ruler" aria-hidden>
            {[0, 10, 20, 30, 40, 50].map((mm) => (
              <div
                key={mm}
                className="cal-tick"
                style={{ left: `${mm}mm` }}
              />
            ))}
          </div>
          <div className="cal-label-right">50&nbsp;mm</div>
        </div>
        <div className="cal-ruler-caption">
          This line should measure exactly <strong>50&nbsp;mm</strong>.
        </div>

        <div className="cal-card-wrap">
          <div className="cal-card-box">
            <span className="cal-card-label">
              Standard TCG card
              <br />
              63&nbsp;mm &times; 88&nbsp;mm
            </span>
          </div>
          <p className="cal-card-caption">
            Place one of your empty binder sleeves over this rectangle &mdash; it
            should fit perfectly, with no gap and no overhang.
          </p>
        </div>

        <div className="cal-tips">
          <strong>If the measurements are wrong:</strong>
          <ul>
            <li>
              Reprint with an adjusted scale (e.g. printed 50&nbsp;mm line
              measures 48&nbsp;mm &rarr; try 104%).
            </li>
            <li>
              Check paper size is A4 and &ldquo;Fit to page&rdquo; is off.
            </li>
            <li>Check your printer isn&apos;t in draft / eco-size mode.</li>
          </ul>
        </div>
      </div>

      {sheets.map((page, i) => (
        <div key={i} className="print-sheet">
          {page.map((card) => (
            <PlaceholderCard
              key={card.id}
              card={card}
              binder={binder}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
