import { fmtEur } from "./format.ts";

/**
 * Cardmarket has no derivable product URL for Japanese prints, so link to a
 * search on the printed set code ("M6a 001", "sv2a 063") instead.
 *
 * The "Need (N): ..." text export used by "Copy as text" lives in lib/needed.ts.
 */
export function cardmarketSearchUrl(code: string): string {
  return (
    "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=" +
    encodeURIComponent(code)
  );
}

/**
 * Label of the wanted-card modal's primary button: "Open on Cardmarket · 78,72 €".
 * `buyPrice` is the Cardmarket trend. The modal only renders the button for a
 * card that has one (a wants-binder card with no print chosen keeps the quiet
 * Code-row link instead), so the label always carries a price.
 */
export function cardmarketButtonLabel(buyPrice: number): string {
  return `Open on Cardmarket · ${fmtEur(buyPrice)}`;
}
