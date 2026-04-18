"use client";

import { useEffect, useState } from "react";
import { Card, typeColors, languageFlags, conditionNames } from "@/lib/cards";
import type { CardOwnership } from "@/lib/purchases";

type Props = {
  card: Card;
  ownership: CardOwnership | null;
  onClose: () => void;
};

export function CardModal({ card, ownership, onClose }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [triedRemote, setTriedRemote] = useState(false);
  const localSrc = card.localImage ? `/cards/${card.id}.webp` : null;
  const imgUrl = triedRemote
    ? card.imageUrl ?? null
    : localSrc ?? card.imageUrl ?? null;
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
                onError={() => {
                  if (!triedRemote && localSrc && card.imageUrl) {
                    setTriedRemote(true);
                  } else {
                    setImgFailed(true);
                  }
                }}
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
          {card.imageIsFallback && imgUrl && !imgFailed && (
            <p className="modal-alt-notice">
              Image shown is an alternative version. Your actual card is{" "}
              <strong>{card.set}</strong> ({card.code}).
            </p>
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
              <dd>
                {languageFlags[card.language] && (
                  <span className="language-flag" aria-hidden>
                    {languageFlags[card.language]}
                  </span>
                )}
                {card.language}
              </dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>
                <span
                  className="condition-chip"
                  title={conditionNames[card.condition] ?? card.condition}
                >
                  {card.condition}
                </span>
              </dd>
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
