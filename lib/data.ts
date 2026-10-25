import cardsJson from "@/data/cards.json";
import purchasesJson from "@/data/purchases.json";
import bindersJson from "@/data/binders.json";
import type { Card } from "./cards";
import type { PurchaseData } from "./purchases";
import type { Binder } from "./binders";
import { validateData } from "./binders";

export const cards: Card[] = cardsJson as Card[];
export const purchases: PurchaseData = purchasesJson as PurchaseData;
export const binders: Binder[] = bindersJson as Binder[];

// One throw policy, every environment: this module is evaluated when
// `next build` prerenders `/` and `/print`, so inconsistent data fails the
// build (and therefore the Vercel deploy) instead of shipping with a log line.
const problems = validateData(cards, purchases, binders);
if (problems.length > 0) {
  throw new Error(`Invalid data:\n${problems.join("\n")}`);
}
