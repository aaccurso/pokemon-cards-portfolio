"use client";

import { useEffect, useRef, useState } from "react";
import { BinderDisplay, Card, numberLabel, typeBadges } from "@/lib/cards";

type Props = {
  card: Card;
  owned: boolean;
  onClick: () => void;
  binder: BinderDisplay;
};

export function CardTile({ card, owned, onClick, binder }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [triedRemote, setTriedRemote] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setRevealed(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "80px 0px", threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const localSrc = card.localImage ? `/cards/${card.id}.webp` : null;
  const imgUrl = triedRemote
    ? card.imageUrl ?? null
    : localSrc ?? card.imageUrl ?? null;

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
      className={`card-tile ${owned ? "owned" : ""} ${revealed ? "is-revealed" : ""}`}
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
              onError={() => {
                // If the local copy failed and a remote URL exists, retry remote once.
                if (!triedRemote && localSrc && card.imageUrl) {
                  setTriedRemote(true);
                } else {
                  setImgFailed(true);
                }
              }}
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
          {card.imageIsFallback && (
            <span
              className="card-tile-alt-chip"
              title="Alternative version — not your exact card"
            >
              ALT
            </span>
          )}
        </div>
        <div className="card-tile-info">
          <span className="card-tile-num">{numberLabel(card, binder)}</span>
          <span className="card-tile-name">
            {card.name}
            {card.nameJa && <span className="name-ja">{card.nameJa}</span>}
          </span>
          <div className="card-tile-types">
            {typeBadges(card).map((b) => (
              <span
                key={b.label}
                className={`type-badge${b.label === "Trainer" || b.label === "Energy" ? " trainer" : ""}`}
                style={{ background: b.color }}
              >
                {b.label}
              </span>
            ))}
            {owned && (
              <span
                className="pokeball pokeball-sm card-tile-pokeball"
                title="Owned"
                aria-label="Owned"
              />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
