/**
 * How many of the filter controls behind the phone "Filters" disclosure are
 * set to something other than their default. Shown on the disclosure button
 * so a filter that is hiding cards is never invisible while the panel is
 * closed. The search box has its own place on the row and is not counted.
 * Structural type so the component's Filters type can stay where it is.
 */
export function activeFilterCount(f: {
  type: string;
  set: string;
  own: string;
  illus: boolean;
  rarity: string;
}): number {
  let n = 0;
  if (f.type !== "all") n++;
  if (f.set !== "all") n++;
  if (f.own !== "all") n++;
  if (f.rarity !== "all") n++;
  if (f.illus) n++;
  return n;
}
