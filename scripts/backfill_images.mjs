#!/usr/bin/env node
/**
 * Backfill imageUrl for cards missing one.
 *
 * Primary source: pokemontcg.io (English card images, variant-aware query).
 * Fallback: pokeapi.co official artwork (always resolves for Kanto dex 1–151).
 *
 * Safe to re-run — only fills cards where imageUrl is null/empty.
 * Every card it touches gets imageIsFallback: true so the UI can mark it
 * visually.
 *
 *   node scripts/backfill_images.mjs
 */
import fs from "node:fs";
import path from "node:path";

const FILE = path.resolve("data/cards.json");

function stripVariantSuffix(name) {
  return name.replace(/\s+(V|VMAX|VSTAR|GX|ex|Lv\.\d+)$/i, "").trim();
}

function buildQuery(card) {
  const v = card.variant ?? "";
  const base = stripVariantSuffix(card.name);

  let nameQ = base;
  if (v.includes("Alolan Form")) nameQ = `Alolan ${base.replace(/^Alolan\s+/, "")}`;
  else if (v.includes("Hisuian Form")) nameQ = `Hisuian ${base.replace(/^Hisuian\s+/, "")}`;
  else if (v.includes("Galarian Form")) nameQ = `Galarian ${base.replace(/^Galarian\s+/, "")}`;
  else if (v.includes("Paldean")) nameQ = `Paldean ${base.replace(/^Paldean\s+/, "")}`;
  else if (v.includes("Trainer's Pokemon")) nameQ = base.replace(/^[A-Za-z']+'s\s+/, "");

  const parts = [`name:"${nameQ}"`];
  if (/\bVMAX\b/.test(v)) parts.push("subtypes:VMAX");
  else if (/\bVSTAR\b/.test(v)) parts.push("subtypes:VSTAR");
  else if (/\bV\b/.test(v)) parts.push("subtypes:V");
  else if (/\bGX\b/.test(v)) parts.push("subtypes:GX");
  else if (/\bMega\b/i.test(v)) parts.push("subtypes:MEGA");
  else if (/\bex\b/.test(v)) parts.push("subtypes:ex");

  return parts.join(" ");
}

async function queryPokemonTcg(card) {
  const q = buildQuery(card);
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1&orderBy=-set.releaseDate`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.data?.[0];
  return hit?.images?.large ?? hit?.images?.small ?? null;
}

function pokeapiArtworkUrl(dex) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;
}

async function resolve(card) {
  try {
    const primary = await queryPokemonTcg(card);
    if (primary) return { url: primary, via: "pokemontcg.io" };
  } catch (e) {
    console.warn(`  pokemontcg.io failed for ${card.name}:`, e.message);
  }
  return { url: pokeapiArtworkUrl(card.pokedexNumber), via: "pokeapi.co" };
}

const cards = JSON.parse(fs.readFileSync(FILE, "utf8"));
const missing = cards.filter((c) => !c.imageUrl);
console.log(`Cards missing imageUrl: ${missing.length} / ${cards.length}`);
if (missing.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

const results = [];
for (let i = 0; i < missing.length; i += 5) {
  const batch = missing.slice(i, i + 5);
  const resolved = await Promise.all(
    batch.map(async (c) => {
      const r = await resolve(c);
      return { card: c, ...r };
    })
  );
  results.push(...resolved);
  console.log(`  ${Math.min(i + 5, missing.length)} / ${missing.length}`);
}

for (const { card, url } of results) {
  const target = cards.find((c) => c.id === card.id);
  target.imageUrl = url;
  target.imageIsFallback = true;
}

fs.writeFileSync(FILE, JSON.stringify(cards, null, 2) + "\n");

const viaPokemonTcg = results.filter((r) => r.via === "pokemontcg.io").length;
const viaPokeapi = results.filter((r) => r.via === "pokeapi.co").length;
console.log(`\nDone. Filled ${results.length} cards:`);
console.log(`  pokemontcg.io: ${viaPokemonTcg}`);
console.log(`  pokeapi.co:    ${viaPokeapi}`);
