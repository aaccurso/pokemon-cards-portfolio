/**
 * Pure helpers for scripts/smoke.mjs: derive the URL plan from the data and
 * check a dumped DOM against it. No I/O here so tests can drive it directly.
 */
import { cardsForBinder, resolveBinderId, getBinder } from "../../lib/binders.ts";
import { buildOwnershipMap, rarityBreakdown } from "../../lib/purchases.ts";
import { rarityOrder } from "../../lib/cards.ts";

/** Strings that must never appear in rendered text on any page. */
export const BAD_TOKENS = ["#null", "undefined", "NaN", "[object Object]", "Application error"];

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·" };

/** Visible text of an HTML string: no tags, comments, scripts, styles; entities decoded; whitespace collapsed. */
export function textOf(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code) => {
      if (code[0] === "#") {
        const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const sortValue = (c, key) => (c[key] == null ? Number.POSITIVE_INFINITY : c[key]);

/**
 * Pages to render and what each must show. Every number comes from
 * data/*.json so the plan tracks the collection instead of literals.
 * `showing` is "Showing N of M cards"; M defaults to N unless `of` is set.
 */
export function buildPlan({ cards, purchases, binders }) {
  const ownership = buildOwnershipMap(purchases);
  const perBinder = binders.map((b) => {
    const list = cardsForBinder(b.id, cards);
    const owned = list.filter((c) => ownership.has(c.id)).length;
    return { binder: b, list, owned };
  });
  const tabs = perBinder.map(({ list, owned }) => `${owned} / ${list.length}`);
  const defaultId = resolveBinderId(null, binders);
  const def = perBinder.find((p) => p.binder.id === defaultId);

  const plan = [];
  for (const { binder, list } of perBinder) {
    const path = binder.id === defaultId ? "/" : `/?binder=${binder.id}`;
    // The rarity select shows up only when a card in the binder has a rarity.
    const raritySelect = list.some((c) => c.rarity);
    plan.push({ path, expect: { h1: binder.name, showing: list.length, tabs, raritySelect } });
  }

  const largest = perBinder.reduce((a, b) => (b.list.length > a.list.length ? b : a));
  plan.push({ path: `/?binder=${largest.binder.id}&view=table`, expect: { h1: largest.binder.name, tbodyRows: largest.list.length } });

  // Rarity filter + breakdown (collector-insight item 2): for every master-set
  // binder with rarities, filter on the first known rarity present and expect
  // its row to read active, the filtered count, and one row per rarity.
  for (const { binder, list } of perBinder) {
    if (binder.kind !== "master-set") continue;
    const rows = rarityBreakdown(list, ownership);
    if (rows.length === 0) continue;
    const present = new Set(rows.map((r) => r.rarity));
    const first = rarityOrder.find((r) => present.has(r.rarity)) ?? rows[0];
    plan.push({
      path: `/?binder=${binder.id}&rarity=${encodeURIComponent(first.rarity)}`,
      expect: {
        h1: binder.name,
        showing: list.filter((c) => c.rarity === first.rarity).length,
        of: list.length,
        rarityRows: rows.length,
        activeRarity: first.label,
      },
    });
  }

  // Finish-as-singles shortlist: the URL the "Buy as singles" tile link applies.
  const master = perBinder.find((p) => p.binder.kind === "master-set");
  if (master) {
    plan.push({
      path: `/?binder=${master.binder.id}&own=wanted&view=table&sort=buyPrice&dir=desc`,
      expect: { h1: master.binder.name, tbodyRows: master.list.length - master.owned },
    });
  }

  plan.push({ path: "/?binder=typo", expect: { h1: getBinder(defaultId, binders).name, showing: def.list.length } });

  const firstOwned = [...def.list]
    .sort((a, b) => sortValue(a, def.binder.sort) - sortValue(b, def.binder.sort))
    .find((c) => ownership.has(c.id));
  if (firstOwned) {
    plan.push({ path: `/?card=${firstOwned.id}`, expect: { h1: def.binder.name, modalStatus: "Owned" } });
  }

  for (const { binder, list, owned } of [def, largest].filter((v, i, arr) => arr.indexOf(v) === i)) {
    const path = binder.id === defaultId ? "/print" : `/print?binder=${binder.id}`;
    const unowned = list.length - owned;
    plan.push({
      path,
      expect: { h1: `${binder.name} placeholder cards`, printCards: unowned, printSheets: Math.ceil(unowned / 9) + 1 },
    });
  }
  return plan;
}

const first = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};

/** Returns human-readable failures; empty when the page matches `page.expect`. */
export function checkPage(page, html) {
  const { expect } = page;
  const failures = [];
  const text = textOf(html);

  if (expect.h1 != null) {
    const h1 = first(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    const got = h1 == null ? null : textOf(h1);
    if (got !== expect.h1) failures.push(`h1: expected "${expect.h1}", got ${got == null ? "none" : `"${got}"`}`);
  }

  if (expect.showing != null) {
    const want = `Showing ${expect.showing} of ${expect.of ?? expect.showing} cards`;
    if (!text.includes(want)) {
      const got = first(text, /(Showing \d+ of \d+ cards)/);
      failures.push(`Showing: expected "${want}", got ${got ? `"${got}"` : "none"}`);
    }
  }

  if (expect.tabs != null) {
    const got = [...html.matchAll(/<span class="binder-tab-count">([\s\S]*?)<\/span>/g)].map((m) => textOf(m[1]));
    if (JSON.stringify(got) !== JSON.stringify(expect.tabs)) {
      failures.push(`tabs: expected [${expect.tabs.join(", ")}], got [${got.join(", ")}]`);
    }
  }

  if (expect.tbodyRows != null) {
    const tbody = first(html, /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i) ?? "";
    const got = (tbody.match(/<tr[\s>]/g) ?? []).length;
    if (got !== expect.tbodyRows) failures.push(`tbody rows: expected ${expect.tbodyRows}, got ${got}`);
  }

  if (expect.modalStatus != null) {
    const hasModal = /class="modal-content"/.test(html);
    const status = first(html, /<span class="status-(?:owned|wanted)">([\s\S]*?)<\/span>/);
    const got = status == null ? null : textOf(status);
    if (!hasModal || got !== expect.modalStatus) {
      failures.push(`modal: expected status "${expect.modalStatus}", got ${hasModal ? (got ? `"${got}"` : "no status") : "no modal"}`);
    }
  }

  if (expect.raritySelect != null) {
    const got = /<select\b[^>]*aria-label="Rarity"/.test(html);
    if (got !== expect.raritySelect) failures.push(`rarity select: expected ${expect.raritySelect ? "present" : "absent"}, got ${got ? "present" : "absent"}`);
  }

  if (expect.rarityRows != null) {
    const got = (html.match(/class="rarity-row(?: active)?"/g) ?? []).length;
    if (got !== expect.rarityRows) failures.push(`rarity rows: expected ${expect.rarityRows}, got ${got}`);
  }

  if (expect.activeRarity != null) {
    const active = first(html, /<button\b[^>]*class="rarity-row active"[^>]*>([\s\S]*?)<\/button>/);
    const label = active == null ? null : textOf(first(active, /<span class="rarity-label">([\s\S]*?)<\/span>/) ?? active);
    if (label !== expect.activeRarity) {
      failures.push(`active rarity: expected "${expect.activeRarity}", got ${label == null ? "no active row" : `"${label}"`}`);
    }
  }

  if (expect.printCards != null || expect.printSheets != null) {
    const m = text.match(/(\d+) cards \S (\d+) sheets? total/);
    const want = `${expect.printCards} cards, ${expect.printSheets} sheets`;
    if (!m || Number(m[1]) !== expect.printCards || Number(m[2]) !== expect.printSheets) {
      failures.push(`print hint: expected ${want}, got ${m ? `${m[1]} cards, ${m[2]} sheets` : "no hint"}`);
    }
  }

  const bad = BAD_TOKENS.filter((t) => text.includes(t));
  if (bad.length > 0) failures.push(`bad tokens in text: ${bad.join(", ")}`);

  // Japanese names need lang="ja" on the element or the kanji fall back to Han-unification glyphs.
  const bareJa = (html.match(/<span class="name-ja"(?![^>]*\blang="ja")[^>]*>/g) ?? []).length;
  if (bareJa > 0) failures.push(`name-ja spans without lang="ja": ${bareJa}`);

  return failures;
}
