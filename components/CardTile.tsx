"use client";

import { useRef, useState } from "react";
import { Card, typeColors } from "@/lib/cards";
import { getCardImageUrl } from "@/lib/cardImage";

type Props = {
  card: Card;
  onClick: () => void;
};

export function CardTile({ card, onClick }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = getCardImageUrl(card);

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rotY = (px - 0.5) * 18;
    const rotX = (0.5 - py) * 18;
    el.style.setProperty("--rx", `${rotX}deg`);
    el.style.setProperty("--ry", `${rotY}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  }

  return (
    <button
      ref={ref}
      className={`card-tile ${card.owned ? "owned" : ""}`}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      aria-label={`Open ${card.name} details`}
    >
      <div className="card-tile-inner">
        <div className="card-tile-image">
          {imgUrl && !imgFailed ? (
            <img
              src={imgUrl}
              alt={card.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="card-tile-placeholder">
              <div className="placeholder-pokeball" aria-hidden>
                &#9679;
              </div>
              <div className="placeholder-name">{card.name}</div>
              <div className="placeholder-code">{card.code}</div>
            </div>
          )}
          <div className="card-tile-shine" aria-hidden />
          <div className="card-tile-holo" aria-hidden />
          {card.owned && (
            <span className="pokeball-badge" title="Owned" aria-label="Owned" />
          )}
        </div>
        <div className="card-tile-info">
          <span className="card-tile-num">#{card.pokedexNumber}</span>
          <span className="card-tile-name">{card.name}</span>
          <div className="card-tile-types">
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
          </div>
        </div>
      </div>
    </button>
  );
}
