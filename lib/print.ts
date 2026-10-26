// Explicit .ts extension so Node's test runner (no extension resolution) and
// the Next bundler (allowImportingTsExtensions) both find the module.
import { DEFAULT_BINDER_ID } from "./binders.ts";

/** The print page's ink saver is on only for the literal `?ink=1`. */
export function isInkLight(param: string | null | undefined): boolean {
  return param === "1";
}

/**
 * Builds the print page URL, omitting defaults so the plain `/print` link
 * keeps working and the default binder never shows up in the address bar.
 */
export function printHref(
  pathname: string,
  binderId: string,
  inkLight: boolean
): string {
  const params = new URLSearchParams();
  if (binderId !== DEFAULT_BINDER_ID) params.set("binder", binderId);
  if (inkLight) params.set("ink", "1");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
