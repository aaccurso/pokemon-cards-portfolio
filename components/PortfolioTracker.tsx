"use client";

import { useMemo, useState } from "react";
import { cards as allCards, typeColors, languageFlags, Card } from "@/lib/cards";
import {
  purchases,
  buildOwnershipMap,
  computeStats,
  buildCsv,
  OwnershipMap,
} from "@/lib/purchases";
import { CardModal } from "./CardModal";
import { CardTile } from "./CardTile";
import { ImportShipmentModal } from "./ImportShipmentModal";

type SortKey = keyof Card | "pricePaid" | "owned";
type SortDir = "asc" | "desc";

export default function PortfolioTracker() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [setFilter, setSetFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState<"all" | "owned" | "wanted">("all");
  const [sortKey, setSortKey] = useState<SortKey>("pokedexNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [modalCard, setModalCard] = useState<Card | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [importOpen, setImportOpen] = useState(false);

  const ownership: OwnershipMap = useMemo(() => buildOwnershipMap(purchases), []);

  const stats = useMemo(
    () => computeStats(allCards, ownership, purchases),
    [ownership]
  );

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    allCards.forEach((c) => {
      types.add(c.type1);
      if (c.type2) types.add(c.type2);
    });
    return Array.from(types).sort();
  }, []);

  const allSets = useMemo(
    () => Array.from(new Set(allCards.map((c) => c.set))).sort(),
    []
  );

  const filtered = useMemo(() => {
    let list = allCards;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.set.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== "all") {
      list = list.filter(
        (c) => c.type1 === typeFilter || c.type2 === typeFilter
      );
    }

    if (setFilter !== "all") {
      list = list.filter((c) => c.set === setFilter);
    }

    if (ownershipFilter === "owned") {
      list = list.filter((c) => ownership.has(c.id));
    } else if (ownershipFilter === "wanted") {
      list = list.filter((c) => !ownership.has(c.id));
    }

    list = [...list].sort((a, b) => {
      const av = getSortValue(a, sortKey, ownership);
      const bv = getSortValue(b, sortKey, ownership);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [search, typeFilter, setFilter, ownershipFilter, sortKey, sortDir, ownership]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return (
      <span className="sort-indicator">{sortDir === "asc" ? "▲" : "▼"}</span>
    );
  }

  function handleDownloadCsv() {
    const csv = buildCsv(allCards, ownership);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokedex-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const existingShipmentIds = useMemo(
    () => new Set(purchases.shipments.map((s) => s.id)),
    []
  );

  const collectedPct = Math.round((stats.owned / stats.total) * 100);

  return (
    <div className="container">
      <header>
        <h1>Pokedex 151 full-art</h1>
        <p>
          {stats.owned} / {stats.total} cards collected · {collectedPct}%
        </p>
      </header>

      <div className="progress-bar-container" aria-label="Collection progress">
        <div
          className="progress-bar-fill"
          style={{ width: `${(stats.owned / stats.total) * 100}%` }}
        />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">
            {stats.owned}
            <span className="value-sub"> / {stats.total}</span>
          </div>
          <div className="label">Collected</div>
        </div>
        <div className="stat-card">
          <div className="value">{fmt(stats.spentOnCards)} &euro;</div>
          <div className="label">Spent on cards</div>
        </div>
        <div className="stat-card">
          <div
            className="value"
            title="Sum of (buy price − price paid) for owned cards"
          >
            {stats.savings >= 0 ? "+" : ""}
            {fmt(stats.savings)} &euro;
          </div>
          <div className="label">Saved vs target</div>
        </div>
        <div className="stat-card">
          <div className="value">{fmt(stats.toComplete)} &euro;</div>
          <div className="label">To complete (est.)</div>
        </div>
        <div className="stat-card">
          <div className="value">{fmt(stats.budget)} &euro;</div>
          <div className="label">Budget ({stats.pricedCount} priced)</div>
        </div>
        <div
          className="stat-card"
          title="Actual total paid including shipping, fees and duplicates"
        >
          <div className="value">{fmt(stats.totalOutlay)} &euro;</div>
          <div className="label">Total outlay</div>
        </div>
      </div>

      <div className="controls">
        <input
          type="text"
          placeholder="Search by name, code, or set..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={setFilter} onChange={(e) => setSetFilter(e.target.value)}>
          <option value="all">All Sets</option>
          {allSets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={ownershipFilter}
          onChange={(e) => setOwnershipFilter(e.target.value as typeof ownershipFilter)}
        >
          <option value="all">All Cards</option>
          <option value="owned">Owned Only</option>
          <option value="wanted">Wanted Only</option>
        </select>
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            className={viewMode === "table" ? "active" : ""}
            onClick={() => setViewMode("table")}
            aria-pressed={viewMode === "table"}
            title="Table view"
          >
            &#9776; Table
          </button>
          <button
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            title="Grid view"
          >
            &#9638; Grid
          </button>
        </div>
        <button
          className="action-button primary"
          onClick={() => setImportOpen(true)}
          title="Paste a Cardmarket shipment email"
        >
          + Import shipment
        </button>
        <button
          className="action-button"
          onClick={handleDownloadCsv}
          title="Download the current portfolio as CSV"
        >
          ↓ CSV
        </button>
      </div>

      {viewMode === "grid" ? (
        <div className="card-grid">
          {filtered.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              owned={ownership.has(card.id)}
              onClick={() => setModalCard(card)}
            />
          ))}
        </div>
      ) : (
        <table className="card-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("owned")}>
                Own {sortIndicator("owned")}
              </th>
              <th onClick={() => handleSort("pokedexNumber")}>
                # {sortIndicator("pokedexNumber")}
              </th>
              <th onClick={() => handleSort("name")}>
                Name {sortIndicator("name")}
              </th>
              <th className="hide-mobile">Type</th>
              <th onClick={() => handleSort("code")}>
                Code {sortIndicator("code")}
              </th>
              <th className="hide-mobile" onClick={() => handleSort("set")}>
                Set {sortIndicator("set")}
              </th>
              <th className="hide-mobile">Language</th>
              <th className="hide-mobile">Variant</th>
              <th onClick={() => handleSort("buyPrice")}>
                Buy Price {sortIndicator("buyPrice")}
              </th>
              <th onClick={() => handleSort("pricePaid")}>
                Paid {sortIndicator("pricePaid")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((card) => {
              const own = ownership.get(card.id);
              return (
                <tr key={card.id} className={own ? "owned" : ""}>
                  <td className="own-cell">
                    {own ? (
                      <span
                        className="pokeball pokeball-xs"
                        aria-label="Owned"
                        title="Owned"
                      />
                    ) : (
                      <span
                        className="own-indicator wanted"
                        aria-label="Wanted"
                        title="Wanted"
                      >
                        ○
                      </span>
                    )}
                  </td>
                  <td className="pokedex-num">{card.pokedexNumber}</td>
                  <td>
                    <span
                      className="card-name-cell"
                      onMouseEnter={() => setHoveredId(card.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setModalCard(card)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setModalCard(card);
                        }
                      }}
                    >
                      <span className="preview-icon" aria-label="Preview card">
                        &#128065;
                      </span>
                      <strong>{card.name}</strong>
                      {hoveredId === card.id && card.imageUrl && (
                        <span className="preview-tooltip">
                          <img
                            src={card.imageUrl}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                            }}
                          />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="hide-mobile">
                    <span
                      className="type-badge"
                      style={{ background: typeColors[card.type1] ?? "#888" }}
                    >
                      {card.type1}
                    </span>
                    {card.type2 && (
                      <span
                        className="type-badge"
                        style={{ background: typeColors[card.type2] ?? "#888" }}
                      >
                        {card.type2}
                      </span>
                    )}
                  </td>
                  <td>{card.code}</td>
                  <td className="hide-mobile">{card.set}</td>
                  <td className="hide-mobile">
                    {languageFlags[card.language] && (
                      <span className="language-flag" aria-hidden>
                        {languageFlags[card.language]}
                      </span>
                    )}
                    {card.language}
                  </td>
                  <td className="hide-mobile">
                    {card.variant && (
                      <span className="variant-badge">{card.variant}</span>
                    )}
                  </td>
                  <td className="price">
                    {card.buyPrice != null
                      ? `${fmt(card.buyPrice)} \u20AC`
                      : "\u2014"}
                  </td>
                  <td className="price">
                    {own ? `${fmt(own.pricePaid)} \u20AC` : "\u2014"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="results-count">
        Showing {filtered.length} of {allCards.length} cards
      </p>

      {modalCard && (() => {
        const idx = filtered.findIndex((c) => c.id === modalCard.id);
        const canNavigate = idx !== -1 && filtered.length > 1;
        const onPrev = canNavigate
          ? () => setModalCard(filtered[(idx - 1 + filtered.length) % filtered.length])
          : undefined;
        const onNext = canNavigate
          ? () => setModalCard(filtered[(idx + 1) % filtered.length])
          : undefined;
        return (
          <CardModal
            card={modalCard}
            ownership={ownership.get(modalCard.id) ?? null}
            onClose={() => setModalCard(null)}
            onPrev={onPrev}
            onNext={onNext}
          />
        );
      })()}

      {importOpen && (
        <ImportShipmentModal
          cards={allCards}
          ownership={ownership}
          existingShipmentIds={existingShipmentIds}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function getSortValue(
  c: Card,
  key: SortKey,
  ownership: OwnershipMap
): string | number | boolean | null {
  if (key === "pricePaid") return ownership.get(c.id)?.pricePaid ?? null;
  if (key === "owned") return ownership.has(c.id);
  const v = c[key as keyof Card];
  if (v === undefined) return null;
  return v as string | number | null;
}
