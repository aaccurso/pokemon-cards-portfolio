"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cards, purchases, binders } from "@/lib/data";
import { buildOwnershipMap } from "@/lib/purchases";
import {
  DEFAULT_BINDER_ID,
  cardsForBinder,
  getBinder,
  resolveBinderId,
} from "@/lib/binders";
import { buildNeededBlocks, neededText } from "@/lib/needed";
import { BinderTabs, BinderCounts } from "@/components/BinderTabs";

export default function NeededPage() {
  return (
    <Suspense>
      <NeededList />
    </Suspense>
  );
}

function NeededList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const binderId = resolveBinderId(searchParams.get("binder"), binders);
  const binder = getBinder(binderId, binders);
  const isMasterSet = binder.kind === "master-set";

  const [copied, setCopied] = useState(false);
  const ownership = useMemo(() => buildOwnershipMap(purchases), []);
  const binderCards = useMemo(() => cardsForBinder(binderId, cards), [binderId]);

  const binderCounts = useMemo<BinderCounts>(() => {
    const counts: BinderCounts = {};
    for (const b of binders) {
      const list = cardsForBinder(b.id, cards);
      counts[b.id] = {
        owned: list.filter((c) => ownership.has(c.id)).length,
        total: list.length,
      };
    }
    return counts;
  }, [ownership]);

  const blocks = useMemo(
    () => buildNeededBlocks(binderCards, ownership, binder),
    [binderCards, ownership, binder]
  );
  const missing = blocks.reduce(
    (n, b) => n + b.entries.filter((e) => !e.owned).length,
    0
  );

  function selectBinder(id: string) {
    router.replace(id === DEFAULT_BINDER_ID ? pathname : `${pathname}?binder=${id}`, {
      scroll: false,
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(neededText(binderCards, ownership, binder));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. non-HTTPS): silently no-op
    }
  }

  const dashboardHref = binderId === DEFAULT_BINDER_ID ? "/" : `/?binder=${binderId}`;

  return (
    <div className="needed-page">
      <div className="needed-controls no-print">
        <BinderTabs
          binders={binders}
          activeId={binderId}
          counts={binderCounts}
          onSelect={selectBinder}
        />
        <div className="needed-actions">
          <Link href={dashboardHref} className="action-button">
            &larr; Dashboard
          </Link>
          <button
            className="action-button"
            onClick={handleCopy}
            title="Copy the missing numbers as one line of text"
          >
            {copied ? "✓ Copied" : "Copy as text"}
          </button>
          <button
            className="action-button"
            onClick={() => window.print()}
            title="Print the list on one A4 sheet"
          >
            Print
          </button>
        </div>
      </div>

      <header className="needed-header">
        <h1>{binder.name}</h1>
        <p className="needed-summary">
          Need {missing} of {binderCards.length}
          {isMasterSet ? ", owned numbers dimmed" : ", owned cards dimmed"}
        </p>
      </header>

      {blocks.map((block, i) => (
        <section key={block.title ?? i} className="needed-block">
          {block.title && <h2>{block.title}</h2>}
          <ol className={`needed-grid ${isMasterSet ? "numbers" : "rows"}`}>
            {block.entries.map((e) => (
              <li
                key={e.card.id}
                className={`needed-cell${e.owned ? " owned" : ""}`}
                title={isMasterSet ? e.card.name : e.card.code}
                aria-label={`${e.label}, ${e.owned ? "owned" : "needed"}`}
              >
                {e.label}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
