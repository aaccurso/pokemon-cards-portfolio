import { BinderDisplay, Card, numberLabel, typeBadges } from "@/lib/cards";

export function PlaceholderCard({
  card,
  binder,
}: {
  card: Card;
  binder: BinderDisplay;
}) {
  const imgUrl = card.localImage
    ? `/cards/${card.id}.webp`
    : card.imageUrl ?? null;
  return (
    <div className="placeholder-card">
      <div className="ph-header">
        <span className="ph-dex">{numberLabel(card, binder)}</span>
        <span className="ph-set">{card.set}</span>
      </div>
      <div className="ph-name">
        {card.name}
        {card.nameJa && <span className="name-ja">{card.nameJa}</span>}
      </div>
      <div className="ph-thumb">
        {imgUrl ? (
          <img src={imgUrl} alt="" />
        ) : (
          <div className="ph-thumb-fallback">
            <span>&#9679;</span>
          </div>
        )}
        <div className="ph-watermark">PLACEHOLDER</div>
        {card.imageIsFallback && <span className="ph-alt-tag">alt.</span>}
      </div>
      <div className="ph-meta">
        <div className="ph-types">
          {typeBadges(card).map((b) => (
            <span
              key={b.label}
              className="ph-type-badge"
              style={{ background: b.color }}
            >
              {b.label}
            </span>
          ))}
          {card.variant && <span className="ph-variant">{card.variant}</span>}
        </div>
        <div className="ph-code-row">
          <span className="ph-code">{card.code}</span>
          {card.buyPrice != null && (
            <span className="ph-budget">
              &le; {card.buyPrice.toFixed(2).replace(".", ",")} &euro;
            </span>
          )}
        </div>
      </div>
      <div className="ph-fields">
        <div className="ph-field">
          <span className="ph-label">Paid</span>
          <span className="ph-line" />
          <span className="ph-unit">&euro;</span>
        </div>
        <div className="ph-field">
          <span className="ph-label">Date</span>
          <span className="ph-line" />
        </div>
        <div className="ph-field">
          <span className="ph-label">Seller</span>
          <span className="ph-line ph-line-full" />
        </div>
        <div className="ph-field">
          <span className="ph-label">Notes</span>
          <span className="ph-line ph-line-full" />
        </div>
      </div>
    </div>
  );
}
