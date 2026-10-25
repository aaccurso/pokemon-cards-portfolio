import type { BinderDisplay, Card } from "./cards";
import type { OwnershipMap } from "./purchases";

/**
 * Cardmarket has no derivable product URL for Japanese prints, so link to a
 * search on the printed set code ("M6a 001", "sv2a 063") instead.
 */
export function cardmarketSearchUrl(code: string): string {
  return (
    "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=" +
    encodeURIComponent(code)
  );
}

/**
 * One-line "needed" list for pasting into a chat with a seller.
 * Master-set binders: `Need (62): 003 007 012` (set numbers, ascending).
 * Wants binders: `Need (2): #006 Charizard ex, #025 Pikachu` (Pokedex order),
 * because a Pokedex number alone does not identify a print across sets.
 */
export function neededText(
  cards: Card[],
  ownership: OwnershipMap,
  binder: BinderDisplay
): string {
  const missing = cards.filter((c) => !ownership.has(c.id));
  if (missing.length === 0) return "Need (0)";
  const isMaster = binder.kind === "master-set";
  const key = (c: Card) => (isMaster ? c.setNumber : c.pokedexNumber ?? Number.MAX_SAFE_INTEGER);
  const sorted = [...missing].sort((a, b) => key(a) - key(b) || a.setNumber - b.setNumber);
  const body = isMaster
    ? sorted.map((c) => pad3(c.setNumber)).join(" ")
    : sorted
        .map((c) => (c.pokedexNumber != null ? `#${pad3(c.pokedexNumber)} ${c.name}` : c.name))
        .join(", ");
  return `Need (${missing.length}): ${body}`;
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}
