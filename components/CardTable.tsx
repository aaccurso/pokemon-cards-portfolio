"use client";

import { useState } from "react";
import { numberLabel, rarityLabel, typeBadges, Card } from "@/lib/cards";
import type { Binder } from "@/lib/binders";
import type { OwnershipMap, CardOwnership } from "@/lib/purchases";
import type { SortKey, SortDir } from "@/lib/sort";
import type { TableColumn } from "@/lib/tableColumns";
import { fmtEur } from "@/lib/format";

type Props = {
  cards: Card[];
  /** From lib/tableColumns: decided per binder, not per filtered list. */
  columns: TableColumn[];
  ownership: OwnershipMap;
  binder: Binder;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onOpen: (card: Card) => void;
};

export function CardTable({ cards, columns, ownership, binder, sortKey, sortDir, onSort, onOpen }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  function header(col: TableColumn) {
    const key = col.sortKey;
    if (key == null) return <th key={col.key}>{col.label}</th>;
    const active = sortKey === key;
    return (
      <th key={col.key} className="sortable" aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" className="th-sort" onClick={() => onSort(key)}>
          {col.label}
          {/* Every sortable header shows a glyph: the active one its direction, the rest a muted two-way arrow. */}
          <span className={active ? "sort-indicator" : "sort-indicator idle"} aria-hidden>
            {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
          </span>
        </button>
      </th>
    );
  }

  function cell(col: TableColumn, card: Card, own: CardOwnership | undefined) {
    switch (col.key) {
      case "own":
        return (
          <td key={col.key} className="own-cell">
            {own ? (
              <>
                <span className="pokeball pokeball-xs" aria-label="Owned" title="Owned" />
                {own.purchaseCount > 1 && (
                  <span
                    className="copies-badge"
                    title={`${own.purchaseCount} copies owned (${own.duplicateCount} extra)`}
                  >
                    x{own.purchaseCount}
                  </span>
                )}
              </>
            ) : (
              <span className="own-indicator wanted" aria-label="Wanted" title="Wanted">
                ○
              </span>
            )}
          </td>
        );
      case "number":
        return <td key={col.key} className="pokedex-num">{numberLabel(card, binder)}</td>;
      case "name":
        return (
          <td key={col.key} className="name-cell">
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
        );
      case "type":
        return (
          <td key={col.key} className="row-meta">
            {typeBadges(card).map((b) => (
              <span
                key={b.label}
                className={`type-badge${b.label === "Trainer" || b.label === "Energy" ? " trainer" : ""}`}
                style={{ background: b.color, color: b.ink }}
              >
                {b.label}
              </span>
            ))}
          </td>
        );
      case "rarity":
        return <td key={col.key} className="row-meta">{card.rarity != null ? rarityLabel(card.rarity) : null}</td>;
      case "code":
        return <td key={col.key} className="row-meta">{card.code}</td>;
      case "set":
        return <td key={col.key} className="row-meta">{card.set}</td>;
      case "buyPrice":
        return <td key={col.key} className="price">{card.buyPrice != null ? fmtEur(card.buyPrice) : "—"}</td>;
      case "pricePaid": {
        const paid = own && own.pricePaid != null ? own.pricePaid : null;
        return (
          <td key={col.key} className={paid == null ? "price row-meta paid is-empty" : "price row-meta paid"}>
            {paid != null ? fmtEur(paid) : "—"}
          </td>
        );
      }
    }
  }

  return (
    <div className="table-wrap">
      <table className="card-table">
        <thead>
          <tr>{columns.map(header)}</tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const own = ownership.get(card.id);
            return (
              <tr key={card.id} className={own ? "owned" : ""}>
                {columns.map((col) => cell(col, card, own))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
