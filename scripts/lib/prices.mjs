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

/** The n changes with the largest absolute move, largest first. */
export function topMovers(changes, n) {
  return changes
    .slice()
    .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))
    .slice(0, n);
}
