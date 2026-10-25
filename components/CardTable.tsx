"use client";

import { useState } from "react";
import { languageFlags, numberLabel, typeBadges, Card } from "@/lib/cards";
import type { Binder } from "@/lib/binders";
import type { OwnershipMap } from "@/lib/purchases";
import type { SortKey, SortDir } from "@/lib/sort";
import { fmtEur } from "@/lib/format";

type Props = {
  cards: Card[];
  ownership: OwnershipMap;
  binder: Binder;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onOpen: (card: Card) => void;
};

export function CardTable({ cards, ownership, binder, sortKey, sortDir, onSort, onOpen }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return (
      <span className="sort-indicator">{sortDir === "asc" ? "▲" : "▼"}</span>
    );
  }

  return (
    <table className="card-table">
      <thead>
        <tr>
          <th onClick={() => onSort("owned")}>
            Own {sortIndicator("owned")}
          </th>
          <th onClick={() => onSort(binder.sort)}>
            # {sortIndicator(binder.sort)}
          </th>
          <th onClick={() => onSort("name")}>
            Name {sortIndicator("name")}
          </th>
          <th className="hide-mobile">Type</th>
          <th onClick={() => onSort("code")}>
            Code {sortIndicator("code")}
          </th>
          <th className="hide-mobile" onClick={() => onSort("set")}>
            Set {sortIndicator("set")}
          </th>
          <th className="hide-mobile">Language</th>
          <th className="hide-mobile">Variant</th>
          <th onClick={() => onSort("buyPrice")}>
            Buy Price {sortIndicator("buyPrice")}
          </th>
          <th onClick={() => onSort("pricePaid")}>
            Paid {sortIndicator("pricePaid")}
          </th>
        </tr>
      </thead>
      <tbody>
        {cards.map((card) => {
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
                  onClick={() => onOpen(card)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(card);
                    }
                  }}
                >
                  <span className="preview-icon" aria-label="Preview card">
                    &#128065;
                  </span>
                  <strong>
                    {card.name}
                    {card.nameJa && <span className="name-ja" lang="ja">{card.nameJa}</span>}
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
                {card.buyPrice != null ? fmtEur(card.buyPrice) : "—"}
              </td>
              <td className="price">
                {own && own.pricePaid != null ? fmtEur(own.pricePaid) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
