"use client";

import { useEffect, useState } from "react";
import { Card, typeColors } from "@/lib/cards";
import { getCardImageUrl } from "@/lib/cardImage";

export function CardModal({ card, onClose }: { card: Card; onClose: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = getCardImageUrl(card);

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
            <img
              src={imgUrl}
              alt={card.name}
              className="modal-image"
              onError={() => setImgFailed(true)}
            />
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
            {card.pricePaid != null && (
              <div>
                <dt>Paid</dt>
                <dd>{card.pricePaid.toFixed(2).replace(".", ",")} &euro;</dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>
                <span className={card.owned ? "status-owned" : "status-wanted"}>
                  {card.owned ? "Owned" : "Wanted"}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
