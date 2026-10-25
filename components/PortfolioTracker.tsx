"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cards as allCards, purchases, binders } from "@/lib/data";
import { cardCategory, emptyStateMessage, Card } from "@/lib/cards";
import {
  BinderKind,
  DEFAULT_BINDER_ID,
  buildCardBinderMap,
  cardsForBinder,
  getBinder,
  resolveBinderId,
} from "@/lib/binders";
import {
  buildOwnershipMap,
  computeStats,
  collectedPct,
  progressLabel,
  buildCsv,
  OwnershipMap,
} from "@/lib/purchases";
import { fmtEur } from "@/lib/format";
import { compareBySort, isSortKey, SortDir, SortKey } from "@/lib/sort";
import { CardModal } from "./CardModal";
import { CardTile } from "./CardTile";
import { CardTable } from "./CardTable";
import { StatsGrid } from "./StatsGrid";
import { FilterBar, EMPTY_FILTERS, Filters, ViewMode } from "./FilterBar";
import { BinderTabs, BinderCounts } from "./BinderTabs";

/**
 * Only a "wants" binder shows the Illustration toggle, so ?illus=1 is ignored
 * elsewhere: a master-set binder must never filter invisibly.
 */
function readFilters(params: URLSearchParams, kind: BinderKind): Filters {
  const own = params.get("own");
  return {
    q: params.get("q") ?? "",
    type: params.get("type") ?? "all",
    set: params.get("set") ?? "all",
    own: own === "owned" || own === "wanted" ? own : "all",
    illus: params.get("illus") === "1" && kind === "wants",
  };
}

export default function PortfolioTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialBinderId = resolveBinderId(searchParams.get("binder"), binders);
  const initialBinder = getBinder(initialBinderId, binders);

  const [binderId, setBinderId] = useState(initialBinderId);
  const [filters, setFilters] = useState<Filters>(() =>
    readFilters(searchParams, initialBinder.kind)
  );
  // An unknown ?sort= (stale link, hand-typed) falls back to the binder's default.
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const v = searchParams.get("sort");
    return isSortKey(v) ? v : initialBinder.sort;
  });
  const [sortDir, setSortDir] = useState<SortDir>(
    () => (searchParams.get("dir") === "desc" ? "desc" : "asc")
  );
  const [modalCard, setModalCard] = useState<Card | null>(() => {
    const id = searchParams.get("card");
    if (!id) return null;
    return cardsForBinder(initialBinderId, allCards).find((c) => c.id === id) ?? null;
  });
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (searchParams.get("view") === "table" ? "table" : "grid")
  );
  const [copied, setCopied] = useState(false);

  const binder = getBinder(binderId, binders);
  const binderCards = useMemo(() => cardsForBinder(binderId, allCards), [binderId]);
  const cardBinder = useMemo(() => buildCardBinderMap(allCards), []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (binderId !== DEFAULT_BINDER_ID) p.set("binder", binderId);
    if (filters.q) p.set("q", filters.q);
    if (filters.type !== "all") p.set("type", filters.type);
    if (filters.set !== "all") p.set("set", filters.set);
    if (filters.own !== "all") p.set("own", filters.own);
    if (filters.illus && binder.kind === "wants") p.set("illus", "1");
    if (sortKey !== binder.sort) p.set("sort", sortKey);
    if (sortDir !== "asc") p.set("dir", sortDir);
    if (viewMode !== "grid") p.set("view", viewMode);
    if (modalCard) p.set("card", modalCard.id);

    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [binderId, binder.sort, binder.kind, filters, sortKey, sortDir, viewMode, modalCard, pathname, router]);

  const ownership: OwnershipMap = useMemo(() => buildOwnershipMap(purchases), []);

  const stats = useMemo(
    () => computeStats(binderCards, ownership, purchases, binderId, cardBinder),
    [binderCards, ownership, binderId, cardBinder]
  );

  // Per-tab counts plus the one "all binders" summary line: market value of
  // every owned copy vs the global sum of shipment totals (same basis as the
  // per-binder value / outlay figure).
  const { binderCounts, allValue, allOutlay } = useMemo(() => {
    const counts: BinderCounts = {};
    let value = 0;
    for (const b of binders) {
      const list = cardsForBinder(b.id, allCards);
      counts[b.id] = {
        owned: list.filter((c) => ownership.has(c.id)).length,
        total: list.length,
      };
      value += computeStats(list, ownership, purchases, b.id, cardBinder).marketValueAllCopies;
    }
    const outlay = purchases.shipments.reduce((sum, sh) => sum + (sh.total ?? 0), 0);
    return { binderCounts: counts, allValue: value, allOutlay: outlay };
  }, [ownership, cardBinder]);

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

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function selectBinder(id: string) {
    if (id === binderId) return;
    setBinderId(id);
    resetFilters();
    setSortKey(getBinder(id, binders).sort);
    setSortDir("asc");
    setModalCard(null);
  }

  function updateFilters(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  const filtered = useMemo(() => {
    let list = binderCards;

    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.set.toLowerCase().includes(q)
      );
    }

    if (filters.type === "Trainer") {
      list = list.filter((c) => cardCategory(c) === "Trainer");
    } else if (filters.type !== "all") {
      list = list.filter(
        (c) => c.type1 === filters.type || c.type2 === filters.type
      );
    }

    if (filters.set !== "all") {
      list = list.filter((c) => c.set === filters.set);
    }

    if (filters.own === "owned") {
      list = list.filter((c) => ownership.has(c.id));
    } else if (filters.own === "wanted") {
      list = list.filter((c) => !ownership.has(c.id));
    }

    if (filters.illus && binder.kind === "wants") {
      list = list.filter((c) => c.buyPrice != null);
    }

    return [...list].sort(compareBySort(sortKey, sortDir, ownership));
  }, [binderCards, binder.kind, filters, sortKey, sortDir, ownership]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. non-HTTPS): silently no-op
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

  const pct = collectedPct(stats);

  return (
    <div className="container">
      <BinderTabs
        binders={binders}
        activeId={binderId}
        counts={binderCounts}
        onSelect={selectBinder}
      />
      <p
        className="binder-summary"
        title="Cardmarket trend price of every owned copy (duplicates included) across all binders, against the sum of all shipment totals"
      >
        All binders: {fmtEur(allValue)} value vs {fmtEur(allOutlay)} outlay
      </p>

      <header>
        <h1>{binder.name}</h1>
        <p className="binder-description">{binder.description}</p>
      </header>

      <div className="progress">
        <div className="progress-bar-container" aria-label="Collection progress">
          <div
            className="progress-bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="progress-label">{progressLabel(stats)}</span>
      </div>

      <StatsGrid stats={stats} kind={binder.kind} />

      <FilterBar
        filters={filters}
        onChange={updateFilters}
        types={allTypes}
        sets={allSets}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onShare={handleShare}
        onCsv={handleDownloadCsv}
        neededHref={binderId === DEFAULT_BINDER_ID ? "/needed" : `/needed?binder=${binderId}`}
        copied={copied}
        showIllustration={binder.kind === "wants"}
      />

      {filtered.length === 0 ? (
        <div className="empty-state" role="status">
          <div className="placeholder-pokeball" aria-hidden>
            &#9679;
          </div>
          <p>
            {emptyStateMessage({
              search: filters.q,
              ownershipFilter: filters.own,
              binderOwned: stats.owned,
            })}
          </p>
          <button className="action-button" onClick={resetFilters}>
            Clear filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
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
        <CardTable
          cards={filtered}
          ownership={ownership}
          binder={binder}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onOpen={setModalCard}
        />
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
