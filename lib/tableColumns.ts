import type { Card } from "./cards";
import type { Binder } from "./binders";
import type { SortKey } from "./sort";

export type TableColumnKey =
  | "own"
  | "number"
  | "name"
  | "type"
  | "rarity"
  | "code"
  | "set"
  | "buyPrice"
  | "pricePaid";

export type TableColumn = {
  key: TableColumnKey;
  /** Sentence-case header text. */
  label: string;
  /** Null for columns that do not sort (Type, Rarity). */
  sortKey: SortKey | null;
};

/**
 * The table columns a binder earns (design critique 2026-10-29, item 5).
 * Decided from the whole binder, not the filtered rows, so the layout does not
 * jump as filters change: Set only when the binder spans more than one set,
 * Rarity only when a card carries one. Language and Variant are gone: every
 * card is Japanese and the variant is already part of the name. CSV export
 * still carries every field (lib/purchases.ts buildCsv).
 */
export function tableColumns(binderCards: Card[], binder: Pick<Binder, "sort">): TableColumn[] {
  const sets = new Set(binderCards.map((c) => c.set));
  const hasRarity = binderCards.some((c) => c.rarity != null);
  const cols: TableColumn[] = [
    { key: "own", label: "Own", sortKey: "owned" },
    { key: "number", label: "#", sortKey: binder.sort },
    { key: "name", label: "Name", sortKey: "name" },
    { key: "type", label: "Type", sortKey: null },
  ];
  if (hasRarity) cols.push({ key: "rarity", label: "Rarity", sortKey: null });
  cols.push({ key: "code", label: "Code", sortKey: "code" });
  if (sets.size > 1) cols.push({ key: "set", label: "Set", sortKey: "set" });
  cols.push(
    { key: "buyPrice", label: "Buy price", sortKey: "buyPrice" },
    { key: "pricePaid", label: "Paid", sortKey: "pricePaid" },
  );
  return cols;
}
