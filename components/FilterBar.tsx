"use client";

import Link from "next/link";
import { useState } from "react";

import type { RarityRow } from "@/lib/purchases";
import { activeFilterCount } from "@/lib/filters";

/** `dupes` is owned with at least one extra copy; in the URL as `own=dupes`. */
export type OwnFilter = "all" | "owned" | "wanted" | "dupes";
export type ViewMode = "table" | "grid";

export type Filters = {
  /** Free-text search over name, code, and set. */
  q: string;
  /** A Pokemon type, "Trainer", or "all". */
  type: string;
  /** A set name or "all". */
  set: string;
  own: OwnFilter;
  /** "Illustration only": cards with a priced target (buyPrice != null). */
  illus: boolean;
  /** A tcgdex rarity label (e.g. "Classic Collection") or "all". */
  rarity: string;
};

export const EMPTY_FILTERS: Filters = { q: "", type: "all", set: "all", own: "all", illus: false, rarity: "all" };

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  types: string[];
  sets: string[];
  /** Per-rarity rows of the active binder; empty when no card has a rarity, which hides the select. */
  rarities: RarityRow[];
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  onShare: () => void;
  onCsv: () => void;
  /** Href of the /needed one-sheet for the active binder. */
  neededHref: string;
  copied: boolean;
  /** Cards with extra copies; 0 hides the trade-list disclosure. */
  tradeCount: number;
  tradeCopied: boolean;
  onTradeText: () => void;
  onTradeCsv: () => void;
  /** Copies the wanted cards shown as one line of text; only offered on the Wanted filter. */
  onCopyNeeded: () => void;
  copiedNeeded: boolean;
  /** Wants binders only; master-set binders hide the toggle. */
  showIllustration: boolean;
};

export function FilterBar({
  filters,
  onChange,
  types,
  sets,
  rarities,
  viewMode,
  onViewMode,
  onShare,
  onCsv,
  neededHref,
  copied,
  tradeCount,
  tradeCopied,
  onTradeText,
  onTradeCsv,
  onCopyNeeded,
  copiedNeeded,
  showIllustration,
}: Props) {
  // Phones only: the selects sit behind a "Filters" button so the first row
  // is search, Filters and the view toggle. On desktop the panel is
  // display: contents and the button is hidden, so the row is unchanged.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = activeFilterCount(filters);

  return (
    <div className="controls-row">
      <div className="controls">
        <input
          type="text"
          placeholder="Search by name, code, or set..."
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
        />
        <button
          type="button"
          className="filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="filters-panel"
          onClick={() => setFiltersOpen((o) => !o)}
          title={filtersOpen ? "Hide the filter controls" : "Show the filter controls"}
        >
          Filters
          {activeCount > 0 && <span className="filters-count">{activeCount}</span>}
        </button>
        <div id="filters-panel" className={`filters-panel${filtersOpen ? " open" : ""}`}>
          <select value={filters.type} onChange={(e) => onChange({ type: e.target.value })}>
            <option value="all">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={filters.set} onChange={(e) => onChange({ set: e.target.value })}>
            <option value="all">All Sets</option>
            {sets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.own}
            onChange={(e) => onChange({ own: e.target.value as OwnFilter })}
          >
            <option value="all">All Cards</option>
            <option value="owned">Owned Only</option>
            <option value="wanted">Wanted Only</option>
            <option value="dupes">Duplicates Only</option>
          </select>
          {rarities.length > 0 && (
            <select
              value={filters.rarity}
              onChange={(e) => onChange({ rarity: e.target.value })}
              aria-label="Rarity"
            >
              <option value="all">All Rarities</option>
              {rarities.map((r) => (
                <option key={r.rarity} value={r.rarity}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
          {showIllustration && (
            <button
              className={`pill-toggle${filters.illus ? " active" : ""}`}
              onClick={() => onChange({ illus: !filters.illus })}
              aria-pressed={filters.illus}
              title="Show only cards with a priced illustration target"
            >
              Illustration only
            </button>
          )}
        </div>
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            className={viewMode === "table" ? "active" : ""}
            onClick={() => onViewMode("table")}
            aria-pressed={viewMode === "table"}
            title="Table view"
          >
            &#9776; Table
          </button>
          <button
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => onViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            title="Grid view"
          >
            &#9638; Grid
          </button>
        </div>
      </div>
      <div className="controls-secondary">
        <button
          className="action-button"
          onClick={onShare}
          title="Copy a shareable link to the current view"
        >
          {copied ? "✓ Copied" : "↗ Share"}
        </button>
        {filters.own === "wanted" && (
          <button
            className="action-button"
            onClick={onCopyNeeded}
            title="Copy the wanted cards shown as one line of text"
          >
            {copiedNeeded ? "✓ Copied" : "⎘ Copy as text"}
          </button>
        )}
        <button
          className="action-button"
          onClick={onCsv}
          title="Download the current portfolio as CSV"
        >
          ↓ CSV
        </button>
        <Link
          href={neededHref}
          className="action-button"
          title="One-sheet list of the numbers still missing, for shops and seller chats"
        >
          ☐ Needed
        </Link>
        {tradeCount > 0 && (
          <details className="trade-menu">
            <summary
              className="action-button"
              title="Export the extra copies for a trade partner or buylist"
            >
              ⇄ Trade list ({tradeCount})
            </summary>
            <div className="trade-menu-items">
              <button className="action-button" onClick={onTradeText}>
                {tradeCopied ? "✓ Copied" : "Copy text"}
              </button>
              <button className="action-button" onClick={onTradeCsv}>
                ↓ Trade CSV
              </button>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
