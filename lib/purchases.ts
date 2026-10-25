import type { Card } from "./cards";

export type PurchaseItem = {
  cardId: string;
  /** Null means pulled from sealed product (no per-card price). */
  pricePaid: number | null;
  condition: string;
  /** Copies in this line; defaults to 1. */
  qty?: number;
};

export type Shipment = {
  id: string;
  seller: string | null;
  date: string | null;
  shipping: number | null;
  fees: number | null;
  total: number | null;
  /** Free label for sealed product, e.g. "30th CELEBRATION booster box x2". */
  product?: string;
  items: PurchaseItem[];
};

export type PurchaseData = { shipments: Shipment[] };


export type CardOwnership = {
  owned: true;
  /** Min price across priced purchases; null when every copy was pulled. */
  pricePaid: number | null;
  duplicateCount: number;
  purchaseCount: number;
};

export type OwnershipMap = Map<string, CardOwnership>;

export function buildOwnershipMap(data: PurchaseData): OwnershipMap {
  const map: OwnershipMap = new Map();
  for (const ship of data.shipments) {
    for (const item of ship.items) {
      const qty = item.qty ?? 1;
      const existing = map.get(item.cardId);
      if (!existing) {
        map.set(item.cardId, {
          owned: true,
          pricePaid: item.pricePaid,
          duplicateCount: qty - 1,
          purchaseCount: qty,
        });
      } else {
        existing.purchaseCount += qty;
        existing.duplicateCount += qty;
        if (
          item.pricePaid != null &&
          (existing.pricePaid == null || item.pricePaid < existing.pricePaid)
        ) {
          existing.pricePaid = item.pricePaid;
        }
      }
    }
  }
  return map;
}

export type CollectionStats = {
  total: number;
  owned: number;
  wanted: number;
  pricedCount: number;
  budget: number;
  spentOnCards: number;
  totalOutlay: number;
  /**
   * sum(buyPrice - pricePaid) over owned cards that have both. Superseded by
   * marketValue - spentOnCards; kept for one release, then dropped.
   */
  savings: number;
  toComplete: number;
  /** Extra copies beyond the first, summed over owned cards. */
  duplicates: number;
  /** Cardmarket trend (buyPrice) summed over owned priced cards, one copy each. */
  marketValue: number;
  /** Same, but every owned copy counts (buyPrice * purchaseCount). */
  marketValueAllCopies: number;
  /** Owned cards with buyPrice == null; they contribute nothing to marketValue. */
  unpricedOwned: number;
};

export function computeStats(
  cards: Card[],
  ownership: OwnershipMap,
  data: PurchaseData,
  binderId: string,
  cardBinder: Map<string, string>
): CollectionStats {
  let owned = 0;
  let pricedCount = 0;
  let budget = 0;
  let spentOnCards = 0;
  let savings = 0;
  let toComplete = 0;
  let duplicates = 0;
  let marketValue = 0;
  let marketValueAllCopies = 0;
  let unpricedOwned = 0;

  for (const c of cards) {
    const o = ownership.get(c.id);
    if (o) {
      owned++;
      duplicates += o.duplicateCount;
      if (c.buyPrice == null) unpricedOwned++;
    }
    if (c.buyPrice != null) {
      pricedCount++;
      budget += c.buyPrice;
      if (o) {
        marketValue += c.buyPrice;
        marketValueAllCopies += c.buyPrice * o.purchaseCount;
      } else {
        toComplete += c.buyPrice;
      }
    }
    if (o && o.pricePaid != null) {
      spentOnCards += o.pricePaid;
      if (c.buyPrice != null) savings += c.buyPrice - o.pricePaid;
    }
  }

  const totalOutlay = data.shipments.reduce(
    (sum, sh) => sum + (sh.total ?? 0) * binderShare(sh, binderId, cardBinder),
    0
  );

  return {
    total: cards.length,
    owned,
    wanted: cards.length - owned,
    pricedCount,
    budget,
    spentOnCards,
    totalOutlay,
    savings,
    toComplete,
    duplicates,
    marketValue,
    marketValueAllCopies,
    unpricedOwned,
  };
}

/** Fraction of a shipment's items (by qty) that belong to `binderId`. */
function binderShare(
  sh: Shipment,
  binderId: string,
  cardBinder: Map<string, string>
): number {
  let all = 0;
  let mine = 0;
  for (const item of sh.items) {
    const qty = item.qty ?? 1;
    all += qty;
    if (cardBinder.get(item.cardId) === binderId) mine += qty;
  }
  return all === 0 ? 0 : mine / all;
}

export function buildCsv(cards: Card[], ownership: OwnershipMap): string {
  const header =
    "Card Name,Card Code,Set,Qty,Language,Condition,Buy Price (EUR),Price Paid (EUR),Owned,Pokedex #,Type 1,Type 2,Generation,Card Variant,Binder,Category,Set Number,Japanese Name,Rarity,Qty Owned";
  const rows = cards.map((c) => {
    const o = ownership.get(c.id);
    return [
      csvEscape(c.name),
      csvEscape(c.code),
      csvEscape(c.set),
      String(c.qty),
      c.language,
      c.condition,
      c.buyPrice != null ? c.buyPrice.toFixed(2) : "",
      o && o.pricePaid != null ? o.pricePaid.toFixed(2) : "",
      o ? "true" : "false",
      c.pokedexNumber != null ? String(c.pokedexNumber) : "",
      c.type1 ?? "",
      c.type2 ?? "",
      c.generation != null ? String(c.generation) : "",
      csvEscape(c.variant ?? ""),
      c.binderId,
      // Inlined rather than cardCategory(): lib modules may only type-import each other.
      c.category ?? "Pokemon",
      String(c.setNumber),
      csvEscape(c.nameJa ?? ""),
      csvEscape(c.rarity ?? ""),
      o ? String(o.purchaseCount) : "0",
    ].join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
