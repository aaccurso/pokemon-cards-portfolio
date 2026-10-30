"use client";

import { useEffect, useRef, useState } from "react";
import type { Binder } from "@/lib/binders";
import { activeTabScrollLeft, tabStripFade, type TabStripFade } from "@/lib/tabStrip";

export type BinderCounts = Record<string, { owned: number; total: number }>;

type Props = {
  binders: Binder[];
  activeId: string;
  counts: BinderCounts;
  onSelect: (id: string) => void;
};

export function BinderTabs({ binders, activeId, counts, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  // Which edges of the phone strip hide more tabs; null until measured, so
  // the server markup carries no attribute and the CSS default (fade the far
  // edge, which is where the overflow is at scrollLeft 0) applies first.
  const [fade, setFade] = useState<TabStripFade | null>(null);

  // On phones the strip scrolls horizontally; keep the active tab visible.
  // Only the nav's own x axis moves. Scrolling the tab "into view" via the
  // DOM API would also scroll every ancestor (window included) and reset a
  // restored or deep-linked page position on hydration. Desktop wraps instead.
  useEffect(() => {
    const el = activeRef.current;
    const nav = el?.parentElement;
    if (!el || !nav) return;
    const left = activeTabScrollLeft({
      navLeft: nav.getBoundingClientRect().left,
      navWidth: nav.clientWidth,
      navScrollLeft: nav.scrollLeft,
      navScrollWidth: nav.scrollWidth,
      elLeft: el.getBoundingClientRect().left,
      elWidth: el.offsetWidth,
    });
    if (left !== null) nav.scrollTo({ left });
    setFade(tabStripFade(nav));
  }, [activeId]);

  // The fade mask follows the scroll position so the tab that is fully in
  // view is never dimmed; a resize can change whether the strip overflows.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => setFade(tabStripFade(nav));
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      nav.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <nav className="binder-tabs" aria-label="Binders" ref={navRef} data-fade={fade ?? undefined}>
      {binders.map((b) => {
        const c = counts[b.id] ?? { owned: 0, total: 0 };
        const active = b.id === activeId;
        return (
          <button
            key={b.id}
            ref={active ? activeRef : null}
            type="button"
            className={`binder-tab${active ? " active" : ""}`}
            aria-pressed={active}
            aria-label={`${b.name}, ${c.owned} of ${c.total} owned`}
            onClick={() => onSelect(b.id)}
            title={b.description}
          >
            {b.name}
            <span className="binder-tab-count">
              {c.owned} / {c.total}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
