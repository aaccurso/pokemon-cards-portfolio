import type { Card } from "./cards";
import type { Binder } from "./binders";
import type { OwnershipMap } from "./purchases";

/** The slice of a binder the needed list depends on. */
export type NeededBinder = Pick<Binder, "kind" | "sort"> &
  Partial<Pick<Binder, "officialCount">>;

export type NeededEntry = { card: Card; owned: boolean; label: string };

/** One run of cells; master-set binders split secrets into a second block. */
export type NeededBlock = { title: string | null; entries: NeededEntry[] };

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/**
 * Compact label for one cell. Master-set binders show the bare set index
 * ("003") because the set is known from context. Wants binders need the
 * name too ("#025 Pikachu"), since a Pokedex number alone does not identify
 * a print across sets.
 */
export function neededLabel(c: Card, binder: NeededBinder): string {
  if (binder.kind === "master-set") return pad3(c.setNumber);
  const num = c.pokedexNumber != null ? `#${pad3(c.pokedexNumber)}` : `No. ${c.setNumber}`;
  return `${num} ${c.name}`;
}

function sortValue(c: Card, key: NeededBinder["sort"]): number {
  const v = c[key];
  return v == null ? Number.POSITIVE_INFINITY : v;
}

/** Every card of the binder in binder order, flagged owned, grouped into blocks. */
export function buildNeededBlocks(
  cards: Card[],
  ownership: OwnershipMap,
  binder: NeededBinder
): NeededBlock[] {
  const entries: NeededEntry[] = [...cards]
    .sort((a, b) => sortValue(a, binder.sort) - sortValue(b, binder.sort))
    .map((card) => ({ card, owned: ownership.has(card.id), label: neededLabel(card, binder) }));

  const official = binder.officialCount;
  if (binder.kind !== "master-set" || official == null) {
    return [{ title: null, entries }];
  }
  const main = entries.filter((e) => e.card.setNumber <= official);
  const secret = entries.filter((e) => e.card.setNumber > official);
  if (secret.length === 0) return [{ title: null, entries }];
  const last = secret[secret.length - 1].card.setNumber;
  return [
    { title: `Set 001 to ${pad3(official)}`, entries: main },
    { title: `Secret ${pad3(official + 1)} to ${pad3(last)}`, entries: secret },
  ];
}

/** Paste-ready line for a seller chat: "Need (62): 003 007 012". */
export function neededText(
  cards: Card[],
  ownership: OwnershipMap,
  binder: NeededBinder
): string {
  const missing = buildNeededBlocks(cards, ownership, binder)
    .flatMap((b) => b.entries)
    .filter((e) => !e.owned);
  if (missing.length === 0) return "Need (0): complete";
  const sep = binder.kind === "master-set" ? " " : ", ";
  return `Need (${missing.length}): ${missing.map((e) => e.label).join(sep)}`;
}
