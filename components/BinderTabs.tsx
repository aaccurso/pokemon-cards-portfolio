"use client";

import { useEffect, useRef } from "react";
import type { Binder } from "@/lib/binders";
import { activeTabScrollLeft } from "@/lib/tabStrip";

export type BinderCounts = Record<string, { owned: number; total: number }>;

type Props = {
  binders: Binder[];
  activeId: string;
  counts: BinderCounts;
  onSelect: (id: string) => void;
};

export function BinderTabs({ binders, activeId, counts, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);

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
  }, [activeId]);

  return (
    <nav className="binder-tabs" aria-label="Binders">
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
