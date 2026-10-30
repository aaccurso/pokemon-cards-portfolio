import type { Binder } from "./binders";

export type CardCategory = "Pokemon" | "Trainer" | "Energy";

/** The slice of a binder that display helpers need. */
export type BinderDisplay = Pick<Binder, "kind"> & Partial<Pick<Binder, "officialCount">>;

export type Card = {
  id: string;
  name: string;
  code: string;
  set: string;
  qty: number;
  language: string;
  condition: string;
  buyPrice: number | null;
  imageUrl?: string | null;
  imageIsFallback?: boolean;
  localImage?: boolean;
  pokedexNumber: number | null;
  type1: string | null;
  type2: string | null;
  generation: number | null;
  variant: string | null;
  binderId: string;
  /** Absent means "Pokemon" — see cardCategory(). */
  category?: CardCategory;
  /** Numeric part of `code`; the sort key for master-set binders. */
  setNumber: number;
  /** Printed Japanese name, when it differs from `name`. */
  nameJa?: string;
  /** tcgdex card id such as "SV2a-063"; join key for price refresh. */
  tcgdexId?: string;
  /** tcgdex rarity label, e.g. "Classic Collection". */
  rarity?: string;
};

export function cardCategory(c: Card): CardCategory {
  return c.category ?? "Pokemon";
}


export const languageFlags: Record<string, string> = {
  Japanese: "\u{1F1EF}\u{1F1F5}",
  English: "\u{1F1EC}\u{1F1E7}",
  German: "\u{1F1E9}\u{1F1EA}",
  French: "\u{1F1EB}\u{1F1F7}",
  Italian: "\u{1F1EE}\u{1F1F9}",
  Spanish: "\u{1F1EA}\u{1F1F8}",
  Portuguese: "\u{1F1F5}\u{1F1F9}",
  Any: "\u{1F310}",
};

export const conditionNames: Record<string, string> = {
  MT: "Mint",
  NM: "Near Mint",
  EX: "Excellent",
  GD: "Good",
  LP: "Lightly Played",
  PL: "Played",
  PO: "Poor",
};

export const typeColors: Record<string, string> = {
  Normal: "#A8A878",
  Fire: "#F08030",
  Water: "#6890F0",
  Electric: "#F8D030",
  Grass: "#78C850",
  Ice: "#98D8D8",
  Fighting: "#C03028",
  Poison: "#A040A0",
  Ground: "#E0C068",
  Flying: "#A890F0",
  Psychic: "#F85888",
  Bug: "#A8B820",
  Rock: "#B8A038",
  Ghost: "#705898",
  Dragon: "#7038F8",
  Dark: "#705848",
  Steel: "#B8B8D0",
  Fairy: "#EE99AC",
};

export type RarityLabel = { rarity: string; label: string };

/**
 * tcgdex rarity labels in display order, with the short label the UI shows.
 * "None" is what tcgdex reports for Common, Uncommon and plain Rare prints.
 * Rarities not listed here sort after these and display their raw label.
 */
export const rarityOrder: RarityLabel[] = [
  { rarity: "None", label: "Common / Uncommon" },
  { rarity: "Double rare", label: "RR" },
  { rarity: "Illustration rare", label: "AR" },
  { rarity: "Special illustration rare", label: "SAR" },
  { rarity: "Futuristic Rare", label: "Futuristic" },
  { rarity: "Classic Collection", label: "Classic" },
];

/**
 * Master-set binders show the slot index as printed on the card ("126/103",
 * or "126" without an official count). Wants binders show the Pokedex number
 * ("#025"), falling back to "No. 101" for cards without one.
 */
export function numberLabel(c: Card, binder: BinderDisplay): string {
  if (binder.kind === "master-set") {
    const n = String(c.setNumber).padStart(3, "0");
    return binder.officialCount != null ? `${n}/${binder.officialCount}` : n;
  }
  if (c.pokedexNumber != null) {
    return `#${String(c.pokedexNumber).padStart(3, "0")}`;
  }
  return `No. ${c.setNumber}`;
}

/** `ink` is the text colour that reads on `color`: dark on the light fills, white elsewhere. */
export type TypeBadge = { label: string; color: string; ink: string };

/** WCAG relative luminance (0 black to 1 white) of a `#rgb` or `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/**
 * Fills lighter than this get dark ink. White text on a fill at this luminance is
 * about 2.6:1; the badges have no text-shadow to help it. It lands between Rock
 * (0.36) and Flying (0.35), so Electric, Ice, Ground, Steel, Grass, Fairy, Bug,
 * Normal and Rock are dark-ink and the saturated types keep white.
 */
export const BADGE_INK_LUMINANCE = 0.35;

export function badgeInk(fill: string): string {
  return relativeLuminance(fill) > BADGE_INK_LUMINANCE ? "#1a1a1a" : "#fff";
}

/** Type badges for Pokemon; one neutral category badge otherwise. */
export function typeBadges(c: Card): TypeBadge[] {
  const category = cardCategory(c);
  if (category !== "Pokemon" || c.type1 == null) {
    return [{ label: category === "Pokemon" ? "Unknown" : category, color: "#777", ink: "#fff" }];
  }
  const badge = (type: string): TypeBadge => {
    const color = typeColors[type] ?? "#888";
    return { label: type, color, ink: badgeInk(color) };
  };
  const badges: TypeBadge[] = [badge(c.type1)];
  if (c.type2) badges.push(badge(c.type2));
  return badges;
}

export type EmptyStateInput = {
  /** Raw search box text. */
  search: string;
  ownershipFilter: "all" | "owned" | "wanted" | "dupes";
  /** Owned cards in the current binder, before any filter. */
  binderOwned: number;
};

/**
 * Copy for the empty state shown when a filter combination matches no cards.
 * Most specific cause first: "Owned only" on a binder with nothing owned, or
 * "Duplicates only" anywhere (clearing the search would not help either),
 * then the search text, then generic.
 */
export function emptyStateMessage(input: EmptyStateInput): string {
  if (input.ownershipFilter === "owned" && input.binderOwned === 0) {
    return "Nothing owned yet in this binder.";
  }
  if (input.ownershipFilter === "dupes") {
    return "No duplicates in this binder.";
  }
  const q = input.search.trim();
  if (q) return `No cards match "${q}".`;
  return "No cards match these filters.";
}
