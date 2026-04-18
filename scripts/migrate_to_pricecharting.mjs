#!/usr/bin/env node
/**
 * For cards currently flagged imageIsFallback, search PriceCharting for the
 * exact Japanese card (by name + set name). PriceCharting indexes most JP
 * print runs, so when a match is found we can replace the pokemontcg.io
 * fallback with the actual JP card image and clear the ALT flag.
 *
 *   node scripts/migrate_to_pricecharting.mjs          # dry run
 *   node scripts/migrate_to_pricecharting.mjs --apply  # write data/cards.json
 */
import fs from "node:fs";

const FILE = "data/cards.json";
const APPLY = process.argv.includes("--apply");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

function searchUrl(query) {
  const q = encodeURIComponent(query);
  return `https://www.pricecharting.com/search-products?q=${q}&type=prices`;
}

function imageUrl(hash) {
  return `https://storage.googleapis.com/images.pricecharting.com/${hash}/1600.jpg`;
}

async function fetchFirstMatch(query) {
  const res = await fetch(searchUrl(query), { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(
    /<tr id="product-(\d+)"[\s\S]*?images\.pricecharting\.com\/([a-z0-9]+)\/60\.jpg/
  );
  if (!m) return null;
  const productId = m[1];
  const hash = m[2];
  // Try to extract the product title for sanity-checking.
  const afterTr = html.slice(html.indexOf(`<tr id="product-${productId}"`));
  const titleMatch = afterTr.match(
    /<td class="title">[\s\S]*?<a [^>]*href="[^"]*\/game\/[^"]+"[^>]*>\s*([^<]+)\s*</
  );
  const setMatch = afterTr.match(
    /<td class="console[^"]*">[\s\S]*?<a[^>]*>\s*([^<]+)\s*</
  );
  return {
    productId,
    hash,
    title: titleMatch ? titleMatch[1].trim() : null,
    setName: setMatch ? setMatch[1].trim() : null,
    url: imageUrl(hash),
  };
}

function stripVariantSuffix(name) {
  return name.replace(/\s+(V|VMAX|VSTAR|GX|ex|Lv\.\d+)$/i, "").trim();
}

function buildQuery(card) {
  // Use full name (including variant word) + set name. This is the most
  // natural query and what a human would type.
  const name = card.name;
  const set = card.set;
  return `${name} ${set}`;
}

function looksLikeRealMatch(card, matched) {
  if (!matched) return false;
  const hay = [matched.title, matched.setName].filter(Boolean).join(" ").toLowerCase();
  if (!hay) return false;
  // Match if the set name appears in the title/console (JP set confirmed).
  const setWords = card.set.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const setHit = setWords.some((w) => hay.includes(w));
  // Match if card name's base appears too (so we didn't pick a totally unrelated row).
  const nameWord = stripVariantSuffix(card.name).toLowerCase().split(/\s+/)[0];
  const nameHit = nameWord && hay.includes(nameWord);
  return setHit && nameHit;
}

const cards = JSON.parse(fs.readFileSync(FILE, "utf8"));
const fallbacks = cards.filter((c) => c.imageIsFallback);
console.log(`Searching PriceCharting for ${fallbacks.length} fallback cards...\n`);

const results = [];
// Sequential to be polite to PriceCharting.
for (let i = 0; i < fallbacks.length; i++) {
  const card = fallbacks[i];
  const q = buildQuery(card);
  try {
    const match = await fetchFirstMatch(q);
    const confirmed = looksLikeRealMatch(card, match);
    results.push({ card, match, confirmed, query: q });
    const tag = match ? (confirmed ? "✓" : "?") : "✗";
    const rhs = match ? `${match.title} [${match.setName ?? "?"}]` : "no results";
    console.log(`  ${tag} ${card.id.padEnd(22)} q="${q}" → ${rhs}`);
  } catch (e) {
    results.push({ card, match: null, confirmed: false, query: q, error: e.message });
    console.log(`  ✗ ${card.id.padEnd(22)} ERROR: ${e.message}`);
  }
  // 300ms between requests.
  await new Promise((r) => setTimeout(r, 300));
}

const diffPath = "/tmp/pricecharting_diff.json";
fs.writeFileSync(diffPath, JSON.stringify(results, null, 2));
const confirmed = results.filter((r) => r.confirmed).length;
const uncertain = results.filter((r) => r.match && !r.confirmed).length;
const none = results.filter((r) => !r.match).length;
console.log(`\nConfirmed match: ${confirmed}`);
console.log(`Uncertain:       ${uncertain}`);
console.log(`No result:       ${none}`);
console.log(`Diff saved:      ${diffPath}`);

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to write changes.");
  process.exit(0);
}

// Apply: only for confirmed matches. Also clear the fallback flag since the
// match is the user's actual JP card.
let applied = 0;
for (const r of results) {
  if (!r.confirmed || !r.match) continue;
  const target = cards.find((c) => c.id === r.card.id);
  target.imageUrl = r.match.url;
  delete target.imageIsFallback;
  applied++;
}
fs.writeFileSync(FILE, JSON.stringify(cards, null, 2) + "\n");
console.log(`\nApplied ${applied} URL swaps to data/cards.json`);
console.log(
  `Still flagged as fallback: ${cards.filter((c) => c.imageIsFallback).length}`
);
