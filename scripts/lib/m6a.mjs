/**
 * Pure helpers for building 30th CELEBRATION (M6a) card entries from a
 * tcgdex card record plus a PriceCharting product.
 */
import { englishName, largeImage } from "./pricecharting.mjs";

export const BINDER_ID = "m6a-30th";
export const SET_NAME = "30th CELEBRATION";
export const SET_CODE = "M6a";

/** tcgdex energy names that differ from this project's type names. */
const TYPE_MAP = { Lightning: "Electric", Darkness: "Dark", Colorless: "Normal" };

const GEN_MAX = [151, 251, 386, 493, 649, 721, 809, 905, 1025];

export function generationOf(dexId) {
  const i = GEN_MAX.findIndex((max) => dexId <= max);
  return i === -1 ? GEN_MAX.length : i + 1;
}

const FORMS = [
  [/^Alolan\b/, "Alolan Form"],
  [/^Galarian\b/, "Galarian Form"],
  [/^Hisuian\b/, "Hisuian Form"],
  [/^Paldean\b/, "Paldean Form"],
];
const SUFFIXES = ["VMAX", "VSTAR", "BREAK", "LEGEND", "GX", "EX", "ex", "V"];

/** "Alolan Golem GX" -> "Alolan Form / GX"; "M Gardevoir EX" -> "Mega / EX"; null when plain. */
export function detectVariant(name) {
  const parts = [];
  if (/^M\s/.test(name)) parts.push("Mega");
  for (const [re, label] of FORMS) if (re.test(name)) parts.push(label);
  if (/^[A-Z][a-z]+'s\s/.test(name)) parts.push("Trainer's Pokemon");
  const last = name.trim().split(/\s+/).pop();
  if (SUFFIXES.includes(last)) parts.push(last);
  return parts.length ? parts.join(" / ") : null;
}

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapType(t) {
  return TYPE_MAP[t] ?? t;
}

/**
 * Build a data/cards.json entry. `product` may be undefined when PriceCharting
 * lacks the card; then the English name must come from `trainerNames[localId]`.
 */
export function buildM6aCard(tcgdexCard, product, trainerNames) {
  const number = Number(tcgdexCard.localId);
  const name = product
    ? englishName(product.productName)
    : trainerNames[tcgdexCard.localId];
  if (!name) {
    throw new Error(`No English name for M6a-${tcgdexCard.localId} (${tcgdexCard.name})`);
  }
  const isPokemon = tcgdexCard.category === "Pokemon";
  const dex = isPokemon && tcgdexCard.dexId?.length ? tcgdexCard.dexId[0] : null;
  const types = isPokemon ? (tcgdexCard.types ?? []).map(mapType) : [];
  return {
    id: `${BINDER_ID.split("-")[0]}-${tcgdexCard.localId}-${slugify(name)}`,
    name,
    code: `${SET_CODE} ${tcgdexCard.localId}`,
    set: SET_NAME,
    qty: 1,
    language: "Japanese",
    condition: "NM",
    buyPrice: null,
    imageUrl: product?.imageUri ? largeImage(product.imageUri) : null,
    pokedexNumber: dex,
    type1: types[0] ?? null,
    type2: types[1] ?? null,
    generation: dex != null ? generationOf(dex) : null,
    variant: isPokemon ? detectVariant(name) : null,
    binderId: BINDER_ID,
    localImage: false,
    setNumber: number,
    category: tcgdexCard.category,
    tcgdexId: tcgdexCard.id,
    nameJa: tcgdexCard.name,
    rarity: tcgdexCard.rarity,
  };
}
