"use client";

import { useEffect, useRef } from "react";
import type { Binder } from "@/lib/binders";

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
  // Desktop wraps instead, so "nearest" makes this a no-op there.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
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
