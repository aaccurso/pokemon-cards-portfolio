"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cards as allCards, purchases, binders } from "@/lib/data";
import { languageFlags, cardCategory, numberLabel, typeBadges, Card } from "@/lib/cards";
import {
  DEFAULT_BINDER_ID,
  buildCardBinderMap,
  cardsForBinder,
  getBinder,
  resolveBinderId,
} from "@/lib/binders";
import {
  buildOwnershipMap,
  computeStats,
  buildCsv,
  OwnershipMap,
} from "@/lib/purchases";
import { CardModal } from "./CardModal";
import { CardTile } from "./CardTile";
import { BinderTabs, BinderCounts } from "./BinderTabs";

type SortKey = keyof Card | "pricePaid" | "owned";
type SortDir = "asc" | "desc";

export default function PortfolioTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialBinderId = resolveBinderId(searchParams.get("binder"), binders);
  const initialBinder = getBinder(initialBinderId, binders);

  const [binderId, setBinderId] = useState(initialBinderId);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") ?? "all");
  const [setFilter, setSetFilter] = useState(() => searchParams.get("set") ?? "all");
  const [ownershipFilter, setOwnershipFilter] = useState<"all" | "owned" | "wanted">(() => {
    const v = searchParams.get("own");
    return v === "owned" || v === "wanted" ? v : "all";
  });
  const [illustrationOnly, setIllustrationOnly] = useState(
    () => searchParams.get("illus") === "1"
  );
  const [sortKey, setSortKey] = useState<SortKey>(
    () => (searchParams.get("sort") as SortKey) || initialBinder.sort
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    () => (searchParams.get("dir") === "desc" ? "desc" : "asc")
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [modalCard, setModalCard] = useState<Card | null>(() => {
    const id = searchParams.get("card");
    if (!id) return null;
    return cardsForBinder(initialBinderId, allCards).find((c) => c.id === id) ?? null;
  });
  const [viewMode, setViewMode] = useState<"table" | "grid">(
    () => (searchParams.get("view") === "table" ? "table" : "grid")
  );
  const [copied, setCopied] = useState(false);

  const binder = getBinder(binderId, binders);
  const binderCards = useMemo(() => cardsForBinder(binderId, allCards), [binderId]);
  const cardBinder = useMemo(() => buildCardBinderMap(allCards), []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (binderId !== DEFAULT_BINDER_ID) p.set("binder", binderId);
    if (search) p.set("q", search);
    if (typeFilter !== "all") p.set("type", typeFilter);
    if (setFilter !== "all") p.set("set", setFilter);
    if (ownershipFilter !== "all") p.set("own", ownershipFilter);
    if (illustrationOnly) p.set("illus", "1");
    if (sortKey !== binder.sort) p.set("sort", String(sortKey));
    if (sortDir !== "asc") p.set("dir", sortDir);
    if (viewMode !== "grid") p.set("view", viewMode);
    if (modalCard) p.set("card", modalCard.id);

    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    binderId,
    binder.sort,
    search,
    typeFilter,
    setFilter,
    ownershipFilter,
    illustrationOnly,
    sortKey,
    sortDir,
    viewMode,
    modalCard,
    pathname,
    router,
  ]);

  const ownership: OwnershipMap = useMemo(() => buildOwnershipMap(purchases), []);

  const stats = useMemo(
    () => computeStats(binderCards, ownership, purchases, binderId, cardBinder),
    [binderCards, ownership, binderId, cardBinder]
  );

  const binderCounts = useMemo<BinderCounts>(() => {
    const counts: BinderCounts = {};
    for (const b of binders) {
      const list = cardsForBinder(b.id, allCards);
      counts[b.id] = {
        owned: list.filter((c) => ownership.has(c.id)).length,
        total: list.length,
      };
    }
    return counts;
  }, [ownership]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    let hasTrainer = false;
    binderCards.forEach((c) => {
      if (cardCategory(c) === "Trainer") hasTrainer = true;
      if (c.type1) types.add(c.type1);
      if (c.type2) types.add(c.type2);
    });
    const sorted = Array.from(types).sort();
    return hasTrainer ? [...sorted, "Trainer"] : sorted;
  }, [binderCards]);

  const allSets = useMemo(
    () => Array.from(new Set(binderCards.map((c) => c.set))).sort(),
    [binderCards]
  );

  function selectBinder(id: string) {
    if (id === binderId) return;
    setBinderId(id);
    setSearch("");
    setTypeFilter("all");
    setSetFilter("all");
    setOwnershipFilter("all");
    setIllustrationOnly(false);
    setSortKey(getBinder(id, binders).sort);
    setSortDir("asc");
    setModalCard(null);
  }

  const filtered = useMemo(() => {
    let list = binderCards;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.set.toLowerCase().includes(q)
      );
    }

    if (typeFilter === "Trainer") {
      list = list.filter((c) => cardCategory(c) === "Trainer");
    } else if (typeFilter !== "all") {
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

    if (illustrationOnly) {
      list = list.filter((c) => c.buyPrice != null);
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
  }, [binderCards, search, typeFilter, setFilter, ownershipFilter, illustrationOnly, sortKey, sortDir, ownership]);

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

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. non-HTTPS) — silently no-op
    }
  }

  function handleDownloadCsv() {
    const csv = buildCsv(binderCards, ownership);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${binderId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const collectedPct =
    stats.total === 0 ? 0 : Math.round((stats.owned / stats.total) * 100);
  const isMasterSet = binder.kind === "master-set";

  return (
    <div className="container">
      <BinderTabs
        binders={binders}
        activeId={binderId}
        counts={binderCounts}
        onSelect={selectBinder}
      />

      <header>
        <h1>{binder.name}</h1>
        <p>
          {stats.owned} / {stats.total} cards collected · {collectedPct}%
        </p>
      </header>

      <div className="progress-bar-container" aria-label="Collection progress">
        <div
          className="progress-bar-fill"
          style={{ width: `${collectedPct}%` }}
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
        {isMasterSet ? (
          <div className="stat-card" title="Extra copies pulled beyond the first">
            <div className="value">{stats.duplicates}</div>
            <div className="label">Duplicates</div>
          </div>
        ) : (
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
        )}
        <div className="stat-card">
          <div className="value">{fmt(stats.toComplete)} &euro;</div>
          <div className="label">
            {isMasterSet ? "To complete as singles" : "To complete (est.)"}
          </div>
        </div>
        <div className="stat-card">
          <div className="value">{fmt(stats.budget)} &euro;</div>
          <div className="label">
            {isMasterSet ? "Set value" : "Budget"} ({stats.pricedCount} priced)
          </div>
        </div>
        <div
          className="stat-card"
          title="Actual total paid including shipping, fees and duplicates"
        >
          <div className="value">{fmt(stats.totalOutlay)} &euro;</div>
          <div className="label">Total outlay</div>
        </div>
      </div>

      <div className="controls-row">
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
          {binder.kind === "wants" && (
            <button
              className={`pill-toggle${illustrationOnly ? " active" : ""}`}
              onClick={() => setIllustrationOnly((v) => !v)}
              aria-pressed={illustrationOnly}
              title="Show only cards with a priced illustration target"
            >
              Illustration only
            </button>
          )}
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
        </div>
        <div className="controls-secondary">
          <button
            className="action-button"
            onClick={handleShare}
            title="Copy a shareable link to the current view"
          >
            {copied ? "✓ Copied" : "↗ Share"}
          </button>
          <button
            className="action-button"
            onClick={handleDownloadCsv}
            title="Download the current portfolio as CSV"
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="card-grid">
          {filtered.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              owned={ownership.has(card.id)}
              onClick={() => setModalCard(card)}
              binder={binder}
            />
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="card-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("owned")}>
                  Own {sortIndicator("owned")}
                </th>
                <th onClick={() => handleSort(binder.sort)}>
                  # {sortIndicator(binder.sort)}
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
                    <td className="pokedex-num">{numberLabel(card, binder)}</td>
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
                        <strong>
                          {card.name}
                          {card.nameJa && <span className="name-ja">{card.nameJa}</span>}
                        </strong>
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
                      {typeBadges(card).map((b) => (
                        <span
                          key={b.label}
                          className={`type-badge${b.label === "Trainer" || b.label === "Energy" ? " trainer" : ""}`}
                          style={{ background: b.color }}
                        >
                          {b.label}
                        </span>
                      ))}
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
                      {own && own.pricePaid != null ? `${fmt(own.pricePaid)} \u20AC` : "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="results-count">
        Showing {filtered.length} of {binderCards.length} cards
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
            binder={binder}
          />
        );
      })()}

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
