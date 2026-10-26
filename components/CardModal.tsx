"use client";

import { useEffect, useState } from "react";
import { BinderDisplay, Card, languageFlags, conditionNames, numberLabel, typeBadges } from "@/lib/cards";
import type { CardOwnership } from "@/lib/purchases";
import { fmtEur } from "@/lib/format";
import { cardmarketSearchUrl } from "@/lib/shortlist";

type Props = {
  card: Card;
  ownership: CardOwnership | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  binder: BinderDisplay;
};

export function CardModal({ card, ownership, onClose, onPrev, onNext, binder }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [triedRemote, setTriedRemote] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const localSrc = card.localImage ? `/cards/${card.id}.webp` : null;
  const imgUrl = triedRemote
    ? card.imageUrl ?? null
    : localSrc ?? card.imageUrl ?? null;
  const owned = ownership != null;

  useEffect(() => {
    setZoomed(false);
    setImgFailed(false);
    setTriedRemote(false);
  }, [card.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomed) {
          setZoomed(false);
        } else {
          onClose();
        }
        return;
      }
      if (zoomed) return;
      if (e.key === "ArrowLeft") onPrev?.();
      else if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext, zoomed]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <div className="modal-image-wrapper">
          {imgUrl && !imgFailed ? (
            <div
              className="modal-image-clip modal-image-clip--zoomable"
              onClick={() => setZoomed(true)}
              role="button"
              tabIndex={0}
              aria-label="Zoom card image"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setZoomed(true);
                }
              }}
            >
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
          <h2>
            {card.name}
            {card.nameJa && <span className="name-ja" lang="ja">{card.nameJa}</span>}
          </h2>
          <div className="modal-badges">
            {typeBadges(card).map((b) => (
              <span
                key={b.label}
                className={`type-badge${b.label === "Trainer" || b.label === "Energy" ? " trainer" : ""}`}
                style={{ background: b.color }}
              >
                {b.label}
              </span>
            ))}
            {card.variant && (
              <span className="variant-badge">{card.variant}</span>
            )}
          </div>
          <dl className="modal-details">
            <div>
              <dt>
                {binder.kind === "wants" && card.pokedexNumber != null
                  ? "Pokedex #"
                  : "Number"}
              </dt>
              <dd>{numberLabel(card, binder)}</dd>
            </div>
            {binder.kind === "master-set" && card.pokedexNumber != null && (
              <div>
                <dt>Pokedex #</dt>
                <dd>#{String(card.pokedexNumber).padStart(3, "0")}</dd>
              </div>
            )}
            <div>
              <dt>Set</dt>
              <dd>{card.set}</dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>
                {card.code}
                <a
                  className="cardmarket-link"
                  href={cardmarketSearchUrl(card.code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Search this code on Cardmarket"
                >
                  Cardmarket &#8599;
                </a>
              </dd>
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
                <dd>{fmtEur(card.buyPrice)}</dd>
              </div>
            )}
            {ownership && (
              <div>
                <dt>Paid</dt>
                <dd>
                  {ownership.pricePaid != null
                    ? fmtEur(ownership.pricePaid)
                    : "Pulled from pack"}
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
        {(onPrev || onNext) && (
          // Desktop: display: contents, so the buttons stay absolutely
          // positioned against .modal-content. Mobile: a sticky bottom row.
          <div className="modal-nav-row">
            {onPrev && (
              <button
                className="modal-nav modal-nav-prev"
                onClick={onPrev}
                aria-label="Previous card"
              >
                &#8249;
              </button>
            )}
            {onNext && (
              <button
                className="modal-nav modal-nav-next"
                onClick={onNext}
                aria-label="Next card"
              >
                &#8250;
              </button>
            )}
          </div>
        )}
      </div>
      {zoomed && imgUrl && !imgFailed && (
        <div
          className="zoom-overlay"
          onClick={() => setZoomed(false)}
          role="button"
          aria-label="Close zoomed image"
        >
          <img src={imgUrl} alt={card.name} className="zoom-image" />
        </div>
      )}
    </div>
  );
}
