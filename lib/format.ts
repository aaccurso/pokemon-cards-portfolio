/** "12,50 €": two decimals, comma separator, a space, then the euro sign. */
export function fmtEur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

/** Whole euros, no sign, for compact summary lines ("value 41 / 621"). */
export function fmt0(n: number): string {
  return String(Math.round(n));
}
