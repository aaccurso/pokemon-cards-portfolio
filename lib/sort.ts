import type { Card } from "./cards";
import type { OwnershipMap } from "./purchases";

/**
 * Keys the dashboard can sort by: six Card fields plus two values derived
 * from purchases. `?sort=` in the URL is validated against SORT_KEYS before
 * it is trusted, so a stale or hand-typed link falls back to the binder's
 * default sort instead of persisting an unknown key.
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

export function getSortValue(
  c: Card,
  key: SortKey,
  ownership: OwnershipMap
): string | number | boolean | null {
  if (key === "pricePaid") return ownership.get(c.id)?.pricePaid ?? null;
  if (key === "owned") return ownership.has(c.id);
  const v = c[key];
  return v ?? null;
}
