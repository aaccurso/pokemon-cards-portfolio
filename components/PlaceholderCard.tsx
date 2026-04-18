import { Card, typeColors } from "@/lib/cards";

export function PlaceholderCard({ card }: { card: Card }) {
  const imgUrl = card.localImage
    ? `/cards/${card.id}.webp`
    : card.imageUrl ?? null;
  return (
    <div className="placeholder-card">
      <div className="ph-header">
        <span className="ph-dex">#{String(card.pokedexNumber).padStart(3, "0")}</span>
        <span className="ph-set">{card.set}</span>
      </div>
      <div className="ph-name">{card.name}</div>
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
          <span
            className="ph-type-badge"
            style={{ background: typeColors[card.type1] ?? "#888" }}
          >
            {card.type1}
          </span>
          {card.type2 && (
            <span
              className="ph-type-badge"
              style={{ background: typeColors[card.type2] ?? "#888" }}
            >
              {card.type2}
            </span>
          )}
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
