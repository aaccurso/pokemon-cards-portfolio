"use client";

import type { Binder } from "@/lib/binders";

export type BinderCounts = Record<string, { owned: number; total: number }>;

type Props = {
  binders: Binder[];
  activeId: string;
  counts: BinderCounts;
  onSelect: (id: string) => void;
};

export function BinderTabs({ binders, activeId, counts, onSelect }: Props) {
  return (
    <nav className="binder-tabs" aria-label="Binders">
      {binders.map((b) => {
        const c = counts[b.id] ?? { owned: 0, total: 0 };
        const active = b.id === activeId;
        return (
          <button
            key={b.id}
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
