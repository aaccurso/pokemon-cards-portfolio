import { Card } from "./cards";

export type ParsedItem = {
  qty: number;
  name: string;
  set: string;
  rarity: string;
  language: string;
  condition: string;
  pricePaid: number;
};

export type ParsedShipment = {
  id: string;
  seller: string | null;
  shipping: number | null;
  total: number | null;
  items: ParsedItem[];
};

export type MatchedItem = {
  parsed: ParsedItem;
  card: Card | null;
  candidates: Card[];
};

export type MatchedShipment = Omit<ParsedShipment, "items"> & {
  items: MatchedItem[];
};

export function parseCardmarketShipments(text: string): ParsedShipment[] {
  const blocks = text.split(/^\s*Shipment\s+(\d+)\s*$/m);
  const shipments: ParsedShipment[] = [];
  for (let i = 1; i < blocks.length; i += 2) {
    const id = blocks[i].trim();
    const body = blocks[i + 1] ?? "";
    shipments.push(parseBlock(id, body));
  }
  return shipments;
}

function parseBlock(id: string, body: string): ParsedShipment {
  let seller: string | null = null;
  let shipping: number | null = null;
  let total: number | null = null;
  const items: ParsedItem[] = [];

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("Seller:")) {
      seller = line.slice(7).trim();
      continue;
    }
    if (/^Shipping\s+[\d,.]+\s*EUR$/i.test(line)) {
      shipping = parsePrice(line);
      continue;
    }
    if (/^Total\s+[\d,.]+\s*EUR$/i.test(line)) {
      total = parsePrice(line);
      continue;
    }
    const item = parseItemLine(line);
    if (item) items.push(item);
  }

  return { id, seller, shipping, total, items };
}

const ITEM_RE =
  /^(\d+)x\s+(.+?)\s+\(([^)]+)\)\s+-\s+(\S+)\s+-\s+(\S+)\s+-\s+(\S+)\s+([\d,.]+)\s*EUR$/;

function parseItemLine(line: string): ParsedItem | null {
  const m = ITEM_RE.exec(line);
  if (!m) return null;
  return {
    qty: parseInt(m[1], 10),
    name: m[2].trim(),
    set: m[3].trim(),
    rarity: m[4],
    language: m[5],
    condition: m[6],
    pricePaid: parsePrice(m[7]),
  };
}

function parsePrice(s: string): number {
  const m = /[\d,.]+/.exec(s);
  if (!m) return 0;
  return parseFloat(m[0].replace(",", "."));
}

export function matchShipments(
  shipments: ParsedShipment[],
  cards: Card[]
): MatchedShipment[] {
  return shipments.map((s) => ({
    ...s,
    items: s.items.map((p) => matchItem(p, cards)),
  }));
}

function matchItem(parsed: ParsedItem, cards: Card[]): MatchedItem {
  const nName = normalize(parsed.name);
  const nSet = normalize(parsed.set);
  let candidates = cards.filter(
    (c) => normalize(c.name) === nName && normalize(c.set) === nSet
  );
  if (candidates.length === 0) {
    candidates = cards.filter((c) => normalize(c.name) === nName);
  }
  const card = candidates.length === 1 ? candidates[0] : null;
  return { parsed, card, candidates };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
