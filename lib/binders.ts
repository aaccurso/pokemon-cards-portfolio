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

/**
 * Returns human-readable problems; empty when the data is consistent.
 *
 * This is the data gate: `lib/data.ts` throws on any problem (so `next build`
 * fails before a deploy), `tests/data.test.ts` runs it on the real files, and
 * `.githooks/pre-commit` runs that test before every commit.
 */
export function validateData(
  cards: Card[],
  purchases: PurchaseData,
  binders: Binder[]
): string[] {
  const problems: string[] = [];

  const binderIds = new Set<string>();
  for (const b of binders) {
    if (binderIds.has(b.id)) problems.push(`duplicate binder id ${b.id}`);
    binderIds.add(b.id);
    if (b.kind === "master-set" && b.officialCount == null) {
      problems.push(`master-set binder ${b.id} has no officialCount`);
    }
  }

  const cardIds = new Set<string>();
  for (const c of cards) {
    if (cardIds.has(c.id)) problems.push(`duplicate card id ${c.id}`);
    cardIds.add(c.id);
    if (!binderIds.has(c.binderId)) {
      problems.push(`card ${c.id} has unknown binderId ${c.binderId}`);
    }
  }

  const shipmentIds = new Set<string>();
  for (const sh of purchases.shipments) {
    if (sh.items.length === 0) problems.push(`shipment ${sh.id} has no items`);
    for (const item of sh.items) {
      if (!cardIds.has(item.cardId)) {
        problems.push(
          `shipment ${sh.id} item references unknown card ${item.cardId}`
        );
      }
      if (item.qty != null && item.qty < 1) {
        problems.push(`shipment ${sh.id} item ${item.cardId} has qty ${item.qty}`);
      }
      if (item.pricePaid != null && item.pricePaid < 0) {
        problems.push(
          `shipment ${sh.id} item ${item.cardId} has negative pricePaid ${item.pricePaid}`
        );
      }
    }
    // A null total is silently counted as 0 in totalOutlay, so require it.
    if (sh.total == null) problems.push(`shipment ${sh.id} has no total`);
    if (shipmentIds.has(sh.id)) problems.push(`duplicate shipment id ${sh.id}`);
    shipmentIds.add(sh.id);
  }

  return problems;
}
