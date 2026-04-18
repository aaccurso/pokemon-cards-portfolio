import purchasesJson from "@/data/purchases.json";
import { Card } from "./cards";

export type PurchaseItem = {
  cardId: string;
  pricePaid: number;
  condition: string;
};

export type Shipment = {
  id: string;
  seller: string | null;
  date: string | null;
  shipping: number | null;
  fees: number | null;
  total: number | null;
  items: PurchaseItem[];
};

export type PurchaseData = { shipments: Shipment[] };

export const purchases: PurchaseData = purchasesJson as PurchaseData;

export type CardOwnership = {
  owned: true;
  pricePaid: number;
  duplicateCount: number;
  purchaseCount: number;
};

export type OwnershipMap = Map<string, CardOwnership>;

export function buildOwnershipMap(data: PurchaseData = purchases): OwnershipMap {
  const map: OwnershipMap = new Map();
  for (const ship of data.shipments) {
    for (const item of ship.items) {
      const existing = map.get(item.cardId);
      if (!existing) {
        map.set(item.cardId, {
          owned: true,
          pricePaid: item.pricePaid,
          duplicateCount: 0,
          purchaseCount: 1,
        });
      } else {
        existing.purchaseCount += 1;
        existing.duplicateCount += 1;
        if (item.pricePaid < existing.pricePaid) existing.pricePaid = item.pricePaid;
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
  savings: number;
  toComplete: number;
};

export function computeStats(
  cards: Card[],
  ownership: OwnershipMap,
  data: PurchaseData = purchases
): CollectionStats {
  let owned = 0;
  let pricedCount = 0;
  let budget = 0;
  let spentOnCards = 0;
  let savings = 0;
  let toComplete = 0;

  for (const c of cards) {
    const o = ownership.get(c.id);
    if (o) owned++;
    if (c.buyPrice != null) {
      pricedCount++;
      budget += c.buyPrice;
      if (!o) toComplete += c.buyPrice;
    }
    if (o) {
      spentOnCards += o.pricePaid;
      if (c.buyPrice != null) savings += c.buyPrice - o.pricePaid;
    }
  }

  const totalOutlay = data.shipments.reduce((s, sh) => s + (sh.total ?? 0), 0);

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
  };
}

export function buildCsv(cards: Card[], ownership: OwnershipMap): string {
  const header =
    "Card Name,Card Code,Set,Qty,Language,Condition,Buy Price (EUR),Price Paid (EUR),Owned,Pokedex #,Type 1,Type 2,Generation,Card Variant,Binder";
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
      o ? o.pricePaid.toFixed(2) : "",
      o ? "true" : "false",
      String(c.pokedexNumber),
      c.type1,
      c.type2 ?? "",
      String(c.generation),
      csvEscape(c.variant ?? ""),
      c.binderId,
    ].join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
