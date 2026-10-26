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
