import type { Card } from "./cards";
import type { OwnershipMap } from "./purchases";

/**
 * Keys the dashboard can sort by: the six Card fields CardTable exposes as
 * sortable columns plus two values derived from purchases. `?sort=` in the
 * URL is validated with isSortKey before it is trusted, so a stale or
 * hand-typed link falls back to the binder's default sort instead of
 * persisting an unknown key.
 */
export type SortKey =
  | "owned"
  | "pokedexNumber"
  | "setNumber"
  | "name"
  | "code"
  | "set"
  | "buyPrice"
  | "pricePaid";
export type SortDir = "asc" | "desc";

export const SORT_KEYS: ReadonlySet<SortKey> = new Set<SortKey>([
  "owned",
  "pokedexNumber",
  "setNumber",
  "name",
  "code",
  "set",
  "buyPrice",
  "pricePaid",
]);

export function isSortKey(v: unknown): v is SortKey {
  return typeof v === "string" && (SORT_KEYS as ReadonlySet<string>).has(v);
}

export type SortValue = string | number | boolean | null;

export function getSortValue(c: Card, key: SortKey, ownership: OwnershipMap): SortValue {
  if (key === "pricePaid") return ownership.get(c.id)?.pricePaid ?? null;
  if (key === "owned") return ownership.has(c.id);
  return c[key] ?? null;
}

/** Comparator for `Array.prototype.sort`: nulls last regardless of direction. */
export function compareBySort(key: SortKey, dir: SortDir, ownership: OwnershipMap) {
  return (a: Card, b: Card): number => {
    const av = getSortValue(a, key, ownership);
    const bv = getSortValue(b, key, ownership);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  };
}
