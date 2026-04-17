"use client";

import { useState, useMemo, useCallback } from "react";
import { cards as initialCards, typeColors, Card } from "@/lib/cards";

type SortKey = keyof Card;
type SortDir = "asc" | "desc";

export default function PortfolioTracker() {
  const [cardList, setCardList] = useState<Card[]>(initialCards);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [setFilter, setSetFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState<"all" | "owned" | "wanted">("all");
  const [sortKey, setSortKey] = useState<SortKey>("pokedexNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleOwned = useCallback((id: string) => {
    setCardList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, owned: !c.owned } : c))
    );
  }, []);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    cardList.forEach((c) => {
      types.add(c.type1);
      if (c.type2) types.add(c.type2);
    });
    return Array.from(types).sort();
  }, [cardList]);

  const allSets = useMemo(() => {
    return Array.from(new Set(cardList.map((c) => c.set))).sort();
  }, [cardList]);

  const filtered = useMemo(() => {
    let list = cardList;

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
      list = list.filter((c) => c.owned);
    } else if (ownershipFilter === "wanted") {
      list = list.filter((c) => !c.owned);
    }

    list = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [cardList, search, typeFilter, setFilter, ownershipFilter, sortKey, sortDir]);

  const stats = useMemo(() => {
    const owned = cardList.filter((c) => c.owned).length;
    const total = cardList.length;
    const totalBudget = cardList.reduce((s, c) => s + (c.buyPrice ?? 0), 0);
    const spentEstimate = cardList
      .filter((c) => c.owned)
      .reduce((s, c) => s + (c.buyPrice ?? 0), 0);
    const spentActual = cardList
      .filter((c) => c.owned)
      .reduce((s, c) => s + (c.pricePaid ?? 0), 0);
    const remaining = totalBudget - spentEstimate;
    return { owned, total, totalBudget, spentEstimate, spentActual, remaining };
  }, [cardList]);

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

  return (
    <div className="container">
      <header>
        <h1>Pokemon Card Portfolio</h1>
        <p>
          {stats.owned} / {stats.total} cards collected
        </p>
      </header>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${(stats.owned / stats.total) * 100}%` }}
        />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{stats.owned}</div>
          <div className="label">Owned</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.total - stats.owned}</div>
          <div className="label">Still Wanted</div>
        </div>
        <div className="stat-card">
          <div className="value">
            {stats.totalBudget.toFixed(2).replace(".", ",")} &euro;
          </div>
          <div className="label">Total Budget</div>
        </div>
        <div className="stat-card">
          <div className="value">
            {stats.spentEstimate.toFixed(2).replace(".", ",")} &euro;
          </div>
          <div className="label">Spent (est.)</div>
        </div>
        <div className="stat-card">
          <div className="value">
            {stats.spentActual.toFixed(2).replace(".", ",")} &euro;
          </div>
          <div className="label">Spent (actual)</div>
        </div>
        <div className="stat-card">
          <div className="value">
            {stats.remaining.toFixed(2).replace(".", ",")} &euro;
          </div>
          <div className="label">Remaining</div>
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
      </div>

      <table className="card-table">
        <thead>
          <tr>
            <th>Own</th>
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
          {filtered.map((card) => (
            <tr key={card.id} className={card.owned ? "owned" : ""}>
              <td>
                <input
                  type="checkbox"
                  className="owned-checkbox"
                  checked={card.owned}
                  onChange={() => toggleOwned(card.id)}
                />
              </td>
              <td className="pokedex-num">{card.pokedexNumber}</td>
              <td>
                <strong>{card.name}</strong>
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
              <td className="hide-mobile">{card.language}</td>
              <td className="hide-mobile">
                {card.variant && (
                  <span className="variant-badge">{card.variant}</span>
                )}
              </td>
              <td className="price">
                {card.buyPrice != null
                  ? `${card.buyPrice.toFixed(2).replace(".", ",")} \u20AC`
                  : "\u2014"}
              </td>
              <td className="price">
                {card.pricePaid != null
                  ? `${card.pricePaid.toFixed(2).replace(".", ",")} \u20AC`
                  : "\u2014"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ textAlign: "center", marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
        Showing {filtered.length} of {cardList.length} cards
      </p>
    </div>
  );
}
