import type { Card } from "./cards";
import type { PurchaseData } from "./purchases";

export type BinderKind = "wants" | "master-set";
export type BinderSort = "pokedexNumber" | "setNumber";

export type Binder = {
  id: string;
  name: string;
  description: string;
  /**
   * "wants": a curated list; buyPrice == null means no illustrated print
   * chosen yet, and the "Illustration only" toggle is shown.
   * "master-set": every card is the target; buyPrice is the current single
   * price, and the toggle is hidden.
   */
  kind: BinderKind;
  /** Default sort key for the dashboard and print page. */
  sort: BinderSort;
  /** Number of non-secret cards, for "No. 101 / 103" labels. */
  officialCount?: number;
};

export const DEFAULT_BINDER_ID = "kanto-151";

export const SITE_TITLE = "Pokémon card binders";

/** Comma-separated binder names in data order; empty string for no binders. */
export function binderNames(binders: Binder[]): string {
  return binders.map((b) => b.name).join(", ");
}

/** Site-wide meta description, enumerating every binder so shared links stay honest. */
export function siteDescription(binders: Binder[]): string {
  const names = binderNames(binders);
  const lead = names
    ? `Personal tracker for Japanese Pokémon TCG binders: ${names}.`
    : "Personal tracker for Japanese Pokémon TCG binders.";
  return `${lead} Log Cardmarket shipments and booster pulls, watch each binder fill in, and print placeholder sheets.`;
}

/** Alt text for the Open Graph image. */
export function ogAlt(binders: Binder[]): string {
  const names = binderNames(binders);
  return names ? `${SITE_TITLE}: ${names}` : SITE_TITLE;
}

export function resolveBinderId(
  param: string | null | undefined,
  binders: Binder[]
): string {
  if (param && binders.some((b) => b.id === param)) return param;
  return DEFAULT_BINDER_ID;
}

export function getBinder(id: string, binders: Binder[]): Binder {
  const b = binders.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown binder ${id}`);
  return b;
}

export function cardsForBinder(id: string, cards: Card[]): Card[] {
  return cards.filter((c) => c.binderId === id);
}

export function buildCardBinderMap(cards: Card[]): Map<string, string> {
  return new Map(cards.map((c) => [c.id, c.binderId]));
}

/** Returns human-readable problems; empty when the data is consistent. */
export function validateData(
  cards: Card[],
  purchases: PurchaseData,
  binders: Binder[]
): string[] {
  const problems: string[] = [];
  const binderIds = new Set(binders.map((b) => b.id));
  const cardIds = new Set(cards.map((c) => c.id));
  for (const c of cards) {
    if (!binderIds.has(c.binderId)) {
      problems.push(`card ${c.id} has unknown binderId ${c.binderId}`);
    }
  }
  for (const sh of purchases.shipments) {
    for (const item of sh.items) {
      if (!cardIds.has(item.cardId)) {
        problems.push(
          `shipment ${sh.id} item references unknown card ${item.cardId}`
        );
      }
    }
  }
  return problems;
}
