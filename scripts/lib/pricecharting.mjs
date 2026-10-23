/**
 * PriceCharting helpers. The console listing has a JSON mode:
 *   https://www.pricecharting.com/console/<slug>?cursor=<n>&format=json
 * which returns `{ products: [...] }` pages of 50, overlapping between pages.
 */
const UA = "Mozilla/5.0 (pokemon-cards-portfolio)";
const PAGE = 50;
const PAUSE_MS = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every product in a console listing, deduped by id. */
export async function fetchConsoleProducts(consoleSlug) {
  const byId = new Map();
  for (let cursor = 0; ; cursor += PAGE) {
    const url = `https://www.pricecharting.com/console/${consoleSlug}?cursor=${cursor}&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const json = await res.json();
    const products = json.products ?? [];
    if (products.length === 0) break;
    for (const p of products) if (!byId.has(p.id)) byId.set(p.id, p);
    await sleep(PAUSE_MS);
  }
  return [...byId.values()];
}

/** Map<cardNumber, product> for products whose uri ends in "-<number>"; first seen wins. */
export function numberedProducts(products) {
  const map = new Map();
  for (const p of products) {
    const m = /-(\d+)$/.exec(p.productUri ?? "");
    if (!m) continue;
    const n = Number(m[1]);
    if (!map.has(n)) map.set(n, p);
  }
  return map;
}

/** "Pikachu ex #126" -> "Pikachu ex". */
export function englishName(productName) {
  return productName.replace(/\s*#\d+\s*$/, "").trim();
}

/** ".../<hash>/60.jpg" -> ".../<hash>/1600.jpg". */
export function largeImage(imageUri) {
  return imageUri.replace(/\/\d+\.jpg$/, "/1600.jpg");
}
