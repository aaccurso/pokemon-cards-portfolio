"use client";

import type { BinderKind } from "@/lib/binders";
import type { CollectionStats } from "@/lib/purchases";
import { fmtEur } from "@/lib/format";

type Props = {
  stats: CollectionStats;
  kind: BinderKind;
};

export function StatsGrid({ stats, kind }: Props) {
  const isMasterSet = kind === "master-set";

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="value">
          {stats.owned}
          <span className="value-sub"> / {stats.total}</span>
        </div>
        <div className="label">Collected</div>
      </div>
      <div className="stat-card">
        <div className="value">{fmtEur(stats.spentOnCards)}</div>
        <div className="label">Spent on cards</div>
      </div>
      {isMasterSet ? (
        <div className="stat-card" title="Extra copies pulled beyond the first">
          <div className="value">{stats.duplicates}</div>
          <div className="label">Duplicates</div>
        </div>
      ) : (
        <div className="stat-card">
          <div
            className="value"
            title="Sum of (buy price − price paid) for owned cards"
          >
            {stats.savings >= 0 ? "+" : ""}
            {fmtEur(stats.savings)}
          </div>
          <div className="label">Saved vs target</div>
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
      </div>
    </div>
  );
}
