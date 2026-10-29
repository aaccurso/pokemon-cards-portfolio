import cardsJson from "@/data/cards.json";
import purchasesJson from "@/data/purchases.json";
import bindersJson from "@/data/binders.json";
import metaJson from "@/data/meta.json";
import type { Card } from "./cards";
import type { PurchaseData } from "./purchases";
import type { Binder } from "./binders";
import type { Meta } from "./meta";
import { validateData } from "./binders";
import { metaProblems } from "./meta";

export const cards: Card[] = cardsJson as Card[];
export const purchases: PurchaseData = purchasesJson as PurchaseData;
export const binders: Binder[] = bindersJson as Binder[];
/** Freshness stamp written by scripts/refresh_prices.mjs; prices.json itself is never imported. */
export const meta: Meta = metaJson as Meta;

// One throw policy, every environment: this module is evaluated when
// `next build` prerenders `/` and `/print`, so inconsistent data fails the
// build (and therefore the Vercel deploy) instead of shipping with a log line.
const problems = [...validateData(cards, purchases, binders), ...metaProblems(meta)];
if (problems.length > 0) {
  throw new Error(`Invalid data:\n${problems.join("\n")}`);
}
