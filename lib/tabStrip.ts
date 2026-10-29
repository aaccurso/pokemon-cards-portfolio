/**
 * Geometry for keeping the active binder tab visible in the phone tab strip.
 * Pure numbers in, scroll offset out, so it is unit-testable without a DOM.
 */
export type TabStripMetrics = {
  /** nav.getBoundingClientRect().left */
  navLeft: number;
  /** nav.clientWidth */
  navWidth: number;
  /** nav.scrollLeft */
  navScrollLeft: number;
  /** nav.scrollWidth */
  navScrollWidth: number;
  /** tab.getBoundingClientRect().left */
  elLeft: number;
  /** tab.offsetWidth */
  elWidth: number;
};

/**
 * scrollLeft that centres the active tab inside the strip, clamped to the
 * strip's scroll range. Returns null when the strip does not overflow (desktop
 * wraps the tabs instead), so the caller leaves scroll positions alone. Only
 * the nav's own horizontal axis is ever described here; the window is never
 * involved, unlike scrollIntoView which scrolls every ancestor.
 */
export function activeTabScrollLeft(m: TabStripMetrics): number | null {
  const max = m.navScrollWidth - m.navWidth;
  if (max <= 0) return null;
  const elContentLeft = m.elLeft - m.navLeft + m.navScrollLeft;
  const centred = elContentLeft - (m.navWidth - m.elWidth) / 2;
  return Math.min(max, Math.max(0, centred));
}

export type TabStripFade = "none" | "start" | "end" | "both";

/**
 * Which edges of the strip still have tabs hidden behind them, so the CSS
 * fades only those edges and never the tab that is fully in view. Sub-pixel
 * scroll positions within 1px of an edge count as that edge.
 */
export function tabStripFade(m: {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}): TabStripFade {
  const max = m.scrollWidth - m.clientWidth;
  if (max <= 1) return "none";
  const atStart = m.scrollLeft <= 1;
  const atEnd = m.scrollLeft >= max - 1;
  if (atStart && atEnd) return "none";
  if (atStart) return "end";
  if (atEnd) return "start";
  return "both";
}
