import type { Card } from "./cards";
import type { OwnershipMap } from "./purchases";

/** A card field, or one of the two values derived from purchases. */
export type SortKey = keyof Card | "pricePaid" | "owned";
export type SortDir = "asc" | "desc";

export type SortValue = string | number | boolean | null;

export function getSortValue(c: Card, key: SortKey, ownership: OwnershipMap): SortValue {
  if (key === "pricePaid") return ownership.get(c.id)?.pricePaid ?? null;
  if (key === "owned") return ownership.has(c.id);
  const v = c[key as keyof Card];
  if (v === undefined) return null;
  return v as string | number | null;
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
