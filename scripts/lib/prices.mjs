/**
 * Pure helpers for the price refresh: data/prices.json is an append-only
 * history keyed by card id; buyPrice on the card is the single value the UI
 * reads. None of these mutate their inputs.
 */

/** Prepend a manual seed of the pre-refresh buyPrice, once per card. */
export function seedManual(history, buyPrice, date) {
  if (history && history.length > 0) return history;
  if (buyPrice == null) return [];
  return [{ date, source: "manual", price: buyPrice }];
}

/** Replace the cardmarket snapshot with the same date, else append. */
export function upsertCardmarket(history, snap) {
  const idx = history.findIndex(
    (s) => s.source === "cardmarket" && s.date === snap.date
  );
  if (idx === -1) return [...history, snap];
  const next = history.slice();
  next[idx] = snap;
  return next;
}

/** A usable Cardmarket trend is a positive number; 0, null, or NaN is "no price". */
export function hasTrend(trend) {
  return typeof trend === "number" && trend > 0;
}

/**
 * round(trend, 2), except: a null buyPrice in a "wants" binder means "no
 * illustration chosen yet" and stays null; a missing trend (see hasTrend)
 * leaves the price.
 */
export function nextBuyPrice(card, binderKind, trend) {
  if (!hasTrend(trend)) return card.buyPrice;
  if (binderKind === "wants" && card.buyPrice == null) return card.buyPrice;
  return Math.round(trend * 100) / 100;
}

/**
 * Guardrails for an unattended refresh. Returns human-readable reasons to
 * abort, empty when the refresh looks like a market and not an API accident:
 * - any card with a previous price of at least 1 EUR moving more than
 *   maxRatio times up or down (sub-euro commons swing wildly and harmlessly);
 * - more than maxChangedShare of the refreshed cards changing price at once.
 */
export function guardrailViolations(
  changes,
  refreshedCount,
  { maxRatio = 5, maxChangedShare = 0.6 } = {}
) {
  const reasons = [];
  for (const c of changes) {
    if (c.from == null || c.to == null) continue;
    const base = Math.min(c.from, c.to);
    if (base < 1) continue;
    const ratio = Math.max(c.from, c.to) / base;
    if (ratio > maxRatio) {
      reasons.push(`${c.id} moved ${ratio.toFixed(1)}x: ${c.from.toFixed(2)} -> ${c.to.toFixed(2)}`);
    }
  }
  if (refreshedCount > 0 && changes.length / refreshedCount > maxChangedShare) {
    reasons.push(
      `${changes.length} of ${refreshedCount} refreshed cards changed price (limit ${Math.round(maxChangedShare * 100)}%)`
    );
  }
  return reasons;
}

/**
 * Guardrail on cards that came back without a usable Cardmarket block. A few
 * promos legitimately have none (4 of 313 today); when a whole set does, the
 * API is lagging and the refresh must not be committed as if complete.
 * Returns a reason string or null.
 */
export function skipGuardrail({ skippedNoPrice, attempted }, { maxShare = 0.1 } = {}) {
  if (attempted === 0 || skippedNoPrice / attempted <= maxShare) return null;
  return `${skippedNoPrice} of ${attempted} cards came back without a Cardmarket price (limit ${Math.round(maxShare * 100)}%)`;
}

/**
 * The commit message for a refresh: a one-line title, a blank line, then the
 * top movers (the same list CLAUDE.md asks to paste by hand).
 */
export function summaryMessage({ date, changes, skipped, top = 10 }) {
  const title = `Refresh Cardmarket prices ${date}: ${changes.length} change${changes.length === 1 ? "" : "s"}, ${skipped} skipped`;
  const movers = topMovers(changes.filter((c) => c.from != null), top);
  if (movers.length === 0) return `${title}\n\nNo price changes.\n`;
  const lines = movers.map((c) => `  ${c.id}: ${c.from.toFixed(2)} -> ${c.to.toFixed(2)}`);
  return `${title}\n\nTop movers:\n${lines.join("\n")}\n`;
}

/** The n changes with the largest absolute move, largest first. */
export function topMovers(changes, n) {
  return changes
    .slice()
    .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))
    .slice(0, n);
}

/**
 * Serialise data/prices.json with one snapshot per line:
 *
 *   {
 *     "abra": [
 *       {"date":"2026-10-23","source":"cardmarket","trend":0.02,...}
 *     ],
 *     ...
 *   }
 *
 * JSON.stringify(prices, null, 2) spreads each snapshot over eight lines, so
 * a weekly refresh of 313 cards rewrites about 3,000 lines. This keeps every
 * card's key and bracket lines stable and makes a new snapshot a one-line
 * append (the previous last line gains a comma). Parses back to the same
 * object with plain JSON.parse; tests/data.test.ts asserts the file on disk
 * is byte-identical to this output.
 */
/**
 * Serialise data/meta.json ({ pricesRefreshed: "YYYY-MM-DD" }), the one
 * freshness file lib/data.ts imports; tests/data.test.ts checks its date
 * against the newest cardmarket snapshot in prices.json.
 */
export function formatMeta(meta) {
  return JSON.stringify(meta, null, 2) + "\n";
}

export function formatPrices(prices) {
  const ids = Object.keys(prices);
  if (ids.length === 0) return "{}\n";
  const entries = ids.map((id) => {
    const history = prices[id];
    const key = `  ${JSON.stringify(id)}: `;
    if (history.length === 0) return `${key}[]`;
    const lines = history.map((snap) => `    ${JSON.stringify(snap)}`);
    return `${key}[\n${lines.join(",\n")}\n  ]`;
  });
  return `{\n${entries.join(",\n")}\n}\n`;
}
