import cardsJson from "@/data/cards.json";

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
  pokedexNumber: number;
  type1: string;
  type2: string | null;
  generation: number;
  variant: string | null;
  binderId: string;
};

export const cards: Card[] = cardsJson as Card[];

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
