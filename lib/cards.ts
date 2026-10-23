export type CardCategory = "Pokemon" | "Trainer" | "Energy";

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
