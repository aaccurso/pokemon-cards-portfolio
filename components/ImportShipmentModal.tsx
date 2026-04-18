"use client";

import { useEffect, useState } from "react";
import { Card } from "@/lib/cards";
import {
  parseCardmarketShipments,
  matchShipments,
  MatchedShipment,
} from "@/lib/parseCardmarketShipment";
import type { OwnershipMap, Shipment } from "@/lib/purchases";
import { appendShipments } from "@/app/actions/shipments";

type Props = {
  cards: Card[];
  ownership: OwnershipMap;
  existingShipmentIds: Set<string>;
  onClose: () => void;
};

export function ImportShipmentModal({
  cards,
  ownership,
  existingShipmentIds,
  onClose,
}: Props) {
  const [text, setText] = useState("");
  const [matched, setMatched] = useState<MatchedShipment[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    ok: boolean;
    appended: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function handleParse() {
    const parsed = parseCardmarketShipments(text);
    setMatched(matchShipments(parsed, cards));
  }

  async function handleSave() {
    if (!matched) return;
    const toSave: Shipment[] = matched
      .filter((s) => !existingShipmentIds.has(s.id))
      .map((s) => ({
        id: s.id,
        seller: s.seller,
        date: todayISO(),
        shipping: s.shipping,
        fees: null,
        total: s.total,
        items: s.items
          .filter((i) => i.card != null)
          .map((i) => ({
            cardId: i.card!.id,
            pricePaid: i.parsed.pricePaid,
            condition: i.parsed.condition,
          })),
      }));
    setSaving(true);
    const result = await appendShipments(toSave);
    setSaveResult(result);
    setSaving(false);
  }

  const canSave =
    matched != null &&
    matched.length > 0 &&
    matched.some((s) => !existingShipmentIds.has(s.id)) &&
    matched.every(
      (s) =>
        existingShipmentIds.has(s.id) || s.items.every((i) => i.card != null)
    );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content importer-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h2>Import Cardmarket shipment</h2>

        {saveResult?.ok ? (
          <div className="importer-success">
            <p>
              ✓ Saved {saveResult.appended} shipment
              {saveResult.appended === 1 ? "" : "s"} to{" "}
              <code>data/purchases.json</code>.
            </p>
            <p className="importer-hint">
              Reload to see updated stats and ownership.
            </p>
            <div className="importer-actions">
              <button onClick={onClose}>Close</button>
              <button
                className="primary"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </div>
        ) : saveResult?.ok === false ? (
          <div className="importer-error">
            <p>Save failed: {saveResult.error}</p>
            <div className="importer-actions">
              <button onClick={() => setSaveResult(null)}>Try again</button>
            </div>
          </div>
        ) : !matched ? (
          <>
            <p className="importer-hint">
              Paste one or more Cardmarket shipment blocks (full confirmation
              email works).
            </p>
            <textarea
              className="importer-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Shipment 1269797683\nSeller: …\n1x Tangela (Pokémon Card 151) - ART - Japanese - NM 3,00 EUR\n…`}
              rows={12}
            />
            <div className="importer-actions">
              <button onClick={onClose}>Cancel</button>
              <button
                className="primary"
                onClick={handleParse}
                disabled={!text.trim()}
              >
                Parse
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="importer-shipment-list">
              {matched.length === 0 && (
                <p className="importer-error">
                  Nothing parsed. Check the format and try again.
                </p>
              )}
              {matched.map((s) => {
                const isDupe = existingShipmentIds.has(s.id);
                return (
                  <section
                    key={s.id}
                    className={`importer-shipment ${isDupe ? "is-dupe" : ""}`}
                  >
                    <header className="importer-shipment-header">
                      <div>
                        <strong>Shipment {s.id}</strong>
                        <span className="importer-seller">
                          {s.seller ?? "unknown seller"}
                        </span>
                      </div>
                      {isDupe && (
                        <span className="tag tag-dupe">Already imported</span>
                      )}
                    </header>
                    <ul className="importer-items">
                      {s.items.map((it, idx) => {
                        const card = it.card;
                        const existing = card
                          ? ownership.get(card.id)
                          : undefined;
                        return (
                          <li key={idx} className="importer-item">
                            <span className="importer-item-main">
                              {it.parsed.qty}× <strong>{it.parsed.name}</strong>{" "}
                              <span className="importer-item-set">
                                ({it.parsed.set})
                              </span>
                            </span>
                            <span className="importer-item-price">
                              {it.parsed.pricePaid.toFixed(2).replace(".", ",")}{" "}
                              €
                            </span>
                            {!card &&
                              (it.candidates.length === 0 ? (
                                <span className="tag tag-error">No match</span>
                              ) : (
                                <span className="tag tag-warn">
                                  {it.candidates.length} candidates
                                </span>
                              ))}
                            {card && existing && (
                              <span className="tag tag-dupe">
                                Already owned (
                                {existing.pricePaid.toFixed(2).replace(".", ",")}
                                 €)
                              </span>
                            )}
                            {card && !existing && (
                              <span className="tag tag-ok">New</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <footer className="importer-shipment-footer">
                      Shipping{" "}
                      {s.shipping != null
                        ? `${s.shipping.toFixed(2).replace(".", ",")} €`
                        : "—"}{" "}
                      · Total{" "}
                      {s.total != null
                        ? `${s.total.toFixed(2).replace(".", ",")} €`
                        : "—"}
                    </footer>
                  </section>
                );
              })}
            </div>
            <div className="importer-actions">
              <button onClick={() => setMatched(null)}>Back</button>
              <button
                className="primary"
                disabled={!canSave || saving}
                onClick={handleSave}
              >
                {saving ? "Saving…" : "Save to purchases.json"}
              </button>
            </div>
            {!canSave && matched.length > 0 && (
              <p className="importer-error">
                Can&rsquo;t save: resolve unmatched items, or all shipments are
                already imported.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
