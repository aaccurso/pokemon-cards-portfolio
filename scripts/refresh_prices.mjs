#!/usr/bin/env node
/**
 * Refresh Cardmarket prices from tcgdex for every card with a tcgdexId.
 *
 * - Appends a dated { trend, avg7, avg30, low } snapshot per card to
 *   data/prices.json (same-day reruns replace that day's snapshot).
 * - On a card's first refresh, seeds a "manual" snapshot of its current
 *   buyPrice so the pre-refresh target is never lost.
 * - Sets buyPrice = round(trend, 2), except a null buyPrice in a "wants"
 *   binder stays null (it means "no illustration chosen yet"). A trend that
 *   is not a positive number counts as "no Cardmarket price" and is skipped.
 * - Builds the files in memory and writes once at the end, through
 *   writeAllAtomic (tmp + rename, so a crash never leaves a half-written
 *   JSON file; one stale file is still possible, git is the real backstop).
 *   prices.json is written one snapshot per line (formatPrices) so a refresh
 *   diff is an append per card rather than a rewrite of every history array.
 * - Stamps data/meta.json with { pricesRefreshed: today }, the one freshness
 *   file the UI imports (prices.json stays out of the client bundle).
 *
 * Data growth (roadmap engineering item 7): ~98 bytes per snapshot, 313 per
 * refresh, so weekly runs add roughly 1.6 MB a year. Nothing imports this
 * file into the client bundle, and it must stay that way; a future history
 * view derives what it needs at build time. Shard to data/prices/<year>.json
 * only if the file passes a few MB.
 *
 * Guardrails (for the unattended weekly Action, .github/workflows/
 * refresh-prices.yml): exits 2 without writing when any card priced at
 * 1 EUR or more moves over 5x either way, when more than 60% of the
 * refreshed cards change, or when more than 10% of the attempted cards come
 * back without a Cardmarket block (the first Action run skipped all 165 M6a
 * cards that way). --force writes anyway after a human has looked.
 *
 *   node scripts/refresh_prices.mjs                       # refresh and write
 *   node scripts/refresh_prices.mjs --dry-run             # print changes only
 *   node scripts/refresh_prices.mjs --summary FILE        # also write the commit message to FILE
 *   node scripts/refresh_prices.mjs --force               # ignore the guardrails
 */
import fs from "node:fs";
import { fetchCard } from "./lib/tcgdex.mjs";
import { writeAllAtomic } from "./lib/atomic.mjs";
import {
  hasTrend,
  seedManual,
  upsertCardmarket,
  nextBuyPrice,
  topMovers,
  formatPrices,
  formatMeta,
  guardrailViolations,
  skipGuardrail,
  summaryMessage,
} from "./lib/prices.mjs";

const CARDS_FILE = "data/cards.json";
const BINDERS_FILE = "data/binders.json";
const PRICES_FILE = "data/prices.json";
const META_FILE = "data/meta.json";
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const FORCE = argv.includes("--force");
const summaryAt = argv.indexOf("--summary");
const SUMMARY_FILE = summaryAt !== -1 ? argv[summaryAt + 1] : null;
if (summaryAt !== -1 && !SUMMARY_FILE) {
  console.error("--summary needs a file path");
  process.exit(1);
}

const cards = JSON.parse(fs.readFileSync(CARDS_FILE, "utf8"));
const binders = JSON.parse(fs.readFileSync(BINDERS_FILE, "utf8"));
const prices = fs.existsSync(PRICES_FILE)
  ? JSON.parse(fs.readFileSync(PRICES_FILE, "utf8"))
  : {};
const kindOf = Object.fromEntries(binders.map((b) => [b.id, b.kind]));
const today = new Date().toISOString().slice(0, 10);

const changes = [];
const skippedNoId = [];
const skippedNoPrice = [];
let refreshed = 0;

for (let i = 0; i < cards.length; i++) {
  const card = cards[i];
  if (!card.tcgdexId) {
    skippedNoId.push(card.code);
    continue;
  }
  const tc = await fetchCard(card.tcgdexId);
  const cm = tc?.pricing?.cardmarket;
  if (!cm || !hasTrend(cm.trend)) {
    skippedNoPrice.push(card.code);
    // Diagnostics for an unattended run: show what the API actually returned
    // for the first few skips, so a lagging replica or a changed shape is
    // visible in the Action log without a rerun.
    if (skippedNoPrice.length <= 3) {
      const shape = tc == null
        ? "404 / no record"
        : `keys ${Object.keys(tc).join(",")}; pricing ${JSON.stringify(tc.pricing ?? null).slice(0, 160)}`;
      console.log(`  no price for ${card.tcgdexId}: ${shape}`);
    }
    continue;
  }
  let history = seedManual(prices[card.id], card.buyPrice, today);
  history = upsertCardmarket(history, {
    date: today,
    source: "cardmarket",
    trend: cm.trend,
    avg7: cm.avg7 ?? null,
    avg30: cm.avg30 ?? null,
    low: cm.low ?? null,
  });
  prices[card.id] = history;
  const next = nextBuyPrice(card, kindOf[card.binderId], cm.trend);
  if (next !== card.buyPrice) {
    changes.push({ id: card.id, from: card.buyPrice, to: next });
    card.buyPrice = next;
  }
  refreshed++;
  if ((i + 1) % 50 === 0 || i === cards.length - 1) {
    console.log(`  ${i + 1} / ${cards.length}`);
  }
}

console.log(`refreshed ${refreshed}, changed buyPrice on ${changes.length}`);
if (skippedNoId.length) console.log("skipped (no tcgdexId):", skippedNoId.join(", "));
if (skippedNoPrice.length) console.log("skipped (no Cardmarket price):", skippedNoPrice.join(", "));

const fmt = (v) => (v == null ? "—" : v.toFixed(2));
if (DRY_RUN) {
  console.log("dry run — changes:");
  for (const c of changes) console.log(`  ${c.id}: ${fmt(c.from)} -> ${fmt(c.to)}`);
  process.exit(0);
}

const violations = guardrailViolations(changes, refreshed);
const skipReason = skipGuardrail({
  skippedNoPrice: skippedNoPrice.length,
  attempted: refreshed + skippedNoPrice.length,
});
if (skipReason) violations.push(skipReason);
if (violations.length > 0 && !FORCE) {
  console.error("guardrail tripped, nothing written (rerun with --force after checking):");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(2);
}
if (violations.length > 0) {
  console.warn("guardrail tripped but --force given:");
  for (const v of violations) console.warn(`  ${v}`);
}

writeAllAtomic([
  [PRICES_FILE, formatPrices(prices)],
  [CARDS_FILE, JSON.stringify(cards, null, 2) + "\n"],
  [META_FILE, formatMeta({ pricesRefreshed: today })],
]);
console.log("top movers:");
for (const c of topMovers(changes.filter((c) => c.from != null), 10)) {
  console.log(`  ${c.id}: ${fmt(c.from)} -> ${fmt(c.to)}`);
}

if (SUMMARY_FILE) {
  const skipped = skippedNoId.length + skippedNoPrice.length;
  fs.writeFileSync(SUMMARY_FILE, summaryMessage({ date: today, changes, skipped }));
  console.log(`commit message written to ${SUMMARY_FILE}`);
}
