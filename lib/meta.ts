/**
 * data/meta.json: the one small file the UI reads for freshness. The refresh
 * script writes it beside prices.json (which is large and never bundled), and
 * tests/data.test.ts keeps the two in step. Pure; no JSON imports here.
 */
export type Meta = {
  /** ISO date (YYYY-MM-DD) of the last Cardmarket refresh. */
  pricesRefreshed: string;
};

/** The two fields every prices.json snapshot shares; manual seeds and cardmarket rows differ in the rest. */
type Snapshot = { date: string; source: string; [field: string]: unknown };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Newest `cardmarket` snapshot date over every card's history; null when there is none. */
export function latestCardmarketDate(prices: Record<string, Snapshot[]>): string | null {
  let latest: string | null = null;
  for (const history of Object.values(prices)) {
    for (const snap of history) {
      if (snap.source !== "cardmarket") continue;
      if (latest == null || snap.date > latest) latest = snap.date;
    }
  }
  return latest;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "29 Oct 2026" from "2026-10-29"; string arithmetic only, so no time-zone drift at build time. */
export function fmtRefreshed(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Problems with a meta object, in the style of validateData; empty when it is usable. */
export function metaProblems(meta: Meta): string[] {
  const problems: string[] = [];
  if (typeof meta.pricesRefreshed !== "string" || !ISO_DATE.test(meta.pricesRefreshed)) {
    problems.push(`meta.pricesRefreshed must be a YYYY-MM-DD date, got ${JSON.stringify(meta.pricesRefreshed)}`);
  }
  return problems;
}
