"use client";

import { useEffect, useState } from "react";
import { Card, typeColors } from "@/lib/cards";
import type { CardOwnership } from "@/lib/purchases";

type Props = {
  card: Card;
  ownership: CardOwnership | null;
  onClose: () => void;
};

export function CardModal({ card, ownership, onClose }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = card.imageUrl ?? null;
  const owned = ownership != null;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <div className="modal-image-wrapper">
          {imgUrl && !imgFailed ? (
            <div className="modal-image-clip">
              <img
                src={imgUrl}
                alt={card.name}
                className="modal-image"
                onError={() => setImgFailed(true)}
              />
            </div>
          ) : (
            <div className="modal-placeholder">
              <div className="placeholder-pokeball" aria-hidden>
                &#9679;
              </div>
              <div className="placeholder-name">{card.name}</div>
              <div className="placeholder-code">{card.code}</div>
              <div className="placeholder-hint">No image available</div>
            </div>
          )}
        </div>
        <div className="modal-info">
          <h2>{card.name}</h2>
          <div className="modal-badges">
            <span
              className="type-badge"
              style={{ background: typeColors[card.type1] ?? "#888" }}
            >
              {card.type1}
            </span>
            {card.type2 && (
              <span
                className="type-badge"
                style={{ background: typeColors[card.type2] ?? "#888" }}
              >
                {card.type2}
              </span>
            )}
            {card.variant && (
              <span className="variant-badge">{card.variant}</span>
            )}
          </div>
          <dl className="modal-details">
            <div>
              <dt>Pokedex #</dt>
              <dd>{card.pokedexNumber}</dd>
            </div>
            <div>
              <dt>Set</dt>
              <dd>{card.set}</dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>{card.code}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{card.language}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{card.condition}</dd>
            </div>
            {card.buyPrice != null && (
              <div>
                <dt>Buy Price</dt>
                <dd>{card.buyPrice.toFixed(2).replace(".", ",")} &euro;</dd>
              </div>
            )}
            {ownership && (
              <div>
                <dt>Paid</dt>
                <dd>
                  {ownership.pricePaid.toFixed(2).replace(".", ",")} &euro;
                  {ownership.duplicateCount > 0 && (
                    <span className="dupe-note">
                      {" "}
                      · {ownership.duplicateCount} duplicate
                      {ownership.duplicateCount === 1 ? "" : "s"}
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>
                <span className={owned ? "status-owned" : "status-wanted"}>
                  {owned ? "Owned" : "Wanted"}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
