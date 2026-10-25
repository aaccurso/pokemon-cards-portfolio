/** "12,50 €": two decimals, comma separator, a space, then the euro sign. */
export function fmtEur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}
