"use client";

import type { BinderKind } from "@/lib/binders";
import {
  collectedPct,
  setValuePct,
  SINGLES_BAND_EUR,
  type CollectionStats,
} from "@/lib/purchases";
import { fmtEur, fmt0 } from "@/lib/format";

type Props = {
  stats: CollectionStats;
  kind: BinderKind;
  /** Master-set binders only: jump to the wanted cards as a table, priciest first. */
  onBuySingles?: () => void;
};

/**
 * The collection summary: two lead figures (cards collected, and either the
 * owned share of set value or worth vs paid), then two quiet lines that say
 * what is left and where the money went. Replaces the six-tile stats grid.
 */
export function StatsStrip({ stats, kind, onBuySingles }: Props) {
  const isMasterSet = kind === "master-set";
  const pct = collectedPct(stats);
  const valuePct = setValuePct(stats);
  // Derived here, not stored: unrealised gain and the part of outlay that is
  // not card prices (shipping, fees, duplicate copies).
  const gainVsPaid = stats.marketValue - stats.spentOnCards;
  const extras = stats.totalOutlay - stats.spentOnCards;
  const complete = stats.wanted === 0;
  const showBands =
    isMasterSet && stats.toCompleteOver.count > 0 && stats.toCompleteUnder.count > 0;

  return (
    <section className="stats-strip" aria-label="Collection summary">
      <div className="stat-leads">
        <div className="stat-lead">
          <div className="value">
            {stats.owned}
            <span className="value-sub"> / {stats.total}</span>
          </div>
          <div className="label">Cards collected &middot; {pct}%</div>
        </div>
        {isMasterSet ? (
          <div
            className="stat-lead"
            title="Cardmarket trend value of the cards you own, as a share of the whole set's value"
          >
            <div className="value">{valuePct == null ? "—" : `${valuePct}%`}</div>
            <div className="label">
              of set value owned &middot; {fmt0(stats.marketValue)} of {fmt0(stats.budget)} &euro;
            </div>
          </div>
        ) : (
          <div
            className="stat-lead"
            title={
              "Cardmarket trend price summed over owned cards" +
              (stats.unpricedOwned > 0
                ? `; ${stats.unpricedOwned} owned without a price are not counted`
                : "")
            }
          >
            <div className="value">{fmtEur(stats.marketValue)}</div>
            <div className="label">
              worth &middot; paid {fmtEur(stats.spentOnCards)}, {gainVsPaid >= 0 ? "+" : ""}
              {fmtEur(gainVsPaid)}
            </div>
          </div>
        )}
      </div>

      <ul className="stat-lines">
        <li>
          {complete ? (
            <strong>Complete</strong>
          ) : isMasterSet ? (
            <>
              <strong>{stats.wanted} to go</strong> &middot; {fmtEur(stats.toComplete)} as singles
              {showBands && (
                <>
                  {" "}
                  &middot; {stats.toCompleteOver.count} over {SINGLES_BAND_EUR} &euro; ={" "}
                  {fmtEur(stats.toCompleteOver.total)} &middot; {stats.toCompleteUnder.count} under{" "}
                  {SINGLES_BAND_EUR} &euro; = {fmtEur(stats.toCompleteUnder.total)}
                </>
              )}
              {isMasterSet && stats.wanted > 0 && onBuySingles && (
                <button
                  type="button"
                  className="stat-link"
                  onClick={onBuySingles}
                  title="Show the wanted cards as a table, priciest first"
                >
                  Buy as singles &rarr;
                </button>
              )}
            </>
          ) : (
            <>
              <strong>{stats.wanted} to go</strong>
              {stats.wantedUnpriced > 0 && (
                <>
                  {" "}
                  &middot; {stats.wantedUnpriced} print{stats.wantedUnpriced === 1 ? "" : "s"} still to
                  choose
                </>
              )}
              {stats.wantedPriced > 0 && (
                <>
                  {" "}
                  &middot; {stats.wantedPriced} chosen, {fmtEur(stats.toComplete)} to buy
                </>
              )}
            </>
          )}
        </li>
        <li title="Outlay is every shipment total attributed to this binder, including shipping, fees and duplicate copies">
          Outlay <strong>{fmtEur(stats.totalOutlay)}</strong>
          {isMasterSet ? (
            <>
              {" "}
              &middot; pulled value {fmtEur(stats.marketValueAllCopies)}
              {stats.duplicates > 0 && (
                <>
                  {" "}
                  &middot; {stats.duplicates} duplicate {stats.duplicates === 1 ? "copy" : "copies"}
                </>
              )}
            </>
          ) : (
            <>
              {" "}
              &middot; cards {fmtEur(stats.spentOnCards)}
              {extras > 0.005 && <>, shipping and fees {fmtEur(extras)}</>}
            </>
          )}
        </li>
      </ul>
    </section>
  );
}
