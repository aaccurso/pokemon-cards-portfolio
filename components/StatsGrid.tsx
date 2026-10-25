"use client";

import type { BinderKind } from "@/lib/binders";
import { valueVsOutlayPct, type CollectionStats } from "@/lib/purchases";
import { fmtEur } from "@/lib/format";

type Props = {
  stats: CollectionStats;
  kind: BinderKind;
};

export function StatsGrid({ stats, kind }: Props) {
  const isMasterSet = kind === "master-set";
  // Derived here, not stored: unrealised gain and the only honest ROI (outlay
  // includes shipping, fees and duplicates, so compare it to every copy's value).
  const gainVsPaid = stats.marketValue - stats.spentOnCards;
  const valueOutlayPct = valueVsOutlayPct(stats);

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="value">
          {stats.owned}
          <span className="value-sub"> / {stats.total}</span>
        </div>
        <div className="label">Collected</div>
      </div>
      {isMasterSet ? (
        <div
          className="stat-card"
          title="Cardmarket trend price of every pulled copy, duplicates included"
        >
          <div className="value">{fmtEur(stats.marketValueAllCopies)}</div>
          <div className="label">Pulled value</div>
          <div className="stat-sub">distinct {fmtEur(stats.marketValue)}</div>
        </div>
      ) : (
        <div className="stat-card">
          <div className="value">{fmtEur(stats.spentOnCards)}</div>
          <div className="label">Spent on cards</div>
        </div>
      )}
      {isMasterSet ? (
        <div className="stat-card" title="Extra copies pulled beyond the first">
          <div className="value">{stats.duplicates}</div>
          <div className="label">Duplicates</div>
        </div>
      ) : (
        <div
          className="stat-card"
          title={
            "Cardmarket trend price summed over owned cards" +
            (stats.unpricedOwned > 0
              ? `; ${stats.unpricedOwned} owned without a price are not counted`
              : "")
          }
        >
          <div className="value">{fmtEur(stats.marketValue)}</div>
          <div className="label">Value ({stats.owned} owned)</div>
          <div className={`stat-sub${gainVsPaid < 0 ? " negative" : ""}`}>
            {gainVsPaid >= 0 ? "+" : ""}
            {fmtEur(gainVsPaid)} vs paid
          </div>
        </div>
      )}
      <div className="stat-card">
        <div className="value">{fmtEur(stats.toComplete)}</div>
        <div className="label">
          {isMasterSet ? "To complete as singles" : "To complete (est.)"}
        </div>
      </div>
      <div className="stat-card">
        <div className="value">{fmtEur(stats.budget)}</div>
        <div className="label">
          {isMasterSet ? "Set value" : "Budget"} ({stats.pricedCount} priced)
        </div>
      </div>
      <div
        className="stat-card"
        title="Actual total paid including shipping, fees and duplicates"
      >
        <div className="value">{fmtEur(stats.totalOutlay)}</div>
        <div className="label">Total outlay</div>
        {valueOutlayPct != null && (
          <div className={`stat-sub${valueOutlayPct < 100 ? " negative" : ""}`}>
            value = {valueOutlayPct}%
          </div>
        )}
      </div>
    </div>
  );
}
